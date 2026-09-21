"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Brand } from "./_components/shell"
import { Card } from "./_components/ui"

const SCREENS: { group: string; items: { href: string; title: string; desc: string }[] }[] = [
  {
    group: "タブ",
    items: [
      { href: "/mock-v5/home", title: "ホーム", desc: "件数サマリ・はじめの設定・締切でまとめた課題リスト・詳細シート" },
      { href: "/mock-v5/calendar", title: "カレンダー", desc: "週 / 月の切替・選んだ日の課題・提出の進み具合" },
      { href: "/mock-v5/settings", title: "設定", desc: "アカウント・連携・通知・コース・テーマ・ヘルプ・削除" },
    ],
  },
  {
    group: "ホームから開く画面",
    items: [
      { href: "/mock-v5/notifications", title: "通知", desc: "ベルから開く通知の履歴（PC はサイドバー）" },
    ],
  },
  {
    group: "設定の中",
    items: [
      { href: "/mock-v5/settings/notifications", title: "通知の設定", desc: "全体オン/オフ・プッシュ・メール・タイミング・ミュート中の課題" },
      { href: "/mock-v5/settings/courses", title: "コース", desc: "コースごとの通知と表示" },
      { href: "/mock-v5/settings/setup", title: "セットアップ", desc: "Classroom・WebClass・通知を1ページで順に設定" },
      { href: "/mock-v5/help", title: "はじめかたと使い方", desc: "はじめの設定チェックリストとガイド一覧" },
      { href: "/mock-v5/help/webclass", title: "ガイド：WebClass の取り込み方", desc: "読みやすさを見直した記事レイアウト" },
    ],
  },
  {
    group: "ナビの外",
    items: [
      { href: "/mock-v5/login", title: "ログイン", desc: "PC は左右2分割" },
      { href: "/mock-v5/import", title: "取り込み画面", desc: "取り込み中・完了・エラー" },
    ],
  },
]

export default function MockIndexPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Brand />
      <h1 className="mt-8 text-[26px] font-semibold tracking-[-0.02em]">UI モック v5</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        「今週のどこにいるか」がひと目で分かることを狙った版です。ダミーデータで動き、本番のデータには触れません。画面の右端（PC は右下）のボタンから、ライト / ダーク・和文フォント・データの状態を切り替えられます。前の版は /mock にあります。
      </p>

      <div className="mt-8 space-y-7">
        {SCREENS.map((g) => (
          <section key={g.group}>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-muted-foreground">{g.group}</h2>
            <Card className="divide-y divide-border overflow-hidden">
              {g.items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{s.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{s.desc}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/70" aria-hidden />
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </main>
  )
}
