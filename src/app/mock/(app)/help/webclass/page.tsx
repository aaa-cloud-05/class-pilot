"use client"

import { useState } from "react"
import { ChevronDown, Copy, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Article, ArticleSection, Faq, Prose, Steps } from "../../../_components/article"
import { useMock } from "../../../_components/provider"
import { Button, Card, Segmented } from "../../../_components/ui"

type Device = "pc" | "iphone" | "android"

const STEPS: Record<Device, React.ReactNode[]> = {
  pc: [
    <>下の<strong>「コードをコピー」</strong>を押します。</>,
    <>いま開いているページをブックマークします（<strong>Ctrl / ⌘ + D</strong>）。</>,
    <>ブックマークバーのそのブックマークを右クリックして<strong>「編集」</strong>を開きます。</>,
    <>URL 欄をコピーしたコードに貼り替え、名前を「WebClass を取り込む」にして保存します。</>,
    <>WebClass を開いた状態で、そのブックマークをクリックします。</>,
  ],
  iphone: [
    <>下の<strong>「コードをコピー」</strong>を押します。</>,
    <>Safari でこのページを<strong>ブックマークに追加</strong>します。</>,
    <>ブックマーク一覧 →<strong>「編集」</strong>→ いま追加した項目を開きます。</>,
    <>アドレス欄をコピーしたコードに貼り替えて保存します。</>,
    <>WebClass を開いた状態で、ブックマークからその項目を開きます。</>,
  ],
  android: [
    <>下の<strong>「コードをコピー」</strong>を押します。</>,
    <>Chrome の ☆ でこのページをブックマークします。</>,
    <>ブックマークを<strong>編集</strong>し、URL をコピーしたコードに貼り替えます。</>,
    <>WebClass を開き、アドレスバーにブックマークの名前を入力して候補から選びます。</>,
  ],
}

export default function MockWebclassGuidePage() {
  const { showToast } = useMock()
  const [device, setDevice] = useState<Device>("pc")
  const [showCode, setShowCode] = useState(false)

  return (
    <Article
      title="WebClass の取り込み方"
      lead="WebClass には締切の通知がありません。ブックマークに小さなコード（ブックマークレット）を1つ登録すると、WebClass を開いて押すだけで課題をまとめて取り込めます。"
    >
      <Card className="flex gap-3 bg-ok-soft p-4 shadow-none">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-ok" aria-hidden />
        <div className="text-[15px] leading-[1.75] text-ink">
          <p className="font-bold">読み取るのは課題の情報だけです</p>
          <p className="mt-1 text-ink-2">
            課題名・締切・提出したかどうか・課題ページのリンクだけを読み取ります。パスワード、ログイン情報、氏名、学籍番号、点数には触れません。押したときにだけ動きます。
          </p>
        </div>
      </Card>

      <ArticleSection title="1. コードを用意する">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[15px] text-ink-2">登録するコード（どのページで実行しても大丈夫です）</p>
            <Button size="sm" onClick={() => showToast("コードをコピーしました（モック）")}>
              <Copy className="h-4 w-4" aria-hidden />
              コードをコピー
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            aria-expanded={showCode}
            className="mt-3 flex h-11 w-full items-center gap-2 rounded-control px-1 text-[14px] font-semibold text-brand-text outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showCode && "rotate-180")} aria-hidden />
            コードの中身を見る
          </button>
          {showCode && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-control bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink-2">
              {"javascript:(async()=>{ /* WebClass の課題一覧を読み取り、UnionFetch の取り込み画面に渡す（モック表示） */ })()"}
            </pre>
          )}
        </Card>
      </ArticleSection>

      <ArticleSection title="2. ブックマークに登録する">
        <Segmented<Device>
          label="使っている端末"
          value={device}
          onChange={setDevice}
          className="mb-5"
          options={[
            { value: "pc", label: "PC" },
            { value: "iphone", label: "iPhone" },
            { value: "android", label: "Android" },
          ]}
        />
        <Card className="p-5">
          <Steps items={STEPS[device]} />
        </Card>
        <Prose>
          <p className="pt-3">押すと取り込み画面に移り、数秒でホームに反映されます。ログイン中はほかの端末にも同じ内容が出ます。</p>
        </Prose>
      </ArticleSection>

      <ArticleSection title="3. PC なら自動にもできます" id="auto">
        <Prose>
          <p>
            Chrome に <strong>Tampermonkey</strong> を入れておくと、WebClass を開くだけで取り込まれます。設定は <strong>設定 › WebClass 連携</strong> から行います。
          </p>
        </Prose>
        <Card className="mt-4 overflow-hidden">
          <Faq q="「スクリプトを入れる」を押してもインストール画面が開かない">
            <ol className="list-decimal space-y-1 pl-5">
              <li>設定 › WebClass 連携 で「コードをコピー」を押す</li>
              <li>ツールバーの Tampermonkey アイコン →「新規スクリプトを作成」</li>
              <li>エディタの中身を全部消して、コピーしたコードを貼り付け、Ctrl+S で保存</li>
            </ol>
          </Faq>
          <Faq q="それでも動かない">
            Chrome の <code className="rounded bg-surface-2 px-1 font-mono text-[13px]">chrome://extensions</code> で
            デベロッパーモードをオンにしてください。最近の Chrome では、これがないと Tampermonkey が正しく動きません。
          </Faq>
          <Faq q="トークンを無くした">
            トークンは保存していないため、もう一度表示することはできません。設定 › WebClass 連携 から再発行してください。
          </Faq>
        </Card>
      </ArticleSection>
    </Article>
  )
}
