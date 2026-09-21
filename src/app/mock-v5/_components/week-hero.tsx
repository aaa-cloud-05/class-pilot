"use client"

import { format, isSameDay } from "date-fns"
import { ja } from "date-fns/locale"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"
import { relativeLabel, TONE_TEXT } from "../_lib/format"
import { weekHeadline, type WeekState } from "../_lib/week"
import { CountUp, EASE_OUT, SPRING_SOFT } from "./motion"
import { useMock } from "./provider"
import { Card } from "./ui"

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]
const BAR_MAX = 66

/** 提出状況の分類。色はここだけで決める（青＝未提出 / 赤＝期限切れ / 黄＝24時間以内 / 灰＝不明・提出済み） */
type Cat = "overdue" | "soon" | "open" | "unknown" | "done"

const CAT_ORDER: Cat[] = ["overdue", "soon", "open", "unknown", "done"]

const CAT_BG: Record<Cat, string> = {
  overdue: "bg-destructive",
  soon: "bg-[var(--ui-warn-fill)]",
  open: "bg-primary/75",
  unknown: "bg-muted-foreground/45",
  done: "bg-muted-foreground/25",
}

function catOf(a: MockAssignment, now: Date): Cat {
  if (a.status === "submitted") return "done"
  if (a.status === "unknown") return "unknown"
  if (!a.due) return "open"
  const diff = a.due.getTime() - now.getTime()
  if (diff < 0) return "overdue"
  if (diff < 24 * 3600_000) return "soon"
  return "open"
}

function countByCat(items: MockAssignment[], now: Date): Record<Cat, number> {
  const out: Record<Cat, number> = { overdue: 0, soon: 0, open: 0, unknown: 0, done: 0 }
  for (const a of items) out[catOf(a, now)] += 1
  return out
}

/** 曜日ごとの負荷。棒の高さ＝その日の課題数、色＝提出状況（積み上げ） */
function LoadBars({ week, items, now }: { week: WeekState; items: MockAssignment[]; now: Date }) {
  const peak = Math.max(1, ...week.days.map((d) => d.total))
  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      {week.days.map((d, i) => {
        const dayItems = items.filter((a) => a.due && isSameDay(a.due, d.date))
        const counts = countByCat(dayItems, now)
        const h = d.total === 0 ? 3 : Math.max(8, Math.round((d.total / peak) * BAR_MAX))
        return (
          <div key={d.date.toISOString()} className="flex w-7 flex-col items-center gap-1.5">
            <div className="flex h-[66px] w-full items-end justify-center">
              <motion.div
                initial={{ height: 3, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                transition={{ ...SPRING_SOFT, delay: 0.12 + i * 0.035 }}
                className={cn(
                  "flex w-full flex-col overflow-hidden rounded-[4px]",
                  d.total === 0 && "bg-border",
                )}
              >
                {d.total > 0 &&
                  CAT_ORDER.map((c) =>
                    counts[c] === 0 ? null : (
                      <span key={c} className={cn("w-full shrink-0", CAT_BG[c])} style={{ height: `${(counts[c] / d.total) * 100}%` }} />
                    ),
                  )}
              </motion.div>
            </div>
            <span
              className={cn(
                "text-[11px] font-medium tabular-nums",
                d.isToday ? "text-primary" : d.isPast ? "text-muted-foreground/60" : "text-muted-foreground",
              )}
            >
              {WEEKDAYS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function WeekHero({
  week,
  rangeLabel,
  weekLabel,
  onPrevWeek,
  onNextWeek,
  isCurrentWeek,
  next,
  onOpenNext,
}: {
  week: WeekState
  rangeLabel: string
  weekLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  isCurrentWeek: boolean
  next: MockAssignment | null
  onOpenNext: (a: MockAssignment) => void
}) {
  const { now, courseById, assignments } = useMock()
  const reduce = useReducedMotion()
  // 今週以外を見ているときは、いまの状況を語る文ではなく、その週の中身を出す
  const headline = isCurrentWeek
    ? weekHeadline(week, now)
    : week.total === 0
      ? "この週に締切はありません。"
      : `この週は ${week.total} 件。未提出は ${week.remaining} 件です。`
  const weekItems = assignments.filter((a) => a.due && week.days.some((d) => isSameDay(a.due!, d.date)))
  const weekCounts = { counts: countByCat(weekItems, now), total: weekItems.length }
  const nextRel = next ? relativeLabel(next, now) : null
  const nextCourse = next ? courseById(next.courseId) : null

  return (
    <Card className="overflow-hidden">
      <div className="p-5 lg:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onPrevWeek}
              aria-label="前の週"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-[13px] font-medium text-muted-foreground">
              {weekLabel} <span className="tabular-nums">{rangeLabel}</span>
            </p>
            <button
              type="button"
              onClick={onNextWeek}
              aria-label="次の週"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
            {format(now, "M月d日(E)", { locale: ja })}
          </p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">未提出</span>
              <CountUp value={week.remaining} className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums" />
              <span className="text-[15px] font-medium text-muted-foreground">件</span>
            </p>
          </div>
          <LoadBars week={week} items={assignments} now={now} />
        </div>

        <div className="mt-4">
          {/* 今週の内訳で全部を埋める（赤＝期限切れ / 黄＝24時間以内 / 青＝未提出 / 灰＝不明・提出済み） */}
          <motion.div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...EASE_OUT, delay: 0.1 }}
          >
            {weekCounts.total > 0 &&
              CAT_ORDER.map((c, i) =>
                weekCounts.counts[c] === 0 ? null : (
                  <motion.span
                    key={c}
                    className={cn("h-full shrink-0", CAT_BG[c])}
                    initial={{ width: reduce ? `${(weekCounts.counts[c] / weekCounts.total) * 100}%` : 0 }}
                    animate={{ width: `${(weekCounts.counts[c] / weekCounts.total) * 100}%` }}
                    transition={{ duration: 0.45, delay: 0.12 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                ),
              )}
          </motion.div>
          <p className="mt-2 flex items-center justify-between text-[13px] text-muted-foreground">
            <span className="tabular-nums">
              提出済み {week.done} / {week.total}
            </span>
            {week.overdue > 0 && <span className="font-medium text-destructive tabular-nums">期限切れ {week.overdue}</span>}
          </p>
        </div>

        <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">{headline}</p>
      </div>

      {next && (
        <button
          type="button"
          onClick={() => onOpenNext(next)}
          className="flex w-full items-center gap-3 border-t border-border px-5 py-3.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent lg:px-6"
        >
          <span className="shrink-0 text-[12px] font-semibold text-muted-foreground">次にやる</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-foreground">{next.title}</span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {nextCourse?.name}
              {next.due && (
                <>
                  {" ・ "}
                  {isSameDay(next.due, now) ? format(next.due, "HH:mm") : format(next.due, "M/d HH:mm")}
                </>
              )}
            </span>
          </span>
          {nextRel && (
            <span className={cn("shrink-0 text-[13px] font-semibold tabular-nums", TONE_TEXT[nextRel.tone])}>
              {nextRel.text}
            </span>
          )}
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
        </button>
      )}
    </Card>
  )
}
