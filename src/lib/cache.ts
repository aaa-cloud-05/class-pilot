import { getDb } from "./db";
import type { Assignment } from "./types";

const STORE = "assignments";

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
  // Safari対策: トランザクション内で await すると自動コミットされ
  // 後続の put が TransactionInactiveError になる。await せず一気に発行する。
  tx.store.clear();
  for (const a of assignments) {
    tx.store.put(serialize(a));
  }
  await tx.done;
}

export async function getCachedAssignments(): Promise<Assignment[]> {
  const db = await getDb();
  const all = await db.getAll(STORE) as StoredAssignment[];
  return all.map(deserialize);
}

export async function cacheWebClassAssignments(assignments: Assignment[]): Promise<void> {
  const db = await getDb();
  // 読み取りは別トランザクションで行い、書き込みtx内では await しない（Safari対策）
  const allKeys = await db.getAllKeys(STORE);
  const tx = db.transaction(STORE, "readwrite");
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

export async function putCachedAssignment(a: Assignment): Promise<void> {
  const db = await getDb();
  await db.put(STORE, serialize(a));
}

export async function removeCachedAssignment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function deleteCachedByPrefix(prefix: string): Promise<void> {
  const db = await getDb();
  // 読み取りは別トランザクションで行い、書き込みtx内では await しない（Safari対策）
  const allKeys = await db.getAllKeys(STORE);
  const tx = db.transaction(STORE, "readwrite");
  for (const key of allKeys) {
    if (typeof key === "string" && key.startsWith(prefix)) {
      tx.store.delete(key);
    }
  }
  await tx.done;
}

export async function clearCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
