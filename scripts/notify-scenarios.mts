/**
 * 締切メールの動きをシナリオで確かめる。通知まわりを変えたら流す。
 *
 *   npm run test:notify            （食い違ったものだけ経過を出す）
 *   VERBOSE=1 npm run test:notify  （全部の経過を出す）
 *
 * 本物の `computePendingNotifications` と `planHistoryCleanup`（src/lib/server/notification-logic.ts）を使い、
 * DB（履歴）と Resend（予約・取り消し・配信）だけを手元で真似る。手順は `notifyUser`（notify.ts）をなぞる。
 * 各シナリオは「いつ・どの操作をしたら・どのメールがいつ届くか」を書き、届いたものと突き合わせる。
 *
 * Node 22.6 以降の型の読み飛ばし（--experimental-strip-types）で動かす。DB にも Resend にも触らない。
 */
import { register } from "node:module"
import type { NotificationHistoryRow } from "@/lib/server/notification-logic"

// src の「@/〜」を解決する（tsconfig の paths と同じ）。Next の外で src を読み込むために要る
const root = new URL("../", import.meta.url).href
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) return next(new URL("src/" + specifier.slice(2) + ".ts", ${JSON.stringify(root)}).href, context)
      return next(specifier, context)
    }`),
)
// パスを変数にして読み込む（型検査に .ts 付きの import を見せないため）。型は @/ から取る
const logicPath = "../src/lib/server/notification-logic.ts"
const remindersPath = "../src/lib/reminders.ts"
const { computePendingNotifications, planHistoryCleanup } = (await import(logicPath)) as typeof import("@/lib/server/notification-logic")
const { remindersOf } = (await import(remindersPath)) as typeof import("@/lib/reminders")

const H = 3600e3
const jst = (s: string) => new Date(s + "+09:00")
const fmt = (d: Date) =>
  d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })

type A = { id: string; courseId: string; courseName: string; title: string; dueDate: Date | null; link: string; submissionState: string }
type Row = NotificationHistoryRow & { assignmentId: string }

class World {
  now: Date
  assignments: A[] = []
  settings = { enabled: true, emailEnabled: true, reminderMinutes: [1440, 180] as number[], preset: "standard", mutedCourses: [] as string[], mutedAssignments: [] as string[] }
  hidden = new Set<string>()
  history: Row[] = []
  resend = new Map<string, { at: Date; status: "scheduled" | "sent" | "canceled"; subject: string }>()
  delivered: string[] = []
  log: string[] = []
  seq = 0
  constructor(start: string) {
    this.now = jst(start)
  }
  private advance(to: Date) {
    const due = [...this.resend.values()].filter((e) => e.status === "scheduled" && e.at <= to).sort((x, y) => +x.at - +y.at)
    for (const e of due) {
      e.status = "sent"
      this.delivered.push(`${fmt(e.at)} ${e.subject}`)
      this.log.push(`    📩 ${fmt(e.at)} 届く  ${e.subject}`)
    }
    this.now = to
  }
  private notify(fromCron: boolean) {
    const emailOn = this.settings.enabled && this.settings.emailEnabled
    const visible = this.assignments.filter((a) => !this.hidden.has(a.courseId))
    const reminderMinutes = remindersOf(this.settings)
    const { cancel, remove } = planHistoryCleanup(this.history, visible, {
      emailOn, reminderMinutes, mutedCourses: this.settings.mutedCourses, mutedAssignments: this.settings.mutedAssignments,
      now: this.now, cancelMarginMs: 60e3,
    })
    for (const r of cancel) {
      const e = this.resend.get(r.providerId!)
      if (e?.status === "scheduled") {
        e.status = "canceled"
        this.log.push(`    🚫 取り消し  ${e.subject}（${fmt(e.at)} の予定）`)
      }
    }
    const gone = new Set([...cancel, ...remove].map((r) => r.id))
    this.history = this.history.filter((h) => !gone.has(h.id))
    if (!emailOn) return
    const keys = new Set(this.history.map((h) => `${h.assignmentId}:${h.type}:email`))
    const pending = computePendingNotifications(visible, {
      reminderMinutes, mutedCourses: this.settings.mutedCourses, mutedAssignments: this.settings.mutedAssignments,
      alreadySentKeys: keys, now: this.now, horizonMs: 30 * H, channel: "email", canSchedule: true,
      catchUp: fromCron, graceMs: 30 * 60e3,
    })
    for (const p of pending) {
      if (this.history.some((h) => h.assignmentId === p.assignmentId && h.type === p.type)) continue
      const row: Row = { id: `h${++this.seq}`, assignmentId: p.assignmentId, type: p.type, providerId: null, scheduledAt: p.scheduledAt ?? null, dueAt: p.dueDate }
      this.history.push(row)
      if (!p.send) continue
      const id = `e${++this.seq}`
      const subject = `【あと${p.label}】${p.assignmentTitle}`
      if (p.scheduledAt) {
        this.resend.set(id, { at: p.scheduledAt, status: "scheduled", subject })
        row.providerId = id
        this.log.push(`    🗓 予約  ${fmt(p.scheduledAt)} ${subject}`)
      } else {
        this.resend.set(id, { at: this.now, status: "sent", subject })
        this.delivered.push(`${fmt(this.now)} ${subject}`)
        this.log.push(`    ⚡ 即時送信  ${fmt(this.now)} ${subject}`)
      }
    }
  }
  /** 毎朝の cron */
  cron(at: string) {
    this.advance(jst(at))
    this.log.push(`  ${fmt(this.now)} cron`)
    this.notify(true)
  }
  /** 利用者の操作（取り込み・同期・追加・編集・設定）の直後 */
  user(at: string, label: string, act: () => void = () => {}) {
    this.advance(jst(at))
    this.log.push(`  ${fmt(this.now)} ${label}`)
    act()
    this.notify(false)
  }
  add(id: string, due: string, state = "not_submitted", courseId = "c1") {
    this.assignments.push({ id, courseId, courseName: "情報理論", title: id, dueDate: jst(due), link: "", submissionState: state })
  }
  get(id: string) {
    return this.assignments.find((a) => a.id === id)!
  }
  crons(from: string, days: number) {
    const d0 = jst(from)
    for (let i = 0; i < days; i++) {
      const d = new Date(+d0 + i * 24 * H)
      const iso = d.toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace(" ", "T")
      this.cron(iso)
    }
  }
  end(at: string) {
    this.advance(jst(at))
  }
}

let fails = 0
function scenario(name: string, expected: string[], build: (w: World) => void, start = "2026-09-27T09:00:00") {
  const w = new World(start)
  build(w)
  const got = w.delivered.map((s) => s.replace(/】.*/, "】"))
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  if (!ok) fails++
  console.log(`${ok ? "✅" : "❌"} ${name}`)
  if (!ok || process.env.VERBOSE) {
    console.log(w.log.join("\n"))
    console.log(`    期待: ${JSON.stringify(expected)}\n    実際: ${JSON.stringify(got)}`)
  }
}

// ---- 追加・取り込みの直後にメールが来ないこと ----
scenario("追加した課題の締切が2時間後 → 直後にも翌朝にも来ない", [], (w) => {
  w.user("2026-10-01T14:00:00", "手で追加（締切 16:00）", () => w.add("A", "2026-10-01T16:00:00"))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T12:00:00")
})
scenario("締切3時間10分後に追加 → 3時間前は10分後だが送らない", [], (w) => {
  w.user("2026-10-01T14:00:00", "手で追加（締切 17:10）", () => w.add("A", "2026-10-01T17:10:00"))
  w.end("2026-10-01T18:00:00")
})
scenario("締切20時間後に追加 → 3時間前の1通だけ（翌7:00）", ["10/2 07:00 【あと3時間】"], (w) => {
  w.user("2026-10-01T14:00:00", "手で追加（締切 翌10:00）", () => w.add("A", "2026-10-02T10:00:00"))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T11:00:00")
})
scenario("初回の取り込みで締切間近が4件 → 直後は0通、あとは予定どおり",
  ["10/2 09:00 【あと3時間】", "10/2 23:59 【あと1日】", "10/3 20:59 【あと3時間】"], (w) => {
  w.user("2026-10-01T21:00:00", "WebClass を初めて取り込み", () => {
    w.add("今夜22時", "2026-10-01T22:00:00")
    w.add("今夜23時59分", "2026-10-01T23:59:00")
    w.add("明日12時", "2026-10-02T12:00:00")
    w.add("明後日23時59分", "2026-10-03T23:59:00")
  })
  w.crons("2026-10-02T06:30:00", 2)
  w.end("2026-10-04T12:00:00")
})

// ---- ふだんの流れ ----
scenario("夜が締切・毎朝の cron だけ → 前夜23:59と当日20:59", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 4)
  w.end("2026-10-02T12:00:00")
})
scenario("同期が何度走っても二重に届かない", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  for (const t of ["2026-09-30T20:00:00", "2026-09-30T23:30:00", "2026-10-01T06:10:00", "2026-10-01T20:40:00", "2026-10-01T21:10:00"]) w.user(t, "アプリを開く（同期）")
  w.crons("2026-09-28T06:30:00", 0)
  w.cron("2026-10-01T06:30:00")
  w.end("2026-10-02T12:00:00")
})
scenario("「不明」の課題も未提出として届く", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "手で追加（状態: 不明）", () => w.add("A", "2026-10-01T23:59:00", "unknown"))
  w.crons("2026-09-28T06:30:00", 4)
  w.end("2026-10-02T12:00:00")
})

// ---- 取り消し ----
const base = (w: World) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 4)
}
scenario("予約のあとで提出 → 3時間前は届かない", ["9/30 23:59 【あと1日】"], (w) => {
  base(w)
  w.user("2026-10-01T12:00:00", "提出済みにする", () => (w.get("A").submissionState = "submitted"))
  w.end("2026-10-02T12:00:00")
})
scenario("提出を誤タップしてすぐ戻す → 3時間前は予定どおり1通だけ", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  base(w)
  w.user("2026-10-01T12:00:00", "提出済みにする", () => (w.get("A").submissionState = "submitted"))
  w.user("2026-10-01T12:01:00", "未提出に戻す", () => (w.get("A").submissionState = "not_submitted"))
  w.end("2026-10-02T12:00:00")
})
scenario("1日前が届いたあと、締切が1週間延びる → 新しい締切の1日前・3時間前が届く",
  ["9/30 23:59 【あと1日】", "10/7 23:59 【あと1日】", "10/8 20:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 4)
  w.user("2026-10-01T10:00:00", "締切が 10/8 23:59 に延びた（取り込み）", () => (w.get("A").dueDate = jst("2026-10-08T23:59:00")))
  w.crons("2026-10-02T06:30:00", 7)
  w.end("2026-10-09T12:00:00")
})
scenario("締切が1時間だけ延びる → 1日前は二度来ない、3時間前は新しい時刻で", ["9/30 23:59 【あと1日】", "10/1 21:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 4)
  w.user("2026-10-01T10:00:00", "締切が 10/2 0:59 に延びた", () => (w.get("A").dueDate = jst("2026-10-02T00:59:00")))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T12:00:00")
})
scenario("締切が早まる（翌晩→今日18時）→ 古い予約を取り消し、15:00 に3時間前", ["10/1 15:00 【あと3時間】"], (w) => {
  w.user("2026-09-29T12:00:00", "取り込み", () => w.add("A", "2026-10-02T23:59:00"))
  w.crons("2026-09-30T06:30:00", 2)
  w.user("2026-10-01T12:00:00", "締切が 10/1 18:00 に早まった", () => (w.get("A").dueDate = jst("2026-10-01T18:00:00")))
  w.end("2026-10-02T12:00:00")
})
scenario("締切を消した（期限なしにした）→ 予約を取り消す", [], (w) => {
  w.user("2026-09-29T12:00:00", "手で追加", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-30T06:30:00", 1)
  w.user("2026-09-30T12:00:00", "締切を消す", () => (w.get("A").dueDate = null))
  w.end("2026-10-02T12:00:00")
})
scenario("通知を切ってから入れ直す → すぐには来ず、以降は予定どおり", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 3)
  w.user("2026-09-30T20:00:00", "通知を切る", () => (w.settings.enabled = false))
  w.user("2026-09-30T22:00:00", "通知を入れる", () => (w.settings.enabled = true))
  w.cron("2026-10-01T06:30:00")
  w.end("2026-10-02T12:00:00")
})
scenario("送信の14分前に通知を入れる → その1通は送らない（直後に来ない）", ["10/1 20:59 【あと3時間】"], (w) => {
  w.settings.emailEnabled = false
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 3)
  w.user("2026-09-30T23:45:00", "メール通知をオンにする", () => (w.settings.emailEnabled = true))
  w.cron("2026-10-01T06:30:00")
  w.end("2026-10-02T12:00:00")
})
scenario("タイミングを変える（1日前+3時間前 → 2日前+1時間前）→ 変えた直後は来ない", ["9/30 23:59 【あと1日】", "10/1 22:59 【あと1時間】"], (w) => {
  base(w)
  w.user("2026-10-01T07:00:00", "タイミングを 2日前・1時間前 に", () => (w.settings.reminderMinutes = [2880, 60]))
  w.end("2026-10-02T12:00:00")
})
scenario("コースを非表示 → 取り消し、戻す → 予約し直し", ["9/30 23:59 【あと1日】", "10/1 20:59 【あと3時間】"], (w) => {
  base(w)
  w.user("2026-10-01T12:00:00", "コースを非表示", () => w.hidden.add("c1"))
  w.user("2026-10-01T13:00:00", "コースを表示に戻す", () => w.hidden.delete("c1"))
  w.end("2026-10-02T12:00:00")
})
scenario("課題をミュート → 3時間前は届かない", ["9/30 23:59 【あと1日】"], (w) => {
  base(w)
  w.user("2026-10-01T12:00:00", "課題をミュート", () => w.settings.mutedAssignments.push("A"))
  w.end("2026-10-02T12:00:00")
})
scenario("課題を削除 → 3時間前は届かない", ["9/30 23:59 【あと1日】"], (w) => {
  base(w)
  w.user("2026-10-01T12:00:00", "課題を削除", () => (w.assignments = []))
  w.end("2026-10-02T12:00:00")
})

// ---- 救済（朝の cron だけ） ----
scenario("1日前だけの設定で、夜22時に翌昼締切を取り込み → 翌朝の cron で「あと6時間」", ["10/2 06:30 【あと6時間】"], (w) => {
  w.settings.reminderMinutes = [1440]
  w.user("2026-10-01T22:00:00", "取り込み（締切 翌12:00）", () => w.add("A", "2026-10-02T12:00:00"))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T13:00:00")
})
scenario("3日前+1時間前で、締切の2日半前に取り込み → 1時間前だけ", ["10/1 22:59 【あと1時間】"], (w) => {
  w.settings.reminderMinutes = [4320, 60]
  w.user("2026-09-29T11:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-30T06:30:00", 2)
  w.end("2026-10-02T12:00:00")
})

// ---- 初期設定（6時間前だけ。2026-09-30 から画面では1つだけ選ぶ） ----
scenario("初期設定 → 締切の6時間前に1通だけ", ["10/1 17:59 【あと6時間】"], (w) => {
  w.settings.reminderMinutes = []
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 4)
  w.end("2026-10-02T12:00:00")
})
scenario("初期設定で、夜22時に翌昼締切を取り込み → 翌6:00 に予約どおり", ["10/2 06:00 【あと6時間】"], (w) => {
  w.settings.reminderMinutes = []
  w.user("2026-10-01T22:00:00", "取り込み（締切 翌12:00）", () => w.add("A", "2026-10-02T12:00:00"))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T13:00:00")
})
scenario("初期設定で、締切4時間前に取り込み → 直後も翌朝も来ない", [], (w) => {
  w.settings.reminderMinutes = []
  w.user("2026-10-01T15:00:00", "取り込み（締切 19:00）", () => w.add("A", "2026-10-01T19:00:00"))
  w.crons("2026-10-02T06:30:00", 1)
  w.end("2026-10-02T12:00:00")
})
scenario("以前の設定（1日前+3時間前）から6時間前に選び直す → 予約済みを取り消して1通に", ["10/1 17:59 【あと6時間】"], (w) => {
  w.user("2026-09-27T12:00:00", "取り込み", () => w.add("A", "2026-10-01T23:59:00"))
  w.crons("2026-09-28T06:30:00", 3)
  w.user("2026-09-30T12:00:00", "6時間前を選ぶ", () => (w.settings.reminderMinutes = [360]))
  w.cron("2026-10-01T06:30:00")
  w.end("2026-10-02T12:00:00")
})

console.log(fails ? `\n${fails} 件が期待と違う` : "\nすべて期待どおり")
if (fails) process.exitCode = 1
