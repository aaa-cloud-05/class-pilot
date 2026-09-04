import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { issueImportToken, revokeImportToken } from "@/lib/server/import-token";

/**
 * WebClass 自動同期用トークンの発行・失効・状態確認。
 * 平文のトークンは **発行時の応答にだけ**現れる（DBにはハッシュしか無い）。
 */

/** 発行済みかどうかだけを返す。トークン自体は返せない。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { importTokenHash: true },
  });

  return Response.json({ issued: !!user?.importTokenHash });
}

/** 新規発行（再発行すると古いトークンは即座に使えなくなる）。 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  try {
    const token = await issueImportToken(session.user.id);
    return Response.json({ token });
  } catch (e) {
    console.error("[IMPORT_TOKEN] 発行に失敗:", e);
    return Response.json({ error: "発行に失敗しました" }, { status: 500 });
  }
}

/** 失効。端末を手放したときなどに使う。 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  try {
    await revokeImportToken(session.user.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[IMPORT_TOKEN] 失効に失敗:", e);
    return Response.json({ error: "失効に失敗しました" }, { status: 500 });
  }
}
