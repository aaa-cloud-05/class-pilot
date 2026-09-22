// モック用のダミーデータ。日時は「いま」からの相対で作るので、いつ開いても自然に見える。

export type Source = "classroom" | "webclass" | "manual"
export type Status = "not_submitted" | "submitted" | "unknown"

export interface MockCourse {
  id: string
  name: string
  color: string
  source: Source
  hidden: boolean
  muted: boolean
}

export interface MockAssignment {
  id: string
  courseId: string
  title: string
  due: Date | null
  status: Status
  source: Source
  muted: boolean
  link: string | null
}

export interface MockNotification {
  id: string
  title: string
  body: string
  at: Date
  read: boolean
  kind: "deadline" | "overdue" | "import"
}

export const COURSE_COLORS = ["#4f5bd5", "#0f9d8a", "#e8772e", "#d6409f", "#0090ff", "#8e4ec6", "#5f9e2f", "#a06a3b"]

export const SEED_COURSES: MockCourse[] = [
  { id: "c1", name: "情報理論", color: "#4f5bd5", source: "classroom", hidden: false, muted: false },
  { id: "c2", name: "線形代数学 II", color: "#0f9d8a", source: "webclass", hidden: false, muted: false },
  { id: "c3", name: "プログラミング演習", color: "#e8772e", source: "classroom", hidden: false, muted: false },
  { id: "c4", name: "英語コミュニケーション", color: "#d6409f", source: "webclass", hidden: false, muted: false },
  { id: "c5", name: "データベース論", color: "#0090ff", source: "webclass", hidden: false, muted: true },
  { id: "c6", name: "電気回路", color: "#8e4ec6", source: "classroom", hidden: false, muted: false },
  { id: "c7", name: "キャリアデザイン", color: "#5f9e2f", source: "webclass", hidden: false, muted: false },
  { id: "c8", name: "TOEIC 対策", color: "#a06a3b", source: "manual", hidden: false, muted: false },
  { id: "c9", name: "体育実技", color: "#636a77", source: "classroom", hidden: true, muted: true },
]

type Seed = {
  courseId: string
  title: string
  /** 「いま」からの時間（時間単位）。null は期限なし */
  inHours: number | null
  /** inHours の代わりに「N日後の H 時 M 分」で置く。課題が重なる日を作るのに使う */
  inDays?: number
  atHour?: number
  atMinute?: number
  status: Status
  muted?: boolean
}

const SEEDS: Seed[] = [
  { courseId: "c2", title: "演習問題 5（固有値と固有ベクトル）", inHours: -20, status: "not_submitted" },
  { courseId: "c4", title: "Unit 4 Vocabulary Quiz", inHours: -70, status: "unknown" },
  { courseId: "c1", title: "第4回 小テスト（エントロピー）", inHours: 2.5, status: "not_submitted" },
  { courseId: "c3", title: "課題7 連結リストの実装", inHours: 6, status: "not_submitted" },
  { courseId: "c5", title: "ER 図の作成レポート", inHours: 22, status: "not_submitted", muted: true },
  { courseId: "c6", title: "第6回 演習プリント", inHours: 30, status: "submitted" },
  { courseId: "c4", title: "Unit 5 Speaking Log", inHours: 50, status: "not_submitted" },
  { courseId: "c7", title: "業界研究シート", inHours: 75, status: "not_submitted" },
  { courseId: "c8", title: "公式問題集 Part 5 を1周", inHours: 98, status: "not_submitted" },
  { courseId: "c5", title: "SQL 小課題 3", inHours: 124, status: "submitted" },
  { courseId: "c1", title: "期末レポートのテーマ提出", inHours: 190, status: "not_submitted" },
  { courseId: "c3", title: "課題8 二分探索木", inHours: 260, status: "not_submitted" },
  { courseId: "c2", title: "中間レポート", inHours: 420, status: "not_submitted" },
  { courseId: "c6", title: "中間試験の振り返りシート", inHours: null, status: "not_submitted" },
  { courseId: "c7", title: "自己分析ワークシート", inHours: null, status: "unknown" },
  { courseId: "c2", title: "演習問題 4（行列式）", inHours: -50, status: "submitted" },
  { courseId: "c3", title: "課題6 スタックとキュー", inHours: -130, status: "submitted" },
  { courseId: "c1", title: "第3回 小テスト（情報量）", inHours: -150, status: "submitted" },

  // 3日後は課題が重なる日。1日に6件あるときの見え方を確かめるために入れてある
  { courseId: "c1", title: "第5回 小テスト（符号化）", inHours: null, inDays: 3, atHour: 9, status: "not_submitted" },
  { courseId: "c3", title: "課題9 ソートの計算量レポート", inHours: null, inDays: 3, atHour: 10, atMinute: 30, status: "not_submitted" },
  { courseId: "c5", title: "正規化の演習", inHours: null, inDays: 3, atHour: 13, status: "unknown" },
  { courseId: "c6", title: "第7回 演習プリント", inHours: null, inDays: 3, atHour: 16, atMinute: 30, status: "submitted" },
  { courseId: "c2", title: "演習問題 6（固有空間）", inHours: null, inDays: 3, atHour: 18, status: "not_submitted" },
  { courseId: "c4", title: "Unit 6 Reading Log", inHours: null, inDays: 3, atHour: 23, atMinute: 59, status: "not_submitted" },
]

