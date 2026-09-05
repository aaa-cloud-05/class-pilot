# UnionFetch — リリースチェックリスト

## 現在地（2026-09-06 時点）

| 項目 | 状態 |
|---|---|
| **アプリ名** | **UnionFetch**（確定・置換済み） |
| **ドメイン** | **unionfetch.com**（取得済み・確定）。`classmino.com` は使わない |
| **通知の仕様** | [notification-design.md](./notification-design.md) の3本立てを提案済み・**承認待ち**。現行のプリセット3種は仮 |
| Supabase | 東京(ap-northeast-1)へ移設完了（1クエリ 678ms → 53ms） |
| WebClass 取得 | 内部 JSON API 方式。ブックマークレット＋Tampermonkey 自動同期とも動作確認済み |
| Web Push | 実装済み・未検証（VAPID鍵は `.env.local` にある。Vercel 未設定） |

### 次にやること（この順で手戻りが無い）

1. **通知仕様を決める** … [notification-design.md](./notification-design.md) を読んで承認/修正。
   現行のプリセット3種は**仮なので作り込まないこと**。
2. **ドメイン設定** … 下の A ブロック。手順は [domain-setup.md](./domain-setup.md)
3. リリース

### 改名の影響で対応が要るもの

- **取り込みトークンを再発行して Tampermonkey に貼り直す。**
  ユーザースクリプトの保存キーが `classmino:token` → `unionfetch:token` に変わったため、
  既存の設定は読まれない（設定 → WebClass 自動同期 で再発行）
- Service Worker の `CACHE_NAME` が `unionfetch-v2` に変わるので、
  既存ユーザーの古いキャッシュは activate 時に自動削除される（対応不要）
- `/privacy` `/terms` の連絡先は `support@unionfetch.com` に更新済み。
  **A5 の Email Routing を開通させるまでこのアドレスは死んでいる。**
  開通前に本番公開しないこと

---

## リリースまでの順序

最終更新: 2026-09-04

このファイルの目的は**「出さない理由」を減らすこと**。
やれることは無限にあるが、**リリースを止めてよい理由は下の「A. ブロッカー」だけ**と決める。
それ以外は全部 C（出した後）に置く。C を A に昇格させたくなったら、
「これが無いと最初の10人が価値を受け取れないか？」だけで判定する。

---

## A. ブロッカー（これが終わったら出す）

- [ ] **A1. 独自ドメイン取得 → Vercel 接続** … 手順は [domain-setup.md](./domain-setup.md)
- [ ] **A2. Resend でメール用サブドメイン認証（SPF/DKIM/DMARC）**
- [ ] **A3. `RESEND_FROM` / `NEXT_PUBLIC_APP_URL` / `AUTH_URL` を本番に設定 → 再デプロイ**
- [ ] **A4. Google OAuth のリダイレクトURI・同意画面URLを新ドメインに追加**
- [ ] **A5. Cloudflare Email Routing で `support@unionfetch.com` を開通させる**
      `/privacy` と `/terms` の連絡先は既にこのアドレスに差し替え済み。
      **開通前にデプロイすると、公開している問い合わせ窓口が死ぬ。**
- [ ] **A6. 「メール通知は準備中」の記述を消す**
      `src/app/docs/help/page.tsx` と `src/app/docs/sync/page.tsx` の2箇所。
      `emailEnabled` の初期値は false なので、消し忘れると
      「案内を読んだユーザーが誰もトグルを ON にせず、くさびが一度も発火しない」ことになる。
      `/docs` のウィザード（ステップ3「メール通知をオン」）とも矛盾している。
- [ ] **A7. 自分以外のアドレスに通知メールが届くことを実機で確認**
      ← A1〜A6 が本当に効いたかの唯一の合否判定
- [x] **A8. 通知の取りこぼし修正**（2026-09-04 実装）
      cron が1日1回のため、予約時刻を過ぎた通知が全部捨てられていた。
      「予約できるタイミングが無ければ締切に最も近い1件を即時送信」＋
      「同期・取り込み時にも通知を確定させる」に変更。
      関連: `src/lib/server/notification-logic.ts` / `src/lib/server/notify.ts`

## A'. Web Push を使う場合に必要なこと

メール（A1〜A3）とは独立して機能する。**独自ドメインが不要**なので、
ドメイン周りが片付く前でもここだけ先に出せる。

- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` を Vercel に設定 → 再デプロイ
      **鍵を変えると既存の購読が全部無効になる**ので、一度決めたら変えない。
      Vercel が `NEXT_PUBLIC_` に「Keep This Value Private」と警告するが、
      **VAPID の公開鍵はブラウザに渡らないと購読できない＝公開が前提**なので
      「Change to Config」で進めてよい。署名に使うのは秘密鍵のほうで、
      `VAPID_PRIVATE_KEY` は**絶対に Config にしない**。
- [ ] 🔴 **15〜30分間隔の外部 cron を用意する**
      ※ [notification-design.md](./notification-design.md) の3本立てを採用すると
      **この項目は不要になる**（朝のダイジェストは時刻固定、直前救済はメールの予約送信で足りる）。
      通知仕様が決まるまで着手しないこと。
      Vercel Hobby の cron は1日1回しか回せず、**Push は予約送信ができない**ため、
      1日1回だと「3時間前」がほぼ機能しない（シミュレーション済み）。
      cron-job.org 等から `GET /api/cron/notify` を
      `Authorization: Bearer <CRON_SECRET>` 付きで叩く。
      重複防止があるので何度叩いても二重送信にはならない。
- [ ] 実機で購読 → 通知が届くことを確認（iPhone は**ホーム画面に追加してから**）

## B. 出す直前の小物（各5〜15分・A の待ち時間にやる）

- [x] `metadataBase` / OGP を設定（LINE・X で共有したときのカード）
- [x] cron に `maxDuration = 60` とユーザー単位の並列化
- [x] `.env.example` を実態に合わせる
- [ ] **Vercel Analytics を入れる**（1行）。今は計測ゼロで、出した後に
      北極星指標（起動回数・3h救済数）を後追いで測れない
- [ ] 1200×630 の OG 画像を `public/og.png` に置いて `layout.tsx` の TODO を差し替え
- [x] `DATABASE_URL` はプーラー（6543・pgbouncer=true）を指している（確認済み）
- [x] 🔴 **Supabase のリージョンを東京(ap-northeast-1)へ移した**（2026-09-05）
      `ap-south-1`(ムンバイ) から移設。**1クエリ 678ms → 53ms（13倍）**、接続確立も 1765ms → 254ms。
      WebClass 取り込みは 3.1〜3.8秒 → 1秒未満になる見込み。
      ※ `.env`(Prisma CLI が読む) と `.env.local`(Next.js が読む) に同じ変数があると
      「アプリは新DB・db push は旧DB」という食い違いが起きる。DB接続は `.env` のみに置くこと。
- [ ] `UPSTASH_REDIS_REST_URL` / `TOKEN` が本番に入っているか確認（未設定でも動くが制限なしになる）

## C. 出した後（実ユーザーの反応を見てから決める）

優先度は**使われ方を見てから**付ける。今の段階で順番を決め込まない。

- [ ] 予約メールのキャンセル（提出後・締切変更後も催促が飛ぶ）
      → `NotificationHistory` に Resend のメールIDを持たせ、`emails.cancel` を呼ぶ
- [ ] クライアント通知のラベルもサーバー同様「実際の残り時間」に統一
- [ ] デザイン改修（**通し調整を1回で終わらせる。終わりが無い領域なので回数で区切る**）
- [ ] 未ログイン時のローカル編集/削除（現状は追加のみ）
- [ ] ソフトデリート（`deletedAt`）の定期 purge
- [ ] データエクスポート（開示請求対応）
- [ ] LINE 通知
- [ ] 週次サマリー / シェア
- [ ] **買い切りプレミアム課金**
      → 決済コードはゼロ。加えて特定商取引法に基づく表記・返金方針・利用規約の改定
      （現行規約は「個人が**無償で**提供する」と明記）が必要。
      **無料で使われない機能に値段は付かない**ので、C の中でも後ろでよい。
      やるときの最小構成: Stripe Payment Link + Webhook → `User.plan`

---

## リリース当日の手順

1. `feat/*` ブランチを PR → **マージはユーザーが行う**
2. Vercel の Production デプロイを確認
3. 別アカウント（できれば別端末）で新規ログイン → 課題が出るか
4. 設定でメール通知を ON → WebClass を1件取り込む → メールが来るか
5. `/privacy` `/terms` が新ドメインで開けるか
6. 友人3人に配る。**全学に配る前に3人で1週間**（WebClass のログイン方式・コース構成の差はここで出る）

## 出した後に見る数字

- アプリ起動回数（週次）＝ 締切の全体把握ができているか
- 直前救済数（3h/1h 通知の送信数）＝ 本来忘れていた課題を救った回数
- メール到達率・迷惑メール率（Resend ダッシュボード）
