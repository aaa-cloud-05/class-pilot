"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cacheAssignments } from "@/lib/cache";
import { COURSE_COLORS } from "@/lib/types";
import type { Assignment, SubmissionState } from "@/lib/types";

export default function AddAssignmentPage() {
  const router = useRouter();
  const [courseName, setCourseName] = useState("");
  const [title, setTitle] = useState("");
  const [colorIndex, setColorIndex] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [status, setStatus] = useState<SubmissionState>("not_submitted");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseName.trim() || !title.trim()) return;

    setSaving(true);

    const dueDate = date ? new Date(`${date}T${time}:00`) : null;
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const courseId = `manual-course-${courseName.trim().toLowerCase().replace(/\s+/g, "-")}`;

    const assignment: Assignment = {
      id,
      courseId,
      courseName: courseName.trim(),
      courseColor: COURSE_COLORS[colorIndex],
      title: title.trim(),
      dueDate,
      link: "",
      submissionState: status,
      isLate: dueDate ? dueDate < new Date() && status === "not_submitted" : false,
      source: "manual",
    };

    await cacheAssignments([assignment]);
    router.push("/");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">課題を追加</h1>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 font-medium"
          >
            戻る
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-5 py-4 space-y-5">
        {/* 教科名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            教科名
          </label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="例: 情報工学概論"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* カラー */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カラー
          </label>
          <div className="flex gap-2">
            {COURSE_COLORS.map((color, i) => (
              <button
                key={color}
                type="button"
                onClick={() => setColorIndex(i)}
                className={`w-8 h-8 rounded-full border-2 transition ${
                  colorIndex === i ? "border-gray-800 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            課題タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: レポート第3回"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* 締切日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            締切日（任意）
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 締切時間 */}
        {date && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              締切時間
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* 提出ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubmissionState)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="not_submitted">未提出</option>
            <option value="submitted">提出済み</option>
            <option value="returned">返却済み</option>
          </select>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={saving || !courseName.trim() || !title.trim()}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "保存中..." : "追加する"}
        </button>
      </form>
    </div>
  );
}
