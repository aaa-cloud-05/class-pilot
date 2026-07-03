const WEBCLASS_KEY = "webclass-synced-at";

/** 未ログイン時の WebClass 取り込み時刻（ミリ秒）を localStorage から取得。 */
export function getLocalWebclassSyncedAt(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(WEBCLASS_KEY);
  return v ? Number(v) : null;
}

/** 未ログイン時の WebClass 取り込み時刻を localStorage に保存。 */
export function setLocalWebclassSyncedAt(ts: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEBCLASS_KEY, String(ts));
}
