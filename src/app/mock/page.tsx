"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Brand } from "./_components/shell"
import { Card } from "./_components/ui"

const SCREENS: { group: string; items: { href: string; title: string; desc: string }[] }[] = [
  {
    group: "タブ",
    items: [
      { href: "/mock/home", title: "ホーム", desc: "件数サマリ・はじめの設定・締切でまとめた課題リスト・詳細シート" },
      { href: "/mock/calendar", title: "カレンダー", desc: "週 / 月の切替・選んだ日の課題・提出の進み具合" },
      { href: "/mock/settings", title: "設定", desc: "アカウント・連携・通知・コース・テーマ・ヘルプ・削除" },
    ],
  },
  {
    group: "ホームから開く画面",
    items: [
      { href: "/mock/notifications", title: "通知", desc: "ベルから開く通知の履歴（PC はサイドバー）" },
    ],
  },
  {
    group: "設定の中",
    items: [
      { href: "/mock/settings/notifications", title: "通知の設定", desc: "全体オン/オフ・プッシュ・メール・タイミング・ミュート中の課題" },
      { href: "/mock/settings/courses", title: "コース", desc: "コースごとの通知と表示" },
      { href: "/mock/settings/webclass", title: "WebClass 連携", desc: "取り込み状況・自動取り込み（PC）・URL" },
      { href: "/mock/help", title: "はじめかたと使い方", desc: "はじめの設定チェックリストとガイド一覧" },
      { href: "/mock/help/webclass", title: "ガイド：WebClass の取り込み方", desc: "読みやすさを見直した記事レイアウト" },
    ],
  },
  {
    group: "ナビの外",
    items: [
      { href: "/mock/login", title: "ログイン", desc: "PC は左右2分割" },
      { href: "/mock/import", title: "取り込み画面", desc: "取り込み中・完了・エラー" },
    ],
  },
]

export default function MockIndexPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Brand />
      <h1 className="mt-8 text-[28px] font-bold tracking-[-0.02em]">UI モック</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        ダミーデータで動く新しい画面です。本番のデータには触れません。画面の右端（PC は右下）のボタンから、配色・ダークモード・フォント・データの状態を切り替えられます。
      </p>

      <div className="mt-8 space-y-7">
        {SCREENS.map((g) => (
          <section key={g.group}>
            <h2 className="px-4 pb-2 text-[13px] font-semibold text-ink-3">{g.group}</h2>
            <Card className="divide-y divide-line overflow-hidden">
              {g.items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{s.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{s.desc}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-3/70" aria-hidden />
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </main>
  )
}
