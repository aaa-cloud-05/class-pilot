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
    if (assignment.submissionState === "submitted" || assignment.submissionState === "unknown") continue;
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
          const notifTitle = `締切まであと${timing.label}`;
          const notifBody = `「${assignment.title}」（${assignment.courseName}）`;
          // OS の通知は出さない（アプリを開いたときしか出ず役に立たないため。通知はメール一本）。
          // 「通知」の画面に出す履歴だけ残す
          await recordNotification(assignment.id, timing.type, notifTitle, notifBody);
          sent++;
        }
      }
    }
  }

  console.log(`[通知] 完了: ${sent}件送信`);
  return sent;
}
