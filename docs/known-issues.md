# 既知の問題・懸念点

## Phase 0+1 残存

### Resend送信先制限
- `onboarding@resend.dev`はResendアカウント所有者のメールにしか届かない
- 他ユーザーへの送信には独自ドメインをResendで認証する必要がある
- 対応: Resendダッシュボードでドメイン認証 → `email.ts`の`from`を更新

### 通知設定のDB未同期
- プリセット（relaxed/standard/urgent）とミュート設定はIndexedDBにしか保存されない
- Cronのメール通知はDBのデフォルト値（standard、ミュートなし）で動作する
- 対応: Phase 4で設定変更時にDB同期を実装

### Google OAuth consent screen
- 「テスト」モードではテストユーザーのみログイン可能
- 他ユーザーに公開するにはGoogleの審査を通す必要がある

## Phase 2 で解消済み

### ~~Assignment IDの不一致~~ → 解消
- DB保存時に`externalId`にClassroom APIの`work.id`を保存
- クライアントへは`externalId`を`id`として返却するため、既存のCron通知履歴と整合性を維持
- CronはPhase 2では変更なし（従来通りClassroom APIから直接取得）

### ~~IndexedDBの古いデータ蓄積~~ → 解消
- ログイン済みユーザーのAPI取得時に`clearCache()` + `cacheAssignments()`でIndexedDBを完全リフレッシュ

### ~~ページ遷移のたびにClassroom APIを呼ぶ非効率~~ → 解消
- モジュールレベル変数で最終取得時刻を保持、5分TTLでデデュプ

## Phase 2 残存

### CronとDBの課題データ不整合
- Cronは依然としてClassroom APIから直接取得して通知を計算
- DBに保存された課題データ（WebClass・手動追加含む）はCronに使われていない
- 対応: 将来的にCronもDBデータを使用するよう改修（優先度低）

### 未ログイン→ログイン時のデータ移行
- ログイン前にIndexedDBに保存した手動追加・WebClass課題はDBに移行されない
- 対応: Phase 4で一回限りの移行を実装

## Phase 3 実装時の注意

### editedFieldsの粒度
- `customFields`（JSONカラム）を1フィールドとして扱うか、個別キーまで追跡するか設計時に決定が必要
- 推奨: `customFields`全体を1フィールドとして扱う（シンプル）

## 全体

### Vercel Hobby 関数実行時間制限
- 10秒制限があるため、ユーザー数が増えるとCronがタイムアウトする可能性
- 10ユーザー × 17 API呼び出し（8コース）= 170回のAPI呼び出しが10秒以内に完了する必要がある
- 対応: ユーザーごとの並列処理、または分割実行
