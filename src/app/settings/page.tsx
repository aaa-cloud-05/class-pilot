"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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

const PRESETS: { value: NotificationPreset; label: string; desc: string }[] = [
  { value: "relaxed", label: "余裕派", desc: "締切24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前 + 3時間前" },
  { value: "urgent", label: "ギリギリ派", desc: "3時間前 + 1時間前" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";
  const { assignments, refresh } = useAssignments();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [hiddenCourses, setHiddenCourses] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
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

  function saveWebclass() {
    const ok = setWebclassUrl(webclassInput);
    setWebclassMsg(
      ok
        ? { ok: true, text: webclassInput.trim() ? "保存しました" : "クリアしました" }
        : { ok: false, text: "http(s) の URL を入力してください" }
    );
  }

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((data) => {
        setEmailEnabled(data.settings?.emailEnabled ?? false);
      })
      .catch(() => {});
    // 非表示コースも含めた全コースを取得（再追跡できるようにするため）
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        setAllCourses(data.courses ?? []);
        setHiddenCourses(data.hiddenCourses ?? []);
      })
      .catch(() => {});
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

  const mutedAssignmentList = assignments.filter(
    (a) => settings?.mutedAssignments.includes(a.id)
  );

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 font-medium"
          >
            戻る
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 py-4 space-y-6">
        {/* 通知 ON/OFF */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">通知</h2>
            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.enabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.enabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          {notifPermission === "denied" && (
            <p className="text-xs text-red-500 mt-1">
              ブラウザの通知がブロックされています。ブラウザの設定から許可してください。
            </p>
          )}
          {notifPermission === "granted" && (
            <button
              onClick={sendTestNotification}
              className="mt-2 text-xs text-blue-600 font-medium"
            >
              テスト通知を送信
            </button>
          )}
        </section>

        {/* メール通知 */}
        {loggedIn && settings.enabled && (
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">メール通知</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {session?.user?.email ?? ""} に締切通知を送信
                </p>
              </div>
              <button
                onClick={toggleEmailNotification}
                disabled={emailLoading}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  emailEnabled ? "bg-blue-600" : "bg-gray-300"
                } ${emailLoading ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    emailEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {/* プリセット */}
        {settings.enabled && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">通知タイミング</h2>
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    settings.preset === p.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={p.value}
                    checked={settings.preset === p.value}
                    onChange={() => updateSettings({ preset: p.value })}
                    className="accent-blue-600"
                  />
                  <div>
                    <span className="text-sm font-medium">{p.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{p.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* コース管理 */}
        {loggedIn && allCourses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">コース管理</h2>
            <p className="text-xs text-gray-500 mb-2">
              非表示にしたコースの課題は取り込まれません。「非表示」をタップすると再び追跡します。
            </p>
            <div className="space-y-1">
              {allCourses.map((course) => {
                const hidden = hiddenCourses.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg"
                  >
                    <span className={`text-sm truncate flex-1 ${hidden ? "text-gray-400" : "text-gray-800"}`}>
                      {course.name}
                    </span>
                    <button
                      onClick={async () => {
                        const next = hidden
                          ? hiddenCourses.filter((id) => id !== course.id)
                          : [...hiddenCourses, course.id];
                        setHiddenCourses(next);
                        await fetch("/api/notifications/settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ hiddenCourses: next }),
                        });
                        await saveNotificationSettings({ hiddenCourses: next });
                        if (hidden) refresh();
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        hidden
                          ? "bg-gray-200 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {hidden ? "非表示" : "追跡中"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* コースごとのミュート */}
        {settings.enabled && courses.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">コース通知</h2>
            <div className="space-y-1">
              {courses.map((course) => {
                const muted = settings.mutedCourses.includes(course.id);
                return (
                  <div
                    key={course.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg"
                  >
                    <span className="text-sm text-gray-800 truncate flex-1">
                      {course.name}
                    </span>
                    <button
                      onClick={() => {
                        const mutedCourses = muted
                          ? settings.mutedCourses.filter((id) => id !== course.id)
                          : [...settings.mutedCourses, course.id];
                        updateSettings({ mutedCourses });
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        muted
                          ? "bg-gray-200 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {muted ? "ミュート中" : "ON"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ミュート中の課題 */}
        {settings.enabled && mutedAssignmentList.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              ミュート中の課題
            </h2>
            <div className="space-y-1">
              {mutedAssignmentList.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.courseName}</p>
                  </div>
                  <button
                    onClick={() => {
                      const mutedAssignments = settings.mutedAssignments.filter(
                        (id) => id !== a.id
                      );
                      updateSettings({ mutedAssignments });
                    }}
                    className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WebClass 連携 */}
        <section className="pt-4 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">WebClass の URL</h2>
          <p className="text-xs text-gray-500 mb-2">
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveWebclass}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium active:bg-blue-700"
            >
              保存
            </button>
          </div>
          {webclassMsg && (
            <p className={`mt-1 text-xs ${webclassMsg.ok ? "text-green-600" : "text-red-500"}`}>
              {webclassMsg.text}
            </p>
          )}
        </section>

        {/* アカウント */}
        <section className="pt-4 border-t border-gray-100">
          {loggedIn ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-red-500 font-medium"
            >
              Google ログアウト
            </button>
          ) : (
            <a href="/login" className="text-sm text-blue-600 font-medium">
              Google ログイン（Classroom連携）
            </a>
          )}
        </section>

        {/* デバッグ: ローカルデータ削除 */}
        <section className="pt-4 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">デバッグ</h2>
          <p className="text-xs text-gray-500 mb-2">
            端末内のキャッシュ（IndexedDB・Cache・SW・localStorage）を全削除します。
            ログイン状態は維持されます。
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
            className={`text-sm font-medium ${
              clearing ? "text-gray-400" : "text-red-500"
            }`}
          >
            {clearing ? "削除中…" : "ローカルデータを全消去"}
          </button>
        </section>

        {/* アカウント削除（危険ゾーン） */}
        {loggedIn && (
          <section className="pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-red-600 mb-1">アカウント削除</h2>
            <p className="text-xs text-gray-500 mb-2">
              アカウントとサーバー上の全データ（課題・通知設定・履歴・Google 連携情報）を
              完全に削除します。この操作は取り消せません。
            </p>
            <button
              onClick={() => {
                setDeleteConfirm("");
                setShowDeleteModal(true);
              }}
              className="text-sm font-medium text-red-600"
            >
              アカウントを削除
            </button>
          </section>
        )}

        {/* 法的情報 */}
        <section className="pt-4 border-t border-gray-100">
          <div className="flex gap-4 text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600">プライバシーポリシー</a>
            <a href="/terms" className="hover:text-gray-600">利用規約</a>
          </div>
        </section>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-red-600 mb-2">
              本当にアカウントを削除しますか？
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              以下がすべて削除され、復元できません：
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-3 space-y-0.5">
              <li>登録・取り込んだ課題</li>
              <li>通知設定・履歴</li>
              <li>Google 連携情報</li>
            </ul>
            <p className="text-xs text-gray-500 mb-1">
              確認のため <strong className="text-gray-700">削除</strong> と入力してください
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="削除"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "削除" || deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {deleting ? "削除中…" : "完全に削除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
