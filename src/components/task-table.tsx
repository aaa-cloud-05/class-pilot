"use client"

import { useEffect, useRef, useState } from "react"
import { MoreVertical } from "lucide-react"
import { Lamp } from "@/components/lamp"
import { STATUS_LABEL, toneForStatus } from "@/lib/lamp"
import type { Task } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

export interface TaskActions {
  loggedIn: boolean
  mutedIds: string[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onToggleMute: (id: string) => void
}

function RowActions({ task, actions }: { task: Task; actions: TaskActions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const muted = actions.mutedIds.includes(task.id)

  const items: { label: string; onClick: () => void; danger?: boolean }[] = []
  if (task.href) {
    items.push({ label: "開く", onClick: () => window.open(task.href!, "_blank", "noopener,noreferrer") })
  }
  if (actions.loggedIn && actions.onEdit) {
    items.push({ label: "編集", onClick: () => actions.onEdit!(task.id) })
  }
  items.push({ label: muted ? "通知をオン" : "通知をオフ", onClick: () => actions.onToggleMute(task.id) })
  if (actions.loggedIn && actions.onDelete) {
    items.push({ label: "削除", onClick: () => actions.onDelete!(task.id), danger: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${task.name} の操作`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-36 overflow-hidden rounded-lg border border-border bg-popover py-1 text-[13px] shadow-md">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                it.onClick()
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-left transition-colors hover:bg-muted",
                it.danger ? "text-destructive" : "text-popover-foreground",
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, actions, showDate }: { task: Task; actions: TaskActions; showDate?: boolean }) {
  const tone = toneForStatus(task.status)
  return (
    <div className="flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex w-4 shrink-0 justify-center" title={STATUS_LABEL[task.status]}>
        <Lamp tone={tone} size="sm" pulse={task.status === "pending"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium leading-tight text-foreground">{task.name}</p>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{task.subject}</p>
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {showDate ? task.deadline : (task.deadline.split(" · ")[1] ?? task.deadline)}
      </span>
      <RowActions task={task} actions={actions} />
    </div>
  )
}

/** リスト本体のみ（見出しは各セクション側で組む）。 */
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
