import type { Assignment, SubmissionState } from "./types";
import { COURSE_COLORS } from "./types";

/**
 * ブックマークレットが WebClass の内部 JSON API から組み立てて渡してくる形。
 * 仕様と調査経緯は docs/webclass-api.md を参照。
 *
 * 旧実装は課題実施状況一覧の DOM を読んでいたが、WebClass の CSS 更新で無言で壊れるため
 * API 方式へ移行した。
 *
 * フィールド名が1文字で、コースを `cs` に正規化して課題側から添字で参照しているのは、
 * このペイロードを URL ハッシュ（`/import#<JSON>`）に載せるため。コース名は日本語で
 * encodeURIComponent すると1文字9バイトになるので、課題ごとに繰り返すとURLが肥大する。
 */
export interface WebClassPayload {
  /** ペイロード形式のバージョン。旧ブックマークレットを検出して再作成を促すために使う。 */
  v: 2;
  /** WebClass の絶対ベースURL（例: https://example.ac.jp/webclass/）。課題リンクの生成に使う。 */
  b: string;
  /** コース一覧。課題の `k` がこの配列の添字を指す。 */
  cs: WebClassRawCourse[];
  t: WebClassRawTask[];
}

export interface WebClassRawCourse {
  g: string; // group_id
  c: string; // コース名
}

export interface WebClassRawTask {
  k: number; // cs の添字
  i: string; // contents_id（安定した課題ID）
  n: string; // 課題名
  d: string | null; // end_date "YYYY-MM-DD HH:MM:SS"（締切なしは null）
  s: 0 | 1; // 1 = 提出済み（scores に自分の answer_datetime がある）
}

// 取り込みの上限（DoS・DB肥大の防止）。実際のWebClassは数百件以下。
export const MAX_IMPORT_ITEMS = 1000;
const MAX_COURSES = 200;
const LIMITS = { courseName: 200, title: 500, link: 2000, id: 100 };

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** href に埋めても安全なURLか（javascript:/data: 等のXSSを弾く）。 */
export function isSafeHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u.trim());
}

/**
 * WebClass の日時文字列 "YYYY-MM-DD HH:MM:SS" を Date にする。
 * タイムゾーン表記が無くサーバのローカル時刻（JST）なので、`new Date(文字列)` の
 * 解釈に任せず、各要素を実行環境のローカル時刻として組み立てる。
 */
function parseWebClassDate(s: string | null | undefined): Date | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  return isNaN(d.getTime()) ? null : d;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** 課題ページへの直リンク。WebClass の SPA が生成しているものと同じ形。 */
function buildTaskLink(base: string, groupId: string, contentsId: string): string {
  if (!isSafeHttpUrl(base) || !groupId || !contentsId) return "";
  const b = base.endsWith("/") ? base : base + "/";
  return `${b}course.php/${encodeURIComponent(groupId)}/contents/${encodeURIComponent(contentsId)}/`;
}

/**
 * ブックマークレットのペイロード（非信頼）をアプリの Assignment に変換する。
 * 型・長さ・件数をここで作り直すので、壊れた行は落ちるだけで例外にはしない。
 *
 * 旧実装との違い:
 * - `id` が contents_id 由来になり、締切や課題名が変わっても変化しない
 *   （通知履歴の重複防止キーが安定する）
 * - `courseId` が group_id 由来になり、コース名の改名で別コース扱いにならない
 * - 提出状態を API の事実から決めるため、WebClass 由来で "unknown" が発生しない
 * - コースのトップではなく課題ページに直接リンクできる
 */
export function transformWebClassPayload(payload: unknown): Assignment[] {
  // 非信頼入力なので、宣言済みの型ではなく unknown として受けて自分で作り直す
  const p = (payload ?? {}) as { b?: unknown; cs?: unknown; t?: unknown };
  const base = clampStr(p.b, LIMITS.link);

  const courses = (Array.isArray(p.cs) ? p.cs : [])
    .slice(0, MAX_COURSES)
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return { g: clampStr(o.g, LIMITS.id), c: clampStr(o.c, LIMITS.courseName).trim() };
    });

  const courseColors = new Map<string, string>();
  const now = Date.now();
  const out: Assignment[] = [];
  let colorIdx = 0;

  for (const item of (Array.isArray(p.t) ? p.t : []).slice(0, MAX_IMPORT_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const course = courses[typeof r.k === "number" ? r.k : -1];
    if (!course || !course.c) continue;

    const contentsId = clampStr(r.i, LIMITS.id).trim();
    const title = clampStr(r.n, LIMITS.title).trim();
    if (!contentsId || !title) continue;

    // group_id が欠けた場合だけコース名から作る（表示が壊れないための保険）
    const courseId = "wc-" + (course.g || simpleHash(course.c));
    if (!courseColors.has(courseId)) {
      courseColors.set(courseId, COURSE_COLORS[colorIdx++ % COURSE_COLORS.length]);
    }

    const dueDate = parseWebClassDate(typeof r.d === "string" ? r.d : null);
    const submitted = r.s === 1;

    out.push({
      id: "wc-" + contentsId,
      courseId,
      courseName: course.c,
      courseColor: courseColors.get(courseId)!,
      title,
      dueDate,
      link: buildTaskLink(base, course.g, contentsId),
      submissionState: submitted ? "submitted" : "not_submitted",
      isLate: !submitted && dueDate !== null && dueDate.getTime() < now,
      source: "webclass",
    });
  }

  return out;
}

const VALID_STATES: SubmissionState[] = ["not_submitted", "submitted", "unknown"];

/**
 * サーバが受け取る「変換済み課題配列」を再検証する（クライアントを信頼しない境界）。
 * 各フィールドを長さ・型・許可値で作り直し、危険なlinkは空にする。不正な行はスキップ。
 */
export function sanitizeImportedAssignments(raw: unknown): Assignment[] {
  if (!Array.isArray(raw)) return [];
  const out: Assignment[] = [];
  for (const item of raw.slice(0, MAX_IMPORT_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;

    const courseName = clampStr(a.courseName, LIMITS.courseName).trim();
    const title = clampStr(a.title, LIMITS.title).trim();
    if (!courseName || !title) continue;

    let dueDate: Date | null = null;
    if (typeof a.dueDate === "string" || a.dueDate instanceof Date) {
      const d = new Date(a.dueDate as string);
      if (!isNaN(d.getTime())) dueDate = d;
    }

    const link = clampStr(a.link, LIMITS.link);
    const color = clampStr(a.courseColor, 20);

    out.push({
      id: clampStr(a.id, LIMITS.id) || "wc-" + simpleHash(courseName + title),
      courseId: clampStr(a.courseId, 200) || "wc-" + simpleHash(courseName),
      courseName,
      courseColor: /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : COURSE_COLORS[0],
      title,
      dueDate,
      link: isSafeHttpUrl(link) ? link : "",
      submissionState: VALID_STATES.includes(a.submissionState as SubmissionState)
        ? (a.submissionState as SubmissionState)
        : "not_submitted",
      isLate: a.isLate === true,
      source: "webclass",
    });
  }
  return out;
}
