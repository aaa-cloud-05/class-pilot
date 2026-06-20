"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { cacheAssignments, getCachedAssignments } from "@/lib/cache";
import type { Assignment } from "@/lib/types";

export function useAssignments() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classroom");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "取得に失敗しました" }));
        throw new Error(body.error ?? `API ${res.status}`);
      }
      const { assignments: items } = await res.json();
      const classroomItems: Assignment[] = items.map((a: Assignment & { dueDate: string | null }) => ({
        ...a,
        dueDate: a.dueDate ? new Date(a.dueDate) : null,
      }));
      await cacheAssignments(classroomItems);

      const all = await getCachedAssignments();
      all.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
      setAssignments(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    async function init() {
      try {
        const cached = await getCachedAssignments();
        if (cached.length > 0) {
          cached.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.getTime() - b.dueDate.getTime();
          });
          setAssignments(cached);
        }
      } catch {
        // IndexedDB unavailable
      }
      if (loggedIn) {
        await refresh();
      } else {
        setLoading(false);
      }
    }
    init();
  }, [loggedIn, refresh]);

  return { assignments, loading, error, refresh };
}
