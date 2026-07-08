"use client"

import type { WeekModel } from "@/lib/dashboard-data"

export function ProgressRace({ week, mounted }: { week: WeekModel; mounted: boolean }) {
  const done = Math.round(week.doneProgress * 100)
  const overdue = Math.round(week.overdueProgress * 100)

  const trans = "width 900ms cubic-bezier(0.22,1,0.36,1) 350ms"

  return (
    <div className="flex flex-col gap-3">
      {/* completion progress with restrained overdue segment */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-2 flex-1 overflow-hidden rounded-full bg-track">
          <div
            className="h-full rounded-l-full"
            style={{
              width: mounted ? `${done}%` : "0%",
              backgroundColor: "var(--foreground)",
              transition: trans,
            }}
          />
          <div
            className="h-full"
            style={{
              width: mounted ? `${overdue}%` : "0%",
              backgroundColor: "var(--lamp-red)",
              transition: trans,
            }}
          />
        </div>
        <span className="w-16 shrink-0 font-mono text-[11px] text-foreground">完了 {done}%</span>
      </div>
    </div>
  )
}
