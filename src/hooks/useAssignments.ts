"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  replaceCache,
  getCachedAssignments,
  deleteCachedByPrefix,
  upsertCache,
  removeCache,
} from "@/lib/cache";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notification-store";
import type { Assignment } from "@/lib/types";

// Google同期(段3)のみ throttle する。DB読込(段2)は毎回実行する。
const SYNC_TTL_MS = 5 * 60 * 1000;
let lastSyncTime = 0;

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

/** ローカル専用課題(wc-/manual-)を初回ログイン時にDBへ引き上げる（方向: local→server）。 */
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

/**
 * サーバの通知設定をローカル(IndexedDB)へ取り込む（方向: server→local pull）。
 * サーバが真実のソース。以前のように「デフォルトをpushして上書き」しないため、
 * キャッシュ消去や別端末ログインでサーバ設定(hiddenCourses等)が消えない。
 */
async function pullNotificationSettings(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/notifications/settings");
    if (!res.ok) return;
    const { settings } = await res.json();
    if (!settings) return;
    await saveNotificationSettings({
      enabled: settings.enabled,
      preset: settings.preset,
      mutedCourses: settings.mutedCourses ?? [],
      mutedAssignments: settings.mutedAssignments ?? [],
      hiddenCourses: settings.hiddenCourses ?? [],
    });
  } catch {
    // ignore
  }
}

export function useAssignments() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 現在表示中の件数を追跡し、表示がある状態でのエラー点滅を防ぐ
  const assignmentsRef = useRef<Assignment[]>([]);
  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  // 段2: DBから高速読込（Googleを叩かない＝速い・堅牢）。毎回実行。
  const loadFromDb = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error(`API ${res.status}`);
      const { assignments: items } = await res.json();
      const all = parseAssignments(items);
      setAssignments(sortByDueDate(all));
      setError(null);
      await replaceCache(all);
    } catch (e) {
      // 表示済みデータがある場合はエラーを出さない（キャッシュ表示を維持）
      if (assignmentsRef.current.length === 0) {
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      }
    }
  }, []);

  // 段3: Google同期（裏で実行・throttle）。失敗しても既存表示を維持。
  const syncWithGoogle = useCallback(async (force: boolean) => {
    if (!force && Date.now() - lastSyncTime < SYNC_TTL_MS) return;
    try {
      const res = await fetch("/api/classroom/sync", { method: "POST" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const { assignments: items } = await res.json();
      const all = parseAssignments(items);
      lastSyncTime = Date.now();
      setAssignments(sortByDueDate(all));
      setError(null);
      await replaceCache(all);
    } catch (e) {
      console.error("[useAssignments] Google同期に失敗:", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    await loadFromDb();
    await syncWithGoogle(true);
    setLoading(false);
  }, [loggedIn, loadFromDb, syncWithGoogle]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 段1: キャッシュを即描画
      let hadCache = false;
      try {
        const cached = await getCachedAssignments();
        if (cached.length > 0 && !cancelled) {
          setAssignments(sortByDueDate(cached));
          hadCache = true;
        }
      } catch {
        // IndexedDB unavailable
      }

      if (!loggedIn) {
        if (!cancelled) setLoading(false);
        return;
      }

      await migrateLocalData();
      await pullNotificationSettings();

      // キャッシュ表示があればローディングは外してよい（段2は裏で更新）
      if (hadCache && !cancelled) setLoading(false);

      // 段2: DB読込（毎回・throttleしない）。キャッシュ空でもここで素早く表示される。
      await loadFromDb();
      if (!cancelled) setLoading(false);

      // 段3: Google同期（throttle付き・待たずに裏で）
      if (!cancelled) void syncWithGoogle(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, loadFromDb, syncWithGoogle]);

  const removeAssignment = useCallback(async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    try {
      await removeCache(id);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  const applyEdit = useCallback(async (updated: Assignment) => {
    setAssignments((prev) =>
      sortByDueDate(prev.map((a) => (a.id === updated.id ? updated : a))),
    );
    try {
      await upsertCache(updated);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  return {
    assignments,
    loading,
    error,
    refresh,
    removeAssignment,
    applyEdit,
  };
}
