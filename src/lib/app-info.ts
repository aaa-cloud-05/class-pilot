/**
 * アプリのバージョン。package.json の version をビルド時に埋め込む（next.config.ts の env）。
 * 0.x の間は、区切りの大きい変更でマイナー、本番に出すたびにパッチを上げる（CHANGELOG.md）。
 */
export const APP_VERSION = process.env.APP_VERSION ?? ""

/** Vercel でビルドしたときのコミット（7桁）。手元では空 */
export const APP_COMMIT = process.env.APP_COMMIT ?? ""

/** 画面に出す形「0.12.0（a1b2c3d）」 */
export const VERSION_LABEL = APP_COMMIT ? `${APP_VERSION}（${APP_COMMIT}）` : APP_VERSION
