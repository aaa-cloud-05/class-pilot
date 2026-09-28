import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { after } from "next/server";
import { notifyUser } from "@/lib/server/notify";
import {
  createManualAssignment,
  getUserAssignments,
  validateManualCreate,
} from "@/lib/server/assignments";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      classroomSyncedAt: true,
      webclassSyncedAt: true,
      notificationSetting: { select: { hiddenCourses: true } },
    },
  });
  const hiddenCourseIds = new Set(user?.notificationSetting?.hiddenCourses ?? []);

  const assignments = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({
    assignments,
    syncedAt: {
      classroom: user?.classroomSyncedAt ?? null,
      webclass: user?.webclassSyncedAt ?? null,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const v = validateManualCreate(body);
  if (!v.ok) {
    return Response.json({ error: v.error }, { status: 400 });
  }

  const assignment = await createManualAssignment(session.user.id, v.data);
  // 手で追加した課題も、次の cron を待たずに通知を予約する
  const userId = session.user.id;
  after(async () => {
    try {
      await notifyUser(userId);
    } catch (e) {
      console.error("[NOTIFY] 予約に失敗:", e);
    }
  });
  return Response.json({ assignment });
}
