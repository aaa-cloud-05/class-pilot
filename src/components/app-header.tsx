import Image from "next/image"
import Link from "next/link"

/**
 * 全ページ共通のミニマルヘッダー（左にロゴ＋ワードマーク、sticky）。
 * `right` を渡すと右側に操作（更新・通知など）を置ける（主にホーム用）。
 */
export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          href="/"
          aria-label="UnionFetch ホームへ"
          className="flex items-center gap-2 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={28}
            height={28}
            loading="eager"
            className="h-7 w-7 shrink-0"
          />
          <span className="font-brand text-[19px] font-bold leading-none tracking-[-0.02em] text-foreground">
            UnionFetch
          </span>
        </Link>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  )
}
