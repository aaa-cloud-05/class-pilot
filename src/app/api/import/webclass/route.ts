import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import {
  syncWebClassAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";
import { sanitizeImportedAssignments } from "@/lib/webclass";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  // 古いセッション対策: JWTのuserIdがUserに存在しないと書き込みがFK違反で500になる。
  // 先に検出して再ログインを促す(sync APIと同じ守り)。
  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    return Response.json({ error: "reauth_required" }, { status: 401 });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId: session.user.id },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const raw = (body as { assignments?: unknown })?.assignments;
  if (!Array.isArray(raw)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  // 非信頼入力を再検証（型・長さ・件数上限・危険なlink除去）。不正な行はスキップ。
  const filtered = sanitizeImportedAssignments(raw).filter(
    (a) => !hiddenCourseIds.has(a.courseId),
  );

  await syncWebClassAssignments(session.user.id, filtered);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { webclassSyncedAt: new Date() },
  });

  const all = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({ assignments: all, synced: filtered.length });
}
