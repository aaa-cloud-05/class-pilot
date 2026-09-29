// 紹介動画（video/ の teaser）に入れる、本物の画面を撮る。
//
//   1. dev サーバを起動する（npm run dev）
//   2. node --experimental-strip-types scripts/teaser-shots.mjs
//
// デモデータ（scripts/demo-seed.mjs）で、スマホのホームをページ全体まで 3 倍で撮る。
// 動画の中でスクロール・ズームするので、カメラとカーソルの行き先になる要素の位置（CSS px）も
// video/src/teaser/shots.json に書き出す。UI が変わったらこれを流し直せば動画も追従する。

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
const MEASURE = () => {
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
  };
};

const browser = await chromium.launch({ executablePath: CHROME });
await mkdir(OUT, { recursive: true });
const shots = {};

// ホーム。棒グラフの木曜を押す前と後
{
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, locale: "ja-JP", timezoneId: "Asia/Tokyo", reducedMotion: "reduce" });
  await ctx.clock.setFixedTime(new Date(DEMO_CLOCK));
  const page = await ctx.newPage();
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(SEED);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("あと", { exact: false }).first().waitFor({ timeout: 15000 });
  await page.locator('button[aria-label="セットアップの案内を閉じる"]').first().click();
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(1200);

  await page.screenshot({ path: `${OUT}/home.png`, fullPage: true });
  shots.home = await page.evaluate(MEASURE);

  await page.locator('[aria-label="曜日ごとの締切"] button').nth(3).click();
  // 選んだ日のブロックは入場アニメーションがあるので、見えるまで待ってから撮る
  const block = page.getByRole("heading", { name: /10月1日/ });
  await block.waitFor({ state: "visible" });
  await block.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/home-picked.png`, fullPage: true });
  shots.picked = await page.evaluate(MEASURE);
  await ctx.close();
  console.log("撮影: home / home-picked");
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
