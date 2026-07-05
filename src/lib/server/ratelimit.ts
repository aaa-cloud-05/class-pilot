import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * ユーザー単位のレートリミット（Upstash Redis / スライディングウィンドウ）。
 *
 * 方針:
 * - 対象は重い/悪用され得る sync・import のみ。通常利用（sync はクライアント5分スロットル済み）は
 *   上限に達しない。上限は「暴走・連打・悪意」の最悪ケースの天井。
 * - フェイルオープン: env 未設定や Upstash 接続失敗時は常に許可し、アプリを止めない。
 */

// Upstash を直接使う場合は UPSTASH_*、Vercel の Upstash 統合(KV)経由だと KV_* に
// なるため、どちらの命名でも拾えるようにする。
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn("[RATELIMIT] UPSTASH_REDIS_REST_URL/TOKEN 未設定。レート制限は無効(フェイルオープン)。");
}

const limiters = {
  // sync: Google 1+2N 呼び出し・低頻度。15回/10分で暴走を頭打ち。
  sync: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(15, "10 m"), prefix: "rl:sync" })
    : null,
  // import: 一括DB書込・稀。10回/10分。
  import: redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), prefix: "rl:import" })
    : null,
} as const;

export type RateLimitName = keyof typeof limiters;

/**
 * 制限内なら null、超過なら 429 Response を返す。
 * Upstash 未設定/失敗時は null（許可）＝可用性優先。
 */
export async function checkRateLimit(
  name: RateLimitName,
  userId: string,
): Promise<Response | null> {
  const limiter = limiters[name];
  if (!limiter) return null; // 未設定 = フェイルオープン

  try {
    const { success, reset } = await limiter.limit(userId);
    if (success) return null;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  } catch (e) {
    // 接続不可等でユーザーを止めない
    console.error("[RATELIMIT] チェック失敗、許可します:", e);
    return null;
  }
}
