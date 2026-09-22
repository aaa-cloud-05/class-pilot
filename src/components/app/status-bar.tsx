"use client"

import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import type { ViewAssignment } from "@/lib/assignment-view"
import { CAT_BG, CAT_ORDER, countByCat } from "@/lib/status"

/**
 * その期間の課題を状態ごとの色で全部ぶん並べた帯。
 * ホームの「今週」とカレンダーの「この週／この月」で同じものを使う。
 * 色は `src/lib/status.ts` が決める。ここでは決めない。
 */
export function StatusBar({
  items,
  now,
  className,
}: {
  items: ViewAssignment[]
  now: Date
  className?: string
}) {
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
