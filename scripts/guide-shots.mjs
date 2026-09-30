// 使い方の動画（video/ の guide）に入れる、本物のアプリの画面を撮る。
//
//   1. dev サーバを起動する（npm run dev）
//   2. node scripts/guide-shots.mjs
//
// PC（1440×900）とスマホ（430×932）で、はじめて開いたホーム・セットアップ・コードをコピーしたとき・
// 取り込みが終わった画面を撮る。ブラウザや WebClass・Google の画面は撮らない（動画の中で描く）。
// カメラやカーソルの行き先になる要素の位置（画面の中の CSS px）を video/src/guide/shots.json に書き出す。

import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { DEMO_CLOCK, SEED } from "./demo-seed.mjs";

const BASE = "http://localhost:3000";
const OUT = "video/public/guide";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PC = { width: 1440, height: 900 };
const PHONE = { width: 430, height: 932 };
const HIDE_DEV = "nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}";

/** 要素の位置（いま見えている画面の中の CSS px） */
const rectOf = async (loc) => {
  const b = await loc.boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};

/** 入場アニメーションを終わらせる（時計を差し替えていると途中で止まることがある） */
const settle = async (page, ms = 3000) => {
  await page.clock.runFor(ms).catch(() => {});
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
  await page.waitForTimeout(300);
};

