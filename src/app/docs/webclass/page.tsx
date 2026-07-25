"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Collapsible } from "@/components/Collapsible";
import { buildBookmarkletCode } from "@/lib/bookmarklet";
import { cn } from "@/lib/utils";

type Browser = "pc" | "safari" | "chrome";

const TABS: { value: Browser; label: string }[] = [
  { value: "pc", label: "PC" },
  { value: "safari", label: "Safari" },
  { value: "chrome", label: "Chrome" },
];

// コードが何をしているかを、専門用語すくなめで説明する。
const CODE_EXPLAIN = [
  "いま開いている WebClass の「課題実施状況一覧」ページ（枠内の表示も含む）を読みます。",
  "各授業の行から「課題名・締切・提出状態・課題ページのリンク」だけを取り出します。",
  "取り出した一覧をまとめて、Class Pilot の取り込みページを開いて渡します。",
  "送るのは課題の情報だけ。パスワードやログイン情報（Cookie）には触れません。",
];

const STEPS: Record<Browser, string[]> = {
  pc: [
    "コードをコピーします。",
    "ブックマークバーに任意のページをブックマークします（Ctrl / ⌘ + D）。",
    "そのブックマークを右クリック →「編集」を開きます。",
    "URL 欄を、コピーしたコードに貼り替えて保存します。名前は「WebClassを取り込む」など分かりやすいものに。",
    "WebClass の「課題実施状況一覧」を開き「すべて表示」にしてから、ブックマークバーの項目をクリックします。",
  ],
  safari: [
    "上のコードをコピーします。",
    "適当なページを「お気に入り／ブックマーク」に追加します。",
    "そのブックマークを編集します（Mac: サイドバーで右クリック →「アドレスを編集」／ iPhone: ブックマーク一覧 →「編集」→ 該当項目）。",
    "アドレス（URL）欄を、コピーしたコードに貼り替えて保存します。名前は「WebClassを取り込む」など分かりやすいものに。",
    "WebClass の「課題実施状況一覧」を開き「すべて表示」にしてから、作ったブックマークを開きます。",
  ],
  chrome: [
    "上のコードをコピーします。",
    "任意のページを☆（ブックマーク）に追加します。",
    "ブックマークを編集します（ブックマークバーで右クリック →「編集」、またはブックマークマネージャから）。",
    "URL 欄を、コピーしたコードに貼り替えて保存します。名前は自由です。",
    "WebClass の「課題実施状況一覧」を開き「すべて表示」にしてから、作ったブックマークを開きます。",
  ],
};

export default function WebclassGuidePage() {
  const [browser, setBrowser] = useState<Browser>("pc");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(buildBookmarkletCode(window.location.origin));
  }, []);

  function copy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
          <h1 className="text-[16px] font-semibold text-foreground">WebClass を取り込む</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            WebClass は純正では通知も一覧もありません。ブックマークレット（ワンタップの小さなショートカット）で課題をまとめて取り込みます。
          </p>
        </div>

        {/* やさしい説明・安全性 */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-lamp-green" aria-hidden />
            <h2 className="text-[13px] font-semibold text-foreground">このボタンは何をするの？</h2>
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            いま開いている WebClass の「課題実施状況一覧」ページから、
            <strong className="text-foreground">課題の名前・締切・状態だけ</strong>を読み取って Class Pilot に渡します。
            パスワードやログイン情報には<strong className="text-foreground">触れません</strong>。あなたの操作でだけ動き、勝手に送信することもありません。
          </p>
        </section>

        {/* コード全文 + 解説 + コピー */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground">コピーするコード</h2>
            <button
              onClick={copy}
              disabled={!code}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? "コピーしました" : "コピー"}
            </button>
          </div>

          <p className="mb-2 text-[12px] leading-relaxed text-muted-foreground">
            登録するコードはこういう動きをします：
          </p>
          <ol className="mb-3 list-inside list-decimal space-y-1 text-[12px] leading-relaxed text-muted-foreground">
            {CODE_EXPLAIN.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>

          <Collapsible title="コードの全文を見る">
            <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
              <code className="whitespace-pre-wrap break-all font-mono">
                {code || "読み込み中…"}
              </code>
            </pre>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              ※ 先頭は <code className="rounded bg-muted px-1">javascript:</code> で始まります。安全のため、意味の分からないコードを他の場所から貼らないでください。ここに表示されているものがすべてです。
            </p>
          </Collapsible>
        </section>

        {/* ブラウザ別の手順 */}
        <div>
          <div className="mb-3 flex gap-1 rounded-lg border border-border p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setBrowser(t.value)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  browser === t.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <ol className="list-inside list-decimal space-y-2.5 rounded-xl border border-border bg-card p-4 text-[13px] leading-relaxed text-foreground">
            {STEPS[browser].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
          実行すると自動で取り込み画面に移り、ホームに反映されます。ログイン中はサーバーにも保存され、別の端末でも見られます。
        </p>

        <p className="px-1 text-[11.5px] text-muted-foreground">
          ※ ブックマークレットの設定はやや手間ですが、一度設定すれば以後はワンタップです。うまくいかないときは{" "}
          <Link href="/docs/help" className="text-accent-blue underline">
            困ったとき
          </Link>{" "}
          を参照してください。
        </p>
      </main>
    </>
  );
}
