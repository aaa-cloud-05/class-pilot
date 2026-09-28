import { getCachedAssignments } from "./cache";
import { getNotificationSettings, hasBeenNotified, recordNotification } from "./notification-store";
import { remainingLabel, reminderType, remindersOf } from "./reminders";

export async function checkAndNotify(): Promise<number> {
  if (typeof window === "undefined") return 0;

  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    console.log("[通知] 通知が無効です");
    return 0;
  }

  const assignments = await getCachedAssignments();
  const now = Date.now();
  // サーバのメールと同じタイミング（src/lib/reminders.ts）
  const timings = remindersOf(settings).map((m) => ({ minutes: m, type: reminderType(m), label: remainingLabel(m) }));
  let sent = 0;

  console.log(`[通知] チェック開始: ${assignments.length}件, ${timings.map((t) => t.type).join("/")}`);

  for (const assignment of assignments) {
    if (!assignment.dueDate) continue;
    // 「不明」は画面と同じく未提出として扱う（サーバのメールと同じ）
    if (assignment.submissionState === "submitted") continue;
    if (settings.mutedCourses.includes(assignment.courseId)) continue;
    if (settings.mutedAssignments.includes(assignment.id)) continue;

    const minutesLeft = (assignment.dueDate.getTime() - now) / (1000 * 60);
    if (minutesLeft <= 0) continue;

    // 過ぎたタイミングのうち、締切にいちばん近いものだけを記録する。
    // しばらく開かなかったあとに開くと「あと1日」「あと3時間」が同時に並ぶのを防ぐ
    const passed = timings.filter((t) => minutesLeft <= t.minutes).sort((x, y) => x.minutes - y.minutes);
    const timing = passed[0];
    if (!timing) continue;
    if (await hasBeenNotified(assignment.id, timing.type)) continue;

    console.log(`[通知] 記録: ${assignment.title} (残り${Math.round(minutesLeft)}分, ${timing.type})`);
    // OS の通知は出さない（アプリを開いたときしか出ず役に立たないため。通知はメール一本）。
    // 「通知」の画面に出す履歴だけ残す
    await recordNotification(
      assignment.id,
      timing.type,
      `締切まであと${timing.label}`,
      `「${assignment.title}」（${assignment.courseName}）`,
    );
    sent++;
  }

  console.log(`[通知] 完了: ${sent}件記録`);
  return sent;
}
