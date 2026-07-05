# Class Pilot — 場面別データフロー図鑑

構成の正本は `docs/architecture.md`。本書はその「図解・場面別」版で、ログイン状態・ソース
（WebClass / Classroom）・各種タイミング（5分・1時間・レート）まで含めて正確に追える。
図は Mermaid（GitHub 上で図として表示される）。関数名は理解の助けに一部併記。

## 用語・登場人物
- **クライアント**: ブラウザ側（`useAssignments` 等）
- **IndexedDB**: 端末内キャッシュ（未ログイン時は一次ストア、ログイン時は表示用ミラー）
- **API**: Next.js のルートハンドラ（サーバー）
- **DB**: Supabase(PostgreSQL)。**ログイン中はここが真実のソース**
- **Google**: Google Classroom API
- **Upstash**: レートリミット用 Redis

## タイマー・上限の早見表
| 名前 | 値 | 何を意味するか | 挙動 |
|------|----|----------------|------|
| Google同期スロットル | **5分** | クライアントが Google 同期(段3)を再実行する最短間隔（`lastSyncTime`） | 5分以内はスキップ。**ハードリロード/新規タブでリセット**、SPA遷移では保持。手動更新(force)は無視 |
| アクセストークン有効期限 | **約1時間** | Google のアクセストークン | 失効時、次の同期で `refresh_token` により自動更新 |
| レートリミット sync | **15回/10分** | ユーザー単位（Upstash） | 超過で `429`。env未設定はフェイルオープン(許可) |
| レートリミット import | **10回/10分** | ユーザー単位 | 同上 |
| refresh_token 失効 | **7日**（OAuth Testing時） | 本番未公開だと失効 | 失効→`reauth_required`。本番公開(A2)で解消 |
| メール通知 cron | **毎日** | 締切 **30時間以内** の未提出を通知 | DBベース・全ソース対応 |

---

## 図0. 全体フローチャート（ホームを開いた／リロードした時）

```mermaid
flowchart TD
  A["ホームを開く / リロード"] --> B{"IndexedDBに<br/>キャッシュある?"}
  B -- "あり" --> C["段1: 即描画（速い）"]
  B -- "なし" --> D["「取得中…」表示"]
  C --> E{"ログイン中?"}
  D --> E
  E -- "未ログイン" --> F["ローカルのWebClass最終取得時刻を表示<br/>DB/Googleは触らない（IndexedDBが一次ストア）"]
  E -- "ログイン中" --> G["初回のみ: ローカル課題をDBへ移行<br/>通知設定をDBから取得"]
  G --> H["段2: GET /api/assignments<br/>（DB読み・トークン不要・速い）"]
  H --> I["一覧更新 + キャッシュ全置換 + 最終取得時刻"]
  I --> J{"段3の5分<br/>スロットル?"}
  J -- "5分以内" --> K["Google同期スキップ<br/>表示はDB値のまま（＝時刻は据え置き）"]
  J -- "5分超 or 初回ロード" --> L["段3: POST /api/classroom/sync（裏で）"]
  L --> M{"レート<br/>15回/10分超過?"}
  M -- "超過" --> N["429 → 既存表示を維持"]
  M -- "OK" --> O{"userIdが<br/>DBに存在?"}
  O -- "なし（古いセッション）" --> P["reauth_required<br/>→ 再ログインバナー"]
  O -- "あり" --> Q{"アクセストークン<br/>有効?"}
  Q -- "失効" --> R["refresh_tokenで更新"]
  R -- "失敗" --> P
  R -- "成功" --> S["Google取得（1+2N回）"]
  Q -- "有効" --> S
  S --> T["差分同期 + classroomSyncedAt=now"]
  T --> U["最新DBを返し表示更新<br/>→ Classroom『たった今』"]
```

**要点**：ユーザーが待つのは段1（即）と段2（DB読み）だけ。重い Google 取得（段3）は裏で・5分スロットル付き。
「Classroom 最終更新が『たった今』にならない」時は、`M/O/Q/R` のどこかで止まっている（レート/古いセッション/トークン）。

---

## 図1. 未ログインでホーム表示

```mermaid
sequenceDiagram
  participant U as ユーザー
  participant C as クライアント
  participant IDB as IndexedDB
  U->>C: ホームを開く
  C->>IDB: ① キャッシュ取得
  IDB-->>C: 課題（あれば）
  C-->>U: ② 段1で即描画
  C->>IDB: ③ ローカルのWebClass最終取得時刻を読む
  C-->>U: ④ 表示確定（ローディング解除）
```
1. IndexedDB から課題を取得。
2. あれば即描画（段1）。
3. WebClass の最終取得時刻（localStorage）を読む。
4. 表示確定。**DB も Google も一切呼ばない**。この状態では IndexedDB が唯一の保存先。

---

## 図2. ログイン済みでホーム表示（SWR 3段フェッチ）

