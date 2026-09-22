"use client"

import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment } from "../_lib/data"

/**
 * 提出状況の分類。**色はここだけで決める**（カレンダーのドットもヘルプの説明図もここを見る）。
 * 青＝提出済み / 赤＝期限切れ / 黄＝24時間以内 / 濃い灰＝まだ先の未提出 / 薄い灰＝不明
 */
export type Cat = "overdue" | "soon" | "open" | "unknown" | "done"

export const CAT_ORDER: Cat[] = ["overdue", "soon", "open", "unknown", "done"]

export const CAT_BG: Record<Cat, string> = {
  overdue: "bg-destructive",
  soon: "bg-[var(--ui-warn-fill)]",
  open: "bg-muted-foreground/45",
  unknown: "bg-muted-foreground/25",
  done: "bg-primary",
}

export function catOf(a: MockAssignment, now: Date): Cat {
  if (a.status === "submitted") return "done"
  if (a.status === "unknown") return "unknown"
  if (!a.due) return "open"
  const diff = a.due.getTime() - now.getTime()
  if (diff < 0) return "overdue"
  if (diff < 24 * 3600_000) return "soon"
  return "open"
}

export function countByCat(items: MockAssignment[], now: Date): Record<Cat, number> {
  const out: Record<Cat, number> = { overdue: 0, soon: 0, open: 0, unknown: 0, done: 0 }
  for (const a of items) out[catOf(a, now)] += 1
  return out
}

/**
 * その期間の課題を状態ごとの色で全部ぶん並べた帯。
 * ホームの「今週」とカレンダーの「この週／この月」で同じものを使う。
 */
export function StatusBar({ items, now, className }: { items: MockAssignment[]; now: Date; className?: string }) {
  const reduce = useReducedMotion()
  const counts = countByCat(items, now)
  const total = items.length

  return (
    <motion.div
      className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {total > 0 &&
        CAT_ORDER.map((c, i) =>
          counts[c] === 0 ? null : (
            <motion.span
              key={c}
              className={cn("h-full shrink-0", CAT_BG[c])}
              initial={{ width: reduce ? `${(counts[c] / total) * 100}%` : 0 }}
              animate={{ width: `${(counts[c] / total) * 100}%` }}
              transition={{ duration: 0.75, delay: 0.16 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
            />
          ),
        )}
    </motion.div>
  )
}
