"use client";

import { useState } from "react";

interface CourseSelectDialogProps {
  courses: { id: string; name: string }[];
  onConfirm: (hiddenIds: string[]) => void;
}

export function CourseSelectDialog({ courses, onConfirm }: CourseSelectDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(courses.map((c) => c.id)),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = selected.size === courses.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(courses.map((c) => c.id)));
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    const hiddenIds = courses
      .filter((c) => !selected.has(c.id))
      .map((c) => c.id);
    await onConfirm(hiddenIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold">追跡するコースを選択</h2>
          <p className="text-xs text-gray-500 mt-1">
            チェックを外したコースの課題は取り込まれません。後から設定で変更できます。
          </p>
        </div>

        <div className="px-5 pb-2">
          <button
            onClick={toggleAll}
            className="text-xs text-blue-600 font-medium"
          >
            {allSelected ? "すべて解除" : "すべて選択"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <div className="space-y-1">
            {courses.map((course) => (
              <label
                key={course.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(course.id)}
                  onChange={() => toggle(course.id)}
                  className="accent-blue-600 w-4 h-4 shrink-0"
                />
                <span className="text-sm text-gray-800 truncate">
                  {course.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition ${
              saving ? "bg-blue-400" : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {saving ? "保存中…" : `決定（${selected.size}件を追跡）`}
          </button>
        </div>
      </div>
    </div>
  );
}
