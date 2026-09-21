import { addDays, format, isSameDay, isSameWeek } from "date-fns"
import { ja } from "date-fns/locale"
import type { MockAssignment } from "./data"

/**
 * 課題の状態は5つ。色は1行に最大1つだけ使う。
 *  done     提出済み          緑のチェック
 *  overdue  締切を過ぎた未提出 赤の文字
 *  soon     24時間以内        橙の文字
 *  open     それ以外の未提出   色なし
 *  unknown  提出状況が不明     色なし・点線の丸・「未確認」バッジ（WebClass で多い）
 */
export type TaskState = "done" | "overdue" | "soon" | "open" | "unknown"

export function taskState(a: MockAssignment, now: Date): TaskState {
  if (a.status === "submitted") return "done"
  if (a.status === "unknown") return "unknown"
  if (!a.due) return "open"
  const diff = a.due.getTime() - now.getTime()
  if (diff < 0) return "overdue"
  if (diff < 24 * 3600_000) return "soon"
  return "open"
}

/** 右側に出す締切の文字と色 */
export function dueText(a: MockAssignment, now: Date): { text: string; className: string } {
  const state = taskState(a, now)
  if (!a.due) return { text: "期限なし", className: "text-muted-foreground" }

  const diff = a.due.getTime() - now.getTime()
  const min = Math.round(Math.abs(diff) / 60_000)
  const hours = Math.floor(min / 60)
  const days = Math.floor(hours / 24)

  if (state === "overdue") {
    const t = min < 60 ? `${min}分` : hours < 24 ? `${hours}時間` : `${days}日`
    return { text: `${t}遅れ`, className: "text-destructive font-medium" }
  }
  if (state === "soon") {
    const t = min < 60 ? `あと${min}分` : `あと${hours}時間`
    return { text: t, className: "text-warn font-medium" }
  }
  if (isSameDay(a.due, now)) return { text: format(a.due, "HH:mm"), className: "text-muted-foreground" }
  if (isSameDay(a.due, addDays(now, 1))) return { text: `明日 ${format(a.due, "HH:mm")}`, className: "text-muted-foreground" }
  if (isSameWeek(a.due, now, { weekStartsOn: 1 }))
    return { text: format(a.due, "E HH:mm", { locale: ja }), className: "text-muted-foreground" }
  return { text: format(a.due, "M/d HH:mm"), className: "text-muted-foreground" }
}

export function dueLong(due: Date | null): string {
  return due ? format(due, "M月d日(E) HH:mm", { locale: ja }) : "期限なし"
}

/* ─────────────── 並べ方 ─────────────── */

export type GroupKey = "overdue" | "today" | "tomorrow" | "week" | "later" | "nodue"

export const GROUP_LABEL: Record<GroupKey, string> = {
  overdue: "期限切れ",
  today: "今日",
  tomorrow: "明日",
  week: "今週",
  later: "それ以降",
  nodue: "期限なし",
}

const ORDER: GroupKey[] = ["overdue", "today", "tomorrow", "week", "later", "nodue"]

export function groupOf(a: MockAssignment, now: Date): GroupKey {
  if (!a.due) return "nodue"
  if (a.due < now) return "overdue"
  if (isSameDay(a.due, now)) return "today"
  if (isSameDay(a.due, addDays(now, 1))) return "tomorrow"
  if (isSameWeek(a.due, now, { weekStartsOn: 1 })) return "week"
  return "later"
}

export interface Group {
  key: GroupKey
  items: MockAssignment[]
  /** そのグループで提出済みのもの（既定では畳んでおく） */
  done: MockAssignment[]
}

export function groupAssignments(list: MockAssignment[], now: Date): Group[] {
  const open = new Map<GroupKey, MockAssignment[]>()
  const done = new Map<GroupKey, MockAssignment[]>()
  for (const a of list) {
    const key = groupOf(a, now)
    const map = a.status === "submitted" ? done : open
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  const byDue = (x: MockAssignment, y: MockAssignment) =>
    (x.due?.getTime() ?? Number.POSITIVE_INFINITY) - (y.due?.getTime() ?? Number.POSITIVE_INFINITY)

  return ORDER.filter((k) => open.has(k) || done.has(k)).map((key) => ({
    key,
    items: (open.get(key) ?? []).sort(byDue),
    done: (done.get(key) ?? []).sort(byDue),
  }))
}
