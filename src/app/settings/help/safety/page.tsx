"use client"

import Link from "next/link"
import { FileText, Mail, MessageSquare } from "lucide-react"
import { Article, ArticleSection, Faq } from "@/components/app/article"
import { Card, ListGroup, RowLink } from "@/components/app/ui"
import { FEEDBACK_FORM_URL, SUPPORT_EMAIL } from "@/lib/links"

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
                body: "WebClass の提供元や大学が公式に用意した連携ではありません。ブックマークを押したときだけ動きます。",
              },
              {
                head: "使うのは、WebClass の「課題実施状況一覧」の画面が内部で使っているのと同じ通信です。",
                body: "その画面を開いたときにブラウザが受け取るのと同じデータで、ほかの人の情報は含まれません。",
              },
              {
                head: "WebClass のパスワードやログイン情報は、UnionFetch に送りません。",
                body: "UnionFetch に届くのは、コース名・課題名・締切・提出したかどうか・課題ページのリンクだけです。WebClass の返事には学籍番号・氏名・得点も入っていますが、取り出さずに捨てます。",
              },
            ]}
          />
          <p className="mt-4">
            コードが何をするか、取り扱う情報、利用の条件は{" "}
            <Link href="/settings/help/webclass" className={LINK}>
              WebClass の取り込みについて
            </Link>{" "}
            にまとめています。
          </p>
        </Card>
      </ArticleSection>

      <ArticleSection title="WebClass のサーバーへの負荷">
        <Card className="p-5 text-[15px] leading-[1.8] text-muted-foreground">
          <p className="mb-4">大学の WebClass に余計な負担をかけないよう、読み取り方を抑えています。</p>
          <Points
            items={[
              { head: "並列に通信しません。", body: "コースは1つずつ、0.25 秒あけて読みます。" },
              {
                head: "あなたがブックマークを押したときだけ動きます。",
                body: "UnionFetch のサーバーから WebClass に接続することはなく、自動で見に行くこともありません。",
              },
              { head: "2年以上前の年度のコースは読みません。" },
            ]}
          />
          <p className="mt-4">
            公式の「課題実施状況一覧」の画面は、開くたびにすべてのコースの課題一覧を一斉に読み込みます。UnionFetch
            が読むのはその一部なので、1回の取り込みの通信は、その画面を1回開くときより少なくなります。
          </p>
        </Card>
      </ArticleSection>

      <ArticleSection title="よくある質問">
        <Card className="overflow-hidden">
          <Faq q="勝手に送信される？">
            されません。WebClass の取り込みは、あなたがブックマークを押したときだけ動きます。WebClass
            を開くだけで取り込む自動取り込みは、いまは検証中のため提供していません。
          </Faq>

          <Faq q="公式のアプリ？">
            いいえ。Google・WebClass（日本データパシフィック）とは関係のない非公式ツールです。課題は読み取り専用で取得します。
          </Faq>

          <Faq q="課題が出てこない・少ない">
            WebClass は締切のある課題の直近半年ぶん、Classroom は1コース最大100件までです。設定 › コース
            で非表示にしたコースは出ません。
          </Faq>

          <Faq q="提出したかどうかは正しく出る？">
            WebClass の課題は、WebClass 側の「実施日」をそのまま読んでいます。実施日があれば提出済み、
            なければ未提出で、途中の状態はありません。WebClass で提出したあとは、取り込み直すと反映されます。手で追加した課題は、丸チェックで自分で切り替えてください。
          </Faq>

          <Faq q="メールはいつ届く？">
            <p>設定 › 通知 で選んだタイミング（初めは締切の6時間前）に届きます。そのうえで、次のように動きます。</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                課題を追加・取り込んだ直後や、設定を変えた直後の<strong>30分以内</strong>に来るはずのメールは送りません。いま画面で見ている課題に、すぐメールが届かないようにするためです
              </li>
              <li>
                選んだタイミングがもう過ぎていて、この先のタイミングも残っていない課題は、締切がまだ先なら<strong>翌朝6時台</strong>に「あと○時間」のメールを1通送ります
              </li>
              <li>提出済みにした・締切が変わった・通知を切ったときは、予約していたメールを取り消します（締切が変わったものは新しい時刻で予約し直します）</li>
              <li>WebClass で提出したことは、取り込み直すまで分かりません。提出したら取り込み直すか、アプリで提出済みにしてください</li>
            </ul>
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

      <ListGroup title="ご意見・お問い合わせ" footer="解決しないときは、フォームかメールでご連絡ください。">
        <RowLink
          href={FEEDBACK_FORM_URL}
          external
          icon={MessageSquare}
          label="ご意見・不具合の報告"
          description="Google フォームが開きます"
        />
        <RowLink href={`mailto:${SUPPORT_EMAIL}`} icon={Mail} label="お問い合わせ" detail={SUPPORT_EMAIL} />
        <RowLink href="/privacy" icon={FileText} label="プライバシーポリシー" />
        <RowLink href="/terms" icon={FileText} label="利用規約" />
      </ListGroup>
    </Article>
  )
}
