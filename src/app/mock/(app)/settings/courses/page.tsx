"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { SOURCE_ICON } from "../../../_components/assignment"
import { useMock } from "../../../_components/provider"
import { MobileHeader, PageBody } from "../../../_components/shell"
import { Card, ListGroup, RowStatic, Sheet, Switch } from "../../../_components/ui"
import type { MockCourse } from "../../../_lib/data"
import { SOURCE_LABEL } from "../../../_lib/format"

function CourseRow({ c, count, onOpen }: { c: MockCourse; count: number; onOpen: () => void }) {
  const Icon = SOURCE_ICON[c.source]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
      <span className="min-w-0 flex-1 py-3">
        <span className={cn("block truncate text-[16px]", c.hidden ? "text-ink-3" : "text-ink")}>{c.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {SOURCE_LABEL[c.source]}・課題 {count} 件
        </span>
      </span>
      <span className="shrink-0 text-[14px] text-ink-3">{c.hidden ? "非表示" : c.muted ? "通知オフ" : "通知オン"}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-3/70" aria-hidden />
    </button>
  )
}

export default function MockCoursesPage() {
  const { courses, setCourse, assignments, controls } = useMock()
  const [openId, setOpenId] = useState<string | null>(null)
  const opened = courses.find((c) => c.id === openId) ?? null
  const countOf = (id: string) => assignments.filter((a) => a.courseId === id).length

  const shown = courses.filter((c) => !c.hidden)
  const hidden = courses.filter((c) => c.hidden)

  return (
    <>
      <MobileHeader variant="back" title="コース" backHref="/mock/settings" />
      <PageBody desktopTitle="コース">
        <p className="mb-6 px-1 text-[15px] leading-relaxed text-ink-2">
          コースごとに、通知を止めたり、Classroom のコースを一覧から隠したりできます。
        </p>
        {controls.data === "empty" ? (
          <Card className="px-4 py-6 text-center text-[15px] text-ink-3">コースはまだありません</Card>
        ) : (
          <div className="space-y-7">
            <ListGroup title={`表示中のコース（${shown.length}）`}>
              {shown.map((c) => (
                <CourseRow key={c.id} c={c} count={countOf(c.id)} onOpen={() => setOpenId(c.id)} />
              ))}
            </ListGroup>
            {hidden.length > 0 && (
              <ListGroup title={`非表示のコース（${hidden.length}）`} footer="非表示のコースの課題は取り込まれず、通知も届きません。">
                {hidden.map((c) => (
                  <CourseRow key={c.id} c={c} count={0} onOpen={() => setOpenId(c.id)} />
                ))}
              </ListGroup>
            )}
          </div>
        )}
      </PageBody>

      <Sheet open={opened != null} onClose={() => setOpenId(null)} title={opened?.name ?? "コース"}>
        {opened && (
          <div className="space-y-4 pt-2">
            <ListGroup>
              <RowStatic
                label="締切の通知"
                description={opened.hidden ? "非表示のコースは通知されません" : "このコースの課題を通知します"}
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
                <RowStatic
                  label="ホームとカレンダーに表示"
                  description="オフにすると、このコースの課題を取り込みません"
                  right={
                    <Switch
                      label="ホームとカレンダーに表示"
                      checked={!opened.hidden}
                      onChange={(v) => setCourse(opened.id, { hidden: !v })}
                    />
                  }
                />
              )}
            </ListGroup>
            {opened.source !== "classroom" && (
              <p className="px-1 text-[13px] leading-relaxed text-ink-3">
                一覧から隠せるのは Classroom のコースだけです。WebClass と自分で追加したコースは、課題ごとに削除できます。
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}
