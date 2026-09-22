"use client"

import { useState } from "react"
import { Check, ChevronDown, Copy, ExternalLink, Minus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useMock, type Preset } from "../../../_components/provider"
import { Content, TopBar } from "../../../_components/shell"
import {
  Button,
  ButtonLink,
  Field,
  INPUT,
  Note,
  Panel,
  RowGroup,
  Segmented,
  SettingRow,
  Switch,
  Table,
} from "../../../_components/ui"
import { timeAgo } from "../../../_lib/format"

const Yes = () => <Check className="h-3.5 w-3.5 text-ok" aria-label="できる" />
const No = () => <Minus className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="できない" />

type Device = "pc" | "iphone" | "android"

const BOOKMARK_STEPS: Record<Device, string[]> = {
  pc: [
    "下の「コードをコピー」を押す",
    "いま開いているページをブックマークする（Ctrl / ⌘ + D）",
    "そのブックマークを右クリック →「編集」",
    "URL 欄にコードを貼り、名前を「WebClass を取り込む」にして保存",
    "WebClass を開いた状態で、そのブックマークをクリック",
  ],
  iphone: [
    "下の「コードをコピー」を押す",
    "Safari でこのページをブックマークに追加",
    "ブックマーク一覧 →「編集」→ 追加した項目を開く",
    "アドレス欄にコードを貼って保存",
    "WebClass を開いた状態で、そのブックマークを開く",
  ],
  android: [
    "下の「コードをコピー」を押す",
    "Chrome の ☆ でこのページをブックマーク",
    "ブックマークを編集し、URL をコードに置き換える",
    "WebClass を開き、アドレスバーにブックマーク名を入力して選ぶ",
  ],
}

