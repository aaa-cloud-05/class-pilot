import { isSafeHttpUrl } from "@/lib/webclass"

// 同期ランプから開く WebClass の URL。大学ごとに異なるためコードに固定せず、
// ユーザーが設定画面で入力（localStorage 保存）。未設定時は env をフォールバックに使う。
const KEY = "webclass-url"

/** 現在有効な WebClass URL（localStorage 優先 → env）。安全な http(s) のみ返す。 */
export function getWebclassUrl(): string | null {
  let v: string | null = null
  if (typeof window !== "undefined") {
    v = window.localStorage.getItem(KEY)
  }
  if (!v) v = process.env.NEXT_PUBLIC_WEBCLASS_URL ?? null
  v = v?.trim() || null
  return v && isSafeHttpUrl(v) ? v : null
}

/** WebClass URL を保存（空文字なら削除）。安全な http(s) 以外は false を返す。 */
export function setWebclassUrl(url: string): boolean {
  if (typeof window === "undefined") return false
  const v = url.trim()
  if (!v) {
    window.localStorage.removeItem(KEY)
    return true
  }
  if (!isSafeHttpUrl(v)) return false
  window.localStorage.setItem(KEY, v)
  return true
}
