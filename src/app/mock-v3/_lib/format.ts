import { addDays, addWeeks, format, isSameDay, isSameWeek } from "date-fns"
import { ja } from "date-fns/locale"
import type { MockAssignment, Status } from "./data"

export type Tone = "danger" | "warn" | "neutral" | "ok"

export type GroupKey = "overdue" | "today" | "tomorrow" | "thisWeek" | "nextWeek" | "later" | "noDue" | "past"

export const GROUP_LABEL: Record<GroupKey, string> = {
  overdue: "期限切れ",
  today: "今日",
  tomorrow: "明日",
  thisWeek: "今週",
  nextWeek: "来週",
  later: "それ以降",
  noDue: "期限なし",
  past: "締切を過ぎた提出済み",
}

const GROUP_ORDER: GroupKey[] = ["overdue", "today", "tomorrow", "thisWeek", "nextWeek", "later", "noDue", "past"]

const WEEK = { weekStartsOn: 1 as const }

export function groupOf(a: MockAssignment, now: Date): GroupKey {
  if (!a.due) return "noDue"
  if (a.due < now) return a.status === "submitted" ? "past" : "overdue"
  if (isSameDay(a.due, now)) return "today"
  if (isSameDay(a.due, addDays(now, 1))) return "tomorrow"
  if (isSameWeek(a.due, now, WEEK)) return "thisWeek"
  if (isSameWeek(a.due, addWeeks(now, 1), WEEK)) return "nextWeek"
  return "later"
}

const STATUS_RANK: Record<Status, number> = { not_submitted: 0, unknown: 1, submitted: 2 }

export type SortMode = "due" | "status"

export function groupAssignments(
  list: MockAssignment[],
  now: Date,
  opts: { includeSubmitted: boolean; sort: SortMode },
): { key: GroupKey; items: MockAssignment[] }[] {
  const buckets = new Map<GroupKey, MockAssignment[]>()
  for (const a of list) {
    if (!opts.includeSubmitted && a.status === "submitted") continue
    const key = groupOf(a, now)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(a)
  }
  const byDue = (x: MockAssignment, y: MockAssignment) =>
    (x.due?.getTime() ?? Number.POSITIVE_INFINITY) - (y.due?.getTime() ?? Number.POSITIVE_INFINITY)
  return GROUP_ORDER.filter((k) => buckets.has(k)).map((key) => {
    const items = [...buckets.get(key)!].sort((x, y) =>
      opts.sort === "status" ? STATUS_RANK[x.status] - STATUS_RANK[y.status] || byDue(x, y) : byDue(x, y),
    )
    if (key === "past") items.reverse()
    return { key, items }
  })
}

function relAhead(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `あと${Math.max(1, min)}分`
  const h = Math.floor(min / 60)
  if (h < 24) return `あと${h}時間`
  return `あと${Math.floor(h / 24)}日`
}

function relPast(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${Math.max(1, min)}分超過`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}時間超過`
  return `${Math.floor(h / 24)}日超過`
}

/** リスト右側の締切表示（上段＝日時、下段＝残り時間） */
export function dueLabel(a: MockAssignment, now: Date): { main: string; sub: string | null; tone: Tone } {
  if (!a.due) return { main: "期限なし", sub: null, tone: "neutral" }
  const diff = a.due.getTime() - now.getTime()
  const submitted = a.status === "submitted"
  if (diff < 0) {
    return {
      main: format(a.due, "M/d HH:mm"),
      sub: submitted ? "提出済み" : relPast(-diff),
      tone: submitted ? "ok" : "danger",
    }
  }
  if (isSameDay(a.due, now)) {
    return { main: format(a.due, "HH:mm"), sub: submitted ? "提出済み" : relAhead(diff), tone: submitted ? "ok" : "warn" }
  }
  if (isSameDay(a.due, addDays(now, 1))) {
    return {
      main: `明日 ${format(a.due, "HH:mm")}`,
      sub: submitted ? "提出済み" : relAhead(diff),
      tone: submitted ? "ok" : diff < 24 * 3600_000 ? "warn" : "neutral",
    }
  }
  if (isSameWeek(a.due, now, WEEK)) {
    return {
      main: format(a.due, "E HH:mm", { locale: ja }),
      sub: submitted ? "提出済み" : relAhead(diff),
      tone: submitted ? "ok" : "neutral",
    }
  }
  return {
    main: format(a.due, "M/d(E)", { locale: ja }),
    sub: submitted ? "提出済み" : format(a.due, "HH:mm"),
    tone: submitted ? "ok" : "neutral",
  }
}

/** 詳細シート用の締切（長い形） */
export function dueLong(due: Date | null): string {
  if (!due) return "期限なし"
  return format(due, "M月d日(E) HH:mm", { locale: ja })
}

export function relativeLabel(a: MockAssignment, now: Date): { text: string; tone: Tone } | null {
  if (!a.due) return null
  const diff = a.due.getTime() - now.getTime()
  if (a.status === "submitted") return { text: "提出済み", tone: "ok" }
  if (diff < 0) return { text: relPast(-diff), tone: "danger" }
  return { text: relAhead(diff), tone: diff < 24 * 3600_000 ? "warn" : "neutral" }
}

export const STATUS_LABEL: Record<Status, string> = {
  not_submitted: "未提出",
  submitted: "提出済み",
  unknown: "不明",
}

export const SOURCE_LABEL = { classroom: "Classroom", webclass: "WebClass", manual: "自分で追加" } as const

export function timeAgo(at: Date, now: Date): string {
  const min = Math.round((now.getTime() - at.getTime()) / 60_000)
  if (min < 1) return "たった今"
  if (min < 60) return `${min}分前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

export const TONE_TEXT: Record<Tone, string> = {
  danger: "text-destructive",
  warn: "text-warn",
  ok: "text-ok",
  neutral: "text-muted-foreground",
}
