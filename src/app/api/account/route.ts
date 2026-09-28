import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { cancelAllScheduledEmails } from "@/lib/server/notify";

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

  // Resend に預けた予約メールは DB を消しても残るので、先に取り消す（失敗しても削除は続ける）
  await cancelAllScheduledEmails(session.user.id).catch((e) => console.error("[ACCOUNT] 予約メールの取り消しに失敗:", e));

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
