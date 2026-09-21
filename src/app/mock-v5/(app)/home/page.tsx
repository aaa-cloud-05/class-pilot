"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { addWeeks, differenceInCalendarWeeks, endOfWeek, format, startOfWeek } from "date-fns"
import { ArrowDownUp, CalendarCheck2, Inbox, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AssignmentDetail, AssignmentList, AssignmentSheet } from "../../_components/assignment"
import { MonthGrid } from "../../_components/calendar-parts"
import { Appear } from "../../_components/motion"
import { DESKTOP_QUERY, useMediaQuery, useMock } from "../../_components/provider"
import { MobileHeader, PageBody, ReauthOrErrorBanner, SetupCard } from "../../_components/shell"
import { Button, ButtonLink, Card, EmptyState, IconButton, SectionHeader, Segmented, Skeleton } from "../../_components/ui"
import { WeekHero } from "../../_components/week-hero"
import { countLater, groupAssignments, GROUP_LABEL, type SortMode } from "../../_lib/format"
import { buildWeekState, nextUp } from "../../_lib/week"

function ListSkeleton() {
  return (
    <div className="space-y-6" aria-label="読み込み中">
      {[3, 2].map((n, g) => (
        <div key={g}>
          <Skeleton className="mb-3 ml-1 h-4 w-16" />
          <div className="overflow-hidden rounded-card bg-card shadow-card">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className={cn("flex items-center gap-3 px-4 py-4", i > 0 && "border-t border-border")}>
                <Skeleton className="h-[22px] w-[22px] rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MockHomePage() {
  const { now, assignments, controls, setupDismissed, setAddOpen } = useMock()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [view, setView] = useState<"open" | "all">("open")
  const [sort, setSort] = useState<SortMode>("due")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [calDay, setCalDay] = useState<Date>(now)

  const groups = useMemo(
    () => groupAssignments(assignments, now, { includeSubmitted: view === "all", sort }),
    [assignments, now, view, sort],
  )
  const selected = assignments.find((a) => a.id === selectedId) ?? null
  // ヒーローの週は < > で動かせる（リストは「いま」を基準のまま）
  const [weekAnchor, setWeekAnchor] = useState<Date>(now)
  const week = useMemo(() => buildWeekState(assignments, now, weekAnchor), [assignments, now, weekAnchor])
  const next = useMemo(() => nextUp(assignments, now), [assignments, now])
  const rangeLabel = `${format(startOfWeek(weekAnchor, { weekStartsOn: 1 }), "M/d")} - ${format(endOfWeek(weekAnchor, { weekStartsOn: 1 }), "M/d")}`
  const weekDiff = differenceInCalendarWeeks(weekAnchor, now, { weekStartsOn: 1 })
  const weekLabel =
    weekDiff === 0 ? "今週" : weekDiff === 1 ? "来週" : weekDiff === -1 ? "先週" : weekDiff > 0 ? `${weekDiff}週間後` : `${-weekDiff}週間前`
  const laterCount = useMemo(() => countLater(assignments, now), [assignments, now])

  const loading = controls.data === "loading"
  const empty = controls.data === "empty"
  const showSetup = !setupDismissed && !controls.setupDone

  const list = loading ? (
    <ListSkeleton />
  ) : empty ? (
    <Card>
      <EmptyState
        icon={Inbox}
        title="課題はまだありません"
        description="Google でログインすると Classroom の課題が、WebClass をつなぐと WebClass の課題が、ここに締切順で並びます。"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/mock-v5/settings/setup">WebClass をつなぐ</ButtonLink>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              自分で追加
            </Button>
          </div>
        }
      />
    </Card>
  ) : groups.length === 0 ? (
    <Card>
      <EmptyState
        icon={CalendarCheck2}
        title="未提出の課題はありません"
        description="新しい課題が届いたら、ここと通知でお知らせします。"
        action={
          <Button variant="secondary" onClick={() => setView("all")}>
            すべてを表示
          </Button>
        }
      />
    </Card>
  ) : (
    <div className="space-y-6">
      {groups.map((g, i) => (
        <Appear key={g.key} delay={Math.min(0.06 * i, 0.24)}>
          <section aria-labelledby={`group-${g.key}`}>
            <SectionHeader
              id={`group-${g.key}`}
              title={g.key === "noDue" && view === "open" ? "期限なしの未提出" : GROUP_LABEL[g.key]}
              count={g.items.length}
              tone={g.key === "recent" ? "danger" : undefined}
            />
            <AssignmentList items={g.items} onOpen={(a) => setSelectedId(a.id)} selectedId={desktop ? selectedId : null} />
          </section>
        </Appear>
      ))}
    </div>
  )

  return (
    <>
      <MobileHeader variant="home" />
      <PageBody wide>
        <ReauthOrErrorBanner />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0">
            {!empty && !loading && (
              <Appear>
                <WeekHero
                  week={week}
                  rangeLabel={rangeLabel}
                  weekLabel={weekLabel}
                  isCurrentWeek={weekDiff === 0}
                  onPrevWeek={() => setWeekAnchor((d) => addWeeks(d, -1))}
                  onNextWeek={() => setWeekAnchor((d) => addWeeks(d, 1))}
                  next={weekDiff === 0 ? next : null}
                  onOpenNext={(a) => setSelectedId(a.id)}
                />
              </Appear>
            )}

            {showSetup && (
              <Appear delay={0.08} className="mt-4 lg:hidden">
                <SetupCard />
              </Appear>
            )}

            <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 -mx-4 mt-6 flex items-center gap-2 bg-background/85 px-4 py-2 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
              <Segmented
                label="表示する課題"
                value={view}
                onChange={setView}
                className="flex-1 sm:max-w-[13rem]"
                options={[
                  { value: "open", label: "最近" },
                  { value: "all", label: "すべて" },
                ]}
              />
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-9"
                onClick={() => setSort(sort === "due" ? "status" : "due")}
                aria-label={`並び順：${sort === "due" ? "締切順" : "状態順"}（押すと切り替え）`}
              >
                <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                {sort === "due" ? "締切順" : "状態順"}
              </Button>
            </div>

            <div className="mt-3">{list}</div>

            {laterCount > 0 && !loading && !empty && (
              <p className="mt-4 px-1 text-[13px] text-muted-foreground">
                来週以降の課題が <span className="font-semibold tabular-nums text-foreground">{laterCount}</span> 件あります。
                <Link href="/mock-v5/calendar" className="ml-1 font-medium text-primary hover:underline">
                  カレンダーで見る
                </Link>
              </p>
            )}
          </div>

          {/* PC の右カラム：選んだ課題の詳細。未選択なら月の全体像 */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              {selected ? (
                <Card className="p-5">
                  <div className="-mr-2 -mt-2 flex justify-end">
                    <IconButton icon={X} label="詳細を閉じる" onClick={() => setSelectedId(null)} />
                  </div>
                  <AssignmentDetail key={selected.id} a={selected} onClose={() => setSelectedId(null)} />
                </Card>
              ) : (
                <>
                  {showSetup && <SetupCard />}
                  <Card className="p-4">
                    <div className="flex items-baseline justify-between px-1 pb-3">
                      <p className="text-[14px] font-semibold">{format(now, "M月")}</p>
                      <Link
                        href="/mock-v5/calendar"
                        className="rounded-control text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        カレンダー
                      </Link>
                    </div>
                    <MonthGrid
                      month={now}
                      selected={calDay}
                      onSelect={setCalDay}
                      list={assignments}
                      now={now}
                      compact
                    />
                  </Card>
                  <p className="px-2 text-[13px] leading-relaxed text-muted-foreground">
                    課題をクリックすると、ここに詳細が出ます。
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </PageBody>

      {!desktop && <AssignmentSheet a={selected} onClose={() => setSelectedId(null)} />}
    </>
  )
}
