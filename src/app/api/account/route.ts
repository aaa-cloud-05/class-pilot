import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";

/**
 * ログイン中ユーザーのアカウントとサーバー上の全データを削除する。
 * User への全リレーションは onDelete: Cascade のため、User 1行の削除で
 * Assignment / Account / Session / NotificationSetting / NotificationHistory も消える。
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
  } catch (e) {
    // P2025: 対象が存在しない（古いセッション等）。既に無いので成功扱い。
    if ((e as { code?: string })?.code !== "P2025") {
      console.error("[ACCOUNT] 削除に失敗:", e);
      return Response.json({ error: "削除に失敗しました" }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
