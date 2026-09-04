import { prisma } from "@/lib/server/prisma";
import { getUserAssignments } from "@/lib/server/assignments";
import { computePendingNotifications } from "@/lib/server/notification-logic";
import { sendDeadlineEmail } from "@/lib/server/email";
import type { NotificationPreset } from "@/lib/notification-store";

/** 通知を検討する締切の先読み幅（cron 間隔24h + 余裕）。 */
const HORIZON_MS = 30 * 60 * 60 * 1000;

/**
 * 1ユーザー分のメール通知を確定させる（予約 or 即時送信）。送信した通数を返す。
 *
 * cron（1日1回）だけに任せると「cron の後に取り込んだ、その日が締切の課題」に通知が
 * 出ない。WebClass のブックマークレット取り込みは日中に手動で行われる＝本製品が
 * いちばん救いたいケースなので、同期・取り込みの成功時にもこの関数を呼ぶ。
 *
 * 二重送信は NotificationHistory の unique 制約（userId+assignmentId+type+channel）で防ぐ。
 * **送信前に履歴行を作って枠を予約**し、作成できたものだけ送る。こうしないと、
 * 複数タブ/端末の同期が同時に走ったときに同じメールが何通も出る。
 */
export async function notifyUserByEmail(userId: string, now = new Date()): Promise<number> {
  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  if (!ns || !ns.enabled || !ns.emailEnabled) return 0;

  const email = ns.user.email;
  if (!email) return 0;

  const assignments = await getUserAssignments(userId, new Set(ns.hiddenCourses));

  const history = await prisma.notificationHistory.findMany({
    where: { userId, channel: "email" },
    select: { assignmentId: true, type: true },
  });
  const alreadySentKeys = new Set(
    history.map((h) => `${h.assignmentId}:${h.type}:email`),
  );

  const pending = computePendingNotifications(assignments, {
    preset: ns.preset as NotificationPreset,
    mutedCourses: ns.mutedCourses,
    mutedAssignments: ns.mutedAssignments,
    alreadySentKeys,
    now,
    horizonMs: HORIZON_MS,
  });

  let sent = 0;

  for (const p of pending) {
    // 送信枠の予約。既に行があれば他の同期が確保済み＝ここでは何もしない。
    try {
      await prisma.notificationHistory.create({
        data: {
          userId,
          assignmentId: p.assignmentId,
          type: p.type,
          channel: "email",
          title: `締切まで${p.label}`,
          body: `「${p.assignmentTitle}」（${p.courseName}）`,
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") continue; // 予約済み
      throw e;
    }

    // 送る機会を過ぎた通知は履歴だけ閉じる（次の同期で蒸し返さないため）
    if (!p.send) continue;

    try {
      await sendDeadlineEmail({
        to: email,
        assignmentTitle: p.assignmentTitle,
        courseName: p.courseName,
        timeLabel: p.label,
        dueDate: p.dueDate,
        link: p.link,
        scheduledAt: p.scheduledAt,
      });
      sent++;
    } catch (e) {
      // 送信失敗なら予約を戻し、次の同期/cron で再試行できるようにする
      console.error("[NOTIFY] メール送信に失敗:", e);
      await prisma.notificationHistory
        .delete({
          where: {
            userId_assignmentId_type_channel: {
              userId,
              assignmentId: p.assignmentId,
              type: p.type,
              channel: "email",
            },
          },
        })
        .catch(() => {});
    }
  }

  return sent;
}
