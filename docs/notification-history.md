# 通知機能の開発経緯・プラットフォーム差異・将来設計

---

## 1. 開発タイムライン

### Phase 1: PWA化 + ローカル通知の基盤 (PR #3, `1acef33`)

**やったこと:**
- PWA化: `manifest.json`, Service Worker (`sw.js`), アイコン, Apple Web App メタタグ
- 通知スケジューラ: 締切前にリマインダーを送る仕組み
- 通知設定: プリセット3種（余裕派/標準/ギリギリ派）、コース・課題単位のミュート
- 設定画面 (`/settings`)
- `NotificationBanner`: 初回訪問時に通知許可を求めるバナー
- `NotificationScheduler`: ページが visible になるたびに締切チェックを実行

**通知タイミングのプリセット:**

| プリセット | タイミング |
|-----------|-----------|
| 余裕派 | 締切24時間前 |
| 標準 | 24時間前 + 3時間前 |
| ギリギリ派 | 3時間前 + 1時間前 |

**アーキテクチャ:**
```
ページ表示 / visibility change
  → NotificationScheduler.tsx (useEffect)
    → checkAndNotify()
      → getCachedAssignments() から締切一覧取得
      → 各課題 × 各タイミングで通知判定
      → 送信済みなら IndexedDB でスキップ
      → 未送信なら recordNotification() + showDeadlineNotification()
```

**データ保存先:** IndexedDB (`notification-settings`, `notification-history` ストア)

---

### Phase 2: SSR クラッシュ修正 (PR #4, `af886c8`)

**問題:** 設定ページで `Notification.permission` を JSX 内で直接参照 → SSR 時に `ReferenceError` → モバイルでページが真っ白

**修正:** `useEffect` 内で `typeof Notification !== "undefined"` を確認してから state に保存

**教訓:** ブラウザ API は必ず `useEffect` 内でアクセスする（Next.js の SSR/SSG 環境にはブラウザ API が存在しない）

---

### Phase 3: 通知デバッグ機能追加 (PR #6, `063c3b1`)

**やったこと:**
- `notification-scheduler.ts` に `console.log` によるデバッグログ追加（`[通知]` プレフィックス）
- 設定画面に「テスト通知を送信」ボタン追加
- 通知が出ない原因の切り分けを可能にした

---

### Phase 4: 通知が表示されない問題の修正 (PR #7, `2852af1`)

**問題:** 通知が一切表示されない

**原因:** Service Worker の registration が取得できても `active` 状態でない場合があり、`reg.showNotification()` が失敗していた。エラーが握りつぶされていたため原因が分からなかった。

**修正:**
- SW が未アクティブの場合は `new Notification()` API にフォールバック
- SW / Notification API 両方にエラーログを追加
- `sendTestNotification()` にも同様のフォールバックを追加

**フォールバック順序:**
```
1. navigator.serviceWorker.getRegistration()
   → reg?.active ならば reg.showNotification() (SW通知)
2. SW 未アクティブ or エラー
   → new Notification() (Notification API 直接)
3. 両方失敗 → console.log にエラー出力
```

---

### Phase 5: アプリ内通知センター (PR #8, `864b36e`)

**やったこと:**
- ホーム画面のヘッダーにベルアイコン + 未読バッジ追加
- `NotificationPanel`: トップシート型のオーバーレイで通知履歴を表示
- `notification-store.ts` を拡張: `title`, `body`, `read` フィールド追加
- `getUnreadCount()`, `markAsRead()`, `markAllAsRead()` 追加
- 相対タイムスタンプ表示（「3分前」「2時間前」「1日前」）

**UI:**
- 未読通知: 青いドット + 黒文字
- 既読通知: ドットなし + グレー文字
- 「すべて既読」ボタン

---

### Phase 6: Web版で通知センターが空になる問題 (PR #9, `173ff5b`)

**問題:** Web版（push通知未許可）ではベルアイコンの通知センターが常に空

**原因:** `checkAndNotify()` の先頭に `Notification.permission === "granted"` のガードがあり、push通知が許可されていない場合は**締切チェックも通知履歴の記録も行われなかった**

**修正:**
- `Notification.permission` のガートを `checkAndNotify()` から削除
- 締切チェック + IndexedDB への履歴記録は常に実行
- push通知の送信（`showDeadlineNotification`）のみを permission でゲート

