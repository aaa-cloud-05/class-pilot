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
import { cn } from "@/lib/utils"
import { timeAgo } from "../_lib/format"
import { AddAssignmentSheet } from "./assignment"
import { useMock } from "./provider"
import { Button, ButtonLink, Card, IconButton, Sheet } from "./ui"

/* ───────── ブランド ───────── */

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={size === "lg" ? 40 : 28}
        height={size === "lg" ? 40 : 28}
        className={size === "lg" ? "h-10 w-10" : "h-7 w-7"}
      />
      <span
        className={cn(
          "font-wordmark font-bold leading-none tracking-[-0.02em] text-ink",
          size === "lg" ? "text-[26px]" : "text-[19px]",
        )}
      >
        UnionFetch
      </span>
    </span>
  )
}

/* ───────── 同期の状態 ───────── */

type Freshness = "ok" | "warn" | "danger" | "none"

export function useSyncSummary() {
  const { now, syncedAt, controls } = useMock()
  const ageMin = (d: Date | null) => (d ? (now.getTime() - d.getTime()) / 60_000 : null)
  const classroom: Freshness =
    controls.data === "reauth" ? "danger" : !controls.loggedIn ? "none" : (ageMin(syncedAt.classroom) ?? 1e9) < 60 ? "ok" : "warn"
  const wcAge = ageMin(syncedAt.webclass)
  const webclass: Freshness = wcAge == null ? "none" : wcAge < 60 * 48 ? "ok" : wcAge < 60 * 24 * 7 ? "warn" : "danger"
  const rank: Record<Freshness, number> = { danger: 3, warn: 2, none: 1, ok: 0 }
  const worst = rank[classroom] >= rank[webclass] ? classroom : webclass
  return { classroom, webclass, worst }
}

const FRESH_DOT: Record<Freshness, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  none: "bg-line-strong",
}

export function SyncButton() {
  const { setSyncOpen, syncing } = useMock()
  const { worst } = useSyncSummary()
  return (
    <button
      type="button"
      onClick={() => setSyncOpen(true)}
      aria-label="同期の状態"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-signal active:scale-95"
    >
      <RefreshCw className={cn("h-[21px] w-[21px]", syncing && "animate-spin")} strokeWidth={1.9} aria-hidden />
      <span className={cn("absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-canvas", FRESH_DOT[worst])} aria-hidden />
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
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-2 text-ink-2">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-ink-2">
            <span className={cn("h-2 w-2 rounded-full", FRESH_DOT[freshness])} aria-hidden />
            {status}
          </p>
        </div>
      </div>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </Card>
  )
}

export function SyncSheet() {
  const { syncOpen, setSyncOpen, syncedAt, now, controls, refresh, syncing, webclassUrl, showToast } = useMock()
  const { classroom, webclass } = useSyncSummary()
  const close = () => setSyncOpen(false)

  return (
    <Sheet
      open={syncOpen}
      onClose={close}
      title="同期"
      footer={
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={refresh} disabled={!controls.loggedIn || syncing}>
            <RefreshCw className={cn("h-[18px] w-[18px]", syncing && "animate-spin")} aria-hidden />
            {syncing ? "更新中…" : "Classroom を今すぐ更新"}
          </Button>
          <p className="text-center text-[13px] text-ink-3">
            アプリを開くと自動でも更新されます（5分に1回まで）
          </p>
        </div>
      }
    >
      <div className="space-y-3 pt-2">
        <SourceBlock
          icon={GraduationCap}
          name="Google Classroom"
          freshness={classroom}
          status={
            controls.data === "reauth"
              ? "連携の期限が切れました"
              : !controls.loggedIn
                ? "ログインすると自動で取り込みます"
                : `${timeAgo(syncedAt.classroom ?? now, now)}に更新`
          }
        >
          {controls.data === "reauth" || !controls.loggedIn ? (
            <ButtonLink href="/mock/login" size="sm" onClick={close}>
              {controls.loggedIn ? "再ログイン" : "Google でログイン"}
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => showToast("Classroom を開きます（モック）")}>
              Classroom を開く
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </SourceBlock>

        <SourceBlock
          icon={Globe}
          name="WebClass"
          freshness={webclass}
          status={syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "まだ取り込んでいません"}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!webclassUrl}
            onClick={() => showToast("WebClass を開きます（モック）")}
          >
            WebClass を開く
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Button>
          <ButtonLink href="/mock/help/webclass" variant="ghost" size="sm" onClick={close}>
            取り込み方法
          </ButtonLink>
        </SourceBlock>

        <p className="px-1 pt-1 text-[13px] leading-relaxed text-ink-3">
          WebClass は、WebClass を開いた状態でブックマークレットを押すと取り込まれます（PC は自動同期も使えます）。{" "}
          <Link href="/mock/help/sync" onClick={close} className="font-semibold text-brand-text underline-offset-2 hover:underline">
            同期のしくみ
          </Link>
        </p>
      </div>
    </Sheet>
  )
}

