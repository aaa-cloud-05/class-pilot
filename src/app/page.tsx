"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { AssignmentCard } from "@/components/AssignmentCard";
import { NavBar } from "@/components/NavBar";
import { NotificationBanner } from "@/components/NotificationBanner";
import { groupLabel, GROUP_ORDER } from "@/lib/date-utils";
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notification-store";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const { token } = useAuth();
  const { assignments, loading, error, refresh } = useAssignments();

  const [mutedAssignments, setMutedAssignments] = useState<string[]>([]);

  useEffect(() => {
    getNotificationSettings().then((s) => setMutedAssignments(s.mutedAssignments));
  }, []);

  const toggleMute = useCallback(async (id: string) => {
    const settings = await getNotificationSettings();
    const muted = settings.mutedAssignments.includes(id)
      ? settings.mutedAssignments.filter((x) => x !== id)
      : [...settings.mutedAssignments, id];
    await saveNotificationSettings({ mutedAssignments: muted });
    setMutedAssignments(muted);
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const label = groupLabel(a.dueDate);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(a);
    }
    return GROUP_ORDER
      .filter((label) => groups.has(label))
      .map((label) => ({ label, items: groups.get(label)! }));
  }, [assignments]);

  const notSubmittedCount = assignments.filter(
    (a) => a.submissionState === "not_submitted"
  ).length;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">課題</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              未提出 {notSubmittedCount} 件
            </p>
          </div>
          <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </header>

      <NotificationBanner />

      <main className="flex-1 px-5 py-4">
        {loading && assignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">課題を取得中…</p>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button
              onClick={refresh}
              className="text-blue-600 text-sm font-medium"
            >
              再試行
            </button>
          </div>
        )}

        {!loading && assignments.length === 0 && !error && (
          <div className="text-center py-12 space-y-3">
            <p className="text-gray-400 text-sm">課題はありません</p>
            <p className="text-gray-400 text-xs">
              右下の「+」から課題を追加、
              {!token && (
                <>
                  <Link href="/login" className="text-blue-500">Google ログイン</Link>でClassroom連携、
                </>
              )}
              または<Link href="/import" className="text-blue-500">WebClass連携</Link>で取り込めます
            </p>
          </div>
        )}

        {grouped.map(({ label, items }) => (
          <section key={label} className="mb-6">
            <h2
              className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                label === "締切超過" ? "text-red-500" : "text-gray-400"
              }`}
            >
              {label}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  muted={mutedAssignments.includes(a.id)}
                  onToggleMute={toggleMute}
                />
              ))}
            </div>
          </section>
        ))}

        {!loading && assignments.length > 0 && token && (
          <button
            onClick={refresh}
            className="w-full text-center text-xs text-gray-400 py-4"
          >
            タップして更新
          </button>
        )}

        <a
          href="/import"
          className="block text-center text-xs text-gray-300 py-2"
        >
          WebClass 連携
        </a>
      </main>

      <Link
        href="/add"
        className="fixed right-5 bottom-20 z-20 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition mb-[env(safe-area-inset-bottom)]"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>

      <NavBar />
    </div>
  );
}
