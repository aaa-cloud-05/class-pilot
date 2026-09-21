"use client"

import { Check, Minus } from "lucide-react"
import { Content, TopBar } from "../../../_components/shell"
import { Badge, Panel, SectionTitle, SettingLink, RowGroup, Table } from "../../../_components/ui"

const Yes = () => <Check className="h-3.5 w-3.5 text-ok" aria-label="できる" />
const No = () => <Minus className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="できない" />

export default function HelpPage() {
  return (
    <>
      <TopBar title="ヘルプ" back="/mock-v3/settings" />
      <Content className="lg:max-w-2xl">
        <div className="space-y-7">
          <section>
            <SectionTitle>ログインすると変わること</SectionTitle>
            <Table
              head={["できること", "未ログイン", "ログイン"]}
              rows={[
                ["課題を手で追加・編集", <Yes key="1" />, <Yes key="2" />],
                ["WebClass の取り込み", <Yes key="3" />, <Yes key="4" />],
                ["Classroom の自動取得", <No key="5" />, <Yes key="6" />],
                ["メール・プッシュ通知", <No key="7" />, <Yes key="8" />],
                ["ほかの端末と同期", <No key="9" />, <Yes key="10" />],
                ["保存先", "この端末のみ", "サーバー"],
              ]}
            />
            <p className="mt-2 px-1 text-[12px] text-muted-foreground">
              ログインしなくても使えますが、通知は端末を開いているときだけになります。
            </p>
          </section>

          <section>
            <SectionTitle>WebClass のつなぎ方（3つ）</SectionTitle>
            <Table
              head={["方法", "何のため", "端末", "自動か"]}
              rows={[
                [
                  <span key="1" className="flex items-center gap-1.5">
                    ブックマークレット <Badge tone="outline">基本</Badge>
                  </span>,
                  "課題を取り込む",
                  "スマホ・PC",
                  "手動（WebClass で1タップ）",
                ],
                ["ユーザースクリプト", "課題を自動で取り込む", "PC の Chrome", "自動（開くだけ）"],
                ["WebClass の URL", "「WebClass を開く」ボタンの行き先", "共通", "取り込みには使わない"],
              ]}
            />
          </section>

          <section>
            <SectionTitle>通知の種類</SectionTitle>
            <Table
              head={["種類", "届く条件", "ログイン"]}
              rows={[
                ["プッシュ通知", "アプリを閉じていても届く（iPhone はホーム画面に追加が必要）", "必要"],
                ["メール", "締切の前にメールが届く", "必要"],
                ["ブラウザ通知", "この端末でアプリを開いているとき", "不要"],
              ]}
            />
          </section>

          <section>
            <SectionTitle>手順とよくある質問</SectionTitle>
            <RowGroup>
              <SettingLink href="/mock-v3/settings/help/webclass" label="WebClass をつなぐ手順" description="機種別のやり方" />
              <SettingLink href="/mock-v3/start" label="セットアップをやり直す" description="3ステップで最初から" />
            </RowGroup>
          </section>

          <section>
            <SectionTitle>よくある質問</SectionTitle>
            <Panel className="divide-y divide-border overflow-hidden bg-background">
              {[
                {
                  q: "課題が少ない／出てこない",
                  a: "WebClass は締切のある課題の直近半年ぶん、Classroom は1コース最大100件まで取り込みます。設定 › コースで非表示にしたコースは出ません。",
                },
                {
                  q: "「未確認」ってなに？",
                  a: "WebClass から提出したかどうかが取れなかった課題です。ホームの「未確認 ◯件を確認」からまとめて片づけられます。",
                },
                {
                  q: "通知が来ない",
                  a: "設定 › 通知で「締切の通知」がオンか、届け方（プッシュ・メール）がオンか、そのコースや課題を止めていないかを確認してください。",
                },
                {
                  q: "安全なの？",
                  a: "Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。データは設定からいつでも削除できます。",
                },
              ].map((f) => (
                <div key={f.q} className="px-4 py-3">
                  <p className="text-[14px] font-medium">{f.q}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </Panel>
          </section>
        </div>
      </Content>
    </>
  )
}
