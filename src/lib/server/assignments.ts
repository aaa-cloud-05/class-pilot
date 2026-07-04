import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { Assignment } from "@/lib/types";

function toClientAssignment(db: {
  id: string;
  externalId: string | null;
  source: string;
  courseId: string;
  courseName: string;
  courseColor: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  link: string;
  submissionState: string;
  isLate: boolean;
  grade: number | null;
  maxPoints: number | null;
}): Assignment {
  return {
    id: db.externalId ?? db.id,
    courseId: db.courseId,
    courseName: db.courseName,
    courseColor: db.courseColor,
    title: db.title,
    description: db.description ?? undefined,
    dueDate: db.dueDate,
    link: db.link,
    submissionState: db.submissionState as Assignment["submissionState"],
    isLate: db.isLate,
    grade: db.grade ?? undefined,
    maxPoints: db.maxPoints ?? undefined,
    source: db.source as Assignment["source"],
  };
}

export async function getUserAssignments(
  userId: string,
  hiddenCourseIds?: Set<string>,
): Promise<Assignment[]> {
  const where: Record<string, unknown> = { userId, deletedAt: null };
  if (hiddenCourseIds && hiddenCourseIds.size > 0) {
    where.courseId = { notIn: [...hiddenCourseIds] };
  }
  const rows = await prisma.assignment.findMany({
    where,
    orderBy: { dueDate: { sort: "asc", nulls: "last" } },
  });
  return rows.map(toClientAssignment);
}

/**
 * ユーザーの全コース（非表示含む）を返す。
 * 設定画面のコース管理で、非表示にしたコースも再追跡できるようにするため使用。
 */
export async function getUserCourses(
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const rows = await prisma.assignment.findMany({
    where: { userId, deletedAt: null },
    select: { courseId: true, courseName: true },
    distinct: ["courseId"],
    orderBy: { courseName: "asc" },
  });
  return rows.map((r) => ({ id: r.courseId, name: r.courseName }));
}

