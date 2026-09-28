"use client"

import { useState } from "react"
import {
  BellRing,
  BookOpen,
  Plug,
  Eraser,
  FileText,
  Info,
  Layers,
  LogIn,
  LogOut,
  Mail,
  Trash2,
  Wrench,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useApp, type ThemeMode } from "@/components/app/provider"
import { clearAllClientData } from "@/lib/debug-clear"
import { MobileHeader, PageBody } from "@/components/app/shell"
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
} from "@/components/app/ui"
import { timeAgo } from "@/lib/assignment-format"

const PRESET_LABEL = { relaxed: "早め", standard: "標準", urgent: "直前" } as const

export default function MockSettingsPage() {
  const { loggedIn, mode, setMode, syncedAt, now, settings, courses, showToast } = useApp()
  const { data: session } = useSession()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [clearOpen, setClearOpen] = useState(false)

  const visibleCourses = courses.filter((c) => !c.hidden).length

  return (
    <>
      <MobileHeader variant="title" title="設定" />
      <PageBody desktopTitle="アカウントと表示">
        <div className="space-y-7">
          {loggedIn ? (
            <Card className="flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-[18px] font-semibold text-muted-foreground">
                {(session?.user?.name ?? session?.user?.email ?? "?").trim().charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold">{session?.user?.name ?? "ログイン中"}</p>
                <p className="truncate text-[14px] text-muted-foreground">{session?.user?.email ?? ""}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Google でログイン中</p>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-[18px] font-bold">Google でログイン</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                Classroom の自動取り込み、メールとプッシュの通知、ほかの端末との同期が使えるようになります。
              </p>
              <ButtonLink href="/login" size="lg" className="mt-4 w-full">
                <LogIn className="h-5 w-5" aria-hidden />
                Google でログイン
              </ButtonLink>
              <p className="mt-3 text-[13px] text-muted-foreground">いまはこの端末の中だけに保存しています。</p>
            </Card>
          )}

          <ListGroup title="つなぐ" className="lg:hidden">
            <RowLink
              href="/settings/setup"
              icon={Plug}
              label="セットアップ"
              description="Classroom・WebClass・通知を順に設定"
              detail={
                loggedIn && syncedAt.classroom ? timeAgo(syncedAt.classroom, now) : syncedAt.webclass ? "一部のみ" : "未設定"
              }
            />
          </ListGroup>

          <ListGroup title="通知とコース" className="lg:hidden">
            <RowLink
              href="/settings/notifications"
              icon={BellRing}
             
              label="通知"
              detail={settings.enabled ? `オン・${PRESET_LABEL[settings.preset]}` : "オフ"}
            />
            <RowLink href="/settings/courses" icon={Layers} label="コース" detail={`${visibleCourses} コース`} />
          </ListGroup>

          <section>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-muted-foreground">表示</h2>
            <Card className="p-4">
              <p className="mb-3 text-[16px]">テーマ</p>
              <Segmented<ThemeMode>
                label="テーマ"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "system", label: "自動" },
                  { value: "light", label: "ライト" },
                  { value: "dark", label: "ダーク" },
                ]}
              />
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">「自動」は端末の設定に合わせて切り替わります。</p>
            </Card>
          </section>

          {/* PC は左の一覧に「ヘルプ」があるので、ここにはスマホ用の1行だけ置く */}
          <ListGroup className="lg:hidden">
            <RowLink
              href="/settings/help"
              icon={BookOpen}
              label="ヘルプ"
              description="画面の見かた・同期のしくみ・安全性"
            />
          </ListGroup>

          <ListGroup
            title="このアプリについて"
            footer="UnionFetch は Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。"
          >
            <RowLink href="/privacy" icon={FileText} label="プライバシーポリシー" />
            <RowLink href="/terms" icon={FileText} label="利用規約" />
            <RowStatic icon={Mail} label="お問い合わせ" detail="support@unionfetch.com" />
            <RowStatic icon={Info} label="バージョン" detail="0.1.0" />
          </ListGroup>

          {loggedIn && (
            <ListGroup>
              <RowButton
                icon={LogOut}
               
                label="ログアウト"
                onClick={() => signOut({ callbackUrl: "/" })}
              />
            </ListGroup>
          )}

          <ListGroup title="困ったとき・取り消せない操作">
            <RowButton
              icon={Eraser}
             
              label="この端末のデータを消去"
              description="表示がおかしいときに。ログイン中なら、サーバーのデータは消えません"
              onClick={() => setClearOpen(true)}
            />
            {loggedIn && (
              <RowButton
                icon={Trash2}
               
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
          <div className="flex gap-3 rounded-control border border-border p-4">
            <Wrench className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              キャッシュ・保存済みの表示データを消して読み込み直します。ログイン状態は保たれます。
            </p>
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            ログインしていない場合は、この端末に保存していた課題も消えます。
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" size="lg" onClick={() => setClearOpen(false)}>
              やめる
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={async () => {
                setClearOpen(false)
                await clearAllClientData()
                showToast("この端末のデータを消去しました")
                window.location.reload()
              }}
            >
              消去する
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="アカウントを削除">
        <div className="space-y-4 pt-2">
          <p className="text-[15px] leading-relaxed text-muted-foreground">次のデータがすべて削除され、元に戻せません。</p>
          <ul className="space-y-1.5 rounded-control bg-muted px-4 py-3 text-[15px]">
            <li>登録・取り込んだ課題</li>
            <li>通知の設定と履歴</li>
            <li>Google との連携情報</li>
          </ul>
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold text-muted-foreground">
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
              onClick={async () => {
                setDeleteOpen(false)
                const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null)
                if (!res?.ok) {
                  showToast("削除に失敗しました")
                  return
                }
                await clearAllClientData()
                signOut({ callbackUrl: "/" })
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
