"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { saveNotificationSettings } from "@/lib/notification-store";

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    // ブラウザAPIはSSR不可のためマウント時に読む（初期表示のみ）
    const p = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(p);
  }, []);

  if (permission !== "default") return null;

  async function handleEnable() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await saveNotificationSettings({ enabled: true });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <Bell className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="truncate text-[13px] text-foreground">
          通知を有効にして締切を見逃さない
        </p>
      </div>
      <button
        onClick={handleEnable}
        className="shrink-0 text-[12px] font-medium outline-none transition-opacity hover:opacity-80 focus-visible:underline"
        style={{ color: "var(--accent-blue)" }}
      >
        オンにする
      </button>
    </div>
  );
}
