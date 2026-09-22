"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Copy, ExternalLink, Minus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app/provider"
import { useSession } from "next-auth/react"
import type { NotificationPreset } from "@/lib/notification-store"
import { disablePush, enablePush, getPushSubscription } from "@/lib/push-client"
import { buildBookmarkletCode } from "@/lib/webclass-script"
import { sendTestNotification } from "@/lib/notification-scheduler"
import { MobileHeader, PageBody } from "@/components/app/shell"
import {
  Button,
  ButtonLink,
  Card,
  Field,
  INPUT,
  ListGroup,
  RowStatic,
  Segmented,
  Switch,
  Table,
} from "@/components/app/ui"
import { timeAgo } from "@/lib/assignment-format"

const Yes = () => <Check className="h-4 w-4 text-primary" aria-label="できる" />
const No = () => <Minus className="h-4 w-4 text-muted-foreground/60" aria-label="できない" />

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

const PRESETS: { value: NotificationPreset; label: string }[] = [
  { value: "relaxed", label: "早め" },
  { value: "standard", label: "標準" },
  { value: "urgent", label: "直前" },
]

const PRESET_TIMING: Record<NotificationPreset, string> = {
  relaxed: "締切の24時間前に1回",
  standard: "24時間前と3時間前",
  urgent: "3時間前と1時間前",
}

