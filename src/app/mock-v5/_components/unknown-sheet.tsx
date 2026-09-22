"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CheckCheck } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useMock } from "./provider"
import { Button, Sheet } from "./ui"

/**
 * 提出状況が不明な課題をまとめて片づけるシート。
 * WebClass は提出したかどうかが取れないことがあるので、ここで1件ずつ決める。
 */
export function UnknownSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assignments, courseById, setStatus, showToast } = useMock()
  const unknown = assignments.filter((a) => a.status === "unknown")

  const decide = (id: string, submitted: boolean) => {
    setStatus(id, submitted ? "submitted" : "not_submitted")
    if (unknown.length === 1) {
      showToast("不明な課題はなくなりました")
      onClose()
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="提出状況を確認">
      <div className="space-y-4 pt-1">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          WebClass から提出したかどうかが取れなかった課題です。出したかどうかを選ぶと、リストとグラフに反映されます。
        </p>

        {unknown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCheck className="h-8 w-8 text-ok" strokeWidth={1.75} aria-hidden />
            <p className="text-[15px] font-medium">不明な課題はありません</p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-card border border-border">
            <AnimatePresence initial={false}>
              {unknown.map((a) => {
                const course = courseById(a.courseId)
                return (
                  <motion.li
                    key={a.id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-b border-border last:border-b-0"
                  >
                    <div className="px-4 py-3">
                      <p className="line-clamp-2 text-[15px] leading-snug">{a.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {course?.name}
                        {a.due && ` ・ ${format(a.due, "M月d日(E) HH:mm", { locale: ja })}`}
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <Button size="sm" onClick={() => decide(a.id, true)}>
                          提出した
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => decide(a.id, false)}>
                          まだ
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Sheet>
  )
}
