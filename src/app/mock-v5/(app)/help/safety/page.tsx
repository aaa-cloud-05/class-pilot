"use client"

import Link from "next/link"
import { Article, Faq } from "../../../_components/article"
import { Card } from "../../../_components/ui"

export default function SafetyGuidePage() {
  return (
    <Article title="安全性とよくある質問" lead="何を読み取っているか、困ったときにどうするかをまとめました。">
      <Card className="overflow-hidden">
        <Faq q="何を読み取っているの？">
          課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワード、氏名、学籍番号、点数には触れません。
        </Faq>

        <Faq q="勝手に送信される？">
          されません。WebClass の取り込みは、あなたがブックマークを押したときだけ動きます（PC の自動取り込みを入れた場合は、WebClass
          を開いたときに動きます）。
        </Faq>

        <Faq q="公式のアプリ？">
          いいえ。Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得します。
        </Faq>

        <Faq q="課題が出てこない・少ない">
          WebClass は締切のある課題の直近半年ぶん、Classroom は1コース最大100件までです。設定 › コース
          で非表示にしたコースは出ません。
        </Faq>

        <Faq q="「不明」ってなに？">
          WebClass から提出したかどうかが取れなかった課題です。丸チェックを押すか、課題を開いて提出状況を切り替えてください。
        </Faq>

        <Faq q="通知が来ない">
          設定 › 通知 で「締切の通知」がオンか、メールかプッシュがオンかを確認してください。iPhone は、共有
          →「ホーム画面に追加」で開いたときだけプッシュが届きます。
        </Faq>

        <Faq q="今日の日付がずれている">「今日」は端末の日時とタイムゾーンに従います。端末の設定を確認してください。</Faq>

        <Faq q="データを消したい">
          設定 › アカウント から、この端末のデータの消去とアカウントの削除ができます。詳しくは{" "}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            プライバシーポリシー
          </Link>{" "}
          をご覧ください。
        </Faq>
      </Card>

      <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
        解決しないときは support@unionfetch.com までご連絡ください。
      </p>
    </Article>
  )
}
