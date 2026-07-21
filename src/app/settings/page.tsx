"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationPreset,
  type NotificationSettings,
} from "@/lib/notification-store";
import { sendTestNotification } from "@/lib/notification-scheduler";
import { clearAllClientData } from "@/lib/debug-clear";
import { getWebclassUrl, setWebclassUrl } from "@/lib/webclass-url";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

const PRESETS: { value: NotificationPreset; label: string; desc: string }[] = [
  { value: "relaxed", label: "余裕派", desc: "締切24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前 + 3時間前" },
  { value: "urgent", label: "ギリギリ派", desc: "3時間前 + 1時間前" },
];

const SECTION_TITLE = "text-[13px] font-semibold text-foreground";
const HINT = "text-[11.5px] text-muted-foreground";
const PILL = "rounded-md px-2.5 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const INPUT =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring";

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        on ? "bg-foreground" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";
  const { assignments, refresh } = useAssignments();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [hiddenCourses, setHiddenCourses] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [webclassInput, setWebclassInput] = useState("");
  const [webclassMsg, setWebclassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getNotificationSettings().then(setSettings);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifPermission(
      typeof Notification !== "undefined" ? Notification.permission : "unsupported"
    );
    setWebclassInput(getWebclassUrl() ?? "");
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((data) => {
        setEmailEnabled(data.settings?.emailEnabled ?? false);
      })
      .catch(() => {})
      .finally(() => setEmailLoaded(true));
    // 非表示コースも含めた全コースを取得（再追跡できるようにするため）
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        setAllCourses(data.courses ?? []);
        setHiddenCourses(data.hiddenCourses ?? []);
      })
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, [loggedIn]);

  async function updateSettings(patch: Partial<Omit<NotificationSettings, "id">>) {
    await saveNotificationSettings(patch);
    const updated = await getNotificationSettings();
    setSettings(updated);
    if (loggedIn) {
      fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
    }
  }

  async function toggleEmailNotification() {
    setEmailLoading(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled: !emailEnabled }),
      });
      if (res.ok) {
        setEmailEnabled(!emailEnabled);
      }
    } finally {
      setEmailLoading(false);
    }
  }

  function saveWebclass() {
    const ok = setWebclassUrl(webclassInput);
    setWebclassMsg(
      ok
        ? { ok: true, text: webclassInput.trim() ? "保存しました" : "クリアしました" }
        : { ok: false, text: "http(s) の URL を入力してください" }
    );
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      // サーバー削除に成功したら、端末内ミラーも消してサインアウト（JWT Cookie破棄）
      await clearAllClientData();
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleting(false);
      alert("アカウント削除に失敗しました。時間をおいて再度お試しください。");
    }
  }

  const courses = Array.from(
    new Map(assignments.map((a) => [a.courseId, { id: a.courseId, name: a.courseName }])).values()
  );

  // コース管理＋コース通知の統合リスト。allCourses(=追跡対象/非表示含む) と課題由来コースの和集合。
  // trackable=Classroomコース(=非表示切替が意味を持つ)。
  const courseList = useMemo(() => {
    const trackableIds = new Set(allCourses.map((c) => c.id));
    const map = new Map<string, string>();
    for (const c of allCourses) map.set(c.id, c.name);
    for (const a of assignments) if (!map.has(a.courseId)) map.set(a.courseId, a.courseName);
    return Array.from(map, ([id, name]) => ({ id, name, trackable: trackableIds.has(id) }));
  }, [allCourses, assignments]);

  // 追跡/非表示の切替。非表示にしたら通知も自動でOFF（ミュートに追加）。
  async function toggleTracking(id: string) {
    if (!settings) return;
    const hidden = hiddenCourses.includes(id);
    const nextHidden = hidden ? hiddenCourses.filter((x) => x !== id) : [...hiddenCourses, id];
    setHiddenCourses(nextHidden);
    await saveNotificationSettings({ hiddenCourses: nextHidden });
    const body: Record<string, unknown> = { hiddenCourses: nextHidden };
    if (!hidden) {
      const nextMuted = settings.mutedCourses.includes(id)
        ? settings.mutedCourses
        : [...settings.mutedCourses, id];
      body.mutedCourses = nextMuted;
      await saveNotificationSettings({ mutedCourses: nextMuted });
      setSettings((s) => (s ? { ...s, mutedCourses: nextMuted } : s));
    }
    fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    if (hidden) refresh(); // 再追跡時に再取得
  }

  // コース通知 ON/OFF（ミュート切替）。非表示コースは操作不可。
  function toggleCourseMute(id: string) {
    if (!settings || hiddenCourses.includes(id)) return;
    const muted = settings.mutedCourses.includes(id);
    const mutedCourses = muted
      ? settings.mutedCourses.filter((x) => x !== id)
      : [...settings.mutedCourses, id];
    updateSettings({ mutedCourses });
  }

  const mutedAssignmentList = assignments.filter(
    (a) => settings?.mutedAssignments.includes(a.id)
  );

  const back = (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="戻る"
      className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12.5px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      戻る
    </button>
  );

  if (!settings) {
    return (
      <>
        <AppHeader right={back} />
        <main className="flex min-h-[60vh] items-center justify-center text-[13px] text-muted-foreground">
          読み込み中…
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader right={back} />

      <main className="mx-auto w-full max-w-md space-y-6 px-4 pb-24 pt-4">
        <h1 className="px-1 text-[15px] font-semibold text-foreground">設定</h1>

        {/* 通知 ON/OFF */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className={SECTION_TITLE}>通知</h2>
            <Toggle on={settings.enabled} onClick={() => updateSettings({ enabled: !settings.enabled })} />
          </div>
          {notifPermission === "denied" && (
            <p className="mt-1 text-[11.5px] text-destructive">
              ブラウザの通知がブロックされています。ブラウザの設定から許可してください。
            </p>
          )}
          {notifPermission === "granted" && (
            <button
              onClick={sendTestNotification}
              className="mt-2 text-[11.5px] font-medium text-accent-blue hover:underline"
            >
              テスト通知を送信
            </button>
          )}
        </section>

        {/* メール通知 */}
        {loggedIn && settings.enabled && (
          <section>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className={SECTION_TITLE}>メール通知</h2>
                <p className={`mt-0.5 truncate ${HINT}`}>
                  {session?.user?.email ?? ""} に締切通知を送信
                </p>
              </div>
              {emailLoaded ? (
                <Toggle on={emailEnabled} onClick={toggleEmailNotification} disabled={emailLoading} />
              ) : (
                <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
              )}
            </div>
          </section>
        )}

        {/* プリセット */}
        {settings.enabled && (
          <section>
            <h2 className={`mb-2 ${SECTION_TITLE}`}>通知タイミング</h2>
            <div className="space-y-2">
              {PRESETS.map((p) => {
                const active = settings.preset === p.value;
                return (
                  <label
                    key={p.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                      active ? "border-foreground bg-muted/50" : "border-border hover:bg-muted/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="preset"
                      value={p.value}
                      checked={active}
                      onChange={() => updateSettings({ preset: p.value })}
                      className="accent-foreground"
                    />
                    <div>
                      <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                      <span className={`ml-2 ${HINT}`}>{p.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* コース（追跡/非表示 と 通知ON/OFF を統合） */}
        {loggedIn && (
          <section>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className={SECTION_TITLE}>コース</h2>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="w-16 text-center">追跡</span>
                <span className="w-11 text-center">通知</span>
              </div>
            </div>
            <p className={`mb-2 ${HINT}`}>
              非表示にしたコースの課題は取り込まれず、通知も自動でOFFになります。
            </p>
            {coursesLoading ? (
              <div className="space-y-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-1 py-1.5">
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
                    <div className="h-6 w-11 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : courseList.length === 0 ? (
              <p className={HINT}>コースがありません。</p>
            ) : (
              <div className="space-y-1">
                {courseList.map((course) => {
                  const hidden = hiddenCourses.includes(course.id);
                  const notifOn =
                    settings.enabled && !hidden && !settings.mutedCourses.includes(course.id);
                  return (
                    <div key={course.id} className="flex items-center gap-2 px-1 py-1.5">
                      <span
                        className={cn(
                          "flex-1 truncate text-[13px]",
                          hidden ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {course.name}
                      </span>
                      {course.trackable ? (
                        <button
                          onClick={() => toggleTracking(course.id)}
                          className={cn(
                            PILL,
                            "w-16 text-center",
                            hidden
                              ? "bg-muted text-muted-foreground"
                              : "border border-border text-foreground hover:bg-muted",
                          )}
                        >
                          {hidden ? "非表示" : "追跡中"}
                        </button>
                      ) : (
                        <span className="w-16" aria-hidden />
                      )}
                      <Toggle
                        on={notifOn}
                        onClick={() => toggleCourseMute(course.id)}
                        disabled={hidden || !settings.enabled}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 未ログイン時はコース通知(ミュート)のみ */}
        {!loggedIn && settings.enabled && courses.length > 0 && (
          <section>
            <h2 className={`mb-2 ${SECTION_TITLE}`}>コース通知</h2>
            <div className="space-y-1">
              {courses.map((course) => {
                const muted = settings.mutedCourses.includes(course.id);
                return (
                  <div key={course.id} className="flex items-center justify-between gap-2 px-1 py-1.5">
                    <span className="flex-1 truncate text-[13px] text-foreground">{course.name}</span>
                    <Toggle on={!muted} onClick={() => toggleCourseMute(course.id)} />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ミュート中の課題 */}
        {settings.enabled && mutedAssignmentList.length > 0 && (
          <section>
            <h2 className={`mb-2 ${SECTION_TITLE}`}>ミュート中の課題</h2>
            <div className="space-y-1">
              {mutedAssignmentList.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">{a.title}</p>
                    <p className={`truncate ${HINT}`}>{a.courseName}</p>
                  </div>
                  <button
                    onClick={() => {
                      const mutedAssignments = settings.mutedAssignments.filter((id) => id !== a.id);
                      updateSettings({ mutedAssignments });
                    }}
                    className={cn(PILL, "bg-muted text-muted-foreground")}
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WebClass 連携 */}
        <section className="border-t border-border pt-5">
          <h2 className={`mb-1 ${SECTION_TITLE}`}>WebClass の URL</h2>
          <p className={`mb-2 ${HINT}`}>
            ヘッダーの同期ランプをタップして WebClass を開けるようにします。所属校の WebClass
            ログインページの URL を入力してください（この端末に保存されます）。
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={webclassInput}
              onChange={(e) => {
                setWebclassInput(e.target.value);
                setWebclassMsg(null);
              }}
              placeholder="https://…/webclass/"
              className={INPUT}
            />
            <button
              onClick={saveWebclass}
              className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              保存
            </button>
          </div>
          {webclassMsg && (
            <p className={cn("mt-1 text-[11.5px]", webclassMsg.ok ? "text-lamp-green" : "text-destructive")}>
              {webclassMsg.text}
            </p>
          )}
        </section>

        {/* アカウント */}
        <section className="border-t border-border pt-5">
          {loggedIn ? (
            <button onClick={() => signOut()} className="text-[13px] font-medium text-destructive">
              Google ログアウト
            </button>
          ) : (
            <Link href="/login" className="text-[13px] font-medium text-accent-blue">
              Google ログイン（Classroom連携）
            </Link>
          )}
        </section>

        {/* デバッグ: ローカルデータ削除 */}
        <section className="border-t border-border pt-5">
          <h2 className={`mb-1 ${SECTION_TITLE}`}>デバッグ</h2>
          <p className={`mb-2 ${HINT}`}>
            端末内のキャッシュ（IndexedDB・Cache・SW・localStorage）を全削除します。 ログイン状態は維持されます。
          </p>
          <button
            onClick={async () => {
              if (
                !confirm(
                  "この端末に保存されたローカルデータ（IndexedDB等）を全て削除します。よろしいですか？"
                )
              )
                return;
              setClearing(true);
              await clearAllClientData();
              alert("ローカルデータを削除しました。再読み込みします。");
              window.location.reload();
            }}
            disabled={clearing}
            className={cn("text-[13px] font-medium", clearing ? "text-muted-foreground" : "text-destructive")}
          >
            {clearing ? "削除中…" : "ローカルデータを全消去"}
          </button>
        </section>

        {/* アカウント削除（危険ゾーン） */}
        {loggedIn && (
          <section className="border-t border-border pt-5">
            <h2 className="mb-1 text-[13px] font-semibold text-destructive">アカウント削除</h2>
            <p className={`mb-2 ${HINT}`}>
              アカウントとサーバー上の全データ（課題・通知設定・履歴・Google 連携情報）を
              完全に削除します。この操作は取り消せません。
            </p>
            <button
              onClick={() => {
                setDeleteConfirm("");
                setShowDeleteModal(true);
              }}
              className="text-[13px] font-medium text-destructive"
            >
              アカウントを削除
            </button>
          </section>
        )}

        {/* 法的情報 */}
        <section className="border-t border-border pt-5">
          <div className="flex gap-4 text-[11.5px] text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-foreground">利用規約</Link>
          </div>
        </section>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setShowDeleteModal(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h3 className="mb-2 text-[15px] font-bold text-destructive">本当にアカウントを削除しますか？</h3>
            <p className="mb-1 text-[13px] text-muted-foreground">以下がすべて削除され、復元できません：</p>
            <ul className="mb-3 list-inside list-disc space-y-0.5 text-[13px] text-muted-foreground">
              <li>登録・取り込んだ課題</li>
              <li>通知設定・履歴</li>
              <li>Google 連携情報</li>
            </ul>
            <p className="mb-1 text-[11.5px] text-muted-foreground">
              確認のため <strong className="text-foreground">削除</strong> と入力してください
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="削除"
              className={`${INPUT} mb-3`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "削除" || deleting}
                className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "削除中…" : "完全に削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
