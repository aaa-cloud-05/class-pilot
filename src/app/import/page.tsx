"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, ChevronLeft } from "lucide-react";
import { transformWebClassTasks, type WebClassRawTask } from "@/lib/webclass";
import { cacheWebClassAssignments, replaceCache } from "@/lib/cache";
import { setLocalWebclassSyncedAt } from "@/lib/sync-meta";
import { AppHeader } from "@/components/app-header";

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
      const raw: WebClassRawTask[] = JSON.parse(decodeURIComponent(hash));
      const assignments = transformWebClassTasks(raw);

      const finish = (n: number) => {
        setCount(n);
        setProgress(100);
        setStatus("done");
        window.location.hash = "";
        setTimeout(() => router.push("/"), 1500);
      };

      if (loggedIn) {
        fetch("/api/import/webclass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("インポートに失敗しました");
            return res.json();
          })
          .then(async ({ assignments: all }) => {
            const parsed = all.map((a: Record<string, unknown>) => ({
              ...a,
              dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
            }));
            await replaceCache(parsed);
            finish(assignments.length);
          })
          .catch((e) => {
            setErrorMsg(e instanceof Error ? e.message : "インポートに失敗しました");
            setStatus("error");
          });
      } else {
        cacheWebClassAssignments(assignments).then(() => {
          setLocalWebclassSyncedAt(Date.now());
          finish(assignments.length);
        });
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lamp-green/15">
          <Check className="h-6 w-6 text-lamp-green" aria-hidden />
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
          className="text-[13px] font-medium text-accent-blue hover:underline"
        >
          ホームへ戻る
        </button>
      </main>
    );
  }

  // ハッシュ無しでこのページに来た場合：取り込みは自動、手順はガイドへ集約。
  return (
    <>
      <AppHeader
        right={
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="ホームへ"
            className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12.5px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            ホーム
          </button>
        }
      />

      <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-24 pt-4">
        <div className="px-1">
          <h1 className="text-[15px] font-semibold text-foreground">WebClass を取り込む</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            このページはブックマークレットの取り込み先です。取り込みは自動で行われます。初めての方は設定手順をご覧ください。
          </p>
        </div>

        <Link
          href="/docs/webclass"
          className="inline-block rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
        >
          取り込み手順を見る
        </Link>
      </main>
    </>
  );
}
