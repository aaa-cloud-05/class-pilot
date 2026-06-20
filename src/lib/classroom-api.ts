import type {
  RawCourse,
  RawCourseWork,
  RawStudentSubmission,
} from "./types";

const BASE = "https://classroom.googleapis.com/v1";

async function apiFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

export async function fetchCourses(accessToken: string): Promise<RawCourse[]> {
  const resp = await apiFetch<{ courses?: RawCourse[] }>(
    "courses?courseStates=ACTIVE&studentId=me&pageSize=30",
    accessToken
  );
  return resp.courses ?? [];
}

export async function fetchCourseWork(courseId: string, accessToken: string): Promise<RawCourseWork[]> {
  const resp = await apiFetch<{ courseWork?: RawCourseWork[] }>(
    `courses/${courseId}/courseWork?pageSize=100`,
    accessToken
  );
  return resp.courseWork ?? [];
}

export async function fetchSubmissions(
  courseId: string,
  accessToken: string
): Promise<RawStudentSubmission[]> {
  const resp = await apiFetch<{ studentSubmissions?: RawStudentSubmission[] }>(
    `courses/${courseId}/courseWork/-/studentSubmissions?userId=me&pageSize=100`,
    accessToken
  );
  return resp.studentSubmissions ?? [];
}

export async function fetchAllData(accessToken: string) {
  const courses = await fetchCourses(accessToken);

  const allWork: { course: RawCourse; work: RawCourseWork; submission?: RawStudentSubmission }[] = [];

  for (const course of courses) {
    const works = await fetchCourseWork(course.id, accessToken);

    let submissionMap = new Map<string, RawStudentSubmission>();
    try {
      const subs = await fetchSubmissions(course.id, accessToken);
      for (const s of subs) {
        submissionMap.set(s.courseWorkId, s);
      }
    } catch {
      // submission fetch may fail if scope not granted yet
    }

    for (const work of works) {
      allWork.push({ course, work, submission: submissionMap.get(work.id) });
    }
  }

  return { courses, allWork };
}
