"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  House,
  Plus,
  RefreshCw,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { timeAgo } from "../_lib/format"
import { AddSheet } from "./task"
import { useMock } from "./provider"
import { Button, ButtonLink, IconButton, Panel, Sheet } from "./ui"

/* ─────────────── ブランド ─────────────── */

export function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={size === "lg" ? 32 : 22}
        height={size === "lg" ? 32 : 22}
        className={size === "lg" ? "h-8 w-8" : "h-[22px] w-[22px]"}
      />
      <span className={cn("font-semibold tracking-[-0.01em]", size === "lg" ? "text-[20px]" : "text-[14px]")}>UnionFetch</span>
    </span>
  )
}

/* ─────────────── ナビの定義 ─────────────── */

const NAV: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/mock-v4/home", label: "ホーム", icon: House, match: ["/mock-v4/home"] },
  { href: "/mock-v4/calendar", label: "カレンダー", icon: CalendarDays, match: ["/mock-v4/calendar"] },
  { href: "/mock-v4/activity", label: "通知", icon: Bell, match: ["/mock-v4/activity"] },
  { href: "/mock-v4/settings", label: "設定", icon: Settings, match: ["/mock-v4/settings"] },
]

/* ─────────────── サイドバー（PC） ─────────────── */

function Sidebar() {
  const pathname = usePathname()
  const { setAddOpen, notifications, syncedAt, now, controls, syncing, setSyncOpen } = useMock()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-3 lg:flex">
      <Link href="/mock-v4/home" className="mb-3 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
        <Brand />
      </Link>

      <Button variant="primary" size="sm" className="w-full justify-start" onClick={() => setAddOpen(true)}>
        <Plus />
        課題を追加
      </Button>

      <nav aria-label="メイン" className="mt-3 space-y-0.5">
        {NAV.map((it) => {
          const on = it.match.some((m) => pathname.startsWith(m))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                on
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{it.label}</span>
              {it.href.endsWith("activity") && unread > 0 && (
                <span className="num rounded bg-muted px-1 text-[11px] text-muted-foreground">{unread}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <button
          type="button"
          onClick={() => setSyncOpen(true)}
          className="num flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} aria-hidden />
          <span className="flex-1">同期</span>
          <span>{controls.loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未接続"}</span>
        </button>

        <Link
          href="/mock-v4/settings/account"
          className="flex items-center gap-2 rounded-md px-1.5 py-1.5 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
            {controls.loggedIn ? "佐" : "?"}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
            {controls.loggedIn ? "hinata.sato@example.ac.jp" : "ログインしていません"}
          </span>
        </Link>
      </div>
    </aside>
  )
}

/* ─────────────── 同期シート（Classroom と WebClass は別物として並べる） ─────────────── */

function SyncSheet() {
  const { syncOpen, setSyncOpen, syncedAt, now, controls, refresh, syncing, showToast } = useMock()
  const close = () => setSyncOpen(false)
  return (
    <Sheet open={syncOpen} onClose={close} title="同期">
      <div className="space-y-3">
        <Panel className="bg-background p-3.5">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[14px] font-medium">Google Classroom</p>
            <span className="num text-[12px] text-muted-foreground">
              {controls.loggedIn && syncedAt.classroom ? `${timeAgo(syncedAt.classroom, now)}に更新` : "未接続"}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">アプリを開くと自動で取りに行きます（5分に1回まで）。</p>
          {controls.loggedIn ? (
            <Button size="sm" variant="primary" className="mt-2.5" onClick={refresh} disabled={syncing}>
              <RefreshCw className={cn(syncing && "animate-spin")} />
              {syncing ? "更新中…" : "今すぐ更新"}
            </Button>
          ) : (
            <ButtonLink href="/mock-v4/login" size="sm" variant="primary" className="mt-2.5" onClick={close}>
              Google でログイン
            </ButtonLink>
          )}
        </Panel>

        <Panel className="bg-background p-3.5">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[14px] font-medium">WebClass</p>
            <span className="num text-[12px] text-muted-foreground">
              {syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "未接続"}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            WebClass 側でブックマークを押したときに取り込まれます（PC は自動にもできます）。
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <ButtonLink href="/mock-v4/settings/setup" size="sm" onClick={close}>
              つなぎ方を見る
            </ButtonLink>
            <Button size="sm" onClick={() => showToast("WebClass を開きます（モック）")}>
              WebClass を開く
            </Button>
          </div>
        </Panel>
      </div>
    </Sheet>
  )
}

/* ─────────────── 下のタブ（スマホ） ─────────────── */

function TabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {NAV.map((it) => {
          const on = it.match.some((m) => pathname.startsWith(m))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 text-[11px] outline-none transition-colors",
                on ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-[20px] w-[20px]", on && "text-primary")} strokeWidth={on ? 2 : 1.75} aria-hidden />
              {it.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/* ─────────────── ヘッダー ─────────────── */

export function TopBar({
  title,
  back,
  actions,
  brand,
}: {
  title?: string
  back?: string
  actions?: React.ReactNode
  brand?: boolean
}) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-1.5 px-2 pt-[env(safe-area-inset-top)] lg:h-12 lg:px-6">
        {back && (
          <IconButton
            icon={ChevronLeft}
            label="戻る"
            onClick={() => router.push(back)}
            className="lg:hidden"
          />
        )}
        {brand && (
          <Link href="/mock-v4/home" className="ml-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60 lg:hidden">
            <Brand />
          </Link>
        )}
        <h1 className={cn("min-w-0 flex-1 truncate text-[15px] font-semibold", brand && "hidden lg:block")}>
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-0.5">{actions}</div>
      </div>
    </header>
  )
}

/* ─────────────── トースト ─────────────── */

function Toast() {
  const { toast, hideToast } = useMock()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[60] mx-auto flex max-w-sm items-center gap-2 rounded-lg bg-foreground py-2 pl-3.5 pr-2 text-background lg:inset-x-auto lg:bottom-4 lg:left-[calc(220px+1.5rem)] lg:mx-0"
        >
          <p className="min-w-0 flex-1 text-[13px]">{toast.message}</p>
          {toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.()
                hideToast()
              }}
              className="h-7 shrink-0 rounded px-2 text-[13px] font-medium outline-none hover:bg-background/15"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={hideToast}
            aria-label="閉じる"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded opacity-60 outline-none hover:bg-background/15 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─────────────── 枠 ─────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-[220px]">{children}</div>
      <TabBar />
      <AddSheet />
      <SyncSheet />
      <Toast />
    </>
  )
}

export function Content({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-5xl px-4 pb-24 pt-4 lg:px-6 lg:pb-12 lg:pt-6", className)}>{children}</main>
  )
}

/** セットアップが途中のときだけ出る1行。カードにはしない */
export function SetupBar() {
  const { controls, syncedAt, notif, setupDismissed, dismissSetup } = useMock()
  if (setupDismissed || controls.setupDone) return null
  const steps = [controls.loggedIn, syncedAt.webclass != null, notif.enabled && (notif.push || notif.email)]
  const done = steps.filter(Boolean).length
  if (done === steps.length) return null

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="num shrink-0 text-[12px] text-muted-foreground">
        セットアップ {done}/{steps.length}
      </span>
      <Link
        href="/mock-v4/start"
        className="min-w-0 flex-1 truncate text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {!steps[0] ? "Google でログインする" : !steps[1] ? "WebClass をつなぐ" : "通知をオンにする"}
      </Link>
      <IconButton icon={X} label="セットアップの案内を閉じる" onClick={dismissSetup} className="-mr-1 h-7 w-7" />
    </div>
  )
}
