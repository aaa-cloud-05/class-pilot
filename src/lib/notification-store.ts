import { getDb } from "./db";

export type NotificationPreset = "relaxed" | "standard" | "urgent";

export interface NotificationSettings {
  id: "global";
  enabled: boolean;
  /** 以前のプリセット。reminderMinutes が空のときだけ読み替えに使う（src/lib/reminders.ts） */
  preset: NotificationPreset;
  /** 締切の何分前に知らせるか（最大2つ） */
  reminderMinutes: number[];
  mutedCourses: string[];
  mutedAssignments: string[];
  hiddenCourses: string[];
}

export interface NotificationRecord {
  id: string;
  assignmentId: string;
  /** 「24h」「3h」「1h」「360m」など（src/lib/reminders.ts の reminderType） */
  type: string;
  sentAt: number;
  title: string;
  body: string;
  read: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  id: "global",
  enabled: true,
  preset: "standard",
  reminderMinutes: [],
  mutedCourses: [],
  mutedAssignments: [],
  hiddenCourses: [],
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const db = await getDb();
  const stored = await db.get("notification-settings", "global");
  return stored ?? { ...DEFAULT_SETTINGS };
}

export async function saveNotificationSettings(
  settings: Partial<Omit<NotificationSettings, "id">>
): Promise<void> {
  const db = await getDb();
  const current = await getNotificationSettings();
  await db.put("notification-settings", { ...current, ...settings, id: "global" });
}

export async function recordNotification(
  assignmentId: string,
  type: NotificationRecord["type"],
  title: string,
  body: string
): Promise<void> {
  const db = await getDb();
  const record: NotificationRecord = {
    id: `${assignmentId}:${type}`,
    assignmentId,
    type,
    sentAt: Date.now(),
    title,
    body,
    read: false,
  };
  await db.put("notification-history", record);
}

export async function getUnreadCount(): Promise<number> {
  const db = await getDb();
  const all: NotificationRecord[] = await db.getAll("notification-history");
  return all.filter((r) => !r.read).length;
}

export async function markAsRead(id: string): Promise<void> {
  const db = await getDb();
  const record = await db.get("notification-history", id);
  if (record) {
    record.read = true;
    await db.put("notification-history", record);
  }
}

export async function markAllAsRead(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("notification-history", "readwrite");
  const all = await tx.store.getAll();
  for (const record of all) {
    if (!record.read) {
      record.read = true;
      tx.store.put(record);
    }
  }
  await tx.done;
}

export async function getNotificationHistory(): Promise<NotificationRecord[]> {
  const db = await getDb();
  return db.getAll("notification-history");
}

export async function hasBeenNotified(
  assignmentId: string,
  type: NotificationRecord["type"]
): Promise<boolean> {
  const db = await getDb();
  const record = await db.get("notification-history", `${assignmentId}:${type}`);
  return !!record;
}

export async function clearOldHistory(olderThanMs: number): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - olderThanMs;
  const tx = db.transaction("notification-history", "readwrite");
  const all = await tx.store.getAll();
  for (const record of all) {
    if (record.sentAt < cutoff) {
      tx.store.delete(record.id);
    }
  }
  await tx.done;
}
