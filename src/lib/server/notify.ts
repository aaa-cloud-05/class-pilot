import { prisma } from "@/lib/server/prisma";
import { getUserAssignments } from "@/lib/server/assignments";
import {
  computePendingNotifications,
  isCancellable,
  planHistoryCleanup,
  type PendingNotification,
} from "@/lib/server/notification-logic";
import { cancelScheduledEmail, sendDeadlineEmail } from "@/lib/server/email";
import { formatDueJst } from "@/lib/server/email-template";
import { sendPushToUser, isPushConfigured } from "@/lib/server/push";
import { remindersOf } from "@/lib/reminders";
import type { Assignment } from "@/lib/types";

/**
 * いま予約する送信時刻の先読み幅。cron は1日1回（Vercel Hobby は最大59分ずれる）なので、
 * 次の cron までに来る送信時刻を取りこぼさないよう、24時間 + 余裕にする。
 */
const HORIZON_MS = 30 * 60 * 60 * 1000;

/** 送信の直前（この時間以内）の予約は取り消そうとしない。Resend 側で送信が始まっている可能性がある */
const CANCEL_MARGIN_MS = 60 * 1000;

/**
 * 利用者の操作（同期・取り込み・追加・編集・設定）の直後は、この先30分以内に来る送信時刻を予約しない。
 * 課題を追加した直後にメールが届かないようにする（src/lib/server/notification-logic.ts の graceMs）。
 */
const GRACE_MS = 30 * 60 * 1000;

type Channel = "email" | "push";

/**
 * 1ユーザー分の通知を確定させる。メールと Web Push の両方を扱う（画面から使えるのはメールだけ）。
 *
 * 呼ぶ場所: 毎朝の cron（`fromCron: true`）、Classroom の同期、WebClass の取り込み、
 * 課題の追加・編集・削除、通知設定の変更。「いまの状態に合わせ直す」処理なので、何度呼んでもよい。
 *
 * 1. 予約済みで要らなくなったメールを取り消す（提出した・締切が変わった・ミュートした・
 *    課題が消えた・タイミングを変えた・通知を切った）
 * 2. 締切が変わった課題は、送った分も含めて履歴を消す（新しい締切でもう一度知らせるため）
 * 3. これから送るものを予約する。送り時を過ぎたものの救済（即時送信）は cron のときだけ
 *    （利用者の操作の直後にメールが飛ばないように）
 *
 * 二重送信は NotificationHistory の unique 制約（userId+assignmentId+type+channel）で防ぐ。
 * **送信前に履歴行を作って枠を予約**し、作成できたものだけ送る。こうしないと、
 * 複数タブ/端末の同期が同時に走ったときに同じ通知が何度も出る。
 * チャネルが違えば別の行になるので、メールと Push は互いに邪魔しない。
 */
