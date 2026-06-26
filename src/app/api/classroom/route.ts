import { auth } from "@/auth";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import { prisma } from "@/lib/server/prisma";
import {
  syncClassroomAssignments,
  getUserAssignments,
  getExistingCourseIds,
} from "@/lib/server/assignments";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  try {
    const ns = await prisma.notificationSetting.findUnique({
      where: { userId: session.user.id },
      select: { hiddenCourses: true },
    });
    const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

    const existingCourseIds = await getExistingCourseIds(session.user.id);

    const { courses, allWork } = await fetchAllData(
      session.accessToken,
      hiddenCourseIds,
    );

    const newCourses = courses.filter(
      (c) => !hiddenCourseIds.has(c.id) && !existingCourseIds.has(c.id),
    ).map((c) => ({ id: c.id, name: c.name }));

    const classroomAssignments = allWork.map(({ course, work, submission }) => ({
      ...transformAssignment(course, work, submission),
      source: "classroom" as const,
    }));

    await syncClassroomAssignments(session.user.id, classroomAssignments);

    const assignments = await getUserAssignments(session.user.id, hiddenCourseIds);
    return Response.json({ assignments, newCourses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
