"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { transformWebClassTasks, type WebClassRawTask } from "@/lib/webclass";
import { cacheWebClassAssignments, cacheAssignments } from "@/lib/cache";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/notification-store";
import { CourseSelectDialog } from "@/components/CourseSelectDialog";

export default function ImportPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const loggedIn = sessionStatus === "authenticated";
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [count, setCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingCourses, setPendingCourses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const hash = window.location.hash.slice(1);
    if (!hash) return;

    setStatus("importing");
    try {
      const raw: WebClassRawTask[] = JSON.parse(decodeURIComponent(hash));
      const assignments = transformWebClassTasks(raw);

      const finish = (n: number) => {
        setCount(n);
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
          .then(async ({ assignments: all, newCourses }) => {
            const parsed = all.map((a: Record<string, unknown>) => ({
              ...a,
              dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
            }));
            await cacheAssignments(parsed);
            if (newCourses && newCourses.length > 0) {
              setCount(assignments.length);
              setStatus("done");
              window.location.hash = "";
              setPendingCourses(newCourses);
            } else {
              finish(assignments.length);
            }
          })
          .catch((e) => {
            setErrorMsg(e instanceof Error ? e.message : "インポートに失敗しました");
            setStatus("error");
          });
      } else {
        cacheWebClassAssignments(assignments).then(() => finish(assignments.length));
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "データの解析に失敗しました");
      setStatus("error");
    }
  }, [router, sessionStatus, loggedIn]);

  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);
  const [bookmarkletCode, setBookmarkletCode] = useState("");

  useEffect(() => {
    const origin = window.location.origin;
    const code = `javascript:void((function(){var d=document,f=d.getElementById('ip-iframe');if(f){try{d=f.contentDocument||f.contentWindow.document}catch(e){}}var app=d.getElementById('app');if(!app){alert('課題実施状況一覧ページで実行してください');return}var ts=[];d.querySelectorAll('.bg-blue-100').forEach(function(h){var a=h.querySelector('a.font-semibold');if(!a)return;var nm=a.textContent.trim().replace(/^\\d{4}\\s*/,'');var url=a.href;var nx=h.nextElementSibling;if(!nx)return;nx.querySelectorAll('tbody tr').forEach(function(r){var td=r.querySelectorAll('td');if(td.length<5)return;ts.push({c:nm,u:url,t:td[0].textContent.trim(),d:(r.querySelector('[data-test="締切"] span')||{}).textContent||'',f:(r.querySelector('[data-test="実施日"] span')||{}).textContent||'',s:(r.querySelector('[data-test="最高点"] span')||{}).textContent||'',st:(r.querySelector('[data-test="状態"] span')||{}).textContent||''})})});if(!ts.length){alert('課題が見つかりません');return}var u='${origin}/import#'+encodeURIComponent(JSON.stringify(ts));var w=window.open(u);if(!w)window.location.href=u})())`;
    setBookmarkletCode(code);
    if (bookmarkletRef.current) {
      bookmarkletRef.current.setAttribute("href", code);
    }
  }, []);

  if (status === "importing") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">取り込み中…</p>
      </div>
    );
  }

  if (status === "done" && pendingCourses.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="text-4xl">&#10003;</div>
        <p className="text-lg font-semibold">{count}件の課題を取り込みました</p>
        <CourseSelectDialog
          courses={pendingCourses}
          onConfirm={async (hiddenIds) => {
            const current = await getNotificationSettings();
            const mergedHidden = [...new Set([...current.hiddenCourses, ...hiddenIds])];
            const allCourseIds = pendingCourses.map((c) => c.id);
            await fetch("/api/notifications/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                hiddenCourses: mergedHidden,
                acknowledgedCourses: allCourseIds,
              }),
            });
            await saveNotificationSettings({ hiddenCourses: mergedHidden });
            router.push("/");
          }}
        />
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="text-4xl">&#10003;</div>
        <p className="text-lg font-semibold">{count}件の課題を取り込みました</p>
        <p className="text-sm text-gray-400">ホームへ移動します…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6">
        <p className="text-red-500">{errorMsg}</p>
        <button onClick={() => router.push("/")} className="text-blue-600 text-sm">
          ホームへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-10 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">WebClass 連携</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">PC の場合</h2>
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-3">
          <li>
            下のボタンをブックマークバーに<strong>ドラッグ</strong>：
            <div className="mt-2 mb-1">
              <a
                ref={bookmarkletRef}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="inline-block bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg cursor-grab"
              >
                WebClass → Class Pilot
              </a>
            </div>
          </li>
          <li>WebClass の「課題実施状況一覧」ダッシュボードを開く</li>
          <li>「すべて表示」を選択 → ブックマークレットをクリック</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">モバイルの場合</h2>
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-3">
          <li>
            下のコードをコピー：
            <div className="mt-2 mb-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bookmarkletCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-4 py-2 rounded-lg active:bg-gray-200"
              >
                {copied ? "コピーしました ✓" : "ブックマークレットコードをコピー"}
              </button>
            </div>
          </li>
          <li>任意のページをブックマーク → ブックマークを編集 → URLを貼り替え</li>
          <li>WebClass の「課題実施状況一覧」を開き、「すべて表示」を選択</li>
          <li>アドレスバーからブックマークを実行</li>
        </ol>
      </section>

      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-400"
      >
        ← ホームへ戻る
      </button>
    </div>
  );
}
