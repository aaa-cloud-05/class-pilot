# WebClass 内部 API 調査結果

最終更新: 2026-09-05 ／ 対象: 電気通信大学 `webclass.cdel.uec.ac.jp`（WebClass / 日本データパシフィック）

課題の取得を **DOM スクレイピングから JSON API 呼び出しへ**切り替えるための調査記録。
実装は `src/lib/bookmarklet.ts` / `src/lib/webclass.ts`。

> **生キャプチャを `docs/row/` に置く場合の注意**：DevTools の出力には
> `_shibsession_*` / `WBT_Session`（＝有効なログインセッション）と本名・学籍番号・得点が
> そのまま入る。`docs/row/` は `.gitignore` 済み。**絶対にコミットしない。**

## 1. 結論

課題実施状況一覧の画面は、WebClass 本体ページの中の `<iframe id="ip-iframe">` で動く
Vue 製 SPA（`score_summary_table` プラグイン）で、以下の JSON API を叩いている。

```
BASE = https://<webclass-host>/webclass/ip_mods.php/plugin/score_summary_table

GET  {BASE}/courses                      コース一覧
GET  {BASE}/faculties                    学部・学科マスタ（本アプリでは不要）
GET  {BASE}/contents?group_id=<32hex>    そのコースの課題（学生用）
GET  {BASE}/author_contents?group_id=…   教員用（学生では使わない）
```

- 認証は **Cookie のみ**（`WBT_Session` / `_shibsession_*` / `WCAC=Authenticated`）
- **同一オリジンの素の GET** ＝ WebClass のどのページからでも `fetch` で呼べる
- したがって **課題実施状況一覧ページを開く必要がない**

### 根拠

`課題状況一覧_files/index-24892ab1.js`（SPA バンドル）内:

```js
await zt(e.get("API_URL") + "/courses")
zt(t.get("API_URL") + "/contents?group_id=" + e)
```

`API_URL` の実値は `dashboard.html` の `<script type="application/json">` にある:

```json
{ "TOP_URL": "/webclass/",
  "BASE_URL": "/webclass/ip_mods.php/plugin/score_summary_table",
  "API_URL":  "/webclass/ip_mods.php/plugin/score_summary_table",
  "userWebClassId": "<32hex>" }
```

`userWebClassId` は **ログイン中ユーザー自身の ID**。`scores[].user_id` と突き合わせるのに使う。

## 2. レスポンスの形

### `/courses`

```jsonc
[{
  "group_id": "240306140001234989momi",   // コースID。contents の引数になる
  "group_name": "2026オペレーティングシステム論-…",
  "status": "0",            // "0" / "32"。※年度とは相関しない（下記）
  "semester": "1",          // "0" / "1" / "2"。年の情報を持たない
  "controlled": "webclass", // "webclass" / "portal"
  "added": "1709700359",    // UNIX秒
  "open_period_start": "",  // 実測では全件空。フィルタに使えない
  "open_period_end": ""
}]
```

**終了コースの判定に使える確実なフィールドは無い。** 実測21件で `status` は
2024年度のコースに `0` と `32` が混在しており、開講状態を表していない。
唯一の実用的な手がかりは `group_name` 先頭の西暦（`"2026…"`）だが、
これは大学の命名慣習に依存する（`"INFOSS情報倫理2026年版"` のように先頭に年が
来ないコースもある）。→ 実装では**「先頭が4桁の西暦で、かつ2年以上前」のときだけ
スキップする緩い判定**にとどめ、判定できないものは必ず取得する。

### `/contents?group_id=…`

コース内コンテンツの配列。使うのは次のフィールドだけ。

| フィールド | 内容 |
|---|---|
| `contents_id` | 32桁hex。**安定した課題ID**。改名・締切変更でも変わらない |
| `contents_name` | 課題名 |
| `contents_kind` | `"Question"` が課題。教材等と区別できる |
| `end_date` | **締切**。`"2024-10-03 23:59:59"`（TZ表記なし＝サーバのJST） |
| `start_date` | 公開日。同形式 |
| `scores` | 後述。**提出判定にだけ使い、他は破棄する** |

`end_date` / `start_date` は `null` のことがある（教材や常時公開の演習）。

### `scores` の扱い（重要）

```jsonc
"scores": [{
  "user_id": "<32hex>",            // = userWebClassId（自分）
  "username": "t2413648",          // 学籍番号   ← 保存しない
  "realname": "…",                 // 本名       ← 保存しない
  "max_score": 1,                  // 得点       ← 保存しない
  "answer_datetime": "2024-10-03 22:38:17"   // 提出時刻 ← これだけ使う
}]
```

