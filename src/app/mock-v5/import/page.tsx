"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Brand } from "../_components/shell"
import { Button, ButtonLink, Segmented } from "../_components/ui"

type Phase = "importing" | "done" | "error"

const STAGES = ["WebClass から受け取り", "課題を整理", "保存"]

export default function MockImportPage() {
  const [phase, setPhase] = useState<Phase>("importing")
  const [progress, setProgress] = useState(8)

  // 取り込み中の擬似進捗（本番と同じく 90% までゆっくり進む）
  useEffect(() => {
    if (phase !== "importing") return
    const id = setInterval(() => setProgress((p) => (p >= 90 ? p : p + Math.max(1.2, (90 - p) * 0.08))), 120)
    return () => clearInterval(id)
  }, [phase])

  const stage = progress < 35 ? 0 : progress < 70 ? 1 : 2

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <Brand />

        <div className="flex flex-1 flex-col justify-center">
          {phase === "importing" && (
            <div aria-live="polite">
              <p className="text-[24px] font-bold tracking-[-0.01em]">WebClass の課題を取り込んでいます</p>
              <p className="mt-2 text-[15px] text-muted-foreground">このままお待ちください。数秒で終わります。</p>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <ol className="mt-6 space-y-3">
                {STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-[15px]">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        i < stage ? "bg-primary text-primary-foreground" : i === stage ? "border-2 border-primary" : "border-2 border-input",
                      )}
                      aria-hidden
                    >
                      {i < stage && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className={cn(i <= stage ? "font-semibold text-foreground" : "text-muted-foreground")}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center animate-in fade-in-0 zoom-in-95 duration-300">
              {/* 完了アニメーション（Lottie など）を入れる場合はここ */}
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden />
              </span>
              <p className="mt-6 text-[24px] font-bold">12 件を取り込みました</p>
              <p className="mt-2 text-[15px] text-muted-foreground">新しい課題が 2 件、締切が変わった課題が 1 件あります。</p>
              <ButtonLink href="/mock-v5/home" size="lg" className="mt-8 w-full">
                ホームで確認する
              </ButtonLink>
            </div>
          )}

          {phase === "error" && (
            <div className="animate-in fade-in-0 duration-300">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-7 w-7" aria-hidden />
              </span>
              <p className="mt-5 text-[22px] font-bold">取り込めませんでした</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                WebClass のログインが切れている可能性があります。WebClass にログインし直してから、もう一度ブックマークを押してください。
              </p>
              <p className="mt-3 rounded-control bg-muted px-3 py-2 font-mono text-[12px] text-muted-foreground">エラー 401: session expired</p>
              <div className="mt-8 space-y-3">
                <Button size="lg" className="w-full" onClick={() => setPhase("importing")}>
                  もう一度試す
                </Button>
                <ButtonLink href="/mock-v5/help/webclass" variant="ghost" size="lg" className="w-full">
                  取り込み方を確認する
                </ButtonLink>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-card border border-dashed border-input p-3">
          <p className="mb-2 text-center text-[12px] text-muted-foreground">モック用：表示を切り替え</p>
          <Segmented<Phase>
            label="取り込み画面の状態"
            size="sm"
            value={phase}
            onChange={(p) => {
              setPhase(p)
              setProgress(8)
            }}
            options={[
              { value: "importing", label: "取り込み中" },
              { value: "done", label: "完了" },
              { value: "error", label: "エラー" },
            ]}
          />
        </div>
      </div>
    </main>
  )
}
