"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// ルート → ヘッダー右のパス表記
const SEGMENT: Record<string, string> = {
  "/": "home",
  "/docs": "docs",
  "/me": "me",
}

/**
 * 全ページ共通のミニマルヘッダー（左のブランド＋現在ルート、sticky）。
 * `right` を渡すと右側に操作（更新・通知など）を置ける（主にホーム用）。
 */
export function AppHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname()
  const seg = SEGMENT[pathname] ?? (pathname.replace(/^\//, "").split("/")[0] || "home")

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-baseline gap-1.5">
          <Link
            href="/"
            aria-label="ホームへ"
            className="rounded-md text-[17px] font-semibold tracking-tight text-foreground outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Class Pilot
          </Link>
          <span className="font-mono text-[12px] text-muted-foreground">/{seg}</span>
        </div>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  )
}
