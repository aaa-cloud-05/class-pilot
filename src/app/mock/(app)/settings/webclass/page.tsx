"use client"

import { useState } from "react"
import Link from "next/link"
import { Bookmark, Copy, ExternalLink, KeyRound, Puzzle, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock } from "../../../_components/provider"
import { MobileHeader, PageBody } from "../../../_components/shell"
import { Button, Card, INPUT, ListGroup, RowLink } from "../../../_components/ui"
import { timeAgo } from "../../../_lib/format"

function Step({
  n,
  icon: Icon,
  title,
  desc,
  action,
  done,
}: {
  n: number
  icon: typeof Puzzle
  title: string
  desc: string
  action: React.ReactNode
  done?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold",
          done ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2",
        )}
        aria-hidden
      >
        {done ? <Icon className="h-[18px] w-[18px]" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{desc}</p>
      </div>
      {action}
    </div>
  )
}

export default function MockWebclassSettingsPage() {
  const { syncedAt, now, webclassUrl, setWebclassUrl, tokenIssued, issueToken, controls, showToast } = useMock()
  const [url, setUrl] = useState(webclassUrl)
  const [token, setToken] = useState("")
  const [confirmReissue, setConfirmReissue] = useState(false)

  const onIssue = () => {
    if (tokenIssued && !confirmReissue) {
      setConfirmReissue(true)
      return
    }
    setConfirmReissue(false)
    setToken(issueToken())
  }

  return (
    <>
      <MobileHeader variant="back" title="WebClass 連携" backHref="/mock/settings" />
      <PageBody desktopTitle="WebClass 連携">
        <div className="space-y-7">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className={cn("h-2.5 w-2.5 rounded-full", syncedAt.webclass ? "bg-ok" : "bg-line-strong")} aria-hidden />
              <p className="flex-1 text-[16px] font-semibold">
                {syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "まだ取り込んでいません"}
              </p>
              <Button variant="secondary" size="sm" disabled={!webclassUrl} onClick={() => showToast("WebClass を開きます（モック）")}>
                開く
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              WebClass には通知の仕組みがないため、UnionFetch に取り込んでから通知します。
            </p>
          </Card>

          <ListGroup title="取り込み方">
            <RowLink
              href="/mock/help/webclass"
              icon={Bookmark}
              iconBg="#2f6bff"
              label="ブックマークレットで取り込む"
              description="スマホ・PC 共通。WebClass を開いて押すだけ"
            />
          </ListGroup>

          <section>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-ink-3">自動で取り込む（PC・任意）</h2>
            <Card className="overflow-hidden">
              <p className="px-4 pb-1 pt-4 text-[14px] leading-relaxed text-ink-2">
                PC の Chrome に Tampermonkey を入れておくと、WebClass を開くだけで自動で取り込まれます。
              </p>
              <div className="divide-y divide-line">
                <Step
                  n={1}
                  icon={Puzzle}
                  title="Tampermonkey を入れる"
                  desc="Chrome ウェブストアから追加"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => showToast("Chrome ウェブストアを開きます（モック）")}>
                      入手
                    </Button>
                  }
                />
                <Step
                  n={2}
                  icon={ScrollText}
                  title="スクリプトを入れる"
                  desc="開いた画面で「インストール」を押す"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => showToast("スクリプトを開きます（モック）")}>
                      入れる
                    </Button>
                  }
                />
                <Step
                  n={3}
                  icon={KeyRound}
                  title="トークンを貼り付ける"
                  desc={tokenIssued ? "発行済み。WebClass で聞かれたら貼り付け" : "WebClass を開いたときに聞かれます"}
                  done={tokenIssued && !token}
                  action={
                    <Button size="sm" variant={tokenIssued ? "secondary" : "primary"} onClick={onIssue} disabled={!controls.loggedIn}>
                      {tokenIssued ? "再発行" : "発行"}
                    </Button>
                  }
                />
              </div>

              {confirmReissue && (
                <div className="mx-4 mb-4 rounded-control bg-warn-soft p-3">
                  <p className="text-[14px] font-semibold text-warn">再発行すると、設定済みの PC では同期が止まります</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setConfirmReissue(false)}>
                      やめる
                    </Button>
                    <Button size="sm" onClick={onIssue}>
                      再発行する
                    </Button>
                  </div>
                </div>
              )}

              {token && (
                <div className="mx-4 mb-4 rounded-control bg-ok-soft p-3">
                  <p className="text-[14px] font-semibold text-ok">この画面を離れると、もう表示できません。いまコピーしてください</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-[8px] bg-surface px-3 py-2 font-mono text-[13px]">{token}</code>
                    <Button size="sm" variant="secondary" onClick={() => showToast("コピーしました")}>
                      <Copy className="h-4 w-4" aria-hidden />
                      コピー
                    </Button>
                  </div>
                </div>
              )}
              {!controls.loggedIn && <p className="px-4 pb-4 text-[13px] text-ink-3">自動で取り込むには Google でのログインが必要です。</p>}
            </Card>
            <p className="px-4 pt-2 text-[13px] leading-relaxed text-ink-3">
              うまくいかないときは{" "}
              <Link href="/mock/help/webclass#auto" className="font-semibold text-brand-text hover:underline">
                自動取り込みの手順と対処
              </Link>
              を見てください。
            </p>
          </section>

          <section>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-ink-3">WebClass の URL</h2>
            <Card className="p-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  inputMode="url"
                  aria-label="WebClass の URL"
                  className={INPUT}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…/webclass/"
                />
                <Button className="h-12" onClick={() => setWebclassUrl(url.trim())} disabled={url.trim() === webclassUrl}>
                  保存
                </Button>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                「WebClass を開く」ボタンの行き先です。所属校の WebClass のログインページを入れてください（この端末にだけ保存）。
              </p>
            </Card>
          </section>
        </div>
      </PageBody>
    </>
  )
}
