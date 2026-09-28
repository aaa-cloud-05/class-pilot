"use client"

import { cn } from "@/lib/utils"
import { useApp } from "@/components/app/provider"
import { MAX_REMINDERS, normalizeReminders, REMINDER_OPTIONS, reminderLabel, remindersOf } from "@/lib/reminders"

/** 「締切の1日前と3時間前」 */
export function remindersText(minutes: number[]): string {
  return minutes.map(reminderLabel).join("と")
}

/**
 * 締切の何時間前にメールを送るかを、選択肢から2つまで選ぶ。
 * 1つは必ず残す（0個＝通知なしは、スイッチで切る）。
 * 2つ選んでいるときは、ほかの選択肢は押せない（どちらかを外すと選び直せる）。
 */
export function ReminderPicker({ disabled = false }: { disabled?: boolean }) {
  const { settings, updateSettings } = useApp()
  const selected = remindersOf(settings)
  const full = selected.length >= MAX_REMINDERS

  const toggle = (m: number) => {
    const on = selected.includes(m)
    if (on && selected.length === 1) return
    updateSettings({ reminderMinutes: normalizeReminders(on ? selected.filter((x) => x !== m) : [...selected, m]) })
  }

  return (
    <div>
      <div role="group" aria-label="締切の何時間前に知らせるか" className="flex flex-wrap gap-2">
        {REMINDER_OPTIONS.map((m) => {
          const on = selected.includes(m)
          const locked = !on && full
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              disabled={disabled || locked}
              onClick={() => toggle(m)}
              className={cn(
                "h-9 rounded-full px-3.5 text-[14px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent",
                !on && (locked || disabled) && "opacity-40",
              )}
            >
              {reminderLabel(m)}
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
        締切の{remindersText(selected)}にメールが届きます。
        {full ? "2つまで選べます（外すと選び直せます）。" : "もう1つ選べます。"}
      </p>
    </div>
  )
}
