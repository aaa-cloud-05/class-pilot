"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { upsertCache } from "@/lib/cache";
import { COURSE_COLORS } from "@/lib/types";
import type { Assignment, SubmissionState } from "@/lib/types";
import { AppHeader } from "@/components/app-header";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring";
const LABEL = "mb-1.5 block text-[12px] font-medium text-muted-foreground";

export default function AddAssignmentPage() {
  const router = useRouter();
  const session = useSession();
  const loggedIn = session.status === "authenticated";
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

    if (loggedIn) {
      try {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseName: courseName.trim(),
            courseColor: COURSE_COLORS[colorIndex],
            title: title.trim(),
            dueDate: dueDate?.toISOString() ?? null,
            submissionState: status,
          }),
        });
        if (!res.ok) throw new Error("保存に失敗しました");
        const { assignment } = await res.json();
        await upsertCache({
          ...assignment,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
        });
      } catch {
        setSaving(false);
        return;
      }
    } else {
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
      await upsertCache(assignment);
    }

    router.push("/");
  }

  const canSubmit = courseName.trim() && title.trim() && !saving;

  return (
    <>
      <AppHeader />

      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
        <h1 className="mb-4 px-1 text-[15px] font-semibold text-foreground">課題を追加</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 教科名 */}
          <div>
            <label className={LABEL}>教科名</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="例: 情報工学概論"
              className={INPUT}
              required
            />
          </div>

          {/* カラー */}
          <div>
            <label className={LABEL}>カラー</label>
            <div className="flex flex-wrap gap-2.5">
              {COURSE_COLORS.map((color, i) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorIndex(i)}
                  aria-label={`カラー ${i + 1}`}
                  aria-pressed={colorIndex === i}
                  className={cn(
                    "h-8 w-8 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                    colorIndex === i && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className={LABEL}>課題タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: レポート第3回"
              className={INPUT}
              required
            />
          </div>

          {/* 締切日 */}
          <div>
            <label className={LABEL}>締切日（任意）</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
          </div>

          {/* 締切時間 */}
          {date && (
            <div>
              <label className={LABEL}>締切時間</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} />
            </div>
          )}

          {/* 提出ステータス */}
          <div>
            <label className={LABEL}>ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubmissionState)}
              className={INPUT}
            >
              <option value="not_submitted">未提出</option>
              <option value="submitted">提出済み</option>
            </select>
          </div>

          {/* 送信 */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "保存中…" : "追加する"}
          </button>
        </form>
      </main>

      <NavBar />
    </>
  );
}
