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

const PRESETS: { value: NotificationPreset; label: string; desc: string }[] = [
  { value: "relaxed", label: "余裕派", desc: "締切24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前 + 3時間前" },
  { value: "urgent", label: "ギリギリ派", desc: "3時間前 + 1時間前" },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";
  const { assignments } = useAssignments();
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    getNotificationSettings().then(setSettings);
    setNotifPermission(
      typeof Notification !== "undefined" ? Notification.permission : "unsupported"
    );
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((data) => setEmailEnabled(data.settings?.emailEnabled ?? false))
      .catch(() => {});
  }, [loggedIn]);

  async function updateSettings(patch: Partial<Omit<NotificationSettings, "id">>) {
    await saveNotificationSettings(patch);
    const updated = await getNotificationSettings();
    setSettings(updated);
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
      </main>
    </div>
  );
}
