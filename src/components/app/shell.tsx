"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  GraduationCap,
  Globe,
  House,
  Plus,
  RefreshCw,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/assignment-format"
import { AddAssignmentSheet } from "./assignment"
import { SPRING } from "@/components/app/motion"
import { useApp } from "@/components/app/provider"
import { Button, ButtonLink, Card, IconButton, INPUT, Sheet } from "@/components/app/ui"

/* ───────── ブランド ───────── */

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={size === "lg" ? 36 : 26}
        height={size === "lg" ? 36 : 26}
        className={size === "lg" ? "h-9 w-9" : "h-[26px] w-[26px]"}
      />
      <span
        className={cn(
          "font-wordmark font-bold leading-none tracking-[-0.02em] text-foreground",
          size === "lg" ? "text-[24px]" : "text-[18px]",
        )}
      >
        UnionFetch
      </span>
    </span>
  )
}

/* ───────── 同期の状態（色は「気にしなくていい状態」には使わない） ───────── */

type Freshness = "ok" | "warn" | "danger" | "none"

export function useSyncSummary() {
  const { now, syncedAt, syncError, loggedIn } = useApp()
  const ageMin = (d: Date | null) => (d ? (now.getTime() - d.getTime()) / 60_000 : null)
  const classroom: Freshness =
    syncError === "reauth_required" ? "danger" : !loggedIn ? "none" : (ageMin(syncedAt.classroom) ?? 1e9) < 60 ? "ok" : "warn"
  const wcAge = ageMin(syncedAt.webclass)
  const webclass: Freshness = wcAge == null ? "none" : wcAge < 60 * 48 ? "ok" : wcAge < 60 * 24 * 7 ? "warn" : "danger"
  const rank: Record<Freshness, number> = { danger: 3, warn: 2, none: 1, ok: 0 }
  const worst = rank[classroom] >= rank[webclass] ? classroom : webclass
  return { classroom, webclass, worst }
}

const DOT: Record<Freshness, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-destructive",
  none: "bg-muted-foreground/40",
}

export function SyncButton() {
  const { setSyncOpen, syncing } = useApp()
  const { worst } = useSyncSummary()
  return (
    <button
      type="button"
      onClick={() => setSyncOpen(true)}
      aria-label="同期の状態"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-95"
    >
      <RefreshCw className={cn("h-[19px] w-[19px]", syncing && "animate-spin")} strokeWidth={1.75} aria-hidden />
      <span className={cn("absolute right-2.5 top-2.5 h-2 w-2 rounded-full ring-2 ring-background", DOT[worst])} aria-hidden />
    </button>
  )
}

function SourceBlock({
  icon: Icon,
  name,
  freshness,
  status,
  children,
}: {
  icon: LucideIcon
  name: string
  freshness: Freshness
  status: string
  children?: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", DOT[freshness])} aria-hidden />
            {status}
          </p>
        </div>
      </div>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </Card>
  )
}

