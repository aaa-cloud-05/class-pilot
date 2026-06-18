"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { AssignmentCard } from "@/components/AssignmentCard";
import { NavBar } from "@/components/NavBar";
import { groupLabel, GROUP_ORDER } from "@/lib/date-utils";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function HomePage() {
  const { token, loading: authLoading } = useAuth();
  const { assignments, loading, error, refresh } = useAssignments();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

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

  if (authLoading || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">課題</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          未提出 {notSubmittedCount} 件
        </p>
      </header>

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
          <p className="text-center text-gray-400 text-sm py-12">
            課題はありません
          </p>
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
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          </section>
        ))}

        {!loading && assignments.length > 0 && (
          <button
            onClick={refresh}
            className="w-full text-center text-xs text-gray-400 py-4"
          >
            タップして更新
          </button>
        )}
      </main>

      <NavBar />
    </div>
  );
}
