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

## Phase 2 実装時の注意

### Assignment IDの不一致（重要）
- 現在のCronは`NotificationHistory.assignmentId`にClassroom APIの`work.id`（例: `"614325789"`）を保存
- Phase 2でAssignmentをDBに保存すると、IDが`cuid()`に変わる
- 通知重複チェックが壊れる可能性がある
- 対応: Phase 2実装時に`sourceKey`または`externalId`でマッチングする設計に変更

### IndexedDBの古いデータ蓄積
- `cacheAssignments()`は`put()`（upsert）のみで、Classroomから消えた課題を削除しない
- 長期使用でIndexedDBにゴミデータが蓄積する
- 対応: Phase 2でDB同期時にIndexedDBも同期（DBにない課題を削除）

### ページ遷移のたびにClassroom APIを呼ぶ非効率
- `useAssignments`フックが各ページのマウント時に`refresh()`を呼ぶ
- Home → Dashboard → Calendar と遷移すると3回APIを叩く
- 対応: Phase 2でTTLキャッシュ（5分）を実装

## Phase 3 実装時の注意

### editedFieldsの粒度
- `customFields`（JSONカラム）を1フィールドとして扱うか、個別キーまで追跡するか設計時に決定が必要
- 推奨: `customFields`全体を1フィールドとして扱う（シンプル）

## 全体

### Vercel Hobby 関数実行時間制限
- 10秒制限があるため、ユーザー数が増えるとCronがタイムアウトする可能性
- 10ユーザー × 17 API呼び出し（8コース）= 170回のAPI呼び出しが10秒以内に完了する必要がある
- 対応: ユーザーごとの並列処理、または分割実行
