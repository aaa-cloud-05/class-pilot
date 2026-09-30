# video（OG 画像・紹介動画・使い方の動画）

[Remotion](https://www.remotion.dev/) で、共有カード（OG 画像）や動画を React で作る。
アプリとは別の依存で、Vercel のビルドには含まれない（ルートの `tsconfig.json` と ESLint から外してある）。構成は [docs/video-plan.md](../docs/video-plan.md)。

```bash
cd video
npm install
npm run studio       # ブラウザで見ながら直す
npm run og           # ../public/og.png（1200×630）
npm run teaser       # out/teaser.mp4（X 用の紹介動画・1080×1080・約29秒）
npm run teaser:wide  # out/teaser-wide.mp4（同じ構成の横長・1920×1080）
npm run guide        # out/guide.mp4（使い方の動画・1920×1080・約1分30秒）
npm run audio        # public/audio/ の BGM と効果音を作り直す
node scripts/stills.mjs guide 100 400   # 途中のコマを out/stills/ に PNG で書き出す（見た目の確認用）
```

## 画面の撮り方

アプリの画面は本物の UI をデモデータ（`../scripts/demo-seed.mjs`）で撮る。時計を 2026-09-29 18:52 から動かすので、毎回同じ画面になる。
dev サーバ（リポジトリの直下で `npm run dev`）を起動してから、リポジトリの直下で流す。

| 何に使う | コマンド | 書き出す先 |
|---|---|---|
| OG のホーム | `ONLY=og-home node scripts/shots.mjs` | `public/home-mobile.png` |
| 紹介動画（ホーム・カレンダー・ログイン・メール） | `node --experimental-strip-types scripts/teaser-shots.mjs` | `public/teaser/`・`src/teaser/shots.json` |
| 使い方の動画（PC とスマホのセットアップ・取り込み） | `node scripts/guide-shots.mjs` | `public/guide/`・`src/guide/shots.json` |

`shots.json` にはカメラとカーソルの行き先（ボタンや見出しの位置）も入るので、UI が変わったら撮り直して書き出し直せば動画も追従する。

## 組み立て

- `src/teaser/` 紹介動画。場面は `scenes/`、見出しと中身の並べ方（正方形・横長）は `stage.tsx`、寄る・カーソル・波紋・囲みは `camera.tsx`
- `src/guide/` 使い方の動画。左に説明・右に画面の並べ方は `GuideStage.tsx`。ブラウザ（Chrome・Safari）・Google の許可画面・WebClass は `ui/` で描いたもの
- `src/parts/` 共通の部品（スマホの枠・メールのカード・札・効果音）。色と書体は `src/theme.ts`（アプリのライトのトークン、ワードマークは Plus Jakarta Sans）
- 音は `scripts/make-audio.mjs` で合成した WAV（`public/audio/`）。BGM は `Html5Audio`、効果音は `parts/Sfx.tsx`

## 決まりごと

- 実在の氏名・学籍番号・大学名・メールアドレスは映さない（スケルトンにする）。デモデータにも入れない
- 他社のロゴ（Google Classroom・WebClass）は入れない。サービス名は文字だけで書く。WebClass・Classroom の画面は撮らず、描く
- 画面録画を参考にするときも、録画そのものは使わない・リポジトリに入れない
- OG を差し替えたら `../src/app/layout.tsx` の `?v=` を上げる（LINE・X が古い画像をキャッシュしているため）
- 動画は BT.709（yuv420p）で書き出す（`remotion.config.ts`。既定のままだと X などで弾かれることがある）
- 手元に Chrome があればそれを使う（`remotion.config.ts`）。Remotion は個人・3人以下の会社なら無料
