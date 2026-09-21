"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Brand } from "./_components/shell"
import { Panel, SectionTitle } from "./_components/ui"

const GROUPS: { title: string; items: { href: string; label: string; desc: string }[] }[] = [
  {
    title: "アプリ",
    items: [
      { href: "/mock-v3/home", label: "ホーム", desc: "今週の進捗・次の1件・締切順のリスト" },
      { href: "/mock-v3/calendar", label: "カレンダー", desc: "週 / 月。PC は課題名まで表示" },
      { href: "/mock-v3/activity", label: "通知", desc: "届いた通知の履歴" },
    ],
  },
  {
    title: "はじめて使うとき",
    items: [
      { href: "/mock-v3/login", label: "ログイン", desc: "Google で続ける / ログインせずに使う" },
      { href: "/mock-v3/start", label: "セットアップ", desc: "Google → WebClass → 通知 の3ステップ" },
      { href: "/mock-v3/import", label: "取り込み", desc: "取り込み中 / 完了 / エラー" },
    ],
  },
  {
    title: "設定",
    items: [
      { href: "/mock-v3/settings", label: "設定（概要）", desc: "接続・通知・コース・アカウント・ヘルプ" },
      { href: "/mock-v3/settings/connections", label: "接続", desc: "Classroom と WebClass。つなぎ方の比較表つき" },
      { href: "/mock-v3/settings/notifications", label: "通知", desc: "届け方とタイミング" },
      { href: "/mock-v3/settings/help", label: "ヘルプ", desc: "ログインの有無・WebClass・通知の比較表" },
    ],
  },
]

export default function MockV3Index() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Brand />
      <h1 className="mt-6 text-[20px] font-semibold tracking-[-0.01em]">UI モック v3</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
        ダミーデータで動く画面です。本番のデータには触れません。画面の右端（PC は右下）のボタンで、ライト / ダーク・和文フォント・データの状態を切り替えられます。
      </p>

      <div className="mt-7 space-y-6">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <SectionTitle>{g.title}</SectionTitle>
            <Panel className="divide-y divide-border overflow-hidden bg-background">
              {g.items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{s.label}</span>
                    <span className="block text-[13px] text-muted-foreground">{s.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                </Link>
              ))}
            </Panel>
          </section>
        ))}
      </div>
    </main>
  )
}
