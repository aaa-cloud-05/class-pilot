import {
  addDays,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameWeek,
  startOfMonth,
} from "date-fns"
import { ja } from "date-fns/locale"
import type { MockAssignment, Status } from "./data"

export type Tone = "danger" | "warn" | "neutral" | "ok"

/* ───────── 「最近」タブの分類 ───────── */

export type GroupKey = "recent" | "today" | "tomorrow" | "thisWeek" | "noDue"

export const GROUP_LABEL: Record<GroupKey, string> = {
  recent: "直近の未提出",
  today: "今日",
  tomorrow: "明日",
  thisWeek: "今週",
  noDue: "期限なしの未提出",
}

const RECENT_ORDER: GroupKey[] = ["recent", "today", "tomorrow", "thisWeek", "noDue"]

const WEEK = { weekStartsOn: 1 as const }

/** hidden＝「最近」には出さないもの（過去の提出済み・期限なしの提出済み） */
type Bucket = GroupKey | "later" | "hidden"

function bucketOf(a: MockAssignment, now: Date): Bucket {
  if (!a.due) return a.status === "submitted" ? "hidden" : "noDue"
  if (a.due < now && a.status !== "submitted") return "recent"
  if (isSameDay(a.due, now)) return "today"
  if (isSameDay(a.due, addDays(now, 1))) return "tomorrow"
  if (isSameWeek(a.due, now, WEEK)) return "thisWeek"
  return a.status === "submitted" ? "hidden" : "later"
}

/** 来週以降の未提出の件数。リストには出さず、件数だけ下に出す */
export function countLater(list: MockAssignment[], now: Date): number {
  return list.filter((a) => bucketOf(a, now) === "later").length
}

/** 来週以降で最初に締切が来る未提出の日。「すべて」を開く月を決めるのに使う */
export function firstLaterDue(list: MockAssignment[], now: Date): Date | null {
  const later = list
    .filter((a) => bucketOf(a, now) === "later" && a.due)
    .sort((x, y) => x.due!.getTime() - y.due!.getTime())
  return later[0]?.due ?? null
}

const STATUS_RANK: Record<Status, number> = { not_submitted: 0, unknown: 1, submitted: 2 }

export type SortMode = "due" | "status"

const byDue = (x: MockAssignment, y: MockAssignment) =>
  (x.due?.getTime() ?? Number.POSITIVE_INFINITY) - (y.due?.getTime() ?? Number.POSITIVE_INFINITY)

/**
 * 「最近」タブ。今日・明日・今週は提出済みも含めた全部を出す。
 * 直近の未提出と期限なしだけは、やることだけに絞る。
 */
export function groupRecent(
  list: MockAssignment[],
  now: Date,
  weekSort: SortMode,
): { key: GroupKey; items: MockAssignment[] }[] {
  const buckets = new Map<GroupKey, MockAssignment[]>()
  for (const a of list) {
    const k = bucketOf(a, now)
    if (k === "later" || k === "hidden") continue
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(a)
  }
  return RECENT_ORDER.filter((k) => buckets.has(k)).map((key) => {
    const items = [...buckets.get(key)!]
    if (key === "recent") {
      // 直近＝いちばん近くで落としたものを上に
      items.sort((x, y) => (y.due?.getTime() ?? 0) - (x.due?.getTime() ?? 0))
    } else if (key === "thisWeek" && weekSort === "status") {
      items.sort((x, y) => STATUS_RANK[x.status] - STATUS_RANK[y.status] || byDue(x, y))
    } else {
      items.sort(byDue)
    }
    return { key, items }
  })
}

/* ───────── 「すべて」タブの分類 ───────── */

export interface WeekBlock {
  start: Date
  end: Date
  items: MockAssignment[]
}

/** その月にかかる週を1週ずつの塊にする。課題が1件もない週は出さない */
export function weeksOfMonth(list: MockAssignment[], month: Date): WeekBlock[] {
  return eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, WEEK)
    .map((start) => {
      const end = endOfWeek(start, WEEK)
      const items = list.filter((a) => a.due && a.due >= start && a.due <= end).sort(byDue)
      return { start, end, items }
    })
    .filter((w) => w.items.length > 0)
}

export function weekBlockLabel(w: WeekBlock, now: Date): { range: string; isCurrentWeek: boolean } {
  return {
    range: `${format(w.start, "M/d")} - ${format(w.end, "M/d")}`,
    isCurrentWeek: isSameWeek(w.start, now, WEEK),
  }
}

/** 期限なしの課題を状態ごとに分ける（「すべて」タブの下のタブ用） */
export function noDueByStatus(list: MockAssignment[]): Record<Status, MockAssignment[]> {
  const out: Record<Status, MockAssignment[]> = { not_submitted: [], unknown: [], submitted: [] }
  for (const a of list) if (!a.due) out[a.status].push(a)
  return out
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
