"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock } from "../../../_components/provider"
import { Content, TopBar } from "../../../_components/shell"
import { Badge, Button, ButtonLink, Field, INPUT, Panel, SectionTitle, Table } from "../../../_components/ui"
import { timeAgo } from "../../../_lib/format"

function ConnectionCard({
  name,
  state,
  detail,
  children,
}: {
  name: string
  state: "connected" | "partial" | "off"
  detail: string
  children?: React.ReactNode
}) {
  return (
    <Panel className="overflow-hidden bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[14px] font-medium">{name}</span>
            <Badge tone={state === "connected" ? "ok" : state === "partial" ? "warn" : "default"}>
              {state === "connected" ? "接続中" : state === "partial" ? "一部のみ" : "未接続"}
            </Badge>
          </span>
          <span className="num mt-0.5 block text-[12px] text-muted-foreground">{detail}</span>
        </span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Panel>
  )
}

export default function ConnectionsPage() {
  const { controls, syncedAt, now, refresh, syncing, webclassUrl, setWebclassUrl, tokenIssued, issueToken, showToast } =
    useMock()
  const [url, setUrl] = useState(webclassUrl)
  const [token, setToken] = useState("")

  return (
    <>
      <TopBar title="接続" back="/mock-v3/settings" />
      <Content className="lg:max-w-2xl">
        <div className="space-y-6">
          <ConnectionCard
            name="Google Classroom"
            state={controls.loggedIn ? "connected" : "off"}
            detail={
              controls.loggedIn && syncedAt.classroom
                ? `${timeAgo(syncedAt.classroom, now)}に同期・自動で取り込みます`
                : "ログインすると課題を自動で取り込みます"
            }
          >
            {controls.loggedIn ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={refresh} disabled={syncing}>
                  <RefreshCw className={cn(syncing && "animate-spin")} />
                  今すぐ同期
                </Button>
                <Button size="sm" onClick={() => showToast("Classroom を開きます（モック）")}>
                  <ExternalLink />
                  Classroom を開く
                </Button>
              </div>
            ) : (
              <ButtonLink href="/mock-v3/login" size="sm" variant="primary">
                Google でログイン
              </ButtonLink>
            )}
          </ConnectionCard>

          <ConnectionCard
            name="WebClass"
            state={syncedAt.webclass ? (tokenIssued ? "connected" : "partial") : "off"}
            detail={
              syncedAt.webclass ? `${timeAgo(syncedAt.webclass, now)}に取り込み` : "まだ一度も取り込んでいません"
            }
          >
            <div>
              <p className="text-[13px] text-muted-foreground">
                WebClass には通知も課題一覧もありません。UnionFetch に取り込むことで通知できるようになります。
              </p>
              <div className="mt-3">
                <Table
                  head={["つなぎ方", "端末", "手間", "自動"]}
                  rows={[
                    [
                      <span key="a" className="flex items-center gap-1.5">
                        ブックマークレット
                        <Badge tone="outline">基本</Badge>
                      </span>,
                      "スマホ・PC",
                      "最初だけ登録",
                      "手動（WebClass で1タップ）",
                    ],
                    ["ユーザースクリプト", "PC のみ", "拡張機能を入れる", "自動（WebClass を開くだけ）"],
                    ["WebClass の URL", "共通", "貼り付けるだけ", "取り込みには使わない"],
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink href="/mock-v3/settings/help/webclass" size="sm" variant="primary">
                  つなぎ方を見る
                </ButtonLink>
                <Button size="sm" onClick={() => showToast("WebClass を開きます（モック）")} disabled={!webclassUrl}>
                  <ExternalLink />
                  WebClass を開く
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <SectionTitle>自動で取り込む（PC・任意）</SectionTitle>
              <p className="mb-3 text-[13px] text-muted-foreground">
                Chrome に Tampermonkey を入れ、発行したトークンを貼ると、WebClass を開くだけで取り込まれます。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => showToast("スクリプトを開きます（モック）")}>
                  スクリプトを追加
                </Button>
                <Button
                  size="sm"
                  variant={tokenIssued ? "secondary" : "primary"}
                  disabled={!controls.loggedIn}
                  onClick={() => setToken(issueToken())}
                >
                  {tokenIssued ? "トークンを再発行" : "トークンを発行"}
                </Button>
                {tokenIssued && !token && (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    発行済み
                  </span>
                )}
              </div>
              {token && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card p-2">
                  <code className="num min-w-0 flex-1 truncate px-1 text-[12px]">{token}</code>
                  <Button size="sm" onClick={() => showToast("コピーしました")}>
                    <Copy />
                    コピー
                  </Button>
                </div>
              )}
              {!controls.loggedIn && (
                <p className="mt-2 text-[12px] text-muted-foreground">自動取り込みには Google ログインが必要です。</p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <Field label="WebClass の URL" hint="「WebClass を開く」ボタンの行き先です。この端末にだけ保存します。">
                <div className="flex gap-2">
                  <input
                    type="url"
                    inputMode="url"
                    className={INPUT}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…/webclass/"
                  />
                  <Button size="md" onClick={() => setWebclassUrl(url.trim())} disabled={url.trim() === webclassUrl}>
                    保存
                  </Button>
                </div>
              </Field>
            </div>
          </ConnectionCard>

          <p className="px-1 text-[12px] text-muted-foreground">
            うまくいかないときは{" "}
            <Link href="/mock-v3/settings/help" className="text-primary hover:underline">
              ヘルプ
            </Link>
            へ。
          </p>
        </div>
      </Content>
    </>
  )
}
