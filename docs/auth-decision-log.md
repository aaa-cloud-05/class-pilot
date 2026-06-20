# 認証・Classroom API 設計判断ログ

Class Pilot における Google Classroom 連携の認証方式について、比較検討・試行錯誤・最終選定の経緯を記録する。

---

## 1. 要件

- ユーザーが Google Classroom の課題データを取得できること
- リロードや再アクセス時に毎回 Google ログインを要求しないこと
- 数日間ログインが維持されること（課題取得は手動ボタン押下でよい）
- セキュリティリスクを最小化すること

## 2. Google OAuth の技術的制約

| 項目 | 値 |
|------|-----|
| アクセストークン有効期限 | **1時間（Google側の仕様、変更不可）** |
| リフレッシュトークン有効期限 | 無期限（ユーザーが取り消すまで）※テストモードでは7日 |
| リフレッシュトークンの取得条件 | 認可コードフロー + `access_type=offline` + サーバーサイドでのコード交換 |
| Classroom API に必要なスコープ | `classroom.courses.readonly`, `classroom.coursework.me.readonly`, `classroom.student-submissions.me.readonly` |

**「数日間のログイン維持」にはリフレッシュトークンが必須であり、リフレッシュトークンの取得・使用にはサーバーサイドコードが必要。** これが全体の設計を決定づける制約となった。

---

## 3. 試行錯誤の経緯

### 3.1 初期実装: GIS Implicit Flow（クライアントのみ）

```
ユーザー → GIS initTokenClient → Google OAuth → access_token（メモリ保持）
```

- `google.accounts.oauth2.initTokenClient` でアクセストークンを取得
- トークンはメモリ上の変数 `currentToken` にのみ保持
- **問題**: リロードするとトークンが消失し、毎回ログインが必要

### 3.2 サイレントリフレッシュの試み（失敗）

```
ページ読み込み → requestAccessToken({ prompt: "" }) → ポップアップ → Safari がブロック
```

- `requestAccessToken({ prompt: "" })` で同意画面なしのトークン再取得を試みた
- **問題**: この関数は `prompt: ""` でもポップアップウィンドウを開く
- PC版Chrome: 「ポップアップがブロックされました」通知が出る（許可すれば動作）
- **Safari**: ポップアップをデフォルトでブロック。ユーザーが気づかずログアウト状態になる
- **結論**: ポップアップに依存するサイレントリフレッシュは Safari で使えない

### 3.3 localStorage トークン保存 + オンデマンドリフレッシュ（セキュリティ却下）

```
ログイン → localStorage に { access_token, stored_at } 保存
リロード → localStorage から復元 → 青アイコン表示
取得ボタン → 期限切れなら requestAccessToken（ユーザージェスチャー起点）
```

- ユーザーのボタン押下を起点にすれば、Safari でもポップアップが許可される
- サーバーサイド不要で実装がシンプル
- **却下理由: セキュリティリスク**
  - **XSS攻撃**: サイトに XSS 脆弱性があれば、JavaScript で localStorage からトークンを窃取可能。Classroom スコープ付きなので成績・課題データが漏洩する
  - **ブラウザ拡張機能**: 悪意のある拡張が localStorage を読み取れる
  - **永続的露出**: トークン文字列が明示的に削除されるまでディスクに残り続ける
  - HTTP-only cookie と異なり、JavaScript から常にアクセス可能

---

## 4. 実装方式の比較検討

### 4.1 Google Console 製品の検討

ユーザーから「Google Console 上の製品で解決できないか」という提案があり、以下を調査した。

| 製品 | 評価 |
|------|------|
| **Firebase Authentication** | Firebase 自体のセッションは数週間維持できるが、Classroom API のアクセストークンは1時間で切れる。Firebase は Firebase トークンをリフレッシュするが、Google OAuth アクセストークンのリフレッシュは行わない。結局サーバーサイドでリフレッシュトークンを使う必要があり、問題の本質は解決しない |
| **Cloud Functions** | リフレッシュトークン処理を実行できるが、Vercel API Routes と同じ役割。既存の Vercel デプロイと統合するなら API Routes の方が自然 |
| **Identity Platform** | Firebase Auth の上位版。同じ制約 |
| **Service Account** | サーバー間認証用。個人ユーザーの Classroom データにアクセスするには大学の Workspace 管理者権限が必要で、現実的でない |

