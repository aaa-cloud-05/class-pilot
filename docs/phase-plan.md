# Class Pilot: 実装計画と設計方針

## 全体フェーズ

```
Phase 0: DB基盤（Supabase + Prisma + NextAuth adapter）        ✅ 完了
Phase 1: メール通知（Resend + Vercel Cron）                     ✅ 完了
Phase 2: サーバーサイド課題保存 + スマート同期                    ✅ 完了
Phase 3: タスク編集 + カスタムフィールド + ソフトデリート          ⬜ 未着手
Phase 4: 通知設定のDB同期 + 既存データ移行                       ⬜ 未着手
```

## デュアルストレージ方針

- **未ログイン**: IndexedDBのみ。従来通り動作
- **ログイン済み**: DBを正とし、IndexedDBはオフラインキャッシュとして残す
- IndexedDB関連コード（`db.ts`, `cache.ts`, `notification-store.ts`）は削除しない

## Phase 0+1（完了）

### 実装内容
- Supabase PostgreSQL + Prisma v6 + NextAuth PrismaAdapter
- ログイン時にUser/AccountがDBに自動保存
- Resend + Vercel Cron（毎日JST 06:00）によるメール通知
- 通知設定API（GET/PATCH `/api/notifications/settings`）
- 設定画面にメール通知トグル追加

### 既知の制限
- プリセット・ミュートの変更はIndexedDBのみに保存され、メール通知には反映されない（Phase 4で解消）
- `onboarding@resend.dev`はResendアカウント所有者宛にしか届かない（独自ドメイン認証で解消）
- Cronは1日1回のため、実行後に追加された短納期課題は翌朝まで検知されない

## Phase 2: サーバーサイド課題保存 + スマート同期（完了）

### 目標
課題データをDBに保存し、Classroom/WebClass再取得時にユーザー編集を保護する。

### 実装内容
- `src/lib/server/assignments.ts` — CRUD + スマート同期ロジック
- `GET/POST /api/assignments` — 全課題取得 / 手動追加
- `POST /api/import/webclass` — WebClass課題のDB同期
- `GET /api/classroom` 改修 — Classroom取得 → DB同期 → 全課題返却
- `useAssignments` フック — 5分TTLデデュプ + デュアルストレージ
- `import/page.tsx` — ログイン時はAPI経由でDB保存
- `add/page.tsx` — ログイン時はAPI経由でDB保存

### データフロー
```
ログイン済み:
  1. IndexedDBキャッシュから即時表示（UX）
  2. GET /api/classroom → Google API取得 → DB同期 → 全課題をDBから返却
  3. 結果をIndexedDBにもキャッシュ（clearCache + cacheAssignments）
  4. 5分以内の再アクセスはキャッシュを使用（API呼び出しなし）
未ログイン:
  1. IndexedDBから表示（従来通り）
```

### スマート同期アルゴリズム
- **sourceKey**で同一タスクを識別:
  - Classroom: `"classroom:<courseId>:<workId>"`
  - WebClass: `"webclass:<courseName>::<title>"`
  - Manual: `null`（sourceKeyなし）
- 既存あり＆`deletedAt != null` → スキップ（ユーザー削除済み）
- 既存あり → `editedFields`にないフィールドのみ更新
- 既存なし → `createMany`で一括挿入（`skipDuplicates: true`）

### 最適化
- **API呼び出しデデュプ**: モジュールレベル変数で最終取得時刻を保持、5分TTL
- **一括読み取り**: 全既存レコードを1クエリで取得→Map化して高速マッチング
- **一括挿入**: 新規レコードは`createMany`で1クエリ

## Phase 3: タスク編集 + カスタムフィールド + ソフトデリート

- 編集API（`PATCH /api/assignments/:id`）→ `editedFields`に追記
- ソフトデリート（`DELETE /api/assignments/:id`）→ `deletedAt`設定
- カスタムフィールド（`customFields` JSONカラム）
- ログイン必須の機能として実装（未ログインではUI非表示）

## Phase 4: 通知設定のDB同期 + 既存データ移行

- 設定変更時にIndexedDB **と** DB の両方に保存（ログイン済みの場合）
- 既存IndexedDBデータの一回限りDB移行（`localStorage`で移行済みチェック）
- 未使用ファイル削除: `src/lib/auth.ts`, `src/lib/gis.d.ts`（済）

## リソース見積もり

### Google Classroom API
- `fetchAllData()` 1回あたり: 1 + 2N 回（N = コース数）
- 8コースの場合: 17回/リフレッシュ、約100回/日/ユーザー
- Phase 2のデデュプで大幅削減予定

### Supabase無料枠
- 500MB: 課題データは数KB/件、1000件でも数MB。余裕あり
- クエリ数: 無制限。帯域5GB/月も余裕あり

### Vercel Hobby
- Cron: 1日1回（`scheduledAt`で補完）
- 関数実行時間: 10秒制限（ユーザー数増加時に注意）

### Resend無料枠
- 100通/日。ユーザー数 × 課題数 × 通知タイプ数がこの範囲に収まる必要あり