/** 取り込みに渡すデータ（ブックマークレットが作るものと同じ形）。デモデータの WebClass の科目だけ */
function webclassPayload() {
  const now = new Date(DEMO_CLOCK);
  const at = (d, h, m) => {
    const x = new Date(now);
    x.setDate(x.getDate() + d);
    const p = (n) => String(n).padStart(2, "0");
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(h)}:${p(m)}`;
  };
  const cs = [
    { g: "g1", c: "アルゴリズムとデータ構造" },
    { g: "g2", c: "線形代数学 II" },
    { g: "g3", c: "データベース" },
    { g: "g4", c: "オペレーティングシステム" },
  ];
  const t = [
    [0, "課題1 アルゴリズムの計算量", at(-27, 23, 59), 1], [0, "課題2 計算量の見積もり", at(-6, 11, 30), 1],
    [0, "レポート2 ソートアルゴリズムの比較", at(0, 19, 59), 0], [0, "課題4 二分探索木", at(3, 10, 30), 0],
    [0, "期末レポートのテーマ提出", at(8, 15, 30), 0], [1, "演習問題1（行列の積）", at(-21, 18, 0), 1],
    [1, "演習問題5（固有値と固有ベクトル）", at(-1, 21, 30), 0], [1, "演習問題6（対角化）", at(2, 18, 0), 0],
    [1, "中間レポート", at(18, 23, 59), 0], [2, "第1回 演習（関係モデル）", at(-19, 21, 30), 1],
    [2, "ER 図の作成レポート", at(1, 15, 30), 0], [2, "SQL 小課題3", at(2, 21, 30), 1], [2, "正規化の演習", at(5, 21, 30), 1],
    [3, "第1回 演習（OS の役割）", at(-13, 12, 0), 1], [3, "第4回 演習（プロセスとスレッド）", at(0, 12, 0), 1],
    [3, "第5回 演習（スケジューリング）", at(2, 12, 0), 0], [3, "第6回 演習（仮想記憶）", at(5, 23, 59), 0],
    [3, "中間試験の振り返りシート", null, 0],
  ].map(([k, n, d, s], i) => ({ k, i: "c" + (i + 1), n, d, s }));
  return { v: 2, b: "https://webclass.example.ac.jp/webclass/", cs, t };
}

const browser = await chromium.launch({ executablePath: CHROME });
await mkdir(OUT, { recursive: true });
const shots = { pc: {}, phone: {} };

const context = async (viewport, scale) => {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: "ja-JP", timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
  await ctx.clock.install({ time: new Date(DEMO_CLOCK) });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  return ctx;
};

// ---------- PC ----------
{
  // はじめて開いたホーム（何も入っていない）
  const ctx = await context(PC, 2);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("課題はまだありません").first().waitFor({ timeout: 15000 });
  await page.addStyleTag({ content: HIDE_DEV });
  await settle(page);
  await page.screenshot({ path: `${OUT}/pc-home-empty.png` });
  shots.pc.openSetup = await rectOf(page.getByText("セットアップを開く").first());
  shots.pc.emptyCard = await rectOf(page.getByText("課題はまだありません").first().locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]"));
  shots.pc.account = await rectOf(page.getByText("ログインしていません").first().locator("xpath=ancestor::*[self::a or self::button or self::div][2]"));

  // セットアップ（手順1: Google でログイン）
  await page.goto(BASE + "/settings/setup", { waitUntil: "networkidle" });
  await page.getByText("WebClass をつなぐ").first().waitFor();
  await page.addStyleTag({ content: HIDE_DEV });
  await settle(page);
  await page.screenshot({ path: `${OUT}/pc-setup-top.png` });
  shots.pc.googleButton = await rectOf(page.locator("main").getByRole("link", { name: /Google でログイン/ }).or(page.locator("main").getByRole("button", { name: /Google でログイン/ })).last());

  // セットアップ（手順2: WebClass をつなぐ）。コードをコピーのボタンが見える位置まで送る
  const copy = page.getByRole("button", { name: /コードをコピー/ }).first();
  // 「A. ブックマークレット」の見出しから手順・ボタンまでが入るよう、ボタンを画面の下寄りに置く
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) => e.textContent.includes("コードをコピー"));
    scrollBy(0, b.getBoundingClientRect().top - 420);
  });
  await settle(page, 500);
  await page.screenshot({ path: `${OUT}/pc-setup-step2.png` });
  shots.pc.copyButton = await rectOf(copy);
  await copy.click();
  await page.getByText("コードをコピーしました").first().waitFor();
  await settle(page, 400);
  await page.screenshot({ path: `${OUT}/pc-setup-copied.png` });
  await ctx.close();
}
{
  // ログインしたあと・取り込んだあとのホーム（デモデータ）
  const ctx = await context(PC, 2);
  const page = await ctx.newPage();
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(SEED);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("あと", { exact: false }).first().waitFor({ timeout: 15000 });
  await page.locator('button[aria-label="セットアップの案内を閉じる"]').first().click();
  await page.addStyleTag({ content: HIDE_DEV });
  await settle(page);
  await page.screenshot({ path: `${OUT}/pc-home-full.png` });
  // 中央の列と右の列のカード（課題が入ってくる様子を、カードごとに出して見せる）
  shots.pc.cards = await page.evaluate(() =>
    [...document.querySelectorAll("main .rounded-card")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 200 && r.top < innerHeight && r.left > 250)
      .map((r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(Math.min(r.height, innerHeight - r.top)) })),
  );
  await ctx.close();
}

/** 取り込みが終わった画面（まもなくホームへ戻るので、その前に撮る） */
async function importDone(viewport, scale, name) {
  const ctx = await context(viewport, scale);
  const page = await ctx.newPage();
  await page.goto(BASE + "/import#" + encodeURIComponent(JSON.stringify(webclassPayload())), { waitUntil: "domcontentloaded" });
  await page.getByText("WebClass から取り込みました").first().waitFor({ timeout: 15000 });
  await page.clock.runFor(1500); // 件数が数え上がるまで（2.5秒でホームへ戻るので、それより前）
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
  await page.addStyleTag({ content: HIDE_DEV });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const count = webclassPayload().t.length;
  await ctx.close();
  return count;
}
shots.importCount = await importDone(PC, 2, "pc-import-done");

// ---------- スマホ ----------
{
  const ctx = await context(PHONE, 3);
  const page = await ctx.newPage();
  await page.goto(BASE + "/settings/setup", { waitUntil: "networkidle" });
  await page.getByText("WebClass をつなぐ").first().waitFor();
  await page.addStyleTag({ content: HIDE_DEV + 'nav[aria-label="メイン"]{display:none!important}' });
  await page.getByRole("radio", { name: "iPhone" }).or(page.getByRole("tab", { name: "iPhone" })).or(page.getByRole("button", { name: "iPhone" })).first().click();
  const copy = page.getByRole("button", { name: /コードをコピー/ }).first();
  await copy.scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, 260));
  await settle(page);
  await page.screenshot({ path: `${OUT}/phone-setup-step2.png` });
  shots.phone.copyButton = await rectOf(copy);
  await copy.click();
  await page.getByText("コードをコピーしました").first().waitFor();
  await settle(page, 400);
  await page.screenshot({ path: `${OUT}/phone-setup-copied.png` });
  await ctx.close();
}
await importDone(PHONE, 3, "phone-import-done");

await browser.close();
shots.pc.viewport = PC;
shots.phone.viewport = PHONE;
await mkdir("video/src/guide", { recursive: true });
await writeFile("video/src/guide/shots.json", JSON.stringify(shots, null, 2) + "\n");
console.log("完了（位置は video/src/guide/shots.json）");
