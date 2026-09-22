@AGENTS.md

# UnionFetch — プロジェクト指針

> ドメインは **unionfetch.com**、アプリ名は **UnionFetch**（どちらも確定）。
> 旧名 `Class Pilot` / `Classmino` は使わない（`docs/auth-decision-log.md` の
> `classpilot-view.vercel.app` だけは過去の実URLの記録なので残してある）。

Google Classroom + WebClass の課題を集約し、締切をメール/ブラウザで通知する学生向け PWA
（某大学向け、個人開発、一般公開予定）。Next.js 16 + NextAuth v5 + Prisma/Supabase + Vercel。

## 必読ドキュメント
- `docs/architecture.md` — 現行のデータフロー/構成の**正本**（SWR3段取得・DB=真実のソース・cron等）
- `docs/product-brief.md` — プロダクトの価値定義（くさび=WebClass通知・北極星・収益方針）
- `docs/release-checklist.md` — **まず「現在地」を読む。決定済み事項と次にやることが書いてある**
- `docs/notification-design.md` — 通知仕様の検討結果（**提案・承認待ち**。現行のプリセット3種は仮なので作り込まない）
- `docs/domain-setup.md` — 独自ドメイン・DNS・Resend・OAuth の手順と用語
- `docs/webclass-api.md` — **WebClass 内部 API の仕様・負荷対策・再調査手順**
- `docs/backlog.md` — 未実装機能・セキュリティ/法務/使用量の課題（実装現況に同期済み）
- `docs/ui-playbook.md` — **UI の作り方・アンチパターン・確定値（v1〜v5 の学び）**。画面を触る前に読む
- `docs/ui-v5-migration.md` — **v5 を本番 UI にするときの差分・矛盾・実装計画**
- `docs/ui-redesign.md` — UI リデザインの作業メモ（**過去の記録**。モックは削除済み）。新しい画面構成・機能の対応表・スキルの使い分け。モックは `/mock`（本番では 404）、参考 DESIGN.md は `docs/design-refs/`
- ※ `docs/phase-plan.md` / `phase2-implementation.md` / `known-issues.md` は**過去の記録**（各ファイル冒頭に明記）。現行は architecture.md 参照。

## アーキテクチャ要点
- ログイン中は **DB が真実のソース**、IndexedDB は表示用ミラー（未ログイン時のみ一次ストア。IndexedDB系コードは消さない）。
- 取得は SWR3段：①キャッシュ即描画 → ②`GET /api/assignments`（DB・トークン不要）→ ③`POST /api/classroom/sync`（Google・裏）。
- メール通知 cron（`/api/cron/notify`）は **DBベース**（全ソース対応）。Resend 予約配信。

## 開発・運用の制約（重要）
- **DB スキーマ変更は `prisma db push`** を使う。`migrate dev` は履歴ドリフトで**本番DBのリセットを要求する**ので使わない。build は `migrate deploy` しない（スキーマは手動 push 運用）。
- Windows で `prisma generate` が EPERM になるときは **dev サーバを停止**してから実行。
- `DATABASE_URL` が Supabase の**プーラー(pgbouncer/6543)**を指しているか要確認（直結だとサーバレスで接続枯渇）。
- **作業は feature ブランチ→PR**。マージは基本ユーザーが行うが、指示があれば Claude がマージしてよい。
- **複雑すぎる実装は避ける**（ユーザーの明示的な好み）。
- コミットメッセージ/PR本文に**メールアドレスを書かない**。公開連絡先は `support@unionfetch.com`（個人の Gmail アドレスは docs・コード・画面のどこにも書かない）。
- ユーザーの代理ログインはしない（認証情報を入力しない）。
