import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { after, NextRequest } from "next/server";
import { notifyUser } from "@/lib/server/notify";
import { normalizeReminders } from "@/lib/reminders";

/** 通知の予約を、いまの状態に合わせ直す（取り消し・予約し直し）。応答は待たせない */
function renotify(userId: string) {
  after(async () => {
    try {
      await notifyUser(userId);
    } catch (e) {
      console.error("[NOTIFY] 予約の合わせ直しに失敗:", e);
    }
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const settings = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
  });

  return Response.json({
    settings: settings ?? {
      enabled: true,
      preset: "standard",
      reminderMinutes: [],
      emailEnabled: false,
      mutedCourses: [],
      mutedAssignments: [],
      hiddenCourses: [],
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const body = await request.json();
  const { enabled, preset, reminderMinutes, emailEnabled, mutedCourses, mutedAssignments, hiddenCourses } = body;

  const data: Record<string, unknown> = {};
  if (typeof enabled === "boolean") data.enabled = enabled;
  if (typeof preset === "string") data.preset = preset;
  // 選択肢にないもの・3つ以上は捨てる。1つも残らなければ変えない（0個＝通知なしはスイッチで切る）
  if (Array.isArray(reminderMinutes)) {
    const r = normalizeReminders(reminderMinutes);
    if (r.length) data.reminderMinutes = r;
  }
  if (typeof emailEnabled === "boolean") data.emailEnabled = emailEnabled;
  if (Array.isArray(mutedCourses)) data.mutedCourses = mutedCourses;
  if (Array.isArray(mutedAssignments)) data.mutedAssignments = mutedAssignments;
  if (Array.isArray(hiddenCourses)) data.hiddenCourses = hiddenCourses;

  const settings = await prisma.notificationSetting.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  // 通知を切った・タイミングやミュートを変えた、を予約済みのメールにすぐ反映する
  renotify(session.user.id);

  return Response.json({ settings });
}
