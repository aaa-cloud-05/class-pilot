"use client"

import Link from "next/link"
import { Article, ArticleSection, Faq, Prose } from "../../../_components/article"
import { Card } from "../../../_components/ui"

export default function MockSafetyGuidePage() {
  return (
    <Article title="安全性とよくある質問">
      <ArticleSection title="安全とプライバシー">
        <Prose>
          <p>
            UnionFetch は Google・WebClass とは関係のない<strong>非公式ツール</strong>です。課題は<strong>読み取り専用</strong>で取得し、パスワードは扱いません。
          </p>
          <p>
            WebClass の取り込みは、ログイン済みの WebClass の画面から、あなたが操作したときだけ行われます。データは設定からいつでも削除できます。詳しくは{" "}
            <Link href="/privacy" className="font-semibold text-brand-text hover:underline">
              プライバシーポリシー
            </Link>{" "}
            と{" "}
            <Link href="/terms" className="font-semibold text-brand-text hover:underline">
              利用規約
            </Link>
            をご覧ください。
          </p>
        </Prose>
      </ArticleSection>

      <ArticleSection title="よくある質問">
        <Card className="overflow-hidden">
          <Faq q="ブックマークレットが動かない">
            WebClass にログインした状態で実行しているか確認してください（ページはどこでも構いません）。ログインが切れていると取り込めません。
          </Faq>
          <Faq q="課題が表示されない・少ない">
            WebClass は締切のある課題の直近半年ぶん、Classroom は 1 コース最大 100 件です。設定 › コース で非表示にしたコースも出ません。
          </Faq>
          <Faq q="通知が来ない">
            設定 › 通知 で「締切の通知」がオンか、受け取り方（プッシュ・メール）がオンか、そのコースや課題が通知オフになっていないかを確認してください。
          </Faq>
        </Card>
      </ArticleSection>
    </Article>
  )
}
