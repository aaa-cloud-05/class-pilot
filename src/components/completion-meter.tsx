"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * 数値の分数 + 極小3セグメントのドーナツ（提出/未提出/超過）。
 * 数値はドーナツの外。凡例なし。ホバー/タップで内訳を小さく表示。
 * 色は抑制的（提出＝foreground、未提出＝薄グレー、超過＝赤の小セグメント）。
 */
export function CompletionMeter({
  submitted,
  pending,
  overdue,
  total,
  className,
}: {
  submitted: number
  pending: number
  overdue: number
  total: number
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const r = 6
  const C = 2 * Math.PI * r
  const denom = total || 1
  const doneLen = (submitted / denom) * C
  const pendLen = (pending / denom) * C
  const overLen = (overdue / denom) * C

  return (
    <div
      className={cn("relative flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`提出${submitted}・未提出${pending}・超過${overdue}（全${total}）`}
        className="flex items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {submitted} / {total}
        </span>
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
          <g transform="rotate(-90 8 8)">
            <circle cx="8" cy="8" r={r} fill="none" stroke="var(--track)" strokeWidth="3" />
            {total > 0 && (
              <>
                <circle
                  cx="8"
                  cy="8"
                  r={r}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeWidth="3"
                  strokeDasharray={`${doneLen} ${C}`}
                  strokeDashoffset={0}
                />
                <circle
                  cx="8"
                  cy="8"
                  r={r}
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeOpacity="0.35"
                  strokeWidth="3"
                  strokeDasharray={`${pendLen} ${C}`}
                  strokeDashoffset={-doneLen}
                />
                <circle
                  cx="8"
                  cy="8"
                  r={r}
                  fill="none"
                  stroke="var(--lamp-red)"
                  strokeWidth="3"
                  strokeDasharray={`${overLen} ${C}`}
                  strokeDashoffset={-(doneLen + pendLen)}
                />
              </>
            )}
          </g>
        </svg>
      </button>

      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-mono text-[11px] text-popover-foreground shadow-md transition-all duration-150",
          open ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0",
        )}
      >
        提出{submitted} · 未提出{pending} · 超過{overdue}
      </div>
    </div>
  )
}