実測13件すべて **長さ1・`user_id` は自分のみ**。他の学生の情報は返らない
（WebClass 側の実装として正しい）。

- **提出済み** = `scores` に自分の `answer_datetime` があること
- `username` / `realname` / `max_score` は**読まずに捨てる**。
  プライバシーポリシーの「成績は取得・保存しない」を守るための必須条件。

これにより、旧実装の「状態」列の文字列判定（`回答済み` / `未回答` / `-`）が不要になり、
`submissionState` の `"unknown"` が WebClass 由来では発生しなくなる。

### 課題ページへの直リンク

SPA が生成しているものと同じ形にする。

```
{TOP_URL}course.php/{group_id}/contents/{contents_id}/
```

旧実装はコースのトップにしか飛べなかったので、**課題単位で開けるようになる**のは
純粋な改善。

## 3. WebClass サーバへの負荷を抑える設計

### 条件付き GET が効く（最大の効き目）

レスポンスに `last-modified`、リクエストに `if-modified-since` が実際に載っている。
`cache-control: no-cache` は「使う前に必ず再検証しろ」の意味なので、キャッシュ自体は有効。

→ **`fetch()` のキャッシュを無効化しない**だけで、ブラウザが自動的に
`If-Modified-Since` を付け、変化が無ければサーバは 304（ボディ無し）を返す。
`cache: "no-store"` や `?t=<乱数>` を付けると**この恩恵を自分で潰す**ので絶対にやらない。

### そのほか

| 対策 | 効果 |
|---|---|
| 学生が WebClass を開いたときだけ実行 | 追加のページロードがゼロ。定期ポーリングより圧倒的に軽い |
| `hiddenCourses` を除外 | 学生自身が設定画面で選べる。いちばん確実に減る |
| 年度の古いコースをスキップ | 実測で21件→14件程度 |
| 直列＋数百msの間隔 | 合計が同じでも瞬間負荷を下げる |
| 60分のスロットル（localStorage） | タブを何枚開いても1回 |
| User-Agent を偽装しない | 誠実さの担保 |

定常状態では「1時間に1回・十数コース・ほぼ全部 304」になる。
公式の課題実施状況一覧ページを1回開くのと同等かそれ以下。

## 4. DevTools での再調査手順

他大学へ展開するとき、または WebClass が更新されたときに使う。

```
1. F12 → Network タブ
2. ☑ Preserve log        ← iframe 遷移でログが消えないように
3. フィルタは All のまま  ← Fetch/XHR で絞ると iframe 本体(Doc)が見えず文脈を失う
4. 🚫 でクリア
5. ここで F5 リロード     ← 「開いてから DevTools」では初回だけの通信を取り逃す
6. Filter に score_summary_table と入力
```

- `/courses` は **iframe ロード時に1回だけ**飛ぶ。5番の順序を守らないと捕まらない
- 保存するときは **Preview タブではなく Response タブ**（Preview のコピーは `…` で省略される）
- 行を右クリック → **Copy → Copy as fetch** が実装には一番役立つ
- Console タブ左上の `top` ドロップダウンを `ip-iframe` に切り替えると、
  iframe の中のコンテキストで直接試せる:
  ```js
  await (await fetch("/webclass/ip_mods.php/plugin/score_summary_table/courses")).json()
  ```
- **Save all as HAR には Cookie が丸ごと入る。** 共有前に必ず中身を確認する

## 4.5 実装した取り込み条件

`src/lib/bookmarklet.ts` が実際に送るのは、次をすべて満たすものだけ。

| 条件 | 理由 |
|---|---|
| コース名の先頭が4桁の西暦のとき、2年以上前ならコースごとスキップ | 実測21→13コース。判定できない名前のコースは必ず取得する |
| `contents_kind === "Question"` | 教材を除く。レポート提出もこの種別だった |
| `hidden_content` が立っていない | 公式UIと同じ扱い |
| `end_date` がある | **締切の無い課題は取り込まない**（下記の注意） |
| 締切が180日以内 | 過去の学期を丸ごと落とす。URLハッシュのサイズ対策でもある |

さらに、`/import` に渡す URL が 60,000 文字を超える場合は締切の古いものから間引く。
実測では1コース13件で約3,700文字。13コースすべてが同規模でも48KB程度に収まる。

