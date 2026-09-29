# video（OG 画像・紹介動画）

[Remotion](https://www.remotion.dev/) で、共有カード（OG 画像）や紹介動画を React で作る。
アプリとは別の依存で、Vercel のビルドには含まれない（ルートの `tsconfig.json` と ESLint から外してある）。

```bash
cd video
npm install
npm run studio   # ブラウザで見ながら直す
npm run og       # public/og.png（1200×630）に書き出す
npm run teaser   # out/teaser.mp4（X 用の紹介動画・1080×1080）
npm run teaser:wide  # out/teaser-wide.mp4（同じ構成の横長・1920×1080）
```

- 画面の画像は本物の UI をデモデータ（`scripts/demo-seed.mjs`）で撮る。時計は 2026-09-29 18:52 に止めるので毎回同じ画面になる（dev サーバを起動しておく）
  - OG に入れるホーム: `ONLY=og-home node scripts/shots.mjs`
  - 紹介動画のホーム（ページ全体・木曜を押す前と後）とメール: `node --experimental-strip-types scripts/teaser-shots.mjs`。
    カメラとカーソルの行き先（要素の位置）も `src/teaser/shots.json` に書き出すので、UI が変わったらこれを流し直して書き出し直す
- 紹介動画の組み立ては `src/teaser/`。場面は `scenes/`、見出しと中身の並べ方（正方形・横長）は `stage.tsx`、寄る・カーソル・波紋は `camera.tsx`
- デモデータに実在の氏名・学籍番号は入れない。WebClass・Classroom の画面は撮らず、窓とスケルトンで描く
- 色と書体はアプリに合わせる（`src/app/globals.css` のライトのトークン、ワードマークは Plus Jakarta Sans）
- 他社のロゴ（Google Classroom・WebClass）は入れない。サービス名は文字だけで書く
- OG を差し替えたら `src/app/layout.tsx` の `?v=` を上げる（LINE・X が古い画像をキャッシュしているため）
- 手元に Chrome があればそれを使う（`remotion.config.ts`）。Remotion は個人・3人以下の会社なら無料
