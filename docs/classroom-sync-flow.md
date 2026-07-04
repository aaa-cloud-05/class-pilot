# Classroom 同期・最終更新のデータフロー（現状・懸念・あるべき姿）

最終更新: 2026-07-04 ／ 対象コード: main（PR #38, #39, #40 マージ済み）
構成全体の正本は `docs/architecture.md`。本書は「Classroom 取得と最終更新表示」に絞った詳細版。

## 1. あるべき姿（ユーザー要件）

| # | 操作 | 期待される動作 |
|---|------|----------------|
| 1 | ログイン | Google から取得→表示、Classroom「たった今」 ✅ できている |
| 2 | 更新ボタン押下 | 再取得→表示更新、「〇分前」→「たった今」 ❌ 現在「同期に失敗」になる |
| 3 | 失敗時 | 理由が分かる表示＋回復導線（再ログイン等）。無言で固まらない |

## 2. 登場するステート一覧

| 場所 | 名前 | 役割 | 寿命・注意 |
|------|------|------|-----------|
| Google | courses/courseWork/submissions | 真実の上流 | 取得は 1+2N 回の直列 API 呼び出し（`src/lib/classroom-api.ts` `fetchAllData`） |
| DB (Supabase) | `Assignment` | ログイン中の真実のソース | `sourceKey` で upsert、`deletedAt` ソフト削除 |
| DB | `User.classroomSyncedAt` / `webclassSyncedAt` | 「最終更新」表示の元 | **Google 同期成功時のみ** now に更新（sync route） |
| JWT Cookie | `sub` / `accessToken` / `refreshToken` / `expiresAt` / `error` | 認証・Google トークン | **ドメイン毎に別物**（localhost と本番は独立）。`sub` が DB に無いと書込のみ FK 違反（→PR #40 でガード済み） |
| IndexedDB | assignments キャッシュ | 表示用ミラー（段1） | `replaceCache` で全置換 |
| client state | `assignments` / `loading` / `error` / `syncedAt` / `syncError` | UI 表示 | `useAssignments.ts`。`syncError` は段3レスポンスの `data.syncError ?? null` |
| module 変数 | `lastSyncTime` | 段3の 5分スロットル | **リロードで 0 に戻る・タブ毎に独立**（=リロード直後は毎回自動同期が走る） |

## 3. 現状のデータフロー

### ログイン後の初回表示（シナリオ1）
```
段1: IndexedDB → 即描画
段2: GET /api/assignments        … DB読み。syncedAt も返す（トークン不要）
段3: POST /api/classroom/sync    … 裏で自動実行（force=false, 5分スロットル）
      └ 成功: DB upsert → classroomSyncedAt=now → レスポンスの syncedAt で「たった今」
```

### 更新ボタン（シナリオ2）
```
refresh(): loading=true
  → loadFromDb()（段2）
  → syncWithGoogle(force=true)（段3, スロットル無視）
  → loading=false
UI: ボタンは「更新中…」+disabled（refreshing=loading）
```

### サーバ側の失敗分類（`/api/classroom/sync`）
| syncError | 条件 | UI |
|-----------|------|-----|
| `reauth_required` | `session.error`＝refresh失敗 ／ userId が User に不在 ／ Google 401/403 ／ P2003 | 橙「要再ログイン」＋ホームに再ログインバナー |
| `no_access_token` | `session.accessToken` 無し | 赤「同期に失敗」 |
| `sync_failed` | **上記以外の catch**（429・5xx・Prisma接続エラー等） | 赤「同期に失敗」 |
| （なし） | 成功 | 緑＋「たった今」 |

## 4. シナリオ2が「同期に失敗」になる原因 — **確定済み（2026-07-04）**

Vercel Functions のログで確定。**Prisma 接続プール枯渇（P2024）**:

```
[SYNC] Google同期に失敗: prisma.assignment.update() invocation:
Timed out fetching a new connection from the connection pool.
(connection pool timeout: 10, connection limit: 5)  code: P2024
```

**メカニズム**:
- `syncClassroomAssignments`（`src/lib/server/assignments.ts`）は差分のある行の UPDATE を
  `await Promise.all(updates)` で**一斉並列発行**する（PR #36 の高速化）。
