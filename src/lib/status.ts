/**
 * 課題の提出状況 → 表示カテゴリ → 色。**アプリ全体でここだけが色の意味を決める。**
 *
 * リスト・カレンダーのドット・週の棒グラフ・進捗バー・ヘルプの凡例は、
 * 必ずこのファイルを import して描く（各所で色を書かない）。
 * モックでは表を3か所に分散させたせいで「提出済み」が
 * リストでは青・カレンダーでは灰・ヘルプの説明では緑、と3通りになった。
 *
 * 決定の経緯は `docs/ui-v5-migration.md` §2A、作法は `docs/ui-playbook.md`。
 *
 * 注意: クラス名は新しいトークン（`--primary` が青、`--ui-warn-fill`）を前提にしている。
 * トークンを `:root` に移すまでは、`--primary` は現行の黒のままなので色は合わない。
 */

import type { SubmissionState } from "@/lib/types"

/** 締切までこの時間を切ったら「もうすぐ」扱い（黄） */
export const SOON_MS = 24 * 60 * 60 * 1000

export type StatusCat = "overdue" | "soon" | "open" | "done"

/** 色を決めるのに必要な最小の形。`Assignment` はこれを満たす */
export interface StatusInput {
  submissionState: SubmissionState
  dueDate: Date | null
}

/**
 * 提出状態と締切から、表示上の4カテゴリを決める。
 * 期限なしの未提出は `open`（急がないもの）に入れる。
 *
 * `unknown` は**未提出として扱う**。WebClass の API は提出したかどうかを必ず返すので
 * （docs/webclass-api.md §4.8）、いま `unknown` が残っているのは手で追加したものと、
 * API 方式より前に取り込んだ古い行だけ。画面では未提出として出し、丸を押せば解消できる。
 */
export function catOf(a: StatusInput, now: Date): StatusCat {
  if (a.submissionState === "submitted") return "done"
  if (!a.dueDate) return "open"
  const diff = a.dueDate.getTime() - now.getTime()
  if (diff < 0) return "overdue"
  if (diff < SOON_MS) return "soon"
  return "open"
}

/**
 * 積み上げの順。縦の棒グラフは上から、横の進捗バーは左から この順に並ぶ。
 * 急ぐものを先頭に、提出済みを末尾に置く。
 */
export const CAT_ORDER: StatusCat[] = ["overdue", "soon", "open", "done"]

/** 面の塗り（棒グラフ・進捗バー・カレンダーのドット） */
export const CAT_BG: Record<StatusCat, string> = {
  overdue: "bg-destructive",
  soon: "bg-[var(--ui-warn-fill)]",
  open: "bg-muted-foreground/45",
  done: "bg-primary",
}

/** 残り時間の文字色（リストの右端）。提出済みは残り時間を出さない */
export const CAT_TEXT: Record<StatusCat, string> = {
  overdue: "text-destructive",
  soon: "text-[var(--ui-warn-fill)]",
  open: "text-muted-foreground",
  done: "text-muted-foreground",
}

/** ヘルプの凡例。ここから描くので、説明と実装がずれない */
export const CAT_LABEL: Record<StatusCat, string> = {
  overdue: "締切を過ぎた未提出",
  soon: "24時間以内に締切",
  open: "まだ先の未提出",
  done: "提出済み",
}

/** 提出状態そのものの呼び方（詳細の切り替え・フィルタの見出しなど） */
export const STATUS_LABEL: Record<SubmissionState, string> = {
  not_submitted: "未提出",
  submitted: "提出済み",
  unknown: "未提出",
}

/** 画面で扱う提出状態は2つだけ。unknown は未提出側に寄せる */
export function isSubmitted(state: SubmissionState): boolean {
  return state === "submitted"
}

/** 積み上げグラフ・進捗バー用の集計 */
export function countByCat(list: StatusInput[], now: Date): Record<StatusCat, number> {
  const out: Record<StatusCat, number> = { overdue: 0, soon: 0, open: 0, done: 0 }
  for (const a of list) out[catOf(a, now)] += 1
  return out
}
