"use client";

import { useEffect, useState, useCallback } from "react";
import { Lamp } from "@/components/lamp";
import {
  getNotificationHistory,
  getUnreadCount,
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

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

export function NotificationPanel({ open, onClose, onUnreadChange }: NotificationPanelProps) {
  const [records, setRecords] = useState<NotificationRecord[]>([]);

  const load = useCallback(async () => {
    const history = await getNotificationHistory();
    setRecords(history.sort((a, b) => b.sentAt - a.sentAt));
    const count = await getUnreadCount();
    onUnreadChange(count);
  }, [onUnreadChange]);

  useEffect(() => {
    // 開いたときに履歴をIndexedDBから非同期取得（setStateはawait後＝同期ではない）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) load();
  }, [open, load]);

  const handleRead = async (id: string) => {
    await markAsRead(id);
    await load();
  };

  const handleReadAll = async () => {
    await markAllAsRead();
    await load();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20" />
      <div
        className="absolute inset-x-0 top-0 mx-auto flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-b-2xl border-b border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 pb-3 pt-[max(env(safe-area-inset-top),3rem)]">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">通知</h2>
          {records.some((r) => !r.read) && (
            <button
              onClick={handleReadAll}
              className="text-[12px] font-medium text-accent-blue outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              すべて既読
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {records.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-muted-foreground">通知はありません</p>
          ) : (
            <ul className="divide-y divide-border">
              {records.map((record) => (
                <li key={record.id}>
                  <button
                    onClick={() => !record.read && handleRead(record.id)}
                    className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
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
        </div>
      </div>
    </div>
  );
}