function StepCard({
  n,
  title,
  status,
  done,
  optional,
  defaultOpen,
  children,
}: {
  n: number
  title: string
  status: string
  done: boolean
  optional?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? !done)
  return (
    <Panel className="overflow-hidden bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <span
          className={cn(
            "num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]",
            done ? "bg-ok text-white" : "border border-border text-muted-foreground",
          )}
          aria-hidden
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-medium">
            {title}
            {optional && <span className="text-[11px] font-normal text-muted-foreground">任意</span>}
          </span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{status}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border"
          >
            <div className="space-y-4 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "relaxed", label: "24時間前" },
  { value: "standard", label: "24h + 3h" },
  { value: "urgent", label: "3h + 1h" },
]

export default function SetupPage() {
  const {
    controls,
    setControl,
    syncedAt,
    now,
    notif,
    updateNotif,
    webclassUrl,
    setWebclassUrl,
    tokenIssued,
    issueToken,
    courses,
    showToast,
  } = useMock()
  const [device, setDevice] = useState<Device>("pc")
  const [url, setUrl] = useState(webclassUrl)
  const [token, setToken] = useState("")

  const steps = [controls.loggedIn, syncedAt.webclass != null, notif.enabled && (notif.push || notif.email)]
  const doneCount = steps.filter(Boolean).length

  return (
    <>
      <TopBar title="セットアップ" back="/mock-v4/settings" />
      <Content className="lg:max-w-2xl">
        <div className="space-y-4">
          <div>
            <p className="num text-[13px] text-muted-foreground">
              {steps.length} つ中 <span className="text-foreground">{doneCount}</span> つ完了
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-ok"
                animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          {/* 1. Google */}
          <StepCard
            n={1}
            title="Google でログイン"
            done={controls.loggedIn}
            status={
              controls.loggedIn
                ? `接続中・${syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未同期"}に同期`
                : "Classroom の課題を自動で取り込みます"
            }
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              ログインすると Classroom の課題が自動で入り、メールとプッシュで通知できるようになります。ログインしなくても、WebClass
              の取り込みと手動の追加は使えます。
            </p>
            <Table
              head={["できること", "未ログイン", "ログイン"]}
              rows={[
                ["課題を手で追加・編集", <Yes key="a" />, <Yes key="b" />],
                ["WebClass の取り込み", <Yes key="c" />, <Yes key="d" />],
                ["Classroom の自動取得", <No key="e" />, <Yes key="f" />],
                ["メール・プッシュ通知", <No key="g" />, <Yes key="h" />],
                ["ほかの端末と同期", <No key="i" />, <Yes key="j" />],
              ]}
            />
            {controls.loggedIn ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => showToast("Classroom を開きます（モック）")}>
                  <ExternalLink />
                  Classroom を開く
                </Button>
                <Button size="sm" onClick={() => setControl("loggedIn", false)}>
                  ログアウト
                </Button>
              </div>
            ) : (
              <ButtonLink href="/mock-v4/login" size="md" variant="primary">
                Google でログイン
              </ButtonLink>
            )}
          </StepCard>

          {/* 2. WebClass */}
          <StepCard
            n={2}
            title="WebClass をつなぐ"
            done={syncedAt.webclass != null}
            status={
              syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "ブックマークを1つ登録すると取り込めます"
            }
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              WebClass には通知も課題一覧もありません。UnionFetch に取り込むことで、締切の通知ができるようになります。
            </p>
            <Table
              head={["つなぎ方", "何のため", "端末", "自動か"]}
              rows={[
                ["ブックマークレット", "課題を取り込む", "スマホ・PC", "手動（1タップ）"],
                ["ユーザースクリプト", "自動で取り込む", "PC の Chrome", "自動"],
                ["WebClass の URL", "「開く」ボタンの行き先", "共通", "取り込みには使わない"],
              ]}
            />

            <div className="space-y-2.5 border-t border-border pt-4">
              <p className="text-[13px] font-medium">A. ブックマークレット（まずこれ）</p>
              <Segmented<Device>
                label="端末"
                value={device}
                onChange={setDevice}
                className="w-full sm:w-[15rem]"
                options={[
                  { value: "pc", label: "PC" },
                  { value: "iphone", label: "iPhone" },
                  { value: "android", label: "Android" },
                ]}
              />
              <ol className="space-y-1.5">
                {BOOKMARK_STEPS[device].map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className="num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <Button size="sm" variant="primary" onClick={() => showToast("コードをコピーしました（モック）")}>
                <Copy />
                コードをコピー
              </Button>
              <Note>読み取るのは課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワードや氏名には触れません。</Note>
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              <p className="text-[13px] font-medium">B. 自動で取り込む（PC・任意）</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Chrome に Tampermonkey を入れ、発行したトークンを貼ると、WebClass を開くだけで取り込まれます。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => showToast("スクリプトを開きます（モック）")}>
                  スクリプトを追加
                </Button>
                <Button size="sm" disabled={!controls.loggedIn} onClick={() => setToken(issueToken())}>
                  {tokenIssued ? "トークンを再発行" : "トークンを発行"}
                </Button>
                {tokenIssued && !token && <span className="text-[12px] text-muted-foreground">発行済み</span>}
              </div>
              {token && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                  <code className="num min-w-0 flex-1 truncate px-1 text-[12px]">{token}</code>
                  <Button size="sm" onClick={() => showToast("コピーしました")}>
                    コピー
                  </Button>
                </div>
              )}
              {!controls.loggedIn && <p className="text-[12px] text-muted-foreground">自動取り込みにはログインが必要です。</p>}
            </div>

            <div className="border-t border-border pt-4">
              <Field label="C. WebClass の URL" hint="「WebClass を開く」ボタンの行き先です。この端末にだけ保存します。">
                <div className="flex gap-2">
                  <input
                    type="url"
                    inputMode="url"
                    className={INPUT}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…/webclass/"
                  />
                  <Button onClick={() => setWebclassUrl(url.trim())} disabled={url.trim() === webclassUrl}>
                    保存
                  </Button>
                </div>
              </Field>
            </div>
          </StepCard>

          {/* 3. 通知 */}
          <StepCard
            n={3}
            title="通知をオンにする"
            done={notif.enabled && (notif.push || notif.email)}
            status={notif.enabled ? "締切の前に知らせます" : "いまはオフです"}
          >
            <Table
              head={["種類", "届く条件", "ログイン"]}
              rows={[
                ["プッシュ", "アプリを閉じていても届く（iPhone はホーム画面に追加が必要）", "必要"],
                ["メール", "締切の前にメールが届く", "必要"],
                ["ブラウザ", "この端末でアプリを開いているとき", "不要"],
              ]}
            />
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
              <SettingRow
                label="この端末のブラウザ通知"
                description={notif.permission === "granted" ? "許可済み" : "未許可"}
                right={
                  notif.permission === "granted" ? (
                    <Button size="sm" onClick={() => showToast("テスト通知を送りました（モック）")}>
                      テスト
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => updateNotif({ permission: "granted" })}>
                      許可する
                    </Button>
                  )
                }
              />
            </RowGroup>
            <div>
              <p className="mb-1.5 text-[13px] font-medium">いつ知らせる？</p>
              <Segmented<Preset>
                label="通知のタイミング"
                value={notif.preset}
                onChange={(p) => updateNotif({ preset: p })}
                className="w-full sm:w-[18rem]"
                options={PRESETS}
              />
            </div>
          </StepCard>

          {/* 4. コース（任意） */}
          <StepCard
            n={4}
            title="コースを整える"
            optional
            done={false}
            defaultOpen={false}
            status={`${courses.filter((c) => !c.hidden).length} コースを表示中`}
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              使っていないコースを隠したり、通知をコース単位で止められます。
            </p>
            <ButtonLink href="/mock-v4/settings/courses" size="sm">
              コースを開く
            </ButtonLink>
          </StepCard>

          <p className="px-1 text-[12px] text-muted-foreground">
            うまくいかないときは{" "}
            <ButtonLink href="/mock-v4/settings/help" variant="ghost" size="sm" className="h-auto px-0 underline">
              よくある質問
            </ButtonLink>{" "}
            を見てください。
          </p>
        </div>
      </Content>
    </>
  )
}
