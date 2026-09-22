"use client"

import { useState } from "react"
import Link from "next/link"
import { useMock, type Mode } from "../../../_components/provider"
import { Content, TopBar } from "../../../_components/shell"
import {
  Button,
  ButtonLink,
  Field,
  INPUT,
  Panel,
  RowGroup,
  SectionTitle,
  Segmented,
  SettingButton,
  SettingLink,
  SettingRow,
  Sheet,
} from "../../../_components/ui"

export default function AccountPage() {
  const { controls, setControl, showToast } = useMock()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [confirm, setConfirm] = useState("")

  return (
    <>
      <TopBar title="アカウント" back="/mock-v4/settings" />
      <Content className="lg:max-w-xl">
        <div className="space-y-6">
          {controls.loggedIn ? (
            <Panel className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[13px] text-muted-foreground">
                佐
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">佐藤 ひなた</span>
                <span className="block truncate text-[13px] text-muted-foreground">hinata.sato@example.ac.jp</span>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setControl("loggedIn", false)
                  showToast("ログアウトしました（モック）")
                }}
              >
                ログアウト
              </Button>
            </Panel>
          ) : (
            <Panel className="p-4">
              <p className="text-[14px] font-medium">Google でログインしていません</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                課題はこの端末にだけ保存されます。ログインすると Classroom の自動取得・通知・他の端末との同期が使えます。
              </p>
              <ButtonLink href="/mock-v4/login" variant="primary" size="sm" className="mt-3">
                Google でログイン
              </ButtonLink>
            </Panel>
          )}

          <div>
            <SectionTitle>表示</SectionTitle>
            <RowGroup>
              <SettingRow
                label="テーマ"
                right={
                  <Segmented<Mode>
                    label="テーマ"
                    value={controls.mode}
                    onChange={(m) => setControl("mode", m)}
                    options={[
                      { value: "system", label: "自動" },
                      { value: "light", label: "ライト" },
                      { value: "dark", label: "ダーク" },
                    ]}
                  />
                }
              />
            </RowGroup>
          </div>

          <div>
            <SectionTitle>このアプリについて</SectionTitle>
            <RowGroup>
              <SettingLink href="/privacy" label="プライバシーポリシー" />
              <SettingLink href="/terms" label="利用規約" />
              <SettingRow label="お問い合わせ" detail="support@unionfetch.com" />
              <SettingRow label="バージョン" detail="0.1.0" />
            </RowGroup>
          </div>

          <div>
            <SectionTitle>取り消せない操作</SectionTitle>
            <RowGroup>
              <SettingButton
                label="この端末のデータを消去"
                description="表示がおかしいときに。サーバーのデータは残ります"
                chevron={false}
                onClick={() => setClearOpen(true)}
              />
              {controls.loggedIn && (
                <SettingButton
                  label="アカウントを削除"
                  description="課題・設定・連携をすべて削除します"
                  tone="danger"
                  chevron={false}
                  onClick={() => {
                    setConfirm("")
                    setDeleteOpen(true)
                  }}
                />
              )}
            </RowGroup>
          </div>

          <p className="px-1 text-[12px] text-muted-foreground">
            困ったときは{" "}
            <Link href="/mock-v4/settings/help" className="text-primary hover:underline">
              ヘルプ
            </Link>
            へ。
          </p>
        </div>
      </Content>

      <Sheet
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="この端末のデータを消去"
        description="キャッシュを消して読み込み直します。ログイン状態は保たれます。"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setClearOpen(false)}>やめる</Button>
            <Button
              variant="danger"
              onClick={() => {
                setClearOpen(false)
                showToast("消去しました（モック）")
              }}
            >
              消去する
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          ログインしていない場合は、この端末に保存していた課題も消えます。
        </p>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="アカウントを削除"
        description="課題・通知設定・Google 連携がすべて消え、元に戻せません。"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleteOpen(false)}>やめる</Button>
            <Button
              variant="danger"
              disabled={confirm !== "削除"}
              onClick={() => {
                setDeleteOpen(false)
                setControl("loggedIn", false)
                showToast("削除しました（モック）")
              }}
            >
              完全に削除
            </Button>
          </div>
        }
      >
        <Field label="確認のため「削除」と入力">
          <input className={INPUT} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="削除" />
        </Field>
      </Sheet>
    </>
  )
}
