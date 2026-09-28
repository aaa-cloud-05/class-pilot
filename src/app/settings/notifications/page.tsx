"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useApp } from "@/components/app/provider"
import type { NotificationPreset } from "@/lib/notification-store"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { Button, ListGroup, RowButton, RowStatic, Switch } from "@/components/app/ui"

const PRESETS: { value: NotificationPreset; label: string; desc: string }[] = [
  { value: "relaxed", label: "早め", desc: "締切の24時間前に1回" },
  { value: "standard", label: "標準", desc: "24時間前と3時間前" },
  { value: "urgent", label: "直前", desc: "3時間前と1時間前" },
]

export default function MockNotificationSettingsPage() {
  const { settings, updateSettings, loggedIn, assignments, courseById, toggleAssignmentMute, showToast } = useApp()
  // 通知はメール一本（プッシュはアプリを開いたときしか出ず役に立たないので外した）。
  // メールのオン・オフは通知設定とは別に、サーバの emailEnabled にある
  const [email, setEmail] = useState(false)

  useEffect(() => {
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

  const muted = assignments.filter((a) => a.muted)
  const needLogin = !loggedIn

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/settings" />
      <PageBody desktopTitle="通知">
        <div className="space-y-7">
          <ListGroup footer="オフにすると、締切のメールが届かなくなります。">
            <RowStatic
              label="締切の通知"
              right={<Switch label="締切の通知" checked={settings.enabled} onChange={(v) => updateSettings({ enabled: v })} />}
            />
          </ListGroup>

          <ListGroup title="受け取り方" className={cn(!settings.enabled && "pointer-events-none opacity-50")}>
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
