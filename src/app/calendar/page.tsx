"use client";

import { useAssignments } from "@/hooks/useAssignments";
import { CalendarGrid } from "@/components/CalendarGrid";
import { NavBar } from "@/components/NavBar";
import { AppHeader } from "@/components/app-header";
import { AssignmentCard } from "@/components/AssignmentCard";
import { EditAssignmentDialog } from "@/components/EditAssignmentDialog";
import { useSession } from "next-auth/react";
import { groupLabel, GROUP_ORDER } from "@/lib/date-utils";
import type { Assignment } from "@/lib/types";
import {
  getNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notification-store";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function CalendarPage() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const { assignments, loading, removeAssignment, applyEdit } = useAssignments();

  const [mutedAssignments, setMutedAssignments] = useState<string[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

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

  const handleEdit = useCallback((id: string) => {
    const a = assignments.find((x) => x.id === id);
    if (a) setEditingAssignment(a);
  }, [assignments]);

  const handleSaveEdit = useCallback(async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[EDIT]", res.status, body);
      alert("保存に失敗しました");
      return;
    }
    const { assignment } = await res.json();
    await applyEdit({
      ...assignment,
      dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
    });
    setEditingAssignment(null);
  }, [applyEdit]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("この課題を削除しますか？")) return;
    const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      alert("削除に失敗しました");
      return;
    }
    removeAssignment(id);
  }, [removeAssignment]);

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

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <AppHeader />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        {loading && assignments.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <CalendarGrid assignments={assignments} />
        )}

        {/* 全件一覧（グループ表示） */}
        {assignments.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              すべての課題
            </h2>
            {grouped.map(({ label, items }) => (
              <section key={label} className="mb-6">
                <h3
                  className={`mb-2 text-xs font-semibold uppercase tracking-wider ${
                    label === "締切超過" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </h3>
                <div className="flex flex-col gap-2">
                  {items.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      muted={mutedAssignments.includes(a.id)}
                      onToggleMute={toggleMute}
                      onEdit={loggedIn ? handleEdit : undefined}
                      onDelete={loggedIn ? handleDelete : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <NavBar />

      {editingAssignment && (
        <EditAssignmentDialog
          assignment={editingAssignment}
          onSave={handleSaveEdit}
          onClose={() => setEditingAssignment(null)}
        />
      )}
    </div>
  );
}
