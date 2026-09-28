"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle, Check, Globe, ShieldCheck } from "lucide-react";
import { transformWebClassPayload } from "@/lib/webclass";
import { cacheWebClassAssignments, replaceCache } from "@/lib/cache";
import { setLocalWebclassSyncedAt } from "@/lib/sync-meta";
import type { Assignment } from "@/lib/types";
import { Brand } from "@/components/app/shell";
import { Appear, CountUp, motion, SPRING } from "@/components/app/motion";
import { ButtonLink, Card } from "@/components/app/ui";

/** 取り込みが終わってから、ホームへ戻るまで。件数を読める長さにする */
const REDIRECT_MS = 2500;

/** 読み取るものの説明（設定 › セットアップ と同じ文） */
const PRIVACY =
  "読み取るのは課題名・締切・提出したかどうか・課題ページのリンクだけです。パスワードや氏名、学籍番号には触れません。";

const STEPS = [
  { title: "ブックマークレットを登録する", desc: "設定 › セットアップ でコードをコピーして、ブックマークに貼ります" },
  { title: "WebClass を開いてブックマークを押す", desc: "ログインした状態で押すと、課題の一覧を読み取ります" },
  { title: "このページで自動で取り込む", desc: "件数を確かめたら、そのままホームに戻ります" },
];

type Summary = { total: number; open: number; soon: number };

/** 取り込んだ課題の内訳（完了画面に出す） */
function summarize(list: Assignment[], now = Date.now()): Summary {
  const open = list.filter((a) => a.submissionState !== "submitted");
  const week = now + 7 * 24 * 60 * 60 * 1000;
  return {
    total: list.length,
    open: open.length,
    soon: open.filter((a) => a.dueDate && a.dueDate.getTime() >= now && a.dueDate.getTime() <= week).length,
  };
}

/** 枠（ナビは出さない）。ブランドを左上、中身を中央に置く */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Brand />
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}

