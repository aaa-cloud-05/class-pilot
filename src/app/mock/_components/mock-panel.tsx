"use client"

import { useState } from "react"
import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { useMock, type Controls } from "./provider"
import { Segmented, Sheet } from "./ui"

type Option<K extends keyof Controls> = { value: Controls[K]; label: string }

function ControlRow<K extends keyof Controls>({
  name,
  label,
  hint,
  options,
}: {
  name: K
  label: string
  hint?: string
  options: Option<K>[]
}) {
  const { controls, setControl } = useMock()
  const toKey = (v: Controls[K]) => String(v)
  return (
    <div>
      <p className="mb-1.5 text-[14px] font-semibold text-ink-2">{label}</p>
      <Segmented<string>
        label={label}
        size="sm"
        value={toKey(controls[name])}
        onChange={(v) => {
          const opt = options.find((o) => toKey(o.value) === v)
          if (opt) setControl(name, opt.value)
        }}
        options={options.map((o) => ({ value: toKey(o.value), label: o.label }))}
      />
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{hint}</p>}
    </div>
  )
}

/** モック専用の調整パネル。本番には入れない */
export function MockPanel() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="モックの見た目を調整"
        className="fixed right-0 top-[38%] z-40 flex h-12 w-9 items-center justify-center rounded-l-control bg-ink text-canvas opacity-70 shadow-float outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 lg:bottom-6 lg:right-6 lg:top-auto lg:h-11 lg:w-11 lg:rounded-full"
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="モックの調整">
        <div className="space-y-5 pt-2">
          <p className="rounded-control bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink-2">
            この画面はダミーデータで動くモックです。ここで変えた内容はこの端末に保存されます（本番の設定とは無関係）。
          </p>
          <ControlRow
            name="accent"
            label="配色"
            options={[
              { value: "blue", label: "ブルー" },
              { value: "mono", label: "モノクロ" },
            ]}
          />
          <ControlRow
            name="mode"
            label="ライト / ダーク"
            hint="設定 › 表示 のテーマ切替と同じ値です"
            options={[
              { value: "system", label: "自動" },
              { value: "light", label: "ライト" },
              { value: "dark", label: "ダーク" },
            ]}
          />
          <ControlRow
            name="jp"
            label="和文フォント"
            options={[
              { value: "system", label: "システム" },
              { value: "noto", label: "Noto" },
              { value: "line", label: "LINE Seed" },
              { value: "plex", label: "Plex" },
            ]}
          />
          <ControlRow
            name="latin"
            label="欧文・数字フォント"
            options={[
              { value: "jakarta", label: "Plus Jakarta Sans" },
              { value: "jp", label: "和文と同じ" },
            ]}
          />
          <ControlRow
            name="nav"
            label="下部ナビ（スマホ）"
            options={[
              { value: "floating", label: "浮いたピル" },
              { value: "bar", label: "固定バー" },
            ]}
          />
          <ControlRow
            name="data"
            label="データの状態"
            options={[
              { value: "normal", label: "通常" },
              { value: "empty", label: "空" },
              { value: "loading", label: "読込中" },
              { value: "error", label: "エラー" },
              { value: "reauth", label: "要再ログイン" },
            ]}
          />
          <ControlRow
            name="loggedIn"
            label="ログイン"
            options={[
              { value: true, label: "ログイン中" },
              { value: false, label: "未ログイン" },
            ]}
          />
          <ControlRow
            name="setupDone"
            label="はじめの設定"
            options={[
              { value: false, label: "未完了" },
              { value: true, label: "完了" },
            ]}
          />
          <Link
            href="/mock"
            onClick={() => setOpen(false)}
            className="block rounded-control py-3 text-center text-[15px] font-semibold text-brand-text outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal"
          >
            画面一覧へ
          </Link>
        </div>
      </Sheet>
    </>
  )
}
