"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { startOfWeek, addDays, isSameDay, format, differenceInCalendarWeeks } from "date-fns"
import { ja } from "date-fns/locale"
import { Bell, User, Maximize2, Minimize2, ChartNoAxesGantt, ChevronRight } from "lucide-react"

import { useAssignments } from "@/hooks/useAssignments"
import { AppHeader } from "@/components/app-header"
import { SyncLamps } from "@/components/sync-lamps"
import { AiInsight } from "@/components/ai-insight"
import { WeeklyCard } from "@/components/weekly-card"
import { MonthGrid } from "@/components/MonthGrid"
import { TaskTable, type TaskActions } from "@/components/task-table"
import { EditorialCard } from "@/components/editorial-card"
import { RefreshControl } from "@/components/quiet-controls"
import { NotificationBanner } from "@/components/NotificationBanner"
import { NotificationPanel } from "@/components/NotificationPanel"
import { AssignmentDetailCard } from "@/components/AssignmentDetailCard"
import { buildWeek, buildSyncSources, weekInsight } from "@/lib/week-adapter"
import type { Task } from "@/lib/dashboard-data"
import type { Assignment } from "@/lib/types"
import { cn } from "@/lib/utils"
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

/** 既定で閉じたアコーディオン節（期限なし・全件などの補助リスト用）。
 *  action は開いている時のみ見出し右に出す（並び替えなどの操作用。ボタン入れ子回避のため toggle とは兄弟）。 */
