"use client";

import { useEffect, useState, useCallback } from "react";
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
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="absolute top-0 left-0 right-0 max-h-[70vh] bg-white rounded-b-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold pt-12">通知</h2>
          {records.some((r) => !r.read) && (
            <button
              onClick={handleReadAll}
              className="text-xs text-blue-500 font-medium pt-12"
            >
              すべて既読
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {records.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">
              通知はありません
            </p>
          ) : (
            records.map((record) => (
              <button
                key={record.id}
                onClick={() => !record.read && handleRead(record.id)}
                className="w-full text-left flex items-start gap-3 px-5 py-4 border-b border-gray-50 active:bg-gray-50 transition"
              >
                <div className="mt-1.5 shrink-0">
                  {!record.read ? (
                    <span className="block w-2 h-2 rounded-full bg-blue-500" />
                  ) : (
                    <span className="block w-2 h-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${record.read ? "text-gray-400" : "text-gray-900"}`}>
                    {record.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${record.read ? "text-gray-300" : "text-gray-500"}`}>
                    {record.body}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    {timeAgo(record.sentAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
