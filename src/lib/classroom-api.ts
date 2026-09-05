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
    // どのエンドポイントで落ちたか分かるよう path を含める（診断用）。
    throw new Error(`API ${res.status} (${path}): ${body}`);
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

/**
 * 同時に取得するコース数。
 *
 * 以前は全コースを直列に回していたため、1+2N 回の往復をすべて待っていた
 * （18コースで37回＝実測で数秒〜十数秒）。呼び出し回数は変わらない＝Google の
 * クォータ消費は同じで、待ち時間だけが縮む。5 に抑えているのは、瞬間的に
 * 叩きすぎてレート制限に触れないようにするため。
 */
const COURSE_CONCURRENCY = 5;

export async function fetchAllData(
  accessToken: string,
  hiddenCourseIds?: Set<string>,
) {
  const courses = await fetchCourses(accessToken);
  const targets = hiddenCourseIds
    ? courses.filter((c) => !hiddenCourseIds.has(c.id))
    : courses;

  const allWork: { course: RawCourse; work: RawCourseWork; submission?: RawStudentSubmission }[] = [];
  const failed: { courseId: string; message: string; error: unknown }[] = [];

  for (let i = 0; i < targets.length; i += COURSE_CONCURRENCY) {
    const chunk = targets.slice(i, i + COURSE_CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map(async (course) => {
        // courseWork と studentSubmissions は互いに独立なので同時に投げる
        const [works, subs] = await Promise.all([
          fetchCourseWork(course.id, accessToken),
          // 提出状況はスコープ未付与などで落ちうる。課題一覧だけでも出せるようにする
          fetchSubmissions(course.id, accessToken).catch(() => [] as RawStudentSubmission[]),
        ]);

        const submissionMap = new Map(subs.map((s) => [s.courseWorkId, s]));
        return works.map((work) => ({
          course,
          work,
          submission: submissionMap.get(work.id),
        }));
      }),
    );

    // 1コースの失敗で全体を落とさない（アーカイブ直後・権限変更・Google側の一時エラー）。
    // 保存は upsert なので、取れなかったコースの課題は「更新されない」だけで消えはしない。
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        allWork.push(...r.value);
      } else {
        failed.push({
          courseId: chunk[idx].id,
          message: r.reason instanceof Error ? r.reason.message : String(r.reason),
          error: r.reason,
        });
      }
    });
  }

  // 全滅は「一部が取れなかった」ではなく systemic な失敗（トークン失効・ネットワーク断）。
  // ここで握りつぶすと、中身が更新されていないのに最終取得時刻だけ新しくなり、
  // 「古いデータを新鮮だと偽る」ことになる。呼び出し側の reauth 判定に乗せる。
  if (targets.length > 0 && failed.length === targets.length) {
    throw failed[0].error;
  }

  if (failed.length > 0) {
    console.warn(
      `[CLASSROOM] ${failed.length}/${targets.length} コースの取得に失敗（他は反映済み）:`,
      failed.map((f) => `${f.courseId}: ${f.message}`),
    );
  }

  return { courses: targets, allWork, failed };
}
