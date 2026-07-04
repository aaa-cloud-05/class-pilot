import type { Assignment, SubmissionState } from "./types";
import { COURSE_COLORS } from "./types";

export interface WebClassRawTask {
  c: string; // courseName
  u: string; // courseUrl
  t: string; // title
  d: string; // deadline
  st: string; // status
  // 実施日(f)・最高点(s)はペイロード削減とプライバシー配慮のため取得しない
}

// 取り込みの上限（DoS・DB肥大の防止）。実際のWebClassは数百件以下。
export const MAX_IMPORT_ITEMS = 1000;
const LIMITS = { courseName: 200, title: 500, link: 2000, short: 40 };

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** href に埋めても安全なURLか（javascript:/data: 等のXSSを弾く）。 */
export function isSafeHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u.trim());
}

/** ブックマークレット由来の生データ（非信頼）を型・長さ・件数で正規化する。 */
function sanitizeRawTasks(raw: unknown): WebClassRawTask[] {
  if (!Array.isArray(raw)) return [];
  const out: WebClassRawTask[] = [];
  for (const item of raw.slice(0, MAX_IMPORT_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const c = clampStr(r.c, LIMITS.courseName).trim();
    const t = clampStr(r.t, LIMITS.title).trim();
    if (!c || !t) continue; // 必須項目が無い行はスキップ
    out.push({
      c,
      t,
      u: clampStr(r.u, LIMITS.link),
      d: clampStr(r.d, LIMITS.short),
      st: clampStr(r.st, LIMITS.short),
    });
  }
  return out;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseDeadline(s: string): Date | null {
  if (!s || s.trim() === "-" || s.trim() === "") return null;
  const m = s.trim().match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

function mapStatus(status: string, deadline: string): { state: SubmissionState; isLate: boolean } {
  if (status === "回答済み" || status === "合格") {
    return { state: "submitted", isLate: false };
  }
  if (status === "不合格") {
    return { state: "returned", isLate: false };
  }
  const due = parseDeadline(deadline);
  const isLate = due ? due.getTime() < Date.now() : false;
  return { state: "not_submitted", isLate };
}

export function transformWebClassTasks(raw: unknown): Assignment[] {
  const tasks = sanitizeRawTasks(raw);
  const courseColors = new Map<string, string>();
  let idx = 0;

  return tasks.map((task) => {
    const courseId = "wc-" + simpleHash(task.c);
    if (!courseColors.has(courseId)) {
      courseColors.set(courseId, COURSE_COLORS[idx++ % COURSE_COLORS.length]);
    }
    const { state, isLate } = mapStatus(task.st, task.d);

    return {
      id: "wc-" + simpleHash(task.c + task.t + task.d),
      courseId,
      courseName: task.c,
      courseColor: courseColors.get(courseId)!,
      title: task.t,
      dueDate: parseDeadline(task.d),
      link: isSafeHttpUrl(task.u) ? task.u : "",
      submissionState: state,
      isLate,
      source: "webclass" as const,
    };
  });
}

const VALID_STATES: SubmissionState[] = ["not_submitted", "submitted", "late", "returned"];

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
      id: clampStr(a.id, 100) || "wc-" + simpleHash(courseName + title),
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
