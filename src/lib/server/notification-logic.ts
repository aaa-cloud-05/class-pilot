import type { NotificationPreset } from "@/lib/notification-store";

export interface NotificationTiming {
  minutes: number;
  type: "24h" | "3h" | "1h";
  label: string;
}

const PRESETS: Record<NotificationPreset, NotificationTiming[]> = {
  relaxed: [{ minutes: 24 * 60, type: "24h", label: "24時間" }],
  standard: [
    { minutes: 24 * 60, type: "24h", label: "24時間" },
    { minutes: 3 * 60, type: "3h", label: "3時間" },
  ],
  urgent: [
    { minutes: 3 * 60, type: "3h", label: "3時間" },
    { minutes: 60, type: "1h", label: "1時間" },
  ],
};

export function getTimingsForPreset(preset: NotificationPreset): NotificationTiming[] {
  return PRESETS[preset] ?? PRESETS.standard;
}

export interface PendingNotification {
  assignmentId: string;
  assignmentTitle: string;
  courseName: string;
  courseId: string;
  dueDate: Date;
  link: string;
  type: "24h" | "3h" | "1h";
  label: string;
  scheduledAt: Date;
}

interface AssignmentForNotify {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  dueDate: Date | null;
  link: string;
  submissionState: string;
}

interface NotifyContext {
  preset: NotificationPreset;
  mutedCourses: string[];
  mutedAssignments: string[];
  alreadySentKeys: Set<string>;
  now: Date;
  horizonMs: number;
}

export function computePendingNotifications(
  assignments: AssignmentForNotify[],
  ctx: NotifyContext,
): PendingNotification[] {
  const timings = getTimingsForPreset(ctx.preset);
  const pending: PendingNotification[] = [];
  const nowMs = ctx.now.getTime();

  for (const a of assignments) {
    if (!a.dueDate) continue;
    if (a.submissionState === "submitted" || a.submissionState === "returned") continue;
    if (ctx.mutedCourses.includes(a.courseId)) continue;
    if (ctx.mutedAssignments.includes(a.id)) continue;

    const dueMs = a.dueDate.getTime();
    if (dueMs <= nowMs) continue;
    if (dueMs > nowMs + ctx.horizonMs) continue;

    for (const timing of timings) {
      const sentKey = `${a.id}:${timing.type}:email`;
      if (ctx.alreadySentKeys.has(sentKey)) continue;

      const scheduledAt = new Date(dueMs - timing.minutes * 60 * 1000);
      if (scheduledAt.getTime() < nowMs) continue;

      pending.push({
        assignmentId: a.id,
        assignmentTitle: a.title,
        courseName: a.courseName,
        courseId: a.courseId,
        dueDate: a.dueDate,
        link: a.link,
        type: timing.type,
        label: timing.label,
        scheduledAt,
      });
    }
  }

  return pending;
}