**結論**: Google Console の製品でサーバーサイドコードを回避する方法はない。

### 4.2 サーバーサイド実装方式の比較

サーバーサイドが必須と確定した上で、以下の2方式を比較した。

#### A. NextAuth.js (Auth.js v5)

| 項目 | 内容 |
|------|------|
| 新規コード | ~80行 |
| 新規ファイル | 2個（設定 + ルートハンドラー）+ Classroom プロキシ1個 |
| 追加依存 | `next-auth@beta` |
| メリット | トークン管理・暗号化・cookie・リフレッシュをライブラリが処理。設定ファイル中心で記述量が少ない |
| デメリット | Next.js 16 との互換性リスク（未検証時点）。Classroom API のアクセストークンを session callback で取り出す必要あり |

#### B. 自前 API Routes

| 項目 | 内容 |
|------|------|
| 新規コード | ~200行 |
| 新規ファイル | 4個（session.ts, login route, logout route, classroom proxy） |
| 追加依存 | なし（Node.js crypto を使用） |
| メリット | 外部依存なし。互換性リスクなし。フル制御 |
| デメリット | cookie 暗号化・トークンリフレッシュ・セッション管理をすべて自前で書く必要がある |

### 4.3 選定結果

**NextAuth.js (Auth.js v5) を採用。** 理由:

1. コード量が大幅に少ない（~80行 vs ~200行）
2. トークンリフレッシュ・暗号化 cookie・セッション管理という「車輪の再発明」を避けられる
3. ビルドテストで Next.js 16 との互換性を確認できた
4. 動作しない場合のフォールバック（方式B）が明確

---

## 5. 最終アーキテクチャ

```
[ブラウザ]                           [Vercel (サーバーサイド)]
    |                                       |
    |-- signIn("google") -------→  /api/auth/callback/google
    |                                  NextAuth が認可コードを
    |                                  access_token + refresh_token に交換
    |                                  暗号化 HTTP-only cookie に保存
    |                                       |
    |←--- セッション cookie ---------       |
    |                                       |
    |-- GET /api/classroom -------→  cookie からトークン復号
    |                                  期限切れなら refresh_token で更新
    |                                  Google Classroom API 呼び出し
    |                                  変換済みデータを返却
    |←--- { assignments: [...] } ---       |
```

### セキュリティ特性

| 対策 | 内容 |
|------|------|
| HTTP-only cookie | JavaScript からアクセス不可（XSS 耐性） |
| Secure 属性 | HTTPS 限定 |
| SameSite=Lax | CSRF 防止 |
| AES 暗号化 | NextAuth が cookie 値自体を暗号化 |
| トークン非露出 | アクセストークン・リフレッシュトークンがクライアント JavaScript に渡らない |
| クライアントシークレット | サーバー環境変数のみ（`.env.local`, Vercel env） |

### ファイル構成

```
src/
├── auth.ts                              # NextAuth 設定（Google プロバイダー、JWT リフレッシュ）
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth ハンドラー
│   │   └── classroom/route.ts           # Classroom API プロキシ
│   ├── login/page.tsx                   # signIn("google") を呼ぶ
│   ├── settings/page.tsx                # signOut() を呼ぶ
│   └── page.tsx                         # useSession() でログイン状態表示
├── hooks/
│   └── useAssignments.ts                # fetch("/api/classroom") 経由で取得
└── lib/
    ├── classroom-api.ts                 # サーバー専用（トークンを引数で受け取る）
    └── transform.ts                     # 課題データ変換（サーバー・クライアント共用）
```

---

## 6. デプロイ時の設定（1回のみ）

1. Google Cloud Console → OAuth 2.0 クライアント ID → クライアントシークレットを確認
2. 承認済みリダイレクトURI に `https://classpilot-view.vercel.app/api/auth/callback/google` を追加
3. OAuth 同意画面を「本番」に公開（テストモードだとリフレッシュトークンが7日で失効）
4. Vercel 環境変数:
   - `GOOGLE_CLIENT_SECRET` — Google Cloud Console から取得
   - `AUTH_SECRET` — `npx auth secret` で生成

---

## 7. 将来の拡張パス

- **DB 追加時**: NextAuth に DB アダプター（Prisma 等）を追加するだけでセッション管理が DB 方式に切り替わる
- **Capacitor (ネイティブアプリ)**: サーバーサイド認証はそのまま利用可能。WebView 内で同じフローが動作する
