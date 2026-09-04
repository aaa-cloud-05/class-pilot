import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import {
  syncWebClassAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";
import { sanitizeImportedAssignments } from "@/lib/webclass";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { notifyUserByEmail } from "@/lib/server/notify";
import { after } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  // レートリミット（一括書込の連打抑制）。超過なら429。
  const limited = await checkRateLimit("import", session.user.id);
  if (limited) return limited;

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

  // 取り込みは日中に手動で行われるため「取り込んだ時点で締切間近」が普通に起きる。
  // cron(1日1回)を待つと当日締切の課題が無通知になるので、ここで通知を確定させる。
  const userId = session.user.id;
  after(async () => {
    try {
      await notifyUserByEmail(userId);
    } catch (e) {
      console.error("[IMPORT] 通知の確定に失敗:", e);
    }
  });

  const all = await getUserAssignments(session.user.id, hiddenCourseIds);
  return Response.json({ assignments: all, synced: filtered.length });
}
