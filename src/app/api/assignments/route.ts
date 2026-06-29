import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { createManualAssignment, getUserAssignments } from "@/lib/server/assignments";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  const assignments = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({ assignments });
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
