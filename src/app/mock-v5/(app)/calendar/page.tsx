"use client"

import { useMemo, useState } from "react"
import { addMonths, addWeeks, format, isSameDay, isSameMonth, isSameWeek, startOfMonth, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarX2, ChevronLeft, ChevronRight, X } from "lucide-react"
import { AssignmentDetail, AssignmentList, AssignmentSheet } from "../../_components/assignment"
import { itemsOn, MonthGrid, WeekColumns, WeekStrip, weekRangeLabel } from "../../_components/calendar-parts"
import { Appear } from "../../_components/motion"
import { DESKTOP_QUERY, useMediaQuery, useMock } from "../../_components/provider"
import { MobileHeader, PageBody } from "../../_components/shell"
import { StatusBar } from "../../_components/status-bar"
import { Button, Card, IconButton, SectionHeader, Segmented } from "../../_components/ui"

type Mode = "week" | "month"

export default function MockCalendarPage() {
  const { now, assignments } = useMock()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [mode, setMode] = useState<Mode>("month")
  const [cursor, setCursor] = useState<Date>(now)
  const [selectedDay, setSelectedDay] = useState<Date>(now)
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = assignments.find((a) => a.id === openId) ?? null

  const shift = (n: number) => setCursor((c) => (mode === "week" ? addWeeks(c, n) : addMonths(c, n)))
  const goToday = () => {
    setCursor(now)
    setSelectedDay(now)
  }
  const selectDay = (d: Date) => {
    setSelectedDay(d)
    setOpenId(null)
  }

  const periodItems = useMemo(
    () =>
      assignments.filter(
        (a) => a.due && (mode === "week" ? isSameWeek(a.due, cursor, { weekStartsOn: 1 }) : isSameMonth(a.due, cursor)),
      ),
    [assignments, cursor, mode],
  )
  const periodDone = periodItems.filter((a) => a.status === "submitted").length
  const periodOverdue = periodItems.filter((a) => a.status !== "submitted" && a.due && a.due < now).length
  // 期間が変わったら帯を作り直して、もう一度伸びるようにする
  const periodKey = mode === "week" ? `w${format(startOfWeek(cursor, { weekStartsOn: 1 }), "yyyy-MM-dd")}` : `m${format(cursor, "yyyy-MM")}`
  const dayItems = itemsOn(selectedDay, assignments)
  const label = mode === "week" ? weekRangeLabel(cursor) : format(startOfMonth(cursor), "yyyy年 M月")
  const isCurrent = mode === "week" ? isSameWeek(cursor, now, { weekStartsOn: 1 }) : isSameMonth(cursor, now)

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented<Mode>
        label="表示の単位"
        value={mode}
        onChange={setMode}
        className="w-36"
        options={[
          { value: "week", label: "週" },
          { value: "month", label: "月" },
        ]}
      />
      <div className="ml-auto flex items-center">
        <IconButton icon={ChevronLeft} label={mode === "week" ? "前の週" : "前の月"} onClick={() => shift(-1)} />
        <span className="min-w-[8.5rem] text-center text-[16px] font-bold tabular-nums">{label}</span>
        <IconButton icon={ChevronRight} label={mode === "week" ? "次の週" : "次の月"} onClick={() => shift(1)} />
      </div>
    </div>
  )

  // ホームの今週と同じ帯。状態ごとの色でこの期間を全部ぶん埋める
  const progress = (
    <div className="px-1">
      <StatusBar key={periodKey} items={periodItems} now={now} />
      <p className="mt-2 flex items-center justify-between text-[13px] text-muted-foreground">
        <span className="tabular-nums">
          {mode === "week" ? "この週" : "この月"} 提出済み {periodDone} / {periodItems.length}
        </span>
        {periodOverdue > 0 && (
          <span className="font-medium text-destructive tabular-nums">期限切れ {periodOverdue}</span>
        )}
      </p>
    </div>
  )

  // 日付を選び直すたびに、その日の課題が一拍遅れて現れる
  const dayList = (
    <Appear key={format(selectedDay, "yyyy-MM-dd")} delay={0.04}>
    <section aria-labelledby="day-title">
      <SectionHeader
        id="day-title"
        title={isSameDay(selectedDay, now) ? `今日 ${format(selectedDay, "M月d日(E)", { locale: ja })}` : format(selectedDay, "M月d日(E)", { locale: ja })}
        count={dayItems.length}
      />
      {dayItems.length ? (
        <AssignmentList items={dayItems} onOpen={(a) => setOpenId(a.id)} selectedId={desktop ? openId : null} />
      ) : (
        <Card className="flex items-center gap-3 px-4 py-5 text-muted-foreground">
          <CalendarX2 className="h-5 w-5 shrink-0" aria-hidden />
          <p className="text-[15px]">この日が締切の課題はありません</p>
        </Card>
      )}
    </section>
    </Appear>
  )

  return (
    <>
      <MobileHeader
        variant="title"
        title="カレンダー"
        actions={
          !isCurrent || !isSameDay(selectedDay, now) ? (
            <Button variant="ghost" size="sm" className="mr-1 h-11" onClick={goToday}>
              今日
            </Button>
          ) : null
        }
      />
      <PageBody
        wide
        desktopTitle="カレンダー"
        desktopActions={
          <Button variant="secondary" size="sm" onClick={goToday}>
            今日
          </Button>
        }
      >
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0 space-y-4">
            {toolbar}
            {progress}
            <Card className="p-2 lg:p-3">
              {mode === "week" ? (
                desktop ? (
                  <WeekColumns
                    anchor={cursor}
                    selected={selectedDay}
                    onSelect={selectDay}
                    onOpen={(a) => {
                      setSelectedDay(a.due ?? selectedDay)
                      setOpenId(a.id)
                    }}
                    list={assignments}
                    now={now}
                  />
                ) : (
                  <WeekStrip anchor={cursor} selected={selectedDay} onSelect={selectDay} list={assignments} now={now} />
                )
              ) : (
                <MonthGrid
                  month={cursor}
                  selected={selectedDay}
                  onSelect={selectDay}
                  onOpen={(a) => {
                    setSelectedDay(a.due ?? selectedDay)
                    setOpenId(a.id)
                  }}
                  list={assignments}
                  now={now}
                  compact={!desktop}
                />
              )}
            </Card>
            <div className="pt-2 lg:hidden">{dayList}</div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              {opened ? (
                <Card className="p-5">
                  <div className="-mr-2 -mt-2 flex justify-end">
                    <IconButton icon={X} label="詳細を閉じる" onClick={() => setOpenId(null)} />
                  </div>
                  <AssignmentDetail key={opened.id} a={opened} onClose={() => setOpenId(null)} />
                </Card>
              ) : (
                dayList
              )}
            </div>
          </aside>
        </div>
      </PageBody>

      {!desktop && <AssignmentSheet a={opened} onClose={() => setOpenId(null)} />}
    </>
  )
}
