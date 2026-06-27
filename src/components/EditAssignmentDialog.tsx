"use client";

import { useState } from "react";
import type { Assignment, SubmissionState } from "@/lib/types";

interface EditAssignmentDialogProps {
  assignment: Assignment;
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function toLocalDatetime(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function EditAssignmentDialog({ assignment, onSave, onClose }: EditAssignmentDialogProps) {
  const [title, setTitle] = useState(assignment.title);
  const [dueDate, setDueDate] = useState(toLocalDatetime(assignment.dueDate));
  const [submissionState, setSubmissionState] = useState<SubmissionState>(assignment.submissionState);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const data: Record<string, unknown> = {};
    if (title !== assignment.title) data.title = title;
    if (dueDate !== toLocalDatetime(assignment.dueDate)) {
      data.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    }
    if (submissionState !== assignment.submissionState) {
      data.submissionState = submissionState;
    }
    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(assignment.id, data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">課題を編集</h2>
          <button onClick={onClose} className="text-sm text-gray-400">
            キャンセル
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">締切日時</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">提出状態</label>
            <select
              value={submissionState}
              onChange={(e) => setSubmissionState(e.target.value as SubmissionState)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="not_submitted">未提出</option>
              <option value="submitted">提出済</option>
              <option value="returned">返却済</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition ${
              saving || !title.trim() ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
