"use client";

import { useEffect } from "react";
import { checkAndNotify } from "@/lib/notification-scheduler";

export function NotificationScheduler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

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
