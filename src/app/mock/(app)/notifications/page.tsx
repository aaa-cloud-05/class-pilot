"use client"

import Link from "next/link"
import { isSameDay, subDays } from "date-fns"
import { AlarmClock, AlertTriangle, BellOff, Download, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock } from "../../_components/provider"
import { MobileHeader, PageBody } from "../../_components/shell"
import { Button, Card, EmptyState, SectionHeader } from "../../_components/ui"
import type { MockNotification } from "../../_lib/data"
import { timeAgo } from "../../_lib/format"

const KIND: Record<MockNotification["kind"], { icon: LucideIcon; className: string }> = {
  deadline: { icon: AlarmClock, className: "bg-warn-soft text-warn" },
  overdue: { icon: AlertTriangle, className: "bg-danger-soft text-danger" },
  import: { icon: Download, className: "bg-brand-soft text-brand-text" },
}

export default function MockNotificationsPage() {
  const { notifications, markRead, markAllRead, now, controls } = useMock()
  const list = controls.data === "empty" ? [] : [...notifications].sort((a, b) => b.at.getTime() - a.at.getTime())
  const unread = list.filter((n) => !n.read).length

  const groups = [
    { key: "today", label: "今日", items: list.filter((n) => isSameDay(n.at, now)) },
    { key: "yesterday", label: "昨日", items: list.filter((n) => isSameDay(n.at, subDays(now, 1))) },
    {
      key: "older",
      label: "それ以前",
      items: list.filter((n) => !isSameDay(n.at, now) && !isSameDay(n.at, subDays(now, 1))),
    },
  ].filter((g) => g.items.length)

  const readAll = unread ? (
    <Button variant="ghost" size="sm" className="h-11" onClick={markAllRead}>
      すべて既読
    </Button>
  ) : null

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/mock/home" actions={readAll} />
      <PageBody desktopTitle="通知" desktopActions={readAll}>
        {groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellOff}
              title="通知はまだありません"
              description="締切が近づくと、ここにも履歴が残ります。"
            />
          </Card>
        ) : (
          <div className="space-y-7">
            {groups.map((g) => (
              <section key={g.key}>
                <SectionHeader title={g.label} />
                <ul className="overflow-hidden rounded-card bg-surface shadow-card">
                  {g.items.map((n, i) => {
                    const { icon: Icon, className } = KIND[n.kind]
                    return (
                      <li key={n.id} className={cn(i > 0 && "border-t border-line")}>
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2"
                        >
                          <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", className)}>
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className={cn("flex-1 text-[16px] leading-snug", n.read ? "font-medium text-ink-2" : "font-bold text-ink")}>
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[13px] tabular-nums text-ink-3">{timeAgo(n.at, now)}</span>
                            </span>
                            <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-2">{n.body}</span>
                          </span>
                          {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-signal" aria-label="未読" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <p className="mt-6 px-2 text-[13px] leading-relaxed text-ink-3">
          通知の受け取り方やタイミングは{" "}
          <Link href="/mock/settings/notifications" className="font-semibold text-brand-text hover:underline">
            設定 › 通知
          </Link>{" "}
          で変えられます。
        </p>
      </PageBody>
    </>
  )
}
