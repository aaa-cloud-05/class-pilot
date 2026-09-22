"use client"

import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { ChevronRight, X, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { Switch as ShSwitch } from "@/components/ui/switch"
import { DESKTOP_QUERY, useMediaQuery } from "./provider"

/* ─────────────── Button ───────────────
 * スマホは指で押せる高さ（44px）、PC は SaaS らしく詰める（32-36px）。 */

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/88",
  secondary: "border border-border bg-background text-foreground hover:border-input hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  danger: "border border-border bg-background text-destructive hover:border-destructive/40 hover:bg-destructive/5",
}

/* 高さは Geist（Vercel）に合わせて 32 / 36 / 40px。スマホだけ 1段ぶん大きくする */
const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-2.5 text-[13px]",
  md: "h-10 gap-1.5 rounded-md px-3 text-[14px] lg:h-9",
  lg: "h-11 gap-2 rounded-md px-3.5 text-[14px] lg:h-10",
}

const BUTTON_BASE =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium outline-none transition-[background-color,color,border-color] duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0"

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={cn(BUTTON_BASE, VARIANT[variant], SIZE[size], className)} {...props} />
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(BUTTON_BASE, VARIANT[variant], SIZE[size], className)} {...props} />
}

/** アイコンだけのボタン。見た目は小さく、当たり判定は 44px 確保する */
export function IconButton({
  icon: Icon,
  label,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 after:absolute after:-inset-1.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px max-lg:h-9 max-lg:w-9",
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  )
}

/* ─────────────── 面 ─────────────── */

/** 囲み。本文は白、囲みは薄いグレー＋1px の線 */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card", className)} {...props} />
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
      <h2 className="text-[13px] font-semibold text-muted-foreground">{children}</h2>
      {action}
    </div>
  )
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{children}</h1>
      {sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ─────────────── 設定の行 ─────────────── */

type RowProps = {
  label: React.ReactNode
  description?: React.ReactNode
  right?: React.ReactNode
  detail?: React.ReactNode
  tone?: "default" | "danger"
}

const ROW_BASE = "flex w-full items-center gap-3 px-4 py-3 text-left"

function RowBody({ label, description, detail, tone }: RowProps) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px]", tone === "danger" ? "text-destructive" : "text-foreground")}>{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>}
      </span>
      {detail != null && <span className="shrink-0 text-[13px] text-muted-foreground">{detail}</span>}
    </>
  )
}

export function SettingRow(props: RowProps) {
  return (
    <div className={ROW_BASE}>
      <RowBody {...props} />
      {props.right}
    </div>
  )
}

export function SettingLink({ href, ...rest }: RowProps & { href: string }) {
  return (
    <Link href={href} className={cn(ROW_BASE, "transition-colors hover:bg-accent focus-visible:bg-accent")}>
      <RowBody {...rest} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  )
}

export function SettingButton({ onClick, chevron = true, ...rest }: RowProps & { onClick: () => void; chevron?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn(ROW_BASE, "transition-colors hover:bg-accent focus-visible:bg-accent")}>
      <RowBody {...rest} />
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </button>
  )
}

export function RowGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Panel className={cn("divide-y divide-border overflow-hidden", className)}>{children}</Panel>
  )
}

/* ─────────────── 入力 ─────────────── */

export const INPUT =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-[16px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/25 lg:h-9 lg:text-[14px]"

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}

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
  return <ShSwitch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} className="shrink-0" />
}

/* ─────────────── 切替（下地が滑る） ─────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode }[]
  label: string
  className?: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-9 items-center rounded-md bg-muted p-0.5 lg:h-8", className)}>
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
              "relative flex h-full flex-1 items-center justify-center rounded-[7px] px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[7px] border border-border bg-background"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────── バッジ ─────────────── */

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode
  tone?: "default" | "ok" | "warn" | "danger" | "outline"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium",
        tone === "ok" && "bg-ok-soft text-ok",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "default" && "bg-muted text-muted-foreground",
        tone === "outline" && "border border-border text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ─────────────── 表 ─────────────── */

export function Table({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-card">
            {head.map((h, i) => (
              <th key={i} className="px-2.5 py-2 text-[12px] font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className={cn("px-2.5 py-2 align-top text-[12.5px] leading-snug", j === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────── シート ─────────────── */

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const reduce = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
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
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
          <motion.div
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={desktop ? { opacity: 0, y: 6 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, y: 6 } : { y: "100%" }}
            transition={desktop ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 34 }}
            drag={desktop || reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose()
            }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-border bg-background text-foreground outline-none lg:rounded-xl",
              wide ? "lg:max-w-2xl" : "lg:max-w-md",
            )}
          >
            {!desktop && <div className="mx-auto mt-2 h-1 w-8 shrink-0 rounded-full bg-border" aria-hidden />}
            <div className="flex shrink-0 items-start gap-2 px-4 pb-3 pt-3">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-[15px] font-semibold">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
              </div>
              <IconButton icon={X} label="閉じる" onClick={onClose} className="-mr-1" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-border px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">{footer}</div>
            )}
            {!footer && !desktop && <div className="h-[env(safe-area-inset-bottom)] shrink-0" aria-hidden />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ─────────────── その他 ─────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} aria-hidden />
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-[14px] font-medium">{title}</p>
      {description && <p className="mt-1 max-w-[24rem] text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}
