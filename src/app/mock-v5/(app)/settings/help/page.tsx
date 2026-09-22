"use client"

import { Eye, RefreshCw, Shield } from "lucide-react"
import { MobileHeader, PageBody } from "../../../_components/shell"
import { ListGroup, RowLink } from "../../../_components/ui"

export default function MockHelpIndexPage() {
  return (
    <>
      <MobileHeader variant="back" title="ヘルプ" backHref="/mock-v5/settings" />
      <PageBody desktopTitle="ヘルプ">
        <ListGroup footer="解決しないときは support@unionfetch.com までご連絡ください。">
          <RowLink
            href="/mock-v5/settings/help/screen"
            icon={Eye}
            label="画面の見かた"
            description="色と丸チェックの意味、グラフとリストの読み方"
          />
          <RowLink
            href="/mock-v5/settings/help/sync"
            icon={RefreshCw}
            label="同期のしくみ"
            description="いつ更新されるか、点の色、取り込める件数"
          />
          <RowLink
            href="/mock-v5/settings/help/safety"
            icon={Shield}
            label="安全性とよくある質問"
            description="何を読み取っているか、困ったときの対処"
          />
        </ListGroup>
      </PageBody>
    </>
  )
}
