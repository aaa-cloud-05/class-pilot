"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
  format,
} from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Assignment } from "@/lib/types"
import { assignmentStatusColor } from "@/lib/lamp"
import { CompletionMeter } from "@/components/completion-meter"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]

const CHEVRON =
  "flex items-center justify-center rounded p-0.5 text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"

/**
 * ホーム埋め込み用の月カレンダー。選択日は親(selectedDate)と連動。
 * ドットは状態色（週カレンダーと同一）で、1日目から順に登場アニメ。
 */
export function MonthGrid({
  assignments,
  selectedDate,
  onSelectDate,
  toggle,
}: {
  assignments: Assignment[]
  selectedDate: Date
  onSelectDate: (d: Date) => void
  toggle?: ReactNode
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(selectedDate))

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const byDate = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    for (const a of assignments) {
      if (!a.dueDate) continue
      const key = format(a.dueDate, "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [assignments])

  const monthKey = format(currentMonth, "yyyy-MM")

  // 今月分の完了メーター
  const monthMeter = useMemo(() => {
    const inMonth = assignments.filter((a) => a.dueDate && isSameMonth(a.dueDate, currentMonth))
    const submitted = inMonth.filter((a) => a.submissionState === "submitted").length
    const overdue = inMonth.filter(
      (a) => a.submissionState === "not_submitted" && a.dueDate && isPast(a.dueDate),
    ).length
    const total = inMonth.length
    return { submitted, overdue, pending: Math.max(0, total - submitted - overdue), total }
  }, [assignments, currentMonth])

  return (
    <div>
      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="前の月"
            className={CHEVRON}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="font-mono text-[12.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {format(currentMonth, "yyyy年 M月", { locale: ja })}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="次の月"
            className={CHEVRON}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <CompletionMeter
            key={monthKey}
            submitted={monthMeter.submitted}
            pending={monthMeter.pending}
            overdue={monthMeter.overdue}
            total={monthMeter.total}
          />
          {toggle}
        </div>
      </div>

      {/* weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center font-mono text-[11px] text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* day grid（key=表示月 で月送り時にドット登場アニメを再生） */}
      <div key={monthKey} className="grid grid-cols-7">
        {days.map((day, cellIndex) => {
          const key = format(day, "yyyy-MM-dd")
          const dayAssignments = byDate.get(key) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-center rounded-lg py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-muted" : "hover:bg-muted/50",
                !inMonth && "opacity-30",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full font-mono text-[13px] tabular-nums text-foreground",
                  today && "font-semibold",
                )}
              >
                {format(day, "d")}
              </span>
              {/* status dots（1日目から順に登場） */}
              <div className="mt-1 flex h-1.5 gap-0.5">
                {dayAssignments.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: assignmentStatusColor(a),
                      animation: `dot-pop 260ms cubic-bezier(0.22,1,0.36,1) ${cellIndex * 16 + i * 40}ms both`,
                    }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
