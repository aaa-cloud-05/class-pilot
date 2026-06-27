import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import {
  syncWebClassAssignments,
  getUserAssignments,
  getExistingCourseIds,
} from "@/lib/server/assignments";
import type { Assignment } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
    select: { hiddenCourses: true, acknowledgedCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);
  const acknowledgedCourseIds = new Set(ns?.acknowledgedCourses ?? []);

  const existingCourseIds = await getExistingCourseIds(session.user.id);

  const { assignments: raw } = await request.json();

  const allAssignments: Assignment[] = raw.map((a: Record<string, unknown>) => ({
    ...a,
    dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
  }));

  const filtered = allAssignments.filter((a) => !hiddenCourseIds.has(a.courseId));

  const courseIds = new Set(allAssignments.map((a) => a.courseId));
  const newCourses = [...courseIds]
    .filter((id) =>
      !hiddenCourseIds.has(id) &&
      !acknowledgedCourseIds.has(id) &&
      !existingCourseIds.has(id),
    )
    .map((id) => {
      const a = allAssignments.find((x) => x.courseId === id)!;
      return { id, name: a.courseName };
    });

  await syncWebClassAssignments(session.user.id, filtered);

  const all = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({ assignments: all, synced: filtered.length, newCourses });
}
