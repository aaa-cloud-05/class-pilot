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

  for (const a of assignments) {
    const sourceKey = `classroom:${a.courseId}:${a.id}`;
    const ex = byKey.get(sourceKey);

    if (ex) {
      if (ex.deletedAt) continue;

      const data: Record<string, unknown> = {};
      const edited = ex.editedFields;
      if (!edited.includes("courseName")) data.courseName = a.courseName;
      if (!edited.includes("courseColor")) data.courseColor = a.courseColor;
      if (!edited.includes("title")) data.title = a.title;
      if (!edited.includes("description")) data.description = a.description ?? null;
      if (!edited.includes("dueDate")) data.dueDate = a.dueDate;
      if (!edited.includes("link")) data.link = a.link;
      if (!edited.includes("submissionState")) data.submissionState = a.submissionState;
      if (!edited.includes("isLate")) data.isLate = a.isLate;
      if (!edited.includes("grade")) data.grade = a.grade ?? null;
      if (!edited.includes("maxPoints")) data.maxPoints = a.maxPoints ?? null;

      if (Object.keys(data).length > 0) {
        await prisma.assignment.update({ where: { id: ex.id }, data });
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

  for (const a of assignments) {
    const sourceKey = `webclass:${a.courseName}::${a.title}`;
    const ex = byKey.get(sourceKey);

    if (ex) {
      if (ex.deletedAt) continue;

      const data: Record<string, unknown> = {};
      const edited = ex.editedFields;
      if (!edited.includes("courseColor")) data.courseColor = a.courseColor;
      if (!edited.includes("dueDate")) data.dueDate = a.dueDate;
      if (!edited.includes("link")) data.link = a.link;
      if (!edited.includes("submissionState")) data.submissionState = a.submissionState;
      if (!edited.includes("isLate")) data.isLate = a.isLate;
      if (!edited.includes("grade")) data.grade = a.grade ?? null;

      if (Object.keys(data).length > 0) {
        await prisma.assignment.update({ where: { id: ex.id }, data });
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
