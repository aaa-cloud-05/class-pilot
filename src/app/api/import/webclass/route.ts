import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import {
  syncWebClassAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";
import { sanitizeImportedAssignments, transformWebClassPayload } from "@/lib/webclass";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { resolveImportToken } from "@/lib/server/import-token";
import { notifyUser } from "@/lib/server/notify";
import { after } from "next/server";

/**
 * WebClass の課題を取り込む。認証は2経路。
 *
 * 1. セッション Cookie … ブックマークレット（/import ページ経由の手動取り込み）
 * 2. `Authorization: Bearer <取り込みトークン>` … ユーザースクリプトによる自動同期
 *    WebClass のページからのクロスサイト送信になり Cookie が付かないため。
 *
 * **トークン経由では課題一覧を返さない。** 返すとトークンが読み取り能力まで持ってしまう。
 * 自動同期は書き込めれば十分で、表示はアプリ側が自分で取り直す。
 */
export async function POST(request: Request) {
  // DB が遠い(実測1往復678ms)ため、どこで時間を使っているかをログに残す
  const t0 = Date.now();
  const tokenUserId = await resolveImportToken(request);
  let userId = tokenUserId;

  if (!userId) {
    const session = await auth();
    userId = session?.user?.id ?? null;
  }
  if (!userId) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  // レートリミット（一括書込の連打抑制）。超過なら429。
  const limited = await checkRateLimit("import", userId);
  if (limited) return limited;

  // 古いセッション対策: JWTのuserIdがUserに存在しないと書き込みがFK違反で500になる。
  // 先に検出して再ログインを促す(sync APIと同じ守り)。
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists) {
    return Response.json({ error: "reauth_required" }, { status: 401 });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  // 受け取る形は2つ。
  // - { assignments } … /import ページが変換済みの配列を送る（ブックマークレット経路）
  // - { payload }     … WebClass API の生ペイロードをそのまま送る（ユーザースクリプト経路）
  //   後者をサーバで変換することで、ユーザースクリプト側に変換ロジックを複製せずに済む。
  const b = body as { assignments?: unknown; payload?: unknown };
  const incoming = b?.payload != null
    ? transformWebClassPayload(b.payload)
    : b?.assignments;

  if (!Array.isArray(incoming)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  // 非信頼入力を再検証（型・長さ・件数上限・危険なlink除去）。不正な行はスキップ。
  const filtered = sanitizeImportedAssignments(incoming).filter(
    (a) => !hiddenCourseIds.has(a.courseId),
  );

  await syncWebClassAssignments(userId, filtered);
  await prisma.user.update({
    where: { id: userId },
    data: { webclassSyncedAt: new Date() },
  });

  // 取り込みは日中に行われるため「取り込んだ時点で締切間近」が普通に起きる。
  // cron(1日1回)を待つと当日締切の課題が無通知になるので、ここで通知を確定させる。
  const notifyUserId = userId;
  after(async () => {
    try {
      await notifyUser(notifyUserId);
    } catch (e) {
      console.error("[IMPORT] 通知の確定に失敗:", e);
    }
  });

  console.log(`[IMPORT] ${filtered.length}件 / ${Date.now() - t0}ms`);

  // トークン経由（自動同期）には件数だけ返す
  if (tokenUserId) {
    return Response.json({ synced: filtered.length });
  }

  const all = await getUserAssignments(userId, hiddenCourseIds);
  return Response.json({ assignments: all, synced: filtered.length });
}
