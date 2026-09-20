"use client"

import { Article, ArticleSection, Faq, Prose } from "../../../_components/article"
import { Card } from "../../../_components/ui"

export default function MockSyncGuidePage() {
  return (
    <Article title="同期のしくみ" lead="表示している課題がいつのものか、どうすれば新しくなるかをまとめました。">
      <ArticleSection title="いつ更新されるか">
        <Card className="divide-y divide-border overflow-hidden">
          <div className="p-4">
            <p className="text-[16px] font-bold">Google Classroom</p>
            <p className="mt-1 text-[15px] leading-[1.75] text-muted-foreground">
              アプリを開くと自動で取りに行きます（5分以内に取得済みなら省略）。すぐ更新したいときは、同期ボタンから「今すぐ更新」。
            </p>
          </div>
          <div className="p-4">
            <p className="text-[16px] font-bold">WebClass</p>
            <p className="mt-1 text-[15px] leading-[1.75] text-muted-foreground">
              WebClass を開いてブックマークレットを押したとき（PC の自動取り込みなら開いたとき）に更新されます。
            </p>
          </div>
        </Card>
      </ArticleSection>

      <ArticleSection title="色の意味">
        <Prose>
          <p>
            同期ボタンの点は、取り込みの新しさの目安です。<strong>緑</strong>は新しい、<strong>オレンジ</strong>は少し古い、
            <strong>赤</strong>は古いか連携が切れている、<strong>灰色</strong>はまだ取り込んでいない状態です。
          </p>
        </Prose>
      </ArticleSection>

      <ArticleSection title="注意点">
        <Card className="overflow-hidden">
          <Faq q="取り込まれる件数に上限はある？">
            Classroom は 1 コースにつき最大 100 件、コースは最大 30 まで。WebClass は締切のある課題のうち直近半年ぶんです。
          </Faq>
          <Faq q="自分で直した内容は、同期で上書きされる？">
            されません。手で直した項目は記録していて、あとから同期しても残ります。削除した課題も同期で復活しません。
          </Faq>
          <Faq q="ログインしていないとどうなる？">
            課題はこの端末の中にだけ保存されます。自分で追加すること、WebClass を取り込むことはできますが、別の端末では見られません。
          </Faq>
          <Faq q="「今日」がずれている">「今日」は端末の日時とタイムゾーンに従います。端末の設定を確認してください。</Faq>
        </Card>
      </ArticleSection>
    </Article>
  )
}
