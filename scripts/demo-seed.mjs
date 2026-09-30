// スクリーンショット（scripts/shots.mjs）と紹介動画の撮影（scripts/teaser-shots.mjs）で使うデモデータ。
//
// 未ログイン時の一次ストア（IndexedDB）に課題を書き込む。page.evaluate(SEED) で渡すので、
// この関数の中だけで完結させる（外の変数は使えない）。
//
// 日付は「いま」からの相対。撮影では時計を DEMO_CLOCK に合わせるので、画面は毎回同じになる。
// 今週（月〜日）の締切は 2・3・2・4・3・1・2 件にして、棒グラフに山と谷ができるようにしてある。
// どちらから来た課題かは科目で決める（プログラミング演習・英語・ネットワークは Classroom、ほかは WebClass）。
// 月のカレンダーが寂しくならないよう、今月の前半にも提出済みの課題を置いてある。

/** 撮影するときの時刻（火曜の夕方）。動画の文字（あと1時間・9/28 - 10/4 など）もこれに合わせてある */
export const DEMO_CLOCK = "2026-09-29T18:52:00+09:00";

export const SEED = async () => {
  const now = new Date();
  const D = (d, h, m) => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  // [id, 科目名, 色, 出どころ]
  const C = {
    al: ["c1", "アルゴリズムとデータ構造", "#5856D6", "webclass"], la: ["c2", "線形代数学 II", "#007AFF", "webclass"],
    pg: ["c3", "プログラミング演習", "#FF9500", "classroom"], en: ["c4", "英語コミュニケーション", "#FF2D55", "classroom"],
    db: ["c5", "データベース", "#5AC8FA", "webclass"], nw: ["c6", "コンピュータネットワーク", "#AF52DE", "classroom"],
    os: ["c7", "オペレーティングシステム", "#34C759", "webclass"],
  };
  const mk = (i, c, t, due, st, late) => ({
    id: "s" + i, courseId: C[c][0], courseName: C[c][1], courseColor: C[c][2],
    title: t, dueDate: due, link: "https://example.com/", submissionState: st,
    isLate: !!late, source: C[c][3],
  });
  const N = "not_submitted", S = "submitted";
  const rows = [
    // 今月の前半（提出済み）
    mk(26, "al", "課題1 アルゴリズムの計算量", D(-27, 23, 59), S),
    mk(27, "pg", "課題1 開発環境の準備", D(-25, 17, 0), S),
    mk(28, "la", "演習問題1（行列の積）", D(-21, 18, 0), S),
    mk(29, "en", "Unit 1 Vocabulary Quiz", D(-20, 19, 30), S),
    mk(30, "db", "第1回 演習（関係モデル）", D(-19, 21, 30), S),
    mk(31, "nw", "第1回 小テスト", D(-14, 15, 30), S),
    mk(32, "os", "第1回 演習（OS の役割）", D(-13, 12, 0), S),
    mk(33, "pg", "課題3 配列と文字列", D(-12, 23, 30), S, true),
    mk(34, "al", "課題1-2 整列の実装", D(-7, 23, 59), S),
    mk(35, "en", "Unit 3 Reading Log", D(-6, 23, 59), S),
    // 先週
    mk(1, "en", "Unit 4 Vocabulary Quiz", D(-3, 19, 30), N),
    mk(2, "al", "課題2 計算量の見積もり", D(-6, 11, 30), S),
    mk(3, "pg", "課題5 再帰関数", D(-5, 7, 30), S, true),
    // 月（昨日）
    mk(4, "la", "演習問題5（固有値と固有ベクトル）", D(-1, 21, 30), N),
    mk(5, "nw", "第3回 小テスト", D(-1, 15, 30), S),
    // 火（今日）
    mk(6, "al", "レポート2 ソートアルゴリズムの比較", D(0, 19, 59), N),
    mk(7, "pg", "課題7 連結リストの実装", D(0, 23, 30), N),
    mk(8, "os", "第4回 演習（プロセスとスレッド）", D(0, 12, 0), S),
    // 水
    mk(9, "db", "ER 図の作成レポート", D(1, 15, 30), N),
    mk(10, "en", "Unit 5 Speaking Log", D(1, 23, 30), N),
    // 木
    mk(11, "nw", "課題3 パケットキャプチャ", D(2, 17, 0), N),
    mk(12, "la", "演習問題6（対角化）", D(2, 18, 0), N),
    mk(13, "os", "第5回 演習（スケジューリング）", D(2, 12, 0), N),
    mk(14, "db", "SQL 小課題3", D(2, 21, 30), S),
    // 金
    mk(15, "al", "課題4 二分探索木", D(3, 10, 30), N),
    mk(16, "pg", "課題8 ハッシュテーブル", D(3, 13, 0), N),
    mk(17, "en", "Unit 6 Reading Log", D(3, 23, 59), N),
    // 土・日
    mk(18, "nw", "第4回 小テスト", D(4, 20, 30), N),
    mk(19, "db", "正規化の演習", D(5, 21, 30), S),
    mk(20, "os", "第6回 演習（仮想記憶）", D(5, 23, 59), N),
    // 来週以降・期限なし
    mk(21, "al", "期末レポートのテーマ提出", D(8, 15, 30), N),
    mk(22, "pg", "課題9 グラフの探索", D(11, 13, 30), N),
    mk(23, "la", "中間レポート", D(18, 23, 59), N),
    mk(24, "nw", "実験ノートの提出", null, N),
    mk(25, "os", "中間試験の振り返りシート", null, N),
  ];
  const hist = [
    { id: "n1", assignmentId: "s6", type: "3h", sentAt: Date.now() - 40 * 60000, title: "締切まであと3時間", body: "「レポート2 ソートアルゴリズムの比較」（アルゴリズムとデータ構造）", read: false },
    { id: "n2", assignmentId: "s9", type: "24h", sentAt: Date.now() - 5 * 3600000, title: "締切まであと1日", body: "「ER 図の作成レポート」（データベース）", read: false },
    { id: "n3", assignmentId: "s5", type: "24h", sentAt: Date.now() - 30 * 3600000, title: "締切まであと1日", body: "「第3回 小テスト」（コンピュータネットワーク）", read: true },
  ];
  // src/lib/db.ts と同じスキーマで開く。新しいプロファイルでも store を作れるようにする
  const open = (name) => new Promise((res, rej) => {
    const r = indexedDB.open(name, 3);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("assignments")) {
        const st = db.createObjectStore("assignments", { keyPath: "id" });
        st.createIndex("courseId", "courseId"); st.createIndex("dueDate", "dueDate");
      }
      if (!db.objectStoreNames.contains("notification-settings")) db.createObjectStore("notification-settings", { keyPath: "id" });
      if (!db.objectStoreNames.contains("notification-history")) {
        const h = db.createObjectStore("notification-history", { keyPath: "id" });
        h.createIndex("assignmentId", "assignmentId");
      }
    };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const put = (db, store, items) => new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite"); const st = tx.objectStore(store);
    st.clear(); items.forEach((x) => st.put(x));
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  try {
    const db = await open("classroom-reminder");
    await put(db, "assignments", rows);
    if (db.objectStoreNames.contains("notification-history")) await put(db, "notification-history", hist);
  } catch (e) { console.error(e); }
};
