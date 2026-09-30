"use client"

import Link from "next/link"
import { Article, ArticleSection } from "@/components/app/article"
import { Card } from "@/components/app/ui"
import { FEEDBACK_FORM_URL, SUPPORT_EMAIL } from "@/lib/links"

/**
 * WebClass の取り込み（ブックマークレット）の説明書。利用規約と一体のものとして、条文の形で書く。
 * コードの中身と食い違わないよう、数字や手順は src/lib/webclass-script.ts・src/lib/webclass.ts に合わせる。
 * 開発者についての記述（誰が作ったか・どの環境で測ったか）は書かない。
 */
const UPDATED = "2026年9月30日"

const LINK = "font-medium text-primary hover:underline"
const TEXT = "text-[15px] leading-[1.85] text-foreground"

type Item = React.ReactNode | { text: React.ReactNode; sub: React.ReactNode[]; numbered?: boolean }

const hasSub = (it: Item): it is { text: React.ReactNode; sub: React.ReactNode[]; numbered?: boolean } =>
  typeof it === "object" && it !== null && "sub" in it

/** 1つの条。項が1つなら段落、2つ以上なら番号つきの箇条にする */
function Clause({ n, title, items }: { n: number; title: string; items: Item[] }) {
  const body = (it: Item) =>
    hasSub(it) ? (
      <>
        {it.text}
        <ul className="mt-2 space-y-1.5">
          {it.sub.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 tabular-nums text-muted-foreground">{it.numbered ? `(${i + 1})` : "・"}</span>
              <span className="min-w-0 flex-1">{s}</span>
            </li>
          ))}
        </ul>
      </>
    ) : (
      it
    )
  return (
    <ArticleSection title={`第${n}条（${title}）`} id={`article-${n}`}>
      <Card className="p-5">
        {items.length === 1 ? (
          <div className={TEXT}>{body(items[0])}</div>
        ) : (
          <ol className={`${TEXT} space-y-3`}>
            {items.map((it, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
                <div className="min-w-0 flex-1">{body(it)}</div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </ArticleSection>
  )
}

export default function WebClassImportTermsPage() {
  return (
    <Article
      title="WebClass の取り込みについて"
      lead={`本書は、UnionFetch の利用規約と一体のものとして適用されます。最終更新：${UPDATED}`}
    >
      <Clause
        n={1}
        title="目的"
        items={[
          "本書は、UnionFetch（以下「本サービス」）の、WebClass の課題を取り込む機能（以下「本機能」）について、しくみ・取り扱う情報・WebClass のサーバへの影響・提供の条件を定めます。",
        ]}
      />

      <Clause
        n={2}
        title="位置づけ"
        items={[
          "本機能は、WebClass の提供元や大学が公式に提供する連携ではありません。本サービスは、これらと関係のない非公式のツールです。",
          "本機能は、利用者が WebClass にログインした状態で、利用者自身のブラウザの中で動きます。本サービスのサーバが WebClass に接続することはありません。",
          "本機能は、WebClass の「課題実施状況一覧」の画面が内部で使っているのと同じ通信を、利用者自身の権限で呼び出します。本機能が受け取るのは、その画面を開いたときにブラウザが受け取るのと同じ情報です。ほかの利用者の情報は含まれません。",
        ]}
      />

      <Clause
        n={3}
        title="取り扱う情報"
        items={[
          {
            text: "本機能が WebClass から取り出すのは、次の情報だけです。",
            numbered: true,
            sub: [
              "コースの識別子とコース名",
              "課題の識別子、課題名、締切日時",
              "提出したかどうか（提出日時があるかどうかを「提出済み／未提出」に置き換えたもの。提出日時そのものは送りません）",
              "利用している WebClass のアドレス（課題ページへのリンクを作るため）",
            ],
          },
          "WebClass が返すデータには、学籍番号・氏名・得点も含まれます。本機能はこれらを取り出さず、本サービスへ送らず、保存しません。これらは利用者のブラウザの中に一時的にあるだけで、処理が終わると消えます。",
          "本機能は、パスワードや Cookie などのログイン情報を読み取らず、送りません。",
          {
            text: "取り出した情報は本サービスの取り込み画面に渡し、次のように保存します。",
            sub: ["ログインしている場合は、利用者のアカウントに保存します。", "ログインしていない場合は、利用者の端末の中だけに保存します。"],
          },
          {
            text: "取り出した情報は、URL の「#」より後ろに載せて取り込み画面に渡します。",
            sub: [
              "この部分はサーバに送られないため、アクセスの記録には残りません。",
              "取り込みが終わると、アドレス欄からは消えます。",
              "ただし、ブラウザの閲覧履歴には残ることがあります。",
            ],
          },
        ]}
      />

      <Clause
        n={4}
        title="処理の流れ"
        items={[
          {
            text: "本機能のコードは、次の順に動きます。",
            numbered: true,
            sub: [
              <>
                <strong>実行場所の確かめ</strong>：開いているページの中にある WebClass
                のプログラムの場所から、WebClass のアドレスを割り出します。見つからなければ、何も通信せずに終わります。
              </>,
              <>
                <strong>コース一覧の取得</strong>：コース一覧を1回だけ呼び出します。ログインが切れている場合（拒否の応答、または JSON
                以外が返る場合）は、そこで終わります。
              </>,
              <>
                <strong>コースの絞り込み</strong>：年度が2年以上前のコースを除きます。通信の回数を減らすためです。
              </>,
              <>
                <strong>課題一覧の取得</strong>：残ったコースごとに課題一覧を呼び出します。1コースずつ順番に行い、並列には通信しません。コースとコースの間には
                0.25 秒の間隔をあけます。
              </>,
              <>
                <strong>課題の選別</strong>：課題でないもの（教材など）と非公開のもの、締切が180日より前のもの、締切がなく180日以上更新されていないものを除きます。
              </>,
              <>
                <strong>項目の取り出し</strong>：第3条第1項の項目だけを取り出します。
              </>,
              <>
                <strong>失敗の扱い</strong>：一部のコースで取得に失敗したら、そのコースを飛ばして続けます。課題が1件も取れなければ、理由を表示して終わります。
              </>,
              <>
                <strong>取り込み画面を開く</strong>：取り出した情報を、本サービスの取り込み画面に渡して開きます。URL
                が長すぎる場合は、締切の古いものから減らします。
              </>,
              <>
                <strong>本サービス側の検証</strong>：取り込み画面は、形・文字数（課題名 500 文字、コース名 200 文字まで）・件数（1,000
                件まで）・リンクの形式（http・https のみ）を確かめ、合わないものを捨てます。ログインしている場合は、サーバでも同じ確認をします。取り込みで課題を削除することはありません。
              </>,
            ],
          },
        ]}
      />

      <Clause
        n={5}
        title="WebClass のサーバへの影響"
        items={[
          <>
            本機能は、<strong>並列に通信しません。</strong>1つの通信が終わってから次の通信を始め、コースとコースの間には 0.25 秒の間隔をあけます。
          </>,
          "1回の実行で行う通信は、「コース一覧を1回」と「直近2年度のコースごとに課題一覧を1回ずつ」です。",
          <>
            WebClass の「課題実施状況一覧」の画面は、開くたびに、すべてのコースの課題一覧を一斉に読み込みます。本機能が呼ぶのはそれと同じ通信の一部で、
            <strong>1回の実行での通信は、その画面を1回開くときより少なくなります。</strong>
          </>,
          "通信は、利用者がブックマークを押したときだけ行います。自動で繰り返したり、定期的に実行したりしません。",
          "短い間隔で繰り返し実行すると、そのぶん通信が増えます。取り込みは、課題を確かめたいときに行ってください。",
        ]}
      />

      <Clause
        n={6}
        title="停止・変更"
        items={[
          {
            text: "本サービスは、次のようなときに、予告なく本機能を止めたり変えたりすることがあります。",
            sub: ["大学や提供元から求めがあったとき", "不具合や、過大な負担のおそれがあるとき"],
          },
          "利用者は、ブックマークを削除すれば、いつでも利用をやめられます。取り込んだ課題は、設定から削除できます。",
        ]}
      />

      <Clause
        n={7}
        title="利用者へのお願い"
        items={[
          "本機能は、ご自身の WebClass アカウントで使ってください。",
          "短い間隔で繰り返し実行しないでください。",
          "コードを書き換えたり、ほかの人に渡したりしないでください。",
          "所属する大学の規程に従ってください。",
        ]}
      />

      <Clause
        n={8}
        title="自動取り込み"
        items={["WebClass を開くだけで自動で取り込む機能は、現在検証中のため提供していません。"]}
      />

      <Clause
        n={9}
        title="免責"
        items={[
          "本サービスは無償で提供するものです。本機能が正しく動くこと、取り込んだ情報が正確かつ完全であること、本機能を提供し続けることを保証しません。",
          "課題の提出と締切の管理は、利用者自身の責任で行ってください。WebClass と本サービスの表示が違うときは、WebClass の表示を正しいものとします。",
          "本サービスは、本機能を利用したこと、または利用できなかったことによって利用者に生じた損害について、責任を負いません。",
        ]}
      />

      <Clause
        n={10}
        title="お問い合わせ"
        items={[
          <>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK}>
              {SUPPORT_EMAIL}
            </a>
            、または
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
              ご意見フォーム
            </a>
            へ。
          </>,
        ]}
      />

      <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
        本サービス全体の条件は
        <Link href="/terms" className={LINK}>
          利用規約
        </Link>
        、取り扱う情報は
        <Link href="/privacy" className={LINK}>
          プライバシーポリシー
        </Link>
        をご覧ください。
      </p>
    </Article>
  )
}
