/**
 * 課題の並べ方・締切の書き方。表示だけを担当し、保存や同期には触れない。
 * 色の意味は src/lib/status.ts、経緯は docs/ui-v5-migration.md。
 */

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
import type { SubmissionState } from "@/lib/types"
import type { ViewAssignment } from "@/lib/assignment-view"
import { catOf, type StatusCat } from "@/lib/status"

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

function bucketOf(a: ViewAssignment, now: Date): Bucket {
  if (!a.dueDate) return a.submissionState === "submitted" ? "hidden" : "noDue"
  if (a.dueDate < now && a.submissionState !== "submitted") return "recent"
  if (isSameDay(a.dueDate, now)) return "today"
  if (isSameDay(a.dueDate, addDays(now, 1))) return "tomorrow"
  if (isSameWeek(a.dueDate, now, WEEK)) return "thisWeek"
  return a.submissionState === "submitted" ? "hidden" : "later"
}

/** 来週以降の未提出の件数。リストには出さず、件数だけ下に出す */
export function countLater(list: ViewAssignment[], now: Date): number {
  return list.filter((a) => bucketOf(a, now) === "later").length
}

/** 来週以降で最初に締切が来る未提出の日。「すべて」を開く月を決めるのに使う */
export function firstLaterDue(list: ViewAssignment[], now: Date): Date | null {
  const later = list
    .filter((a) => bucketOf(a, now) === "later" && a.dueDate)
    .sort((x, y) => x.dueDate!.getTime() - y.dueDate!.getTime())
  return later[0]?.dueDate ?? null
}

const STATUS_RANK: Record<SubmissionState, number> = { not_submitted: 0, unknown: 1, submitted: 2 }

export type SortMode = "due" | "status"

const byDue = (x: ViewAssignment, y: ViewAssignment) =>
  (x.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) - (y.dueDate?.getTime() ?? Number.POSITIVE_INFINITY)

/**
 * 「最近」タブ。今日・明日・今週は提出済みも含めた全部を出す。
 * 直近の未提出と期限なしだけは、やることだけに絞る。
 */
export function groupRecent(
  list: ViewAssignment[],
  now: Date,
  weekSort: SortMode,
): { key: GroupKey; items: ViewAssignment[] }[] {
  const buckets = new Map<GroupKey, ViewAssignment[]>()
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
      items.sort((x, y) => (y.dueDate?.getTime() ?? 0) - (x.dueDate?.getTime() ?? 0))
    } else if (key === "thisWeek" && weekSort === "status") {
      items.sort((x, y) => STATUS_RANK[x.submissionState] - STATUS_RANK[y.submissionState] || byDue(x, y))
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
  items: ViewAssignment[]
}

/** その月にかかる週を1週ずつの塊にする。課題が1件もない週は出さない */
export function weeksOfMonth(list: ViewAssignment[], month: Date): WeekBlock[] {
  return eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, WEEK)
    .map((start) => {
      const end = endOfWeek(start, WEEK)
      const items = list.filter((a) => a.dueDate && a.dueDate >= start && a.dueDate <= end).sort(byDue)
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
export function noDueByStatus(list: ViewAssignment[]): Record<SubmissionState, ViewAssignment[]> {
  const out: Record<SubmissionState, ViewAssignment[]> = { not_submitted: [], unknown: [], submitted: [] }
  for (const a of list) if (!a.dueDate) out[a.submissionState].push(a)
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

/** 提出済みの下段。締切を過ぎてから出したことも分かるようにする */
function submittedSub(a: ViewAssignment): string {
  return a.isLate ? "提出済み（遅れ）" : "提出済み"
}

/**
 * リスト右側の締切表示（上段＝日時、下段＝残り時間）。
 * 文字色は `cat` から `CAT_TEXT` を引く。色の意味はここでは決めない。
 */
export function dueLabel(a: ViewAssignment, now: Date): { main: string; sub: string | null; cat: StatusCat } {
  const cat = catOf(a, now)
  if (!a.dueDate) return { main: "期限なし", sub: null, cat }

  const submitted = a.submissionState === "submitted"
  const diff = a.dueDate.getTime() - now.getTime()
  const sub = submitted ? submittedSub(a) : diff < 0 ? relPast(-diff) : relAhead(diff)

  if (diff < 0) return { main: format(a.dueDate, "M/d HH:mm"), sub, cat }
  if (isSameDay(a.dueDate, now)) return { main: format(a.dueDate, "HH:mm"), sub, cat }
  if (isSameDay(a.dueDate, addDays(now, 1))) return { main: `明日 ${format(a.dueDate, "HH:mm")}`, sub, cat }
  if (isSameWeek(a.dueDate, now, WEEK)) return { main: format(a.dueDate, "E HH:mm", { locale: ja }), sub, cat }
  return {
    main: format(a.dueDate, "M/d(E)", { locale: ja }),
    sub: submitted ? sub : format(a.dueDate, "HH:mm"),
    cat,
  }
}

/** 詳細シート用の締切（長い形） */
export function dueLong(due: Date | null): string {
  if (!due) return "期限なし"
  return format(due, "M月d日(E) HH:mm", { locale: ja })
}

/** 「次の1件」やカードで使う短い残り時間 */
export function relativeLabel(a: ViewAssignment, now: Date): { text: string; cat: StatusCat } | null {
  if (!a.dueDate) return null
  const cat = catOf(a, now)
  if (a.submissionState === "submitted") return { text: submittedSub(a), cat }
  const diff = a.dueDate.getTime() - now.getTime()
  return { text: diff < 0 ? relPast(-diff) : relAhead(diff), cat }
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
