/**
 * 保存しているデータ（`Assignment`）と、画面が使う形（`ViewAssignment`）の橋渡し。
 *
 * 画面側は「通知をミュートしているか」「コースを隠しているか」まで含めた1つの形で扱いたいが、
 * その情報は `notification-store` 側にあるので、ここで合成する。
 * 画面のコンポーネントは `Assignment` を直接受け取らず、必ずこの形を受け取る。
 *
 * 色の意味は `src/lib/status.ts`、経緯は `docs/ui-v5-migration.md` §3。
 */

import type { Assignment, SubmissionState } from "@/lib/types";
import { COURSE_COLORS } from "@/lib/types";
import { isSafeHttpUrl } from "@/lib/webclass";

export type AssignmentSource = "classroom" | "webclass" | "manual";

export interface ViewAssignment {
  id: string;
  courseId: string;
  courseName: string;
  courseColor: string;
  title: string;
  dueDate: Date | null;
  submissionState: SubmissionState;
  /** 締切を過ぎてから提出した。リストで「提出済み（遅れ）」と出す */
  isLate: boolean;
  source: AssignmentSource;
  /** 安全な http(s) のときだけ入る。開くボタンの有無に使う */
  link: string | null;
  /** この課題だけ通知を止めているか */
  muted: boolean;
}

export interface ViewCourse {
  id: string;
  name: string;
  color: string;
  source: AssignmentSource;
  /** 非表示のコースは課題を取り込まず、通知も届かない */
  hidden: boolean;
  muted: boolean;
}

interface MuteState {
  mutedAssignments: string[];
}

interface CourseState {
  hiddenCourses: string[];
  mutedCourses: string[];
}

export function toViewAssignment(a: Assignment, muted: boolean): ViewAssignment {
  return {
    id: a.id,
    courseId: a.courseId,
    courseName: a.courseName,
    courseColor: a.courseColor,
    title: a.title,
    dueDate: a.dueDate,
    submissionState: a.submissionState,
    isLate: a.isLate,
    source: a.source ?? "manual",
    link: a.link && isSafeHttpUrl(a.link) ? a.link : null,
    muted,
  };
}

export function toViewAssignments(assignments: Assignment[], settings: MuteState): ViewAssignment[] {
  const muted = new Set(settings.mutedAssignments);
  return assignments.map((a) => toViewAssignment(a, muted.has(a.id)));
}

/**
 * コースの一覧は課題から組み立てる（サーバ側の getUserCourses と同じ考え方）。
 * 名前と色は課題が持っているので、別途取りに行かなくてよい。
 */
export function toViewCourses(assignments: Assignment[], settings: CourseState): ViewCourse[] {
  const hidden = new Set(settings.hiddenCourses);
  const muted = new Set(settings.mutedCourses);
  const byId = new Map<string, ViewCourse>();

  for (const a of assignments) {
    if (byId.has(a.courseId)) continue;
    byId.set(a.courseId, {
      id: a.courseId,
      name: a.courseName,
      color: a.courseColor || colorForCourseName(a.courseName),
      source: a.source ?? "manual",
      hidden: hidden.has(a.courseId),
      muted: muted.has(a.courseId),
    });
  }

  return [...byId.values()].sort((x, y) => x.name.localeCompare(y.name, "ja"));
}

/**
 * 手で追加したコースの色を名前から決める（決定 F：色を選ばせない）。
 * 同じ名前なら必ず同じ色になる。
 */
export function colorForCourseName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}
