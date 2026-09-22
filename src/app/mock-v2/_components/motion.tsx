"use client"

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from "motion/react"
import { useEffect } from "react"

/** 動きの基準値。ここ以外でバネの数値を書かない */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 }
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 260, damping: 30 }
export const EASE_OUT: Transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] }

/** 下から少し上がって現れる。画面を開いたときの順番付けに使う */
export function Appear({
  children,
  delay = 0,
  y = 10,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}

/** 数字が 0 から目標値まで動く。動きを減らす設定のときは即表示 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const shown = useTransform(mv, (v) => Math.round(v).toString())

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, mv, reduce])

  return <motion.span className={className}>{shown}</motion.span>
}

export { motion }
