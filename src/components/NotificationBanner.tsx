"use client";

import { useEffect, useState } from "react";
import { saveNotificationSettings } from "@/lib/notification-store";

export function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
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
    <div className="mx-4 my-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
      <p className="text-sm font-medium text-blue-900">
        通知を有効にして締切を見逃さない
      </p>
      <p className="text-xs text-blue-700 mt-1">
        締切前にリマインダーを受け取れます
      </p>
      <button
        onClick={handleEnable}
        className="mt-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        通知を有効にする
      </button>
    </div>
  );
}
