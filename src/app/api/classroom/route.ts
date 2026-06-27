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
      select: { hiddenCourses: true, acknowledgedCourses: true },
    });
    const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);
    const acknowledgedCourseIds = new Set(ns?.acknowledgedCourses ?? []);

    const existingCourseIds = await getExistingCourseIds(session.user.id);

    let newCourses: { id: string; name: string }[] = [];

    try {
      const { courses, allWork } = await fetchAllData(
        session.accessToken,
        hiddenCourseIds,
      );

      newCourses = courses.filter(
        (c) =>
          !hiddenCourseIds.has(c.id) &&
          !acknowledgedCourseIds.has(c.id) &&
          !existingCourseIds.has(c.id),
      ).map((c) => ({ id: c.id, name: c.name }));

      const classroomAssignments = allWork.map(({ course, work, submission }) => ({
        ...transformAssignment(course, work, submission),
        source: "classroom" as const,
      }));

      await syncClassroomAssignments(session.user.id, classroomAssignments);
    } catch (e) {
      // Google 取得・同期に失敗してもDBの既存データは返す
      console.error("[CLASSROOM] sync failed, returning DB data:", e);
    }

    const assignments = await getUserAssignments(session.user.id, hiddenCourseIds);
    return Response.json({ assignments, newCourses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
