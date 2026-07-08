import type { SyncFreshness, TaskStatus } from "@/lib/dashboard-data"

export type LampTone = "green" | "amber" | "red" | "muted"

export const TONE_COLOR: Record<LampTone, string> = {
  green: "var(--lamp-green)",
  amber: "var(--lamp-amber)",
  red: "var(--lamp-red)",
  muted: "var(--lamp-muted)",
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
  }
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  submitted: "提出済",
  pending: "未提出（締切前）",
  "not-submitted": "締切超過",
  optional: "不明",
}
