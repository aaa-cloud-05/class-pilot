import webpush from "web-push";
import { prisma } from "@/lib/server/prisma";
import { getAppUrl } from "@/lib/server/app-url";

/**
 * Web Push（VAPID）の送信。
 *
 * メールと違って**独自ドメインが要らず、通数制限も無い**。ブラウザを閉じていても届く。
 * 既存のクライアント通知（NotificationScheduler）はアプリを開いている間しか動かないので、
 * 「忘れる前に気づかせる」という目的にはこちらが本命。
 *
 * 制約: **予約送信ができない**。Resend は scheduledAt で「3時間前に送って」と委譲できるが、
 * Web Push は送信した瞬間に届く。そのため cron が回った時点で「送り時が来ているもの」だけを
 * 送る（`computePendingNotifications` の `canSchedule: false`）。
 * つまり通知の時刻精度は **cron の実行間隔** で決まる。
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let configured = false;

/** 鍵が揃っていれば web-push を初期化する。未設定なら false（送信をスキップ）。 */
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;

  // subject は「送信元の連絡先」。プッシュ事業者が問題時に連絡するためのもので、
  // mailto: か https URL である必要がある。
  webpush.setVapidDetails(getAppUrl(), PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return !!(PUBLIC_KEY && PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  /** 通知をタップしたときに開くURL（アプリ内の相対パスでよい）。 */
  url: string;
  /** 同じ課題の通知をまとめるためのキー。OSが古い通知を置き換える。 */
  tag: string;
}

/**
 * ユーザーの全端末へ送る。1台でも成功すれば true。
 * 期限切れの購読（404/410）はその場で削除する。放置すると毎回失敗し続けるため。
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  if (!ensureConfigured()) return false;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return false;

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let delivered = 0;

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      ),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      delivered++;
      return;
    }
    const code = (r.reason as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) {
      // 購読が消えている（アンインストール・サイトデータ削除・長期未使用）
      expired.push(subs[i].endpoint);
    } else {
      console.warn(`[PUSH] 送信に失敗 (${code ?? "unknown"}):`, subs[i].endpoint.slice(0, 60));
    }
  });

  if (expired.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: { in: expired } } })
      .catch(() => {});
    console.log(`[PUSH] 期限切れの購読を${expired.length}件削除`);
  }

  return delivered > 0;
}
