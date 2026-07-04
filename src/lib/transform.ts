import type {
  RawCourse,
  RawCourseWork,
  RawStudentSubmission,
  Course,
  Assignment,
  SubmissionState,
} from "./types";
import { COURSE_COLORS } from "./types";

// courseId から決定的に色を割り当てる。
// 以前は「初回登場順」で採番し module 変数に保持していたため、サーバレスの
// コールドスタートやコース取得順の揺れで同じコースの色が変わり、再同期で
// courseColor が毎回差分になり全件UPDATEを誘発していた(docs/classroom-sync-flow.md §4)。
function getCourseColor(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) | 0;
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

export function transformCourse(raw: RawCourse): Course {
  return {
    id: raw.id,
    name: raw.name,
    section: raw.section,
    color: getCourseColor(raw.id),
    link: raw.alternateLink,
  };
}

function parseDueDate(work: RawCourseWork): Date | null {
  if (!work.dueDate) return null;
  const { year, month, day } = work.dueDate;
  if (!work.dueTime) {
    return new Date(Date.UTC(year, month - 1, day, 23, 59));
  }
  return new Date(Date.UTC(year, month - 1, day, work.dueTime.hours ?? 0, work.dueTime.minutes ?? 0));
}

function deriveSubmissionState(sub?: RawStudentSubmission): { state: SubmissionState; isLate: boolean } {
  if (!sub || sub.state === "NEW" || sub.state === "CREATED") {
    return { state: "not_submitted", isLate: false };
  }
  // Google は late=false のとき late を省略する→ sub.late が undefined になり、
  // isLate=undefined は保存されず(Prismaがundefinedを無視)、再同期で毎回差分になる。
  // 必ず boolean に正規化する(docs/classroom-sync-flow.md §4)。
  if (sub.state === "RETURNED") {
    return { state: "returned", isLate: sub.late ?? false };
  }
  if (sub.state === "TURNED_IN") {
    return { state: sub.late ? "late" : "submitted", isLate: sub.late ?? false };
  }
  return { state: "not_submitted", isLate: false };
}

export function transformAssignment(
  course: RawCourse,
  work: RawCourseWork,
  submission?: RawStudentSubmission
): Assignment {
  const { state, isLate } = deriveSubmissionState(submission);
  return {
    id: work.id,
    courseId: work.courseId,
    courseName: course.name,
    courseColor: getCourseColor(course.id),
    title: work.title,
    description: work.description,
    dueDate: parseDueDate(work),
    link: work.alternateLink,
    submissionState: state,
    isLate,
    grade: submission?.assignedGrade,
    maxPoints: work.maxPoints,
  };
}
