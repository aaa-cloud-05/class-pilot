"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarCheck2, CalendarRange, CalendarX2, ChevronRight, Inbox, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewAssignment } from "@/lib/assignment-view"
import { AllList, type FocusWeek } from "@/components/app/all-list"
import { AssignmentDetail, AssignmentList, AssignmentSheet, ClampedList } from "@/components/app/assignment"
import { itemsOn, MonthGrid } from "@/components/app/calendar-parts"
import { Appear } from "@/components/app/motion"
import { useApp } from "@/components/app/provider"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { MobileHeader, PageBody, ReauthOrErrorBanner, SetupCard } from "@/components/app/shell"
import { Button, ButtonLink, Card, EmptyState, IconButton, SectionHeader, Segmented, Skeleton } from "@/components/app/ui"
import { WeekHero } from "@/components/app/week-hero"
import { countLater, countThisWeek, firstLaterDue, groupRecent, GROUP_LABEL } from "@/lib/assignment-format"
import { buildWeekState, nextUp } from "@/lib/week-view"

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

type View = "recent" | "all"

export default function MockHomePage() {
  const { now, assignments, loading, setupDismissed, setAddOpen } = useApp()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [view, setView] = useState<View>("recent")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 棒グラフで選んだ日。「最近」の直近の未提出のすぐ下に、その日の課題を出す
  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  // 「すべて」に切り替えたときにスクロールして見せる週
  const [focusWeek, setFocusWeek] = useState<FocusWeek | null>(null)

  const groups = useMemo(() => groupRecent(assignments, now), [assignments, now])
  const selected = assignments.find((a) => a.id === selectedId) ?? null
  // ヒーローの週は今週からのずれで持つ。開いたときの日付で固定すると、開きっぱなしで日をまたいだときに古い週を指し続ける
  const [weekDiff, setWeekDiff] = useState(0)
  const weekAnchor = useMemo(() => addWeeks(now, weekDiff), [now, weekDiff])
  const week = useMemo(() => buildWeekState(assignments, now, weekAnchor), [assignments, now, weekAnchor])
  const next = useMemo(() => nextUp(assignments, now), [assignments, now])
  const rangeLabel = `${format(startOfWeek(weekAnchor, { weekStartsOn: 1 }), "M/d")} - ${format(endOfWeek(weekAnchor, { weekStartsOn: 1 }), "M/d")}`
  const weekLabel =
    weekDiff === 0 ? "今週" : weekDiff === 1 ? "来週" : weekDiff === -1 ? "先週" : weekDiff > 0 ? `${weekDiff}週間後` : `${-weekDiff}週間前`
  const laterCount = useMemo(() => countLater(assignments, now), [assignments, now])
  const thisWeekCount = useMemo(() => countThisWeek(assignments, now), [assignments, now])
  const pickedItems = useMemo(() => (pickedDay ? itemsOn(pickedDay, assignments) : []), [pickedDay, assignments])
  // 「すべて」で開く月。選んでいなければ今月
  const [pickedMonth, setAllMonth] = useState<Date | null>(null)
  const allMonth = pickedMonth ?? now
  const firstLater = useMemo(() => firstLaterDue(assignments, now), [assignments, now])

  const empty = !loading && assignments.length === 0
  const showSetup = !setupDismissed

  /** 「すべて」に切り替えて、その日を含む週までスクロールする */
  const showWeekInAll = (d: Date) => {
    setAllMonth(d)
    setView("all")
    setFocusWeek((f) => ({ date: d, n: (f?.n ?? 0) + 1 }))
  }
  // ヒーローの週を動かしたら、その週を「すべて」で見せる
  const moveWeek = (delta: number) => {
    const diff = weekDiff + delta
    setWeekDiff(diff)
    setPickedDay(null)
    showWeekInAll(addWeeks(now, diff))
  }
  // 棒を押したら「最近」にその日の課題を出す。同じ日をもう一度押すと外す
  const pickDay = (d: Date) => {
    setPickedDay((p) => (p && isSameDay(p, d) ? null : d))
    setView("recent")
  }
  const changeView = (v: View) => {
    setView(v)
    // 自分でタブを切り替えたときは、前に頼んだ週へはスクロールしない
    setFocusWeek(null)
    // 「最近」はいまが基準なので、ヒーローも今週に戻す
    if (v === "recent" && weekDiff !== 0) {
      setWeekDiff(0)
      setPickedDay(null)
    }
  }

  const openItem = (a: ViewAssignment) => setSelectedId(a.id)
  const listSelectedId = desktop ? selectedId : null
  const plainList = (items: ViewAssignment[]) => (
    <AssignmentList items={items} onOpen={openItem} selectedId={listSelectedId} />
  )
  const group = (
    key: string,
    title: React.ReactNode,
    body: React.ReactNode,
    opts: { count?: number; tone?: "danger"; action?: React.ReactNode } = {},
  ) => (
    <section aria-labelledby={`group-${key}`}>
      <SectionHeader id={`group-${key}`} title={title} count={opts.count} tone={opts.tone} action={opts.action} />
      {body}
    </section>
  )

  // 並び: 直近の未提出 → 棒グラフで選んだ日 → 今日 → 明日 → 今週の課題を見る → 期限なしの未提出
  const recent = groups.find((g) => g.key === "recent")
  const today = groups.find((g) => g.key === "today")
  const tomorrow = groups.find((g) => g.key === "tomorrow")
  const noDue = groups.find((g) => g.key === "noDue")
  // 選んだ日が今日・明日なら、そのグループは選んだ日の側にまとめる（同じ課題を2回出さない）
  const pickedIsToday = pickedDay != null && isSameDay(pickedDay, now)
  const pickedIsTomorrow = pickedDay != null && isSameDay(pickedDay, addDays(now, 1))

  const blocks: { key: string; node: React.ReactNode }[] = []
  if (recent) {
    blocks.push({
      key: "recent",
      node: group("recent", GROUP_LABEL.recent, plainList(recent.items), { count: recent.items.length, tone: "danger" }),
    })
  }
  if (pickedDay) {
    const title = `${pickedIsToday ? "今日 " : pickedIsTomorrow ? "明日 " : ""}${format(pickedDay, "M月d日(E)", { locale: ja })}`
    blocks.push({
      key: `picked-${format(pickedDay, "yyyy-MM-dd")}`,
      node: group(
        "picked",
        title,
        pickedItems.length ? (
          plainList(pickedItems)
        ) : (
          <Card className="flex items-center gap-3 px-4 py-5 text-muted-foreground">
            <CalendarX2 className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-[15px]">この日が締切の課題はありません</p>
          </Card>
        ),
        {
          count: pickedItems.length,
          action: (
            <button
              type="button"
              onClick={() => setPickedDay(null)}
              className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              閉じる
            </button>
          ),
        },
      ),
    })
  }
  if (today && !pickedIsToday) {
    blocks.push({ key: "today", node: group("today", GROUP_LABEL.today, plainList(today.items), { count: today.items.length }) })
  }
  if (tomorrow && !pickedIsTomorrow) {
    blocks.push({
      key: "tomorrow",
      node: group("tomorrow", GROUP_LABEL.tomorrow, plainList(tomorrow.items), { count: tomorrow.items.length }),
    })
  }
  if (blocks.length === 0 && !noDue) {
    blocks.push({
      key: "none",
      node: (
        <Card>
          <EmptyState icon={CalendarCheck2} title="最近の課題はありません" description="新しい課題が届いたら、ここと通知でお知らせします。" />
        </Card>
      ),
    })
  }
  // 今週の残りはリストにせず、「すべて」の今週へ送る
  blocks.push({
    key: "week",
    node: (
      <button
        type="button"
        onClick={() => showWeekInAll(now)}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-card bg-card px-4 text-left shadow-card outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <CalendarRange className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-[15px] font-medium">今週の課題を見る</span>
        <span className="text-[13px] tabular-nums text-muted-foreground">{thisWeekCount} 件</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      </button>
    ),
  })
  if (noDue) {
    blocks.push({
      key: "noDue",
      node: group(
        "noDue",
        GROUP_LABEL.noDue,
        <ClampedList items={noDue.items} onOpen={openItem} selectedId={listSelectedId} />,
        { count: noDue.items.length },
      ),
    })
  }

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
            <ButtonLink href="/settings/setup">WebClass をつなぐ</ButtonLink>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              自分で追加
            </Button>
          </div>
        }
      />
    </Card>
  ) : (
    <div className="space-y-6">
      {blocks.map((b, i) => (
        <Appear key={b.key} delay={Math.min(0.06 * i, 0.24)}>
          {b.node}
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
                  onPrevWeek={() => moveWeek(-1)}
                  onNextWeek={() => moveWeek(1)}
                  next={weekDiff === 0 ? next : null}
                  onOpenNext={openItem}
                  pickedDay={pickedDay}
                  onPickDay={pickDay}
                />
              </Appear>
            )}

            {/* SetupCard は通知の状態を取りに行くので、見えている側の1つだけ描く */}
            {showSetup && !desktop && (
              <Appear delay={0.12} className="mt-4 lg:hidden">
                <SetupCard />
              </Appear>
            )}

            <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 -mx-4 mt-6 flex items-center gap-2 bg-background/85 px-4 py-2 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
              <Segmented
                label="表示する課題"
                value={view}
                onChange={changeView}
                className="flex-1 sm:max-w-[13rem]"
                options={[
                  { value: "recent", label: "最近" },
                  { value: "all", label: "すべて" },
                ]}
              />
            </div>

            <div className="mt-3">
              {view === "all" && !loading && !empty ? (
                <AllList
                  onOpen={openItem}
                  selectedId={listSelectedId}
                  month={allMonth}
                  onMonthChange={setAllMonth}
                  focusWeek={focusWeek}
                />
              ) : (
                list
              )}
            </div>

            {view === "recent" && laterCount > 0 && !loading && !empty && (
              <p className="mt-4 px-1 text-[13px] text-muted-foreground">
                来週以降の課題が <span className="font-semibold tabular-nums text-foreground">{laterCount}</span> 件あります。
                <button
                  type="button"
                  onClick={() => (firstLater ? showWeekInAll(firstLater) : setView("all"))}
                  className="ml-1 rounded-control font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  すべてで見る
                </button>
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
                  {showSetup && desktop && <SetupCard />}
                  <Card className="p-4">
                    <div className="flex items-baseline justify-between px-1 pb-3">
                      <p className="text-[14px] font-semibold">{format(allMonth, "M月")}</p>
                      <Link
                        href="/calendar"
                        className="rounded-control text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        カレンダー
                      </Link>
                    </div>
                    {/* 表示だけ。日付は選べない（塗りの丸は今日） */}
                    <MonthGrid month={allMonth} list={assignments} now={now} compact />
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
