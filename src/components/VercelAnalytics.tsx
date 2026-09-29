"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * 送る前に個人に関わりうる部分を落とす。
 *
 * - URL は `#` 以降と `?` 以降を消してパスだけにする。ブックマークレットは取り込む課題
 *   （課題名・締切など）を `/import#…` に載せて渡すので、それが Vercel に送られないようにする
 * - 参照元（document.referrer）は Vercel のスクリプトがそのまま送り、ここでは書き換えられない。
 *   `/import` は WebClass のページから開かれるため、ブラウザが参照元をパスや `?` 付きの URL で
 *   渡してきたとき（WebClass の URL にはセッションの値が入りうる）は、その表示ごと送らない。
 *   ふつうはオリジン（`https://〇〇.ac.jp/`）だけが渡るので、取り込みの回数はそのまま数えられる
 */
function redact(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url, window.location.origin);
  url.hash = "";
  url.search = "";

  if (url.pathname === "/import" && document.referrer) {
    const ref = new URL(document.referrer);
    const originOnly = ref.pathname === "/" && !ref.search && !ref.hash;
    if (ref.origin !== window.location.origin && !originOnly) return null;
  }

  return { ...event, url: url.toString() };
}

/**
 * Vercel Web Analytics（アクセス解析）。ページの表示回数・流入元・国・端末の種類などを、
 * Cookie を使わず個人を特定しない形で集計する。本番のときだけ送る（手元の開発では送らない）。
 *
 * `beforeSend` は関数なので、Server Component の layout からは渡せない。ここで Client Component に包む。
 */
export function VercelAnalytics() {
  return <Analytics beforeSend={redact} />;
}
