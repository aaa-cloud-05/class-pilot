import type {
  RawCourse,
  RawCourseWork,
  RawStudentSubmission,
  Course,
  Assignment,
  SubmissionState,
} from "./types";
import { COURSE_COLORS } from "./types";

const colorMap = new Map<string, string>();

function getCourseColor(courseId: string): string {
  if (!colorMap.has(courseId)) {
    colorMap.set(courseId, COURSE_COLORS[colorMap.size % COURSE_COLORS.length]);
  }
  return colorMap.get(courseId)!;
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
  if (sub.state === "RETURNED") {
    return { state: "returned", isLate: sub.late };
  }
  if (sub.state === "TURNED_IN") {
    return { state: sub.late ? "late" : "submitted", isLate: sub.late };
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
