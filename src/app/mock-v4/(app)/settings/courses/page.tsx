"use client"

import { useState } from "react"
import { useMock } from "../../../_components/provider"
import { Content, TopBar } from "../../../_components/shell"
import { Badge, RowGroup, SectionTitle, SettingButton, SettingRow, Sheet, Switch } from "../../../_components/ui"

const SOURCE = { classroom: "Classroom", webclass: "WebClass", manual: "自分で追加" } as const

export default function CoursesPage() {
  const { courses, setCourse, assignments } = useMock()
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = courses.find((c) => c.id === openId) ?? null
  const count = (id: string) => assignments.filter((a) => a.courseId === id).length

  const shown = courses.filter((c) => !c.hidden)
  const hidden = courses.filter((c) => c.hidden)

  return (
    <>
      <TopBar title="コース" back="/mock-v4/settings" />
      <Content className="lg:max-w-xl">
        <div className="space-y-6">
          <div>
            <SectionTitle>表示中</SectionTitle>
            <RowGroup>
              {shown.map((c) => (
                <SettingButton
                  key={c.id}
                  label={c.name}
                  description={`${SOURCE[c.source]}・${count(c.id)}件`}
                  detail={c.muted ? <Badge tone="outline">通知オフ</Badge> : null}
                  onClick={() => setOpenId(c.id)}
                />
              ))}
            </RowGroup>
          </div>

          {hidden.length > 0 && (
            <div>
              <SectionTitle>非表示</SectionTitle>
              <RowGroup>
                {hidden.map((c) => (
                  <SettingButton
                    key={c.id}
                    label={<span className="text-muted-foreground">{c.name}</span>}
                    description={SOURCE[c.source]}
                    onClick={() => setOpenId(c.id)}
                  />
                ))}
              </RowGroup>
              <p className="mt-2 px-1 text-[12px] text-muted-foreground">非表示のコースは取り込まず、通知もしません。</p>
            </div>
          )}
        </div>
      </Content>

      <Sheet open={opened != null} onClose={() => setOpenId(null)} title={opened?.name ?? ""}>
        {opened && (
          <RowGroup>
            <SettingRow
              label="締切の通知"
              right={
                <Switch
                  label="締切の通知"
                  checked={!opened.muted && !opened.hidden}
                  disabled={opened.hidden}
                  onChange={(v) => setCourse(opened.id, { muted: !v })}
                />
              }
            />
            {opened.source === "classroom" && (
              <SettingRow
                label="一覧に表示"
                description="オフにすると取り込みません"
                right={
                  <Switch
                    label="一覧に表示"
                    checked={!opened.hidden}
                    onChange={(v) => setCourse(opened.id, { hidden: !v })}
                  />
                }
              />
            )}
          </RowGroup>
        )}
      </Sheet>
    </>
  )
}
