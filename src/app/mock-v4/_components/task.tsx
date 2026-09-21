"use client"

import { useState } from "react"
import { format } from "date-fns"
import { BellOff, Check, ChevronRight, ExternalLink, Pencil, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { MockAssignment, Status } from "../_lib/data"
import { dueLong, dueText, GROUP_LABEL, groupAssignments, taskState } from "../_lib/state"
import { useMock } from "./provider"
import { Button, Field, INPUT, Panel, Segmented, Sheet } from "./ui"

const SOURCE_LABEL = { classroom: "Classroom", webclass: "WebClass", manual: "自分で追加" } as const

/* ─────────────── 提出状況の丸 ─────────────── */

export function StatusCircle({ a, className }: { a: MockAssignment; className?: string }) {
  const { toggleSubmitted, controls, showToast, now } = useMock()
  const state = taskState(a, now)
  const locked = !controls.loggedIn && a.source !== "manual"

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (locked) {
          showToast("ログインすると提出状況を変えられます")
          return
        }
        toggleSubmitted(a.id)
      }}
      aria-label={state === "done" ? `「${a.title}」を未提出に戻す` : `「${a.title}」を提出済みにする`}
      aria-pressed={state === "done"}
      className={cn(
        "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
    >
      <motion.span
        animate={state === "done" ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className={cn(
          "flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors",
          state === "done"
            ? "border-ok bg-ok text-white"
            : state === "unknown"
              ? "border-dashed border-muted-foreground/60 text-transparent"
              : "border-muted-foreground/40 text-transparent group-hover:border-ok",
        )}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />
      </motion.span>
    </button>
  )
}

/* ─────────────── 行 ─────────────── */

export function TaskRow({
  a,
  onOpen,
  selected,
}: {
  a: MockAssignment
  onOpen: (a: MockAssignment) => void
  selected?: boolean
}) {
  const { now, courseById } = useMock()
  const state = taskState(a, now)
  const due = dueText(a, now)
  const course = courseById(a.courseId)

  return (
    <div className={cn("flex items-center gap-1.5 bg-background pl-2 pr-3 transition-colors", selected ? "bg-accent" : "hover:bg-accent/60")}>
      <StatusCircle a={a} />
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="flex min-h-[var(--ui-row-h)] min-w-0 flex-1 items-center gap-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 lg:min-h-[var(--ui-row-h-lg)]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-[length:var(--ui-text-row)]", state === "done" ? "text-muted-foreground" : "text-foreground")}>
              {a.title}
            </span>
            {a.muted && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-label="通知オフ" />}
          </span>
          <span className="mt-0.5 block truncate text-[length:var(--ui-text-meta)] text-muted-foreground lg:hidden">{course?.name}</span>
        </span>
        <span className="hidden w-32 shrink-0 truncate text-[length:var(--ui-text-meta)] text-muted-foreground xl:block">{course?.name}</span>
        <span className={cn("num w-[5rem] shrink-0 text-right text-[length:var(--ui-text-meta)]", due.className)}>{due.text}</span>
      </button>
    </div>
  )
}

/* ─────────────── グループ付きリスト ─────────────── */

