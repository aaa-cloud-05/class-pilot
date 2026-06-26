import { prisma } from "@/lib/server/prisma";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import { computePendingNotifications } from "@/lib/server/notification-logic";
import { sendDeadlineEmail } from "@/lib/server/email";
import type { NotificationPreset } from "@/lib/notification-store";

const HORIZON_MS = 30 * 60 * 60 * 1000; // 30 hours

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { userId: string; sent: number; error?: string }[] = [];

  const usersWithEmail = await prisma.notificationSetting.findMany({
    where: { emailEnabled: true, enabled: true },
    include: {
      user: {
        include: {
          accounts: {
            where: { provider: "google" },
            select: { refresh_token: true },
          },
        },
      },
    },
  });

  for (const ns of usersWithEmail) {
    const refreshToken = ns.user.accounts[0]?.refresh_token;
    const email = ns.user.email;
    if (!refreshToken || !email) {
      results.push({ userId: ns.userId, sent: 0, error: "no_token_or_email" });
      continue;
    }

    try {
      const accessToken = await refreshAccessToken(refreshToken);
      const { allWork } = await fetchAllData(
        accessToken,
        new Set(ns.hiddenCourses),
      );
      const assignments = allWork.map(({ course, work, submission }) => ({
        ...transformAssignment(course, work, submission),
        source: "classroom" as const,
      }));

      const existingHistory = await prisma.notificationHistory.findMany({
        where: { userId: ns.userId, channel: "email" },
        select: { assignmentId: true, type: true },
      });
      const alreadySentKeys = new Set(
        existingHistory.map((h) => `${h.assignmentId}:${h.type}:email`)
      );

      const pending = computePendingNotifications(assignments, {
        preset: ns.preset as NotificationPreset,
        mutedCourses: ns.mutedCourses,
        mutedAssignments: ns.mutedAssignments,
        alreadySentKeys,
        now,
        horizonMs: HORIZON_MS,
      });

      for (const p of pending) {
        await sendDeadlineEmail({
          to: email,
          assignmentTitle: p.assignmentTitle,
          courseName: p.courseName,
          timeLabel: p.label,
          dueDate: p.dueDate,
          link: p.link,
          scheduledAt: p.scheduledAt,
        });

        await prisma.notificationHistory.upsert({
          where: {
            userId_assignmentId_type_channel: {
              userId: ns.userId,
              assignmentId: p.assignmentId,
              type: p.type,
              channel: "email",
            },
          },
          create: {
            userId: ns.userId,
            assignmentId: p.assignmentId,
            type: p.type,
            channel: "email",
            title: `締切まで${p.label}`,
            body: `「${p.assignmentTitle}」（${p.courseName}）`,
          },
          update: {},
        });
      }

      results.push({ userId: ns.userId, sent: pending.length });
    } catch (e) {
      results.push({
        userId: ns.userId,
        sent: 0,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return Response.json({ ok: true, processed: results.length, results });
}
