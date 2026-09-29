"use client"

import { Eye, FileText, Mail, MessageSquare, RefreshCw, Shield } from "lucide-react"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { ListGroup, RowLink } from "@/components/app/ui"
import { FEEDBACK_FORM_URL, SUPPORT_EMAIL } from "@/lib/links"

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

          <ListGroup title="ご意見・お問い合わせ" footer="不具合やご意見はフォームから気軽にどうぞ。返事が必要なときはメールでも受け付けます。">
            <RowLink
              href={FEEDBACK_FORM_URL}
              external
              icon={MessageSquare}
              label="ご意見・不具合の報告"
              description="Google フォームが開きます"
            />
            <RowLink href={`mailto:${SUPPORT_EMAIL}`} icon={Mail} label="お問い合わせ" detail={SUPPORT_EMAIL} />
          </ListGroup>

          <ListGroup title="規約">
            <RowLink href="/privacy" icon={FileText} label="プライバシーポリシー" />
            <RowLink href="/terms" icon={FileText} label="利用規約" />
          </ListGroup>
        </div>
      </PageBody>
    </>
  )
}
