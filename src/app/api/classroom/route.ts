import { auth } from "@/auth";
import { fetchAllData } from "@/lib/classroom-api";
import { transformAssignment } from "@/lib/transform";
import {
  syncClassroomAssignments,
  getUserAssignments,
} from "@/lib/server/assignments";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  try {
    const { allWork } = await fetchAllData(session.accessToken);
    const classroomAssignments = allWork.map(({ course, work, submission }) => ({
      ...transformAssignment(course, work, submission),
      source: "classroom" as const,
    }));

    await syncClassroomAssignments(session.user.id, classroomAssignments);

    const assignments = await getUserAssignments(session.user.id);
    return Response.json({ assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    return Response.json({ error: message }, { status: 500 });
  }
}
