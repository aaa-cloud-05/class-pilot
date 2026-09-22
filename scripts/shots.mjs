// README 用のスクリーンショットを撮る。
//
//   1. dev サーバを起動する（npm run dev）
//   2. node scripts/shots.mjs
//
// デモ用の課題を IndexedDB に入れてから撮るので、未ログイン・実データなしの状態で
// 画面を再現できる。公開ディレクトリには何も置かない。
//
// 既にインストールされている Chrome を使うため、ブラウザのダウンロードは発生しない。

import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "docs/images";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const MOBILE = { width: 430, height: 932 };
const DESKTOP = { width: 1440, height: 900 };

/** 撮るもの。click は撮影前に押すセレクタ */
const SHOTS = [
  { name: "home-mobile", path: "/", viewport: MOBILE, wait: "あと" },
  { name: "home-all-mobile", path: "/", viewport: MOBILE, wait: "あと", click: "text=すべて" },
  { name: "calendar-mobile", path: "/calendar", viewport: MOBILE, wait: "この月" },
  { name: "activity-mobile", path: "/activity", viewport: MOBILE, wait: "締切" },
  { name: "settings-mobile", path: "/settings", viewport: MOBILE, wait: "テーマ" },
  { name: "setup-mobile", path: "/settings/setup", viewport: MOBILE, wait: "WebClass をつなぐ" },
  { name: "home-desktop", path: "/", viewport: DESKTOP, wait: "あと" },
  { name: "calendar-desktop", path: "/calendar", viewport: DESKTOP, wait: "この月" },
  { name: "settings-desktop", path: "/settings/notifications", viewport: DESKTOP, wait: "締切の通知" },
];

/** 未ログイン時の一次ストア（IndexedDB）にデモ用の課題を書き込む */
const SEED = async () => {

  const now = new Date();
  const D = (d, h, m) => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const C = {
    ir: ["c1", "情報理論", "#5856D6"], la: ["c2", "線形代数学 II", "#007AFF"],
    pg: ["c3", "プログラミング演習", "#FF9500"], en: ["c4", "英語コミュニケーション", "#FF2D55"],
    db: ["c5", "データベース論", "#5AC8FA"], ec: ["c6", "電気回路", "#AF52DE"],
    cd: ["c7", "キャリアデザイン", "#34C759"],
  };
  const mk = (i, c, t, due, st, late) => ({
    id: "s" + i, courseId: C[c][0], courseName: C[c][1], courseColor: C[c][2],
    title: t, dueDate: due, link: "https://example.com/", submissionState: st,
    isLate: !!late, source: i % 3 === 0 ? "classroom" : "webclass",
  });
  const rows = [
    mk(1, "la", "演習問題5（固有値と固有ベクトル）", D(-1, 21, 30), "not_submitted"),
    mk(2, "en", "Unit 4 Vocabulary Quiz", D(-3, 19, 30), "not_submitted"),
    mk(3, "ir", "第3回 小テスト（情報量）", D(-6, 11, 30), "submitted"),
    mk(4, "pg", "課題6 スタックとキュー", D(-5, 7, 30), "submitted", true),
    mk(5, "la", "演習問題4（行列式）", D(-2, 15, 30), "submitted"),
    mk(6, "ir", "第4回 小テスト（エントロピー）", D(0, 19, 59), "not_submitted"),
    mk(7, "pg", "課題7 連結リストの実装", D(0, 23, 30), "not_submitted"),
    mk(8, "db", "ER 図の作成レポート", D(1, 15, 30), "not_submitted"),
    mk(9, "ec", "第6回 演習プリント", D(1, 23, 30), "submitted"),
    mk(10, "en", "Unit 5 Speaking Log", D(2, 19, 30), "not_submitted"),
    mk(11, "cd", "業界研究シート", D(3, 20, 30), "not_submitted"),
    mk(12, "ir", "第5回 小テスト（符号化）", D(3, 9, 0), "not_submitted"),
    mk(13, "pg", "課題9 ソートの計算量レポート", D(3, 10, 30), "not_submitted"),
    mk(14, "db", "正規化の演習", D(3, 13, 0), "submitted"),
    mk(15, "ec", "第7回 演習プリント", D(3, 16, 30), "submitted"),
    mk(16, "la", "演習問題6（固有空間）", D(3, 18, 0), "not_submitted"),
    mk(17, "en", "Unit 6 Reading Log", D(4, 23, 59), "not_submitted"),
    mk(18, "db", "SQL 小課題3", D(5, 21, 30), "submitted"),
    mk(19, "ir", "期末レポートのテーマ提出", D(8, 15, 30), "not_submitted"),
    mk(20, "pg", "課題8 二分探索木", D(11, 13, 30), "not_submitted"),
    mk(21, "la", "中間レポート", D(18, 23, 59), "not_submitted"),
    mk(22, "ec", "中間試験の振り返りシート", null, "not_submitted"),
    mk(23, "cd", "自己分析ワークシート", null, "not_submitted"),
  ];
  const hist = [
    { id: "n1", assignmentId: "s6", type: "3h", sentAt: Date.now() - 40 * 60000, title: "あと3時間で締切", body: "情報理論「第4回 小テスト（エントロピー）」", read: false },
    { id: "n2", assignmentId: "s8", type: "24h", sentAt: Date.now() - 5 * 3600000, title: "明日が締切", body: "データベース論「ER 図の作成レポート」", read: false },
    { id: "n3", assignmentId: "s5", type: "24h", sentAt: Date.now() - 30 * 3600000, title: "明日が締切", body: "線形代数学 II「演習問題4（行列式）」", read: true },
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

const browser = await chromium.launch({ executablePath: CHROME });
await mkdir(OUT, { recursive: true });

for (const s of SHOTS) {
  const ctx = await browser.newContext({
    viewport: s.viewport,
    deviceScaleFactor: 2,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce", // 入場アニメーションの途中で撮らないため
  });
  const page = await ctx.newPage();

  // デモデータを入れる。同じコンテキストなので以降の遷移でも残る
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(SEED);

  await page.goto(BASE + s.path, { waitUntil: "networkidle" });
  await page.getByText(s.wait, { exact: false }).first().waitFor({ timeout: 15000 });
  if (s.click) {
    await page.locator(s.click).first().click();
    await page.waitForTimeout(800);
  }
  // Next.js の開発インジケータは製品の一部ではないので隠す
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-dev-tools-button],#__next-build-watcher{display:none!important}" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log("撮影:", s.name, `${s.viewport.width}x${s.viewport.height}`);
  await ctx.close();
}

await browser.close();
console.log("完了");