function PrivacyNote() {
  return (
    <p className="mt-4 flex gap-2 px-1 text-[13px] leading-relaxed text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {PRIVACY}
    </p>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const loggedIn = sessionStatus === "authenticated";
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [summary, setSummary] = useState<Summary>({ total: 0, open: 0, soon: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const hash = window.location.hash.slice(1);
    if (!hash) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("importing");
    try {
      const payload = JSON.parse(decodeURIComponent(hash));
      // 旧ブックマークレット(DOM解析版)は配列を渡してくる。黙って0件にせず作り直しを促す。
      if (Array.isArray(payload) || payload?.v !== 2) {
        throw new Error(
          "ブックマークレットが古い形式です。設定 › セットアップ の手順2でコードをコピーし直して、ブックマークを作り直してください。",
        );
      }
      const assignments = transformWebClassPayload(payload);

      const finish = () => {
        setSummary(summarize(assignments));
        setProgress(100);
        setStatus("done");
        window.location.hash = "";
        setTimeout(() => router.push("/"), REDIRECT_MS);
      };

      const fail = (e: unknown, fallback: string) => {
        console.error("[IMPORT]", e);
        setErrorMsg(e instanceof Error && e.message ? e.message : fallback);
        setStatus("error");
      };

      if (loggedIn) {
        // 応答が返らないと擬似プログレスが90%で固まったまま何も分からなくなるため、
        // 必ず打ち切って理由を出す。
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60_000);

        fetch("/api/import/webclass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
          signal: ctrl.signal,
        })
          .then(async (res) => {
            if (!res.ok) {
              // サーバが返した理由をそのまま見せる（原因究明のため握りつぶさない）
              const detail = await res.text().catch(() => "");
              throw new Error(`インポートに失敗しました (${res.status}) ${detail.slice(0, 200)}`);
            }
            return res.json();
          })
          .then(async ({ assignments: all }) => {
            const parsed = (all ?? []).map((a: Record<string, unknown>) => ({
              ...a,
              dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
            }));
            await replaceCache(parsed);
            finish();
          })
          .catch((e) => {
            if (e?.name === "AbortError") {
              fail(new Error("サーバーの応答が60秒以内に返りませんでした。時間をおいて試してください。"), "");
            } else {
              fail(e, "インポートに失敗しました");
            }
          })
          .finally(() => clearTimeout(timer));
      } else {
        // 未ログイン(IndexedDB)側も catch が無いと同じように固まる
        cacheWebClassAssignments(assignments)
          .then(() => {
            setLocalWebclassSyncedAt(Date.now());
            finish();
          })
          .catch((e) => fail(e, "端末への保存に失敗しました"));
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "データの解析に失敗しました");
      setStatus("error");
    }
  }, [router, sessionStatus, loggedIn]);

  // 取り込み中の擬似進捗（正確ではないが動いている感を出す）。90%まで漸近し、完了時に100%へ。
  useEffect(() => {
    if (status !== "importing") return;
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(1.5, (90 - p) * 0.14)));
    }, 120);
    return () => clearInterval(id);
  }, [status]);

  if (status === "importing") {
    return (
      <Screen>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Globe className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              {/* 通信中であることを示す波紋（装飾） */}
              <motion.span
                className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                animate={{ scale: [1, 1.45], opacity: [0.9, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold">WebClass から取り込み中</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {loggedIn ? "アカウントに保存しています" : "この端末に保存しています"}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-[13px] tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </Card>
        <PrivacyNote />
      </Screen>
    );
  }

  if (status === "done") {
    return (
      <Screen>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          </motion.div>
          <p className="mt-5 text-[15px] font-medium text-muted-foreground">WebClass から取り込みました</p>
          <p className="mt-2 flex items-baseline justify-center gap-1.5">
            <CountUp value={summary.total} className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums" />
            <span className="text-[16px] font-medium text-muted-foreground">件</span>
          </p>
        </div>

        <Appear delay={0.15}>
          <Card className="mt-6 grid grid-cols-2 divide-x divide-border">
            {[
              { label: "未提出", value: summary.open },
              { label: "7日以内に締切", value: summary.soon },
            ].map((s) => (
              <div key={s.label} className="px-4 py-4 text-center">
                <p className="text-[13px] text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </Card>
        </Appear>

        <ButtonLink href="/" size="lg" className="mt-6 w-full">
          ホームへ
        </ButtonLink>
        {/* 自動でホームへ戻るまでの残り時間 */}
        <div className="mx-auto mt-4 h-0.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div
            className="h-full bg-muted-foreground/50"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: REDIRECT_MS / 1000, ease: "linear" }}
          />
        </div>
        <p className="mt-2 text-center text-[13px] text-muted-foreground">まもなくホームへ移動します</p>
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="mt-5 text-[18px] font-bold">取り込めませんでした</p>
          <p className="mt-2 break-words text-[14px] leading-relaxed text-muted-foreground">{errorMsg}</p>
        </div>
        <div className="mt-8 space-y-2">
          <ButtonLink href="/" size="lg" className="w-full">
            ホームへ戻る
          </ButtonLink>
          <ButtonLink href="/settings/setup" variant="ghost" size="lg" className="w-full">
            取り込み手順を見る
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  // ハッシュ無しでこのページに来た場合：取り込みの流れを見せて、手順はセットアップへ集約。
  return (
    <Screen>
      <Appear>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Globe className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="mt-5 text-[24px] font-bold tracking-[-0.02em]">WebClass の課題を取り込む</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          ここはブックマークレットの取り込み先です。WebClass を開いた状態でブックマークを押すと、課題がこのページに届いて自動で取り込まれます。
        </p>
      </Appear>

      <Appear delay={0.08}>
        <Card className="mt-6 p-5">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <PrivacyNote />
      </Appear>

      <div className="mt-8 space-y-2">
        <ButtonLink href="/settings/setup" size="lg" className="w-full">
          取り込み手順を見る
        </ButtonLink>
        <ButtonLink href="/" variant="ghost" size="lg" className="w-full">
          ホームへ
        </ButtonLink>
      </div>
      <p className="mt-6 text-center text-[12px] text-muted-foreground">
        UnionFetch は Google・WebClass とは関係のない非公式ツールです。
        <Link href="/privacy" className="ml-1 underline hover:text-foreground">
          プライバシーポリシー
        </Link>
      </p>
    </Screen>
  );
}
