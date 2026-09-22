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

const WEEK = { weekStartsOn: 1 as const }
export const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]

export type DotTone = "danger" | "warn" | "ok" | "unknown" | "open"

export function dotTone(a: MockAssignment, now: Date): DotTone {
  if (a.status === "submitted") return "ok"
  if (a.status === "unknown") return "unknown"
  if (!a.due) return "open"
  const diff = a.due.getTime() - now.getTime()
  if (diff < 0) return "danger"
  if (diff < 24 * 3600_000) return "warn"
  return "open"
}

export const DOT_BG: Record<DotTone, string> = {
  danger: "bg-danger",
  warn: "bg-warn",
  ok: "bg-ok",
  unknown: "bg-ink-3",
  open: "bg-brand",
}

const CHIP: Record<DotTone, string> = {
  danger: "border-danger bg-danger-soft text-danger",
  warn: "border-warn bg-warn-soft text-warn",
  ok: "border-ok bg-ok-soft text-ink-3 line-through decoration-ink-3/40",
  unknown: "border-ink-3 bg-surface-2 text-ink-2",
  open: "border-brand bg-brand-soft text-ink",
}

export function itemsOn(day: Date, list: MockAssignment[]) {
  return list
    .filter((a) => a.due && isSameDay(a.due, day))
    .sort((x, y) => (x.due?.getTime() ?? 0) - (y.due?.getTime() ?? 0))
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

function Dots({ items, now }: { items: MockAssignment[]; now: Date }) {
  return (
    <span className="flex h-1.5 items-center justify-center gap-[3px]" aria-hidden>
      {items.slice(0, 3).map((a) => (
        <span key={a.id} className={cn("h-1.5 w-1.5 rounded-full", DOT_BG[dotTone(a, now)])} />
      ))}
      {items.length > 3 && <span className="text-[10px] font-bold leading-none text-ink-3">+</span>}
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
  list: MockAssignment[]
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
            className="flex h-[78px] flex-col items-center justify-center gap-1.5 rounded-control outline-none transition-colors hover:bg-surface-2/70 focus-visible:ring-2 focus-visible:ring-signal"
          >
            <span className={cn("text-[12px] font-semibold", i >= 5 ? "text-ink-3" : "text-ink-2")}>{WEEKDAYS[i]}</span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-bold tabular-nums transition-colors",
                isSel ? "bg-brand text-on-brand" : isToday ? "text-signal ring-2 ring-inset ring-signal/40" : "text-ink",
              )}
            >
              {format(day, "d")}
            </span>
            <Dots items={items} now={now} />
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
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn("py-1 text-center text-[12px] font-semibold", i >= 5 ? "text-ink-3" : "text-ink-2")}>
            {w}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7", !compact && "gap-px overflow-hidden rounded-control bg-line")}>
        {days.map((day) => {
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
                  "flex h-[58px] flex-col items-center justify-center gap-1 rounded-control outline-none transition-colors hover:bg-surface-2/70 focus-visible:ring-2 focus-visible:ring-signal",
                  !inMonth && "opacity-35",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums",
                    isSel ? "bg-brand text-on-brand" : isToday ? "font-bold text-signal ring-2 ring-inset ring-signal/40" : "text-ink",
                  )}
                >
                  {format(day, "d")}
                </span>
                <Dots items={items} now={now} />
              </button>
            )
          }

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[116px] flex-col bg-surface p-1.5 transition-colors",
                isSel && "bg-brand-soft/60",
                !inMonth && "bg-surface-2/40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSel}
                aria-label={label}
                className="mb-1 flex h-8 items-center rounded-[8px] px-1 outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
              >
                <span
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[14px] font-semibold tabular-nums",
                    isToday ? "bg-signal text-white" : inMonth ? "text-ink" : "text-ink-3",
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>
              <div className="space-y-1">
                {items.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => (onOpen ? onOpen(a) : onSelect(day))}
                    className={cn(
                      "block w-full truncate rounded-[6px] border-l-[3px] px-1.5 py-0.5 text-left text-[12px] font-medium outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-signal",
                      CHIP[dotTone(a, now)],
                    )}
                  >
                    <span className="tabular-nums opacity-80">{format(a.due!, "HH:mm")}</span> {a.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onSelect(day)}
                    className="px-1.5 text-[12px] font-semibold text-ink-3 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    ほか{items.length - 3}件
                  </button>
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
  onOpen: (a: MockAssignment) => void
  list: MockAssignment[]
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
            className={cn("flex min-h-[360px] flex-col rounded-control bg-surface-2/50 p-1.5", isSel && "bg-brand-soft/70")}
          >
            <button
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSel}
              className="mb-2 flex h-11 items-center gap-1.5 rounded-[10px] px-2 outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-signal"
            >
              <span className="text-[13px] font-semibold text-ink-3">{WEEKDAYS[i]}</span>
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[15px] font-bold tabular-nums",
                  isToday ? "bg-signal text-white" : "text-ink",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="space-y-1.5">
              {items.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onOpen(a)}
                  className={cn(
                    "block w-full rounded-[8px] border-l-[3px] px-2 py-1.5 text-left outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-signal",
                    CHIP[dotTone(a, now)],
                  )}
                >
                  <span className="block text-[12px] font-semibold tabular-nums opacity-80">{format(a.due!, "HH:mm")}</span>
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug">{a.title}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
