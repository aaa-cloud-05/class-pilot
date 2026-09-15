"use client"

import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { ChevronRight, X, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DESKTOP_QUERY, useMediaQuery } from "./provider"

/* ───────── Button ───────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft"
type ButtonSize = "lg" | "md" | "sm"

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold outline-none transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45"

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "bg-surface text-ink shadow-card hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-soft": "bg-danger-soft text-danger hover:opacity-90",
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
  lg: "h-[52px] px-6 text-[16px]",
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3.5 text-[14px]",
}

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

/* ───────── IconButton（44px の当たり判定） ───────── */

export function IconButton({
  icon: Icon,
  label,
  badge,
  className,
  iconClassName,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  badge?: number
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label}（未読${badge}件）` : label}
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-signal active:scale-95",
        className,
      )}
      {...props}
    >
      <Icon className={cn("h-[22px] w-[22px]", iconClassName)} strokeWidth={1.9} aria-hidden />
      {badge ? (
        <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-canvas">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

/* ───────── Card / Section ───────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-surface shadow-card", className)} {...props} />
}

export function SectionHeader({
  title,
  count,
  tone,
  action,
  id,
}: {
  title: string
  count?: number
  tone?: "danger" | "warn"
  action?: React.ReactNode
  id?: string
}) {
  return (
    <div id={id} className="flex min-h-9 scroll-mt-36 items-center justify-between gap-2 px-1 pb-2 lg:scroll-mt-8">
      <h2
        className={cn(
          "flex items-baseline gap-2 text-[15px] font-bold tracking-[-0.01em]",
          tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-ink",
        )}
      >
        {title}
        {count != null && <span className="text-[14px] font-semibold tabular-nums text-ink-3">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

/* ───────── 設定などのグループ化リスト ───────── */

export function ListGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: string
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      {title && <h2 className="px-4 pb-2 text-[13px] font-semibold text-ink-3">{title}</h2>}
      <Card className="overflow-hidden">
        <div className="divide-y divide-line [&>*]:border-line">{children}</div>
      </Card>
      {footer && <p className="px-4 pt-2 text-[13px] leading-relaxed text-ink-3">{footer}</p>}
    </section>
  )
}

type RowBase = {
  icon?: LucideIcon
  iconBg?: string
  label: React.ReactNode
  description?: React.ReactNode
  detail?: React.ReactNode
  tone?: "default" | "danger" | "brand"
}

function RowInner({ icon: Icon, iconBg, label, description, detail, tone = "default", chevron, right }: RowBase & {
  chevron?: boolean
  right?: React.ReactNode
}) {
  return (
    <>
      {Icon && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
          style={{ backgroundColor: iconBg ?? "var(--ui-ink-3)" }}
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1 py-3">
        <span
          className={cn(
            "block text-[16px] leading-snug",
            tone === "danger" ? "text-danger" : tone === "brand" ? "font-semibold text-brand-text" : "text-ink",
          )}
        >
          {label}
        </span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{description}</span>}
      </span>
      {detail != null && <span className="max-w-[45%] shrink-0 truncate text-right text-[15px] text-ink-3">{detail}</span>}
      {right}
      {chevron && <ChevronRight className="h-5 w-5 shrink-0 text-ink-3/70" aria-hidden />}
    </>
  )
}

const ROW = "flex min-h-14 w-full items-center gap-3 px-4 text-left outline-none"

export function RowLink({ href, ...rest }: RowBase & { href: string }) {
  return (
    <Link href={href} className={cn(ROW, "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 active:bg-surface-2")}>
      <RowInner {...rest} chevron />
    </Link>
  )
}

export function RowButton({ onClick, chevron, ...rest }: RowBase & { onClick: () => void; chevron?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(ROW, "transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 active:bg-surface-2")}
    >
      <RowInner {...rest} chevron={chevron} />
    </button>
  )
}

export function RowStatic({ right, ...rest }: RowBase & { right?: React.ReactNode }) {
  return (
    <div className={ROW}>
      <RowInner {...rest} right={right} />
    </div>
  )
}

/* ───────── Switch ───────── */

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40",
        checked ? "bg-brand" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
}

/* ───────── Segmented ───────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode }[]
  label: string
  size?: "md" | "sm"
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 font-semibold outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-signal",
              size === "md" ? "h-10 text-[15px]" : "h-8 text-[13px]",
              active ? "bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ───────── Sheet（モバイル＝下から、PC＝中央ダイアログ） ───────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  hideTitle,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  hideTitle?: boolean
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // 親が毎回新しい onClose を渡しても、開いている間の処理（フォーカス移動など）をやり直さないよう ref で持つ
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const panel = panelRef.current
    // 中に autoFocus の入力欄があればそれを優先し、なければパネル自体にフォーカス
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
      <div className="absolute inset-0 bg-scrim animate-in fade-in-0 duration-200" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col bg-surface text-ink shadow-float outline-none",
          desktop
            ? "max-w-lg rounded-sheet animate-in fade-in-0 zoom-in-95 duration-200"
            : "rounded-t-sheet animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        )}
      >
        {!desktop && <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />}
        <div className={cn("flex shrink-0 items-center gap-2 pl-5 pr-2", desktop ? "pt-3" : "pt-1")}>
          <h2 id={titleId} className={cn("min-w-0 flex-1 truncate text-[17px] font-bold", hideTitle && "sr-only")}>
            {title}
          </h2>
          <IconButton icon={X} label="閉じる" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">{footer}</div>
        )}
        {!footer && !desktop && <div className="h-[env(safe-area-inset-bottom)] shrink-0" aria-hidden />}
      </div>
    </div>
  )
}

/* ───────── その他 ───────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} aria-hidden />
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "brand",
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  tone?: "brand" | "ok"
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {/* イラスト枠：素材（Humaaans / unDraw など）が決まったら差し替える */}
      <div
        className={cn(
          "mb-5 flex h-20 w-20 items-center justify-center rounded-[28px]",
          tone === "ok" ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand-text",
        )}
      >
        <Icon className="h-9 w-9" strokeWidth={1.8} aria-hidden />
      </div>
      <p className="text-[18px] font-bold">{title}</p>
      {description && <p className="mt-2 max-w-[22rem] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Banner({
  tone,
  icon: Icon,
  children,
  action,
}: {
  tone: "danger" | "warn" | "brand"
  icon: LucideIcon
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 rounded-card px-4 py-3",
        tone === "danger" ? "bg-danger-soft text-danger" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-text",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug">{children}</p>
      {action}
    </div>
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-semibold text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[13px] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}

export const INPUT =
  "h-12 w-full rounded-control border border-line bg-surface px-3.5 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-signal focus:ring-3 focus:ring-signal/20"