```mermaid
sequenceDiagram
  participant C as クライアント
  participant IDB as IndexedDB
  participant API as API
  participant DB as DB
  participant G as Google
  C->>IDB: ① キャッシュ取得 → 段1即描画
  C->>API: ② 初回のみ ローカル課題をDBへ移行 / 通知設定をDBから取得
  C->>API: ③ 段2: GET /api/assignments
  API->>DB: 課題読取（userIdでスコープ, 非表示コース除外）
  DB-->>API: 課題 + classroom/webclass最終取得時刻
  API-->>C: 一覧 + syncedAt
  C->>IDB: ④ キャッシュ全置換
  C->>API: ⑤ 段3: POST /api/classroom/sync（5分スロットル / 裏で）
  API->>G: Google取得（後述の図4）
  API-->>C: 最新一覧 + syncedAt + syncError
  C->>IDB: ⑥ キャッシュ全置換・表示更新
```
1. キャッシュを即描画（段1）。
2. 初回ログイン時だけ、ローカル専用課題(`wc-`/`manual-`)を DB へ引き上げ、通知設定を DB から取り込む。
3. 段2で DB を読む（**トークン不要・速い・堅牢**）。ここで表示がほぼ確定。
4. キャッシュを DB 内容で全置換。
5. 段3で Google 同期（5分スロットル、裏で非同期）。
6. 成功すれば最新で再描画。失敗しても段2の表示は維持。

---

## 図3. Classroom 同期の内部（POST /api/classroom/sync）＝図0の右下を詳細化

```mermaid
sequenceDiagram
  participant C as クライアント
  participant API as sync API
  participant RL as Upstash
  participant DB as DB
  participant G as Google
  C->>C: ① 5分スロットル判定（手動更新はforceで無視）
  C->>API: ② POST /api/classroom/sync
  API->>API: ③ 認証（未ログイン→401）
  API->>RL: ④ レート15回/10分?
  RL-->>API: 超過→429で終了
  API->>DB: ⑤ userId存在? なければ reauth_required で終了
  API->>API: ⑥ トークン確認（error=失効→reauth / accessTokenあり?）
  API->>G: ⑦ courses → 各コースのcoursework・submissions（1+2N回・直列）
  G-->>API: 生データ
  API->>DB: ⑧ 差分だけUPDATE($transaction) + 新規createMany + classroomSyncedAt=now
  API->>DB: ⑨ 最新の課題を取得（全ソース）
  API-->>C: ⑩ assignments, synced, syncError, syncedAt
  C->>C: ⑪ 表示更新（成功→たった今 / 失敗→据え置き＋色/バナー）
```
- ⑧ の差分検出：既存値と違うフィールドだけ UPDATE（変更無し＝0件で一瞬）。`$transaction` で1接続に多重化し接続プール枯渇(P2024)を回避。`courseColor` は courseId から決定的、`isLate` は boolean 正規化済み（＝毎回全件UPDATEにならない）。
- **失敗の分類**：`401/403`(トークン無効) と `P2003`(userId不在) → **reauth_required**（再ログインで回復）。それ以外の例外 → **sync_failed**（赤表示・時刻据え置き）。握りつぶさず必ず `syncError` で返す。

---

## 図4. トークン更新（アクセストークンの1時間失効）

```mermaid
flowchart TD
  A["APIで認証(auth)呼び出し"] --> B{"expiresAt<br/>まだ有効?"}
  B -- "有効（1時間以内）" --> C["そのままaccessToken使用"]
  B -- "失効" --> D{"refresh_tokenある?"}
  D -- "なし" --> E["古いトークンのまま<br/>→ Google 401 → sync_failed<br/>（今は401をreauth_required扱い）"]
  D -- "あり" --> F["Googleでトークン更新"]
  F -- "成功" --> G["新access_token + expiresAt更新<br/>（透過的・体感差なし）"]
  F -- "失敗（例: 7日失効）" --> H["error=RefreshAccessTokenError<br/>→ reauth_required → 再ログインバナー"]
```
1. 毎リクエストの `auth()` でトークンの有効期限を確認。
2. 1時間以内なら現行トークンを使用。
3. 失効していれば `refresh_token` で更新を試みる。成功なら透過的に継続、失敗なら再ログインを促す。
4. **1時間は「同期の5分間隔」とは別物**。5分＝どれくらいの頻度で Google を叩くか、1時間＝トークンをいつ更新するか。

---

## 図5. WebClass 取り込み（ブックマークレット）

```mermaid
flowchart TD
  A["WebClass『課題実施状況一覧』で<br/>ブックマークレット実行"] --> B["DOM収集：コース名/教材/締切/コースリンク/状態<br/>（実施日・最高点は取得しない）"]
  B --> C["JSONをURLハッシュで渡し /import へ遷移"]
  C --> D["transformWebClassTasks<br/>サニタイズ + http(s)のlinkのみ採用"]
  D --> E{"ログイン中?"}
  E -- "未ログイン" --> F["IndexedDBへ保存<br/>ローカル最終取得時刻を記録"]
  E -- "ログイン中" --> G["POST /api/import/webclass"]
  G --> H{"レート10回/10分超過?"}
  H -- "超過" --> I["429"]
  H -- "OK" --> J["userId存在チェック（なければ401 reauth）"]
  J --> K["sanitizeImportedAssignments<br/>件数上限1000 / 長さ上限 / 危険URL除去"]
  K --> L["syncWebClassAssignments<br/>差分$transaction + webclassSyncedAt=now"]
  L --> M["最新DBを返す → キャッシュ全置換 → ホームへ"]
```
1. ブックマークレットが一覧ページの DOM を収集（**成績＝最高点、実施日は収集しない**＝データ最小化）。
2. `/import` へ URL ハッシュで受け渡し、クライアントで正規化。
3. 未ログインは IndexedDB のみ。ログイン中はサーバーへ POST。
4. サーバーは **レート → userId存在 → サニタイズ（非信頼入力の再検証）→ 差分同期**。危険な `javascript:` 等の link は空にされる。

