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
  /** 件名・見出しに出す残り時間。予約送信は定義どおり、追いつき送信は実際の残り時間。 */
  label: string;
  /** Resend の予約送信時刻。undefined = 即時送信。 */
  scheduledAt?: Date;
  /** false = メールは送らず履歴だけ閉じる（送る機会を過ぎた通知）。 */
  send: boolean;
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

/** 残り時間を人が読める表記にする（追いつき送信の見出し用）。 */
function formatRemaining(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}分`;
  return `${Math.round(minutes / 60)}時間`;
}

/**
 * 送るべきメール通知を算出する。
 *
 * 各タイミング（24h/3h/1h前）は本来「予約送信」だが、**予約時刻が既に過去**という状況が
 * 普通に起きる：cron は1日1回しか走らず、WebClass の取り込みは日中に手動で行われるため、
 * 「取り込んだ時点で締切まで2時間」のような課題が当たり前に入ってくる。
 * 予約時刻が過去のものを単に捨てると、この“いちばん救いたい課題”が無通知になる。
 *
 * そこで取りこぼしは次のように扱う：
 * - 予約できるタイミングが1つでもあれば、それに任せる（追いつき送信はしない＝重複を避ける）
 * - 1つも無ければ、**締切にいちばん近い1件だけ**を即時送信する（「まだ間に合う」救済）
 * - 送らなかった取りこぼしは `send: false` で返し、呼び出し側が履歴だけ閉じる
 *   （閉じないと、次の同期のたびに救済候補として蒸し返される）
 */
export function computePendingNotifications(
  assignments: AssignmentForNotify[],
  ctx: NotifyContext,
): PendingNotification[] {
  const timings = getTimingsForPreset(ctx.preset);
  const pending: PendingNotification[] = [];
  const nowMs = ctx.now.getTime();

  for (const a of assignments) {
    if (!a.dueDate) continue;
    if (a.submissionState === "submitted" || a.submissionState === "unknown") continue;
    if (ctx.mutedCourses.includes(a.courseId)) continue;
    if (ctx.mutedAssignments.includes(a.id)) continue;

    const dueMs = a.dueDate.getTime();
    if (dueMs <= nowMs) continue;
    if (dueMs > nowMs + ctx.horizonMs) continue;

    // 未送信のタイミングを「まだ予約できる」と「予約時刻を過ぎた」に振り分ける
    const upcoming: { timing: NotificationTiming; scheduledAt: Date }[] = [];
    const missed: NotificationTiming[] = [];
    for (const timing of timings) {
      if (ctx.alreadySentKeys.has(`${a.id}:${timing.type}:email`)) continue;
      const atMs = dueMs - timing.minutes * 60 * 1000;
      if (atMs >= nowMs) upcoming.push({ timing, scheduledAt: new Date(atMs) });
      else missed.push(timing);
    }

    const base = {
      assignmentId: a.id,
      assignmentTitle: a.title,
      courseName: a.courseName,
      courseId: a.courseId,
      dueDate: a.dueDate,
      link: a.link,
    };

    for (const u of upcoming) {
      pending.push({
        ...base,
        type: u.timing.type,
        label: u.timing.label,
        scheduledAt: u.scheduledAt,
        send: true,
      });
    }

    // 取りこぼしの救済は「予約が1つも無いとき」に限り、締切に最も近い1件のみ
    missed.sort((x, y) => x.minutes - y.minutes);
    const rescue = upcoming.length === 0 ? missed[0] : undefined;
    for (const timing of missed) {
      const isRescue = timing === rescue;
      pending.push({
        ...base,
        type: timing.type,
        // 追いつき送信で「24時間」と書くと嘘になるので、実際の残り時間を出す
        label: isRescue ? formatRemaining(dueMs - nowMs) : timing.label,
        send: isRescue,
      });
    }
  }

  return pending;
}
