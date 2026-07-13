"use client"

import { useEffect, useState } from "react"
import { format, isPast } from "date-fns"
import { ja } from "date-fns/locale"
import { Pencil, ExternalLink, GraduationCap, Globe, PenLine } from "lucide-react"
import type { Assignment, SubmissionState } from "@/lib/types"
import { isSafeHttpUrl } from "@/lib/webclass"

/** Date → datetime-local入力値（ローカル時刻）。 */
function toLocalDatetime(date: Date | null): string {
  if (!date) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

/** 締切文：〇月〇日(曜日) HH:mm に締切。期限なしはその旨。 */
function deadlineText(due: Date | null): string {
  if (!due) return "期限なし"
  return `${format(due, "M月d日(E) HH:mm", { locale: ja })} に締切`
}

/** 提出状況（文言のみ・バッジなし）。 */
function submissionText(state: SubmissionState, due: Date | null, isLate: boolean): string {
  if (state === "submitted") return isLate ? "提出済（遅延）" : "提出済"
  if (state === "unknown") return "不明"
  if (due && isPast(due)) return "未提出・締切超過"
  return "未提出"
}

/** 取得元（背景なし・小アイコン＋文言）。 */
function sourceInfo(a: Assignment): { label: string; Icon: typeof Globe } {
  switch (a.source) {
    case "webclass":
      return { label: "WebClass", Icon: Globe }
    case "manual":
      return { label: "オリジナル", Icon: PenLine }
    default:
      return { label: "Classroom", Icon: GraduationCap }
  }
}

/**
 * リスト項目タップで開く詳細カード（中央表示）。鉛筆でそのままカードを直接編集できる。
 * バッジ的な背景色UIは使わず、文言＋細枠のみで構成。
 */
export function AssignmentDetailCard({
  assignment,
  loggedIn,
  muted,
  onSave,
  onToggleMute,
  onDelete,
  onClose,
}: {
  assignment: Assignment
  loggedIn: boolean
  muted: boolean
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onToggleMute: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(assignment.title)
  const [dueLocal, setDueLocal] = useState(toLocalDatetime(assignment.dueDate))
  const [submissionState, setSubmissionState] = useState<SubmissionState>(assignment.submissionState)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const href = assignment.link && isSafeHttpUrl(assignment.link) ? assignment.link : null
  const { label: sourceLabel, Icon: SourceIcon } = sourceInfo(assignment)

  // 表示は編集中の値を反映（保存後もそのまま表示に残る）
  const shownDue = dueLocal ? new Date(dueLocal) : null

  const cancel = () => {
    setTitle(assignment.title)
    setDueLocal(toLocalDatetime(assignment.dueDate))
    setSubmissionState(assignment.submissionState)
    setEditing(false)
  }

  const save = async () => {
    const data: Record<string, unknown> = {}
    if (title !== assignment.title) data.title = title
    if (dueLocal !== toLocalDatetime(assignment.dueDate)) {
      data.dueDate = dueLocal ? new Date(dueLocal).toISOString() : null
    }
    if (submissionState !== assignment.submissionState) data.submissionState = submissionState
    if (Object.keys(data).length === 0) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(assignment.id, data)
      setEditing(false)
    } catch {
      alert("保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const inputBase =
    "w-full rounded-md border border-border bg-transparent outline-none transition-colors focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={assignment.title}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] min-h-[26rem] w-full max-w-xs flex-col rounded-2xl border border-border bg-card p-5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* top controls：view＝編集/開く、edit＝キャンセル/保存 */}
        <div className="mb-4 flex items-center justify-between">
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="rounded-md px-1 py-1 text-[12.5px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:underline disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !title.trim()}
                className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </>
          ) : (
            <>
              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="この課題を編集"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <span aria-hidden />
              )}
              {href && (
                <button
                  type="button"
                  onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  開く
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>

        {/* course（編集不可） */}
        <p className="text-[12px] text-muted-foreground">{assignment.courseName}</p>

        {/* title */}
        {editing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="課題名"
            className={`mt-1 px-2 py-1.5 text-[16px] font-semibold leading-snug text-foreground ${inputBase}`}
          />
        ) : (
          <h2 className="mt-0.5 text-[16px] font-semibold leading-snug text-foreground">{title}</h2>
        )}

        {/* deadline */}
        {editing ? (
          <div className="mt-3">
            <label className="mb-1 block text-[11px] text-muted-foreground">締切日時</label>
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
              className={`px-2 py-1.5 text-[13px] text-foreground ${inputBase}`}
            />
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] text-foreground">{deadlineText(shownDue)}</p>
        )}

        {/* submission */}
        {editing ? (
          <div className="mt-3">
            <label className="mb-1 block text-[11px] text-muted-foreground">提出状況</label>
            <select
              value={submissionState}
              onChange={(e) => setSubmissionState(e.target.value as SubmissionState)}
              className={`px-2 py-1.5 text-[13px] text-foreground ${inputBase}`}
            >
              <option value="not_submitted">未提出</option>
              <option value="submitted">提出済</option>
              <option value="unknown">不明</option>
            </select>
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {submissionText(submissionState, shownDue, assignment.isLate)}
          </p>
        )}

        {/* source（編集不可） */}
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <SourceIcon className="h-3.5 w-3.5" aria-hidden />
          <span>{sourceLabel}</span>
        </div>

        {/* footer：view時のみ控えめな補助操作 */}
        {!editing && (
          <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-[12.5px]">
            <button
              type="button"
              onClick={() => onToggleMute(assignment.id)}
              className="text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:underline"
            >
              {muted ? "通知をオン" : "通知をオフ"}
            </button>
            {loggedIn && (
              <button
                type="button"
                onClick={() => onDelete(assignment.id)}
                className="text-destructive/80 outline-none transition-colors hover:text-destructive focus-visible:underline"
              >
                削除
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
