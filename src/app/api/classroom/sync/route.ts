import { auth } from "@/auth";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import { prisma } from "@/lib/server/prisma";
import {
  syncClassroomAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";
import { checkRateLimit } from "@/lib/server/ratelimit";

/**
 * Google Classroom と同期し、最新のDB課題を返す。
 * 読み取り(DB)はトークン非依存。アクセストークンが無い／Google同期が失敗しても
 * 401や500で止めず、DBに保存済みの課題を返す（長時間放置やトークン期限切れ対策）。
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }
  const userId = session.user.id;

  // レートリミット（連打・暴走の抑制）。超過なら429。
  const limited = await checkRateLimit("sync", userId);
  if (limited) return limited;

  // 古いセッション対策: JWTのuserIdがUserに存在しない(過去のDBリセット後など)と、
  // 書き込みがFK違反(P2003)で無言のsync_failedになる。存在しなければ先に再ログインを促し、
  // 無駄なGoogle取得もスキップする。
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists) {
    return Response.json({
      assignments: [],
      synced: false,
      syncError: "reauth_required",
      syncedAt: { classroom: null, webclass: null },
    });
  }

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  // 同期の成否をクライアントへ返す（握りつぶさない）。
  // 失敗を隠すと「一覧は出るが最終更新時刻が固まる」原因が分からなくなるため。
  let synced = false;
  let syncError: string | undefined;

  if (session.error === "RefreshAccessTokenError") {
    // リフレッシュトークン失効（例: OAuth Testing モードの7日失効）。再ログインが必要。
    syncError = "reauth_required";
  } else if (!session.accessToken) {
    syncError = "no_access_token";
  } else {
    try {
      const { allWork } = await fetchAllData(session.accessToken, hiddenCourseIds);

      const classroomAssignments = allWork.map(({ course, work, submission }) => ({
        ...transformAssignment(course, work, submission),
        source: "classroom" as const,
      }));

      await syncClassroomAssignments(userId, classroomAssignments);
      await prisma.user.update({
        where: { id: userId },
        data: { classroomSyncedAt: new Date() },
      });
      synced = true;
    } catch (e) {
      // Google取得・同期に失敗してもDBの既存データを返す（時刻は更新しない＝正直に据え置き）
      console.error("[SYNC] Google同期に失敗、DBデータを返します:", e);
      // 401/403(トークン失効)・P2003(userId不在の古いセッション)は再ログインで回復する。
      const msg = e instanceof Error ? e.message : "";
      const code = (e as { code?: string })?.code;
      syncError =
        /API 40[13]/.test(msg) || code === "P2003" ? "reauth_required" : "sync_failed";
    }
  }

  const [assignments, user] = await Promise.all([
    getUserAssignments(userId, hiddenCourseIds),
    prisma.user.findUnique({
      where: { id: userId },
      select: { classroomSyncedAt: true, webclassSyncedAt: true },
    }),
  ]);

  return Response.json({
    assignments,
    synced,
    syncError,
    syncedAt: {
      classroom: user?.classroomSyncedAt ?? null,
      webclass: user?.webclassSyncedAt ?? null,
    },
  });
}
