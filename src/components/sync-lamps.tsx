"use client"

import { useEffect, useRef, useState } from "react"
import { Lamp } from "@/components/lamp"
import { toneForFreshness } from "@/lib/lamp"
import { getWebclassUrl } from "@/lib/webclass-url"
import type { SyncSource } from "@/lib/dashboard-data"

function SyncLamp({ source, url }: { source: SyncSource; url: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tone = toneForFreshness(source.freshness)

  // タップで開いたら外側クリック / Esc で閉じる（持続表示のため）
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const chipClass =
    "absolute right-0 top-full z-30 mt-1 flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 font-mono text-[11px] text-popover-foreground shadow-md"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={source.detail}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full p-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Lamp tone={tone} size="lg" pulse />
      </button>

      {open &&
        (url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={`${chipClass} overflow-hidden outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <span className="relative">{source.detail}</span>
            {/* キラッと：光の帯が横切る */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              style={{ animation: "chip-shine 2.8s ease-out infinite" }}
            />
          </a>
        ) : (
          <div className={chipClass}>{source.detail}</div>
        ))}
    </div>
  )
}

/** 同期元 → 遷移先URL。Classroom は公開URL、WebClass はユーザー設定（未設定なら非遷移）。 */
function useSourceUrl(id: string): string | null {
  const [webclassUrl, setWebclassUrl] = useState<string | null>(null)
  useEffect(() => {
    // localStorage 依存のため、クライアントマウント後に解決
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebclassUrl(getWebclassUrl())
  }, [])
  if (id === "classroom") return "https://classroom.google.com"
  if (id === "webclass") return webclassUrl
  return null
}

function SyncLampWithUrl({ source }: { source: SyncSource }) {
  const url = useSourceUrl(source.id)
  return <SyncLamp source={source} url={url} />
}

export function SyncLamps({ sources }: { sources: SyncSource[] }) {
  return (
    <div className="flex items-center gap-0.5" aria-label="LMS sync status">
      {sources.map((s) => (
        <SyncLampWithUrl key={s.id} source={s} />
      ))}
    </div>
  )
}
