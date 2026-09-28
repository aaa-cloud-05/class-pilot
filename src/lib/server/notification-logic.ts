import { remainingLabel, reminderType } from "@/lib/reminders";

export interface NotificationTiming {
  minutes: number;
  /** 重複防止のキー（履歴の type）。src/lib/reminders.ts の reminderType */
  type: string;
  label: string;
}

/** 利用者が選んだ「締切の何分前」から、送るタイミングを作る */
export function timingsFor(reminderMinutes: number[]): NotificationTiming[] {
  return reminderMinutes.map((m) => ({ minutes: m, type: reminderType(m), label: remainingLabel(m) }));
}

export interface PendingNotification {
  assignmentId: string;
  assignmentTitle: string;
  courseName: string;
  courseId: string;
  dueDate: Date;
  link: string;
  type: string;
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
  /** 締切の何分前に送るか（src/lib/reminders.ts の remindersOf で決めたもの） */
  reminderMinutes: number[];
  mutedCourses: string[];
  mutedAssignments: string[];
  alreadySentKeys: Set<string>;
  now: Date;
  /** 送信時刻がこの先これ以内のものだけ、いま予約する（それより先は次の実行に回す） */
  horizonMs: number;
  /** 送信先のチャネル。重複防止キーに含める。 */
  channel: "email" | "push";
  /**
   * そのチャネルが予約送信に対応しているか。
   * - メール(Resend): true … 「3時間前に送って」と委譲できるので未来の分もいま登録する
   * - Web Push:       false … 送った瞬間に届くので、**送り時が来た分しか出せない**。
   *   まだ先のタイミングは結果に含めず次回の実行に回す
   *   （つまり通知の時刻精度は cron の実行間隔で決まる）
   */
  canSchedule: boolean;
  /**
   * 送り時を過ぎたものを救済するか。**毎朝の cron のときだけ true**。
   * それ以外（同期・取り込み・課題の追加や編集・設定の変更）は利用者が画面を見ている最中なので、
   * 救済しない。しないと「課題を追加した直後に『あと2時間』のメールが来る」
   * 「通知をオンにした・タイミングを変えた瞬間に何通も届く」「提出を取り消したらすぐ届く」が起きる。
   */
  catchUp: boolean;
  /**
   * catchUp が false のとき、この先これ以内に来る送信時刻も「過ぎた」扱いにする。
   * 課題を追加した1分後に予約メールが届くのを防ぐ（その課題はいま画面で見ている）。
   */
  graceMs: number;
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
 * - この先のタイミングが1つでもあれば（いま予約するものも、次の実行で予約するものも）、それに任せる
 *   （追いつき送信はしない＝重複を避ける）。取りこぼした分は `send: false` で返し、履歴だけ閉じる
 * - 1つも無ければ、**毎朝の cron のときだけ**、締切にいちばん近い1件を即時送信する（「まだ間に合う」救済）。
 *   利用者が操作した直後の実行では何もしない（閉じもしない）。判断は次の朝の cron に任せる
 */
export function computePendingNotifications(
  assignments: AssignmentForNotify[],
  ctx: NotifyContext,
): PendingNotification[] {
  const timings = timingsFor(ctx.reminderMinutes);
  const pending: PendingNotification[] = [];
  const nowMs = ctx.now.getTime();

  for (const a of assignments) {
    if (!a.dueDate) continue;
    // 「不明」は画面と同じく未提出として扱う（src/lib/status.ts）
    if (a.submissionState === "submitted") continue;
    if (ctx.mutedCourses.includes(a.courseId)) continue;
    if (ctx.mutedAssignments.includes(a.id)) continue;

    const dueMs = a.dueDate.getTime();
    if (dueMs <= nowMs) continue;

    // 未送信のタイミングを「いま予約する」「まだ先（次の実行で予約する）」「送り時を過ぎた」に振り分ける。
    // 先読みの幅は**送信時刻**で測る。以前は締切で測っていたため、cron（毎朝）の時点で
    // 締切まで30時間を超えている課題（＝夜が締切のほとんど）の「24時間前」が、予約されないまま過ぎていた
    const upcoming: { timing: NotificationTiming; scheduledAt: Date }[] = [];
    const missed: NotificationTiming[] = [];
    let later = 0;
    // 利用者の操作の直後は、すぐ先の送信時刻も「過ぎた」扱いにする（graceMs）
    const threshold = ctx.canSchedule && !ctx.catchUp ? nowMs + ctx.graceMs : nowMs;
    for (const timing of timings) {
      if (ctx.alreadySentKeys.has(`${a.id}:${timing.type}:${ctx.channel}`)) continue;
      const atMs = dueMs - timing.minutes * 60 * 1000;
      if (atMs < threshold) missed.push(timing);
      else if (atMs <= nowMs + ctx.horizonMs) upcoming.push({ timing, scheduledAt: new Date(atMs) });
      else later++;
    }

    const base = {
      assignmentId: a.id,
      assignmentTitle: a.title,
      courseName: a.courseName,
      courseId: a.courseId,
      dueDate: a.dueDate,
      link: a.link,
    };

    // 予約できるチャネルだけ、未来の分をいま登録する。
    // できないチャネル(Push)では結果に含めない＝次回以降、送り時が来てから拾う。
    if (ctx.canSchedule) {
      for (const u of upcoming) {
        pending.push({
          ...base,
          type: u.timing.type,
          label: u.timing.label,
          scheduledAt: u.scheduledAt,
          send: true,
        });
      }
    }

    // 送り時を過ぎた分のうち、締切に最も近い1件だけを送る（残りは履歴を閉じる）。
    //
    // Push は予約できず先送りしているだけなので、送り時が来たものは（いつの実行でも）送る。
    // メールは未来の分を Resend に登録済みなので、この先のタイミングが残っていれば送らない（重複になる）。
    // 残っていなければ救済するが、それは朝の cron のときだけ。
    missed.sort((x, y) => x.minutes - y.minutes);
    const hasFuture = upcoming.length > 0 || later > 0;
    if (ctx.canSchedule && !hasFuture && !ctx.catchUp) continue; // 利用者の操作の直後: 何もせず朝に任せる
    const rescue = !ctx.canSchedule || !hasFuture ? missed[0] : undefined;
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

/* ───────── 予約の片づけ ───────── */

/** 履歴1行（NotificationHistory のうち、片づけの判断に要る列） */
export interface NotificationHistoryRow {
  id: string;
  assignmentId: string;
  type: string;
  providerId: string | null;
  scheduledAt: Date | null;
  dueAt: Date | null;
}

/** まだ送られていない予約で、取り消せるもの（送信直前のものは Resend 側で送信が始まっているかもしれないので除く） */
export function isCancellable(row: NotificationHistoryRow, now: Date, marginMs: number): boolean {
  return row.providerId != null && row.scheduledAt != null && row.scheduledAt.getTime() > now.getTime() + marginMs;
}

/**
 * 履歴の片づけ方を決める（DB と Resend には触らない）。
 * - `cancel`: まだ送られていない予約で、もう要らないもの → Resend で取り消して、履歴も消す。
 *   提出した・締切が変わった・ミュートした・課題が消えた（非表示を含む）・タイミングを変えた・通知を切った
 * - `remove`: 締切が変わった課題の、送り済みの履歴 → 消す。残すと、延びた締切の「1日前」が
 *   同じ重複防止キーで弾かれて届かない
 *
 * 課題が消えた・提出した、の送り済みの履歴は残す（戻したときに同じ通知を二度送らないため）。
 * dueAt の無い古い行は締切を比べられないので、締切の変更としては扱わない。
 */
export function planHistoryCleanup(
  rows: NotificationHistoryRow[],
  assignments: AssignmentForNotify[],
  ctx: {
    emailOn: boolean;
    reminderMinutes: number[];
    mutedCourses: string[];
    mutedAssignments: string[];
    now: Date;
    cancelMarginMs: number;
  },
): { cancel: NotificationHistoryRow[]; remove: NotificationHistoryRow[] } {
  const byId = new Map(assignments.map((a) => [a.id, a]));
  const types = new Set(ctx.reminderMinutes.map(reminderType));
  const cancel: NotificationHistoryRow[] = [];
  const remove: NotificationHistoryRow[] = [];

  for (const row of rows) {
    const a = byId.get(row.assignmentId);
    const dueChanged = a != null && row.dueAt != null && a.dueDate?.getTime() !== row.dueAt.getTime();
    const wanted =
      ctx.emailOn &&
      a != null &&
      a.submissionState !== "submitted" &&
      a.dueDate != null &&
      !dueChanged &&
      !ctx.mutedCourses.includes(a.courseId) &&
      !ctx.mutedAssignments.includes(a.id) &&
      types.has(row.type);

    if (isCancellable(row, ctx.now, ctx.cancelMarginMs) && !wanted) cancel.push(row);
    else if (dueChanged) remove.push(row);
  }
  return { cancel, remove };
}
