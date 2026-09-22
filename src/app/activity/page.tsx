"use client"

import Link from "next/link"
import { isSameDay, subDays } from "date-fns"
import { AlarmClock, AlertTriangle, BellOff, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app/provider"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { Button, Card, EmptyState, SectionHeader } from "@/components/app/ui"
import type { NotificationRecord } from "@/lib/notification-store"
import { timeAgo } from "@/lib/assignment-format"

/** 締切までの近さで見た目を変える。1時間前だけは強く出す */
const KIND: Record<NotificationRecord["type"], { icon: LucideIcon; className: string }> = {
  "24h": { icon: AlarmClock, className: "text-muted-foreground" },
  "3h": { icon: AlarmClock, className: "text-[var(--ui-warn-fill)]" },
  "1h": { icon: AlertTriangle, className: "text-destructive" },
}

/** 保存しているのは数値なので、表示のたびに Date に直す */
const sentAt = (n: NotificationRecord) => new Date(n.sentAt)

export default function ActivityPage() {
  const { notifications, markRead, markAllRead, now } = useApp()
  const list = [...notifications].sort((a, b) => b.sentAt - a.sentAt)
  const unread = list.filter((n) => !n.read).length

  const groups = [
    { key: "today", label: "今日", items: list.filter((n) => isSameDay(sentAt(n), now)) },
    { key: "yesterday", label: "昨日", items: list.filter((n) => isSameDay(sentAt(n), subDays(now, 1))) },
    {
      key: "older",
      label: "それ以前",
      items: list.filter((n) => !isSameDay(sentAt(n), now) && !isSameDay(sentAt(n), subDays(now, 1))),
    },
  ].filter((g) => g.items.length)

  const readAll = unread ? (
    <Button variant="ghost" size="sm" className="h-11" onClick={markAllRead}>
      すべて既読
    </Button>
  ) : null

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/" actions={readAll} />
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
                <ul className="overflow-hidden rounded-card bg-card shadow-card">
                  {g.items.map((n, i) => {
                    const { icon: Icon, className } = KIND[n.type]
                    return (
                      <li key={n.id} className={cn(i > 0 && "border-t border-border")}>
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted"
                        >
                          <Icon className={cn("mt-1 h-[18px] w-[18px] shrink-0", className)} strokeWidth={1.75} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className={cn("flex-1 text-[16px] leading-snug", n.read ? "font-medium text-muted-foreground" : "font-bold text-foreground")}>
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{timeAgo(sentAt(n), now)}</span>
                            </span>
                            <span className="mt-0.5 block text-[14px] leading-relaxed text-muted-foreground">{n.body}</span>
                          </span>
                          {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="未読" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <p className="mt-6 px-2 text-[13px] leading-relaxed text-muted-foreground">
          通知の受け取り方やタイミングは{" "}
          <Link href="/settings/notifications" className="font-semibold text-primary hover:underline">
            設定 › 通知
          </Link>{" "}
          で変えられます。
        </p>
      </PageBody>
    </>
  )
}
