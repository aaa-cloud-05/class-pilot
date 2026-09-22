"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Brand } from "../_components/shell"
import { Button, ButtonLink, Panel, Segmented } from "../_components/ui"

type Phase = "importing" | "done" | "error"
const STAGES = ["WebClass から受け取り", "課題を整理", "保存"]

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>("importing")
  const [progress, setProgress] = useState(6)

  useEffect(() => {
    if (phase !== "importing") return
    const id = setInterval(() => setProgress((p) => (p >= 92 ? p : p + Math.max(1.5, (92 - p) * 0.09))), 110)
    return () => clearInterval(id)
  }, [phase])

  const stage = progress < 35 ? 0 : progress < 70 ? 1 : 2

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[22rem] flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <Brand />

      <div className="flex flex-1 flex-col justify-center py-10">
        {phase === "importing" && (
          <div aria-live="polite">
            <p className="text-[20px] font-semibold tracking-[-0.01em]">WebClass を取り込んでいます</p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.2 }} />
            </div>
            <ol className="mt-5 space-y-2.5">
              {STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      i < stage ? "border-ok bg-ok text-white" : i === stage ? "border-primary" : "border-border",
                    )}
                    aria-hidden
                  >
                    {i < stage && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                  </span>
                  <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ok text-white">
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
            </span>
            <p className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">12 件を取り込みました</p>
            <ul className="num mt-2 space-y-0.5 text-[13px] text-muted-foreground">
              <li>新しい課題 2 件</li>
              <li>締切が変わった課題 1 件</li>
              <li>提出済みになった課題 3 件</li>
            </ul>
            <ButtonLink href="/mock-v4/home" variant="primary" size="lg" className="mt-5 w-full">
              ホームで見る
            </ButtonLink>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">取り込めませんでした</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              WebClass のログインが切れている可能性があります。ログインし直してから、もう一度ブックマークを押してください。
            </p>
            <Panel className="num mt-3 px-3 py-2 text-[12px] text-muted-foreground">401 session expired</Panel>
            <div className="mt-5 flex gap-2">
              <Button variant="primary" size="lg" onClick={() => setPhase("importing")}>
                もう一度
              </Button>
              <ButtonLink href="/mock-v4/settings/help/webclass" size="lg">
                手順を見る
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </div>

      <div className="rounded-md border border-dashed border-border p-2">
        <p className="mb-1.5 text-center text-[11px] text-muted-foreground">モック用：表示の切り替え</p>
        <Segmented<Phase>
          label="状態"
          className="w-full"
          value={phase}
          onChange={(p) => {
            setPhase(p)
            setProgress(6)
          }}
          options={[
            { value: "importing", label: "取り込み中" },
            { value: "done", label: "完了" },
            { value: "error", label: "エラー" },
          ]}
        />
      </div>
    </main>
  )
}
