"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/date-utils";

export interface SyncedAt {
  classroom: Date | null;
  webclass: Date | null;
}

interface SyncStatusProps {
  syncedAt: SyncedAt;
  loggedIn: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  syncError: string | null;
}

function webclassFreshness(d: Date | null): { dot: string; note?: string; noteColor?: string } {
  if (!d) return { dot: "bg-gray-300" };
  const hours = (Date.now() - d.getTime()) / 3_600_000;
  if (hours >= 24) return { dot: "bg-red-500", note: "更新しよう", noteColor: "text-red-500" };
  if (hours >= 6) return { dot: "bg-amber-500", note: "そろそろ更新", noteColor: "text-amber-600" };
  return { dot: "bg-green-500" };
}

// Classroomの状態はGoogle同期の成否(syncError)で決まる。
// 成功/未同期は緑、失効は橙、失敗は赤。ドットと時刻表示が矛盾しないようにする。
function classroomStatus(syncError: string | null): { dot: string; note?: string; noteColor?: string } {
  if (syncError === "reauth_required")
    return { dot: "bg-amber-500", note: "要再ログイン", noteColor: "text-amber-600" };
  if (syncError === "sync_failed" || syncError === "no_access_token")
    return { dot: "bg-red-500", note: "同期に失敗", noteColor: "text-red-500" };
  return { dot: "bg-green-500" };
}

export function SyncStatus({ syncedAt, loggedIn, onRefresh, refreshing, syncError }: SyncStatusProps) {
  const wc = webclassFreshness(syncedAt.webclass);
  const cr = classroomStatus(syncError);

  return (
    <div className="mx-5 mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs">
      <div className="flex items-center gap-3">
        <Link href="/import" className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${wc.dot}`} />
          <span className="text-gray-700">WebClass</span>
          <span className="text-gray-400 truncate">
            {syncedAt.webclass ? `· ${timeAgo(syncedAt.webclass)}` : "· 未取得"}
          </span>
          {wc.note && <span className={`font-medium ${wc.noteColor}`}>{wc.note}</span>}
        </Link>

        {loggedIn && (
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3 shrink-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${cr.dot}`} />
            <span className="text-gray-700">Classroom</span>
            <span className="text-gray-400">
              {syncedAt.classroom ? `· ${timeAgo(syncedAt.classroom)}` : "· 自動"}
            </span>
            {cr.note && <span className={`font-medium ${cr.noteColor}`}>{cr.note}</span>}
          </div>
        )}
      </div>

      {loggedIn && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1.5 font-medium text-blue-600 active:bg-gray-100 disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {refreshing ? "更新中…" : "Classroom を更新"}
        </button>
      )}
    </div>
  );
}
