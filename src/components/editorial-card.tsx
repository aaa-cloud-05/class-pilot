import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function EditorialCard() {
  return (
    <Link
      href="/import"
      aria-label="使い方：WebClass をつなぐ"
      className="group relative block overflow-hidden rounded-2xl border border-border shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
    >
      <img
        src="/editorial-ink.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* soft atmospheric gradient so text stays legible without dominating */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklch, var(--background) 82%, transparent) 0%, color-mix(in oklch, var(--background) 55%, transparent) 55%, transparent 100%)",
        }}
      />
      <div className="relative flex min-h-24 flex-col justify-center gap-1 px-4 py-4">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground">
          使い方
        </span>
        <h2 className="max-w-[80%] text-pretty text-[14px] font-semibold leading-snug text-foreground">
          WebClass をつないで、締切を見逃さない
        </h2>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          ブックマークレットで課題を取り込む
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
