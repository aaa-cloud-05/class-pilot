import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { createManualAssignment, getUserAssignments } from "@/lib/server/assignments";

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

  const body = await request.json();
  const assignment = await createManualAssignment(session.user.id, {
    courseName: body.courseName,
    courseColor: body.courseColor,
    title: body.title,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    submissionState: body.submissionState ?? "not_submitted",
  });

  return Response.json({ assignment });
}