function CollapsibleSection({
  title,
  count,
  action,
  children,
  defaultOpen = false,
}: {
  title: string
  count: number
  action?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1 rounded-md px-1 py-1.5 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              open && "rotate-90",
            )}
            aria-hidden
          />
          <span className="text-[13px] font-medium text-card-foreground">{title}</span>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {count}
          </span>
        </button>
        {open && action}
      </div>
      {open && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">{children}</div>
      )}
    </div>
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

  // 「今日」の基準時刻。SSR/静的化で古い日付が焼き付く・タブを開いたまま日付をまたぐと
  // 今日の位置がずれるため、クライアントで最新化し、深夜またぎとフォーカス時に更新する。
  const [now, setNow] = useState(() => new Date())
  // 選択中の日付（週カード・今日セクションの唯一の基準）。既定は今日。
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  // クライアントでマウント済みか。SSR時点の（サーバTZの）今日を焼き付けないためのゲート。
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // マウント後にクライアントの現在時刻へ確定（既定選択日も今日に揃える）
    const fresh = new Date()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(fresh)
    setMounted(true)
    setSelectedDate((d) => (isSameDay(d, fresh) ? d : fresh))
    const onFocus = () => setNow(new Date())
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])
  useEffect(() => {
    // 次のローカル深夜に再セット（now が変わるたび次の深夜を張り直す）
    const n = new Date()
    const nextMidnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5)
    const t = setTimeout(() => setNow(new Date()), nextMidnight.getTime() - n.getTime())
    return () => clearTimeout(t)
  }, [now])

  const weekMonday = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate])
  const selectedIndex = (selectedDate.getDay() + 6) % 7

  // 今日の列インデックス（表示週内にあれば0..6、なければ-1）。
  // マウント後のみ有効化（SSR時点のサーバTZの今日を焼き付けない）。now は
  // マウント時/深夜またぎ/フォーカスでクライアント現在時刻に更新される。
  const todayIndex = useMemo(() => {
    if (!mounted) return -1
    for (let i = 0; i < 7; i++) if (isSameDay(addDays(weekMonday, i), now)) return i
    return -1
  }, [mounted, weekMonday, now])

  const weekDiff = differenceInCalendarWeeks(selectedDate, now, { weekStartsOn: 1 })
  const weekSubtitle =
    weekDiff === 0
      ? "今週"
      : weekDiff === 1
        ? "来週"
        : weekDiff === -1
          ? "先週"
          : weekDiff > 0
            ? `${weekDiff}週間後`
            : `${-weekDiff}週間前`

  const { week, tasks } = useMemo(
    () => buildWeek(assignments, selectedDate, now),
    [assignments, selectedDate, now],
  )
  const insight = useMemo(() => weekInsight(tasks, week), [tasks, week])
  const sources = useMemo(
    () => buildSyncSources(syncedAt, loggedIn, syncError, now),
    [syncedAt, loggedIn, syncError, now],
  )

  // section controls
  const [calView, setCalView] = useState<"week" | "month">("week")
  const [weekSort, setWeekSort] = useState<WeekSort>("date")
  const [allSort, setAllSort] = useState<WeekSort>("date")

  // notifications / detail
  const [mutedIds, setMutedIds] = useState<string[]>([])
  const [viewing, setViewing] = useState<Assignment | null>(null)
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

  // カード内インライン編集の保存。失敗時は throw してカードを編集状態のまま残す。
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
        throw new Error("save_failed")
      }
      const { assignment } = await res.json()
      await applyEdit({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
      })
    },
    [applyEdit],
  )

  // ランプからの提出状況変更：楽観的更新（即反映→サーバ確定/失敗時ロールバック）。
  const handleSetSubmission = useCallback(
    (current: Assignment, submissionState: Assignment["submissionState"]) => {
      if (current.submissionState === submissionState) return
      applyEdit({ ...current, submissionState }) // 楽観的に即反映
      handleSaveEdit(current.id, { submissionState }).catch(() => {
        applyEdit(current) // 失敗したら元に戻す
        alert("変更に失敗しました")
      })
    },
    [applyEdit, handleSaveEdit],
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

  // id→Assignment（詳細カード表示・期限有無の分類に使用）。並び順は assignments の決定的順を踏襲。
  const assignmentById = useMemo(() => {
    const m = new Map<string, Assignment>()
    for (const a of assignments) m.set(a.id, a)
    return m
  }, [assignments])

  // 行タップ＝詳細カードを開く（編集/開く/通知/削除はカード側で操作）。
  // ランプタップ＝提出状況を直接変更（ログイン時のみ）。
  const actions: TaskActions = {
    onView: (id) => {
      const a = assignmentById.get(id)
      if (a) setViewing(a)
    },
    onSetSubmission: loggedIn
      ? (id, submissionState) => {
          const current = assignmentById.get(id)
          if (current) handleSetSubmission(current, submissionState)
        }
      : undefined,
  }

  // 週送り・日送りの共通ハンドラ（重複回避）
  const shiftDays = (n: number) => setSelectedDate((d) => addDays(d, n))

  // 選択日のタスク（週グラフの日クリック／日シェブロンで切替）。常に全件表示。
  const dayAll = useMemo(
    () => tasks.filter((t) => t.dayIndex === selectedIndex),
    [tasks, selectedIndex],
  )
  const dayTasks = useMemo(() => sortTasks(dayAll, "time"), [dayAll])

  // 今週のすべての課題（週カードの表示週と連動）
  const weekListTasks = useMemo(
    () => sortWeekTasks(tasks.filter((t) => t.dayIndex >= 0), weekSort),
    [tasks, weekSort],
  )

  // 期限なし かつ 未提出
  const noDueTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const a = assignmentById.get(t.id)
        return a != null && a.dueDate == null && t.status !== "submitted"
      }),
    [tasks, assignmentById],
  )

  // すべての課題（今週セクションと同様に 日付順／状態順 を切替）。id タイブレークで並びを固定。
  const allTasks = useMemo(() => {
    const dueMs = (t: Task) => {
      const d = assignmentById.get(t.id)?.dueDate
      return d ? d.getTime() : Number.POSITIVE_INFINITY // 期限なしは末尾
    }
    return [...tasks].sort((a, b) => {
      if (allSort === "status") {
        const s = STATUS_RANK[a.status] - STATUS_RANK[b.status]
        if (s !== 0) return s
      }
      const da = dueMs(a)
      const db = dueMs(b)
      if (da !== db) return da - db
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
  }, [tasks, allSort, assignmentById])

  const dayTitle = isSameDay(selectedDate, now)
    ? "今日"
    : format(selectedDate, "M/d（E）", { locale: ja })

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
              <Bell className="h-[17px] w-[17px]" aria-hidden />
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
              <User className="h-[17px] w-[17px]" aria-hidden />
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

        {/* 週/月カレンダー＋「今日」を1つのカードに */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div key={calView} className="animate-in fade-in-0 slide-in-from-top-1 duration-300">
            {calView === "week" ? (
              <WeeklyCard
                week={week}
                selectedDay={selectedIndex}
                todayIndex={todayIndex}
                onSelectDay={(i) => setSelectedDate(addDays(weekMonday, i))}
                onPrevWeek={() => shiftDays(-7)}
                onNextWeek={() => shiftDays(7)}
                toggle={
                  <button
                    type="button"
                    onClick={() => setCalView("month")}
                    aria-label="月表示に切替"
                    className="flex items-center justify-center rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Maximize2 className="h-4 w-4 animate-in zoom-in-50 fade-in-0 duration-300" aria-hidden />
                  </button>
                }
              />
            ) : (
              <MonthGrid
                assignments={assignments}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                toggle={
                  <button
                    type="button"
                    onClick={() => setCalView("week")}
                    aria-label="週表示に切替"
                    className="flex items-center justify-center rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Minimize2 className="h-4 w-4 animate-in zoom-in-50 fade-in-0 duration-300" aria-hidden />
                  </button>
                }
              />
            )}
          </div>

          {/* 今日：見出し＋タスク総数のみ */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
              <h2 className="text-[13px] font-medium text-card-foreground">{dayTitle}</h2>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {dayAll.length}
              </span>
            </div>
            <TaskTable tasks={dayTasks} actions={actions} emptyLabel="この日の課題はありません。" />
          </div>
        </div>

        {/* 今週：左に週ラベル、右に並び替えアイコン */}
        <div>
          <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
            <h2 className="text-[13px] font-medium text-card-foreground">{weekSubtitle}</h2>
            <button
              key={weekSort}
              type="button"
              onClick={() => setWeekSort(weekSort === "date" ? "status" : "date")}
              aria-label={`並び替え：${weekSort === "date" ? "日付順" : "状態順"}`}
              title={`並び替え：${weekSort === "date" ? "日付順" : "状態順"}`}
              className="flex animate-in fade-in-0 items-center justify-center rounded-md p-1 text-muted-foreground outline-none duration-300 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChartNoAxesGantt className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <TaskTable tasks={weekListTasks} actions={actions} showDate emptyLabel="この週の課題はありません。" />
        </div>

        {/* 期限なしの未提出課題（既定で閉じる） */}
        {noDueTasks.length > 0 && (
          <CollapsibleSection title="期限なしの未提出課題" count={noDueTasks.length}>
            <TaskTable tasks={noDueTasks} actions={actions} emptyLabel="期限なしの課題はありません。" />
          </CollapsibleSection>
        )}

        {/* すべての課題（既定で閉じる・日付順／状態順で絞り込み） */}
        {allTasks.length > 0 && (
          <CollapsibleSection
            title="すべての課題"
            count={allTasks.length}
            action={
              <button
                key={allSort}
                type="button"
                onClick={() => setAllSort(allSort === "date" ? "status" : "date")}
                aria-label={`並び替え：${allSort === "date" ? "日付順" : "状態順"}`}
                title={`並び替え：${allSort === "date" ? "日付順" : "状態順"}`}
                className="flex animate-in fade-in-0 items-center justify-center rounded-md p-1 text-muted-foreground outline-none duration-300 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChartNoAxesGantt className="h-4 w-4" aria-hidden />
              </button>
            }
          >
            <TaskTable tasks={allTasks} actions={actions} showDate emptyLabel="課題はありません。" />
          </CollapsibleSection>
        )}

        <EditorialCard />

        {viewing && (
          <AssignmentDetailCard
            key={viewing.id}
            assignment={viewing}
            loggedIn={loggedIn}
            muted={mutedIds.includes(viewing.id)}
            onSave={handleSaveEdit}
            onToggleMute={toggleMute}
            onDelete={(id) => {
              setViewing(null)
              handleDelete(id)
            }}
            onClose={() => setViewing(null)}
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
