import type { Assignment, SubmissionState } from "./types";
import { COURSE_COLORS } from "./types";

export interface WebClassRawTask {
  c: string; // courseName
  u: string; // courseUrl
  t: string; // title
  d: string; // deadline
  f: string; // completedDate (実施日)
  s: string; // score
  st: string; // status
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

export function transformWebClassTasks(tasks: WebClassRawTask[]): Assignment[] {
  const courseColors = new Map<string, string>();
  let idx = 0;

  return tasks.map((task) => {
    const courseId = "wc-" + simpleHash(task.c);
    if (!courseColors.has(courseId)) {
      courseColors.set(courseId, COURSE_COLORS[idx++ % COURSE_COLORS.length]);
    }
    const { state, isLate } = mapStatus(task.st, task.d);
    const score = parseInt(task.s, 10);

    return {
      id: "wc-" + simpleHash(task.c + task.t + task.d),
      courseId,
      courseName: task.c,
      courseColor: courseColors.get(courseId)!,
      title: task.t,
      dueDate: parseDeadline(task.d),
      link: task.u,
      submissionState: state,
      isLate,
      grade: isNaN(score) ? undefined : score,
      source: "webclass" as const,
    };
  });
}
