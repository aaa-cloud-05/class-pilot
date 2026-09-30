"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Copy, ExternalLink, Minus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app/provider"
import { useSession } from "next-auth/react"
import { buildBookmarkletCode } from "@/lib/webclass-script"
import { MobileHeader, PageBody, WEBCLASS_URL_ANCHOR } from "@/components/app/shell"
import { useEmailNotification } from "@/hooks/useEmailNotification"
import { ReminderPicker } from "@/components/app/reminder-picker"
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
    "URL 欄にコードを貼って保存",
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
    "WebClass を開き、アドレスバーに「セットアップ」と入力して、そのブックマークを選ぶ",
  ],
}

function Step({
  n,
  title,
  status,
  done,
  optional,
  anchor,
  children,
}: {
  n: number
  title: string
  status: string
  done: boolean
  optional?: boolean
  /** URL の # がこれなら、閉じていても開いてその id の要素まで送る */
  anchor?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!done)
  useEffect(() => {
    if (!anchor || window.location.hash !== `#${anchor}`) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true)
    // 開くアニメーション（0.2秒）のあとに送る
    const t = setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "center" }), 250)
    return () => clearTimeout(t)
  }, [anchor])
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
    webclassUrl,
    setWebclassUrl,
    courses,
    showToast,
  } = useApp()
  const { data: session } = useSession()
  // メールは通知設定とは別の場所（サーバ）にある。通知はメール一本
  const { on: emailOn, setOn: setEmailOn } = useEmailNotification()
  const [device, setDevice] = useState<Device>("pc")
  const [url, setUrl] = useState(webclassUrl)
  // 保存済みの URL は端末からマウント後に読まれる。この画面を直接開いたときも欄に入るようにする
  const [loadedUrl, setLoadedUrl] = useState(webclassUrl)
  if (loadedUrl !== webclassUrl) {
    setLoadedUrl(webclassUrl)
    setUrl(webclassUrl)
  }

  const steps = [loggedIn, syncedAt.webclass != null, emailOn === true]
  const doneCount = steps.filter(Boolean).length

  return (
    <>
      <MobileHeader variant="back" title="セットアップ" backHref="/settings" />
      <PageBody desktopTitle="セットアップ">
        <div className="space-y-4">
          {/* 使い方の動画（video/ の guide を圧縮したもの）。開いただけでは読み込まず、再生を押したときに読み込む */}
          <Card className="overflow-hidden">
            <video
              className="block aspect-video w-full bg-muted"
              src="/videos/guide.mp4"
              poster="/videos/guide-poster.jpg"
              controls
              playsInline
              preload="none"
              aria-label="使い方の動画"
            />
            <div className="px-4 py-3">
              <p className="text-[15px] font-semibold">使い方の動画</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Classroom と WebClass のつなぎ方（<span className="tabular-nums">1分30秒</span>）
              </p>
            </div>
          </Card>

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
              ログインすると Classroom の課題が自動で入り、締切の前にメールで通知できるようになります。ログインしなくても、WebClass
              の取り込みと手動の追加は使えます。
            </p>
            <Table
              head={["できること", "未ログイン", "ログイン"]}
              rows={[
                ["課題を手で追加・編集", <Yes key="a" />, <Yes key="b" />],
                ["WebClass の取り込み", <Yes key="c" />, <Yes key="d" />],
                ["Classroom の自動取得", <No key="e" />, <Yes key="f" />],
                ["メール通知", <No key="g" />, <Yes key="h" />],
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
            anchor={WEBCLASS_URL_ANCHOR}
          >
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              WebClass には通知も課題一覧もありません。UnionFetch に取り込むことで、締切の通知ができるようになります。
            </p>
            <Table
              head={["つなぎ方", "何のため", "端末", "自動か"]}
              rows={[
                ["ブックマークレット", "課題を取り込む", "スマホ・PC", "手動（1タップ）"],
                ["自動取り込み", "WebClass を開くだけで取り込む", "PC", "検証中"],
                ["WebClass の URL", "「開く」ボタンの行き先", "共通", "取り込みには使わない"],
              ]}
            />

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[14px] font-semibold">A. ブックマークレット</p>
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                <Link href="/settings/help/webclass" className="py-2 text-[14px] font-medium text-primary hover:underline">
                  このコードは何をする？
                </Link>
              </div>
              <p className="rounded-control bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
                UnionFetch に送るのは、コース名・課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワードは読み取らず、学籍番号・氏名・得点は取り出しません。
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[14px] font-semibold">B. 自動で取り込む（検証中）</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                WebClass を開くだけで自動で取り込む機能は、いまは検証中のため使えません。A のブックマークを使ってください。
              </p>
            </div>

            <div id={WEBCLASS_URL_ANCHOR} className="border-t border-border pt-4">
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
            title="メール通知をオンにする"
            done={emailOn === true}
            status={emailOn ? "締切の前にメールで知らせます" : "いまはオフです"}
          >
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              締切の前に、ログインしている Google アカウントのメールアドレスへ届きます。通知機能のない WebClass の課題にも届きます。
            </p>
            <ListGroup>
              <RowStatic
                label="締切をメールで知らせる"
                description={loggedIn ? session?.user?.email ?? "" : "ログインが必要"}
                right={
                  <Switch
                    label="締切をメールで知らせる"
                    checked={emailOn === true}
                    disabled={!loggedIn || emailOn == null}
                    onChange={setEmailOn}
                  />
                }
              />
            </ListGroup>
            <div>
              <p className="mb-2 text-[14px] font-semibold">いつ知らせる？</p>
              <ReminderPicker />
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
