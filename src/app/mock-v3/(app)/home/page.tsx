"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Inbox, Plus, RefreshCw, X } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { ConfirmUnknownSheet, TaskDetail, TaskGroups, TaskSheet } from "../../_components/task"
import { DESKTOP_QUERY, useMediaQuery, useMock } from "../../_components/provider"
import { Content, SetupBar, TopBar } from "../../_components/shell"
import { WeekPanel } from "../../_components/week-panel"
import { Button, EmptyState, IconButton, Panel, Skeleton } from "../../_components/ui"
import { nextUp } from "../../_lib/week"

function ListSkeleton() {
  return (
    <Panel className="divide-y divide-border overflow-hidden" aria-label="読み込み中">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-background px-4 py-3">
          <Skeleton className="h-[18px] w-[18px] rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </Panel>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { now, assignments, controls, setAddOpen, refresh, syncing, notifications } = useMock()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selected = assignments.find((a) => a.id === selectedId) ?? null
  const next = useMemo(() => nextUp(assignments, now), [assignments, now])
  const unread = notifications.filter((n) => !n.read).length

  const loading = controls.data === "loading"
  const empty = controls.data === "empty" || assignments.length === 0

  return (
    <>
      <TopBar
        brand
        title="ホーム"
        actions={
          <>
            <IconButton icon={Plus} label="課題を追加" onClick={() => setAddOpen(true)} />
            <IconButton
              icon={RefreshCw}
              label="更新"
              onClick={refresh}
              className={cn(syncing && "[&_svg]:animate-spin")}
            />
            <div className="relative lg:hidden">
              <IconButton icon={Bell} label="通知" onClick={() => router.push("/mock-v3/activity")} />
              {unread > 0 && (
                <span className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </div>
          </>
        }
      />

      <Content className={cn(selected ? "lg:max-w-6xl" : "lg:max-w-3xl")}>
        <SetupBar />

        <div className={cn("lg:grid lg:items-start lg:gap-6", selected ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-1")}>
          <div className="min-w-0 space-y-4">
            {!empty && !loading && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <WeekPanel
                  items={assignments}
                  next={next}
                  onOpenNext={(a) => setSelectedId(a.id)}
                  onConfirmUnknown={() => setConfirmOpen(true)}
                />
              </motion.div>
            )}

            {loading ? (
              <ListSkeleton />
            ) : empty ? (
              <Panel>
                <EmptyState
                  icon={Inbox}
                  title="まだ課題がありません"
                  description="Classroom と WebClass をつなぐと、締切が近い順にここへ並びます。"
                  action={
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={() => router.push("/mock-v3/start")}>
                        セットアップを開く
                      </Button>
                      <Button onClick={() => setAddOpen(true)}>手で追加</Button>
                    </div>
                  }
                />
              </Panel>
            ) : (
              <TaskGroups items={assignments} onOpen={(a) => setSelectedId(a.id)} selectedId={desktop ? selectedId : null} />
            )}
          </div>

          {/* PC：課題を選んだときだけ右に詳細を出す。普段は一覧を広く使う */}
          {selected && (
            <aside className="hidden lg:block">
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="sticky top-16"
              >
                <Panel className="bg-background p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{selected.title}</h2>
                    <IconButton icon={X} label="詳細を閉じる" onClick={() => setSelectedId(null)} className="-mr-1" />
                  </div>
                  <TaskDetail key={selected.id} a={selected} onClose={() => setSelectedId(null)} />
                </Panel>
              </motion.div>
            </aside>
          )}
        </div>
      </Content>

      {!desktop && <TaskSheet a={selected} onClose={() => setSelectedId(null)} />}
      <ConfirmUnknownSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </>
  )
}
