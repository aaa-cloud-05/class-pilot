"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, BookOpen, Layers, Plug, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/mock-v5/settings", label: "アカウントと表示", icon: UserRound, exact: true },
  { href: "/mock-v5/settings/notifications", label: "通知", icon: Bell },
  { href: "/mock-v5/settings/courses", label: "コース", icon: Layers },
  { href: "/mock-v5/settings/setup", label: "セットアップ", icon: Plug },
  { href: "/mock-v5/help", label: "ヘルプ", icon: BookOpen },
]

/** PC は左に設定の項目一覧を固定する2ペイン。スマホは中身だけ */
export default function MockSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-2 lg:px-8">
      <nav aria-label="設定の項目" className="hidden lg:block">
        <div className="sticky top-0 pt-8">
          <p className="px-3 pb-3 text-[28px] font-bold tracking-[-0.02em]">設定</p>
          <div className="space-y-1">
            {NAV.map((it) => {
              const on = it.exact ? pathname === it.href : pathname.startsWith(it.href)
              const Icon = it.icon
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {it.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      <div className="min-w-0 lg:[&_main]:ml-0 lg:[&_main]:max-w-2xl lg:[&_main]:px-6">{children}</div>
    </div>
  )
}
