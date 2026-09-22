"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MobileHeader, PageBody } from "./shell"

/** ガイド記事の共通レイアウト（読みやすい文字サイズ・行間） */
export function Article({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <>
      <MobileHeader variant="back" title={title} backHref="/mock-v2/help" />
      <PageBody desktopBack={{ href: "/mock-v2/help", label: "はじめかたと使い方" }}>
        <header className="px-1 pb-6 pt-2 lg:pt-0">
          <h1 className="text-[26px] font-bold leading-snug tracking-[-0.02em] lg:text-[30px]">{title}</h1>
          {lead && <p className="mt-3 text-[16px] leading-[1.8] text-muted-foreground">{lead}</p>}
        </header>
        <div className="space-y-8">{children}</div>
      </PageBody>
    </>
  )
}

export function ArticleSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="px-1 pb-3 text-[19px] font-bold tracking-[-0.01em]">{title}</h2>
      {children}
    </section>
  )
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 px-1 text-[16px] leading-[1.8] text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
}

export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[15px] font-bold text-primary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5 text-[16px] leading-[1.75] text-foreground [&_strong]:font-semibold">{item}</div>
        </li>
      ))}
    </ol>
  )
}

export function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[16px] font-semibold outline-none hover:bg-muted focus-visible:bg-muted"
      >
        <span className="flex-1 py-3">{q}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="px-4 pb-4 text-[15px] leading-[1.8] text-muted-foreground animate-in fade-in-0 duration-200">{children}</div>}
    </div>
  )
}
