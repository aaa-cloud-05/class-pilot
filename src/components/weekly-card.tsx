"use client"

import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { TaskStatus, WeekModel } from "@/lib/dashboard-data"
import { CompletionMeter } from "@/components/completion-meter"
import { cn } from "@/lib/utils"

// グラフの状態色はリスト/ランプと同一系統に統一（緑=提出 / 橙=未提出 / 赤=超過 / グレー=不明）
const BLOCK_COLOR: Record<TaskStatus, string> = {
  submitted: "var(--lamp-green)",
  pending: "var(--lamp-amber)",
  "not-submitted": "var(--lamp-red)",
  optional: "var(--lamp-muted)",
}

const CHEVRON =
  "flex items-center justify-center rounded p-0.5 text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/** 週カレンダー本体（カード枠は親が持つ）。上部＝日付＋週送り＋完了メーター、下＝棒グラフ。 */
export function WeeklyCard({
  week,
  selectedDay,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  toggle,
}: {
  week: WeekModel
  selectedDay: number
  onSelectDay: (index: number) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  toggle?: ReactNode
}) {
  const pending = Math.max(0, week.totalTasks - week.doneTasks - week.overdueCount)

  return (
    <div>
      {/* header row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onPrevWeek} aria-label="前の週" className={CHEVRON}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {week.rangeLabel}
          </span>
          <button type="button" onClick={onNextWeek} aria-label="次の週" className={CHEVRON}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <CompletionMeter
            key={week.rangeLabel}
            submitted={week.doneTasks}
            pending={pending}
            overdue={week.overdueCount}
            total={week.totalTasks}
          />
          {toggle}
        </div>
      </div>

      {/* graph area（key=表示週 で週送り時にバー登場アニメを再生） */}
      <div className="relative h-40">
        <div key={week.rangeLabel} className="relative flex h-full items-end justify-between gap-1.5">
          {week.days.map((day) => {
            const isSelected = day.index === selectedDay
            return (
              <button
                key={day.index}
                type="button"
                onClick={() => onSelectDay(day.index)}
                aria-pressed={isSelected}
                aria-label={`${day.dateNum}日 ・ 課題${day.blocks.length}件`}
                className={cn(
                  "group relative flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg px-0.5 pb-6 pt-2 outline-none transition-colors",
                  day.isToday && "bg-muted/40", // 今日の列は背景を少し濃く
                  isSelected ? "bg-muted/70" : "hover:bg-muted/40",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {/* stack of blocks */}
                <span className="flex w-full max-w-6 flex-col-reverse items-center gap-1">
                  {day.blocks.map((b, bi) => (
                    <span
                      key={b.id}
                      className="w-full rounded-[3px]"
                      style={{
                        height: 20,
                        backgroundColor: BLOCK_COLOR[b.status],
                        transformOrigin: "bottom",
                        animation: `bar-rise 340ms cubic-bezier(0.22,1,0.36,1) ${day.index * 90 + bi * 45}ms both`,
                      }}
                    />
                  ))}
                </span>

                {/* date number */}
                <span
                  className={cn(
                    "absolute bottom-1 font-mono text-[11px] tabular-nums transition-colors",
                    day.isToday
                      ? "font-semibold text-accent-blue"
                      : isSelected
                        ? "text-card-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {day.dateNum}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
