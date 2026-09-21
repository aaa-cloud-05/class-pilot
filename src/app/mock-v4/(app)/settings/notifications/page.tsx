"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock, type Preset } from "../../../_components/provider"
import { Content, TopBar } from "../../../_components/shell"
import { Button, Note, RowGroup, SectionTitle, SettingButton, SettingRow, Switch } from "../../../_components/ui"

const PRESETS: { value: Preset; label: string; desc: string }[] = [
  { value: "relaxed", label: "余裕派", desc: "締切の24時間前" },
  { value: "standard", label: "標準", desc: "24時間前と3時間前" },
  { value: "urgent", label: "ギリギリ派", desc: "3時間前と1時間前" },
]

export default function NotificationSettings() {
  const { notif, updateNotif, controls, assignments, courseById, toggleAssignmentMute, showToast } = useMock()
  const muted = assignments.filter((a) => a.muted)
  const needLogin = !controls.loggedIn

  return (
    <>
      <TopBar title="通知" back="/mock-v4/settings" />
      <Content className="lg:max-w-xl">
        <div className="space-y-6">
          <RowGroup>
            <SettingRow
              label="締切の通知"
              description="オフにすると、すべての通知が止まります"
              right={<Switch label="締切の通知" checked={notif.enabled} onChange={(v) => updateNotif({ enabled: v })} />}
            />
          </RowGroup>

          <div className={cn(!notif.enabled && "pointer-events-none opacity-50")}>
            <SectionTitle>届け方</SectionTitle>
            <RowGroup>
              <SettingRow
                label="プッシュ通知"
                description={needLogin ? "ログインが必要です" : "アプリを閉じていても届きます"}
                right={
                  <Switch
                    label="プッシュ通知"
                    checked={notif.push && !needLogin}
                    disabled={needLogin}
                    onChange={(v) => updateNotif({ push: v })}
                  />
                }
              />
              <SettingRow
                label="メール"
                description={needLogin ? "ログインが必要です" : "hinata.sato@example.ac.jp"}
                right={
                  <Switch
                    label="メール"
                    checked={notif.email && !needLogin}
                    disabled={needLogin}
                    onChange={(v) => updateNotif({ email: v })}
                  />
                }
              />
              <SettingRow
                label="この端末のブラウザ通知"
                description={notif.permission === "granted" ? "許可済み" : "未許可"}
                right={
                  notif.permission === "granted" ? (
                    <Button size="sm" onClick={() => showToast("テスト通知を送りました（モック）")}>
                      テスト
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => updateNotif({ permission: "granted" })}>
                      許可する
                    </Button>
                  )
                }
              />
            </RowGroup>
            <div className="mt-2">
              <Note>iPhone は、Safari の共有 →「ホーム画面に追加」で開いたときだけプッシュ通知を受け取れます。</Note>
            </div>
          </div>

          <div className={cn(!notif.enabled && "pointer-events-none opacity-50")}>
            <SectionTitle>タイミング</SectionTitle>
            <RowGroup>
              {PRESETS.map((p) => (
                <SettingButton
                  key={p.value}
                  label={p.label}
                  description={p.desc}
                  chevron={false}
                  onClick={() => updateNotif({ preset: p.value })}
                  detail={
                    <Check
                      className={cn("h-4 w-4 text-primary", notif.preset === p.value ? "opacity-100" : "opacity-0")}
                      aria-label={notif.preset === p.value ? "選択中" : undefined}
                    />
                  }
                />
              ))}
            </RowGroup>
          </div>

          <div>
            <SectionTitle>止めている課題</SectionTitle>
            <RowGroup>
              {muted.length === 0 ? (
                <SettingRow label={<span className="text-muted-foreground">ありません</span>} />
              ) : (
                muted.map((a) => (
                  <SettingRow
                    key={a.id}
                    label={a.title}
                    description={courseById(a.courseId)?.name}
                    right={
                      <Button size="sm" onClick={() => toggleAssignmentMute(a.id)}>
                        戻す
                      </Button>
                    }
                  />
                ))
              )}
            </RowGroup>
            <p className="mt-2 px-1 text-[12px] text-muted-foreground">
              コース単位は{" "}
              <Link href="/mock-v4/settings/courses" className="text-primary hover:underline">
                コース
              </Link>
              から。
            </p>
          </div>
        </div>
      </Content>
    </>
  )
}
