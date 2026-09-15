"use client"

import { Check, HelpCircle } from "lucide-react"
import { Article, ArticleSection, Prose } from "../../../_components/article"
import { Card } from "../../../_components/ui"

const LEGEND = [
  { mark: <span className="h-6 w-6 rounded-full border-2 border-line-strong" />, label: "未提出", desc: "タップすると提出済みになります" },
  {
    mark: (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ok text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3.2} />
      </span>
    ),
    label: "提出済み",
    desc: "もう一度タップすると未提出に戻ります",
  },
  {
    mark: (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-ink-3 text-ink-3">
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.4} />
      </span>
    ),
    label: "不明",
    desc: "WebClass で提出状況が取れなかったもの",
  },
]

export default function MockScreenGuidePage() {
  return (
    <Article title="画面の見かた" lead="「いま何をやるか」をひと目で分かるようにしています。">
      <ArticleSection title="丸チェック">
        <Card className="divide-y divide-line overflow-hidden">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-4 px-4 py-3.5">
              <span className="flex w-6 justify-center" aria-hidden>
                {l.mark}
              </span>
              <div>
                <p className="text-[16px] font-semibold">{l.label}</p>
                <p className="text-[14px] text-ink-2">{l.desc}</p>
              </div>
            </div>
          ))}
        </Card>
      </ArticleSection>

      <ArticleSection title="締切の色">
        <Prose>
          <p>
            <span className="font-semibold text-danger">赤</span>は締切を過ぎた未提出、
            <span className="font-semibold text-warn">オレンジ</span>は24時間以内、
            <span className="font-semibold text-ok">緑</span>は提出済みです。色だけでなく「あと3時間」「2日超過」のように文字でも表示します。
          </p>
        </Prose>
      </ArticleSection>

      <ArticleSection title="ホームとカレンダー">
        <Prose>
          <p>
            <strong>ホーム</strong>は未提出の課題を「期限切れ・今日・明日・今週…」の順に並べます。「すべて」に切り替えると提出済みも出ます。
          </p>
          <p>
            <strong>カレンダー</strong>は週と月を切り替えられます。日付を選ぶと、その日が締切の課題が下に出ます。
          </p>
        </Prose>
      </ArticleSection>
    </Article>
  )
}
