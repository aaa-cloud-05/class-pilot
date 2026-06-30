# Class Pilot アーキテクチャ / データフロー

最終更新: 2026-06-30

Google Classroom + WebClass の課題管理 PWA。本ドキュメントは**データの保存場所と流れ**を中心に
現行構成をまとめる。設計の経緯は [phase-plan.md](./phase-plan.md) / [auth-decision-log.md](./auth-decision-log.md) を参照。

## 技術スタック

- Next.js 16 (App Router) + TypeScript + Tailwind CSS / Vercel
- NextAuth.js v5（JWT戦略 + PrismaAdapter）/ Google OAuth
- Supabase PostgreSQL + Prisma v6
- IndexedDB（`idb`）/ Service Worker（PWA・通知）

## ストレージ層（どこに何があるか）

| 層 | 実体 | 役割 | 真実のソースか |
|---|---|---|---|
| **DB（Postgres）** | `Assignment` / `NotificationSetting` / `NotificationHistory` ほか | ログイン中ユーザーの課題・設定の保管 | ✅ ログイン中の真実のソース |
| **IndexedDB** | `assignments` / `notification-settings` / `notification-history` | 表示用ミラー（ログイン中）／一次ストア（未ログイン） | ⛔ ログイン中はミラー / ✅ 未ログイン時のみ一次 |
| **JWT Cookie** | NextAuth セッション | `user.id` と Google `accessToken`/`refreshToken` を保持 | 認証状態 |
| **localStorage** | `db-migrated` フラグ | 一度きりの移行ガード | — |

**大原則**：ログイン中は **DB が真実のソース**、IndexedDB は「開いた瞬間に素早く描画するための
ミラー」。**「自分の課題を読む」操作は Google アクセストークンに依存しない**（DB読み取りだけで完結）。
Google 同期はトークンが要るが、これは別経路に分離している。

## 読み取りと同期の分離（最重要）

```
GET  /api/assignments      … DBの課題を返すだけ。Googleを叩かない。user.id のみで動く（速い・落ちない）
POST /api/classroom/sync   … Google取得→DB upsert→最新のDB課題を返す。トークン必要。
                              トークン無し/Google失敗でも 401/500 で止めず DB課題を返す
```

旧 `GET /api/classroom`（Google同期を内包した単一経路）は廃止。これにより「トークン期限切れ・
長時間放置・コールドスタートで取得できない」状態を構造的に解消した。

## データフロー① ログイン中にアプリを開く（SWR 3段）

`src/hooks/useAssignments.ts` の `init()`。各段は独立した try/catch で、後段が失敗しても前段の表示は残る。

```
[アプリ起動 / ログイン]
   │
   ├─ 段1: getCachedAssignments()            IndexedDB → 即 setAssignments（あれば即描画）
   │
   ├─ migrateLocalData()                     初回のみ wc-/manual- をDBへ push（local→server）
   ├─ pullNotificationSettings()             GET /api/notifications/settings → ローカルへ反映（server→local）
   │
   ├─ 段2: GET /api/assignments              DB高速読込（hiddenフィルタ済・トークン不要）
   │        → setAssignments + replaceCache  ★毎回必ず実行。キャッシュ空でもここで素早く正しい表示
   │
   └─ 段3: POST /api/classroom/sync          Google同期（裏で実行・await しない）
            → setAssignments + replaceCache  lastSyncTime で間引き（5分以内ならスキップ）
                                             失敗（トークン期限切れ等）しても段1/2の表示を維持
```

- **段2を throttle しない**のが要点。これにより「キャッシュ空＋直近同期済み」でも空白にならない。
- 段3だけ `lastSyncTime`（モジュール変数）で 5 分間引き、Google API 呼び出しを抑制。
- `refresh()` は 段2 + 段3（force）を実行。

## データフロー② 未ログインでアプリを開く

```
[アプリ起動]
   └─ 段1: getCachedAssignments() → 表示（IndexedDB が一次ストア）
      loggedIn=false なので DB読込/Google同期は行わずここで終了
```

WebClass 取り込み・手動追加もすべて IndexedDB に直接保存される。

## データフロー③ 追加・編集・削除（楽観更新 + 部分書込）

サーバの応答で **state とキャッシュを部分更新**する。全件再取得や Google 同期に依存しない。
キャッシュは「全置換」ではなく「単一更新」を使う（他の課題を消さないため）。

```
追加  /add → POST /api/assignments → 応答を upsertCache(1件) + 画面へ          （未ログインは IndexedDB へ upsertCache）
編集  EditDialog → PATCH /api/assignments/[id] → 応答で applyEdit()（state置換 + upsertCache）
削除  カードメニュー → DELETE /api/assignments/[id] → removeAssignment()（stateから除去 + removeCache）
```

- 編集/削除はソフトデリート・`editedFields` により、後続の Google 同期で上書きされない
  （`src/lib/server/assignments.ts`）。
- キャッシュ書込関数の意味（`src/lib/cache.ts`）：
  - `replaceCache(list)` … 全置換（DB全件読込・全同期の結果のみ）
  - `upsertCache(item)` … 単一追加/更新（他を消さない）
  - `removeCache(id)` … 単一削除
  - Safari 対策: トランザクション内で `await` しない（自動コミットで `TransactionInactiveError`
    になるため、操作を同期発行して最後に `tx.done` を待つ）

## データフロー④ WebClass 取り込み（ブックマークレット）

