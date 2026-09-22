"use client"

import { Content, TopBar } from "../../../_components/shell"
import { ButtonLink, Panel, SectionTitle } from "../../../_components/ui"

const FAQ = [
  {
    q: "課題が出てこない／少ない",
    a: "WebClass は締切のある課題の直近半年ぶん、Classroom は1コース最大100件まで取り込みます。設定 › コースで非表示にしたコースは出ません。",
  },
  {
    q: "「未確認」ってなに？",
    a: "WebClass から提出したかどうかが取れなかった課題です。ホームの「未確認 ◯件を確認」からまとめて片づけられます。",
  },
  {
    q: "通知が来ない",
    a: "設定 › 通知で「締切の通知」がオンか、プッシュかメールがオンか、そのコースや課題を止めていないかを確認してください。iPhone は共有 →「ホーム画面に追加」で開いたときだけプッシュが届きます。",
  },
  {
    q: "ブックマークレットが動かない",
    a: "WebClass にログインした状態で実行しているか確認してください。ログインが切れていると取り込めません。",
  },
  {
    q: "安全なの？",
    a: "Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。氏名・学籍番号・点数は読み取りません。データは設定からいつでも削除できます。",
  },
  {
    q: "今日の日付がずれている",
    a: "「今日」は端末の日時とタイムゾーンに従います。端末の設定を確認してください。",
  },
]

export default function HelpPage() {
  return (
    <>
      <TopBar title="よくある質問" back="/mock-v4/settings" />
      <Content className="lg:max-w-2xl">
        <div className="space-y-5">
          <Panel className="divide-y divide-border overflow-hidden bg-background">
            {FAQ.map((f) => (
              <div key={f.q} className="px-4 py-3">
                <p className="text-[14px] font-medium">{f.q}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </Panel>

          <section>
            <SectionTitle>つなぎ方の手順</SectionTitle>
            <Panel className="flex items-center gap-3 p-4">
              <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
                Classroom・WebClass・通知の設定は、セットアップに上から順にまとめています。
              </p>
              <ButtonLink href="/mock-v4/settings/setup" size="sm" variant="primary">
                セットアップ
              </ButtonLink>
            </Panel>
          </section>

          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            解決しないときは support@unionfetch.com までご連絡ください。
          </p>
        </div>
      </Content>
    </>
  )
}
