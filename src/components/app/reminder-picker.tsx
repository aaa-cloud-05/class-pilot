"use client"

import { cn } from "@/lib/utils"
import { useApp } from "@/components/app/provider"
import { REMINDER_OPTIONS, reminderLabel, remindersOf } from "@/lib/reminders"

/** 「6時間前」。以前の設定で2つあるときは「1日前と3時間前」 */
export function remindersText(minutes: number[]): string {
  return minutes.map(reminderLabel).join("と")
}

/**
 * 締切の何時間前にメールを送るかを、選択肢から1つ選ぶ（メールの通数を抑えるため。2026-09-30）。
 * 通知なしはスイッチで切る。以前の設定で2つ選んでいる人は2つとも選ばれて見え、押すとその1つになる。
 */
export function ReminderPicker({ disabled = false }: { disabled?: boolean }) {
  const { settings, updateSettings } = useApp()
  const selected = remindersOf(settings)

  const pick = (m: number) => {
    if (selected.length === 1 && selected[0] === m) return
    updateSettings({ reminderMinutes: [m] })
  }

  return (
    <div>
      <div role="radiogroup" aria-label="締切の何時間前に知らせるか" className="flex flex-wrap gap-2">
        {REMINDER_OPTIONS.map((m) => {
          const on = selected.includes(m)
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => pick(m)}
              className={cn(
                "h-9 rounded-full px-3.5 text-[14px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent",
                !on && disabled && "opacity-40",
              )}
            >
              {reminderLabel(m)}
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
        締切の{remindersText(selected)}にメールが届きます。
      </p>
    </div>
  )
}
