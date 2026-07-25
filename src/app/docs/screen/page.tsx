"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Lamp } from "@/components/lamp";
import type { LampTone } from "@/lib/lamp";

const LEGEND: { tone: LampTone; label: string; desc: string }[] = [
  { tone: "green", label: "提出済み", desc: "もう出したもの" },
  { tone: "amber", label: "未提出（締切前）", desc: "まだ・でも間に合う" },
  { tone: "red", label: "締切超過", desc: "締切を過ぎた未提出" },
  { tone: "muted", label: "不明", desc: "WebClass で状態が取れないもの" },
];

export default function ScreenGuidePage() {
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
          <h1 className="text-[16px] font-semibold text-foreground">画面の見かた</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            色と形で「いま何をすべきか」がひと目で分かります。
          </p>
        </div>

        {/* ランプの色 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-[13px] font-semibold text-foreground">ランプの色</h2>
          <ul className="space-y-2.5">
            {LEGEND.map((l) => (
              <li key={l.tone} className="flex items-center gap-3">
                <span className="flex w-4 justify-center">
                  <Lamp tone={l.tone} size="md" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-foreground">{l.label}</span>
                  <span className="block text-[11.5px] text-muted-foreground">{l.desc}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
            ランプを<strong className="text-foreground">タップ</strong>すると、その場で提出状況を変えられます（ログイン中）。
          </p>
        </section>

        {/* カレンダー */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">週／月カレンダー</h2>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            ホーム上部のカレンダーで一週間の忙しさをひと目で確認。右上のアイコンで<strong className="text-foreground">週表示⇄月表示</strong>を切り替えられます。
            <strong className="text-foreground">今日</strong>は青字で強調、
            棒やドットの色は上のランプと同じ意味です。<code className="rounded bg-muted px-1 text-[11px]">&lt; &gt;</code>で前後の週/月へ移動できます。
          </p>
        </section>

        {/* 課題カード */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">課題をタップすると</h2>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            リストの課題をタップすると<strong className="text-foreground">詳細カード</strong>が開きます。ここから
            <strong className="text-foreground">元の課題ページを開く</strong>・
            <strong className="text-foreground">鉛筆アイコンで編集</strong>ができます（編集はログイン中）。
          </p>
        </section>

        {/* ドーナツ */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">完了ドーナツ</h2>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            カレンダー右上の小さな輪は、その期間の<strong className="text-foreground">提出済み / 全体</strong>の割合です。埋まるほど提出が進んでいます。
          </p>
        </section>

        <p className="px-1 text-[11.5px] text-muted-foreground">
          課題が古い？{" "}
          <Link href="/docs/sync" className="text-accent-blue underline">
            同期のしくみ
          </Link>{" "}
          もどうぞ。
        </p>
      </main>
    </>
  );
}