export function SyncSheet() {
  const { syncOpen, setSyncOpen, syncedAt, now, syncError, loggedIn, webclassUrl, setWebclassUrl, refresh, syncing } =
    useApp()
  const { classroom, webclass } = useSyncSummary()
  const [urlDraft, setUrlDraft] = useState(webclassUrl)
  const close = () => setSyncOpen(false)

  return (
    <Sheet
      open={syncOpen}
      onClose={close}
      title="同期"
      footer={
        <p className="text-center text-[13px] text-muted-foreground">
          Classroom は開くたびに自動で更新されます（5分に1回まで）
        </p>
      }
    >
      <div className="space-y-3 pt-2">
        <SourceBlock
          icon={GraduationCap}
          name="Google Classroom"
          freshness={classroom}
          status={
            syncError === "reauth_required"
              ? "連携の期限が切れました"
              : !loggedIn
                ? "ログインすると自動で取り込みます"
                : `${timeAgo(syncedAt.classroom ?? now, now)}に更新`
          }
        >
          {syncError === "reauth_required" || !loggedIn ? (
            <ButtonLink href="/login" size="sm" onClick={close}>
              {loggedIn ? "再ログイン" : "Google でログイン"}
            </ButtonLink>
          ) : (
            <Button size="sm" disabled={syncing} onClick={refresh}>
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} aria-hidden />
              {syncing ? "取り込み中…" : "もう一度試す"}
            </Button>
          )}
        </SourceBlock>

        <SourceBlock
          icon={Globe}
          name="WebClass"
          freshness={webclass}
          status={syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "まだ取り込んでいません"}
        >
          <ButtonLink
            href={webclassUrl || "#"}
            size="sm"
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!webclassUrl}
            className={cn(!webclassUrl && "pointer-events-none opacity-50")}
          >
            WebClass を開く
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/settings/setup" variant="ghost" size="sm" onClick={close}>
            取り込み方法
          </ButtonLink>
        </SourceBlock>

        <div className="rounded-card border border-border p-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">WebClass の URL</span>
            <span className="flex gap-2">
              <input
                type="url"
                inputMode="url"
                aria-label="WebClass の URL"
                className={INPUT}
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://…/webclass/"
              />
              <Button size="md" className="shrink-0" onClick={() => setWebclassUrl(urlDraft.trim())} disabled={urlDraft.trim() === webclassUrl}>
                保存
              </Button>
            </span>
            <span className="mt-1.5 block text-[12px] text-muted-foreground">
              上の「WebClass を開く」の行き先です。この端末にだけ保存します。
            </span>
          </label>
        </div>

        <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted-foreground">
          WebClass は、WebClass を開いた状態でブックマークレットを押すと取り込まれます（PC は自動同期も使えます）。{" "}
          <Link href="/settings/help/sync" onClick={close} className="font-medium text-primary hover:underline">
            同期のしくみ
          </Link>
        </p>
      </div>
    </Sheet>
  )
}

/* ───────── トースト ───────── */

export function Toast() {
  const { toast, hideToast } = useApp()
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={SPRING}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-[60] mx-auto flex max-w-sm items-center gap-2 rounded-control bg-foreground py-2 pl-4 pr-2 text-background shadow-float lg:inset-x-auto lg:bottom-6 lg:left-[calc(240px+2rem)] lg:mx-0"
        >
          <p className="min-w-0 flex-1 py-1 text-[14px] font-medium">{toast.message}</p>
          {toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.()
                hideToast()
              }}
              className="h-8 shrink-0 rounded-[8px] px-2.5 text-[13px] font-semibold outline-none hover:bg-background/15"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={hideToast}
            aria-label="閉じる"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] opacity-60 outline-none hover:bg-background/15 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────── はじめの設定 ───────── */

export function useSetupSteps() {
  const { loggedIn, syncedAt, settings } = useApp()
  return [
    {
      key: "login",
      title: "Google でログイン",
      desc: "Classroom の課題が自動で入ります",
      href: "/login",
      done: loggedIn,
    },
    {
      key: "webclass",
      title: "WebClass をつなぐ",
      desc: "ブックマークに1つ登録するだけ",
      href: "/settings/setup",
      done: syncedAt.webclass != null,
    },
    {
      key: "notif",
      title: "締切の通知をオンにする",
      desc: "プッシュかメールで受け取れます",
      href: "/settings/notifications",
      done: settings.enabled,
    },
  ]
}

export function SetupCard({ dismissible = true }: { dismissible?: boolean }) {
  const { dismissSetup } = useApp()
  const steps = useSetupSteps()
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  if (!next) return null
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tabular-nums text-muted-foreground">
            はじめの設定 {done} / {steps.length}
          </p>
          <p className="mt-1 text-[15px] font-semibold">{next.title}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{next.desc}</p>
        </div>
        {dismissible && <IconButton icon={X} label="はじめの設定を閉じる" onClick={dismissSetup} className="-mr-2 -mt-2 h-9 w-9" />}
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={SPRING}
        />
      </div>
      <ButtonLink href={next.href} size="md" className="mt-3.5 w-full">
        {next.title}
      </ButtonLink>
    </Card>
  )
}

