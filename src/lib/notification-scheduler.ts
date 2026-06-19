import { getCachedAssignments } from "./cache";
import {
  getNotificationSettings,
  hasBeenNotified,
  recordNotification,
  type NotificationPreset,
  type NotificationRecord,
} from "./notification-store";

interface PresetTiming {
  minutes: number;
  type: NotificationRecord["type"];
}

const PRESETS: Record<NotificationPreset, PresetTiming[]> = {
  relaxed: [{ minutes: 24 * 60, type: "24h" }],
  standard: [
    { minutes: 24 * 60, type: "24h" },
    { minutes: 3 * 60, type: "3h" },
  ],
  urgent: [
    { minutes: 3 * 60, type: "3h" },
    { minutes: 60, type: "1h" },
  ],
};

export async function checkAndNotify(): Promise<number> {
  if (typeof window === "undefined") return 0;

  if (Notification.permission !== "granted") {
    console.log("[通知] permission:", Notification.permission);
    return 0;
  }

  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    console.log("[通知] 通知が無効です");
    return 0;
  }

  const assignments = await getCachedAssignments();
  const now = Date.now();
  const timings = PRESETS[settings.preset];
  let sent = 0;

  console.log(`[通知] チェック開始: ${assignments.length}件, preset=${settings.preset}`);

  for (const assignment of assignments) {
    if (!assignment.dueDate) continue;
    if (assignment.submissionState === "submitted") continue;
    if (settings.mutedCourses.includes(assignment.courseId)) continue;
    if (settings.mutedAssignments.includes(assignment.id)) continue;

    const minutesLeft = (assignment.dueDate.getTime() - now) / (1000 * 60);
    if (minutesLeft <= 0) continue;

    for (const timing of timings) {
      if (minutesLeft <= timing.minutes) {
        const alreadySent = await hasBeenNotified(assignment.id, timing.type);
        if (alreadySent) {
          console.log(`[通知] スキップ(送信済み): ${assignment.title} ${timing.type}`);
        } else {
          console.log(`[通知] 送信: ${assignment.title} (残り${Math.round(minutesLeft)}分, ${timing.type})`);
          await showDeadlineNotification(assignment, timing.type);
          await recordNotification(assignment.id, timing.type);
          sent++;
        }
      }
    }
  }

  console.log(`[通知] 完了: ${sent}件送信`);
  return sent;
}

export async function sendTestNotification(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    console.log("[通知テスト] Service Worker未登録");
    return;
  }
  await reg.showNotification("テスト通知", {
    body: "通知が正常に動作しています",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "test",
    data: { url: "/" },
  });
}

async function showDeadlineNotification(
  assignment: { id: string; title: string; courseName: string; link: string; dueDate: Date | null },
  type: NotificationRecord["type"]
): Promise<void> {
  const timeLabel = type === "24h" ? "24時間" : type === "3h" ? "3時間" : "1時間";
  const title = `締切まで${timeLabel}`;
  const body = `「${assignment.title}」（${assignment.courseName}）`;

  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) {
    await reg.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `${assignment.id}:${type}`,
      data: { url: assignment.link || "/" },
    });
  }
}
