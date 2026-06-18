import { openDB, type IDBPDatabase } from "idb";
import type { Assignment } from "./types";

const DB_NAME = "classroom-reminder";
const DB_VERSION = 1;
const STORE = "assignments";

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("courseId", "courseId");
        store.createIndex("dueDate", "dueDate");
      }
    },
  });
}

interface StoredAssignment extends Omit<Assignment, "dueDate"> {
  dueDate: string | null;
}

function serialize(a: Assignment): StoredAssignment {
  return { ...a, dueDate: a.dueDate?.toISOString() ?? null };
}

function deserialize(s: StoredAssignment): Assignment {
  return { ...s, dueDate: s.dueDate ? new Date(s.dueDate) : null };
}

export async function cacheAssignments(assignments: Assignment[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all([
    ...assignments.map((a) => tx.store.put(serialize(a))),
    tx.done,
  ]);
}

export async function getCachedAssignments(): Promise<Assignment[]> {
  const db = await getDb();
  const all = await db.getAll(STORE) as StoredAssignment[];
  return all.map(deserialize);
}

export async function cacheWebClassAssignments(assignments: Assignment[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  const allKeys = await tx.store.getAllKeys();
  for (const key of allKeys) {
    if (typeof key === "string" && key.startsWith("wc-")) {
      tx.store.delete(key);
    }
  }
  for (const a of assignments) {
    tx.store.put(serialize(a));
  }
  await tx.done;
}

export async function clearCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
