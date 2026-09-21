"use client"

import { useState } from "react"
import { Copy } from "lucide-react"
import { useMock } from "../../../../_components/provider"
import { Content, TopBar } from "../../../../_components/shell"
import { Button, Note, Panel, SectionTitle, Segmented } from "../../../../_components/ui"

type Device = "pc" | "iphone" | "android"

const STEPS: Record<Device, string[]> = {
  pc: [
    "下の「コードをコピー」を押す",
    "いま開いているページをブックマークする（Ctrl / ⌘ + D）",
    "そのブックマークを右クリック →「編集」",
    "URL 欄にコピーしたコードを貼り、名前を「WebClass を取り込む」にして保存",
    "WebClass を開いた状態で、そのブックマークをクリック",
  ],
  iphone: [
    "下の「コードをコピー」を押す",
    "Safari でこのページをブックマークに追加",
    "ブックマーク一覧 →「編集」→ 追加した項目を開く",
    "アドレス欄にコピーしたコードを貼って保存",
    "WebClass を開いた状態で、そのブックマークを開く",
  ],
  android: [
    "下の「コードをコピー」を押す",
    "Chrome の ☆ でこのページをブックマーク",
    "ブックマークを編集し、URL をコピーしたコードに置き換える",
    "WebClass を開き、アドレスバーにブックマーク名を入力して選ぶ",
  ],
}

export default function WebclassGuide() {
  const { showToast } = useMock()
  const [device, setDevice] = useState<Device>("pc")

  return (
    <>
      <TopBar title="WebClass をつなぐ" back="/mock-v3/settings/help" />
      <Content className="lg:max-w-2xl">
        <div className="space-y-6">
          <p className="text-[14px] leading-relaxed">
            WebClass には通知も課題一覧もありません。ブックマークに小さなコードを1つ登録しておくと、WebClass
            を開いて押すだけで課題をまとめて取り込めます。
          </p>

          <Note>
            読み取るのは課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワードや氏名、学籍番号、点数には触れません。
          </Note>

          <section>
            <SectionTitle
              action={
                <Button size="sm" variant="primary" onClick={() => showToast("コードをコピーしました（モック）")}>
                  <Copy />
                  コードをコピー
                </Button>
              }
            >
              1. コードを用意する
            </SectionTitle>
            <Panel className="overflow-hidden">
              <pre className="num max-h-28 overflow-auto px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                {"javascript:(async()=>{ /* WebClass の課題一覧を読み取り、UnionFetch に渡す（モック） */ })()"}
              </pre>
            </Panel>
          </section>

          <section>
            <SectionTitle>2. ブックマークに登録する</SectionTitle>
            <Segmented<Device>
              label="端末"
              value={device}
              onChange={setDevice}
              className="mb-3 w-full sm:w-[16rem]"
              options={[
                { value: "pc", label: "PC" },
                { value: "iphone", label: "iPhone" },
                { value: "android", label: "Android" },
              ]}
            />
            <Panel className="overflow-hidden bg-background">
              <ol className="divide-y divide-border">
                {STEPS[device].map((s, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3">
                    <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </section>

          <section>
            <SectionTitle>3. PC なら自動にもできる</SectionTitle>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Chrome に Tampermonkey を入れ、設定 › 接続 で発行したトークンを貼ると、WebClass
              を開くだけで取り込まれます。開かないときは Tampermonkey の「新規スクリプトを作成」にコードを貼り付けてください。
            </p>
          </section>
        </div>
      </Content>
    </>
  )
}
