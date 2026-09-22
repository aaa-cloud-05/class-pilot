"use client"

import Link from "next/link"
import { isSameDay, subDays } from "date-fns"
import { BellOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMock } from "../../_components/provider"
import { Content, TopBar } from "../../_components/shell"
import { Button, EmptyState, Panel } from "../../_components/ui"
import { timeAgo } from "../../_lib/format"

export default function ActivityPage() {
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

  return (
    <>
      <TopBar
        title="通知"
        back="/mock-v3/home"
        actions={
          unread > 0 ? (
            <Button size="sm" variant="ghost" onClick={markAllRead}>
              すべて既読
            </Button>
          ) : null
        }
      />
      <Content className="lg:max-w-2xl">
        {groups.length === 0 ? (
          <Panel>
            <EmptyState icon={BellOff} title="通知はまだありません" description="締切が近づくと、ここに履歴が残ります。" />
          </Panel>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="mb-2 px-1 text-[12px] font-medium text-muted-foreground">{g.label}</h2>
                <Panel className="divide-y divide-border overflow-hidden bg-background">
                  {g.items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                    >
                      <span
                        className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={cn("flex-1 text-[14px]", n.read ? "text-muted-foreground" : "font-medium text-foreground")}>
                            {n.title}
                          </span>
                          <span className="num shrink-0 text-[12px] text-muted-foreground">{timeAgo(n.at, now)}</span>
                        </span>
                        <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.body}</span>
                      </span>
                    </button>
                  ))}
                </Panel>
              </section>
            ))}
          </div>
        )}

        <p className="mt-5 px-1 text-[13px] text-muted-foreground">
          通知の受け取り方は{" "}
          <Link href="/mock-v3/settings/notifications" className="text-primary hover:underline">
            設定 › 通知
          </Link>{" "}
          で変えられます。
        </p>
      </Content>
    </>
  )
}
