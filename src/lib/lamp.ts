import { isPast } from "date-fns"
import type { SyncFreshness, TaskStatus } from "@/lib/dashboard-data"
import type { Assignment } from "@/lib/types"

export type LampTone = "green" | "amber" | "red" | "muted" | "blue"

export const TONE_COLOR: Record<LampTone, string> = {
  green: "var(--lamp-green)",
  amber: "var(--lamp-amber)",
  red: "var(--lamp-red)",
  muted: "var(--lamp-muted)",
  blue: "var(--accent-blue)",
}

export function toneForStatus(status: TaskStatus): LampTone {
  switch (status) {
    case "submitted":
      return "green"
    case "pending":
      return "amber"
    case "not-submitted":
      return "red"
    case "optional":
      return "muted"
  }
}

export function toneForFreshness(freshness: SyncFreshness): LampTone {
  switch (freshness) {
    case "fresh":
      return "green"
    case "aging":
      return "amber"
    case "stale":
      return "red"
    case "unknown":
      return "muted"
  }
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  submitted: "提出済",
  pending: "未提出（締切前）",
  "not-submitted": "締切超過",
  optional: "不明",
}

/** Assignment(3状態＋締切) → 状態色。週カレンダー/月カレンダー/リストで共通に使う。 */
export function assignmentStatusColor(a: Assignment): string {
  if (a.submissionState === "submitted") return TONE_COLOR.green
  if (a.submissionState === "unknown") return TONE_COLOR.muted
  if (a.dueDate && isPast(a.dueDate)) return TONE_COLOR.red
  return TONE_COLOR.amber
}
