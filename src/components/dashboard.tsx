"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { startOfWeek, addDays, isSameDay, format, differenceInCalendarWeeks } from "date-fns"
import { ja } from "date-fns/locale"
import { Clock, CircleDot, Bell, User } from "lucide-react"

import { useAssignments } from "@/hooks/useAssignments"
import { AppHeader } from "@/components/app-header"
import { SyncLamps } from "@/components/sync-lamps"
import { AiInsight } from "@/components/ai-insight"
import { WeeklyCard } from "@/components/weekly-card"
import { TaskTable, type TaskActions } from "@/components/task-table"
import { EditorialCard } from "@/components/editorial-card"
import { IconCycleToggle, RefreshControl } from "@/components/quiet-controls"
import { NotificationBanner } from "@/components/NotificationBanner"
import { NotificationPanel } from "@/components/NotificationPanel"
import { EditAssignmentDialog } from "@/components/EditAssignmentDialog"
import { buildWeek, buildSyncSources, weekInsight } from "@/lib/week-adapter"
import type { Task } from "@/lib/dashboard-data"
import type { Assignment } from "@/lib/types"
import {
  getNotificationSettings,
  saveNotificationSettings,
  getUnreadCount,
} from "@/lib/notification-store"

type SortMode = "time" | "status"
type WeekSort = "date" | "status"

const STATUS_RANK: Record<Task["status"], number> = {
  "not-submitted": 0,
  pending: 1,
  optional: 2,
  submitted: 3,
}

function timeKey(task: Task) {
  const time = task.deadline.split(" · ")[1] ?? "23:59"
  const [h, m] = time.split(":").map((n) => Number.parseInt(n, 10))
  return (Number.isFinite(h) ? h : 23) * 60 + (Number.isFinite(m) ? m : 59)
}

// 単日リスト用（時刻順／状態順）
function sortTasks(tasks: Task[], mode: SortMode) {
  return [...tasks].sort((a, b) =>
    mode === "time"
      ? timeKey(a) - timeKey(b)
      : STATUS_RANK[a.status] - STATUS_RANK[b.status] || timeKey(a) - timeKey(b),
  )
}

// 週リスト用（日付順＝曜日→時刻／状態順）
function sortWeekTasks(tasks: Task[], mode: WeekSort) {
  return [...tasks].sort((a, b) =>
    mode === "date"
      ? a.dayIndex - b.dayIndex || timeKey(a) - timeKey(b)
      : STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.dayIndex - b.dayIndex || timeKey(a) - timeKey(b),
  )
}

