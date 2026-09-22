"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, isSameWeek } from "date-fns"
import { ja } from "date-fns/locale"
import { ArrowDownUp, CalendarCheck2, Inbox, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AssignmentDetail, AssignmentList, AssignmentSheet } from "../../_components/assignment"
import { WeekStrip } from "../../_components/calendar-parts"
import { DESKTOP_QUERY, useMediaQuery, useMock } from "../../_components/provider"
import { MobileHeader, PageBody, ReauthOrErrorBanner, SetupCard } from "../../_components/shell"
import { Button, ButtonLink, Card, EmptyState, IconButton, SectionHeader, Segmented, Skeleton } from "../../_components/ui"
import { groupAssignments, GROUP_LABEL, groupOf, type SortMode } from "../../_lib/format"

function Stat({ value, label, tone, href }: { value: number; label: string; tone: "danger" | "warn" | "neutral"; href: string }) {
  const zero = value === 0
  return (
    <a
      href={href}
      className="flex flex-col rounded-card bg-surface px-4 py-3 shadow-card outline-none transition-colors hover:bg-surface-2/60 focus-visible:ring-2 focus-visible:ring-signal"
    >
      <span
        className={cn(
          "text-[28px] font-bold leading-tight tabular-nums tracking-[-0.02em]",
          zero ? "text-ink-3" : tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-ink",
        )}
      >
        {value}
      </span>
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
    </a>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-6" aria-label="読み込み中">
      {[3, 2].map((n, g) => (
        <div key={g}>
          <Skeleton className="mb-3 ml-1 h-5 w-16" />
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className={cn("flex items-center gap-3 px-4 py-4", i > 0 && "border-t border-line")}>
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-12" />
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
  const [weekDay, setWeekDay] = useState<Date>(now)

  const groups = useMemo(
    () => groupAssignments(assignments, now, { includeSubmitted: view === "all", sort }),
    [assignments, now, view, sort],
  )
  const selected = assignments.find((a) => a.id === selectedId) ?? null

  const open = assignments.filter((a) => a.status !== "submitted")
  const overdue = open.filter((a) => groupOf(a, now) === "overdue").length
  const today = open.filter((a) => groupOf(a, now) === "today").length
  const thisWeek = open.filter((a) => a.due && a.due >= now && isSameWeek(a.due, now, { weekStartsOn: 1 })).length
  const weekItems = assignments.filter((a) => a.due && isSameWeek(a.due, now, { weekStartsOn: 1 }))
  const weekDone = weekItems.filter((a) => a.status === "submitted").length

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
            <ButtonLink href="/mock/help/webclass">WebClass をつなぐ</ButtonLink>
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
        tone="ok"
        title="未提出の課題はありません"
        description="新しい課題が届いたら、ここと通知でお知らせします。"
        action={
          <Button variant="secondary" onClick={() => setView("all")}>
            提出済みも表示
          </Button>
        }
      />
    </Card>
  ) : (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`group-${g.key}`}>
          <SectionHeader
            id={`group-${g.key}`}
            title={GROUP_LABEL[g.key]}
            count={g.items.length}
            tone={g.key === "overdue" ? "danger" : g.key === "today" ? "warn" : undefined}
          />
          <AssignmentList items={g.items} onOpen={(a) => setSelectedId(a.id)} selectedId={desktop ? selectedId : null} />
        </section>
      ))}
    </div>
  )

  return (
    <>
      <MobileHeader variant="home" />
      <PageBody wide desktopTitle="ホーム">
        <ReauthOrErrorBanner />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0">
            <p className="px-1 text-[14px] font-semibold text-ink-3">{format(now, "M月d日(E)", { locale: ja })}</p>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              <Stat value={overdue} label="期限切れ" tone="danger" href="#group-overdue" />
              <Stat value={today} label="今日締切" tone="warn" href="#group-today" />
              <Stat value={thisWeek} label="今週の残り" tone="neutral" href="#group-thisWeek" />
            </div>

            {showSetup && (
              <div className="mt-5 lg:hidden">
                <SetupCard />
              </div>
            )}

            <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-4 mt-6 flex items-center gap-2 bg-canvas/85 px-4 py-2 backdrop-blur-xl lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
              <Segmented
                label="表示する課題"
                value={view}
                onChange={setView}
                className="flex-1 sm:max-w-xs"
                options={[
                  { value: "open", label: "未提出" },
                  { value: "all", label: "すべて" },
                ]}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-11"
                onClick={() => setSort(sort === "due" ? "status" : "due")}
                aria-label={`並び順：${sort === "due" ? "締切順" : "状態順"}（押すと切り替え）`}
              >
                <ArrowDownUp className="h-4 w-4" aria-hidden />
                {sort === "due" ? "締切順" : "状態順"}
              </Button>
            </div>

            <div className="mt-3">{list}</div>
          </div>

          {/* PC の右カラム：選んだ課題の詳細、未選択なら概要 */}
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
                    <div className="flex items-baseline justify-between px-1">
                      <p className="text-[15px] font-bold">今週</p>
                      <p className="text-[13px] font-semibold tabular-nums text-ink-3">
                        {weekDone} / {weekItems.length} 提出済み
                      </p>
                    </div>
                    <div className="mx-1 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-ok transition-[width] duration-500"
                        style={{ width: `${weekItems.length ? (weekDone / weekItems.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="mt-3">
                      <WeekStrip anchor={now} selected={weekDay} onSelect={setWeekDay} list={assignments} now={now} />
                    </div>
                    <Link
                      href="/mock/calendar"
                      className="mt-2 flex h-11 items-center justify-center rounded-control text-[14px] font-semibold text-brand-text outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
                    >
                      カレンダーで見る
                    </Link>
                  </Card>
                  <p className="px-2 text-[13px] leading-relaxed text-ink-3">
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
