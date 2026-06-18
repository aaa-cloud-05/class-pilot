"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/hooks/useAssignments";
import { CalendarGrid } from "@/components/CalendarGrid";
import { NavBar } from "@/components/NavBar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CalendarPage() {
  const { token, loading: authLoading } = useAuth();
  const { assignments, loading } = useAssignments();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

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
        <h1 className="text-2xl font-bold tracking-tight">カレンダー</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        {loading && assignments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">読み込み中…</p>
        ) : (
          <CalendarGrid assignments={assignments} />
        )}
      </main>

      <NavBar />
    </div>
  );
}
