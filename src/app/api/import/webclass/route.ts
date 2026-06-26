import { auth } from "@/auth";
import { syncWebClassAssignments, getUserAssignments } from "@/lib/server/assignments";
import type { Assignment } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const { assignments: raw } = await request.json();

  const assignments: Assignment[] = raw.map((a: Record<string, unknown>) => ({
    ...a,
    dueDate: a.dueDate ? new Date(a.dueDate as string) : null,
  }));

  await syncWebClassAssignments(session.user.id, assignments);

  const all = await getUserAssignments(session.user.id);
  return Response.json({ assignments: all, synced: assignments.length });
}
