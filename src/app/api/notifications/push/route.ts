import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";

/**
 * Web Push の購読登録・解除。
 *
 * 購読はブラウザが端末ごとに発行するもので、秘密ではあるが「送信先」でしかない
 * （これだけで課題データを読めるわけではない）。所有者の取り違えを防ぐため、
 * 同じ endpoint が別ユーザーに残っていたら上書きして付け替える。
 */

interface SubscriptionInput {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

/** 端末の見分け用に UA を短く保存する（診断目的。長さは切り詰める）。 */
const UA_MAX = 200;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  let body: SubscriptionInput;
  try {
    body = (await request.json()) as SubscriptionInput;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth_ = typeof body?.keys?.auth === "string" ? body.keys.auth : "";

  // endpoint はプッシュ事業者の https URL。それ以外は受け付けない。
  if (!endpoint.startsWith("https://") || endpoint.length > 2000 || !p256dh || !auth_) {
    return Response.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, UA_MAX) || null;

  try {
    // endpoint は unique。同じ端末からの再購読も、別アカウントでの再購読も upsert で吸収する。
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: session.user.id, endpoint, p256dh, auth: auth_, userAgent },
      update: { userId: session.user.id, p256dh, auth: auth_, userAgent },
    });
  } catch (e) {
    console.error("[PUSH] 購読の保存に失敗:", e);
    return Response.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

/** 解除。endpoint を指定しなければこのユーザーの購読を全部消す。 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  let endpoint = "";
  try {
    const body = (await request.json()) as { endpoint?: unknown };
    if (typeof body?.endpoint === "string") endpoint = body.endpoint;
  } catch {
    // ボディ無しは「全解除」として扱う
  }

  await prisma.pushSubscription.deleteMany({
    where: endpoint
      ? { userId: session.user.id, endpoint }
      : { userId: session.user.id },
  });

  return Response.json({ ok: true });
}

/** この端末が購読済みかを返す（設定画面のトグルの初期状態用）。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未ログインです" }, { status: 401 });
  }

  const count = await prisma.pushSubscription.count({
    where: { userId: session.user.id },
  });

  return Response.json({ count });
}
