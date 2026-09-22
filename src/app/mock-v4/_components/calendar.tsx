"use client"

import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"
import { taskState } from "../_lib/state"

const WEEK = { weekStartsOn: 1 as const }
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]

const DOT: Record<string, string> = {
  done: "bg-ok/60",
  overdue: "bg-destructive",
  soon: "bg-warn",
  open: "bg-foreground/45",
  unknown: "bg-muted-foreground/45",
}

export function itemsOn(day: Date, list: MockAssignment[]) {
  return list
    .filter((a) => a.due && isSameDay(a.due, day))
    .sort((x, y) => (x.due?.getTime() ?? 0) - (y.due?.getTime() ?? 0))
}

/**
 * 1日ぶんの印。点をいくつも並べると数が増えたときに破綻するので、
 * 「点1つ＝1〜2件」「短い棒＝3件以上」の2段階にして、色はその日でいちばん急ぐ状態に合わせる。
 * 正確な件数は読み上げ（aria-label）と下のリストで分かる。
 */
function DayMark({ items, now }: { items: MockAssignment[]; now: Date }) {
  if (items.length === 0) return <span className="h-1" aria-hidden />
  const rank = { overdue: 4, soon: 3, open: 2, unknown: 1, done: 0 } as const
  const top = items.reduce((acc, a) => {
    const s = taskState(a, now)
    return rank[s] > rank[acc] ? s : acc
  }, "done" as keyof typeof rank)
  return (
    <span
      className={cn("h-1 rounded-full", DOT[top], items.length >= 3 ? "w-2.5" : "w-1")}
      aria-hidden
    />
  )
}

/** 週の帯（スマホ） */
export function WeekRow({
  anchor,
  selected,
  onSelect,
  list,
  now,
}: {
  anchor: Date
  selected: Date
  onSelect: (d: Date) => void
  list: MockAssignment[]
  now: Date
}) {
  const start = startOfWeek(anchor, WEEK)
  return (
    <div className="grid grid-cols-7">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((day, i) => {
        const items = itemsOn(day, list)
        const sel = isSameDay(day, selected)
        const today = isSameDay(day, now)
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={sel}
            aria-label={`${format(day, "M月d日(E)", { locale: ja })}、${items.length}件`}
            className="flex h-16 flex-col items-center justify-center gap-1 rounded-md outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className={cn("text-[11px]", today ? "text-primary" : "text-muted-foreground")}>{WEEKDAYS[i]}</span>
            <span
              className={cn(
                "num flex h-7 w-7 items-center justify-center rounded-full text-[13px]",
                sel ? "bg-foreground text-background" : today ? "font-medium text-primary" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>
            <DayMark items={items} now={now} />
          </button>
        )
      })}
    </div>
  )
}

/** 月グリッド。compact=スマホ（点）／PC は課題名まで出す */
export function MonthGrid({
  month,
  selected,
  onSelect,
  onOpen,
  list,
  now,
  compact,
}: {
  month: Date
  selected: Date
  onSelect: (d: Date) => void
  onOpen?: (a: MockAssignment) => void
  list: MockAssignment[]
  now: Date
  compact: boolean
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK),
    end: endOfWeek(endOfMonth(month), WEEK),
  })

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-[11px] text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7", !compact && "divide-x divide-y divide-border border-b border-border")}>
        {days.map((day) => {
          const items = itemsOn(day, list)
          const inMonth = isSameMonth(day, month)
          const sel = isSameDay(day, selected)
          const today = isSameDay(day, now)

          if (compact) {
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={sel}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50",
                  !inMonth && "opacity-35",
                )}
              >
                <span
                  className={cn(
                    "num flex h-6 w-6 items-center justify-center rounded-full text-[13px] transition-colors",
                    sel && today
                      ? "bg-primary font-medium text-primary-foreground"
                      : sel
                        ? "bg-foreground text-background"
                        : today
                          ? "font-medium text-primary"
                          : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <DayMark items={items} now={now} />
              </button>
            )
          }

          return (
            <div
              key={day.toISOString()}
              className={cn("flex min-h-[104px] flex-col gap-1 p-1.5", sel && "bg-accent/60", !inMonth && "bg-card")}
            >
              <button
                type="button"
                onClick={() => onSelect(day)}
                className="flex h-6 w-6 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "num flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px]",
                    today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>
              {items.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onOpen?.(a)}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span className={cn("h-1 w-1 shrink-0 rounded-full", DOT[taskState(a, now)])} aria-hidden />
                  <span
                    className={cn(
                      "truncate text-[11px]",
                      taskState(a, now) === "done" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {a.title}
                  </span>
                </button>
              ))}
              {items.length > 3 && (
                <button
                  type="button"
                  onClick={() => onSelect(day)}
                  className="px-1 text-left text-[11px] text-muted-foreground outline-none hover:text-foreground"
                >
                  ほか{items.length - 3}件
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
