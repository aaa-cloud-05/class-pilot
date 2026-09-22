"use client"

import { format, isSameDay } from "date-fns"
import { ja } from "date-fns/locale"
import { ArrowRight } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"
import { relativeLabel, TONE_TEXT } from "../_lib/format"
import { weekHeadline, type WeekState } from "../_lib/week"
import { CountUp, EASE_OUT, SPRING_SOFT } from "./motion"
import { useMock } from "./provider"
import { Card } from "./ui"

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]
const BAR_MAX = 54

/** 曜日ごとの負荷。棒の高さ＝その日の課題数、色＝状態（今日・期限切れ・それ以外） */
function LoadBars({ week }: { week: WeekState }) {
  const peak = Math.max(1, ...week.days.map((d) => d.total))
  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      {week.days.map((d, i) => {
        const h = d.total === 0 ? 3 : Math.max(8, Math.round((d.total / peak) * BAR_MAX))
        const overdue = d.isPast && d.open > 0
        return (
          <div key={d.date.toISOString()} className="flex w-7 flex-col items-center gap-1.5">
            <div className="flex h-[54px] w-full items-end justify-center">
              <motion.div
                initial={{ height: 3, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                transition={{ ...SPRING_SOFT, delay: 0.12 + i * 0.035 }}
                className={cn(
                  "w-full rounded-[4px]",
                  d.total === 0
                    ? "bg-border"
                    : d.isToday
                      ? "bg-primary"
                      : overdue
                        ? "bg-destructive/45"
                        : d.isPast
                          ? "bg-foreground/12"
                          : "bg-foreground/25",
                )}
              />
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
  next,
  onOpenNext,
}: {
  week: WeekState
  rangeLabel: string
  next: MockAssignment | null
  onOpenNext: (a: MockAssignment) => void
}) {
  const { now, courseById } = useMock()
  const reduce = useReducedMotion()
  const headline = weekHeadline(week, now)
  const pct = week.total === 0 ? 0 : Math.round((week.done / week.total) * 100)
  const nextRel = next ? relativeLabel(next, now) : null
  const nextCourse = next ? courseById(next.courseId) : null

  return (
    <Card className="overflow-hidden">
      <div className="p-5 lg:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-medium text-muted-foreground">
            今週 <span className="tabular-nums">{rangeLabel}</span>
          </p>
          <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
            {format(now, "M月d日(E)", { locale: ja })}
          </p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">残り</span>
              <CountUp value={week.remaining} className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums" />
              <span className="text-[15px] font-medium text-muted-foreground">件</span>
            </p>
          </div>
          <LoadBars week={week} />
        </div>

        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: reduce ? `${pct}%` : 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ ...EASE_OUT, delay: 0.1 }}
            />
          </div>
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