export async function notifyUser(
  userId: string,
  { now = new Date(), fromCron = false }: { now?: Date; fromCron?: boolean } = {},
): Promise<{ email: number; push: number }> {
  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    include: { user: { select: { email: true } } },
  });
  if (!ns) return { email: 0, push: 0 };

  const emailAddress = ns.enabled && ns.emailEnabled ? ns.user.email : null;
  const pushEnabled =
    ns.enabled &&
    isPushConfigured() &&
    (await prisma.pushSubscription.count({ where: { userId } })) > 0;

  const rows = await prisma.notificationHistory.findMany({
    where: { userId, channel: "email" },
    select: { id: true, assignmentId: true, type: true, providerId: true, scheduledAt: true, dueAt: true },
  });
  // 送り先も取り消すものも無いなら、課題を読む前に抜ける（無駄なクエリを出さない）
  if (!emailAddress && !pushEnabled && !rows.some((r) => isCancellable(r, now, CANCEL_MARGIN_MS))) {
    return { email: 0, push: 0 };
  }

  const assignments = await getUserAssignments(userId, new Set(ns.hiddenCourses));
  const reminderMinutes = remindersOf(ns);

  // 1・2. 要らなくなった予約を取り消し、締切が変わった課題の履歴を消す（判断は planHistoryCleanup）
  const { cancel, remove } = planHistoryCleanup(rows, assignments, {
    emailOn: emailAddress != null,
    reminderMinutes,
    mutedCourses: ns.mutedCourses,
    mutedAssignments: ns.mutedAssignments,
    now,
    cancelMarginMs: CANCEL_MARGIN_MS,
  });
  for (const row of cancel) {
    try {
      await cancelScheduledEmail(row.providerId!);
    } catch (e) {
      // すでに送られていた等。履歴は消して、いまの状態で数え直す
      console.warn("[NOTIFY] 予約の取り消しに失敗:", e);
    }
  }
  const removeIds = [...cancel, ...remove].map((r) => r.id);
  if (removeIds.length) await prisma.notificationHistory.deleteMany({ where: { id: { in: removeIds } } });

  if (!emailAddress && !pushEnabled) return { email: 0, push: 0 };
  if (assignments.length === 0) return { email: 0, push: 0 };

  // 2. これから送るものを確定する。チャネル込みのキーで一度に読む（チャネルごとにDBを叩き直さない）
  const history = await prisma.notificationHistory.findMany({
    where: { userId },
    select: { assignmentId: true, type: true, channel: true },
  });
  const alreadySentKeys = new Set(
    history.map((h) => `${h.assignmentId}:${h.type}:${h.channel}`),
  );
  const settings = {
    reminderMinutes,
    mutedCourses: ns.mutedCourses,
    mutedAssignments: ns.mutedAssignments,
    catchUp: fromCron,
  };

  const [email, push] = await Promise.all([
    emailAddress
      ? deliver(userId, "email", true, assignments, settings, alreadySentKeys, now, (p) =>
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
      ? deliver(userId, "push", false, assignments, settings, alreadySentKeys, now, async (p) => {
          const ok = await sendPushToUser(userId, {
            title: `締切まであと${p.label}`,
            // ロック画面で「どの課題が・いつまでか」まで読めるように、課題名と「科目・締切日時」の2行にする
            body: `${p.assignmentTitle}\n${p.courseName}・${formatDueJst(p.dueDate)} まで`,
            // 通知をタップしたらアプリを開く。課題ページ自体はログインが要るため
            url: "/",
            tag: `deadline-${p.assignmentId}`,
          });
          // 1台も届かなかったら「送れなかった」扱いにして予約を戻す
          if (!ok) throw new Error("push_not_delivered");
          return null;
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
 *
 * `send` は予約したメールの ID を返す（Push は null）。あとで取り消せるよう履歴に残す。
 */
async function deliver(
  userId: string,
  channel: Channel,
  canSchedule: boolean,
  assignments: Assignment[],
  ns: { reminderMinutes: number[]; mutedCourses: string[]; mutedAssignments: string[]; catchUp: boolean },
  alreadySentKeys: Set<string>,
  now: Date,
  send: (p: PendingNotification) => Promise<string | null>,
): Promise<number> {
  const pending = computePendingNotifications(assignments, {
    reminderMinutes: ns.reminderMinutes,
    mutedCourses: ns.mutedCourses,
    mutedAssignments: ns.mutedAssignments,
    alreadySentKeys,
    now,
    horizonMs: HORIZON_MS,
    channel,
    canSchedule,
    catchUp: ns.catchUp,
    graceMs: GRACE_MS,
  });

  let sent = 0;

  for (const p of pending) {
    const key = {
      userId_assignmentId_type_channel: { userId, assignmentId: p.assignmentId, type: p.type, channel },
    };

    // 送信枠の予約。既に行があれば他の実行が確保済み＝ここでは何もしない。
    try {
      await prisma.notificationHistory.create({
        data: {
          userId,
          assignmentId: p.assignmentId,
          type: p.type,
          channel,
          title: `締切まであと${p.label}`,
          body: `「${p.assignmentTitle}」（${p.courseName}）`,
          dueAt: p.dueDate,
          scheduledAt: p.scheduledAt ?? null,
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") continue; // 予約済み
      throw e;
    }

    // 送る機会を過ぎた通知は履歴だけ閉じる（次の同期で蒸し返さないため）
    if (!p.send) continue;

    try {
      const providerId = await send(p);
      sent++;
      // 予約送信なら、あとで取り消せるよう ID を残す
      if (providerId && p.scheduledAt) {
        await prisma.notificationHistory.update({ where: key, data: { providerId } }).catch(() => {});
      }
    } catch (e) {
      // 送信失敗なら予約を戻し、次の同期/cron で再試行できるようにする
      console.error(`[NOTIFY] ${channel} の送信に失敗:`, e);
      await prisma.notificationHistory.delete({ where: key }).catch(() => {});
    }
  }

  return sent;
}

/**
 * 予約済みでまだ送られていないメールを全部取り消す。アカウントを消す前に呼ぶ
 * （履歴は Cascade で消えるが、Resend に預けた予約は残り、消したあとも届いてしまう）。
 */
export async function cancelAllScheduledEmails(userId: string): Promise<void> {
  const rows = await prisma.notificationHistory.findMany({
    where: { userId, providerId: { not: null }, scheduledAt: { gt: new Date() } },
    select: { providerId: true },
  });
  await Promise.allSettled(rows.map((r) => cancelScheduledEmail(r.providerId!)));
}