> **注意: 締切の無い課題は取り込まれない。**
> WebClass には常時公開の演習（TOEIC 練習など）が `contents_kind: "Question"` かつ
> `end_date: null` で大量に存在し、そのまま入れると一覧が埋まる。締切リマインダーという
> 性質上そう決めたが、**教員が締切未設定でレポートを出した場合は取りこぼす**。
> 取りこぼしの報告が出たらここを見直す。

## 4.6 2つの出口（手動 / 自動）

取得ロジックは `src/lib/webclass-script.ts` の `COLLECT` 1か所にまとまっていて、
そこから2つを生成する。

| | ブックマークレット | ユーザースクリプト |
|---|---|---|
| 実行 | 手動（押す） | **WebClass を開くと自動** |
| 対応 | PC / Android / **iOS Safari** | Tampermonkey（PC・Firefox Android・Kiwi） |
| 配布 | コードをコピーしてブックマークに貼る | コードをコピーして Tampermonkey に貼る |
| 審査 | 不要 | **不要**（自分では何も提出しない） |
| 更新 | 各自が貼り直す | `@updateURL` で自動配信も可能 |
| 送信先 | `/import#<JSON>` を開く | `POST /api/import/webclass` に直接 |
| 認証 | セッション Cookie | **取り込みトークン** |
| スロットル | なし（押したときだけ） | 60分 |

iOS Safari では Tampermonkey が動かないため、**ブックマークレットは残す**。

### なぜトークンが要るのか

ユーザースクリプトは WebClass のページから Classmino へ送るのでクロスサイト送信になり、
NextAuth のセッション Cookie は `SameSite=Lax` なので付かない。
そのため専用の資格情報を配る。

- 平文は発行時に一度だけ返し、DB には **SHA-256 のハッシュだけ**保存する
  （`User.importTokenHash`）。DB が漏れてもトークンとしては使えない
- **トークン経由の応答は課題一覧を返さない**（件数だけ）。返すとトークンが
  書き込みだけでなく読み取りの能力まで持ってしまうため
- 失効・再発行は設定画面から

### 送信するペイロード

`POST /api/import/webclass` は2つの形を受け取る。

```
{ assignments: Assignment[] }   /import ページが変換済みの配列を送る（ブックマークレット）
{ payload: WebClassPayload }    WebClass API の生の形をそのまま送る（ユーザースクリプト）
```

後者をサーバ側で `transformWebClassPayload()` に通すことで、
ユーザースクリプトに変換ロジックを複製せずに済んでいる。

## 4.7 他大学への展開

**認証方式には依存しない。** 本学は Shibboleth SSO だが、実装が使うのは
「ブラウザに既にあるセッション Cookie」だけなので、ログイン方式が
Shibboleth でも WebClass 独自ログインでも他の SSO でも同じように動く。

大学ごとに変わりうるのは次の3点。

| 箇所 | 現状の対応 |
|---|---|
| WebClass のベースURL | `webclass.js` の script src と `location.pathname` から自動で解決する |
| `score_summary_table` プラグインの有無 | 未導入の大学では `/courses` が 404 になる。要検証 |
| コース名の年度表記 | `^\d{4}` に一致しないコースは**スキップせず必ず取得する**ので、命名が違っても壊れない |

ユーザースクリプトの `@match` は `https://webclass.*/*` と `https://*/webclass/*` の
2本にしてあるので、多くの大学はそのまま当たるはず。

## 5. 未確認事項

| 項目 | 状況 |
|---|---|
| `/contents` が実際に 304 を返すか | ヘッダの存在から確実視できるが未実測。実装後にログで確認する |
| `contents_kind` の全種類 | 1コース分しか観測しておらず `"Question"` のみ。他の値は課題として扱わない実装なので、取りこぼしが出たらここを疑う |
| 他大学での URL 構造 | `ip_mods.php/plugin/score_summary_table` はプラグイン名なので共通のはずだが未検証。ベースURLは自動解決するので、問題になるとすればプラグイン自体が未導入のケース |
| 他大学のログイン方式 | 本学は Shibboleth SSO だが**実装は認証方式に依存しない**（既存のセッションCookieを使うだけ）。他大学が別方式でも動くはず |

## 6. 移行にあたっての注意

- 課題の DB 上の識別子（`sourceKey`）を `webclass:<コース名>::<課題名>` から
  `webclass:<contents_id>` に変更する。**課題名や締切が変わっても同一の課題として追える**ようになる。
  既存行は取り込み時に旧キーで引き当てて新キーへ引き継ぐ（削除はしない）。
- `courseId` が `wc-<コース名のhash>` から `wc-<group_id>` に変わるため、
  **設定画面の「非表示コース」は一度リセットされる**（再設定が必要）。
