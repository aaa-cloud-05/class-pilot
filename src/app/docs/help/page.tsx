"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Collapsible } from "@/components/Collapsible";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "ブックマークレットが動かない",
    a: (
      <>
        WebClass の「課題実施状況一覧」ページで実行しているか確認してください。別のページでは動きません。手順は{" "}
        <Link href="/docs/webclass" className="text-accent-blue underline">
          WebClass 連携
        </Link>
        へ。
      </>
    ),
  },
  {
    q: "課題が表示されない・少ない",
    a: (
      <>
        WebClass では「すべて表示」を選んでから実行してください。Classroom は1コース最大100件までの取得です。設定で<strong className="text-foreground">非表示</strong>にしたコースは出ません（設定 → コースで確認）。
      </>
    ),
  },
  {
    q: "通知が来ない",
    a: (
      <>
        ①ブラウザの通知を許可 ②設定で通知が全体ON ③そのコースがミュートになっていないか、を確認してください。メール通知は現在<strong className="text-foreground">準備中</strong>です。
      </>
    ),
  },
  {
    q: "今日の日付がずれている",
    a: <>「今日」はお使いの端末の時刻・タイムゾーンに従います。端末側の日時設定をご確認ください。</>,
  },
];

export default function HelpGuidePage() {
  return (
    <>
      <AppHeader
        right={
          <Link
            href="/docs"
            aria-label="ガイドへ戻る"
            className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12.5px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            ガイド
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-24 pt-4">
        <div className="px-1">
          <h1 className="text-[16px] font-semibold text-foreground">安全性・困ったとき</h1>
        </div>

        {/* 安全とプライバシー */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">安全とプライバシー</h2>
          <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>• Google・WebClass とは無関係の<strong className="text-foreground">非公式ツール</strong>です。</li>
            <li>• 課題は<strong className="text-foreground">読み取り専用</strong>で取得し、パスワードは扱いません。</li>
            <li>• WebClass の取り込みは<strong className="text-foreground">あなたのログイン済みの画面</strong>から、あなたの操作でだけ行われます。</li>
            <li>
              • データはいつでも<strong className="text-foreground">設定から削除</strong>できます。詳しくは{" "}
              <Link href="/privacy" className="text-accent-blue underline">プライバシーポリシー</Link>・
              <Link href="/terms" className="text-accent-blue underline">利用規約</Link>。
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="space-y-2">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            よくある質問
          </h2>
          {FAQ.map((item) => (
            <Collapsible key={item.q} title={item.q}>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{item.a}</p>
            </Collapsible>
          ))}
        </section>

        <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
          解決しないときは、設定からデータを削除してやり直すこともできます。
        </p>
      </main>
    </>
  );
}
