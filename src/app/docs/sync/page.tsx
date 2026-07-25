"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Collapsible } from "@/components/Collapsible";

export default function SyncGuidePage() {
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
          <h1 className="text-[16px] font-semibold text-foreground">同期のしくみと注意点</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            データがいつのものか、どう新しくするかを説明します。
          </p>
        </div>

        {/* 自動 / 手動 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">自動で同期</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              アプリを開くと裏側で Classroom を取りに行きます。無駄な通信を避けるため、直近5分以内に取得済みならスキップします。
            </p>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">手動で同期</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              ヘッダーの<strong className="text-foreground">更新ボタン（回転する矢印）</strong>を押すと、その場で最新を取り直します。
            </p>
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">「◯分前」の意味</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              ヘッダーの同期ランプをタップすると「WebClass · ◯分前」のように<strong className="text-foreground">最終取得時刻</strong>が出ます。WebClass は手動取り込みなので、時間が経つと古くなります。ランプの色は新しさの目安（緑＝新しい / 灰＝未取得）。
            </p>
          </div>
        </section>

        {/* 注意点 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-foreground">注意点</h2>
          <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>
              • Classroom は<strong className="text-foreground">1コースにつき最大100件</strong>・
              <strong className="text-foreground">コースは最大30</strong>まで取得します。非常に多い場合、一部の古い課題は取得されないことがあります。
            </li>
            <li>
              • <strong className="text-foreground">未ログイン</strong>では手動追加のみ可能です（編集・削除・別端末との同期はログインが必要）。
            </li>
            <li>
              • <strong className="text-foreground">メール通知は準備中</strong>です。いまはブラウザ通知をご利用ください。
            </li>
            <li>
              • 「今日」の判定は<strong className="text-foreground">お使いの端末の時刻・タイムゾーン</strong>に従います。ずれる場合は端末の設定をご確認ください。
            </li>
          </ul>
        </section>

        {/* 設計の工夫（折りたたみで軽く） */}
        <Collapsible title="くわしい仕組み（なぜこう動くの？）">
          <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">開いた瞬間に速い</strong>：前回の内容を端末内にキャッシュしておき、まずそれを即表示 → 裏で最新に差し替えます。通信が遅くても空白になりません。
            </li>
            <li>
              <strong className="text-foreground">編集が消えない</strong>：あなたが手で直した項目は記録され、あとから自動同期しても<strong className="text-foreground">上書きされません</strong>。削除した課題も同期で復活しません。
            </li>
            <li>
              <strong className="text-foreground">ログイン中はサーバーが本体</strong>：課題や設定はサーバーに保存され、端末内のデータは表示用の写しです。だから別の端末でも同じ状態で見られます。
            </li>
          </ul>
        </Collapsible>
      </main>
    </>
  );
}