```
WebClass ダッシュボードでブックマークレット実行
   → 抽出データを /import#<JSON> として開く
   → transformWebClassTasks() で正規化
   ├─ ログイン中: POST /api/import/webclass（hiddenフィルタ→DB upsert）→ replaceCache → ホームへ
   └─ 未ログイン: cacheWebClassAssignments()（IndexedDB の wc- を置換）→ ホームへ
```

## データフロー⑤ コースの表示/非表示（追跡管理）

確認ポップアップは廃止。新規コースの課題は自動取込し、**設定画面で非表示/再追跡を管理**する。
`hiddenCourses`（`NotificationSetting`）が唯一の制御点。

```
設定 → コース管理（GET /api/courses が非表示含む全コースを返す）
   非表示にする  : hiddenCourses に courseId 追加（PATCH /api/notifications/settings + ローカル保存）
   再追跡する    : hiddenCourses から courseId 削除 → refresh() で再同期
```

`hiddenCourses` は2か所で効く：
- 表示: `getUserAssignments(userId, hiddenCourseIds)` が `courseId notIn hidden` で除外
- 同期: `fetchAllData(token, hiddenCourseIds)` が非表示コースの courseWork 取得をスキップ

## データフロー⑥ 通知

**クライアント通知**（ブラウザ・PWA）: `NotificationScheduler` が起動時/可視化時に `checkAndNotify()`
を実行。**IndexedDB のキャッシュ課題**とローカル通知設定を突き合わせ、プリセットのタイミングで
`Notification`/Service Worker 通知を出す。送信済みは `notification-history`（IndexedDB）で重複防止。

**メール通知**（サーバ・Cron）: `vercel.json` の cron（毎日 21:00 UTC）が `GET /api/cron/notify` を叩く。
`CRON_SECRET` で認証。各ユーザーの `refresh_token` でアクセストークンを更新し、Google から取得→
`computePendingNotifications()` で送信対象を算出→ Resend でメール送信→ `NotificationHistory`
（channel=email）で重複防止。

## 設定（NotificationSetting）のデータフロー

- **真実のソースはサーバ**。ログイン時は `pullNotificationSettings()` で **server→local に pull** のみ。
  以前の「ローカルのデフォルトを push」は廃止（キャッシュ消去・別端末ログインでサーバ設定が
  消える不具合を解消）。
- 設定変更（設定画面）は **サーバ（PATCH）とローカル（IndexedDB）の両方に書く**ので以後一致する。
- 保持項目: `enabled` / `preset` / `emailEnabled` / `mutedCourses` / `mutedAssignments` / `hiddenCourses`。

## API エンドポイント一覧

| メソッド・パス | 用途 | 認証/必要物 |
|---|---|---|
| `GET /api/assignments` | DBの課題を返す（hiddenフィルタ済） | session.user.id |
| `POST /api/assignments` | 手動課題の作成 | session.user.id |
| `PATCH/DELETE /api/assignments/[id]` | 編集 / ソフトデリート | session.user.id |
| `POST /api/classroom/sync` | Google同期→DB upsert→DB課題返却 | accessToken（無くてもDB返却） |
| `GET /api/courses` | 全コース（非表示含む）+ hiddenCourses | session.user.id |
| `POST /api/import/webclass` | WebClass取り込み→DB upsert | session.user.id |
| `GET/PATCH /api/notifications/settings` | 通知設定の取得/更新 | session.user.id |
| `GET /api/cron/notify` | メール通知バッチ | CRON_SECRET |
| `/api/auth/[...nextauth]` | NextAuth | — |

## 主要ファイル

```
src/hooks/useAssignments.ts          SWR 3段の取得ロジック（段1キャッシュ/段2 DB/段3 同期）
src/lib/cache.ts                     IndexedDB 操作（replace/upsert/remove）
src/lib/db.ts                        IndexedDB スキーマ（DB名 classroom-reminder / v3）
src/lib/server/assignments.ts        DB アクセス（getUserAssignments/sync/edit/softDelete/getUserCourses）
src/lib/classroom-api.ts             Google Classroom API（fetchAllData は hidden をスキップ）
src/lib/transform.ts                 Google生データ → Assignment 変換
src/lib/notification-store.ts        IndexedDB の通知設定/履歴
src/lib/notification-scheduler.ts    クライアント通知（checkAndNotify）
src/lib/debug-clear.ts               ローカル全データ削除（デバッグ用・設定画面）
src/auth.ts                          NextAuth 設定・トークン更新
prisma/schema.prisma                 DB スキーマ
```

## 設計が満たすユースケース

| ケース | 挙動 |
|---|---|
| ログイン中・キャッシュ有り | 段1で即描画 → 段2/3で更新 |
| ログイン中・キャッシュ無し（別端末/消去後/初回） | 段2のDB読込で素早く表示（空白で固まらない） |
| 長時間放置・トークン期限切れ | DB読込(段2)は常に成功し表示。Google同期(段3)失敗はスキップ |
| オフライン | 段1のキャッシュ表示が残る（読み取り専用）。変更操作はオンライン前提 |
| 手動追加 / 編集 / 削除 | 楽観更新 + 部分書込（全件再取得・同期非依存） |
| 別端末ログイン / キャッシュ消去 | 設定はサーバから pull のみ。サーバ設定を壊さない |
| 未ログイン | IndexedDB が一次ストア |