export function Dashboard() {
  const { status } = useSession()
  const loggedIn = status === "authenticated"
  const {
    assignments,
    loading,
    error,
    refresh,
    removeAssignment,
    applyEdit,
    syncedAt,
    syncError,
  } = useAssignments()

  const [now] = useState(() => new Date())
  // 選択中の日付（週カード・今日セクションの唯一の基準）。既定は今日。
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  const weekMonday = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])
  const selectedIndex = (selectedDate.getDay() + 6) % 7

  const { week, tasks } = useMemo(
    () => buildWeek(assignments, selectedDate, now),
    [assignments, selectedDate, now],
  )
  const insight = useMemo(() => weekInsight(tasks, week), [tasks, week])
  const sources = useMemo(
    () => buildSyncSources(syncedAt, loggedIn, syncError, now),
    [syncedAt, loggedIn, syncError, now],
  )

  const weekDiff = differenceInCalendarWeeks(selectedDate, now, { weekStartsOn: 1 })
  const weekSubtitle =
    weekDiff === 0
      ? "今週"
      : weekDiff === -1
        ? "先週"
        : weekDiff === 1
          ? "来週"
          : weekDiff < 0
            ? `${-weekDiff}週前`
            : `${weekDiff}週後`

  // section controls
  const [daySort, setDaySort] = useState<SortMode>("time")
  const [weekSort, setWeekSort] = useState<WeekSort>("date")

  // notifications / edit
  const [mutedIds, setMutedIds] = useState<string[]>([])
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    getNotificationSettings().then((s) => setMutedIds(s.mutedAssignments))
    getUnreadCount().then(setUnreadCount)
  }, [])

  const toggleMute = useCallback(async (id: string) => {
    const settings = await getNotificationSettings()
    const muted = settings.mutedAssignments.includes(id)
      ? settings.mutedAssignments.filter((x) => x !== id)
      : [...settings.mutedAssignments, id]
    await saveNotificationSettings({ mutedAssignments: muted })
    setMutedIds(muted)
  }, [])

  const handleEdit = useCallback(
    (id: string) => {
      const a = assignments.find((x) => x.id === id)
      if (a) setEditing(a)
    },
    [assignments],
  )

  const handleSaveEdit = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        console.error("[EDIT]", res.status, body)
        alert("保存に失敗しました")
        return
      }
      const { assignment } = await res.json()
      await applyEdit({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
      })
      setEditing(null)
    },
    [applyEdit],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("この課題を削除しますか？")) return
      const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 404) {
        alert("削除に失敗しました")
        return
      }
      removeAssignment(id)
    },
    [removeAssignment],
  )

  const actions: TaskActions = {
    loggedIn,
    mutedIds,
    onEdit: loggedIn ? handleEdit : undefined,
    onDelete: loggedIn ? handleDelete : undefined,
    onToggleMute: toggleMute,
  }

  // 週送り・日送りの共通ハンドラ（重複回避）
  const shiftDays = (n: number) => setSelectedDate((d) => addDays(d, n))

  // 選択日のタスク（週グラフの日クリック／日シェブロンで切替）。常に全件表示。
  const dayAll = useMemo(
    () => tasks.filter((t) => t.dayIndex === selectedIndex),
    [tasks, selectedIndex],
  )
  const dayTasks = useMemo(() => sortTasks(dayAll, daySort), [dayAll, daySort])

  // 今週のすべての課題（週カードの表示週と連動）
  const weekListTasks = useMemo(
    () => sortWeekTasks(tasks.filter((t) => t.dayIndex >= 0), weekSort),
    [tasks, weekSort],
  )

  const dayTitle = isSameDay(selectedDate, now)
    ? "今日"
    : format(selectedDate, "M/d（E）", { locale: ja })

  const sortOptions = [
    { value: "time" as const, label: "時刻順", icon: Clock },
    { value: "status" as const, label: "状態順", icon: CircleDot },
  ]
  const weekSortOptions = [
    { value: "date" as const, label: "日付順", icon: Clock },
    { value: "status" as const, label: "状態順", icon: CircleDot },
  ]

  // AIメッセージ欄：取得中／エラーはここに集約表示
  const insightState: { message: string; variant: "info" | "error" | "loading" } =
    loading && assignments.length === 0
      ? { message: "課題を取得中…", variant: "loading" }
      : error && assignments.length === 0
        ? { message: `取得に失敗しました：${error}`, variant: "error" }
        : { message: insight, variant: "info" }

  return (
    <>
      <AppHeader
        right={
          <>
            <SyncLamps sources={sources} />
            <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
            <RefreshControl busy={loading} onRefresh={refresh} />
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label={unreadCount > 0 ? `通知（未読${unreadCount}件）` : "通知"}
              className="relative flex items-center justify-center rounded-full p-1.5 text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="h-[15px] w-[15px]" aria-hidden />
              {unreadCount > 0 && (
                <span
                  className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: "var(--lamp-red)" }}
                  aria-hidden
                />
              )}
            </button>
            <Link
              href={loggedIn ? "/settings" : "/login"}
              aria-label={loggedIn ? "アカウント" : "ログイン"}
              className="flex items-center justify-center rounded-full p-1.5 text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <User className="h-[15px] w-[15px]" aria-hidden />
            </Link>
          </>
        }
      />

      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-24 pt-4">
        {syncError === "reauth_required" && (
          <div className="flex items-center justify-between gap-2 px-1 text-[12.5px]">
            <span className="text-destructive">Google 連携の期限が切れています。再ログインで更新できます。</span>
            <Link href="/login" className="shrink-0 font-medium text-destructive underline">
              再ログイン
            </Link>
          </div>
        )}

        <AiInsight message={insightState.message} variant={insightState.variant} />

        <NotificationBanner />

        {/* 週カレンダー＋「今日」を1つのカードに */}
        <div className="rounded-xl border border-border bg-card p-4">
          <WeeklyCard
            week={week}
            selectedDay={selectedIndex}
            onSelectDay={(i) => setSelectedDate(addDays(weekMonday, i))}
            onPrevWeek={() => shiftDays(-7)}
            onNextWeek={() => shiftDays(7)}
          />

          <div className="mt-5">
            <TaskTable
              title={dayTitle}
              tasks={dayTasks}
              actions={actions}
              emptyLabel="この日の課題はありません。"
              controls={
                <IconCycleToggle
                  ariaPrefix="並び替え"
                  options={sortOptions}
                  value={daySort}
                  onChange={setDaySort}
                />
              }
            />
          </div>
        </div>

        <TaskTable
          title={weekSubtitle}
          tasks={weekListTasks}
          actions={actions}
          showDate
          dense
          onPrev={() => shiftDays(-7)}
          onNext={() => shiftDays(7)}
          emptyLabel="この週の課題はありません。"
          controls={
            <IconCycleToggle
              ariaPrefix="並び替え"
              options={weekSortOptions}
              value={weekSort}
              onChange={setWeekSort}
            />
          }
        />

        <EditorialCard />

        {editing && (
          <EditAssignmentDialog
            assignment={editing}
            onSave={handleSaveEdit}
            onClose={() => setEditing(null)}
          />
        )}
      </main>

      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  )
}
