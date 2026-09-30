// 紹介動画（video/ の teaser）に入れる、本物の画面を撮る。
//
//   1. dev サーバを起動する（npm run dev）
//   2. node --experimental-strip-types scripts/teaser-shots.mjs
//
// デモデータ（scripts/demo-seed.mjs）で、スマホのホームをページ全体まで 3 倍で撮る。
// 動画の中でスクロール・ズームするので、カメラとカーソルの行き先になる要素の位置（CSS px）も
// video/src/teaser/shots.json に書き出す。UI が変わったらこれを流し直せば動画も追従する。
// 撮るもの: ホーム（ページ全体・木曜を押す前と後）、カレンダー（9/30 を押す前と後）、ログイン画面、届くメール

import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { DEMO_CLOCK, SEED } from "./demo-seed.mjs";
import { renderDeadlineEmail } from "../src/lib/server/email-template.ts";

const BASE = "http://localhost:3000";
const OUT = "video/public/teaser";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const VIEWPORT = { width: 430, height: 932 };
const SCALE = 3;
// 下のナビと Next.js の開発インジケータは消す（ナビは動画では画面の外になる）
const HIDE = 'nav[aria-label="メイン"],nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}';

/** ページの中の要素の位置（スクロールを含む CSS px）。見出しは、その下のカードまでを1つの枠にする */
const MEASURE = (titles = []) => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const union = (a, b) => {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };
  const section = (label) => {
    const h = [...document.querySelectorAll("h2")].find((e) => e.textContent.trim().startsWith(label));
    if (!h) return null;
    const card = [...document.querySelectorAll(".rounded-card")].find((c) => h.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    return card ? union(box(h), box(card)) : box(h);
  };
  const group = document.querySelector('[aria-label="曜日ごとの締切"]');
  const left = [...document.querySelectorAll("span,p,div")].filter((e) => e.children.length === 0 && e.textContent.trim() === "あと1時間");
  return {
    height: document.documentElement.scrollHeight,
    week: box(group.closest(".rounded-card")),
    bars: [...group.querySelectorAll("button")].map(box),
    recent: section("直近の未提出"),
    today: section("今日"),
    tomorrow: section("明日"),
    picked: section("10月1日"),
    // リストの中の「あと1時間」（今週のカードの「次の1件」にも同じ文字があるので最後のもの）
    soon: left.length ? box(left[left.length - 1]) : null,
    // 課題の行（タイトルの文字の位置）。同じタイトルが今週のカードにもあるので最後のもの
    rows: titles.map((t) => {
      const el = [...document.querySelectorAll("span,p,div,h3")].filter((e) => e.children.length === 0 && e.textContent.trim() === t).pop();
      return el ? { title: t, ...box(el) } : null;
    }).filter(Boolean),
  };
};

/** カレンダー（月）。日付のマス・月のカード・下の課題リスト */
const MEASURE_CAL = () => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const cell = document.querySelector('button[aria-label^="9月30日"]');
  const heading = [...document.querySelectorAll("h2")].find((e) => /9月29日|9月30日/.test(e.textContent));
  const list = heading && [...document.querySelectorAll(".rounded-card")].find((c) => heading.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
  return {
    height: document.documentElement.scrollHeight,
    grid: box(cell.closest(".rounded-card")),
    cell: box(cell),
    list: heading && list ? (() => { const a = box(heading), b = box(list); return { x: b.x, y: a.y, w: b.w, h: b.y + b.h - a.y }; })() : null,
  };
};

// 行に「WebClass / Classroom」の札を付ける課題（出どころは scripts/demo-seed.mjs の科目で決まる）
const TAGGED = [
  { title: "第4回 演習（プロセスとスレッド）", source: "webclass" },
  { title: "レポート2 ソートアルゴリズムの比較", source: "webclass" },
  { title: "課題7 連結リストの実装", source: "classroom" },
  { title: "ER 図の作成レポート", source: "webclass" },
  { title: "Unit 5 Speaking Log", source: "classroom" },
];

/**
 * 入場アニメーションを最後まで進める。時計を差し替えている（clock.install）と、
 * motion のアニメーションが途中で止まって薄いまま撮れることがあるため
 */
