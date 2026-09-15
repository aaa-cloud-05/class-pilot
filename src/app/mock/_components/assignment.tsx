"use client"

import { useState } from "react"
import { format } from "date-fns"
import { BellOff, Check, ExternalLink, GraduationCap, Globe, HelpCircle, PenLine, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MockAssignment, Source, Status } from "../_lib/data"
import { dueLabel, dueLong, relativeLabel, SOURCE_LABEL, STATUS_LABEL, TONE_TEXT } from "../_lib/format"
import { useMock } from "./provider"
import { Button, Field, INPUT, Segmented, Sheet } from "./ui"

export const SOURCE_ICON: Record<Source, typeof Globe> = {
  classroom: GraduationCap,
  webclass: Globe,
  manual: PenLine,
}

/* ───────── 提出状況の丸チェック（行の左端・44px） ───────── */

export function StatusToggle({ a, size = "md" }: { a: MockAssignment; size?: "md" | "lg" }) {
  const { toggleSubmitted, controls, showToast } = useMock()
  const submitted = a.status === "submitted"
  const unknown = a.status === "unknown"
  const disabled = !controls.loggedIn && a.source !== "manual"

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (disabled) {
          showToast("ログインすると提出状況を変更できます")
          return
        }
        toggleSubmitted(a.id)
      }}
      aria-label={submitted ? `「${a.title}」を未提出に戻す` : `「${a.title}」を提出済みにする`}
      aria-pressed={submitted}
      className="group -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-200 group-active:scale-90",
          size === "lg" ? "h-7 w-7" : "h-6 w-6",
          submitted
            ? "border-ok bg-ok text-white"
            : unknown
              ? "border-dashed border-ink-3 text-ink-3"
              : "border-line-strong text-transparent group-hover:border-ok group-hover:text-ok/60",
        )}
      >
        {unknown ? (
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={3.2} aria-hidden />
        )}
      </span>
    </button>
  )
}

/* ───────── 課題の行 ───────── */

export function AssignmentRow({
  a,
  onOpen,
  selected,
  showCourse = true,
}: {
  a: MockAssignment
  onOpen: (a: MockAssignment) => void
  selected?: boolean
  showCourse?: boolean
}) {
  const { now, courseById } = useMock()
  const course = courseById(a.courseId)
  const due = dueLabel(a, now)
  const submitted = a.status === "submitted"
  const SourceIcon = SOURCE_ICON[a.source]

  return (
    <div
      className={cn(
        "relative flex items-center gap-1 pl-4 pr-3 transition-colors",
        selected ? "bg-brand-soft" : "hover:bg-surface-2/60",
      )}
    >
      <StatusToggle a={a} />
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 rounded-control py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "line-clamp-2 text-[16px] font-medium leading-[1.45]",
              submitted ? "text-ink-3" : "text-ink",
            )}
          >
            {a.title}
          </span>
          {showCourse && course && (
            <span className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-3">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
              <span className="truncate">{course.name}</span>
              <SourceIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-label={SOURCE_LABEL[a.source]} />
              {a.muted && <BellOff className="h-3.5 w-3.5 shrink-0 opacity-70" aria-label="通知オフ" />}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className={cn("text-[15px] font-semibold tabular-nums", submitted ? "text-ink-3" : "text-ink")}>
            {due.main}
          </span>
          {due.sub && <span className={cn("text-[13px] font-semibold tabular-nums", TONE_TEXT[due.tone])}>{due.sub}</span>}
        </span>
      </button>
    </div>
  )
}

export function AssignmentList({
  items,
  onOpen,
  selectedId,
}: {
  items: MockAssignment[]
  onOpen: (a: MockAssignment) => void
  selectedId?: string | null
}) {
  return (
    <ul className="overflow-hidden rounded-card bg-surface shadow-card">
      {items.map((a, i) => (
        <li key={a.id} className={cn(i > 0 && "border-t border-line")}>
          <AssignmentRow a={a} onOpen={onOpen} selected={selectedId === a.id} />
        </li>
      ))}
    </ul>
  )
}

