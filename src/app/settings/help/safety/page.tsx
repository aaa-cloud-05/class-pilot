"use client"

import Link from "next/link"
import { FileText, Mail } from "lucide-react"
import { Article, ArticleSection, Faq } from "@/components/app/article"
import { Card, ListGroup, RowLink } from "@/components/app/ui"

/** 箇条書き。太字の1文＋補足の形で揃える */
function Points({ items }: { items: { head: string; body?: React.ReactNode }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.head} className="flex gap-2.5">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
          <span>
            <strong className="font-semibold text-foreground">{it.head}</strong>
            {it.body && <span className="block">{it.body}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

const LINK = "font-medium text-primary hover:underline"

export default function SafetyGuidePage() {
  return (
    <Article title="安全性とよくある質問" lead="課題をどこから・どうやって読み取っているか、困ったときにどうするかをまとめました。">
      <ArticleSection title="Google Classroom の読み取り">
        <Card className="p-5 text-[15px] leading-[1.8] text-muted-foreground">
          <Points
            items={[
              {
                head: "Google が公式に提供している Classroom API を使っています。",
                body: "画面を読み取ったり、Google のパスワードを預かったりはしません。",
              },
              {
                head: "お願いしている権限は、読み取り専用の3つだけです。",
                body: "コースの一覧・自分の課題・自分の提出状況。Classroom の内容を書き換えることはできません。",
              },
              {
                head: "読み取るのは、コース名・課題名と説明・締切・課題ページのリンク・提出したかどうかです。",
                body: "成績（点数）は読み取りません。",
              },
              {
                head: "許可はいつでも取り消せます。",
                body: (
                  <>
                    <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className={LINK}>
                      Google アカウントの「サードパーティ製のアプリとサービス」
                    </a>
                    から UnionFetch を削除すると、それ以降は読み取れなくなります。
                  </>
                ),
              },
            ]}
          />
        </Card>
      </ArticleSection>

      <ArticleSection title="WebClass の読み取り">
        <Card className="p-5 text-[15px] leading-[1.8] text-muted-foreground">
          <Points
            items={[
              {
                head: "あなたのブラウザで、ログイン中の WebClass から課題の一覧を読み取ります。",
                body: "WebClass には外部向けの公開 API が無いためです。ブックマークを押したとき（PC の自動取り込みなら WebClass を開いたとき）だけ動きます。",
              },
              {
                head: "使うのは、WebClass の「課題実施状況一覧」の画面が内部で使っているのと同じ通信です。",
                body: "画面の文字を拾うのではなく、その画面と同じデータを受け取ります。WebClass の中から、あなたの権限で見られるものだけです。",
              },
              {
                head: "WebClass のパスワードやログイン情報は、UnionFetch に送りません。",
                body: "UnionFetch に届くのは、課題名・締切・提出したかどうか・課題ページのリンクだけです。WebClass の返事には点数なども入っていますが、読まずに捨てます。",
              },
            ]}
          />
        </Card>
      </ArticleSection>

      <ArticleSection title="WebClass のサーバーへの負荷">
        <Card className="p-5 text-[15px] leading-[1.8] text-muted-foreground">
          <p className="mb-4">大学の WebClass に余計な負担をかけないよう、読み取り方を抑えています。</p>
          <Points
            items={[
              {
                head: "あなたが WebClass を開いているときだけ動きます。",
                body: "UnionFetch のサーバーから WebClass に接続することはなく、夜中に自動で見に行くこともありません。",
              },
              { head: "コースは1つずつ、少し間を空けて読みます。", body: "一度にまとめて通信しません。" },
              {
                head: "変わっていないコースは「変更なし」の短い返事で済みます。",
                body: "ブラウザのキャッシュのしくみをそのまま使い、毎回まるごと取り直すことはしません。",
              },
              { head: "2年以上前の年度のコースは読みません。" },
              { head: "PC の自動取り込みは1時間に1回までです。", body: "タブを何枚開いても増えません。" },
            ]}
          />
          <p className="mt-4">
            ふだんは、公式の「課題実施状況一覧」を1回開くのと同じか、それより少ない通信です。
          </p>
        </Card>
      </ArticleSection>

      <ArticleSection title="よくある質問">
        <Card className="overflow-hidden">
          <Faq q="勝手に送信される？">
            されません。WebClass の取り込みは、あなたがブックマークを押したときだけ動きます（PC の自動取り込みを入れた場合は、WebClass
            を開いたときに動きます）。
          </Faq>

          <Faq q="公式のアプリ？">
            いいえ。Google・WebClass（日本データパシフィック）とは関係のない、個人が開発・運営する非公式ツールです。課題は読み取り専用で取得します。
          </Faq>

          <Faq q="課題が出てこない・少ない">
            WebClass は締切のある課題の直近半年ぶん、Classroom は1コース最大100件までです。設定 › コース
            で非表示にしたコースは出ません。
          </Faq>

          <Faq q="提出したかどうかは正しく出る？">
            WebClass の課題は、WebClass 側の「実施日」をそのまま読んでいます。実施日があれば提出済み、
            なければ未提出で、途中の状態はありません。WebClass で提出したあとは、取り込み直すと反映されます。手で追加した課題は、丸チェックで自分で切り替えてください。
          </Faq>

          <Faq q="通知が来ない">
            通知はメールで届きます。設定 › 通知 で「締切をメールで知らせる」がオンかを確認してください。
            オンなのに届かないときは、迷惑メールのフォルダも見てください。メール通知にはログインが必要です。
          </Faq>

          <Faq q="今日の日付がずれている">「今日」は端末の日時とタイムゾーンに従います。端末の設定を確認してください。</Faq>

          <Faq q="データを消したい">
            設定 › アカウント から、この端末のデータの消去とアカウントの削除ができます。詳しくは{" "}
            <Link href="/privacy" className={LINK}>
              プライバシーポリシー
            </Link>{" "}
            をご覧ください。
          </Faq>
        </Card>
      </ArticleSection>

      <ListGroup title="規約とお問い合わせ" footer="解決しないときは、お問い合わせからご連絡ください。">
        <RowLink href="/privacy" icon={FileText} label="プライバシーポリシー" />
        <RowLink href="/terms" icon={FileText} label="利用規約" />
        <RowLink href="mailto:support@unionfetch.com" icon={Mail} label="お問い合わせ" detail="support@unionfetch.com" />
      </ListGroup>
    </Article>
  )
}
