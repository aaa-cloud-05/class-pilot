"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { TaskStatus, WeekModel } from "@/lib/dashboard-data"
import { ProgressRace } from "@/components/progress-race"
import { CompletionMeter } from "@/components/completion-meter"
import { cn } from "@/lib/utils"

const BLOCK_COLOR: Record<TaskStatus, string> = {
  submitted: "var(--block-strong)",
  pending: "var(--block)",
  "not-submitted": "var(--lamp-red)",
  optional: "color-mix(in oklch, var(--block) 55%, transparent)",
}

const CHEVRON =
  "flex items-center justify-center rounded p-0.5 text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

export function WeeklyCard({
  week,
  subtitle,
  selectedDay,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  mounted,
}: {
  week: WeekModel
  subtitle: string
  selectedDay: number
  onSelectDay: (index: number) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  mounted: boolean
}) {
  const pending = Math.max(0, week.totalTasks - week.doneTasks - week.overdueCount)

  return (
    <section
      aria-label="週間"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      {/* header row inside card */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={onPrevWeek} aria-label="前の週" className={CHEVRON}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
              {week.rangeLabel}
            </span>
            <button type="button" onClick={onNextWeek} aria-label="次の週" className={CHEVRON}>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <span className="text-[13px] font-medium text-card-foreground">{subtitle}</span>
        </div>
        <CompletionMeter
          key={week.rangeLabel}
          submitted={week.doneTasks}
          pending={pending}
          overdue={week.overdueCount}
          total={week.totalTasks}
          className="mt-0.5"
        />
      </div>

      {/* graph area（key=表示週 で週送り時にバー登場アニメを再生） */}
      <div className="relative h-40">
        {/* day columns */}
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
                        height: 12,
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
                      ? "font-semibold text-foreground"
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

      <div className="mt-4 border-t border-border pt-4">
        <ProgressRace week={week} mounted={mounted} />
      </div>
    </section>
  )
}
