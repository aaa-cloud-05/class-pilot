"use client";

import { useCallback, useEffect, useState } from "react";
import { Lamp } from "@/components/lamp";
import { AppHeader } from "@/components/app-header";
import { NavBar } from "@/components/NavBar";
import {
  getNotificationHistory,
  markAsRead,
  markAllAsRead,
  type NotificationRecord,
} from "@/lib/notification-store";

function timeAgo(sentAt: number): string {
  const diff = Date.now() - sentAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function NotificationsPage() {
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const history = await getNotificationHistory();
    setRecords(history.sort((a, b) => b.sentAt - a.sentAt));
    setLoaded(true);
  }, []);

  useEffect(() => {
    // 履歴はIndexedDBから非同期取得（setStateはawait後＝同期ではない）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleRead = async (id: string) => {
    await markAsRead(id);
    await load();
  };

  const handleReadAll = async () => {
    await markAllAsRead();
    await load();
  };

  const hasUnread = records.some((r) => !r.read);

  return (
    <>
      <AppHeader
        right={
          hasUnread ? (
            <button
              onClick={handleReadAll}
              className="rounded-md px-1.5 py-1 text-[12.5px] font-medium text-accent-blue outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              すべて既読
            </button>
          ) : undefined
        }
      />

      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
        <h1 className="mb-3 px-1 text-[15px] font-semibold text-foreground">アクティビティ</h1>

        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted" />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                  <span className="block h-2.5 w-full animate-pulse rounded bg-muted" />
                </span>
              </li>
            ))}
          </ul>
        ) : records.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">通知はありません</p>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  onClick={() => !record.read && handleRead(record.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="mt-1.5 flex w-2 shrink-0 justify-center">
                    {!record.read ? <Lamp tone="blue" size="sm" /> : <span className="block h-2 w-2" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13.5px] font-medium leading-tight ${
                        record.read ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {record.title}
                    </p>
                    <p
                      className={`mt-0.5 text-[11.5px] leading-snug ${
                        record.read ? "text-muted-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {record.body}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                      {timeAgo(record.sentAt)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <NavBar />
    </>
  );
}
