"use client"

import { useState } from "react"
import {
  BellRing,
  BookOpen,
  Eraser,
  FileText,
  Globe,
  GraduationCap,
  Info,
  Layers,
  LogIn,
  LogOut,
  Mail,
  Shield,
  Trash2,
  Wrench,
} from "lucide-react"
import { useMock, type Mode } from "../../_components/provider"
import { MobileHeader, PageBody } from "../../_components/shell"
import {
  Button,
  ButtonLink,
  Card,
  INPUT,
  ListGroup,
  RowButton,
  RowLink,
  RowStatic,
  Segmented,
  Sheet,
} from "../../_components/ui"
import { timeAgo } from "../../_lib/format"

const PRESET_LABEL = { relaxed: "余裕派", standard: "標準", urgent: "ギリギリ派" } as const

export default function MockSettingsPage() {
  const { controls, setControl, syncedAt, now, notif, courses, setSyncOpen, showToast } = useMock()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [clearOpen, setClearOpen] = useState(false)

  const visibleCourses = courses.filter((c) => !c.hidden).length

  return (
    <>
      <MobileHeader variant="title" title="設定" />
      <PageBody desktopTitle="アカウントと表示">
        <div className="space-y-7">
          {controls.loggedIn ? (
            <Card className="flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[22px] font-bold text-brand-text">
                佐
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold">佐藤 ひなた</p>
                <p className="truncate text-[14px] text-ink-2">hinata.sato@example.ac.jp</p>
                <p className="mt-0.5 text-[13px] text-ink-3">Google でログイン中</p>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-[18px] font-bold">Google でログイン</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                Classroom の自動取り込み、メールとプッシュの通知、ほかの端末との同期が使えるようになります。
              </p>
              <ButtonLink href="/mock/login" size="lg" className="mt-4 w-full">
                <LogIn className="h-5 w-5" aria-hidden />
                Google でログイン
              </ButtonLink>
              <p className="mt-3 text-[13px] text-ink-3">いまはこの端末の中だけに保存しています。</p>
            </Card>
          )}

          <ListGroup title="連携" className="lg:hidden">
            <RowButton
              icon={GraduationCap}
              iconBg="#1e8e3e"
              label="Google Classroom"
              detail={controls.loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : "未連携"}
              onClick={() => setSyncOpen(true)}
              chevron
            />
            <RowLink
              href="/mock/settings/webclass"
              icon={Globe}
              iconBg="#2f6bff"
              label="WebClass"
              detail={syncedAt.webclass ? timeAgo(syncedAt.webclass, now) : "未設定"}
            />
          </ListGroup>

          <ListGroup title="通知とコース" className="lg:hidden">
            <RowLink
              href="/mock/settings/notifications"
              icon={BellRing}
              iconBg="#e5484d"
              label="通知"
              detail={notif.enabled ? `オン・${PRESET_LABEL[notif.preset]}` : "オフ"}
            />
            <RowLink href="/mock/settings/courses" icon={Layers} iconBg="#8e4ec6" label="コース" detail={`${visibleCourses} コース`} />
          </ListGroup>

          <section>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-ink-3">表示</h2>
            <Card className="p-4">
              <p className="mb-3 text-[16px]">テーマ</p>
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
              <p className="mt-3 text-[13px] leading-relaxed text-ink-3">「自動」は端末の設定に合わせて切り替わります。</p>
            </Card>
          </section>

          <ListGroup title="ヘルプ" className="lg:hidden">
            <RowLink href="/mock/help" icon={BookOpen} iconBg="#0f9d8a" label="はじめかたと使い方" />
            <RowLink href="/mock/help/safety" icon={Shield} iconBg="#636a77" label="安全性とよくある質問" />
          </ListGroup>

          <ListGroup
            title="このアプリについて"
            footer="UnionFetch は Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。"
          >
            <RowLink href="/privacy" icon={FileText} iconBg="#636a77" label="プライバシーポリシー" />
            <RowLink href="/terms" icon={FileText} iconBg="#636a77" label="利用規約" />
            <RowStatic icon={Mail} iconBg="#636a77" label="お問い合わせ" detail="support@unionfetch.com" />
            <RowStatic icon={Info} iconBg="#636a77" label="バージョン" detail="0.1.0" />
          </ListGroup>

          {controls.loggedIn && (
            <ListGroup>
              <RowButton
                icon={LogOut}
                iconBg="#636a77"
                label="ログアウト"
                onClick={() => {
                  setControl("loggedIn", false)
                  showToast("ログアウトしました（モック）")
                }}
              />
            </ListGroup>
          )}

          <ListGroup title="困ったとき・取り消せない操作">
            <RowButton
              icon={Eraser}
              iconBg="#b45309"
              label="この端末のデータを消去"
              description="表示がおかしいときに。ログイン中なら、サーバーのデータは消えません"
              onClick={() => setClearOpen(true)}
            />
            {controls.loggedIn && (
              <RowButton
                icon={Trash2}
                iconBg="#d92d3a"
                label="アカウントを削除"
                tone="danger"
                description="課題・通知設定・Google 連携をすべて削除します"
                onClick={() => {
                  setConfirmText("")
                  setDeleteOpen(true)
                }}
              />
            )}
          </ListGroup>
        </div>
      </PageBody>

      <Sheet open={clearOpen} onClose={() => setClearOpen(false)} title="この端末のデータを消去">
        <div className="space-y-4 pt-2">
          <div className="flex gap-3 rounded-control bg-warn-soft p-4 text-warn">
            <Wrench className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-[14px] leading-relaxed">
              キャッシュ・保存済みの表示データを消して読み込み直します。ログイン状態は保たれます。
            </p>
          </div>
          <p className="text-[15px] leading-relaxed text-ink-2">
            ログインしていない場合は、この端末に保存していた課題も消えます。
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" size="lg" onClick={() => setClearOpen(false)}>
              やめる
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => {
                setClearOpen(false)
                showToast("この端末のデータを消去しました（モック）")
              }}
            >
              消去する
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="アカウントを削除">
        <div className="space-y-4 pt-2">
          <p className="text-[15px] leading-relaxed text-ink-2">次のデータがすべて削除され、元に戻せません。</p>
          <ul className="space-y-1.5 rounded-control bg-surface-2 px-4 py-3 text-[15px]">
            <li>登録・取り込んだ課題</li>
            <li>通知の設定と履歴</li>
            <li>Google との連携情報</li>
          </ul>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold text-ink-2">
              確認のため「削除」と入力してください
            </span>
            <input className={INPUT} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="削除" />
          </label>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" size="lg" onClick={() => setDeleteOpen(false)}>
              やめる
            </Button>
            <Button
              variant="danger"
              size="lg"
              disabled={confirmText !== "削除"}
              onClick={() => {
                setDeleteOpen(false)
                setControl("loggedIn", false)
                showToast("アカウントを削除しました（モック）")
              }}
            >
              完全に削除
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