/** 締切は分を切りのよい値にそろえる（23:59 や 13:00 に見えるように） */
function roundDue(base: Date, inHours: number): Date {
  const d = new Date(base.getTime() + inHours * 3600_000)
  const m = d.getMinutes()
  if (m < 15) d.setMinutes(0, 0, 0)
  else if (m < 45) d.setMinutes(30, 0, 0)
  else d.setMinutes(59, 0, 0)
  return d
}

/** 「N日後の H 時 M 分」。日をまたいで課題が重なる日を作るのに使う */
function dayAt(now: Date, inDays: number, hour: number, minute: number): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + inDays)
  d.setHours(hour, minute, 0, 0)
  return d
}

export function buildAssignments(now: Date, courses: MockCourse[]): MockAssignment[] {
  const byId = new Map(courses.map((c) => [c.id, c]))
  return SEEDS.map((s, i) => {
    const course = byId.get(s.courseId)!
    return {
      id: `a${i + 1}`,
      courseId: s.courseId,
      title: s.title,
      due: s.inDays != null ? dayAt(now, s.inDays, s.atHour ?? 23, s.atMinute ?? 0) : s.inHours == null ? null : roundDue(now, s.inHours),
      status: s.status,
      source: course.source,
      muted: s.muted ?? false,
      link: course.source === "manual" ? null : "https://example.com/",
    }
  })
}

export function buildNotifications(now: Date): MockNotification[] {
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000)
  return [
    {
      id: "n1",
      kind: "deadline",
      title: "あと3時間で締切",
      body: "情報理論「第4回 小テスト（エントロピー）」",
      at: ago(0.4),
      read: false,
    },
    {
      id: "n2",
      kind: "deadline",
      title: "明日が締切",
      body: "プログラミング演習「課題7 連結リストの実装」",
      at: ago(5),
      read: false,
    },
    {
      id: "n3",
      kind: "import",
      title: "WebClass から 12 件を取り込みました",
      body: "新しい課題が 2 件あります",
      at: ago(26),
      read: true,
    },
    {
      id: "n4",
      kind: "overdue",
      title: "締切を過ぎました",
      body: "線形代数学 II「演習問題 5（固有値と固有ベクトル）」",
      at: ago(20),
      read: true,
    },
    {
      id: "n5",
      kind: "deadline",
      title: "あと24時間で締切",
      body: "電気回路「第6回 演習プリント」",
      at: ago(52),
      read: true,
    },
  ]
}
