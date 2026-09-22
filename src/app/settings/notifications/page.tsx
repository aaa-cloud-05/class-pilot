"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/provider"
import type { NotificationPreset } from "@/lib/notification-store"
import { disablePush, enablePush, getPushSubscription } from "@/lib/push-client"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { Button, ListGroup, RowButton, RowStatic, Switch } from "@/components/app/ui"

const PRESETS: { value: NotificationPreset; label: string; desc: string }[] = [
  { value: "relaxed", label: "早め", desc: "締切の24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前と3時間前" },
  { value: "urgent", label: "直前", desc: "3時間前と1時間前" },
]

export default function MockNotificationSettingsPage() {
  const { settings, updateSettings, loggedIn, assignments, courseById, toggleAssignmentMute, showToast } = useApp()
  // メールとプッシュは通知設定とは別の場所にある（サーバの emailEnabled と、この端末の購読状態）
  const [email, setEmail] = useState(false)
  const [push, setPush] = useState(false)
  const [permission, setPermission] = useState<"granted" | "default" | "denied">("default")

  useEffect(() => {
    // 通知の許可状態はブラウザにしかないので、マウント後に読む
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof Notification !== "undefined") setPermission(Notification.permission)
    getPushSubscription()
      .then((s) => setPush(s != null))
      .catch(() => {})
    if (!loggedIn) return
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((d) => setEmail(d.settings?.emailEnabled ?? false))
      .catch(() => {})
  }, [loggedIn])

  const toggleEmail = async (v: boolean) => {
    setEmail(v)
    const res = await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled: v }),
    }).catch(() => null)
    if (!res?.ok) {
      setEmail(!v)
      showToast("設定を保存できませんでした")
    }
  }

  const togglePush = async (v: boolean) => {
    const ok = v ? await enablePush().catch(() => false) : await disablePush().catch(() => false)
    if (typeof Notification !== "undefined") setPermission(Notification.permission)
    if (ok) setPush(v)
    else showToast(v ? "プッシュ通知をオンにできませんでした" : "オフにできませんでした")
  }
  const muted = assignments.filter((a) => a.muted)
  const needLogin = !loggedIn

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/settings" />
      <PageBody desktopTitle="通知">
        <div className="space-y-7">
          <ListGroup footer="オフにすると、プッシュ・メール・この端末の通知がすべて止まります。">
            <RowStatic
              label="締切の通知"
              right={<Switch label="締切の通知" checked={settings.enabled} onChange={(v) => updateSettings({ enabled: v })} />}
            />
          </ListGroup>

          <ListGroup
            title="受け取り方"
            footer="iPhone では、Safari の共有ボタン →「ホーム画面に追加」で開いたときだけプッシュ通知を受け取れます。"
            className={cn(!settings.enabled && "pointer-events-none opacity-50")}
          >
            <RowStatic
              label="プッシュ通知"
              description={needLogin ? "ログインすると使えます" : "アプリを閉じていても、この端末に届きます"}
              right={
                <Switch
                  label="プッシュ通知"
                  checked={push && !needLogin}
                  disabled={needLogin || !settings.enabled}
                  onChange={(v) => togglePush(v)}
                />
              }
            />
            <RowStatic
              label="メール通知"
              description={needLogin ? "ログインすると使えます" : "登録しているメールアドレスに届きます"}
              right={
                <Switch
                  label="メール通知"
                  checked={email && !needLogin}
                  disabled={needLogin || !settings.enabled}
                  onChange={(v) => toggleEmail(v)}
                />
              }
            />
            <RowStatic
              label="この端末のブラウザ通知"
              description={
                permission === "granted"
                  ? "許可されています。アプリを開いたときに届きます"
                  : permission === "denied"
                    ? "ブロックされています。ブラウザの設定から許可してください"
                    : "まだ許可されていません"
              }
              right={
                permission === "granted" ? (
                  <Button variant="secondary" size="sm" onClick={() => showToast("テスト通知を送りました（モック）")}>
                    テスト
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => togglePush(true)}>
                    許可する
                  </Button>
                )
              }
            />
          </ListGroup>

          <ListGroup title="タイミング" className={cn(!settings.enabled && "pointer-events-none opacity-50")}>
            {PRESETS.map((p) => {
              const on = settings.preset === p.value
              return (
                <RowButton
                  key={p.value}
                  label={p.label}
                  description={p.desc}
                  onClick={() => updateSettings({ preset: p.value })}
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
                <Link href="/settings/courses" className="font-semibold text-primary hover:underline">
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
