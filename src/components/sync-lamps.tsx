"use client"

import { useState } from "react"
import { Lamp } from "@/components/lamp"
import { toneForFreshness } from "@/lib/lamp"
import type { SyncSource } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function SyncLamp({ source }: { source: SyncSource }) {
  const [open, setOpen] = useState(false)
  const tone = toneForFreshness(source.freshness)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={source.detail}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full p-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Lamp tone={tone} size="md" pulse />
      </button>
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-mono text-[11px] text-popover-foreground shadow-md transition-all duration-150",
          open ? "translate-y-0 opacity-100" : "-translate-y-0.5 opacity-0",
        )}
      >
        {source.detail}
      </div>
    </div>
  )
}

export function SyncLamps({ sources }: { sources: SyncSource[] }) {
  return (
    <div className="flex items-center gap-0.5" aria-label="LMS sync status">
      {sources.map((s) => (
        <SyncLamp key={s.id} source={s} />
      ))}
    </div>
  )
}
