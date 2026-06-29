import { getDb } from "./db";

/**
 * クライアント側に残る全ローカルデータを削除する（デバッグ用）。
 * Safari でブラウザUIからキャッシュを消せない場合の手動クリア手段。
 * 認証Cookieは対象外（ログイン状態は維持される）。
 */
export async function clearAllClientData(): Promise<void> {
  // 1. IndexedDB: 全オブジェクトストアを空にする（最も確実）
  try {
    const db = await getDb();
    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length > 0) {
      const tx = db.transaction(storeNames, "readwrite");
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
      await tx.done;
    }
    db.close();
  } catch {
    // ignore
  }

  // 2. IndexedDB自体の削除（ベストエフォート。開いている接続があるとブロックされ得る）
  try {
    indexedDB.deleteDatabase("classroom-reminder");
  } catch {
    // ignore
  }

  // 3. Cache API（Service Workerがキャッシュしたページ）
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }

  // 4. Service Worker の登録解除
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }

  // 5. localStorage / sessionStorage（マイグレーション済みフラグ等）
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // ignore
  }
}
