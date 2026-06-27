import { auth } from "@/auth";
import { editAssignment, softDeleteAssignment } from "@/lib/server/assignments";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const updated = await editAssignment(session.user.id, id, body);
  if (!updated) {
    return Response.json({ error: "課題が見つかりません" }, { status: 404 });
  }

  return Response.json({ assignment: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const { id } = await context.params;

  const deleted = await softDeleteAssignment(session.user.id, id);
  if (!deleted) {
    return Response.json({ error: "課題が見つかりません" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
