"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  cacheAssignments,
  getCachedAssignments,
  deleteCachedByPrefix,
} from "@/lib/cache";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notification-store";
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

async function migrateLocalData(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("db-migrated")) return;

  try {
    const cached = await getCachedAssignments();

    const wcEntries = cached.filter((a) => a.id.startsWith("wc-"));
    if (wcEntries.length > 0) {
      await fetch("/api/import/webclass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: wcEntries }),
      });
    }

    const manualEntries = cached.filter((a) => a.id.startsWith("manual-"));
    for (const a of manualEntries) {
      await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: a.courseName,
          courseColor: a.courseColor,
          title: a.title,
          dueDate: a.dueDate?.toISOString() ?? null,
          submissionState: a.submissionState,
        }),
      });
    }

    // manual-* はDB側で新しいcuid IDになるため、IndexedDBの旧エントリを削除
    if (manualEntries.length > 0) {
      await deleteCachedByPrefix("manual-");
    }
  } catch {
    return;
  }

  localStorage.setItem("db-migrated", "1");
}

async function migrateNotificationSettings(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("settings-synced")) return;

  try {
    const local = await getNotificationSettings();
    await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: local.enabled,
        preset: local.preset,
        mutedCourses: local.mutedCourses,
        mutedAssignments: local.mutedAssignments,
        hiddenCourses: local.hiddenCourses,
      }),
    });
  } catch {
    return;
  }

  localStorage.setItem("settings-synced", "1");
}

export function useAssignments() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCourses, setNewCourses] = useState<{ id: string; name: string }[]>([]);

  const fetchFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classroom");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "取得に失敗しました" }));
        throw new Error(body.error ?? `API ${res.status}`);
      }
      const { assignments: items, newCourses: nc } = await res.json();
      const all = parseAssignments(items);

      lastFetchTime = Date.now();

      await cacheAssignments(all);

      setAssignments(sortByDueDate(all));
      setNewCourses(nc ?? []);
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

  const confirmCourses = useCallback(async (hiddenIds: string[]) => {
    const current = await getNotificationSettings();
    const mergedHidden = [...new Set([...current.hiddenCourses, ...hiddenIds])];
    const allCourseIds = newCourses.map((c) => c.id);
    await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hiddenCourses: mergedHidden,
        acknowledgedCourses: allCourseIds,
      }),
    });
    await saveNotificationSettings({ hiddenCourses: mergedHidden });
    setNewCourses([]);
    await fetchFromApi();
  }, [fetchFromApi, newCourses]);

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
        await migrateLocalData();
        await migrateNotificationSettings();

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

  return { assignments, loading, error, refresh, newCourses, confirmCourses };
}
