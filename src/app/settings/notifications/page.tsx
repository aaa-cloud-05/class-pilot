"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useApp } from "@/components/app/provider"
import { useEmailNotification } from "@/hooks/useEmailNotification"
import { MobileHeader, PageBody } from "@/components/app/shell"
import { Button, ListGroup, RowStatic, Switch } from "@/components/app/ui"
import { ReminderPicker } from "@/components/app/reminder-picker"

export default function MockNotificationSettingsPage() {
  const { loggedIn, assignments, courseById, toggleAssignmentMute } = useApp()
  const { data: session } = useSession()
  // 通知はメール一本（プッシュはアプリを開いたときしか出ず役に立たないので外した）。スイッチも1つ
  const { on, setOn } = useEmailNotification()

  const muted = assignments.filter((a) => a.muted)

  return (
    <>
      <MobileHeader variant="back" title="通知" backHref="/settings" />
      <PageBody desktopTitle="通知">
        <div className="space-y-7">
          <ListGroup footer="締切の前に、Google アカウントのメールアドレスへ届きます。WebClass の課題にも届きます。">
            <RowStatic
              label="締切をメールで知らせる"
              description={loggedIn ? session?.user?.email ?? "" : "ログインすると使えます"}
              right={
                <Switch label="締切をメールで知らせる" checked={on === true} disabled={!loggedIn || on == null} onChange={setOn} />
              }
            />
          </ListGroup>

          <ListGroup title="タイミング" className={cn(!on && "pointer-events-none opacity-50")}>
            <div className="p-4">
              <ReminderPicker disabled={!on} />
            </div>
          </ListGroup>

          <ListGroup
            title="ミュート中の課題"
            footer={
              <>
                コースごとにまとめて止めるときは{" "}
                <Link href="/settings/courses" className="font-semibold text-primary hover:underline">
                  コース
                </Link>{" "}
                から。
              </>
            }
          >
            {muted.length === 0 ? (
              <RowStatic label={<span className="text-muted-foreground">ミュート中の課題はありません</span>} />
            ) : (
              muted.map((a) => (
                <RowStatic
                  key={a.id}
                  label={a.title}
                  description={courseById(a.courseId)?.name}
                  right={
                    <Button variant="secondary" size="sm" onClick={() => toggleAssignmentMute(a.id)}>
                      解除
                    </Button>
                  }
                />
              ))
            )}
          </ListGroup>
        </div>
      </PageBody>
    </>
  )
}