/* ───────── 詳細（シート／PC の右パネル共通の中身） ───────── */

function toDateInput(d: Date | null) {
  return d ? format(d, "yyyy-MM-dd") : ""
}
function toTimeInput(d: Date | null) {
  return d ? format(d, "HH:mm") : "23:59"
}

export function AssignmentDetail({ a, onClose }: { a: MockAssignment; onClose?: () => void }) {
  const { now, courseById, controls, setStatus, toggleAssignmentMute, updateAssignment, deleteAssignment, showToast } =
    useMock()
  const course = courseById(a.courseId)
  const rel = relativeLabel(a, now)
  const SourceIcon = SOURCE_ICON[a.source]
  const canEdit = controls.loggedIn || a.source === "manual"

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(a.title)
  const [date, setDate] = useState(toDateInput(a.due))
  const [time, setTime] = useState(toTimeInput(a.due))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = () => {
    if (!title.trim()) return
    updateAssignment(a.id, { title: title.trim(), due: date ? new Date(`${date}T${time}:00`) : null })
    setEditing(false)
    showToast("変更を保存しました")
  }

  if (editing) {
    return (
      <div className="space-y-5 pt-2">
        <Field label="課題名">
          <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-[1fr_7.5rem] gap-3">
          <Field label="締切日">
            <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="時刻">
            <input type="time" className={INPUT} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </Field>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-3">
          自分で直した項目は、あとで自動同期しても上書きされません。
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="secondary" size="lg" onClick={() => setEditing(false)}>
            キャンセル
          </Button>
          <Button size="lg" onClick={save} disabled={!title.trim()}>
            保存
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-1">
      {course && (
        <p className="flex items-center gap-2 text-[14px] font-medium text-ink-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
          {course.name}
        </p>
      )}
      <h3 className="mt-2 text-[22px] font-bold leading-snug tracking-[-0.01em] text-ink">{a.title}</h3>

      <dl className="mt-5 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[14px] text-ink-3">締切</dt>
          <dd className="text-right">
            <span className="text-[16px] font-semibold tabular-nums">{dueLong(a.due)}</span>
            {rel && <span className={cn("ml-2 text-[14px] font-semibold", TONE_TEXT[rel.tone])}>{rel.text}</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[14px] text-ink-3">取得元</dt>
          <dd className="flex items-center gap-1.5 text-[15px] text-ink-2">
            <SourceIcon className="h-4 w-4" aria-hidden />
            {SOURCE_LABEL[a.source]}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <p className="mb-2 text-[14px] font-semibold text-ink-2">提出状況</p>
        <Segmented<Status>
          label="提出状況"
          value={a.status}
          onChange={(s) => {
            if (!canEdit) {
              showToast("ログインすると提出状況を変更できます")
              return
            }
            setStatus(a.id, s)
          }}
          options={[
            { value: "not_submitted", label: STATUS_LABEL.not_submitted },
            { value: "submitted", label: STATUS_LABEL.submitted },
            { value: "unknown", label: STATUS_LABEL.unknown },
          ]}
        />
        {!canEdit && <p className="mt-2 text-[13px] text-ink-3">変更するには Google でログインしてください。</p>}
      </div>

      <div className="mt-6 space-y-3">
        {a.link && (
          <Button size="lg" className="w-full" onClick={() => showToast(`${SOURCE_LABEL[a.source]} を開きます（モック）`)}>
            {SOURCE_LABEL[a.source]} で開く
            <ExternalLink className="h-[18px] w-[18px]" aria-hidden />
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={!canEdit} onClick={() => setEditing(true)}>
            <PenLine className="h-[18px] w-[18px]" aria-hidden />
            編集
          </Button>
          <Button variant="secondary" onClick={() => toggleAssignmentMute(a.id)}>
            <BellOff className="h-[18px] w-[18px]" aria-hidden />
            {a.muted ? "通知をオン" : "通知をオフ"}
          </Button>
        </div>
      </div>

      {canEdit && (
        <div className="mt-8 border-t border-line pt-4">
          {confirmDelete ? (
            <div className="rounded-control bg-danger-soft p-4">
              <p className="text-[15px] font-semibold text-danger">この課題を削除しますか？</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                削除した課題は、あとで同期しても元に戻りません。
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  やめる
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteAssignment(a.id)
                    onClose?.()
                  }}
                >
                  削除する
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-[18px] w-[18px]" aria-hidden />
              この課題を削除
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function AssignmentSheet({ a, onClose }: { a: MockAssignment | null; onClose: () => void }) {
  return (
    <Sheet open={a != null} onClose={onClose} title="課題の詳細" hideTitle>
      {a && <AssignmentDetail key={a.id} a={a} onClose={onClose} />}
    </Sheet>
  )
}

/* ───────── 追加シート ───────── */

export function AddAssignmentSheet() {
  const { addOpen, setAddOpen, addAssignment, courses, now } = useMock()
  const [title, setTitle] = useState("")
  const [courseName, setCourseName] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("23:59")
  const [status, setStatusValue] = useState<Status>("not_submitted")
  const [tried, setTried] = useState(false)

  const close = () => {
    setAddOpen(false)
    setTitle("")
    setCourseName("")
    setDate("")
    setTime("23:59")
    setStatusValue("not_submitted")
    setTried(false)
  }

  const submit = () => {
    setTried(true)
    if (!title.trim() || !courseName.trim()) return
    addAssignment({
      title: title.trim(),
      courseName: courseName.trim(),
      due: date ? new Date(`${date}T${time}:00`) : null,
      status,
    })
    close()
  }

  const quick = [
    { label: "今日", days: 0 },
    { label: "明日", days: 1 },
    { label: "1週間後", days: 7 },
  ]

  return (
    <Sheet
      open={addOpen}
      onClose={close}
      title="課題を追加"
      footer={
        <Button size="lg" className="w-full" onClick={submit}>
          追加する
        </Button>
      }
    >
      <div className="space-y-5 pt-2">
        <Field label="課題名" error={tried && !title.trim() ? "課題名を入力してください" : undefined}>
          <input
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：レポート第3回"
            autoFocus
          />
        </Field>

        <Field label="教科" error={tried && !courseName.trim() ? "教科を入力するか、下から選んでください" : undefined}>
          <input
            className={INPUT}
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="例：情報理論"
            list="mock-course-names"
          />
          <datalist id="mock-course-names">
            {courses.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </Field>
        <div className="-mt-2 flex flex-wrap gap-2">
          {courses
            .filter((c) => !c.hidden)
            .slice(0, 5)
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCourseName(c.name)}
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                  courseName === c.name ? "border-brand bg-brand-soft text-brand-text" : "border-line text-ink-2 hover:bg-surface-2",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                {c.name}
              </button>
            ))}
        </div>

        <div>
          <span className="mb-2 block text-[14px] font-semibold text-ink-2">締切</span>
          <div className="mb-3 flex gap-2">
            {quick.map((q) => {
              const d = new Date(now)
              d.setDate(d.getDate() + q.days)
              const v = format(d, "yyyy-MM-dd")
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setDate(v)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                    date === v ? "border-brand bg-brand-soft text-brand-text" : "border-line text-ink-2 hover:bg-surface-2",
                  )}
                >
                  {q.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setDate("")}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                date === "" ? "border-brand bg-brand-soft text-brand-text" : "border-line text-ink-2 hover:bg-surface-2",
              )}
            >
              なし
            </button>
          </div>
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <input type="date" aria-label="締切日" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
            <input
              type="time"
              aria-label="締切時刻"
              className={INPUT}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date}
            />
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[14px] font-semibold text-ink-2">提出状況</span>
          <Segmented<Status>
            label="提出状況"
            value={status}
            onChange={setStatusValue}
            options={[
              { value: "not_submitted", label: "未提出" },
              { value: "submitted", label: "提出済み" },
            ]}
          />
        </div>
      </div>
    </Sheet>
  )
}
