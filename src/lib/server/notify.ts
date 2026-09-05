import { prisma } from "@/lib/server/prisma";
import { getUserAssignments } from "@/lib/server/assignments";
import {
  computePendingNotifications,
  type PendingNotification,
} from "@/lib/server/notification-logic";
import { sendDeadlineEmail } from "@/lib/server/email";
import { sendPushToUser, isPushConfigured } from "@/lib/server/push";
import type { NotificationPreset } from "@/lib/notification-store";
import type { Assignment } from "@/lib/types";

/** 通知を検討する締切の先読み幅（cron 間隔24h + 余裕）。 */
const HORIZON_MS = 30 * 60 * 60 * 1000;

type Channel = "email" | "push";

/**
 * 1ユーザー分の通知を確定させる。メールと Web Push の両方を扱う。
 *
 * cron（1日1回）だけに任せると「cron の後に取り込んだ、その日が締切の課題」に通知が
 * 出ない。WebClass の取り込みは日中に行われる＝本製品がいちばん救いたいケースなので、
 * 同期・取り込みの成功時にもこの関数を呼ぶ。
 *
 * 二重送信は NotificationHistory の unique 制約（userId+assignmentId+type+channel）で防ぐ。
 * **送信前に履歴行を作って枠を予約**し、作成できたものだけ送る。こうしないと、
 * 複数タブ/端末の同期が同時に走ったときに同じ通知が何度も出る。
 * チャネルが違えば別の行になるので、メールと Push は互いに邪魔しない。
 */
export async function notifyUser(
  userId: string,
  now = new Date(),
): Promise<{ email: number; push: number }> {
  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  if (!ns || !ns.enabled) return { email: 0, push: 0 };

  // 送り先が1つも無いなら、課題を読む前に抜ける（無駄なクエリを出さない）
  const emailAddress = ns.emailEnabled ? ns.user.email : null;
  const pushEnabled =
    isPushConfigured() &&
    (await prisma.pushSubscription.count({ where: { userId } })) > 0;
  if (!emailAddress && !pushEnabled) return { email: 0, push: 0 };

  const assignments = await getUserAssignments(userId, new Set(ns.hiddenCourses));
  if (assignments.length === 0) return { email: 0, push: 0 };

  // チャネル込みのキーで一度に読む（チャネルごとにDBを叩き直さない）
  const history = await prisma.notificationHistory.findMany({
    where: { userId },
    select: { assignmentId: true, type: true, channel: true },
  });
  const alreadySentKeys = new Set(
    history.map((h) => `${h.assignmentId}:${h.type}:${h.channel}`),
  );

  const [email, push] = await Promise.all([
    emailAddress
      ? deliver(userId, "email", true, assignments, ns, alreadySentKeys, now, (p) =>
          sendDeadlineEmail({
            to: emailAddress,
            assignmentTitle: p.assignmentTitle,
            courseName: p.courseName,
            timeLabel: p.label,
            dueDate: p.dueDate,
            link: p.link,
            scheduledAt: p.scheduledAt,
          }),
        )
      : Promise.resolve(0),
    pushEnabled
      ? deliver(userId, "push", false, assignments, ns, alreadySentKeys, now, async (p) => {
          const ok = await sendPushToUser(userId, {
            title: `締切まで${p.label}`,
            body: `${p.assignmentTitle}（${p.courseName}）`,
            // 通知をタップしたらアプリを開く。課題ページ自体はログインが要るため
            url: "/",
            tag: `deadline-${p.assignmentId}`,
          });
          // 1台も届かなかったら「送れなかった」扱いにして予約を戻す
          if (!ok) throw new Error("push_not_delivered");
        })
      : Promise.resolve(0),
  ]);

  if (email > 0 || push > 0) {
    console.log(`[NOTIFY] ${userId.slice(0, 8)} メール${email}件 / プッシュ${push}件`);
  }
  return { email, push };
}

/**
 * 1チャネル分の送信。送った通数を返す。
 *
 * `canSchedule=false`（Push）では「送り時が来た分」しか結果に入らないので、
 * まだ先のタイミングは何も起きず、次の実行に持ち越される。
 */
async function deliver(
  userId: string,
  channel: Channel,
  canSchedule: boolean,
  assignments: Assignment[],
  ns: { preset: string; mutedCourses: string[]; mutedAssignments: string[] },
  alreadySentKeys: Set<string>,
  now: Date,
  send: (p: PendingNotification) => Promise<void>,
): Promise<number> {
  const pending = computePendingNotifications(assignments, {
    preset: ns.preset as NotificationPreset,
    mutedCourses: ns.mutedCourses,
    mutedAssignments: ns.mutedAssignments,
    alreadySentKeys,
    now,
    horizonMs: HORIZON_MS,
    channel,
    canSchedule,
  });

  let sent = 0;

  for (const p of pending) {
    // 送信枠の予約。既に行があれば他の実行が確保済み＝ここでは何もしない。
    try {
      await prisma.notificationHistory.create({
        data: {
          userId,
          assignmentId: p.assignmentId,
          type: p.type,
          channel,
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
      await send(p);
      sent++;
    } catch (e) {
      // 送信失敗なら予約を戻し、次の同期/cron で再試行できるようにする
      console.error(`[NOTIFY] ${channel} の送信に失敗:`, e);
      await prisma.notificationHistory
        .delete({
          where: {
            userId_assignmentId_type_channel: {
              userId,
              assignmentId: p.assignmentId,
              type: p.type,
              channel,
            },
          },
        })
        .catch(() => {});
    }
  }

  return sent;
}
