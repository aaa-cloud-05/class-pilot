"use client"

import { useEffect, useId, useRef } from "react"
import Link from "next/link"
import { ChevronRight, X, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { Button as ShButton } from "@/components/ui/button"
import { Switch as ShSwitch } from "@/components/ui/switch"
import { Skeleton as ShSkeleton } from "@/components/ui/skeleton"
import { DESKTOP_QUERY, useMediaQuery } from "./provider"
import { SPRING, SPRING_SOFT } from "./motion"

/* ───────── Button（shadcn の Button に、指で押せる大きさを足す） ───────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft"
type ButtonSize = "lg" | "md" | "sm"

const SH_VARIANT = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
  "danger-soft": "destructive",
} as const

const SIZE: Record<ButtonSize, string> = {
  lg: "h-12 gap-2 rounded-control px-5 text-[15px] font-semibold",
  md: "h-10 gap-2 rounded-control px-4 text-[14px] font-semibold",
  sm: "h-8 gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold",
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<typeof ShButton>, "variant" | "size"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <ShButton type="button" variant={SH_VARIANT[variant]} className={cn(SIZE[size], className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <ShButton asChild variant={SH_VARIANT[variant]} className={cn(SIZE[size], className)}>
      <Link {...props}>{children}</Link>
    </ShButton>
  )
}

/* ───────── IconButton（44px の当たり判定・単色） ───────── */

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
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-95",
        className,
      )}
      {...props}
    >
      <Icon className={cn("h-[20px] w-[20px]", iconClassName)} strokeWidth={1.75} aria-hidden />
      {badge ? (
        <span className="absolute right-1.5 top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-background">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

/* ───────── 面と見出し ───────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-card shadow-card", className)} {...props} />
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
    <div id={id} className="flex min-h-8 scroll-mt-36 items-center justify-between gap-2 px-1 pb-2 lg:scroll-mt-8">
      <h2 className="flex items-baseline gap-2 text-[14px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
        {count != null && (
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums",
              tone === "danger" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  )
}

/* ───────── 設定などのリスト ───────── */

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
      {title && <h2 className="px-1 pb-2 text-[13px] font-semibold text-muted-foreground">{title}</h2>}
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">{children}</div>
      </Card>
      {footer && <p className="px-1 pt-2 text-[13px] leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  )
}

type RowBase = {
  icon?: LucideIcon
  /** v1 の名残。v2 ではアイコンに色を付けないので使わない */
  iconBg?: string
  label: React.ReactNode
  description?: React.ReactNode
  detail?: React.ReactNode
  tone?: "default" | "danger" | "brand"
}

function RowInner({
  icon: Icon,
  label,
  description,
  detail,
  tone = "default",
  chevron,
  right,
}: RowBase & {
  chevron?: boolean
  right?: React.ReactNode
}) {
  return (
    <>
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />}
      <span className="min-w-0 flex-1 py-2.5">
        <span
          className={cn(
            "block text-[15px] leading-snug",
            tone === "danger" ? "text-destructive" : tone === "brand" ? "font-medium text-primary" : "text-foreground",
          )}
        >
          {label}
        </span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>}
      </span>
      {detail != null && (
        <span className="max-w-[45%] shrink-0 truncate text-right text-[14px] text-muted-foreground">{detail}</span>
      )}
      {right}
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </>
  )
}

const ROW = "flex min-h-[52px] w-full items-center gap-3 px-4 text-left outline-none"
const ROW_HOVER = "transition-colors hover:bg-accent focus-visible:bg-accent active:bg-accent"

export function RowLink({ href, ...rest }: RowBase & { href: string }) {
  return (
    <Link href={href} className={cn(ROW, ROW_HOVER)}>
      <RowInner {...rest} chevron />
    </Link>
  )
}

export function RowButton({ onClick, chevron, ...rest }: RowBase & { onClick: () => void; chevron?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn(ROW, ROW_HOVER)}>
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

/* ───────── Switch（shadcn＝Radix。当たり判定は擬似要素で広げてある） ───────── */

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
    <ShSwitch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} className="shrink-0" />
  )
}

/* ───────── Segmented（選択中の下地が滑る） ───────── */

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
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-muted p-[3px]", className)}>
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
              "relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
              size === "md" ? "h-9 text-[14px]" : "h-7 text-[13px]",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)]"
                transition={SPRING}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ───────── Sheet（スマホ＝下から・指で下げて閉じる／PC＝中央） ───────── */

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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
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
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={desktop ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.97 } : { y: "100%" }}
            transition={desktop ? { duration: 0.18 } : SPRING_SOFT}
            drag={desktop || reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 800) onClose()
            }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col bg-card text-foreground shadow-float outline-none",
              desktop ? "max-w-lg rounded-sheet" : "rounded-t-sheet",
            )}
          >
            {!desktop && <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border" aria-hidden />}
            <div className={cn("flex shrink-0 items-center gap-2 pl-5 pr-2", desktop ? "pt-3" : "pt-1")}>
              <h2 id={titleId} className={cn("min-w-0 flex-1 truncate text-[16px] font-semibold", hideTitle && "sr-only")}>
                {title}
              </h2>
              <IconButton icon={X} label="閉じる" onClick={onClose} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-border px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
                {footer}
              </div>
            )}
            {!footer && !desktop && <div className="h-[env(safe-area-inset-bottom)] shrink-0" aria-hidden />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ───────── その他 ───────── */

export function Skeleton({ className }: { className?: string }) {
  return <ShSkeleton className={className} />
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
  tone?: "brand" | "ok"
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {/* イラスト枠：素材が決まったら差し替える */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-[17px] font-semibold">{title}</p>
      {description && <p className="mt-2 max-w-[22rem] text-[14px] leading-relaxed text-muted-foreground">{description}</p>}
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
    <div role={tone === "danger" ? "alert" : "status"} className="flex items-center gap-3 rounded-card bg-card px-4 py-3 shadow-card">
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warn" : "text-primary",
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-foreground">{children}</p>
      {action}
    </div>
  )
}

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
      <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[13px] font-medium text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}

export const INPUT =
  "h-11 w-full rounded-control border border-input bg-card px-3.5 text-[16px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/25"


/* ───────── かんたんな表（セットアップの比較に使う） ───────── */

export function Table({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-control border border-border">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 text-[12.5px] font-semibold text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={cn("px-3 py-2.5 align-top text-[13px] leading-snug", j === 0 ? "font-medium text-foreground" : "text-muted-foreground")}
                >
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
