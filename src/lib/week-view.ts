/**
 * ホームの「今週」を組み立てる。曜日ごとの負荷、残り件数、見出しの一文。
 */

import { addDays, format, isSameDay, isSameWeek, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import type { ViewAssignment } from "@/lib/assignment-view"

const WEEK = { weekStartsOn: 1 as const }

export interface DayLoad {
  date: Date
  /** その日が締切の課題（全部） */
  total: number
  /** そのうち未提出（不明を含む） */
  open: number
  isToday: boolean
  isPast: boolean
}

export interface WeekState {
  days: DayLoad[]
  /** 今週の課題の総数と提出済み数 */
  total: number
  done: number
  /** 未提出の残り（期限切れを含む） */
  remaining: number
  overdue: number
  todayOpen: number
  /** 山場（未提出がいちばん多い日）。同数なら早い日 */
  peak: DayLoad | null
  peakPassed: boolean
}

export function buildWeekState(list: ViewAssignment[], now: Date, anchor: Date = now): WeekState {
  const start = startOfWeek(anchor, WEEK)
  const inWeek = list.filter((a) => a.dueDate && isSameWeek(a.dueDate, anchor, WEEK))

  const days: DayLoad[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const items = inWeek.filter((a) => a.dueDate && isSameDay(a.dueDate, date))
    return {
      date,
      total: items.length,
      open: items.filter((a) => a.submissionState !== "submitted").length,
      isToday: isSameDay(date, now),
      isPast: date < now && !isSameDay(date, now),
    }
  })

  const total = inWeek.length
  const done = inWeek.filter((a) => a.submissionState === "submitted").length
  const remaining = total - done
  const overdue = inWeek.filter((a) => a.submissionState !== "submitted" && a.dueDate && a.dueDate < now).length
  const todayOpen = days.find((d) => d.isToday)?.open ?? 0

  // 山場＝未提出がいちばん多い日。すべて 0 なら山場なし
  let peak: DayLoad | null = null
  for (const d of days) if (d.open > 0 && (!peak || d.open > peak.open)) peak = d
  const peakPassed = peak != null && peak.isPast

  return { days, total, done, remaining, overdue, todayOpen, peak, peakPassed }
}

/** 数字の解釈を1文で肩代わりする。ここがホームの「読まなくても分かる」部分 */
export function weekHeadline(w: WeekState, now: Date): string {
  if (w.total === 0) return "今週は締切がありません。"
  if (w.remaining === 0) return "今週の課題は片づきました。"
  if (w.overdue > 0) {
    return `期限切れが${w.overdue}件あります。まずはここから。`
  }
  if (!w.peak) return `残り${w.remaining}件です。`
  if (w.peak.isToday) return `今日が山場です。${w.todayOpen}件を片づければ楽になります。`
  if (w.peakPassed) return `山場は越えました。残りは${w.remaining}件です。`

  const isTomorrow = isSameDay(w.peak.date, addDays(now, 1))
  const dayLabel = isTomorrow ? "明日" : `${format(w.peak.date, "E曜", { locale: ja })}`
  if (w.todayOpen === 0) return `今日の締切はありません。山場は${dayLabel}です。`
  return `山場は${dayLabel}。今日は${w.todayOpen}件だけです。`
}

/** 次に手をつける1件。期限切れ → 締切が近い順 */
export function nextUp(list: ViewAssignment[], now: Date): ViewAssignment | null {
  const open = list.filter((a) => a.submissionState !== "submitted" && a.dueDate)
  if (open.length === 0) return null
  const overdue = open.filter((a) => a.dueDate! < now).sort((x, y) => y.dueDate!.getTime() - x.dueDate!.getTime())
  if (overdue.length) return overdue[0]
  return open.filter((a) => a.dueDate! >= now).sort((x, y) => x.dueDate!.getTime() - y.dueDate!.getTime())[0] ?? null
}