- Prisma のプールは 1 インスタンスあたり接続 5 本・取得待ち 10 秒。UPDATE 件数が多いと
  6 件目以降が待ち行列に入り、10 秒待っても空かず P2024 → catch → `sync_failed`。
- **ログイン直後に成功する理由**: 初回（DBリセット後）は全件が新規＝`createMany` **1 クエリ**で
  プールを圧迫しない。ボタン押下時は既存行との差分 UPDATE が多数発生する経路に入るため失敗する。
- 接続設定は正常（`DATABASE_URL`=pooler:6543+`pgbouncer=true`、`DIRECT_URL`=5432 を確認済み）。
  設定ミスではなく**並列度が無制限**なことが原因。

**差分が毎回出る原因 — 確定（`updates=90 fields=[courseColor]`）**:
`transform.ts` の `getCourseColor` が色を「コースの初回登場順」で採番し module 変数
`colorMap` に保持していた。サーバレスはコールドスタートで `colorMap` が空に戻り、コース
取得順も一定でないため、**同じコースでも同期毎に色が変わり** `ex.courseColor !== a.courseColor`
で全件が UPDATE 対象になっていた。→ `courseId` からのハッシュで**決定的**に色を割り当てて解消
（一度だけ全件 recolor が走り、以後 `updates≈0`）。

（参考・その他の候補は未発生: Google 429 / Vercel タイムアウト(`maxDuration`未設定・ローカル27〜31s) / Google 5xx。
赤「同期に失敗」＝200+`sync_failed`、**無反応で時刻据え置き**＝段3 fetch 自体の失敗(504等、§5-a)という判別は今後も有効。）

**DB/キャッシュのリセットは不要**。原因はDB接続の並列度であり、リセットしても再発する。

## 5. 既知の問題点・懸念（修正すべきもの）

- **a. 段3の fetch 自体の失敗が無言**: `syncWithGoogle` の catch は console.error のみで `syncError` を設定しない
  （`useAssignments.ts`）。タイムアウト/504/オフライン時に UI が一切変化せず「押しても効かない」体験になる。
- **b. `fetchAllData` が直列 1+2N 呼び出し**: コース数に比例して 27〜31 秒。Vercel の関数制限超過リスク
  （`maxDuration` 未設定）。コース単位の並列化で数秒に短縮可能。
- **c. 二重同期のガードが無い**: リロード直後の自動同期(段3)と更新ボタンが並行実行され得る。
  in-flight フラグでの多重発火防止が無く、429（候補A）の温床。
- **d. `lastSyncTime` がモジュール変数**: リロードで消える・タブ間で共有されない → タブ/リロード毎に自動同期。
  429 リスクを底上げしている。
- **e. NextAuth v5 の既知挙動**: Route Handler 内の `auth()` で refresh してもトークンが Cookie に書き戻されない
  ことがある → アクセストークン失効(1h)後は毎リクエスト refresh 実行。Google が refresh_token を
  ローテーションした場合に Cookie 側が古いままになる懸念（将来 `reauth_required` 多発の火種）。
- **f. 失敗理由が UI で区別できない**: 赤「同期に失敗」だけでは 429/5xx/Prisma の区別がつかず、毎回サーバログ行き。

## 6. あるべき姿（推奨修正・優先度順）

1. **【P2024 直撃・確定原因の修正】UPDATE の一斉並列をやめ `prisma.$transaction(updates)` に**
   （`syncClassroomAssignments` / `syncWebClassAssignments` 両方）。1 接続で順次実行され
   プールを枯渇させない・原子性も得られる。あわせて `updates/creates` 件数をログし、
   「なぜ差分が出るのか」（§4 の残る疑問）を観測する。
2. **段3 fetch 失敗時も `syncError`（例: `"network"`）を設定**して赤表示 — 無言失敗(§5-a)の解消。
3. **`fetchAllData` のコース単位並列化 ＋ sync route に `export const maxDuration = 60`**
   — 27秒→数秒。タイムアウトの予防と「更新中…」の体感改善。
4. **同期の in-flight ガード** — 実行中の段3があれば新規発火をスキップ（自動と手動の衝突防止）。
5. **syncError の理由コードを注記に添える**（例:「同期に失敗(P2024)」）— ログを見ずに一次切り分け。

※ 1 だけで本番の「更新ボタン→同期に失敗」は解消する見込み。2〜5 は堅牢化。
