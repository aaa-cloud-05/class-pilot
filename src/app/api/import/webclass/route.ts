import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import {
  syncWebClassAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";
import type { Assignment } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  const { assignments: raw } = await request.json();

  const allAssignments: Assignment[] = raw.map((a: Record<string, unknown>) => ({
    ...a,
    dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
  }));

  const filtered = allAssignments.filter((a) => !hiddenCourseIds.has(a.courseId));

  await syncWebClassAssignments(session.user.id, filtered);

  const all = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({ assignments: all, synced: filtered.length });
}
