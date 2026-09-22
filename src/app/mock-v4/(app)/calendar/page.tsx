"use client"

import { useState } from "react"
import { addMonths, addWeeks, format, isSameDay, isSameMonth, isSameWeek, startOfWeek, endOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { MonthGrid, WeekRow, itemsOn } from "../../_components/calendar"
import { DESKTOP_QUERY, useMediaQuery, useMock } from "../../_components/provider"
import { Content, TopBar } from "../../_components/shell"
import { TaskDetail, TaskRow, TaskSheet } from "../../_components/task"
import { Button, IconButton, Panel, Segmented } from "../../_components/ui"
import { isSameMonth as sameMonth, isSameWeek as sameWeek } from "date-fns"

type Mode = "week" | "month"

export default function CalendarPage() {
  const { now, assignments } = useMock()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [mode, setMode] = useState<Mode>("month")
  const [cursor, setCursor] = useState(now)
  const [day, setDay] = useState(now)
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = assignments.find((a) => a.id === openId) ?? null

  const shift = (n: number) => setCursor((c) => (mode === "week" ? addWeeks(c, n) : addMonths(c, n)))
  const label =
    mode === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "M/d")} - ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "M/d")}`
      : format(cursor, "yyyy年 M月")
  const isNow = mode === "week" ? isSameWeek(cursor, now, { weekStartsOn: 1 }) : isSameMonth(cursor, now)
  const dayItems = itemsOn(day, assignments)

  // 表示中の期間（週 or 月）の進み具合
  const periodItems = assignments.filter(
    (a) => a.due && (mode === "week" ? sameWeek(a.due, cursor, { weekStartsOn: 1 }) : sameMonth(a.due, cursor)),
  )
  const periodDone = periodItems.filter((a) => a.status === "submitted").length
  const periodPct = periodItems.length ? (periodDone / periodItems.length) * 100 : 0

  const dayList = (
    <div>
      <h2 className="mb-2 flex items-baseline gap-2 px-1 text-[13px] font-semibold">
        {isSameDay(day, now) ? "今日" : format(day, "M月d日(E)", { locale: ja })}
        <span className="num text-[12px] font-normal text-muted-foreground">{dayItems.length}件</span>
      </h2>
      {dayItems.length === 0 ? (
        <Panel className="px-4 py-6 text-center text-[13px] text-muted-foreground">この日の締切はありません</Panel>
      ) : (
        <Panel className="divide-y divide-border overflow-hidden">
          {dayItems.map((a) => (
            <TaskRow key={a.id} a={a} onOpen={() => setOpenId(a.id)} selected={desktop && openId === a.id} />
          ))}
        </Panel>
      )}
    </div>
  )

  return (
    <>
      <TopBar
        title="カレンダー"
        actions={
          !isNow || !isSameDay(day, now) ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCursor(now)
                setDay(now)
              }}
            >
              今日
            </Button>
          ) : null
        }
      />
      <Content>
        <div className="mb-3 flex items-center gap-2">
          <Segmented<Mode>
            label="表示"
            value={mode}
            onChange={setMode}
            className="w-[7.5rem]"
            options={[
              { value: "week", label: "週" },
              { value: "month", label: "月" },
            ]}
          />
          <div className="ml-auto flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="前へ" onClick={() => shift(-1)} />
            <span className="num min-w-[7rem] text-center text-[13px] font-medium">{label}</span>
            <IconButton icon={ChevronRight} label="次へ" onClick={() => shift(1)} />
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <div className="min-w-0">
            <Panel className="overflow-hidden bg-background">
              {mode === "week" ? (
                <WeekRow anchor={cursor} selected={day} onSelect={setDay} list={assignments} now={now} />
              ) : (
                <MonthGrid
                  month={cursor}
                  selected={day}
                  onSelect={setDay}
                  onOpen={(a) => {
                    setDay(a.due ?? day)
                    setOpenId(a.id)
                  }}
                  list={assignments}
                  now={now}
                  compact={!desktop}
                />
              )}
            </Panel>
            <div className="mt-3 flex items-center gap-3 px-1">
              <p className="num shrink-0 text-[12.5px] text-muted-foreground">
                {mode === "week" ? "この週" : "この月"} <span className="text-foreground">{periodDone}</span> /{" "}
                {periodItems.length} 提出
              </p>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${periodPct}%` }} />
              </div>
            </div>
            <div className="mt-4 lg:hidden">{dayList}</div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-16">
              {opened ? (
                <Panel className="bg-background p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{opened.title}</h2>
                    <IconButton icon={X} label="閉じる" onClick={() => setOpenId(null)} className="-mr-1" />
                  </div>
                  <TaskDetail key={opened.id} a={opened} onClose={() => setOpenId(null)} />
                </Panel>
              ) : (
                dayList
              )}
            </div>
          </aside>
        </div>
      </Content>

      {!desktop && <TaskSheet a={opened} onClose={() => setOpenId(null)} />}
    </>
  )
}
