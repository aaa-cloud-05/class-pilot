"use client"

import { useMemo, useState } from "react"
import { addMonths, format, isSameMonth } from "date-fns"
import { CalendarX2, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MockAssignment, Status } from "../_lib/data"
import { noDueByStatus, weekBlockLabel, weeksOfMonth } from "../_lib/format"
import { AssignmentList } from "./assignment"
import { Appear } from "./motion"
import { useMock } from "./provider"
import { StatusBar } from "./status-bar"
import { Button, Card, SectionHeader, Segmented } from "./ui"

const NO_DUE_TABS: { value: Status; label: string }[] = [
  { value: "not_submitted", label: "未提出" },
  { value: "unknown", label: "不明" },
  { value: "submitted", label: "提出済み" },
]

/**
 * 「すべて」タブ。月で切り替えて、その月にかかる週を1週ずつの塊で出す。
 * 月に属さない期限なしの課題は、いちばん下で状態ごとに切り替えて見る。
 */
export function AllList({
  onOpen,
  selectedId,
  month,
  onMonthChange,
}: {
  onOpen: (a: MockAssignment) => void
  selectedId: string | null
  month: Date
  onMonthChange: (d: Date) => void
}) {
  const { now, assignments } = useMock()
  const [noDueTab, setNoDueTab] = useState<Status>("not_submitted")

  const weeks = useMemo(() => weeksOfMonth(assignments, month), [assignments, month])
  const monthItems = useMemo(() => weeks.flatMap((w) => w.items), [weeks])
  const noDue = useMemo(() => noDueByStatus(assignments), [assignments])

  const done = monthItems.filter((a) => a.status === "submitted").length
  const overdue = monthItems.filter((a) => a.status !== "submitted" && a.due && a.due < now).length
  const isCurrentMonth = isSameMonth(month, now)
  const monthKey = format(month, "yyyy-MM")
  const noDueItems = noDue[noDueTab]

  return (
    <div className="space-y-6">
      {/* 月の切り替え。カレンダーと同じ並びにする */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            aria-label="前の月"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[6.5rem] text-center text-[15px] font-bold tabular-nums">
            {format(month, "yyyy年 M月")}
          </span>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            aria-label="次の月"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={() => onMonthChange(now)}>
              今月
            </Button>
          )}
        </div>

        <div className="px-1">
          <StatusBar key={monthKey} items={monthItems} now={now} />
          <p className="mt-2 flex items-center justify-between text-[13px] text-muted-foreground">
            <span className="tabular-nums">
              この月 提出済み {done} / {monthItems.length}
            </span>
            {overdue > 0 && <span className="font-medium text-destructive tabular-nums">期限切れ {overdue}</span>}
          </p>
        </div>
      </div>

      {weeks.length === 0 ? (
        <Card className="flex items-center gap-3 px-4 py-5 text-muted-foreground">
          <CalendarX2 className="h-5 w-5 shrink-0" aria-hidden />
          <p className="text-[15px]">この月に締切の課題はありません</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {weeks.map((w, i) => {
            const { range, tag } = weekBlockLabel(w, now)
            const weekDone = w.items.filter((a) => a.status === "submitted").length
            return (
              <Appear key={`${monthKey}-${range}`} delay={Math.min(0.06 * i, 0.3)}>
                <section>
                  <SectionHeader
                    title={range}
                    count={w.items.length}
                    action={
                      <span className="flex items-center gap-2">
                        {tag && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[12px] font-semibold",
                              tag === "今週" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {tag}
                          </span>
                        )}
                        <span className="text-[13px] tabular-nums text-muted-foreground">
                          提出済み {weekDone} / {w.items.length}
                        </span>
                      </span>
                    }
                  />
                  <AssignmentList items={w.items} onOpen={onOpen} selectedId={selectedId} />
                </section>
              </Appear>
            )
          })}
        </div>
      )}

      {/* 期限なしは月に属さないので、いちばん下でまとめて見る */}
      <section className="pt-2">
        <SectionHeader
          title="期限なし"
          action={
            <Segmented<Status>
              label="期限なしの状態"
              size="sm"
              value={noDueTab}
              onChange={setNoDueTab}
              options={NO_DUE_TABS.map((t) => ({
                value: t.value,
                label: (
                  <span className="flex items-center gap-1.5">
                    {t.label}
                    <span className="text-[12px] tabular-nums opacity-70">{noDue[t.value].length}</span>
                  </span>
                ),
              }))}
            />
          }
        />
        {noDueItems.length ? (
          <AssignmentList key={noDueTab} items={noDueItems} onOpen={onOpen} selectedId={selectedId} />
        ) : (
          <Card className="flex items-center gap-3 px-4 py-5 text-muted-foreground">
            <Inbox className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-[15px]">
              期限なしで{NO_DUE_TABS.find((t) => t.value === noDueTab)?.label}の課題はありません
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
