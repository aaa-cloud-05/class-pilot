// 実データ(Assignment[]) → Cadence UI 型(Task/WeekModel/SyncSource) への変換（表示専用）。
// ここでは保存状態・同期・通知などのビジネスロジックは一切変更しない。
import { startOfWeek, startOfDay, addDays, isSameDay, isSameWeek, isBefore, formatDistanceToNowStrict } from "date-fns"
import { ja } from "date-fns/locale"
import type { Assignment } from "@/lib/types"
import { isSafeHttpUrl } from "@/lib/webclass"
import type {
  DayColumn,
  SyncFreshness,
  SyncSource,
  Task,
  TaskStatus,
  WeekModel,
} from "@/lib/dashboard-data"

// バーの積み順（下=提出済 → 上=未提出/超過）。段階フェッチで並びがブレないよう固定。
const STACK_RANK: Record<TaskStatus, number> = {
  submitted: 0,
  optional: 1,
  pending: 2,
  "not-submitted": 3,
}

/** 3状態(＋締切)→ 4トーンの表示ステータス。赤＝締切超過(現在時刻を過ぎた)の未提出のみ。 */
function statusFor(a: Assignment, now: Date): TaskStatus {
  if (a.submissionState === "submitted") return "submitted"
  if (a.submissionState === "unknown") return "optional"
  // not_submitted: 現在時刻を過ぎていれば締切超過(赤)、まだなら締切前(橙)
  if (a.dueDate && a.dueDate.getTime() < now.getTime()) return "not-submitted"
  return "pending"
}

function deadlineLabel(due: Date | null): string {
  if (!due) return "期限なし"
  const hh = String(due.getHours()).padStart(2, "0")
  const mm = String(due.getMinutes()).padStart(2, "0")
  return `${due.getMonth() + 1}/${due.getDate()} · ${hh}:${mm}`
}

/**
 * weekBase = 表示する週（どの週を出すか）／ now = 実際の今日（isToday・締切超過の基準）。
 * 週送りしても「今日」「超過」の判定は now に基づき、正しく保たれる。
 */
export function buildWeek(
  assignments: Assignment[],
  weekBase: Date,
  now: Date,
): { week: WeekModel; tasks: Task[] } {
  const monday = startOfWeek(weekBase, { weekStartsOn: 1 })
  const sunday = addDays(monday, 6)
  const todayStart = startOfDay(now)

  // 週内の各日インデックス（月=0..日=6）。週外・期限なしは -1。
  const dayIndexOf = (due: Date | null): number => {
    if (!due) return -1
    for (let i = 0; i < 7; i++) {
      if (isSameDay(due, addDays(monday, i))) return i
    }
    return -1
  }

  const tasks: Task[] = assignments.map((a) => ({
    id: a.id,
    name: a.title,
    subject: a.courseName,
    deadline: deadlineLabel(a.dueDate),
    status: statusFor(a, now),
    href: a.link && isSafeHttpUrl(a.link) ? a.link : null,
    dayIndex: dayIndexOf(a.dueDate),
  }))

  const days: DayColumn[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const blocks = tasks
      .filter((t) => t.dayIndex === i)
      .sort((a, b) => STACK_RANK[a.status] - STACK_RANK[b.status])
      .map((t) => ({ id: t.id, status: t.status }))
    return {
      index: i,
      dateNum: date.getDate(),
      isToday: isSameDay(date, now),
      isPast: isBefore(date, todayStart),
      blocks,
    }
  })

  const weekTasks = tasks.filter((t) => t.dayIndex >= 0)
  const totalTasks = weekTasks.length
  const doneTasks = weekTasks.filter((t) => t.status === "submitted").length
  const overdueTasks = weekTasks.filter((t) => t.status === "not-submitted").length

  const elapsedMs = now.getTime() - monday.getTime()
  const totalMs = 7 * 24 * 60 * 60 * 1000
  const timeProgress = Math.min(1, Math.max(0, elapsedMs / totalMs))

  const rangeLabel = `${monday.getMonth() + 1}/${monday.getDate()}–${sunday.getMonth() + 1}/${sunday.getDate()}`

  const week: WeekModel = {
    rangeLabel,
    todayLabel: `${now.getMonth() + 1}/${now.getDate()}`,
    days,
    timeProgress,
    doneProgress: totalTasks ? doneTasks / totalTasks : 0,
    overdueProgress: totalTasks ? overdueTasks / totalTasks : 0,
    totalTasks,
    doneTasks,
    overdueCount: overdueTasks,
    isCurrentWeek: isSameWeek(weekBase, now, { weekStartsOn: 1 }),
  }

  return { week, tasks }
}

function freshnessOf(date: Date | null, base: Date): SyncFreshness {
  if (!date) return "unknown"
  const age = base.getTime() - date.getTime()
  if (age < 6 * 60 * 60 * 1000) return "fresh"
  if (age < 24 * 60 * 60 * 1000) return "aging"
  return "stale"
}

function rel(date: Date | null): string {
  if (!date) return "未取得"
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: ja })
}

/** Classroom の状態は Google 同期の成否(syncError)を優先して反映（旧 SyncStatus と同等）。 */
function classroomSource(
  classroom: Date | null,
  loggedIn: boolean,
  syncError: string | null,
  base: Date,
): SyncSource {
  if (!loggedIn) {
    return { id: "classroom", label: "Classroom", freshness: "unknown", detail: "Classroom · 未ログイン" }
  }
  if (syncError === "reauth_required") {
    return { id: "classroom", label: "Classroom", freshness: "aging", detail: "Classroom · 要再ログイン" }
  }
  if (syncError === "sync_failed" || syncError === "no_access_token") {
    return { id: "classroom", label: "Classroom", freshness: "stale", detail: "Classroom · 同期に失敗" }
  }
  return {
    id: "classroom",
    label: "Classroom",
    freshness: freshnessOf(classroom, base),
    detail: `Classroom · ${rel(classroom)}`,
  }
}

export function buildSyncSources(
  syncedAt: { classroom: Date | null; webclass: Date | null },
  loggedIn: boolean,
  syncError: string | null,
  base: Date,
): SyncSource[] {
  return [
    {
      id: "webclass",
      label: "WebClass",
      freshness: freshnessOf(syncedAt.webclass, base),
      detail: `WebClass · ${rel(syncedAt.webclass)}`,
    },
    classroomSource(syncedAt.classroom, loggedIn, syncError, base),
  ]
}

/** 落ち着いた一行サマリ（AiInsight 用）。 */
export function weekInsight(tasks: Task[], week: WeekModel): string {
  if (week.totalTasks === 0) return "今週の課題はありません。静かな一週間を。"
  const overdue = tasks.filter((t) => t.status === "not-submitted").length
  if (overdue > 0) return `締切を過ぎた課題が${overdue}件。まず1つ片づけましょう。`
  const remaining = week.totalTasks - week.doneTasks
  if (remaining === 0) return "今週の提出は完了。よいペースです。"
  return `今週の残りは${remaining}件。小さいものから始めましょう。`
}
