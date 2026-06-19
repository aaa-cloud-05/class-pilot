"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import { cacheAssignments, getCachedAssignments } from "@/lib/cache";
import type { Assignment } from "@/lib/types";

export function useAssignments() {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { allWork } = await fetchAllData();
      const classroomItems = allWork.map(({ course, work, submission }) =>
        transformAssignment(course, work, submission)
      );
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
  }, [token]);

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
      if (token) {
        await refresh();
      } else {
        setLoading(false);
      }
    }
    init();
  }, [token, refresh]);

  return { assignments, loading, error, refresh };
}
