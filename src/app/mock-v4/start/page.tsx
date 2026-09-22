"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Check } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useMock } from "../_components/provider"
import { Brand } from "../_components/shell"
import { Button, ButtonLink, Panel, RowGroup, SettingRow, Switch, Table } from "../_components/ui"

const STEP_LABEL = ["Google", "WebClass", "通知"]

export default function StartPage() {
  const router = useRouter()
  const { controls, setControl, syncedAt, notif, updateNotif, showToast } = useMock()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  const done = [controls.loggedIn, syncedAt.webclass != null, notif.enabled && (notif.push || notif.email)]

  const finish = () => {
    setControl("setupDone", true)
    router.push("/mock-v4/home")
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="flex items-center justify-between">
        <Brand />
        <Link
          href="/mock-v4/home"
          className="rounded-md px-1 py-1 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          あとで
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {STEP_LABEL.map((l, i) => (
          <div key={l} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                done[i] ? "bg-ok text-white" : i === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
              )}
            >
              {done[i] ? <Check className="h-2.5 w-2.5" strokeWidth={4} aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-[12px]", i === step ? "text-foreground" : "text-muted-foreground")}>{l}</span>
            {i < 2 && <span className="h-px flex-1 bg-border" aria-hidden />}
          </div>
        ))}
      </div>

      <div className="relative mt-6 flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col gap-4"
          >
            {step === 0 && (
              <>
                <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Google Classroom をつなぐ</h1>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  ログインすると Classroom の課題が自動で入り、メールとプッシュで通知できるようになります。
                </p>
                <Table
                  head={["", "未ログイン", "ログイン"]}
                  rows={[
                    ["Classroom の自動取得", "—", "○"],
                    ["メール・プッシュ通知", "—", "○"],
                    ["ほかの端末と同期", "—", "○"],
                  ]}
                />
                <div className="mt-auto flex gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setControl("loggedIn", true)
                      showToast("ログインしました（モック）")
                      go(1)
                    }}
                  >
                    Google でログイン
                  </Button>
                  <Button size="lg" onClick={() => go(1)}>
                    あとで
                  </Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-[22px] font-semibold tracking-[-0.01em]">WebClass をつなぐ</h1>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  WebClass には通知も一覧もありません。ブックマークを1つ登録すると、開いて押すだけで取り込めます。
                </p>
                <Table
                  head={["方法", "端末", "自動か"]}
                  rows={[
                    ["ブックマークレット", "スマホ・PC", "手動（1タップ）"],
                    ["ユーザースクリプト", "PC の Chrome", "自動"],
                  ]}
                />
                <div className="mt-auto flex gap-2">
                  <ButtonLink href="/mock-v4/settings/setup" variant="primary" size="lg" className="flex-1">
                    手順を見る
                    <ArrowRight />
                  </ButtonLink>
                  <Button size="lg" onClick={() => go(2)}>
                    あとで
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-[22px] font-semibold tracking-[-0.01em]">通知をオンにする</h1>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  締切の前に知らせます。あとから設定で変えられます。
                </p>
                <RowGroup>
                  <SettingRow
                    label="プッシュ通知"
                    description={controls.loggedIn ? "閉じていても届く" : "ログインが必要"}
                    right={
                      <Switch
                        label="プッシュ通知"
                        checked={notif.push && controls.loggedIn}
                        disabled={!controls.loggedIn}
                        onChange={(v) => updateNotif({ push: v, enabled: true })}
                      />
                    }
                  />
                  <SettingRow
                    label="メール"
                    description={controls.loggedIn ? "hinata.sato@example.ac.jp" : "ログインが必要"}
                    right={
                      <Switch
                        label="メール"
                        checked={notif.email && controls.loggedIn}
                        disabled={!controls.loggedIn}
                        onChange={(v) => updateNotif({ email: v, enabled: true })}
                      />
                    }
                  />
                </RowGroup>
                <Panel className="p-3">
                  <p className="text-[13px] text-muted-foreground">
                    タイミングは「24時間前と3時間前」が既定です。設定 › 通知 で変えられます。
                  </p>
                </Panel>
                <Button variant="primary" size="lg" className="mt-auto w-full" onClick={finish}>
                  はじめる
                </Button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-6">
        <Button size="sm" variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
          戻る
        </Button>
        {step < 2 && (
          <Button size="sm" variant="ghost" onClick={() => go(step + 1)}>
            次へ
            <ArrowRight />
          </Button>
        )}
      </div>
    </main>
  )
}
