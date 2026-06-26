# Phase 2: サーバーサイド課題保存 + スマート同期 — 実装詳細

## 実装内容

### 1. サーバーサイド課題管理ロジック（新規）

**`src/lib/server/assignments.ts`**

| 関数 | 役割 |
|------|------|
| `getUserAssignments(userId)` | DBから未削除の全課題を取得（締切日昇順、nullは末尾） |
| `syncClassroomAssignments(userId, assignments)` | Classroom課題をDBにスマート同期 |
| `syncWebClassAssignments(userId, assignments)` | WebClass課題をDBにスマート同期 |
| `createManualAssignment(userId, data)` | 手動課題をDBに新規作成 |

**スマート同期アルゴリズム:**

1. 受信した課題ごとに`sourceKey`を生成
   - Classroom: `classroom:{courseId}:{workId}`
   - WebClass: `webclass:{courseName}::{title}`
2. そのユーザーの既存レコードを`sourceKey`で一括取得（1クエリ）
3. 各課題について:
   - 既存あり＆`deletedAt`あり → **スキップ**（ユーザーが削除済み）
   - 既存あり＆`deletedAt`なし → `editedFields`に含まれない**フィールドだけ更新**
   - 既存なし → 新規作成リストに追加
4. 新規分は`createMany({ skipDuplicates: true })`で一括挿入

**クライアントへのID返却:**

- DB内部IDは`cuid()`だが、クライアントには`externalId`を返す
- Classroom: `externalId = work.id`（Googleの元ID）
- WebClass: `externalId = wc-{hash}`（元のハッシュID）
- 手動: `externalId`なし → DB内部の`cuid()`がそのまま`id`になる

### 2. 課題APIエンドポイント（新規）

**`GET/POST /api/assignments`**

| メソッド | 動作 |
|---------|------|
| `GET` | セッションからuserIdを取得 → `getUserAssignments()` → JSON返却 |
| `POST` | リクエストボディから課題データを取得 → `createManualAssignment()` → 作成した課題を返却 |

**`POST /api/import/webclass`**

| メソッド | 動作 |
|---------|------|
| `POST` | WebClass課題の配列を受信 → `syncWebClassAssignments()` → 全課題を`getUserAssignments()`で返却 |

### 3. Classroom APIルート改修

**`GET /api/classroom`**

- **旧動作:** Google APIから取得 → そのまま返却
- **新動作:** Google APIから取得 → **DBに同期** → **DBから全課題を返却**

Classroom取得時にWebClassや手動追加の課題も含めた全課題が返る。

### 4. useAssignmentsフック改修

**`src/hooks/useAssignments.ts`**

**追加: 5分TTLデデュプ**

- モジュールレベル変数`lastFetchTime`で最終取得時刻を保持
- ページ遷移時のマウントで、前回取得から5分以内ならAPIを叩かずIndexedDBキャッシュを表示
- `refresh()`（ユーザー手動リフレッシュ）は常にAPIを呼ぶ（TTL無視）

**追加: IndexedDBキャッシュの完全リフレッシュ**

- 旧: `cacheAssignments()`（put=upsert、古いデータが残る）
- 新: `clearCache()` → `cacheAssignments()`（全削除→全挿入、ゴミデータなし）

### 5. インポートページ改修

**`src/app/import/page.tsx`**

- `useSession()`でログイン状態を判定（`sessionStatus === "loading"`中は処理を待機）
- **ログイン済み:** `POST /api/import/webclass` → DB保存 → IndexedDBキャッシュ更新
- **未ログイン:** `cacheWebClassAssignments()`（従来のIndexedDB直接書き込み）

### 6. 課題追加ページ改修

**`src/app/add/page.tsx`**

- `useSession()`でログイン状態を判定
- **ログイン済み:** `POST /api/assignments` → DB保存 → IndexedDBにもキャッシュ
- **未ログイン:** `cacheAssignments()`（従来のIndexedDB直接書き込み）

---

## 想定される動作フロー

### ログイン済みユーザー

**ホーム画面を開いた時:**

```
1. IndexedDBキャッシュから即時表示（0ms〜数十ms）
2. 最終取得から5分経過していれば:
   → GET /api/classroom
   → サーバーがGoogle APIから全課題取得
   → DBにClassroom課題をスマート同期
   → DBから全課題（Classroom+WebClass+手動）を返却
   → クライアントがIndexedDBを完全リフレッシュ
   → 画面を最新データで更新
3. 5分以内なら:
   → APIを叩かず、IndexedDBキャッシュをそのまま表示
```

**ページ遷移（ホーム→カレンダー→振り返り）:**

```
- 各ページでuseAssignmentsがマウント
- TTL内（5分）なのでAPIは呼ばれない
- IndexedDBキャッシュから即時表示
- 旧: 3回Google APIを叩いていた → 新: 0回
```

**課題を手動追加:**

```
1. フォーム入力 → 送信
2. POST /api/assignments → DBに保存
3. 返却された課題をIndexedDBにもキャッシュ
4. ホームにリダイレクト
5. ホームでuseAssignmentsが初期化 → IndexedDBから表示 + API再取得
```

**WebClassインポート:**

```
1. WebClassでブックマークレット実行 → Class Pilotにリダイレクト
2. セッション解決を待機（loading → authenticated）
3. POST /api/import/webclass → DBにスマート同期
4. 返却された全課題でIndexedDBを完全リフレッシュ
5. 1.5秒後にホームへリダイレクト
```

**2回目のWebClassインポート（同じ課題）:**

```
1. POST /api/import/webclass
2. sourceKeyで既存課題を発見 → editedFieldsにないフィールドのみ更新
3. 締切や状態が変わっていれば更新、変わっていなければスキップ
4. 重複は発生しない
```

### 未ログインユーザー

**全ての動作が従来通り:**

- ホーム: IndexedDBから表示、APIは呼ばない
- 課題追加: IndexedDBに直接保存
- WebClassインポート: IndexedDBに直接保存
- DB関連の処理は一切発生しない

### Cronメール通知（変更なし）

```
- 従来通りGoogle APIから直接取得して通知を計算
- DB上の課題データは使用しない（Phase 2では未改修）
- NotificationHistoryのassignmentIdはClassroom work.idのまま
```

---

## Phase 2で解消された問題

| 問題 | 解消方法 |
|------|---------|
| IndexedDBにゴミデータ蓄積 | `clearCache()` + `cacheAssignments()`で毎回全置換 |
| ページ遷移のたびにAPI呼び出し | 5分TTLデデュプ（`lastFetchTime`モジュール変数） |
| 課題データがDB未保存 | Classroom/WebClass/手動すべてDBに保存 |

## Phase 2で残存する制限

| 制限 | 対応予定 |
|------|---------|
| CronがDBデータを使わない | 将来改修（優先度低） |
| 未ログイン→ログイン時のデータ移行なし | Phase 4 |
| タスク編集・削除UIなし | Phase 3 |
| 通知設定のDB未同期（プリセット・ミュート） | Phase 4 |
