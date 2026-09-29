"use client"

import { Eye, FileText, Mail, RefreshCw, Shield } from "lucide-react"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { ListGroup, RowLink } from "@/components/app/ui"

export default function MockHelpIndexPage() {
  return (
    <>
      <MobileHeader variant="back" title="ヘルプ" backHref="/settings" />
      <PageBody desktopTitle="ヘルプ">
        <div className="space-y-7">
          <ListGroup>
            <RowLink
              href="/settings/help/screen"
              icon={Eye}
              label="画面の見かた"
              description="色と丸チェックの意味、グラフとリストの読み方"
            />
            <RowLink
              href="/settings/help/sync"
              icon={RefreshCw}
              label="同期のしくみ"
              description="いつ更新されるか、点の色、取り込める件数"
            />
            <RowLink
              href="/settings/help/safety"
              icon={Shield}
              label="安全性とよくある質問"
              description="Classroom・WebClass からの読み取り方、WebClass への負荷、困ったときの対処"
            />
          </ListGroup>

          <ListGroup title="規約とお問い合わせ" footer="解決しないときは、お問い合わせからご連絡ください。">
            <RowLink href="/privacy" icon={FileText} label="プライバシーポリシー" />
            <RowLink href="/terms" icon={FileText} label="利用規約" />
            <RowLink href="mailto:support@unionfetch.com" icon={Mail} label="お問い合わせ" detail="support@unionfetch.com" />
          </ListGroup>
        </div>
      </PageBody>
    </>
  )
}
