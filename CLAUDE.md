@AGENTS.md

# Class Pilot — プロジェクト指針

Google Classroom + WebClass の課題を集約し、締切をメール/ブラウザで通知する学生向け PWA
（某大学向け、個人開発、一般公開予定）。Next.js 16 + NextAuth v5 + Prisma/Supabase + Vercel。

## 必読ドキュメント
- `docs/architecture.md` — 現行のデータフロー/構成の**正本**（SWR3段取得・DB=真実のソース・cron等）
- `docs/product-brief.md` — プロダクトの価値定義（くさび=WebClass通知・北極星・収益方針）
- `docs/backlog.md` — 未実装機能・セキュリティ/法務/使用量の課題（優先度付き）
- ※ `docs/phase-plan.md` / `phase2-implementation.md` / `known-issues.md` は旧記述を含む。現行は architecture.md 参照。

## アーキテクチャ要点
- ログイン中は **DB が真実のソース**、IndexedDB は表示用ミラー（未ログイン時のみ一次ストア。IndexedDB系コードは消さない）。
- 取得は SWR3段：①キャッシュ即描画 → ②`GET /api/assignments`（DB・トークン不要）→ ③`POST /api/classroom/sync`（Google・裏）。
- メール通知 cron（`/api/cron/notify`）は **DBベース**（全ソース対応）。Resend 予約配信。

## 開発・運用の制約（重要）
- **DB スキーマ変更は `prisma db push`** を使う。`migrate dev` は履歴ドリフトで**本番DBのリセットを要求する**ので使わない。build は `migrate deploy` しない（スキーマは手動 push 運用）。
- Windows で `prisma generate` が EPERM になるときは **dev サーバを停止**してから実行。
- `DATABASE_URL` が Supabase の**プーラー(pgbouncer/6543)**を指しているか要確認（直結だとサーバレスで接続枯渇）。
- **PR は作成するがマージはユーザーが行う**。作業は feature ブランチ→PR。
- **複雑すぎる実装は避ける**（ユーザーの明示的な好み）。
- コミットメッセージ/PR本文に**メールアドレスを書かない**。公開連絡先は `f.ord10.5k@gmail.com`。
- ユーザーの代理ログインはしない（認証情報を入力しない）。
