"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { getNotificationSettings } from "@/lib/notification-store";
import { AppHeader } from "@/components/app-header";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

type StepKey = "login" | "webclass" | "notif";
type DoneMap = Record<StepKey, boolean>;

type Step = {
  n: number;
  title: string;
  desc: string;
  cta: string;
  href: string;
  done: boolean;
  optional?: boolean;
};

// 達成状況をブラウザに記録するキー。一度達成したステップは覚えておき、
// 以後のリロードで再判定せずそのまま「完了」を出す（ちらつき防止）。
const SETUP_DONE_KEY = "docs-setup-done";

// SSRでは no-op、クライアントでは描画前に走る（保存値の反映で一瞬のちらつきを防ぐ）。
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const CHAPTERS = [
  { href: "/docs/webclass", title: "WebClass 連携の手順", desc: "機種別のやり方とブックマークレット", Icon: Download },
  { href: "/docs/screen", title: "画面の見かた", desc: "ランプの色・カレンダー・課題カード", Icon: Eye },
  { href: "/docs/sync", title: "同期のしくみと注意点", desc: "自動/手動の更新・取得の上限など", Icon: RefreshCw },
  { href: "/docs/help", title: "安全性・困ったとき", desc: "プライバシーとよくある質問", Icon: ShieldCheck },
];

export default function DocsHubPage() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const { syncedAt } = useAssignments();
  const [notifOn, setNotifOn] = useState(false);

  // 一度達成したステップは true のまま保持する（戻さない）。初期値は空＝SSRと一致。
  const [savedDone, setSavedDone] = useState<DoneMap>({ login: false, webclass: false, notif: false });

  useEffect(() => {
    getNotificationSettings().then((s) => {
      const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
      setNotifOn(Boolean(s.enabled) && granted);
    });
  }, []);

  // マウント後（描画前）に保存済みの達成状況を反映する。
  useIsoLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(SETUP_DONE_KEY);
      if (raw) setSavedDone((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<DoneMap>) }));
    } catch {
      // localStorage 不可時は無視
    }
  }, []);

  // ライブ状態が「達成」になったら localStorage に記録する（true 方向のみ・戻さない）。
  // 表示は下の done で即反映されるので、ここでは次回リロード用の保存だけ行う（setState不要）。
  useEffect(() => {
    const live: DoneMap = { login: loggedIn, webclass: syncedAt.webclass != null, notif: notifOn };
    try {
      const raw = localStorage.getItem(SETUP_DONE_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<DoneMap>) : {};
      const next: DoneMap = {
        login: Boolean(saved.login) || live.login,
        webclass: Boolean(saved.webclass) || live.webclass,
        notif: Boolean(saved.notif) || live.notif,
      };
      localStorage.setItem(SETUP_DONE_KEY, JSON.stringify(next));
    } catch {
      // localStorage 不可時は無視
    }
  }, [loggedIn, syncedAt.webclass, notifOn]);

  // 表示用の達成状況 = 記録済み or 現在のライブ状態（どちらかが達成なら完了）。
  const done: DoneMap = {
    login: savedDone.login || loggedIn,
    webclass: savedDone.webclass || syncedAt.webclass != null,
    notif: savedDone.notif || notifOn,
  };

  const steps: Step[] = useMemo(
    () => [
      { n: 1, title: "Google Classroom 連携", desc: "ログインするだけで、Classroom の課題を自動で取り込み。", cta: "ログインする", href: "/login", done: done.login },
      { n: 2, title: "WebClass の初期設定", desc: "ブックマークに登録しましょう。以降は2タップで。", cta: "手順を見る", href: "/docs/webclass", done: done.webclass },
      { n: 3, title: "メール通知をオン", desc: "あなたのメールに締め切り通知を届けます。", cta: "通知を設定", href: "/settings", done: done.notif },
      { n: 4, title: "オリジナルタスクを追加", desc: "その他の課題も追加できます。", cta: "追加してみる", href: "/new", done: false, optional: true },
    ],
    [done.login, done.webclass, done.notif],
  );

  const core = useMemo(() => steps.filter((s) => !s.optional), [steps]);
  const doneCount = useMemo(() => core.filter((s) => s.done).length, [core]);
  const pct = Math.round((doneCount / core.length) * 100);

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-md space-y-6 px-4 pb-24 pt-4">
        <div className="px-1">
          <h1 className="text-[17px] font-semibold text-foreground">はじめかたガイド</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Webが教えてくれない課題まで、見逃さない。
          </p>
        </div>

        {/* セットアップ・ウィザード */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>チュートリアル</span>
            <span className="font-mono tabular-nums">
              {doneCount}/{core.length} 完了
            </span>
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.n}>
                <Link
                  href={s.href}
                  className="flex items-center gap-3 rounded-lg px-1 py-2 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      s.done
                        ? "bg-lamp-green/15 text-lamp-green"
                        : "border border-border text-muted-foreground",
                    )}
                  >
                    {s.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium text-foreground">{s.title}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{s.desc}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[11.5px] font-medium",
                      s.done ? "text-muted-foreground" : "text-accent-blue",
                    )}
                  >
                    {s.done ? "完了" : s.cta}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* 章メニュー */}
        <section className="space-y-2">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            ガイド
          </h2>
          {CHAPTERS.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-foreground">{title}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </section>

        <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
          Class Pilot は Google・WebClass とは無関係の非公式ツールです。課題は読み取り専用で取得し、パスワードは扱いません。
        </p>
      </main>
      <NavBar />
    </div>
  );
}
