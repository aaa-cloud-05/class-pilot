// README 用のスクリーンショットを撮る。
//
//   1. dev サーバを起動する（npm run dev）
//   2. node scripts/shots.mjs
//
// デモ用の課題（scripts/demo-seed.mjs）を IndexedDB に入れてから撮るので、未ログイン・実データなしの状態で
// 画面を再現できる。時計は DEMO_CLOCK に止めるので、いつ撮っても同じ画面になる。公開ディレクトリには何も置かない。
//
// 既にインストールされている Chrome を使うため、ブラウザのダウンロードは発生しない。

import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { DEMO_CLOCK, SEED } from "./demo-seed.mjs";

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
  { name: "settings-desktop", path: "/settings/notifications", viewport: DESKTOP, wait: "締切をメールで知らせる" },
  // OG 画像（video/）に入れるホーム。セットアップの案内は閉じておく
  { name: "home-mobile", dir: "video/public", path: "/", viewport: MOBILE, wait: "あと", click: 'button[aria-label="セットアップの案内を閉じる"]', key: "og-home" },
];

/** ONLY=og-home のように名前（key か name）を渡すと、それだけ撮る */
const ONLY = process.env.ONLY?.split(",");
const TARGETS = ONLY ? SHOTS.filter((s) => ONLY.includes(s.key ?? s.name)) : SHOTS.filter((s) => !s.key);

const browser = await chromium.launch({ executablePath: CHROME });
await mkdir(OUT, { recursive: true });

for (const s of TARGETS) {
  const ctx = await browser.newContext({
    viewport: s.viewport,
    deviceScaleFactor: 2,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce", // 入場アニメーションの途中で撮らないため
  });
  await ctx.clock.setFixedTime(new Date(DEMO_CLOCK));
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
  await page.waitForTimeout(2500); // 棒グラフなどの入場アニメーションが終わるまで
  await mkdir(s.dir ?? OUT, { recursive: true });
  await page.screenshot({ path: `${s.dir ?? OUT}/${s.name}.png` });
  console.log("撮影:", s.name, `${s.viewport.width}x${s.viewport.height}`);
  await ctx.close();
}

await browser.close();
console.log("完了");