const settle = async (page) => {
  await page.clock.runFor(3000).catch(() => {});
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }));
  await page.waitForTimeout(300);
};

const browser = await chromium.launch({ executablePath: CHROME });
await mkdir(OUT, { recursive: true });
const shots = {};

// ホーム。棒グラフの木曜を押す前と後
{
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "ja-JP", timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
  await ctx.clock.install({ time: new Date(DEMO_CLOCK) });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(SEED);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("あと", { exact: false }).first().waitFor({ timeout: 15000 });
  await page.locator('button[aria-label="セットアップの案内を閉じる"]').first().click();
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(1200);

  await settle(page);
  await page.screenshot({ path: `${OUT}/home.png`, fullPage: true });
  shots.home = await page.evaluate(MEASURE, TAGGED.map((t) => t.title));
  shots.home.rows = shots.home.rows.map((r) => ({ ...r, source: TAGGED.find((t) => t.title === r.title).source }));

  await page.locator('[aria-label="曜日ごとの締切"] button').nth(3).click();
  // 選んだ日のブロックは入場アニメーションがあるので、見えるまで待ってから撮る
  const block = page.getByRole("heading", { name: /10月1日/ });
  await block.waitFor({ state: "visible" });
  await block.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  await settle(page);
  await page.screenshot({ path: `${OUT}/home-picked.png`, fullPage: true });
  shots.picked = await page.evaluate(MEASURE);
  await ctx.close();
  console.log("撮影: home / home-picked");
}

// カレンダー（月）。9月30日を押す前と後。ログイン画面
{
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "ja-JP", timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
  await ctx.clock.install({ time: new Date(DEMO_CLOCK) });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(SEED);
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(1500);
  await settle(page);
  await page.screenshot({ path: `${OUT}/login.png` });
  const g = page.locator('button:has-text("Google でログイン"), a:has-text("Google でログイン")').first();
  const gb = await g.boundingBox();
  shots.login = { button: { x: Math.round(gb.x), y: Math.round(gb.y), w: Math.round(gb.width), h: Math.round(gb.height) } };

  await page.goto(BASE + "/calendar", { waitUntil: "networkidle" });
  await page.getByText("この月", { exact: false }).first().waitFor({ timeout: 15000 });
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(800);
  await settle(page);
  await page.screenshot({ path: `${OUT}/calendar.png`, fullPage: true });
  shots.calendar = await page.evaluate(MEASURE_CAL);
  await page.locator('button[aria-label^="9月30日"]').click();
  const day = page.getByRole("heading", { name: /9月30日/ });
  await day.waitFor({ state: "visible" });
  await page.mouse.move(0, 0); // 押した日付にホバーの色が残らないように
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(800);
  await settle(page);
  await page.screenshot({ path: `${OUT}/calendar-picked.png`, fullPage: true });
  shots.calendarPicked = await page.evaluate(MEASURE_CAL);
  await ctx.close();
  console.log("撮影: login / calendar / calendar-picked");
}

// 届くメール（本物のテンプレート）。今日 19:59 締切の課題に、3時間前に届くもの
{
  const due = new Date("2026-09-29T19:59:00+09:00");
  const { html } = renderDeadlineEmail({
    assignmentTitle: "レポート2 ソートアルゴリズムの比較",
    courseName: "アルゴリズムとデータ構造",
    timeLabel: "3時間",
    dueDate: due,
    link: "https://example.com/",
    appUrl: BASE,
  });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "ja-JP" });
  const page = await ctx.newPage();
  // アイコン画像を dev サーバから読めるよう、同じオリジンの URL でメールの HTML を返す
  await page.route(BASE + "/__teaser-mail", (r) => r.fulfill({ body: html, contentType: "text/html; charset=utf-8" }));
  await page.goto(BASE + "/__teaser-mail", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/mail.png`, fullPage: true });
  shots.mail = { height: await page.evaluate(() => document.documentElement.scrollHeight) };
  await ctx.close();
  console.log("撮影: mail");
}

await browser.close();
shots.viewport = VIEWPORT;
await writeFile("video/src/teaser/shots.json", JSON.stringify(shots, null, 2) + "\n");
console.log("完了（位置は video/src/teaser/shots.json）");