/* ───────── ナビゲーション ───────── */

const TABS = [
  { href: "/", label: "ホーム", icon: House, match: ["/", "/activity"] },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays, match: ["/calendar"] },
  { href: "/settings", label: "設定", icon: Settings, match: ["/settings"] },
]

/** "/" は完全一致、それ以外は前方一致。ホームが常に選ばれてしまうのを防ぐ */
function matches(pathname: string, m: string): boolean {
  return m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(`${m}/`)
}

function useActiveTab() {
  const pathname = usePathname()
  return TABS.findIndex((t) => t.match.some((m) => matches(pathname, m)))
}

function BottomNav() {
  const { setAddOpen } = useApp()
  const active = useActiveTab()

  const item = (i: number, floating: boolean) => {
    const t = TABS[i]
    const on = i === active
    const Icon = t.icon
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors",
          floating ? "h-[52px] w-[74px] rounded-full" : "h-16",
          on ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {on && (
          <motion.span
            layoutId={floating ? "tab-pill-floating" : "tab-pill-bar"}
            className={cn("absolute bg-accent", floating ? "inset-0 rounded-full" : "inset-x-3 inset-y-1.5 rounded-control")}
            transition={SPRING}
          />
        )}
        <Icon className={cn("relative z-10 h-[21px] w-[21px]", on && "text-primary")} strokeWidth={on ? 2 : 1.75} aria-hidden />
        <span className="relative z-10">{t.label}</span>
      </Link>
    )
  }

  if (false) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="課題を追加"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex h-13 w-13 items-center justify-center rounded-[16px] bg-primary text-primary-foreground shadow-float outline-none transition-transform active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/40 lg:hidden"
        >
          <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
        <nav
          aria-label="メイン"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto grid max-w-xl grid-cols-3">{TABS.map((_, i) => item(i, false))}</div>
        </nav>
      </>
    )
  }

  return (
    <nav
      aria-label="メイン"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2.5 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden"
    >
      <div className="pointer-events-auto flex items-center rounded-full bg-card/85 p-1.5 shadow-float backdrop-blur-xl">
        {TABS.map((_, i) => item(i, true))}
      </div>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="課題を追加"
        className="pointer-events-auto flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float outline-none transition-transform active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Plus className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>
    </nav>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const { setAddOpen, notifications, syncedAt, now, loggedIn, setSyncOpen } = useApp()
  const { classroom, webclass } = useSyncSummary()
  const unread = notifications.filter((n) => !n.read).length
  const items = [
    { href: "/", label: "ホーム", icon: House, match: ["/"] },
    { href: "/calendar", label: "カレンダー", icon: CalendarDays, match: ["/calendar"] },
    { href: "/activity", label: "通知", icon: Bell, match: ["/activity"], badge: unread },
    { href: "/settings", label: "設定", icon: Settings, match: ["/settings"] },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-card px-3 pb-4 pt-5 lg:flex">
      <Link href="/" className="rounded-control px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
        <Brand />
      </Link>
      <Button className="mt-5 w-full" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
        課題を追加
      </Button>
      <nav aria-label="メイン" className="mt-4 space-y-0.5">
        {items.map((it) => {
          const on = it.match.some((m) => matches(pathname, m))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-2.5 rounded-control px-3 text-[14px] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                on ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                  transition={SPRING}
                />
              )}
              <Icon className={cn("h-[18px] w-[18px]", on && "text-foreground")} strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="rounded-card border border-border p-3">
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="w-full space-y-1.5 rounded-control text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[classroom])} aria-hidden />
              <span className="flex-1">Classroom</span>
              <span className="tabular-nums">
                {loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未連携"}
              </span>
            </span>
            <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[webclass])} aria-hidden />
              <span className="flex-1">WebClass</span>
              <span className="tabular-nums">{syncedAt.webclass ? timeAgo(syncedAt.webclass, now) : "未取り込み"}</span>
            </span>
          </button>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-control px-2 py-2 outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-muted-foreground">
            {loggedIn ? "佐" : "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{loggedIn ? "佐藤 ひなた" : "ログインしていません"}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {loggedIn ? "hinata.sato@example.ac.jp" : "この端末にだけ保存中"}
            </span>
          </span>
        </Link>
      </div>
    </aside>
  )
}

/* ───────── ページの枠 ───────── */

export function MobileHeader({
  variant,
  title,
  actions,
  backHref,
}: {
  variant: "home" | "title" | "back"
  title?: string
  actions?: React.ReactNode
  backHref?: string
}) {
  const router = useRouter()
  const { notifications } = useApp()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex min-h-[52px] max-w-xl items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
        {variant === "home" && (
          <>
            <Link href="/" className="ml-2 flex-1 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
              <Brand />
            </Link>
            <SyncButton />
            <Link
              href="/activity"
              aria-label={unread ? `通知（未読${unread}件）` : "通知"}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <Bell className="h-[19px] w-[19px]" strokeWidth={1.75} aria-hidden />
              {unread > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" aria-hidden />
              )}
            </Link>
          </>
        )}
        {variant === "title" && (
          <>
            <h1 className="ml-2 flex-1 text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
            {actions}
          </>
        )}
        {variant === "back" && (
          <>
            <button
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              aria-label="戻る"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold">{title}</h1>
            {actions}
          </>
        )}
      </div>
    </header>
  )
}

