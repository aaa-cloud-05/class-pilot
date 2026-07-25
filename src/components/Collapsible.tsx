"use client"

import { useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** 汎用の折りたたみ。ガイドの章内で使う（見出しタップで開閉）。 */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <span className="text-[13.5px] font-medium text-foreground">{title}</span>
      </button>
      {open && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 border-t border-border px-4 py-3 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
