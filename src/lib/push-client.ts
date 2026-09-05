/**
 * Web Push の購読・解除（ブラウザ側）。
 *
 * 通知の許可を求めるダイアログは **ユーザー操作の中でしか出せない**ので、
 * これらは必ずボタンの onClick から呼ぶこと（起動時に自動で呼ばない）。
 *
 * iOS の注意: Safari のタブでは動かず、**ホーム画面に追加した PWA でのみ**動作する
 * （iOS 16.4 以降）。`isPushSupported()` はその判定も兼ねる。
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** VAPID の公開鍵は base64url。PushManager は Uint8Array を要求する。 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!PUBLIC_KEY
  );
}

/**
 * iOS でホーム画面に追加せずに使っているか（＝プッシュが使えない状態か）。
 * 案内文の出し分けに使う。
 */
export function isIosWithoutInstall(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

/** この端末が購読済みか。 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "failed" };

/** 通知を許可してもらい、購読をサーバーに登録する。ボタンの onClick から呼ぶこと。 */
export async function enablePush(): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const reg = await navigator.serviceWorker.ready;

    // 既存の購読があればそれを使う（鍵が変わっていたら作り直す必要があるが、
    // 鍵は固定運用なので通常は起きない）
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        // Chrome は必須。ユーザーに見えない通知を送らないという宣言。
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as BufferSource,
      }));

    const res = await fetch("/api/notifications/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!res.ok) throw new Error(String(res.status));

    return { ok: true };
  } catch (e) {
    console.error("[PUSH] 購読に失敗:", e);
    return { ok: false, reason: "failed" };
  }
}

/** この端末の購読を解除する（サーバー側の登録も消す）。 */
export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription();
  const endpoint = sub?.endpoint;

  await sub?.unsubscribe().catch(() => {});
  await fetch("/api/notifications/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}
