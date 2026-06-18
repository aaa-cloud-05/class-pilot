// Google Classroom API raw response types

export interface RawCourse {
  id: string;
  name: string;
  section?: string;
  courseState: string;
  alternateLink: string;
}

export interface RawDueDate {
  year: number;
  month: number;
  day: number;
}

export interface RawTimeOfDay {
  hours?: number;
  minutes?: number;
}

export interface RawCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: RawDueDate;
  dueTime?: RawTimeOfDay;
  alternateLink: string;
  workType: string;
  state: string;
  maxPoints?: number;
  creationTime: string;
  updateTime: string;
}

export interface RawStudentSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  state: "NEW" | "CREATED" | "TURNED_IN" | "RETURNED" | "RECLAIMED_BY_STUDENT";
  late: boolean;
  assignedGrade?: number;
  alternateLink: string;
  updateTime: string;
}

// App-level models

export interface Course {
  id: string;
  name: string;
  section?: string;
  color: string;
  link: string;
}

export type SubmissionState = "not_submitted" | "submitted" | "returned" | "late";

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  courseColor: string;
  title: string;
  description?: string;
  dueDate: Date | null;
  link: string;
  submissionState: SubmissionState;
  isLate: boolean;
  grade?: number;
  maxPoints?: number;
}

export const COURSE_COLORS = [
  "#007AFF", // blue
  "#5856D6", // indigo
  "#FF9500", // orange
  "#34C759", // green
  "#FF2D55", // pink
  "#AF52DE", // purple
  "#FF3B30", // red
  "#5AC8FA", // teal
];
