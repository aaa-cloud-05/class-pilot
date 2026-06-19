"use client";

import { useEffect } from "react";
import { checkAndNotify } from "@/lib/notification-scheduler";

export function NotificationScheduler() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    checkAndNotify();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkAndNotify();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return null;
}
