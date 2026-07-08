"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { startOfWeek, addDays, isSameDay, format, differenceInCalendarWeeks } from "date-fns"
import { ja } from "date-fns/locale"

import { useAssignments } from "@/hooks/useAssignments"
import { DashboardHeader } from "@/components/dashboard-header"
import { AiInsight } from "@/components/ai-insight"
import { WeeklyCard } from "@/components/weekly-card"
import { TaskTable, type TaskActions } from "@/components/task-table"
import { EditorialCard } from "@/components/editorial-card"
import { IconCycleToggle } from "@/components/quiet-controls"
import { Clock, CircleDot, List, ListFilter } from "lucide-react"
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
type DayScope = "all" | "active"

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

function sortTasks(tasks: Task[], mode: SortMode) {
  return [...tasks].sort((a, b) =>
    mode === "time"
      ? timeKey(a) - timeKey(b)
      : STATUS_RANK[a.status] - STATUS_RANK[b.status] || timeKey(a) - timeKey(b),
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

  // 表示する週 = 選択日を含む週
  const weekMonday = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])
  const selectedIndex = (selectedDate.getDay() + 6) % 7

  const { week, tasks } = useMemo(
    () => buildWeek(assignments, selectedDate, now),
    [assignments, selectedDate, now],
  )
  const sources = useMemo(
    () => buildSyncSources(syncedAt, loggedIn, syncError, now),
    [syncedAt, loggedIn, syncError, now],
  )
  const insight = useMemo(() => weekInsight(tasks, week), [tasks, week])

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

  const [mounted, setMounted] = useState(false)

  // section controls
  const [daySort, setDaySort] = useState<SortMode>("time")
  const [dayScope, setDayScope] = useState<DayScope>("active")
  const [pendingSort, setPendingSort] = useState<SortMode>("time")

  // notifications / edit
  const [mutedIds, setMutedIds] = useState<string[]>([])
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  // 選択日のタスク（週グラフの日クリック／日シェブロンで切替）
  const dayAll = useMemo(
    () => tasks.filter((t) => t.dayIndex === selectedIndex),
    [tasks, selectedIndex],
  )
  const dayTasks = useMemo(() => {
    const scoped = dayScope === "active" ? dayAll.filter((t) => t.status !== "submitted") : dayAll
    return sortTasks(scoped, daySort)
  }, [dayAll, dayScope, daySort])

  // 選択日の完了メーター（scopeで隠さず全件から集計）
  const dayMeter = useMemo(() => {
    const submitted = dayAll.filter((t) => t.status === "submitted").length
    const overdue = dayAll.filter((t) => t.status === "not-submitted").length
    return { submitted, overdue, pending: dayAll.length - submitted - overdue, total: dayAll.length }
  }, [dayAll])

  // 未提出の受け皿（全期間・提出済以外）。締切超過や他週・期限なしを隠さない。
  const pendingTasks = useMemo(
    () => sortTasks(tasks.filter((t) => t.status !== "submitted"), pendingSort),
    [tasks, pendingSort],
  )

  const dayTitle = isSameDay(selectedDate, now)
    ? "今日"
    : format(selectedDate, "M/d（E）", { locale: ja })

  const sortOptions = [
    { value: "time" as const, label: "時刻順", icon: Clock },
    { value: "status" as const, label: "状態順", icon: CircleDot },
  ]
  const scopeOptions = [
    { value: "active" as const, label: "未完のみ", icon: ListFilter },
    { value: "all" as const, label: "全部", icon: List },
  ]

  // AIメッセージ欄：取得中／エラーはここに集約表示
  const insightState: { message: string; variant: "info" | "error" | "loading" } =
    loading && assignments.length === 0
      ? { message: "課題を取得中…", variant: "loading" }
      : error && assignments.length === 0
        ? { message: `取得に失敗しました：${error}`, variant: "error" }
        : { message: insight, variant: "info" }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <DashboardHeader
        sources={sources}
        refreshing={loading}
        onRefresh={refresh}
        unreadCount={unreadCount}
        onOpenNotifications={() => setPanelOpen(true)}
      />

      {syncError === "reauth_required" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-foreground">
          <span>Google 連携の有効期限が切れています。再ログインで更新できます。</span>
          <Link href="/login" className="shrink-0 font-medium underline">
            再ログイン
          </Link>
        </div>
      )}

      <NotificationBanner />

      <AiInsight message={insightState.message} variant={insightState.variant} />

      <WeeklyCard
        week={week}
        subtitle={weekSubtitle}
        selectedDay={selectedIndex}
        onSelectDay={(i) => setSelectedDate(addDays(weekMonday, i))}
        onPrevWeek={() => setSelectedDate((d) => addDays(d, -7))}
        onNextWeek={() => setSelectedDate((d) => addDays(d, 7))}
        mounted={mounted}
      />

      <TaskTable
        title={dayTitle}
        tasks={dayTasks}
        actions={actions}
        meter={dayMeter}
        onPrev={() => setSelectedDate((d) => addDays(d, -1))}
        onNext={() => setSelectedDate((d) => addDays(d, 1))}
        emptyLabel={dayScope === "active" ? "この日にやることはありません。" : "この日の課題はありません。"}
        controls={
          <>
            <IconCycleToggle
              ariaPrefix="並び替え"
              options={sortOptions}
              value={daySort}
              onChange={setDaySort}
            />
            <IconCycleToggle
              ariaPrefix="表示範囲"
              options={scopeOptions}
              value={dayScope}
              onChange={setDayScope}
            />
          </>
        }
      />

      <TaskTable
        title="未提出"
        tasks={pendingTasks}
        actions={actions}
        dense
        emptyLabel="未提出はありません。よいペースです。"
        controls={
          <IconCycleToggle
            ariaPrefix="並び替え"
            options={sortOptions}
            value={pendingSort}
            onChange={setPendingSort}
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

      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </main>
  )
}