/* ───────── トースト ───────── */

export function Toast() {
  const { toast, hideToast } = useMock()
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-control bg-ink py-2 pl-4 pr-2 text-canvas shadow-float animate-in fade-in-0 slide-in-from-bottom-2 duration-200 lg:inset-x-auto lg:bottom-6 lg:left-[calc(260px+2rem)] lg:mx-0"
    >
      <p className="min-w-0 flex-1 py-1.5 text-[15px] font-medium">{toast.message}</p>
      {toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.()
            hideToast()
          }}
          className="h-9 shrink-0 rounded-[10px] px-3 text-[14px] font-bold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-signal"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={hideToast}
        aria-label="閉じる"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] opacity-70 outline-none hover:bg-white/10 hover:opacity-100"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

/* ───────── はじめの設定 ───────── */

export function useSetupSteps() {
  const { controls, syncedAt, notif } = useMock()
  const all = controls.setupDone
  return [
    { key: "login", title: "Google でログイン", desc: "Classroom の課題が自動で入ります", href: "/mock/login", done: all || controls.loggedIn },
    { key: "webclass", title: "WebClass をつなぐ", desc: "ブックマークに1つ登録するだけ", href: "/mock/help/webclass", done: all || syncedAt.webclass != null },
    {
      key: "notif",
      title: "締切の通知をオンにする",
      desc: "プッシュかメールで受け取れます",
      href: "/mock/settings/notifications",
      done: all || (notif.enabled && (notif.push || notif.email)),
    },
  ]
}

export function SetupCard({ dismissible = true }: { dismissible?: boolean }) {
  const { dismissSetup } = useMock()
  const steps = useSetupSteps()
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  if (!next) return null
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-brand-text">
            はじめの設定 {done} / {steps.length}
          </p>
          <p className="mt-1 text-[17px] font-bold">{next.title}</p>
          <p className="mt-0.5 text-[14px] text-ink-2">{next.desc}</p>
        </div>
        {dismissible && <IconButton icon={X} label="はじめの設定を閉じる" onClick={dismissSetup} className="-mr-2 -mt-2" />}
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {steps.map((s) => (
          <span key={s.key} className={cn("h-1.5 flex-1 rounded-full", s.done ? "bg-brand" : "bg-surface-2")} />
        ))}
      </div>
      <ButtonLink href={next.href} className="mt-4 w-full">
        {next.title}
      </ButtonLink>
    </Card>
  )
}

/* ───────── ナビゲーション ───────── */

const TABS = [
  { href: "/mock/home", label: "ホーム", icon: House, match: ["/mock/home", "/mock/notifications"] },
  { href: "/mock/calendar", label: "カレンダー", icon: CalendarDays, match: ["/mock/calendar"] },
  { href: "/mock/settings", label: "設定", icon: Settings, match: ["/mock/settings", "/mock/help"] },
]

function useActiveTab() {
  const pathname = usePathname()
  return TABS.findIndex((t) => t.match.some((m) => pathname.startsWith(m)))
}

