import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "classroom-reminder";
const DB_VERSION = 2;

export async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("assignments")) {
        const store = db.createObjectStore("assignments", { keyPath: "id" });
        store.createIndex("courseId", "courseId");
        store.createIndex("dueDate", "dueDate");
      }
      if (!db.objectStoreNames.contains("notification-settings")) {
        db.createObjectStore("notification-settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notification-history")) {
        const histStore = db.createObjectStore("notification-history", { keyPath: "id" });
        histStore.createIndex("assignmentId", "assignmentId");
      }
    },
  });
}
