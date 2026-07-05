import { auth } from "@/auth";
import { editAssignment, softDeleteAssignment, validateEdit } from "@/lib/server/assignments";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const v = validateEdit(body);
  if (!v.ok) {
    return Response.json({ error: v.error }, { status: 400 });
  }

  const updated = await editAssignment(session.user.id, id, v.data);
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
