# Classroom API 動作確認プロトタイプ (Phase 0)

目的: **自分の大学アカウントで Google Classroom API が課題を取得できるか**を確かめる、
UIほぼなしの最小プロトタイプ。ビルド不要・単一HTML。

> ⚠️ 大学が Google Workspace for Education で「サードパーティ製アプリのAPIアクセス」を
> 管理者がブロックしている場合、ここで取得できません。それを確認するのがこの Phase 0 の目的です。

---

## セットアップ手順

### 1. Google Cloud プロジェクトを作る
1. https://console.cloud.google.com/ でプロジェクトを新規作成
2. 「APIとサービス」→「ライブラリ」で **Google Classroom API** を検索して**有効化**

### 2. OAuth 同意画面を設定
1. 「APIとサービス」→「OAuth 同意画面」
2. User Type は **外部 (External)** を選択
3. アプリ名・サポートメール等を最小限で入力
4. **スコープ**は今は追加しなくてOK（アプリ側で要求する）
5. **テストユーザー**に**自分の大学アカウントのメールアドレスを追加**（重要）
   - 公開審査なしで使えるのはテストユーザーのみ（最大100人）

### 3. OAuth クライアントIDを作る
1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類: **ウェブ アプリケーション**
3. **承認済みの JavaScript 生成元** に以下を追加:
   ```
   http://localhost:8000
   ```
   （下の起動コマンドのポート番号と一致させること）
4. 作成後に表示される **クライアント ID** をコピー

### 4. プロトタイプに設定
`index.html` 下部の以下の行を、コピーしたクライアントIDに置き換える:
```js
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
```

---

## 起動

`file://` で直接開くと OAuth が動かないため、ローカルサーバ経由で開く。

Python がある場合:
```
python -m http.server 8000
```
Node がある場合:
```
npx serve -l 8000
```
ブラウザで **http://localhost:8000** を開く。

---

## 使い方
1. 「Googleでログイン」→ 大学アカウントを選択（テストユーザーに登録したもの）
2. 読み取り専用の許可を承認
3. 受講中コースと各コースの課題（締切付き）が一覧表示される
4. 下部に取得した生 JSON が出る

### 期待する結果
- コースと課題が表示される → **API利用OK。本開発に進める** ✅
- `HTTP 403 PERMISSION_DENIED` 等 → 管理者がAPIをブロックしている可能性 ⚠️
- コース0件 → 学生として参加中のクラスがあるか確認

---

## 取得しているもの
- 受講コース一覧: `GET /v1/courses?courseStates=ACTIVE&studentId=me`
- 各コースの課題: `GET /v1/courses/{id}/courseWork`（title, dueDate, dueTime など）

スコープは読み取り専用のみ:
- `classroom.courses.readonly`
- `classroom.coursework.me.readonly`

---

## 次のステップ
ここで取得できることを確認できたら、本番のアプリ（Expo / Next.js）で
同じ OAuth・API 呼び出しを組み込み、ローカルDB保存・通知・カレンダー表示へ進む。
