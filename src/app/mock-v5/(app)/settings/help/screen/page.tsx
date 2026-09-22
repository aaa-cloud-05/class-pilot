"use client"

import { Check } from "lucide-react"
import { Article, Faq } from "../../../../_components/article"
import { Card } from "../../../../_components/ui"

const MARKS = [
  { mark: <span className="h-5 w-5 rounded-full border-2 border-input" />, label: "未提出", desc: "タップすると提出済みになります" },
  {
    mark: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white">
        <Check className="h-3 w-3" strokeWidth={3.5} />
      </span>
    ),
    label: "提出済み",
    desc: "もう一度タップすると戻せます",
  },
  {
    mark: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-[12px] font-bold text-muted-foreground">
        ?
      </span>
    ),
    label: "不明",
    desc: "WebClass から提出状況が取れなかったもの。タップして提出済みにできます",
  },
]

const COLORS = [
  { chip: "bg-destructive", label: "赤", desc: "締切を過ぎた未提出" },
  { chip: "bg-[var(--ui-warn-fill)]", label: "黄", desc: "24時間以内に締切" },
  { chip: "bg-primary/75", label: "青", desc: "まだ先の未提出" },
  { chip: "bg-muted-foreground/35", label: "灰", desc: "提出済み・状況が不明" },
]

export default function ScreenGuidePage() {
  return (
    <Article title="画面の見かた" lead="色と形で、いま何をすればよいかが分かります。">
      <Card className="overflow-hidden">
        <Faq q="丸チェックの意味">
          <ul className="space-y-3">
            {MARKS.map((m) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className="flex w-5 justify-center" aria-hidden>
                  {m.mark}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-foreground">{m.label}</span>
                  <span className="block text-[13px] text-muted-foreground">{m.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </Faq>

        <Faq q="色の意味">
          <ul className="space-y-2">
            {COLORS.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${c.chip}`} aria-hidden />
                <span className="text-[14px] font-semibold text-foreground">{c.label}</span>
                <span className="text-[13px] text-muted-foreground">{c.desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">色が分からなくても、右側の「あと3時間」「2日超過」の文字で判断できます。</p>
        </Faq>

        <Faq q="ホームの棒グラフ">
          曜日ごとの課題の数です。棒の高さがその日の件数、色が提出状況です。上部の{" "}
          <span className="font-mono text-[13px]">{"< >"}</span> で前後の週に移せます。
        </Faq>

        <Faq q="進捗バー">
          その週の課題を、状態ごとの色で全部ぶんだけ並べたものです。灰色が増えるほど片づいています。
        </Faq>

        <Faq q="カレンダーの点">
          その日に締切がある課題です。点の色は上の表と同じで、多い日は点が増えます。日付を選ぶと、下にその日の課題が出ます。
        </Faq>

        <Faq q="「最近」と「すべて」">
          <p>
            <strong>最近</strong>は 直近の未提出・今日・明日・今週・期限なしの未提出 の順です。今日・明日・今週は提出済みも
            まとめて出るので、その週に何が終わっているかも分かります。今週の見出しにある「締切順 / 状態順」で並びを変えられます。
          </p>
          <p className="mt-3">
            <strong>すべて</strong>は月で切り替えて、その月にかかる週をひと塊ずつ並べます。期限なしの課題はいちばん下で、
            未提出・不明・提出済みを切り替えて見られます。
          </p>
        </Faq>
      </Card>
    </Article>
  )
}
