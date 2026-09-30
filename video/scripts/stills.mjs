// 動画の途中のコマを何枚かまとめて PNG に書き出す（見た目の確認用。1回の bundle で済むので速い）。
//
//   cd video && node scripts/stills.mjs guide 100 250 400
//   → out/stills/guide-100.png …
//
// SCALE=0.5 のように縮小して書き出せる。

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [id, ...frames] = process.argv.slice(2);
if (!id || frames.length === 0) {
  console.error("使い方: node scripts/stills.mjs <composition> <frame> [frame...]");
  process.exit(1);
}
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browserExecutable = existsSync(CHROME) ? CHROME : null;
const scale = Number(process.env.SCALE ?? 0.5);

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
await mkdir("out/stills", { recursive: true });
for (const f of frames.map(Number)) {
  const output = `out/stills/${id}-${f}.png`;
  await renderStill({ composition, serveUrl, frame: f, output, scale, browserExecutable });
  console.log(output);
}
