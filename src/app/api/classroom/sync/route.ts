import { auth } from "@/auth";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import { prisma } from "@/lib/server/prisma";
import {
  syncClassroomAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";

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

  const ns = await prisma.notificationSetting.findUnique({
    where: { userId },
    select: { hiddenCourses: true },
  });
  const hiddenCourseIds = new Set(ns?.hiddenCourses ?? []);

  if (session.accessToken) {
    try {
      const { allWork } = await fetchAllData(session.accessToken, hiddenCourseIds);

      const classroomAssignments = allWork.map(({ course, work, submission }) => ({
        ...transformAssignment(course, work, submission),
        source: "classroom" as const,
      }));

      await syncClassroomAssignments(userId, classroomAssignments);
    } catch (e) {
      // Google取得・同期に失敗してもDBの既存データを返す
      console.error("[SYNC] Google同期に失敗、DBデータを返します:", e);
    }
  }

  const assignments = await getUserAssignments(userId, hiddenCourseIds);
  return Response.json({ assignments });
}
