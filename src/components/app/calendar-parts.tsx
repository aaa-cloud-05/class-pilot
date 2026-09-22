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
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { ViewAssignment } from "@/lib/assignment-view"
import { CAT_BG, catOf, type StatusCat } from "@/lib/status"

const WEEK = { weekStartsOn: 1 as const }
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]

/** チップは色帯をやめて、先頭のドットだけで状態を示す。塗りは CAT_BG（src/lib/status.ts） */
const CHIP_TEXT: Record<StatusCat, string> = {
  overdue: "text-destructive",
  soon: "text-foreground",
  open: "text-foreground",
  unknown: "text-muted-foreground",
  done: "text-muted-foreground line-through decoration-muted-foreground/40",
}

export function itemsOn(day: Date, list: ViewAssignment[]) {
  return list
    .filter((a) => a.dueDate && isSameDay(a.dueDate, day))
    .sort((x, y) => (x.dueDate?.getTime() ?? 0) - (y.dueDate?.getTime() ?? 0))
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, WEEK)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function weekRangeLabel(anchor: Date) {
  const start = startOfWeek(anchor, WEEK)
  const end = endOfWeek(anchor, WEEK)
  return isSameMonth(start, end)
    ? `${format(start, "M月d日")}〜${format(end, "d日")}`
    : `${format(start, "M月d日")}〜${format(end, "M月d日")}`
}

/** 課題は少し遅れて順に現れる。日数が多いので遅延は頭打ちにする */
function itemDelay(dayIndex: number, itemIndex: number) {
  return Math.min(0.18 + dayIndex * 0.012, 0.42) + itemIndex * 0.05
}

function Dots({ items, now, dayIndex = 0 }: { items: ViewAssignment[]; now: Date; dayIndex?: number }) {
  return (
    <span className="flex h-1.5 items-center justify-center gap-[2px]" aria-hidden>
      {items.slice(0, 4).map((a, i) => (
        <motion.span
          key={a.id}
          className={cn("h-1.5 w-1.5 rounded-full", CAT_BG[catOf(a, now)])}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: itemDelay(dayIndex, i), ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {items.length > 4 && <span className="text-[10px] font-bold leading-none text-muted-foreground">+</span>}
    </span>
  )
}

/** 1週間の横並び（スマホのカレンダー・PC ホームの概要） */
export function WeekStrip({
  anchor,
  selected,
  onSelect,
  list,
  now,
}: {
  anchor: Date
  selected: Date
  onSelect: (d: Date) => void
  list: ViewAssignment[]
  now: Date
}) {
  return (
    <div className="grid grid-cols-7">
      {weekDays(anchor).map((day, i) => {
        const items = itemsOn(day, list)
        const isSel = isSameDay(day, selected)
        const isToday = isSameDay(day, now)
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={isSel}
            aria-label={`${format(day, "M月d日(E)", { locale: ja })}、締切${items.length}件`}
            className="flex h-[78px] flex-col items-center justify-center gap-1.5 rounded-control outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={cn("text-[12px] font-semibold", i >= 5 ? "text-muted-foreground" : "text-muted-foreground")}>{WEEKDAYS[i]}</span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-bold tabular-nums transition-colors",
                isSel ? "bg-primary text-primary-foreground" : isToday ? "text-primary ring-2 ring-inset ring-ring/40" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>
            <Dots items={items} now={now} dayIndex={i} />
          </button>
        )
      })}
    </div>
  )
}

/** 月カレンダー。compact=スマホ（ドット）、それ以外=PC（課題名のチップ） */
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
  onOpen?: (a: ViewAssignment) => void
  list: ViewAssignment[]
  now: Date
  compact: boolean
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK),
    end: endOfWeek(endOfMonth(month), WEEK),
  })

  return (
    <div>
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn("py-1 text-center text-[12px] font-semibold", i >= 5 ? "text-muted-foreground" : "text-muted-foreground")}>
            {w}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7", !compact && "gap-px overflow-hidden rounded-control bg-border")}>
        {days.map((day, dayIndex) => {
          const items = itemsOn(day, list)
          const inMonth = isSameMonth(day, month)
          const isSel = isSameDay(day, selected)
          const isToday = isSameDay(day, now)
          const label = `${format(day, "M月d日(E)", { locale: ja })}、締切${items.length}件`

          if (compact) {
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSel}
                aria-label={label}
                className={cn(
                  "flex h-[58px] flex-col items-center justify-center gap-1 rounded-control outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "opacity-35",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums",
                    isSel ? "bg-primary text-primary-foreground" : isToday ? "font-bold text-primary ring-2 ring-inset ring-ring/40" : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <Dots items={items} now={now} dayIndex={dayIndex} />
              </button>
            )
          }

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[116px] flex-col bg-card p-1.5 transition-colors",
                isSel && "bg-accent",
                !inMonth && "bg-muted/40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSel}
                aria-label={label}
                className="mb-1 flex h-8 items-center rounded-[8px] px-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[14px] font-semibold tabular-nums",
                    isToday ? "bg-primary text-white" : inMonth ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>
              <div className="space-y-1">
                {items.slice(0, 2).map((a, i) => (
                  <motion.button
                    key={a.id}
                    type="button"
                    onClick={() => (onOpen ? onOpen(a) : onSelect(day))}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: itemDelay(dayIndex, i), ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 text-left text-[12px] font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                      CHIP_TEXT[catOf(a, now)],
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CAT_BG[catOf(a, now)])} aria-hidden />
                    <span className="truncate">
                      <span className="tabular-nums opacity-80">{format(a.dueDate!, "HH:mm")}</span> {a.title}
                    </span>
                  </motion.button>
                ))}
                {items.length > 2 && (
                  <motion.button
                    type="button"
                    onClick={() => onSelect(day)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.55, delay: itemDelay(dayIndex, 2), ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-[6px] px-1.5 text-left text-[12px] font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    すべて見る
                  </motion.button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** PC の週表示（7列に課題を並べる） */
export function WeekColumns({
  anchor,
  selected,
  onSelect,
  onOpen,
  list,
  now,
}: {
  anchor: Date
  selected: Date
  onSelect: (d: Date) => void
  onOpen: (a: ViewAssignment) => void
  list: ViewAssignment[]
  now: Date
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays(anchor).map((day, i) => {
        const items = itemsOn(day, list)
        const isSel = isSameDay(day, selected)
        const isToday = isSameDay(day, now)
        return (
          <div
            key={day.toISOString()}
            className={cn("flex min-h-[360px] flex-col rounded-control bg-muted/50 p-1.5", isSel && "bg-accent")}
          >
            <button
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSel}
              className="mb-2 flex h-11 items-center gap-1.5 rounded-[10px] px-2 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-[13px] font-semibold text-muted-foreground">{WEEKDAYS[i]}</span>
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[15px] font-bold tabular-nums",
                  isToday ? "bg-primary text-white" : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="space-y-1.5">
              {items.map((a, k) => (
                <motion.button
                  key={a.id}
                  type="button"
                  onClick={() => onOpen(a)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: itemDelay(i * 3, k), ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "block w-full rounded-[8px] px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    CHIP_TEXT[catOf(a, now)],
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CAT_BG[catOf(a, now)])} aria-hidden />
                    <span className="text-[12px] font-semibold tabular-nums opacity-80">{format(a.dueDate!, "HH:mm")}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug">{a.title}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
