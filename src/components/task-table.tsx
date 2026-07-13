"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { Lamp } from "@/components/lamp"
import { STATUS_LABEL, toneForStatus, type LampTone } from "@/lib/lamp"
import type { Task, TaskStatus } from "@/lib/dashboard-data"
import type { SubmissionState } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface TaskActions {
  /** 行タップで詳細カードを開く */
  onView: (id: string) => void
  /** ランプから提出状況を直接変更（未ログイン時は undefined＝編集不可） */
  onSetSubmission?: (id: string, state: SubmissionState) => void
}

/** 表示ステータス → 提出状態（編集対象）。pending/超過はどちらも未提出。 */
function stateOf(status: TaskStatus): SubmissionState {
  if (status === "submitted") return "submitted"
  if (status === "optional") return "unknown"
  return "not_submitted"
}

// ランプタップで開く選択肢。真上(0°)・+120°・-120° に配置。
const SATELLITES: { state: SubmissionState; tone: LampTone; label: string; angle: number }[] = [
  { state: "submitted", tone: "green", label: "提出済", angle: 0 },
  { state: "not_submitted", tone: "amber", label: "未提出", angle: 120 },
  { state: "unknown", tone: "muted", label: "不明", angle: -120 },
]

const RADIUS = 30

function offsetOf(angleDeg: number) {
  const r = (angleDeg * Math.PI) / 180
  return { dx: RADIUS * Math.sin(r), dy: -RADIUS * Math.cos(r) }
}

/** ランプ（提出状況）。ログイン時はタップで放射状の状態ピッカーを開く。 */
function LampControl({ task, onSetSubmission }: { task: Task; onSetSubmission?: TaskActions["onSetSubmission"] }) {
  const [open, setOpen] = useState(false)
  const tone = toneForStatus(task.status)
  const current = stateOf(task.status)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const lamp = <Lamp tone={tone} size="sm" pulse={task.status === "pending"} />

  if (!onSetSubmission) {
    return (
      <div className="flex w-4 shrink-0 justify-center" title={STATUS_LABEL[task.status]}>
        {lamp}
      </div>
    )
  }

  return (
    <div className="relative flex w-4 shrink-0 justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="提出状況を変更"
        aria-expanded={open}
        title={STATUS_LABEL[task.status]}
        className="flex items-center justify-center rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lamp}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-1/2 top-1/2 z-50">
            {SATELLITES.map((o, i) => {
              const { dx, dy } = offsetOf(o.angle)
              const isCurrent = o.state === current
              return (
                <div
                  key={o.state}
                  className="absolute left-0 top-0"
                  style={{
                    // 中心から到達点(--dx/--dy)へシュッと飛び出す
                    "--dx": `${dx}px`,
                    "--dy": `${dy}px`,
                    animation: `lamp-fly 240ms cubic-bezier(0.22,1,0.36,1) ${i * 45}ms both`,
                  } as CSSProperties}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSetSubmission(task.id, o.state)
                      setOpen(false)
                    }}
                    aria-label={o.label}
                    title={o.label}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border border-border bg-popover shadow-md outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent && "ring-2 ring-ring",
                    )}
                  >
                    <Lamp tone={o.tone} size="md" glow={false} />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TaskRow({ task, actions, showDate }: { task: Task; actions: TaskActions; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/40">
      <LampControl task={task} onSetSubmission={actions.onSetSubmission} />
      <button
        type="button"
        onClick={() => actions.onView(task.id)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium leading-tight text-foreground">{task.name}</p>
          <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{task.subject}</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {showDate ? task.deadline : (task.deadline.split(" · ")[1] ?? task.deadline)}
        </span>
      </button>
    </div>
  )
}

/** リスト本体のみ（見出しは各セクション側で組む）。本文タップで詳細カード、ランプで状態編集。 */
export function TaskTable({
  tasks,
  actions,
  emptyLabel = "ここには何もありません。",
  showDate,
}: {
  tasks: Task[]
  actions: TaskActions
  emptyLabel?: string
  showDate?: boolean
}) {
  if (tasks.length === 0) {
    return <p className="px-1 py-6 text-center text-[12.5px] text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskRow task={t} actions={actions} showDate={showDate} />
        </li>
      ))}
    </ul>
  )
}