/** Date同士の等値比較（null対応）。 */
function sameDate(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

export async function syncClassroomAssignments(
  userId: string,
  assignments: Assignment[],
): Promise<void> {
  const sourceKeys = assignments.map((a) => `classroom:${a.courseId}:${a.id}`);

  const existing = await prisma.assignment.findMany({
    where: { userId, sourceKey: { in: sourceKeys } },
  });
  const byKey = new Map(existing.map((e) => [e.sourceKey!, e]));

  const creates: Prisma.AssignmentCreateManyInput[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const changedFields = new Set<string>();

  for (const a of assignments) {
    const sourceKey = `classroom:${a.courseId}:${a.id}`;
    const ex = byKey.get(sourceKey);

    if (ex) {
      if (ex.deletedAt) continue;

      // 既存値と異なるフィールドだけ更新（ユーザー編集済みは保護）。
      // 変更なしなら UPDATE を発行しないため、再同期は一瞬で終わる。
      const data: Record<string, unknown> = {};
      const edited = ex.editedFields;
      if (!edited.includes("courseName") && ex.courseName !== a.courseName) data.courseName = a.courseName;
      if (!edited.includes("courseColor") && ex.courseColor !== a.courseColor) data.courseColor = a.courseColor;
      if (!edited.includes("title") && ex.title !== a.title) data.title = a.title;
      if (!edited.includes("description") && (ex.description ?? null) !== (a.description ?? null)) data.description = a.description ?? null;
      if (!edited.includes("dueDate") && !sameDate(ex.dueDate, a.dueDate)) data.dueDate = a.dueDate;
      if (!edited.includes("link") && ex.link !== a.link) data.link = a.link;
      if (!edited.includes("submissionState") && ex.submissionState !== a.submissionState) data.submissionState = a.submissionState;
      if (!edited.includes("isLate") && ex.isLate !== a.isLate) data.isLate = a.isLate;
      if (!edited.includes("grade") && (ex.grade ?? null) !== (a.grade ?? null)) data.grade = a.grade ?? null;
      if (!edited.includes("maxPoints") && (ex.maxPoints ?? null) !== (a.maxPoints ?? null)) data.maxPoints = a.maxPoints ?? null;

      if (Object.keys(data).length > 0) {
        Object.keys(data).forEach((k) => changedFields.add(k));
        updates.push(prisma.assignment.update({ where: { id: ex.id }, data }));
      }
    } else {
      creates.push({
        userId,
        externalId: a.id,
        source: "classroom",
        sourceKey,
        courseId: a.courseId,
        courseName: a.courseName,
        courseColor: a.courseColor,
        title: a.title,
        description: a.description ?? null,
        dueDate: a.dueDate,
        link: a.link,
        submissionState: a.submissionState,
        isLate: a.isLate,
        grade: a.grade ?? null,
        maxPoints: a.maxPoints ?? null,
      });
    }
  }

  // 変更なしなら0件のはず。多数出る場合は差分検出の不備を疑う(docs/classroom-sync-flow.md §4)
  console.log(`[SYNC] classroom diff: creates=${creates.length} updates=${updates.length} fields=[${[...changedFields]}]`);

  // Promise.allでの一斉並列はプール(接続5本)を枯渇させP2024になるため、
  // $transactionで1接続に多重化して順次実行する(直列awaitより速く、プールも安全)
  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
  if (creates.length > 0) {
    await prisma.assignment.createMany({ data: creates, skipDuplicates: true });
  }
}

export async function syncWebClassAssignments(
  userId: string,
  assignments: Assignment[],
): Promise<void> {
  const sourceKeys = assignments.map((a) => `webclass:${a.courseName}::${a.title}`);

  const existing = await prisma.assignment.findMany({
    where: { userId, sourceKey: { in: sourceKeys } },
  });
  const byKey = new Map(existing.map((e) => [e.sourceKey!, e]));

  const creates: Prisma.AssignmentCreateManyInput[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const changedFields = new Set<string>();

  for (const a of assignments) {
    const sourceKey = `webclass:${a.courseName}::${a.title}`;
    const ex = byKey.get(sourceKey);

    if (ex) {
      if (ex.deletedAt) continue;

      // 既存値と異なるフィールドだけ更新（ユーザー編集済みは保護）。
      // 変更なしなら UPDATE を発行しないため、再取り込みは一瞬で終わる。
      const data: Record<string, unknown> = {};
      const edited = ex.editedFields;
      if (!edited.includes("courseColor") && ex.courseColor !== a.courseColor) data.courseColor = a.courseColor;
      if (!edited.includes("dueDate") && !sameDate(ex.dueDate, a.dueDate)) data.dueDate = a.dueDate;
      if (!edited.includes("link") && ex.link !== a.link) data.link = a.link;
      if (!edited.includes("submissionState") && ex.submissionState !== a.submissionState) data.submissionState = a.submissionState;
      if (!edited.includes("isLate") && ex.isLate !== a.isLate) data.isLate = a.isLate;
      if (!edited.includes("grade") && (ex.grade ?? null) !== (a.grade ?? null)) data.grade = a.grade ?? null;

      if (Object.keys(data).length > 0) {
        Object.keys(data).forEach((k) => changedFields.add(k));
        updates.push(prisma.assignment.update({ where: { id: ex.id }, data }));
      }
    } else {
      creates.push({
        userId,
        externalId: a.id,
        source: "webclass",
        sourceKey,
        courseId: a.courseId,
        courseName: a.courseName,
        courseColor: a.courseColor,
        title: a.title,
        dueDate: a.dueDate,
        link: a.link,
        submissionState: a.submissionState,
        isLate: a.isLate,
        grade: a.grade ?? null,
      });
    }
  }

  // 変更なしなら0件のはず。多数出る場合は差分検出の不備を疑う(docs/classroom-sync-flow.md §4)
  console.log(`[SYNC] webclass diff: creates=${creates.length} updates=${updates.length} fields=[${[...changedFields]}]`);

  // Promise.allでの一斉並列はプール(接続5本)を枯渇させP2024になるため、
  // $transactionで1接続に多重化して順次実行する(直列awaitより速く、プールも安全)
  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
  if (creates.length > 0) {
    await prisma.assignment.createMany({ data: creates, skipDuplicates: true });
  }
}

export async function createManualAssignment(
  userId: string,
  data: {
    courseName: string;
    courseColor: string;
    title: string;
    dueDate: Date | null;
    submissionState: string;
  },
): Promise<Assignment> {
  const courseId = `manual-course-${data.courseName.toLowerCase().replace(/\s+/g, "-")}`;

  const created = await prisma.assignment.create({
    data: {
      userId,
      source: "manual",
      courseId,
      courseName: data.courseName,
      courseColor: data.courseColor,
      title: data.title,
      dueDate: data.dueDate,
      submissionState: data.submissionState,
      isLate:
        data.dueDate !== null &&
        data.dueDate < new Date() &&
        data.submissionState === "not_submitted",
    },
  });

  return toClientAssignment(created);
}

const EDITABLE_FIELDS = [
  "title", "description", "dueDate", "courseName",
  "courseColor", "submissionState", "link",
] as const;

export async function editAssignment(
  userId: string,
  assignmentId: string,
  data: Record<string, unknown>,
): Promise<Assignment | null> {
  const row = await prisma.assignment.findFirst({
    where: {
      userId,
      OR: [{ id: assignmentId }, { externalId: assignmentId }],
      deletedAt: null,
    },
  });
  if (!row) return null;

  const update: Record<string, unknown> = {};
  const newEdited = new Set(row.editedFields);

  for (const field of EDITABLE_FIELDS) {
    if (field in data) {
      update[field] = data[field];
      newEdited.add(field);
    }
  }

  if (Object.keys(update).length === 0) return toClientAssignment(row);

  update.editedFields = [...newEdited];

  const updated = await prisma.assignment.update({
    where: { id: row.id },
    data: update,
  });
  return toClientAssignment(updated);
}

export async function softDeleteAssignment(
  userId: string,
  assignmentId: string,
): Promise<boolean> {
  const row = await prisma.assignment.findFirst({
    where: {
      userId,
      OR: [{ id: assignmentId }, { externalId: assignmentId }],
      deletedAt: null,
    },
  });
  if (!row) return false;

  await prisma.assignment.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
  });
  return true;
}
