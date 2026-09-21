"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock, type Preset } from "../../../_components/provider"
import { MobileHeader, PageBody } from "../../../_components/shell"
import { Button, ListGroup, RowButton, RowStatic, Switch } from "../../../_components/ui"

const PRESETS: { value: Preset; label: string; desc: string }[] = [
  { value: "relaxed", label: "余裕派", desc: "締切の24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前と3時間前" },
  { value: "urgent", label: "ギリギリ派", desc: "3時間前と1時間前" },
]

export default function MockNotificationSettingsPage() {
  const { notif, updateNotif, controls, assignments, courseById, toggleAssignmentMute, showToast } = useMock()
  const muted = assignments.filter((a) => a.muted)
  const needLogin = !controls.loggedIn

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/mock-v5/settings" />
      <PageBody desktopTitle="通知">
        <div className="space-y-7">
          <ListGroup footer="オフにすると、プッシュ・メール・この端末の通知がすべて止まります。">
            <RowStatic
              label="締切の通知"
              right={<Switch label="締切の通知" checked={notif.enabled} onChange={(v) => updateNotif({ enabled: v })} />}
            />
          </ListGroup>

          <ListGroup
            title="受け取り方"
            footer="iPhone では、Safari の共有ボタン →「ホーム画面に追加」で開いたときだけプッシュ通知を受け取れます。"
            className={cn(!notif.enabled && "pointer-events-none opacity-50")}
          >
            <RowStatic
              label="プッシュ通知"
              description={needLogin ? "ログインすると使えます" : "アプリを閉じていても、この端末に届きます"}
              right={
                <Switch
                  label="プッシュ通知"
                  checked={notif.push && !needLogin}
                  disabled={needLogin || !notif.enabled}
                  onChange={(v) => updateNotif({ push: v })}
                />
              }
            />
            <RowStatic
              label="メール通知"
              description={needLogin ? "ログインすると使えます" : "hinata.sato@example.ac.jp に届きます"}
              right={
                <Switch
                  label="メール通知"
                  checked={notif.email && !needLogin}
                  disabled={needLogin || !notif.enabled}
                  onChange={(v) => updateNotif({ email: v })}
                />
              }
            />
            <RowStatic
              label="この端末のブラウザ通知"
              description={
                notif.permission === "granted"
                  ? "許可されています。アプリを開いたときに届きます"
                  : notif.permission === "denied"
                    ? "ブロックされています。ブラウザの設定から許可してください"
                    : "まだ許可されていません"
              }
              right={
                notif.permission === "granted" ? (
                  <Button variant="secondary" size="sm" onClick={() => showToast("テスト通知を送りました（モック）")}>
                    テスト
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => updateNotif({ permission: "granted" })}>
                    許可する
                  </Button>
                )
              }
            />
          </ListGroup>

          <ListGroup title="タイミング" className={cn(!notif.enabled && "pointer-events-none opacity-50")}>
            {PRESETS.map((p) => {
              const on = notif.preset === p.value
              return (
                <RowButton
                  key={p.value}
                  label={p.label}
                  description={p.desc}
                  onClick={() => updateNotif({ preset: p.value })}
                  detail={
                    <Check
                      className={cn("ml-auto h-5 w-5 text-primary", on ? "opacity-100" : "opacity-0")}
                      strokeWidth={2.6}
                      aria-label={on ? "選択中" : undefined}
                    />
                  }
                />
              )
            })}
          </ListGroup>

          <ListGroup
            title="ミュート中の課題"
            footer={
              <>
                コースごとにまとめて止めるときは{" "}
                <Link href="/mock-v5/settings/courses" className="font-semibold text-primary hover:underline">
                  コース
                </Link>{" "}
                から。
              </>
            }
          >
            {muted.length === 0 ? (
              <RowStatic label={<span className="text-muted-foreground">ミュート中の課題はありません</span>} />
            ) : (
              muted.map((a) => (
                <RowStatic
                  key={a.id}
                  label={a.title}
                  description={courseById(a.courseId)?.name}
                  right={
                    <Button variant="secondary" size="sm" onClick={() => toggleAssignmentMute(a.id)}>
                      解除
                    </Button>
                  }
                />
              ))
            )}
          </ListGroup>
        </div>
      </PageBody>
    </>
  )
}