**修正前後の比較:**
```
修正前: permission check → (NGなら全部スキップ)
修正後: 締切チェック → 履歴記録（常に実行）→ push送信（permissionでゲート）
```

**結果:** Web版でもベルアイコンに未読バッジが表示され、通知センターで締切リマインダーを確認できるようになった

---

### Phase 7: IndexedDB 初期化レースコンディション (PR #11, `aecd617`)

**問題:** Google ログイン時・WebClass 連携時に `NotFoundError: Failed to execute 'transaction'` が発生

**原因:** `cache.ts` と `notification-store.ts` が同じ DB (`classroom-reminder`) を別々の `openDB()` で開いていた。`notification-store.ts` には `upgrade` 関数がなく、先に呼ばれるとオブジェクトストアが作成されない。

**修正:** `src/lib/db.ts` に DB 初期化を一元化。全ストア（`assignments`, `notification-settings`, `notification-history`）を1つの `upgrade` 関数で作成。

**さらに Safari 固有の問題 (PR #12, `10ade93`):** Safari で「サイトデータを削除」しても古い DB（バージョン2、ストアなし）が残る場合があった。DB バージョンを 3 に上げることで強制的に `upgrade` を再実行させて解決。

---

## 2. プラットフォーム別の動作差異

| 機能 | Web版 (ブラウザ) | PWA版 (ホーム画面追加) | iOS Safari | Android Chrome |
|------|:---:|:---:|:---:|:---:|
| アプリ内通知センター（ベルアイコン） | ✅ | ✅ | ✅ | ✅ |
| push通知 (リマインダー) | 許可が必要 | 許可が必要 | iOS 16.4+のPWAのみ | ✅ |
| Service Worker 通知 | △（SW未アクティブ時fallback） | ✅ | △ | ✅ |
| オフラインキャッシュ | ✅ | ✅ | ✅ | ✅ |
| WebClass bookmarklet | ✅ (直接開く) | ❌ (ブラウザが開く) | ✅ (ブラウザ) | ✅ (ブラウザ) |

### 重要な制約

**Web版の通知:**
- `Notification.permission` を許可しなくても、アプリ内通知センター（ベルアイコン）は動作する
- push通知（ブラウザ外への通知）は許可が必要
- ページを閉じている間は通知チェックが走らない（バックグラウンド処理なし）

**PWA版とWebClass連携の非互換:**
- WebClass の bookmarklet はブラウザを開く（`window.location` を変更）
- PWA版を使っていても、bookmarklet 実行時にはブラウザ版が開かれる
- 取り込んだデータはブラウザ版の IndexedDB に保存され、PWA版からは見えない
- この問題のため、ユーザーは「PWAを諦めるか、ネイティブアプリとして再構築する」と判断

**iOS の制約:**
- iOS Safari: PWA としてホーム画面に追加した場合のみ push 通知が可能（iOS 16.4+）
- iPhone Chrome: WebKit ベースのため push 通知非対応
- いずれも Notification API の `permission` を `granted` にする必要あり

---

## 3. 現在の通知アーキテクチャ

```
[ブラウザ]
  └── NotificationScheduler.tsx (visibility change で起動)
        └── checkAndNotify()
              ├── getCachedAssignments() ← IndexedDB
              ├── getNotificationSettings() ← IndexedDB
              ├── 締切判定（プリセットに基づく）
              ├── hasBeenNotified() で重複排除
              ├── recordNotification() → IndexedDB (常に実行)
              └── showDeadlineNotification() (permission === "granted" の場合のみ)
                    ├── 1st: SW reg.showNotification()
                    └── 2nd: new Notification() (fallback)

[IndexedDB: classroom-reminder v3]
  ├── notification-settings (キー: "global")
  │     enabled, preset, mutedCourses, mutedAssignments
  └── notification-history (キー: "{assignmentId}:{type}")
        title, body, read, sentAt, type

[Service Worker: sw.js]
  ├── install: キャッシュ ("/" と "/login")
  ├── fetch: network-first + cache fallback
  └── notificationclick: タップで該当ページを開く
```

---

## 4. 発生した問題と解決策のまとめ

| # | 問題 | 原因 | 解決策 | PR |
|---|------|------|--------|-----|
| 1 | 設定ページがモバイルで真っ白 | SSR時に `Notification.permission` を直接参照 | `useEffect` 内でアクセス | #4 |
| 2 | 通知が一切出ない | SW未アクティブ時にエラーが握りつぶされた | Notification APIへのfallback + ログ追加 | #7 |
| 3 | Web版で通知センターが空 | permission未許可だと締切チェック自体がスキップ | permission ゲートを push送信のみに限定 | #9 |
| 4 | ログイン/WebClass連携時にNotFoundError | cache.ts と notification-store.ts の `openDB` 競合 | db.ts に初期化を一元化 | #11 |
| 5 | Safari で #4 修正後もエラー継続 | 古い DB (v2, ストアなし) が残存 | DB バージョンを 3 に上げて強制 upgrade | #12 |

---

## 5. 将来設計

### 短期（現状の枠組み内）
- 古い通知履歴の自動クリーンアップ（`clearOldHistory` は実装済みだが未使用）
- 通知のクリック時に該当課題の詳細に遷移

### 中期: Capacitor によるネイティブアプリ化
- ユーザーが検討中:「通知機能は将来的に Capacitor で作ろうかと思っています」
- **メリット:**
  - iOS/Android でフルプッシュ通知対応（バックグラウンド含む）
  - WebClass bookmarklet との連携問題が解消される可能性
  - アプリストア配布
- **懸念:**
  - WebClass bookmarklet はブラウザで動くため、ネイティブアプリとの間でデータ連携の手順が増える場合は Web 版のみにするとユーザーが判断済み
- **現在の認証方式（NextAuth.js サーバーサイド）はそのまま利用可能:** Capacitor の WebView 内で同じ OAuth フローが動作する

### 中期: Gmail（メール）通知の検討（2026-06-21 評価）

メール通知によりデバイス固有の制約（iOS push制限、PWA/Web分離、push許可）を一掃できるか検討した。

**結論: デバイス制約は解消するが、「誰がいつメールを送るか」という新たな課題が生じる。DB構築と同時に実装するのが最適。**

#### メール送信方法

| 方法 | 評価 |
|------|------|
| **Gmail API（`gmail.send`スコープ）** | ❌ 制限付きスコープ → Googleセキュリティ審査が必要（数週間〜数ヶ月）。OAuth同意画面に「メール送信」と表示されユーザーが不安に。学生プロジェクトには過剰 |
| **Resend等のトランザクションメール** | ✅ 推奨。OAuthスコープ追加不要（既存の`email`スコープでアドレス取得可能）。無料枠: 100通/日。APIキー設定のみ |

#### 実装アプローチ

**A. クライアントトリガー型（DB不要・今すぐ可能）:**
アプリを開いた時に `checkAndNotify()` → サーバーAPIでメール送信。ただし **アプリを開かないとメールが届かない**（現在のローカル通知と同じトリガー）。クロスデバイスの持続性（PCで開いた通知がスマホのGmailにも残る）のみが利点。

**B. サーバーサイドCron型（DB必要・将来実装）— 推奨:**
Vercel Cron（1日1回）→ DBからユーザーのトークン取得 → Classroom APIで締切チェック → Resendの`scheduledAt`機能で適切な時刻にメール予約（最大72時間先まで）。**アプリを開かなくてもメールが届く。** Vercel Hobby plan の1日1回制限でも `scheduledAt` と組み合わせれば十分。

**C. 段階的移行（A→B）:**
今はAを実装し、DB追加時にBに移行。AのコードはBで再利用可能。

#### 判断

現時点ではDB未構築のため実装保留。Capacitor（ネイティブ化）と合わせて後日判断する。DB構築時にアプローチBを採用するのが最も効率的。

### バックグラウンド通知の根本的制約
現在の実装はページが visible の時のみ通知チェックを実行する。ページを閉じている間の通知には以下のいずれかが必要:
- **Web Push API + Push Server**: サーバーから Service Worker にプッシュ → ブラウザが閉じていても通知（実装コスト大）
- **Capacitor + ネイティブ通知**: ローカル通知をスケジュールしておけばバックグラウンドで発火
- **Gmail通知 + Vercel Cron + DB**: サーバー側で締切チェック → メール送信（上記「メール通知の検討」参照）
- **現状の妥協**: ページを開いた時にまとめて通知。アプリ内通知センターで見落としを防ぐ
