/**
 * 締切の何分前にメールを送るか。利用者は下の選択肢から最大2つ選ぶ。
 * サーバ（予約送信）と端末（「通知」画面の履歴）の両方がここを使う。
 *
 * 以前は「早め・標準・直前」のプリセット3種だった。設定がまだ `preset` のままの人は
 * `remindersOf` で同じ内容に読み替える。
 */

/** 選べるもの（分）。自由入力にしないのは、選ぶ手間を減らし、重複防止のキーを単純に保つため */
export const REMINDER_OPTIONS = [60, 180, 360, 720, 1440, 2880, 4320] as const

/** いくつまで選べるか */
export const MAX_REMINDERS = 2

/** 初期値（以前の「標準」と同じ） */
export const DEFAULT_REMINDERS = [1440, 180]

const LEGACY_PRESETS: Record<string, number[]> = {
  relaxed: [1440],
  standard: [1440, 180],
  urgent: [180, 60],
}

/** 選択肢にあるものだけを、重複なく、最大2つ、早い順（大きい順）に並べる */
export function normalizeReminders(list: unknown): number[] {
  if (!Array.isArray(list)) return []
  const allowed = new Set<number>(REMINDER_OPTIONS)
  const uniq = [...new Set(list.filter((m): m is number => typeof m === "number" && allowed.has(m)))]
  return uniq.sort((a, b) => b - a).slice(0, MAX_REMINDERS)
}

/** その人の送信タイミング。自分で選んでいなければ、以前のプリセットから読み替える */
export function remindersOf(s: { reminderMinutes?: number[] | null; preset?: string | null }): number[] {
  const own = normalizeReminders(s.reminderMinutes)
  if (own.length) return own
  return LEGACY_PRESETS[s.preset ?? ""] ?? DEFAULT_REMINDERS
}

/** 選択肢の表示「3時間前」「1日前」 */
export function reminderLabel(m: number): string {
  return m % 1440 === 0 ? `${m / 1440}日前` : `${m / 60}時間前`
}

/** 件名・見出しの残り時間「締切まであと〜」に入る部分「3時間」「1日」 */
export function remainingLabel(m: number): string {
  return m % 1440 === 0 ? `${m / 1440}日` : `${m / 60}時間`
}

/**
 * 重複防止のキー（履歴の type）。以前からある 24時間前・3時間前・1時間前 は同じ文字列にして、
 * 切り替えの前に予約された分と二重にならないようにする。
 */
export function reminderType(m: number): string {
  if (m === 1440) return "24h"
  if (m === 180) return "3h"
  if (m === 60) return "1h"
  return `${m}m`
}

/** 履歴の type から分に戻す（「通知」画面のアイコン分け用） */
export function minutesOfType(type: string): number {
  if (type === "24h") return 1440
  if (type === "3h") return 180
  if (type === "1h") return 60
  const m = Number.parseInt(type, 10)
  return Number.isFinite(m) ? m : 1440
}
