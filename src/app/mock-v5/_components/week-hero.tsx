"use client"

import { format, isSameDay } from "date-fns"
import { ja } from "date-fns/locale"
import { ArrowRight, ChevronLeft, ChevronRight, Flag } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"
import { relativeLabel, TONE_TEXT } from "../_lib/format"
import { weekHeadline, type WeekState } from "../_lib/week"
import { CountUp, SPRING_SOFT } from "./motion"
import { useMock } from "./provider"
import { CAT_BG, CAT_ORDER, countByCat, StatusBar } from "./status-bar"
import { Card } from "./ui"

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]
const BAR_MAX = 66
/** 目盛りは固定。1日6件で満杯にし、それより多い日は頭打ちにする */
const BAR_FULL = 6

/** 曜日ごとの負荷。棒の高さ＝その日の課題数、色＝提出状況（積み上げ） */
function LoadBars({ week, items, now }: { week: WeekState; items: MockAssignment[]; now: Date }) {
  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      {week.days.map((d, i) => {
        const dayItems = items.filter((a) => a.due && isSameDay(a.due, d.date))
        const counts = countByCat(dayItems, now)
        const h = d.total === 0 ? 3 : Math.max(8, Math.round((Math.min(d.total, BAR_FULL) / BAR_FULL) * BAR_MAX))
        return (
          <div key={d.date.toISOString()} className="flex w-7 flex-col items-center gap-1.5">
            <div className="flex h-[66px] w-full items-end justify-center">
              <motion.div
                initial={{ height: 3, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                transition={{ ...SPRING_SOFT, delay: 0.16 + i * 0.055 }}
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
  // 今週以外を見ているときは、いまの状況を語る文ではなく、その週の中身を出す
  const headline = isCurrentWeek
    ? weekHeadline(week, now)
    : week.total === 0
      ? "この週に締切はありません。"
      : `この週は ${week.total} 件。未提出は ${week.remaining} 件です。`
  const weekItems = assignments.filter((a) => a.due && week.days.some((d) => isSameDay(a.due!, d.date)))
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
              <span className="text-[13px] font-medium text-muted-foreground">あと</span>
              <CountUp value={week.remaining} className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums" />
              <span className="text-[15px] font-medium text-muted-foreground">件</span>
            </p>
          </div>
          <LoadBars week={week} items={assignments} now={now} />
        </div>

        <div className="mt-4">
          {/* 今週の内訳で全部を埋める（赤＝期限切れ / 黄＝24時間以内 / 青＝未提出 / 灰＝不明・提出済み） */}
          <StatusBar items={weekItems} now={now} />
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
          {/* 文言は置かず、旗のアイコンだけで「次の1件」を示す */}
          <Flag className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-label="次の課題" />
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
