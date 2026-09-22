"use client"

import { useMock } from "../../_components/provider"
import { Content, TopBar } from "../../_components/shell"
import { Panel, RowGroup, SettingLink } from "../../_components/ui"
import { timeAgo } from "../../_lib/format"

const PRESET = { relaxed: "余裕派", standard: "標準", urgent: "ギリギリ派" } as const

export default function SettingsHome() {
  const { controls, syncedAt, now, notif, courses } = useMock()
  const connected = [controls.loggedIn ? "Classroom" : null, syncedAt.webclass ? "WebClass" : null].filter(Boolean)

  return (
    <>
      <TopBar title="設定" />
      <Content className="lg:max-w-xl">
        <div className="space-y-5">
          <Panel className="p-4">
            <p className="text-[13px] text-muted-foreground">アカウント</p>
            <p className="mt-1 text-[15px] font-medium">
              {controls.loggedIn ? "hinata.sato@example.ac.jp" : "ログインしていません"}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {controls.loggedIn
                ? `${connected.join(" / ")} に接続中`
                : "この端末にだけ課題を保存しています"}
            </p>
          </Panel>

          <RowGroup>
            <SettingLink
              href="/mock-v3/settings/connections"
              label="接続"
              description="Classroom と WebClass の取り込み"
              detail={
                controls.loggedIn && syncedAt.classroom
                  ? `${timeAgo(syncedAt.classroom, now)}に同期`
                  : connected.length
                    ? `${connected.length}件`
                    : "未接続"
              }
            />
            <SettingLink
              href="/mock-v3/settings/notifications"
              label="通知"
              description="届け方とタイミング"
              detail={notif.enabled ? PRESET[notif.preset] : "オフ"}
            />
            <SettingLink
              href="/mock-v3/settings/courses"
              label="コース"
              description="表示と通知をコースごとに"
              detail={`${courses.filter((c) => !c.hidden).length}件`}
            />
            <SettingLink href="/mock-v3/settings/account" label="アカウント" description="テーマ・ログアウト・削除" />
            <SettingLink href="/mock-v3/settings/help" label="ヘルプ" description="使い方とよくある質問" />
          </RowGroup>

          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            UnionFetch は Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。
          </p>
        </div>
      </Content>
    </>
  )
}
