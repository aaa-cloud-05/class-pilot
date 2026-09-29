# video（OG 画像・紹介動画）

[Remotion](https://www.remotion.dev/) で、共有カード（OG 画像）や紹介動画を React で作る。
アプリとは別の依存で、Vercel のビルドには含まれない（ルートの `tsconfig.json` と ESLint から外してある）。

```bash
cd video
npm install
npm run studio   # ブラウザで見ながら直す
npm run og       # public/og.png（1200×630）に書き出す
```

- 画面の画像は `node scripts/shots.mjs` のデモデータで撮る。OG に入れるホームは `ONLY=og-home node scripts/shots.mjs`（dev サーバを起動しておく）
- 色と書体はアプリに合わせる（`src/app/globals.css` のライトのトークン、ワードマークは Plus Jakarta Sans）
- 他社のロゴ（Google Classroom・WebClass）は入れない。サービス名は文字だけで書く
- OG を差し替えたら `src/app/layout.tsx` の `?v=` を上げる（LINE・X が古い画像をキャッシュしているため）
- 手元に Chrome があればそれを使う（`remotion.config.ts`）。Remotion は個人・3人以下の会社なら無料
