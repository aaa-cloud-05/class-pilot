"use client"

import { useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

// r=6 の円周。各セグメントは角度(rotate)で開始位置を決め、dashoffsetアニメで時計回りに描く。
const R = 6
const C = 2 * Math.PI * R
const DURATION = 620 // ぐるっと一周ぶんの総時間(ms)

/**
 * 数値の分数 + 極小3セグメントのドーナツ（提出/未提出/超過）。
 * 数値はドーナツの外。凡例なし。ホバー/タップで内訳。
 * 提出＝緑、未提出＝薄グレー、超過＝赤の小セグメント。マウント時に「ぐるっと」描画。
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

  const denom = total || 1
  const segs = [
    { key: "done", color: "var(--lamp-green)", frac: submitted / denom },
    { key: "pending", color: "var(--muted-foreground)", opacity: 0.35, frac: pending / denom },
    { key: "overdue", color: "var(--lamp-red)", frac: overdue / denom },
  ]

  // 各セグメントの開始位置(累積)を計算
  let acc = 0
  const arcs = segs.map((s) => {
    const start = acc
    acc += s.frac
    const len = s.frac * C
    return { ...s, startFrac: start, len }
  })

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
          <circle cx="8" cy="8" r={R} fill="none" stroke="var(--track)" strokeWidth="3" />
          {total > 0 &&
            arcs.map((a) =>
              a.len <= 0 ? null : (
                <circle
                  key={a.key}
                  cx="8"
                  cy="8"
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeOpacity={a.opacity ?? 1}
                  strokeWidth="3"
                  strokeDasharray={`${a.len} ${C}`}
                  transform={`rotate(${-90 + a.startFrac * 360} 8 8)`}
                  style={
                    {
                      "--sl": `${a.len}`,
                      animation: `donut-sweep ${DURATION}ms cubic-bezier(0.22,1,0.36,1) ${Math.round(a.startFrac * DURATION)}ms both`,
                    } as CSSProperties
                  }
                />
              ),
            )}
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
