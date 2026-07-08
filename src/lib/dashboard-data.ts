// Cadence（週次コンソール）UI の表示用データ型。
// 実データ(Assignment[])→これらの型への変換は lib/week-adapter.ts が担う（ビジネスロジックは不変）。

export type TaskStatus = "submitted" | "pending" | "not-submitted" | "optional"

export type Task = {
  id: string
  name: string
  subject: string
  deadline: string
  status: TaskStatus
  /** 元課題リンク（安全なhttp(s)のみ）。開く操作に使用 */
  href?: string | null
  /** 0 = 月 ... 6 = 日。今週外/期限なしは -1 */
  dayIndex: number
}

export type SyncFreshness = "fresh" | "aging" | "stale"

export type SyncSource = {
  id: string
  label: string
  freshness: SyncFreshness
  detail: string
}

export type DayColumn = {
  index: number
  dateNum: number
  isToday: boolean
  isPast: boolean
  /** one entry per task on that day */
  blocks: { id: string; status: TaskStatus }[]
}

export type WeekModel = {
  rangeLabel: string
  todayLabel: string
  days: DayColumn[]
  timeProgress: number
  doneProgress: number
  overdueProgress: number
  totalTasks: number
  doneTasks: number
  overdueCount: number
  /** 表示中の週が現在の週か（サブラベル表示用） */
  isCurrentWeek: boolean
}