function BottomNav() {
  const { controls, setAddOpen } = useMock()
  const active = useActiveTab()

  if (controls.nav === "bar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="課題を追加"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand text-on-brand shadow-float outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 lg:hidden"
        >
          <Plus className="h-7 w-7" strokeWidth={2.2} aria-hidden />
        </button>
        <nav
          aria-label="メイン"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto grid h-16 max-w-xl grid-cols-3">
            {TABS.map((t, i) => {
              const on = i === active
              const Icon = t.icon
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-[12px] font-semibold outline-none focus-visible:bg-surface-2",
                    on ? "text-brand-text" : "text-ink-3",
                  )}
                >
                  <span className={cn("flex h-7 w-14 items-center justify-center rounded-full transition-colors", on && "bg-brand-soft")}>
                    <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.3 : 1.9} aria-hidden />
                  </span>
                  {t.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </>
    )
  }

  return (
    <nav
      aria-label="メイン"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden"
    >
      <div className="pointer-events-auto flex items-center rounded-full bg-surface/80 p-1.5 shadow-float backdrop-blur-xl">
        {TABS.map((t, i) => {
          const on = i === active
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-[54px] w-[78px] flex-col items-center justify-center gap-0.5 rounded-full text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                on ? "bg-brand-soft text-brand-text" : "text-ink-3 hover:text-ink",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.3 : 1.9} aria-hidden />
              {t.label}
            </Link>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="課題を追加"
        className="pointer-events-auto flex h-[66px] w-[66px] items-center justify-center rounded-full bg-brand text-on-brand shadow-float outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
      >
        <Plus className="h-7 w-7" strokeWidth={2.2} aria-hidden />
      </button>
    </nav>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const { setAddOpen, notifications, syncedAt, now, controls, refresh, syncing, setSyncOpen } = useMock()
  const { classroom, webclass } = useSyncSummary()
  const unread = notifications.filter((n) => !n.read).length
  const items = [
    { href: "/mock/home", label: "ホーム", icon: House, match: ["/mock/home"] },
    { href: "/mock/calendar", label: "カレンダー", icon: CalendarDays, match: ["/mock/calendar"] },
    { href: "/mock/notifications", label: "通知", icon: Bell, match: ["/mock/notifications"], badge: unread },
    { href: "/mock/settings", label: "設定", icon: Settings, match: ["/mock/settings", "/mock/help"] },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-surface px-4 pb-4 pt-5 lg:flex">
      <Link href="/mock/home" className="rounded-control px-2 outline-none focus-visible:ring-2 focus-visible:ring-signal">
        <Brand />
      </Link>
      <Button className="mt-6 w-full" onClick={() => setAddOpen(true)}>
        <Plus className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        課題を追加
      </Button>
      <nav aria-label="メイン" className="mt-5 space-y-1">
        {items.map((it) => {
          const on = it.match.some((m) => pathname.startsWith(m))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                on ? "bg-brand-soft text-brand-text" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={on ? 2.3 : 1.9} aria-hidden />
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-bold text-white">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-card bg-surface-2/70 p-3">
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="w-full space-y-1.5 rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <span className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className={cn("h-2 w-2 rounded-full", FRESH_DOT[classroom])} aria-hidden />
              <span className="flex-1">Classroom</span>
              <span className="tabular-nums text-ink-3">
                {controls.loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未連携"}
              </span>
            </span>
            <span className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className={cn("h-2 w-2 rounded-full", FRESH_DOT[webclass])} aria-hidden />
              <span className="flex-1">WebClass</span>
              <span className="tabular-nums text-ink-3">{syncedAt.webclass ? timeAgo(syncedAt.webclass, now) : "未取り込み"}</span>
            </span>
          </button>
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={refresh} disabled={!controls.loggedIn || syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} aria-hidden />
            {syncing ? "更新中…" : "今すぐ更新"}
          </Button>
        </div>
        <Link
          href="/mock/settings"
          className="flex items-center gap-3 rounded-control px-2 py-2 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[14px] font-bold text-brand-text">
            {controls.loggedIn ? "佐" : "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold">{controls.loggedIn ? "佐藤 ひなた" : "ログインしていません"}</span>
            <span className="block truncate text-[12px] text-ink-3">
              {controls.loggedIn ? "hinata.sato@example.ac.jp" : "この端末にだけ保存中"}
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
  const { notifications } = useMock()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex min-h-14 max-w-xl items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
        {variant === "home" && (
          <>
            <Link href="/mock/home" className="ml-2 flex-1 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-signal">
              <Brand />
            </Link>
            <SyncButton />
            <Link
              href="/mock/notifications"
              aria-label={unread ? `通知（未読${unread}件）` : "通知"}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-signal"
            >
              <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-canvas">
                  {unread}
                </span>
              )}
            </Link>
          </>
        )}
        {variant === "title" && (
          <>
            <h1 className="ml-2 flex-1 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
            {actions}
          </>
        )}
        {variant === "back" && (
          <>
            <button
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              aria-label="戻る"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h1>
            {actions}
          </>
        )}
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-[260px]">{children}</div>
      <BottomNav />
      <AddAssignmentSheet />
      <SyncSheet />
      <Toast />
    </>
  )
}

/** ページ本文。モバイルは下部ナビの分だけ下を空け、PC はタイトル行を出す */
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
        wide ? "max-w-xl lg:max-w-6xl" : "max-w-xl lg:max-w-3xl",
      )}
    >
      {(desktopTitle || desktopBack) && (
        <div className="mb-6 hidden items-center gap-3 lg:flex">
          <div className="min-w-0 flex-1">
            {desktopBack && (
              <Link
                href={desktopBack.href}
                className="mb-1 inline-flex items-center gap-1 rounded-control text-[14px] font-semibold text-ink-3 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-signal"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {desktopBack.label}
              </Link>
            )}
            {desktopTitle && <h1 className="text-[28px] font-bold tracking-[-0.02em]">{desktopTitle}</h1>}
          </div>
          {desktopActions}
        </div>
      )}
      {children}
    </main>
  )
}

export function ReauthOrErrorBanner() {
  const { controls, refresh } = useMock()
  if (controls.data === "reauth") {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-3 rounded-card bg-danger-soft px-4 py-3 text-danger" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug">
            Google との連携が切れました。再ログインすると Classroom の更新が再開します。
          </p>
          <ButtonLink href="/mock/login" size="sm" variant="danger">
            再ログイン
          </ButtonLink>
        </div>
      </div>
    )
  }
  if (controls.data === "error") {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-3 rounded-card bg-danger-soft px-4 py-3 text-danger" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug">
            最新の課題を取得できませんでした。表示しているのは前回の内容です。
          </p>
          <Button size="sm" variant="danger-soft" className="bg-surface" onClick={refresh}>
            再試行
          </Button>
        </div>
      </div>
    )
  }
  return null
}
