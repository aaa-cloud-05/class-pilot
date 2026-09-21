"use client"

import { Article, Faq } from "../../../_components/article"
import { Card } from "../../../_components/ui"

export default function SyncGuidePage() {
  return (
    <Article title="同期のしくみ" lead="表示している課題がいつのものか、どうすれば新しくなるかをまとめました。">
      <Card className="overflow-hidden">
        <Faq q="Classroom はいつ更新される？">
          アプリを開くたびに自動で取りに行きます。直近5分以内に取得していれば省略します。手動の更新ボタンはありません。
        </Faq>

        <Faq q="WebClass はいつ更新される？">
          WebClass を開いてブックマークを押したときに取り込まれます。PC では自動取り込みも使えます。つなぎ方は 設定 › セットアップ にあります。
        </Faq>

        <Faq q="点の色の意味">
          <ul className="space-y-1.5">
            <li>緑：新しい</li>
            <li>黄：少し古い</li>
            <li>赤：古い、または連携が切れている</li>
            <li>灰：まだつないでいない</li>
          </ul>
          <p className="mt-3">点をタップすると、取り込みの状況と WebClass の URL 設定が開きます。</p>
        </Faq>

        <Faq q="取り込める件数の上限">
          Classroom は1コースにつき最大100件、コースは最大30まで。WebClass は締切のある課題の直近半年ぶんです。
        </Faq>

        <Faq q="自分で直した内容は消える？">
          消えません。手で直した課題は記録していて、あとから同期しても上書きされません。削除した課題も復活しません。
        </Faq>

        <Faq q="ログインしないとどうなる？">
          課題はこの端末の中だけに保存されます。手動の追加と WebClass の取り込みは使えますが、別の端末では見られません。
        </Faq>
      </Card>
    </Article>
  )
}
