"use client"

import Link from "next/link"
import { Bookmark, Check, ChevronRight, Eye, RefreshCw, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { MobileHeader, PageBody, useSetupSteps } from "../../_components/shell"
import { Card, ListGroup, RowLink } from "../../_components/ui"

export default function MockHelpPage() {
  const steps = useSetupSteps()
  const done = steps.filter((s) => s.done).length

  return (
    <>
      <MobileHeader variant="back" title="はじめかたと使い方" backHref="/mock-v5/settings" />
      <PageBody desktopTitle="はじめかたと使い方" desktopBack={{ href: "/mock-v5/settings", label: "設定" }}>
        <div className="space-y-7">
          <section>
            <div className="flex items-baseline justify-between px-4 pb-2">
              <h2 className="text-[13px] font-semibold text-muted-foreground">はじめの設定</h2>
              <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                {done} / {steps.length} 完了
              </span>
            </div>
            <Card className="overflow-hidden">
              <ol className="divide-y divide-border">
                {steps.map((s, i) => (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      className="flex min-h-[72px] items-center gap-3 px-4 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold",
                          s.done ? "bg-primary text-primary-foreground" : "border border-input text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {s.done ? <Check className="h-5 w-5" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 py-3">
                        <span className={cn("block text-[16px] font-semibold", s.done && "text-muted-foreground")}>{s.title}</span>
                        <span className="mt-0.5 block text-[13px] text-muted-foreground">{s.done ? "完了しています" : s.desc}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/70" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <ListGroup title="使い方ガイド">
            <RowLink
              href="/mock-v5/help/webclass"
              icon={Bookmark}
             
              label="WebClass の取り込み方"
              description="機種ごとの手順と、PC の自動取り込み"
            />
            <RowLink href="/mock-v5/help/screen" icon={Eye} label="画面の見かた" description="色・丸チェック・カレンダー" />
            <RowLink href="/mock-v5/help/sync" icon={RefreshCw} label="同期のしくみ" description="いつ更新されるか・取得の上限" />
            <RowLink href="/mock-v5/help/safety" icon={Shield} label="安全性とよくある質問" description="何を読み取るか・困ったとき" />
          </ListGroup>

          <p className="px-4 text-[13px] leading-relaxed text-muted-foreground">
            解決しないときは support@unionfetch.com までご連絡ください。
          </p>
        </div>
      </PageBody>
    </>
  )
}
