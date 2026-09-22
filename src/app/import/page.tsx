"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import { transformWebClassPayload } from "@/lib/webclass";
import { cacheWebClassAssignments, replaceCache } from "@/lib/cache";
import { setLocalWebclassSyncedAt } from "@/lib/sync-meta";
import { Brand } from "@/components/app/shell";

export default function ImportPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const loggedIn = sessionStatus === "authenticated";
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [count, setCount] = useState(0);
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
          "ブックマークレットが古い形式です。はじめかたガイドの WebClass の手順から作り直してください。",
        );
      }
      const assignments = transformWebClassPayload(payload);

      const finish = (n: number) => {
        setCount(n);
        setProgress(100);
        setStatus("done");
        window.location.hash = "";
        setTimeout(() => router.push("/"), 1500);
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
            finish(assignments.length);
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
            finish(assignments.length);
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
      <main className="flex min-h-screen flex-col items-center justify-center px-8">
        <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>WebClass の課題を取り込み中…</span>
            <span className="font-mono tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <p className="text-[15px] font-semibold text-foreground">{count}件の課題を取り込みました</p>
        <p className="text-[12px] text-muted-foreground">ホームへ移動します…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-[13px] text-destructive">{errorMsg}</p>
        <button
          onClick={() => router.push("/")}
          className="text-[13px] font-medium text-primary hover:underline"
        >
          ホームへ戻る
        </button>
      </main>
    );
  }

  // ハッシュ無しでこのページに来た場合：取り込みは自動、手順はガイドへ集約。
  return (
    <>
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[52px] max-w-xl items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
          <Brand />
          <button
            type="button"
            onClick={() => router.push("/")}
            className="ml-auto rounded-control px-2 py-1 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            ホームへ
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-24 pt-4">
        <div className="px-1">
          <h1 className="text-[15px] font-semibold text-foreground">WebClass を取り込む</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            このページはブックマークレットの取り込み先です。取り込みは自動で行われます。初めての方は設定手順をご覧ください。
          </p>
        </div>

        <Link
          href="/settings/setup"
          className="inline-block rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
        >
          取り込み手順を見る
        </Link>
      </main>
    </>
  );
}
