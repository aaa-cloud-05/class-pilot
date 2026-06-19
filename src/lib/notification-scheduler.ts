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
  if (Notification.permission !== "granted") return 0;

  const settings = await getNotificationSettings();
  if (!settings.enabled) return 0;

  const assignments = await getCachedAssignments();
  const now = Date.now();
  const timings = PRESETS[settings.preset];
  let sent = 0;

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
        if (!alreadySent) {
          await showDeadlineNotification(assignment, timing.type);
          await recordNotification(assignment.id, timing.type);
          sent++;
        }
      }
    }
  }

  return sent;
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
