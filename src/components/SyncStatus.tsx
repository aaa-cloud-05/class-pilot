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
}

function webclassFreshness(d: Date | null): { dot: string; note?: string; noteColor?: string } {
  if (!d) return { dot: "bg-gray-300" };
  const hours = (Date.now() - d.getTime()) / 3_600_000;
  if (hours >= 24) return { dot: "bg-red-500", note: "更新しよう", noteColor: "text-red-500" };
  if (hours >= 6) return { dot: "bg-amber-500", note: "そろそろ更新", noteColor: "text-amber-600" };
  return { dot: "bg-green-500" };
}

export function SyncStatus({ syncedAt, loggedIn, onRefresh }: SyncStatusProps) {
  const wc = webclassFreshness(syncedAt.webclass);

  return (
    <div className="mx-5 mt-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 text-xs">
      <Link href="/import" className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${wc.dot}`} />
        <span className="text-gray-700">WebClass</span>
        <span className="text-gray-400 truncate">
          {syncedAt.webclass ? `· ${timeAgo(syncedAt.webclass)}` : "· 未取得"}
        </span>
        {wc.note && (
          <span className={`font-medium ${wc.noteColor}`}>{wc.note}</span>
        )}
      </Link>

      {loggedIn && (
        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-gray-700">Classroom</span>
          <span className="text-gray-400">
            {syncedAt.classroom ? `· ${timeAgo(syncedAt.classroom)}` : "· 自動"}
          </span>
        </div>
      )}

      {loggedIn && (
        <button
          onClick={onRefresh}
          className="shrink-0 text-blue-600 font-medium"
        >
          更新
        </button>
      )}
    </div>
  );
}