/** 枠（ナビ・シート）を出さない画面。全画面で見せたいもの */
const CHROMELESS = ["/login", "/import"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (CHROMELESS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return <>{children}</>
  }
  return (
    <>
      <Sidebar />
      <div className="lg:pl-[240px]">{children}</div>
      <BottomNav />
      <AddAssignmentSheet />
      <SyncSheet />
      <Toast />
    </>
  )
}

export function PageBody({
  desktopTitle,
  desktopActions,
  desktopBack,
  children,
  wide = false,
}: {
  desktopTitle?: string
  desktopActions?: React.ReactNode
  desktopBack?: { href: string; label: string }
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-2 lg:px-8 lg:pb-12 lg:pt-8",
        wide ? "max-w-xl lg:max-w-5xl" : "max-w-xl lg:max-w-3xl",
      )}
    >
      {(desktopTitle || desktopBack) && (
        <div className="mb-6 hidden items-center gap-3 lg:flex">
          <div className="min-w-0 flex-1">
            {desktopBack && (
              <Link
                href={desktopBack.href}
                className="mb-1 inline-flex items-center gap-1 rounded-control text-[13px] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                {desktopBack.label}
              </Link>
            )}
            {desktopTitle && <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{desktopTitle}</h1>}
          </div>
          {desktopActions}
        </div>
      )}
      {children}
    </main>
  )
}

export function ReauthOrErrorBanner() {
  const { syncError, dataError, refresh } = useApp()
  if (syncError === "reauth_required") {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-3 rounded-card bg-card px-4 py-3 shadow-card" role="alert">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-destructive" strokeWidth={1.75} aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] leading-snug text-foreground">
            Google との連携が切れました。再ログインすると Classroom の更新が再開します。
          </p>
          <ButtonLink href="/login" size="sm">
            再ログイン
          </ButtonLink>
        </div>
      </div>
    )
  }
  if (dataError != null) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-3 rounded-card bg-card px-4 py-3 shadow-card" role="alert">
          <AlertTriangle className="h-[18px] w-[18px] shrink-0 text-destructive" strokeWidth={1.75} aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] leading-snug text-foreground">
            最新の課題を取得できませんでした。表示しているのは前回の内容です。
          </p>
          <Button size="sm" variant="secondary" onClick={refresh}>
            再試行
          </Button>
        </div>
      </div>
    )
  }
  return null
}
