"use client"

import { RefreshCw, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 単一アイコンのサイクルトグル。押すたびに次の選択肢へ循環し、
 * アイコンは現在のモードを表す（凡例なし・静か）。
 */
export function IconCycleToggle<T extends string>({
  options,
  value,
  onChange,
  ariaPrefix,
}: {
  options: { value: T; label: string; icon: LucideIcon }[]
  value: T
  onChange: (v: T) => void
  ariaPrefix: string
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const cur = options[idx]
  const next = options[(idx + 1) % options.length]
  const Icon = cur.icon

  return (
    <button
      type="button"
      onClick={() => onChange(next.value)}
      aria-label={`${ariaPrefix}：${cur.label}（押すと${next.label}）`}
      title={`${ariaPrefix}：${cur.label}`}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}

const BTN =
  "flex items-center justify-center rounded-full p-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"

/** Manual refresh: a compact sync-spark that pings when triggered. */
export function RefreshControl({
  busy,
  onRefresh,
}: {
  busy: boolean
  onRefresh: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={busy}
      aria-label="同期を更新"
      className={cn(BTN, "text-muted-foreground/70 hover:text-foreground disabled:opacity-100")}
    >
      <RefreshCw
        className={cn("h-[17px] w-[17px]", busy && "animate-spin")}
        strokeWidth={1.8}
        aria-hidden
      />
    </button>
  )
}
