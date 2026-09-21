"use client"

import { endOfWeek, format, isSameDay, startOfWeek } from "date-fns"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"
import { taskState } from "../_lib/state"
import { buildWeekState, weekHeadline } from "../_lib/week"
import { timeAgo } from "../_lib/format"
import { useMock } from "./provider"
import { Panel } from "./ui"

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"]
const BAR_H = 34

/** 曜日ごとの量。下＝提出済み、上＝未提出。過ぎた日の未提出は赤、今日は青 */
function Bars({ days }: { days: ReturnType<typeof buildWeekState>["days"] }) {
  const peak = Math.max(1, ...days.map((d) => d.total))
  return (
    <div className="flex items-end gap-2">
      {days.map((d, i) => {
        const h = d.total === 0 ? 3 : Math.max(8, Math.round((d.total / peak) * BAR_H))
        const openH = d.total === 0 ? 0 : Math.round(h * (d.open / d.total))
        const showCount = peak >= 6 && d.total === peak
        return (
          <div key={d.date.toISOString()} className="flex w-2.5 flex-col items-center gap-1.5">
            {showCount && <span className="num text-[10px] leading-none text-muted-foreground">{d.total}</span>}
            <div
              className={cn(
                "flex w-full flex-col justify-end overflow-hidden rounded-[3px] bg-muted",
                showCount ? "h-[28px]" : "h-[34px]",
              )}
            >
              <motion.div
                initial={{ height: 3 }}
                animate={{ height: h }}
                transition={{ duration: 0.35, delay: 0.04 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className={cn("flex w-full flex-col justify-start rounded-[3px]", d.total === 0 ? "bg-border" : "bg-ok/45")}
              >
                <div
                  className={cn("w-full", d.isPast ? "bg-destructive/75" : d.isToday ? "bg-primary" : "bg-foreground/60")}
                  style={{ height: openH }}
                />
              </motion.div>
            </div>
            <span className={cn("text-[11px]", d.isToday ? "font-medium text-primary" : "text-muted-foreground")}>
              {WEEKDAYS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function WeekPanel({
  items,
  next,
  onOpenNext,
  onConfirmUnknown,
  onOpenSync,
}: {
  items: MockAssignment[]
  next: MockAssignment | null
  onOpenNext: (a: MockAssignment) => void
  onConfirmUnknown: () => void
  onOpenSync: () => void
}) {
  const { now, courseById, syncedAt, controls } = useMock()
  const reduce = useReducedMotion()
  const week = buildWeekState(items, now)
  const donePct = week.total === 0 ? 0 : (week.done / week.total) * 100
  const overduePct = week.total === 0 ? 0 : (week.overdue / week.total) * 100

  const open = items.filter((a) => a.status !== "submitted").length
  const unknown = items.filter((a) => a.status === "unknown").length
  const doneToday = items.filter((a) => a.status === "submitted" && a.due && isSameDay(a.due, now)).length

  return (
    <Panel className="overflow-hidden">
      <div className="p-4 lg:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="num text-[12.5px] text-muted-foreground">
            今週 {format(startOfWeek(now, { weekStartsOn: 1 }), "M/d")} - {format(endOfWeek(now, { weekStartsOn: 1 }), "M/d")}
          </p>
          <button
            type="button"
            onClick={onOpenSync}
            className="num rounded text-[12px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Classroom {controls.loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未接続"} ・ WebClass{" "}
            {syncedAt.webclass ? timeAgo(syncedAt.webclass, now) : "未接続"}
          </button>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-4">
          <p className="flex items-baseline gap-1.5">
            <span className="text-[13px] text-muted-foreground">未提出</span>
            <span className="num text-[length:var(--ui-hero-num)] font-semibold leading-none tracking-[-0.02em]">{open}</span>
            <span className="text-[13px] text-muted-foreground">件</span>
          </p>
          <Bars days={week.days} />
        </div>

        <div className="mt-3.5 flex h-1.5 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full bg-ok"
            initial={{ width: reduce ? `${donePct}%` : 0 }}
            animate={{ width: `${donePct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="h-full bg-destructive/70"
            initial={{ width: reduce ? `${overduePct}%` : 0 }}
            animate={{ width: `${overduePct}%` }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="num mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted-foreground">
          <span>
            <span className="text-foreground">{week.done}</span> / {week.total} 提出
          </span>
          {week.overdue > 0 && (
            <span>
              期限切れ <span className="text-destructive">{week.overdue}</span>
            </span>
          )}
          {doneToday > 0 && (
            <span>
              今日 <span className="text-foreground">{doneToday}</span> 件完了
            </span>
          )}
        </p>

        <p className="mt-3 text-[15px] font-medium tracking-[-0.01em]">{weekHeadline(week, now)}</p>

        {unknown > 0 && (
          <button
            type="button"
            onClick={onConfirmUnknown}
            className="num mt-1.5 rounded text-[13px] text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            未確認 {unknown} 件を確認
          </button>
        )}
      </div>

      {next && (
        <button
          type="button"
          onClick={() => onOpenNext(next)}
          className="flex w-full items-center gap-3 border-t border-border bg-background px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent lg:px-5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[length:var(--ui-text-row)]">{next.title}</span>
            <span className="num block truncate text-[length:var(--ui-text-meta)] text-muted-foreground">
              {courseById(next.courseId)?.name}
              {next.due && ` ・ ${format(next.due, "M/d HH:mm")}`}
            </span>
          </span>
          <span
            className={cn(
              "num shrink-0 text-[13px] font-medium",
              taskState(next, now) === "overdue"
                ? "text-destructive"
                : taskState(next, now) === "soon"
                  ? "text-warn"
                  : "text-muted-foreground",
            )}
          >
            {dueLabelShort(next, now)}
          </span>
        </button>
      )}
    </Panel>
  )
}

function dueLabelShort(a: MockAssignment, now: Date) {
  if (!a.due) return "期限なし"
  const diff = a.due.getTime() - now.getTime()
  const min = Math.round(Math.abs(diff) / 60_000)
  const h = Math.floor(min / 60)
  const d = Math.floor(h / 24)
  if (diff < 0) return min < 60 ? `${min}分遅れ` : h < 24 ? `${h}時間遅れ` : `${d}日遅れ`
  return min < 60 ? `あと${min}分` : h < 24 ? `あと${h}時間` : `あと${d}日`
}
