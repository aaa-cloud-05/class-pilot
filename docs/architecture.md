# UnionFetch アーキテクチャ / データフロー

最終更新: 2026-09-04

Google Classroom + WebClass の課題管理 PWA。本ドキュメントは**データの保存場所と流れ**を中心に
現行構成をまとめる。設計の経緯は [phase-plan.md](./phase-plan.md) / [auth-decision-log.md](./auth-decision-log.md) を参照。

全体構成図は [architecture.drawio](./architecture.drawio)（draw.io / diagrams.net で開く）。

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
追加  中央の＋ボタン → 追加シート → POST /api/assignments → 応答を upsertCache(1件) + 画面へ（未ログインは IndexedDB へ upsertCache）
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

## データフロー④ WebClass 取り込み（ブックマークレット / 自動同期）

**WebClass の内部 JSON API を直接呼ぶ**（旧: 課題実施状況一覧の DOM 解析）。
API 仕様・調査経緯・負荷対策は [webclass-api.md](./webclass-api.md)。

```
WebClass の任意のページで実行（ブックマークレットは手動、ユーザースクリプトは自動）
   → GET  {BASE}/ip_mods.php/plugin/score_summary_table/courses
   → コースの year（無ければコース名の先頭4桁）が2年以上前なら除外
   → GET  .../contents?group_id=<id>   コースごとに直列・250ms間隔
        ・fetch のキャッシュを無効化しない = If-Modified-Since が自動で付き、
          変化が無ければ 304（ボディ無し）で返る
        ・contents_kind==="Question" / 非表示でない
        ・締切あり → 締切が180日以内。締切なし → updated が180日以内（期限なしとして取り込む）
        ・提出判定は scores[0].answer_datetime の有無だけを見て、氏名・学籍番号・点数は捨てる
   → transformWebClassPayload() で正規化
   │
   ├─ ブックマークレット（手動・全端末）
   │    → /import#<JSON> を開く（URLが長すぎる場合は締切の古い順に間引く）
   │    ├─ ログイン中: POST /api/import/webclass（hiddenフィルタ→DB upsert）→ replaceCache → ホームへ
   │    └─ 未ログイン: cacheWebClassAssignments()（IndexedDB の wc- を置換）→ ホームへ
   │
   └─ ユーザースクリプト（自動・Tampermonkey・60分に1回）
        → POST /api/import/webclass に直接（Authorization: Bearer <取り込みトークン>）
          ※ クロスサイト送信なのでセッション Cookie が付かず、トークンで本人を示す
```

所要時間は本学13コースで、前面のタブなら約5秒。背面のタブは Chrome が
`setTimeout` を間引くため10秒以上かかるが、完走はする。

識別子は API の安定した ID に基づく。

| | 旧 | 現在 |
|---|---|---|
| 課題ID (`externalId`) | コース名+課題名+締切のhash | `wc-<contents_id>` |
| DBキー (`sourceKey`) | `webclass:<コース名>::<課題名>` | `webclass:wc-<contents_id>` |
| コースID | コース名のhash | `wc-<group_id>` |
| 提出状態 | 「状態」列の文字列判定（`unknown` あり） | `answer_datetime` の有無（**`unknown` は発生しない**） |
| 締切なしの課題 | 取り込まない | `updated` が180日以内なら取り込む（期限なし） |
| リンク | コースのトップ | 課題ページへの直リンク |

締切や課題名が変わっても同じ課題として追えるので、通知履歴の重複防止キーが安定する。
旧キーの行は取り込み時に引き当てて新キーへ載せ替える（削除しないので編集内容は残る）。

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
  （**呼び出し回数がそのまま減る**ので、非表示は速度にも効く）

### Classroom 取得の並列化

`fetchAllData` は `1 + 2N` 回（N=コース数）の Google API 呼び出しを行う。
以前は全部直列だったため、18コースで37回ぶんの往復をすべて待っていた。

- コースを **5件ずつ並列**、コース内の `courseWork` と `studentSubmissions` も並列
- **呼び出し回数は変わらない**（クォータ消費は同じ）。待ち時間だけが縮む
- `Promise.allSettled` で**1コースの失敗が全体を巻き込まない**。保存は upsert なので、
  取れなかったコースの課題は「更新されない」だけで消えない
- ただし**全コース失敗は throw する**。トークン失効等の systemic な失敗を握りつぶすと、
  中身が更新されていないのに `classroomSyncedAt` だけ新しくなり、古いデータを
  新鮮だと偽ることになるため

## データフロー⑥ 通知

**クライアント通知**（ブラウザ・PWA）: `NotificationScheduler` が起動時/可視化時に `checkAndNotify()`
を実行。**IndexedDB のキャッシュ課題**とローカル通知設定を突き合わせ、プリセットのタイミングで
`Notification`/Service Worker 通知を出す。送信済みは `notification-history`（IndexedDB）で重複防止。

**サーバ通知（メール / Web Push）**: 送信の実体は `notifyUser(userId)`（`src/lib/server/notify.ts`）に
集約され、**2つの経路から呼ばれる**。

1. **cron**: `vercel.json` の cron（毎日 21:00 UTC = 06:00 JST）が `GET /api/cron/notify` を叩く。
   `CRON_SECRET` で認証。対象ユーザーを5人ずつ並列処理（`maxDuration = 60`）。
