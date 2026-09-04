/**
 * アプリの公開URL（末尾スラッシュなし）。
 *
 * メール本文の絶対リンクと OGP の `metadataBase` に使う。両方とも
 * 「今どのドメインで動いているか」をサーバー側で知る必要があるため、一箇所に集約する。
 *
 * 優先順位:
 * 1. NEXT_PUBLIC_APP_URL … 独自ドメイン取得後はこれを設定する（正）
 * 2. VERCEL_PROJECT_PRODUCTION_URL … Vercel が自動で入れる本番ドメイン（*.vercel.app）
 *    ※ VERCEL_URL はデプロイ毎に変わる URL なので、メールに載せると後で死ぬリンクになる
 * 3. localhost … ローカル開発
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
