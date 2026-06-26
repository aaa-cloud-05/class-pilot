"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { cacheAssignments, getCachedAssignments, clearCache } from "@/lib/cache";
import type { Assignment } from "@/lib/types";

const TTL_MS = 5 * 60 * 1000;
let lastFetchTime = 0;

function sortByDueDate(list: Assignment[]): Assignment[] {
  return [...list].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

function parseAssignments(items: Record<string, unknown>[]): Assignment[] {
  return items.map((a) => ({
    ...(a as unknown as Assignment),
    dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
  }));
}

export function useAssignments() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classroom");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "取得に失敗しました" }));
        throw new Error(body.error ?? `API ${res.status}`);
      }
      const { assignments: items } = await res.json();
      const all = parseAssignments(items);

      lastFetchTime = Date.now();

      await clearCache();
      await cacheAssignments(all);

      setAssignments(sortByDueDate(all));
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!loggedIn) return;
    await fetchFromApi();
  }, [loggedIn, fetchFromApi]);

  useEffect(() => {
    async function init() {
      try {
        const cached = await getCachedAssignments();
        if (cached.length > 0) {
          setAssignments(sortByDueDate(cached));
        }
      } catch {
        // IndexedDB unavailable
      }

      if (loggedIn) {
        if (Date.now() - lastFetchTime < TTL_MS) {
          setLoading(false);
        } else {
          await fetchFromApi();
        }
      } else {
        setLoading(false);
      }
    }
    init();
  }, [loggedIn, fetchFromApi]);

  return { assignments, loading, error, refresh };
}