function DoneRow({ items, onOpen }: { items: MockAssignment[]; onOpen: (a: MockAssignment) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-1.5 px-3.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
        提出済み <span className="num">{items.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="divide-y divide-border overflow-hidden border-t border-border"
          >
            {items.map((a) => (
              <li key={a.id}>
                <TaskRow a={a} onOpen={onOpen} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TaskGroups({
  items,
  onOpen,
  selectedId,
}: {
  items: MockAssignment[]
  onOpen: (a: MockAssignment) => void
  selectedId?: string | null
}) {
  const { now } = useMock()
  const groups = groupAssignments(items, now)

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-1.5 flex items-baseline gap-2 px-1 text-[12.5px] font-medium">
            <span className={cn(g.key === "overdue" ? "text-destructive" : "text-muted-foreground")}>
              {GROUP_LABEL[g.key]}
            </span>
            <span className="num text-muted-foreground">{g.items.length}</span>
          </h3>
          <Panel className="divide-y divide-border overflow-hidden bg-background">
            <AnimatePresence initial={false}>
              {g.items.map((a) => (
                <motion.div key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                  <TaskRow a={a} onOpen={onOpen} selected={selectedId === a.id} />
                </motion.div>
              ))}
            </AnimatePresence>
            {g.done.length > 0 && <DoneRow items={g.done} onOpen={onOpen} />}
          </Panel>
        </section>
      ))}
    </div>
  )
}

/* ─────────────── 詳細 ─────────────── */

export function TaskDetail({ a, onClose }: { a: MockAssignment; onClose?: () => void }) {
  const { now, courseById, controls, setStatus, toggleAssignmentMute, updateAssignment, deleteAssignment, showToast } = useMock()
  const course = courseById(a.courseId)
  const due = dueText(a, now)
  const canEdit = controls.loggedIn || a.source === "manual"

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(a.title)
  const [date, setDate] = useState(a.due ? format(a.due, "yyyy-MM-dd") : "")
  const [time, setTime] = useState(a.due ? format(a.due, "HH:mm") : "23:59")
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (editing) {
    return (
      <div className="space-y-4">
        <Field label="課題名">
          <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="締切日">
            <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="時刻">
            <input type="time" className={INPUT} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setEditing(false)}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            onClick={() => {
              updateAssignment(a.id, { title: title.trim(), due: date ? new Date(`${date}T${time}:00`) : null })
              setEditing(false)
              showToast("保存しました")
            }}
          >
            保存
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[5rem_1fr] gap-y-2 text-[13px]">
        <dt className="text-muted-foreground">科目</dt>
        <dd>{course?.name}</dd>
        <dt className="text-muted-foreground">締切</dt>
        <dd className="num">
          {dueLong(a.due)}
          <span className={cn("ml-2", due.className)}>{due.text}</span>
        </dd>
        <dt className="text-muted-foreground">取得元</dt>
        <dd>{SOURCE_LABEL[a.source]}</dd>
      </dl>

      <div>
        <p className="mb-1.5 text-[13px] font-medium">提出状況</p>
        <Segmented<Status>
          label="提出状況"
          className="w-full"
          value={a.status}
          onChange={(s) => {
            if (!canEdit) {
              showToast("ログインすると提出状況を変えられます")
              return
            }
            setStatus(a.id, s)
          }}
          options={[
            { value: "not_submitted", label: "未提出" },
            { value: "submitted", label: "提出済み" },
            { value: "unknown", label: "不明" },
          ]}
        />
        {a.status === "unknown" && (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            WebClass から提出状況が取れなかった課題です。確認して切り替えてください。
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {a.link && (
          <Button variant="primary" onClick={() => showToast(`${SOURCE_LABEL[a.source]} を開きます（モック）`)}>
            <ExternalLink />
            {SOURCE_LABEL[a.source]} で開く
          </Button>
        )}
        <Button disabled={!canEdit} onClick={() => setEditing(true)}>
          <Pencil />
          編集
        </Button>
        <Button onClick={() => toggleAssignmentMute(a.id)}>
          <BellOff />
          {a.muted ? "通知をオン" : "通知をオフ"}
        </Button>
      </div>

      {canEdit && (
        <div className="border-t border-border pt-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[13px]">削除すると元に戻せません。</p>
              <Button size="sm" onClick={() => setConfirmDelete(false)}>
                やめる
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  deleteAssignment(a.id)
                  onClose?.()
                }}
              >
                削除
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              削除
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskSheet({ a, onClose }: { a: MockAssignment | null; onClose: () => void }) {
  return (
    <Sheet open={a != null} onClose={onClose} title={a?.title ?? ""}>
      {a && <TaskDetail key={a.id} a={a} onClose={onClose} />}
    </Sheet>
  )
}

/* ─────────────── 追加 ─────────────── */

export function AddSheet() {
  const { addOpen, setAddOpen, addAssignment, courses, now } = useMock()
  const [title, setTitle] = useState("")
  const [courseName, setCourseName] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("23:59")
  const [tried, setTried] = useState(false)

  const close = () => {
    setAddOpen(false)
    setTitle("")
    setCourseName("")
    setDate("")
    setTried(false)
  }

  const chip = (active: boolean) =>
    cn(
      "h-8 rounded-md border px-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
      active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent",
    )

  return (
    <Sheet
      open={addOpen}
      onClose={close}
      title="課題を追加"
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={close}>キャンセル</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTried(true)
              if (!title.trim() || !courseName.trim()) return
              addAssignment({
                title: title.trim(),
                courseName: courseName.trim(),
                due: date ? new Date(`${date}T${time}:00`) : null,
                status: "not_submitted",
              })
              close()
            }}
          >
            追加
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="課題名" error={tried && !title.trim() ? "入力してください" : undefined}>
          <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="レポート第3回" autoFocus />
        </Field>
        <Field label="科目" error={tried && !courseName.trim() ? "入力してください" : undefined}>
          <input className={INPUT} value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="情報理論" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {courses
            .filter((c) => !c.hidden)
            .slice(0, 5)
            .map((c) => (
              <button key={c.id} type="button" onClick={() => setCourseName(c.name)} className={chip(courseName === c.name)}>
                {c.name}
              </button>
            ))}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium">締切</p>
          <div className="mb-2 flex gap-1.5">
            {[
              { label: "今日", days: 0 },
              { label: "明日", days: 1 },
              { label: "1週間後", days: 7 },
            ].map((q) => {
              const d = new Date(now)
              d.setDate(d.getDate() + q.days)
              const v = format(d, "yyyy-MM-dd")
              return (
                <button key={q.label} type="button" onClick={() => setDate(v)} className={chip(date === v)}>
                  {q.label}
                </button>
              )
            })}
            <button type="button" onClick={() => setDate("")} className={chip(date === "")}>
              なし
            </button>
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
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
      </div>
    </Sheet>
  )
}

/* ─────────────── 未確認をまとめて確認 ─────────────── */

export function ConfirmUnknownSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { assignments, now, courseById, setStatus } = useMock()
  const unknown = assignments.filter((a) => a.status === "unknown")

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="提出状況の確認"
      description="WebClass から状況が取れなかった課題です。提出したものにチェックを入れてください。"
      wide
      footer={
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            完了
          </Button>
        </div>
      }
    >
      {unknown.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">未確認の課題はありません。</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {unknown.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{a.title}</span>
                <span className="num block truncate text-[12px] text-muted-foreground">
                  {courseById(a.courseId)?.name} ・ {dueText(a, now).text}
                </span>
              </span>
              <Button size="sm" onClick={() => setStatus(a.id, "not_submitted")}>
                未提出
              </Button>
              <Button size="sm" variant="primary" onClick={() => setStatus(a.id, "submitted")}>
                提出済み
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