---

## 図6. 手動 追加 / 編集 / 削除

```mermaid
flowchart TD
  subgraph ADD["追加（/add）"]
    A1["フォーム送信"] --> A2{"ログイン中?"}
    A2 -- "未" --> A3["IndexedDBへ保存"]
    A2 -- "済" --> A4["POST /api/assignments<br/>validateManualCreate（必須/日付/状態/長さ）"]
    A4 --> A5["createManualAssignment → DB"]
    A5 --> A6["キャッシュへ upsert"]
  end
  subgraph EDIT["編集"]
    B1["編集ダイアログ"] --> B2["PATCH /api/assignments/:id<br/>validateEdit（渡した項目のみ正規化・linkガード）"]
    B2 --> B3["editAssignment：userIdでスコープ<br/>他人のIDは404、編集済みフィールドを保護"]
    B3 --> B4["楽観的にキャッシュ upsert"]
  end
  subgraph DEL["削除"]
    C1["削除"] --> C2["DELETE /api/assignments/:id"]
    C2 --> C3["softDeleteAssignment（deletedAt）<br/>他人のIDは404"]
    C3 --> C4["キャッシュから除去（楽観的）"]
  end
```
- 追加/編集は**サーバー側で必ず検証**（必須欠落・不正日付・不正状態→400、超長文字列→切り詰め、link→http(s)のみ）。
- 編集・削除は `userId` スコープなので**他人の課題は取得も改ざんも削除も不可（404）**。
- UI は楽観的更新（サーバー確定を待たず即反映、失敗時に戻す）。

---

## 図7. メール通知 cron（毎日・DBベース・全ソース）

```mermaid
sequenceDiagram
  participant Cron as Vercel Cron
  participant API as /api/cron/notify
  participant DB as DB
  participant R as Resend
  Cron->>API: ① Bearer CRON_SECRET（不一致→401）
  API->>DB: ② メール有効な通知設定を全取得
  loop 各ユーザー
    API->>DB: ③ DBから課題取得（全ソース）+ 送信履歴
    API->>API: ④ 締切30h以内 × プリセットで対象算出（提出済み除外）
    API->>R: ⑤ 予約配信（scheduledAt）
    API->>DB: ⑥ 送信履歴を記録（重複防止キー）
  end
```
1. Cron が秘密トークンで起動。
2〜4. **DB を読むだけ**（Google 再取得なし＝トークン非依存・堅牢）。WebClass・手動課題も対象。
5. Resend の予約配信で締切前の適切な時刻に送る。
6. 送信済みは履歴に記録し二重送信を防ぐ。

---

## 図8. アカウント削除

```mermaid
sequenceDiagram
  participant U as ユーザー
  participant C as 設定画面
  participant API as /api/account
  participant DB as DB
  U->>C: ① 「削除」と入力 → 完全に削除
  C->>API: ② DELETE /api/account
  API->>DB: ③ user.delete（cascade）
  Note over DB: Assignment / Account / Session / 通知設定 / 履歴 も連鎖削除
  API-->>C: ④ ok（古いセッションP2025も成功扱い）
  C->>C: ⑤ clearAllClientData（IndexedDB等を全消去）
  C->>C: ⑥ signOut（JWT Cookie破棄）→ トップへ
```
1. 破壊的操作のため「削除」入力を要求。
2〜3. User 1行の削除で関連データが cascade で全消去。
5〜6. 端末内ミラーとログイン Cookie も消し、完全にサインアウト。

---

## 真実のソースの整理
| 状態 | 真実のソース | IndexedDB の役割 | Google |
|------|--------------|------------------|--------|
| ログイン中 | **DB** | 表示用ミラー（段2で全置換） | 段3で裏同期（5分スロットル） |
| 未ログイン | **IndexedDB** | 一次ストア（唯一の保存先） | 触らない |

## 「同期しても『たった今』にならない」の切り分け（図0/3対応）
1. 赤「**同期に失敗**」表示 → サーバーが `sync_failed`（例外）。Vercel ログの `[SYNC]` を確認。
2. 橙「**要再ログイン**」＋バナー → `reauth_required`（古いセッション or トークン失効）。**本番ドメインで再ログイン**。
3. 何も出ず時刻据え置き → 5分スロットルでそもそも段3が走っていない、またはレート429。
