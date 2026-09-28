"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/components/app/provider"

/**
 * 締切のメール通知のオン・オフ。通知はメール一本なので、画面のスイッチは1つにまとめる。
 *
 * 裏では2つの値が両方オンのときだけメールが出る（どちらもサーバの NotificationSetting）:
 * - `enabled` … 通知全体。端末（IndexedDB）にも持っていて、「通知」の画面の履歴もこれで止まる
 * - `emailEnabled` … メールで送るか。初期値は false
 * スイッチはこの2つを同時に切り替える。メールはログインが要るので、未ログインは常にオフ。
 *
 * `on` が null のあいだはまだ分からない（サーバに取りに行っている最中）。
 */
export function useEmailNotification() {
  const { loggedIn, settings, updateSettings, showToast } = useApp()
  const [email, setEmail] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loggedIn) return
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((d) => setEmail(d.settings?.emailEnabled ?? false))
      .catch(() => setEmail(false))
  }, [loggedIn])

  const on = !loggedIn ? false : email == null ? null : settings.enabled && email

  const setOn = async (v: boolean) => {
    const prev = email
    setEmail(v)
    updateSettings({ enabled: v })
    const res = await fetch("/api/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailEnabled: v }),
    }).catch(() => null)
    if (!res?.ok) {
      setEmail(prev)
      showToast("設定を保存できませんでした")
    }
  }

  return { on, setOn }
}