function Step({
  n,
  title,
  status,
  done,
  optional,
  children,
}: {
  n: number
  title: string
  status: string
  done: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!done)
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
            done ? "bg-primary text-primary-foreground" : "border border-input text-muted-foreground",
          )}
          aria-hidden
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[16px] font-semibold">
            {title}
            {optional && <span className="text-[12px] font-normal text-muted-foreground">任意</span>}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{status}</span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
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
            <div className="space-y-5 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default function SetupPage() {
  const {
    loggedIn,
    syncedAt,
    now,
    settings,
    updateSettings,
    webclassUrl,
    setWebclassUrl,
    courses,
    showToast,
  } = useApp()
  const { data: session } = useSession()
  // メール・プッシュ・トークンは通知設定とは別の場所にある
  const [email, setEmail] = useState(false)
  const [push, setPush] = useState(false)
  const [tokenIssued, setTokenIssued] = useState(false)
  const [permission, setPermission] = useState<"granted" | "default" | "denied">("default")

  useEffect(() => {
    // 通知の許可状態はブラウザにしかないので、マウント後に読む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof Notification !== "undefined") setPermission(Notification.permission)
    getPushSubscription()
      .then((s) => setPush(s != null))
      .catch(() => {})
    if (!loggedIn) return
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((d) => setEmail(d.settings?.emailEnabled ?? false))
      .catch(() => {})
  }, [loggedIn])

  const toggleEmail = async (v: boolean) => {
    setEmail(v)
    const res = await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled: v }),
    }).catch(() => null)
    if (!res?.ok) {
      setEmail(!v)
      showToast("設定を保存できませんでした")
    }
  }

  const togglePush = async (v: boolean) => {
    const ok = v ? await enablePush().catch(() => false) : await disablePush().catch(() => false)
    if (ok) setPush(v)
    else showToast("プッシュ通知を切り替えられませんでした")
  }

  /** サーバで発行する。表示できるのは1度きりなので、返り値をそのまま出す */
  const issueToken = async (): Promise<string> => {
    const res = await fetch("/api/import/token", { method: "POST" }).catch(() => null)
    if (!res?.ok) {
      showToast("トークンを発行できませんでした")
      return ""
    }
    const data = await res.json()
    setTokenIssued(true)
    return data.token ?? ""
  }
  const [device, setDevice] = useState<Device>("pc")
  const [url, setUrl] = useState(webclassUrl)
  const [token, setToken] = useState("")

  const steps = [loggedIn, syncedAt.webclass != null, settings.enabled && (push || email)]
  const doneCount = steps.filter(Boolean).length

  return (
    <>
      <MobileHeader variant="back" title="セットアップ" backHref="/settings" />
      <PageBody desktopTitle="セットアップ">
        <div className="space-y-4">
          <div>
            <p className="px-1 text-[13px] text-muted-foreground">
              {steps.length} つ中 <span className="font-semibold tabular-nums text-foreground">{doneCount}</span> つ完了
            </p>
            <div className="mx-1 mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>

          <Step
            n={1}
            title="Google でログイン"
            done={loggedIn}
            status={
              loggedIn
                ? `接続中・${syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未同期"}に同期`
                : "Classroom の課題を自動で取り込みます"
            }
          >
            <p className="text-[14px] leading-relaxed text-muted-foreground">
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
            {loggedIn ? (
              <div className="flex flex-wrap gap-2">
                <ButtonLink
                  href="https://classroom.google.com/"
                  variant="secondary"
                  size="md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Classroom を開く
                </ButtonLink>
                <ButtonLink href="/settings" variant="secondary" size="md">
                  設定を開く
                </ButtonLink>
              </div>
            ) : (
              <ButtonLink href="/login" size="lg">
                Google でログイン
              </ButtonLink>
            )}
          </Step>

          <Step
            n={2}
            title="WebClass をつなぐ"
            done={syncedAt.webclass != null}
            status={syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "ブックマークを1つ登録すると取り込めます"}
          >
            <p className="text-[14px] leading-relaxed text-muted-foreground">
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

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[14px] font-semibold">A. ブックマークレット（まずこれ）</p>
              <Segmented<Device>
                label="端末"
                value={device}
                onChange={setDevice}
                className="w-full sm:w-[17rem]"
                options={[
                  { value: "pc", label: "PC" },
                  { value: "iphone", label: "iPhone" },
                  { value: "android", label: "Android" },
                ]}
              />
              <ol className="space-y-2">
                {BOOKMARK_STEPS[device].map((t, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <Button
                onClick={async () => {
                  // ブックマークレットは自分のドメインを埋め込んで作る
                  await navigator.clipboard.writeText(buildBookmarkletCode(window.location.origin))
                  showToast("コードをコピーしました")
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
                コードをコピー
              </Button>
              <p className="rounded-control bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
                読み取るのは課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワードや氏名、学籍番号には触れません。
              </p>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[14px] font-semibold">B. 自動で取り込む（PC・任意）</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Chrome に Tampermonkey を入れ、発行したトークンを貼ると、WebClass を開くだけで取り込まれます。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink href="/webclass.user.js" variant="secondary" size="md">
                  スクリプトを追加
                </ButtonLink>
                <Button variant="secondary" disabled={!loggedIn} onClick={() => issueToken().then(setToken)}>
                  {tokenIssued ? "トークンを再発行" : "トークンを発行"}
                </Button>
                {tokenIssued && !token && <span className="text-[13px] text-muted-foreground">発行済み</span>}
              </div>
              {token && (
                <div className="flex items-center gap-2 rounded-control border border-border p-2">
                  <code className="min-w-0 flex-1 truncate px-1 font-mono text-[12px]">{token}</code>
                  <Button size="sm" variant="secondary" onClick={() => showToast("コピーしました")}>
                    コピー
                  </Button>
                </div>
              )}
              {!loggedIn && <p className="text-[13px] text-muted-foreground">自動取り込みにはログインが必要です。</p>}
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
                  <Button className="shrink-0" onClick={() => setWebclassUrl(url.trim())} disabled={url.trim() === webclassUrl}>
                    保存
                  </Button>
                </div>
              </Field>
            </div>
          </Step>

          <Step
            n={3}
            title="通知をオンにする"
            done={settings.enabled && (push || email)}
            status={settings.enabled ? "締切の前に知らせます" : "いまはオフです"}
          >
            <Table
              head={["種類", "届く条件", "ログイン"]}
              rows={[
                ["プッシュ", "アプリを閉じていても届く（iPhone はホーム画面に追加が必要）", "必要"],
                ["メール", "締切の前にメールが届く", "必要"],
                ["ブラウザ", "この端末でアプリを開いているとき", "不要"],
              ]}
            />
            <ListGroup>
              <RowStatic
                label="プッシュ通知"
                description={loggedIn ? "閉じていても届く" : "ログインが必要"}
                right={
                  <Switch
                    label="プッシュ通知"
                    checked={push && loggedIn}
                    disabled={!loggedIn}
                    onChange={(v) => {
                      updateSettings({ enabled: true })
                      togglePush(v)
                    }}
                  />
                }
              />
              <RowStatic
                label="メール"
                description={loggedIn ? session?.user?.email ?? "" : "ログインが必要"}
                right={
                  <Switch
                    label="メール"
                    checked={email && loggedIn}
                    disabled={!loggedIn}
                    onChange={(v) => {
                      updateSettings({ enabled: true })
                      toggleEmail(v)
                    }}
                  />
                }
              />
              <RowStatic
                label="この端末のブラウザ通知"
                description={permission === "granted" ? "許可済み" : "未許可"}
                right={
                  permission === "granted" ? (
                    <Button size="sm" variant="secondary" onClick={() => sendTestNotification()}>
                      テスト
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => togglePush(true)}>
                      許可する
                    </Button>
                  )
                }
              />
            </ListGroup>
            <div>
              <p className="mb-2 text-[14px] font-semibold">いつ知らせる？</p>
              <Segmented<NotificationPreset>
                label="通知のタイミング"
                value={settings.preset}
                onChange={(p) => updateSettings({ preset: p })}
                className="w-full sm:w-[20rem]"
                options={PRESETS}
              />
              <p className="mt-2 text-[13px] text-muted-foreground">{PRESET_TIMING[settings.preset]}</p>
            </div>
          </Step>

          <Step
            n={4}
            title="コースを整える"
            optional
            done={false}
            status={`${courses.filter((c) => !c.hidden).length} コースを表示中`}
          >
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              使っていないコースを隠したり、通知をコース単位で止められます。
            </p>
            <ButtonLink href="/settings/courses" variant="secondary">
              コースを開く
            </ButtonLink>
          </Step>

          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            うまくいかないときは、ヘルプの「安全性とよくある質問」を見てください。
          </p>
        </div>
      </PageBody>
    </>
  )
}
