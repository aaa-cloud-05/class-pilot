"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/mock-v4/settings", label: "概要", exact: true },
  { href: "/mock-v4/settings/setup", label: "セットアップ" },
  { href: "/mock-v4/settings/notifications", label: "通知" },
  { href: "/mock-v4/settings/courses", label: "コース" },
  { href: "/mock-v4/settings/account", label: "アカウント" },
  { href: "/mock-v4/settings/help", label: "よくある質問" },
]

/** PC は左に設定の項目、スマホは中身だけ（ヘルプも同じ枠の中に置く） */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="lg:mx-auto lg:flex lg:max-w-5xl lg:gap-8 lg:px-6 lg:pt-6">
      <nav aria-label="設定" className="hidden w-[160px] shrink-0 lg:block">
        <p className="px-2 pb-2 text-[13px] font-semibold">設定</p>
        <div className="space-y-0.5">
          {NAV.map((it) => {
            const on = it.exact ? pathname === it.href : pathname.startsWith(it.href)
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                  on ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {it.label}
              </Link>
            )
          })}
        </div>
      </nav>
      <div className="min-w-0 flex-1 lg:[&_main]:mx-0 lg:[&_main]:max-w-none lg:[&_main]:px-0 lg:[&_main]:pt-0">{children}</div>
    </div>
  )
}
