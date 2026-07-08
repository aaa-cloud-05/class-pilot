"use client";

import { useAssignments } from "@/hooks/useAssignments";
import { NavBar } from "@/components/NavBar";
import { StatsCard } from "@/components/StatsCard";
import { SubmissionChart } from "@/components/SubmissionChart";
import { useMemo } from "react";
import { isThisWeek } from "date-fns";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DashboardPage() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const { assignments, loading } = useAssignments();

  const stats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter(
      (a) => a.submissionState === "submitted"
    ).length;
    const late = assignments.filter((a) => a.isLate).length;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    const thisWeek = assignments.filter(
      (a) => a.dueDate && isThisWeek(a.dueDate, { weekStartsOn: 1 })
    );
    const thisWeekTotal = thisWeek.length;
    const thisWeekSubmitted = thisWeek.filter(
      (a) => a.submissionState === "submitted"
    ).length;

    // Course breakdown
    const courseMap = new Map<string, { name: string; count: number; color: string }>();
    for (const a of assignments) {
      if (!courseMap.has(a.courseId)) {
        courseMap.set(a.courseId, { name: a.courseName, count: 0, color: a.courseColor });
      }
      courseMap.get(a.courseId)!.count++;
    }
    const courseBreakdown = Array.from(courseMap.values()).sort(
      (a, b) => b.count - a.count
    );

    // Streak: consecutive days with at least one submission (simplified)
    let streak = 0;
    const submittedSet = new Set<string>();
    for (const a of assignments) {
      if (
        (a.submissionState === "submitted") &&
        a.dueDate
      ) {
        submittedSet.add(a.dueDate.toDateString());
      }
    }
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (submittedSet.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      total,
      submitted,
      late,
      rate,
      thisWeekTotal,
      thisWeekSubmitted,
      courseBreakdown,
      streak,
    };
  }, [assignments]);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">振り返り</h1>
          {/* アカウント（暫定的にここへ移設。設定へ） */}
          <Link
            href={loggedIn ? "/settings" : "/login"}
            className={`p-2 ${loggedIn ? "text-blue-500" : "text-gray-300"}`}
            title={loggedIn ? "アカウント（Google ログイン中）" : "ログイン"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a5 5 0 110 10 5 5 0 010-10zm0 12c5.523 0 10 2.239 10 5v1H2v-1c0-2.761 4.477-5 10-5z" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        {loading && assignments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">読み込み中…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Weekly summary */}
            <div className="rounded-2xl bg-blue-50/60 border border-blue-100 p-5 text-center">
              <p className="text-xs text-blue-500 mb-1">今週</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.thisWeekSubmitted}
                <span className="text-lg font-normal text-blue-400">
                  /{stats.thisWeekTotal}
                </span>
              </p>
              <p className="text-xs text-blue-400 mt-1">件 提出済み</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                label="全体の提出率"
                value={`${stats.rate}%`}
                sub={`${stats.submitted}/${stats.total} 件`}
              />
              <StatsCard
                label="連続提出"
                value={stats.streak}
                sub="日"
                color={stats.streak >= 7 ? "#FF9500" : "#007AFF"}
              />
              <StatsCard
                label="遅延提出"
                value={stats.late}
                sub="件"
                color={stats.late > 0 ? "#FF3B30" : "#34C759"}
              />
              <StatsCard
                label="総課題数"
                value={stats.total}
                sub="件"
              />
            </div>

            {/* Course breakdown chart */}
            <SubmissionChart data={stats.courseBreakdown} />
          </div>
        )}
      </main>

      <NavBar />
    </div>
  );
}
