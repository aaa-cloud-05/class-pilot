import { prisma } from "@/lib/server/prisma";
import { notifyUser } from "@/lib/server/notify";

// メール送信はユーザー数に比例して伸びるため、既定(10秒)では足りなくなる。
export const maxDuration = 60;

/** 同時に処理するユーザー数。Supabase の接続を食い潰さない範囲で並列化する。 */
const CONCURRENCY = 5;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // メールが有効、または端末をプッシュ購読しているユーザー。
  // 以前は emailEnabled だけで絞っていたため、プッシュのみ有効な人が対象外になっていた。
  const targets = await prisma.notificationSetting.findMany({
    where: {
      enabled: true,
      OR: [
        { emailEnabled: true },
        { user: { pushSubscriptions: { some: {} } } },
      ],
    },
    select: { userId: true },
  });

  const results: { userId: string; email: number; push: number; error?: string }[] = [];

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map((t) => notifyUser(t.userId, now)),
    );
    settled.forEach((r, idx) => {
      const userId = chunk[idx].userId;
      if (r.status === "fulfilled") {
        results.push({ userId, email: r.value.email, push: r.value.push });
      } else {
        results.push({
          userId,
          email: 0,
          push: 0,
          error: r.reason instanceof Error ? r.reason.message : "unknown",
        });
      }
    });
  }

  return Response.json({ ok: true, processed: results.length, results });
}