2. **同期・取り込みの直後**: `POST /api/classroom/sync` と `POST /api/import/webclass` が成功したとき、
   `after()` でレスポンス送出後に同じ関数を呼ぶ。**cron だけでは「cron 後に取り込んだ、その日が締切の
   課題」に通知が出ない**ため（WebClass の取り込みは日中に手動で行われる＝本製品が最も救いたいケース）。

処理は DB ベース（全ソース対応・Google 再取得もトークンも不要）:
`getUserAssignments()` → `computePendingNotifications()` → Resend で予約 or 即時送信。

- **取りこぼしの扱い**: 予約時刻（締切のN時間前）が既に過去でも、締切前ならまだ間に合う。
  予約できるタイミングが1つも無いときに限り、**締切に最も近い1件だけ**を実際の残り時間ラベルで
  即時送信する。送らなかった取りこぼしは履歴だけ閉じ、次の同期で蒸し返さない。
- **重複防止**: `NotificationHistory`（`userId+assignmentId+type+channel` の unique）。
  **送信前に履歴行を作って枠を予約**し、作成できたものだけ送る。同期が同時に走っても二重送信しない。
  送信に失敗したら予約行を消して次回リトライできるようにする。
  チャネルが違えば別の行になるので、メールと Push は互いに邪魔しない。

### チャネルの違い（予約できるかどうか）

| | メール(Resend) | Web Push |
|---|---|---|
| 独自ドメイン | **必要**（未認証だと所有者にしか届かない） | **不要** |
| 通数制限 | 100通/日・3,000通/月 | なし |
| **予約送信** | **できる**（`scheduledAt` を Resend に委譲） | **できない**（送った瞬間に届く） |
| 時刻の精度 | 正確 | **cron の実行間隔で決まる** |
| iOS | 届く | ホーム画面に追加した PWA のみ（iOS 16.4+） |

この差を `computePendingNotifications` の `canSchedule` で吸収している。

- `canSchedule: true`（メール）… 未来のタイミングもいま Resend に登録する。
  すでに予約済みなので、取りこぼしの追いつき送信は「予約が1つも無いとき」に限る
- `canSchedule: false`（Push）… 未来のタイミングは**結果に含めず次回に持ち越す**。
  送り時が来た分だけを即時送信する。予約されていないので、
  「後続のタイミングが残っている」ことを理由に握り潰してはいけない（24時間前が永久に出なくなる）

> ⚠️ **Push は cron の実行間隔がそのまま通知の精度になる。**
> Vercel Hobby の cron は1日1回しか回せないため、Push だけでは
> 「3時間前」がほぼ機能しない（実測シミュレーションで発火1回・ラベルは実残り時間）。
> 15〜30分間隔で `GET /api/cron/notify` を叩く外部トリガー
> （cron-job.org 等の無料サービス）を併用すること。
> エンドポイントは `CRON_SECRET` 認証で、履歴による重複防止があるため何度叩いても安全。

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
| `POST /api/import/webclass` | WebClass取り込み→DB upsert | session.user.id **または** 取り込みトークン |
| `GET/POST/DELETE /api/import/token` | 自動同期用トークンの状態/発行/失効 | session.user.id |
| `GET/PATCH /api/notifications/settings` | 通知設定の取得/更新 | session.user.id |
| `GET/POST/DELETE /api/notifications/push` | Push購読の確認/登録/解除 | session.user.id |
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
src/lib/webclass-script.ts           WebClass API を叩く収集コード（ブックマークレット/ユーザースクリプトを生成）
src/lib/server/import-token.ts       自動同期用トークンの発行・照合（DBはハッシュのみ保持）
src/lib/webclass.ts                  WebClassペイロード → Assignment 変換・再検証
src/lib/notification-store.ts        IndexedDB の通知設定/履歴
src/lib/notification-scheduler.ts    クライアント通知（checkAndNotify）
src/lib/server/notify.ts             通知の実体（メール/Push、cron と 同期/取り込み の両方から呼ぶ）
src/lib/server/push.ts               Web Push 送信（期限切れ購読の掃除も）
src/lib/push-client.ts               ブラウザ側の購読・解除
src/lib/server/notification-logic.ts 送信対象の算出（予約 / 取りこぼしの追いつき）
src/lib/server/app-url.ts            公開URL（メールの絶対リンク・metadataBase）
src/lib/debug-clear.ts               ローカル全データ削除（デバッグ用・設定画面）
src/auth.ts                          NextAuth 設定・トークン更新

画面まわり（2026-09-22 に v5 へ置き換え。経緯は ui-v5-migration.md）
src/components/app/provider.tsx      画面が使う状態を1か所に（useAssignments・通知設定・セッション・WebClassURL）
src/components/app/shell.tsx         ヘッダー・下タブ3つ＋追加ボタン・PCサイドバー・同期シート・トースト
src/components/app/assignment.tsx    課題の行・リスト・詳細・追加シート
src/components/app/{week-hero,all-list,calendar-parts,status-bar}.tsx  ホームとカレンダーの部品
src/components/app/ui.tsx            Button/Card/Sheet/Segmented などの土台
src/lib/status.ts                    **提出状態→表示カテゴリ→色を決める唯一の場所**
src/lib/assignment-view.ts           Assignment＋ミュート設定 → 画面が使う形（ViewAssignment）
src/lib/assignment-format.ts         締切の書き方とリストの分類
src/lib/week-view.ts                 ホームの「今週」の組み立て
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
