"use client"

import { useMemo, useState } from "react"
import { addMonths, format, isSameMonth } from "date-fns"
import { CalendarX2, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SubmissionState } from "@/lib/types"
import type { ViewAssignment } from "@/lib/assignment-view"
import { noDueByStatus, weekBlockLabel, weeksOfMonth } from "@/lib/assignment-format"
import { AssignmentList } from "@/components/app/assignment"
import { Appear } from "@/components/app/motion"
import { useApp } from "@/components/app/provider"
import { Button, Card, SectionHeader, Segmented } from "@/components/app/ui"

const NO_DUE_TABS: { value: SubmissionState; label: string }[] = [
  { value: "not_submitted", label: "未提出" },
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
  onOpen: (a: ViewAssignment) => void
  selectedId: string | null
  month: Date
  onMonthChange: (d: Date) => void
}) {
  const { now, assignments } = useApp()
  const [noDueTab, setNoDueTab] = useState<SubmissionState>("not_submitted")

  const weeks = useMemo(() => weeksOfMonth(assignments, month), [assignments, month])
  const monthItems = useMemo(() => weeks.flatMap((w) => w.items), [weeks])
  const noDue = useMemo(() => noDueByStatus(assignments), [assignments])

  const done = monthItems.filter((a) => a.submissionState === "submitted").length
  const overdue = monthItems.filter((a) => a.submissionState !== "submitted" && a.dueDate && a.dueDate < now).length
  const isCurrentMonth = isSameMonth(month, now)
  const monthKey = format(month, "yyyy-MM")
  const noDueItems = noDue[noDueTab]

  return (
    <div>
      {/* 月の切り替え。スクロールしてもタブのすぐ下に残る */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+6.875rem)] z-[9] -mx-4 flex items-center gap-1 bg-background/85 px-4 py-1.5 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
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

      {/* 進捗の帯はホームに1本あれば足りるので、ここは数だけ */}
      <p className="mt-1.5 flex items-center justify-between px-1 text-[13px] text-muted-foreground">
        <span className="tabular-nums">
          この月 提出済み {done} / {monthItems.length}
        </span>
        {overdue > 0 && <span className="font-medium text-destructive tabular-nums">期限切れ {overdue}</span>}
      </p>

      {weeks.length === 0 ? (
        <Card className="mt-5 flex items-center gap-3 px-4 py-5 text-muted-foreground">
          <CalendarX2 className="h-5 w-5 shrink-0" aria-hidden />
          <p className="text-[15px]">この月に締切の課題はありません</p>
        </Card>
      ) : (
        <div className="mt-5 space-y-6">
          {weeks.map((w, i) => {
            const { range, isCurrentWeek } = weekBlockLabel(w, now)
            const weekDone = w.items.filter((a) => a.submissionState === "submitted").length
            return (
              <Appear key={`${monthKey}-${range}`} delay={Math.min(0.06 * i, 0.3)}>
                <section>
                  {/* 今週はバッジを足さず、日付そのものを青くして示す */}
                  <SectionHeader
                    title={<span className={cn("tabular-nums", isCurrentWeek && "text-primary")}>{range}</span>}
                    count={w.items.length}
                    action={
                      <span className="text-[13px] tabular-nums text-muted-foreground">
                        提出済み {weekDone} / {w.items.length}
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
      <section className="mt-8">
        <SectionHeader title="期限なし" count={noDue.not_submitted.length + noDue.unknown.length + noDue.submitted.length} />
        {/* 3つを等幅にしたいので、見出しの横ではなく下にフル幅で置く */}
        <Segmented<SubmissionState>
          label="期限なしの状態"
          className="mb-3 flex w-full"
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
