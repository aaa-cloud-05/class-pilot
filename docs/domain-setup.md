# 独自ドメイン導入ガイド（Cloudflare + Vercel + Resend + Google OAuth）

最終更新: 2026-09-04

「ドメインを取る」ことが、**メール通知・OAuth 同意画面・SNS共有**の3つを同時に解錠する。
逆に言うと、ドメインが無いうちは `onboarding@resend.dev` のせいで**メール通知が実ユーザーに
1通も届かない**（＝本製品のくさびが存在しない）。だからここが最優先になる。

---

## 0. 全体像

```
                  ┌─ Web    : example.com          → CNAME → Vercel
example.com ──────┤
 (Cloudflare で   └─ メール : mail.example.com     → TXT(SPF/DKIM) → Resend が送信を許される
  買う＋DNSを持つ)

Google OAuth ── リダイレクトURI https://example.com/api/auth/callback/google を許可
Vercel 環境変数 ── AUTH_URL / NEXT_PUBLIC_APP_URL / RESEND_FROM を新ドメインに
```

**1つのドメインを、Web と メール で別々の名前に分けて使う**のが要点。理由は §3。

---

## 1. 用語（ここだけ読めば以降が読める）

| 用語 | 意味 | なぜ必要か |
|---|---|---|
| **レジストラ** | ドメインを売る業者（Cloudflare Registrar, お名前.com 等） | 名前の所有権を登録する場所 |
| **ネームサーバ (NS)** | 「この名前はどこ？」に答えるサーバ | ここが実際の運用主体。レジストラと別でもよい |
| **DNS レコード** | 名前 → 値 の対応表 | 下の各種別を組み合わせて設定する |
| **A / AAAA** | 名前 → IPアドレス(v4 / v6) | 固定IPのサーバを指すとき |
| **CNAME** | 名前 → 別の名前（別名） | Vercel は IP が変動するので**名前**で指す |
| **TXT** | 名前 → 任意の文字列 | 所有証明・SPF・DKIM・DMARC に使う |
| **MX** | そのドメイン宛メールの**受信先** | 送信には不要。バウンス受信のため Resend が求めることがある |
| **apex（ルートドメイン）** | `example.com` そのもの | 仕様上ここに CNAME は置けない（→ §2） |
| **サブドメイン** | `www.example.com` `mail.example.com` | 用途ごとに名前を分けられる |
| **TTL** | レコードのキャッシュ時間 | 変更が世界に反映されるまでの待ち時間 |
| **プロキシ（オレンジ雲）** | Cloudflare が通信を中継する機能 | **Vercel と併用すると壊れやすい**（→ §2） |
| **SPF** | 「この名前でメールを出してよいサーバ」の宣言(TXT) | 詐称防止。無いと迷惑メール判定 |
| **DKIM** | 送信時に秘密鍵で署名、公開鍵をDNS(TXT)に置く | 転送されても壊れにくい本人証明 |
| **DMARC** | SPF/DKIM 失敗時の扱いと報告先の宣言(TXT) | Gmail が事実上必須化。到達率に直結 |

---

## 2. 手順①：ドメインを取り、Vercel に向ける

### 買う
Cloudflare Registrar は**原価提供**（上乗せ・更新時の値上げが無い）ので個人開発に向く。
ただし**対応 TLD が限られる**（`.jp` は扱いが無い）。`.com` / `.app` / `.dev` あたりが無難。
> `.app` `.dev` は常時HTTPS必須の TLD だが、Vercel は最初から HTTPS なので問題にならない。

Cloudflare で買うと、ネームサーバも自動的に Cloudflare になる。**DNS を Cloudflare 側に置いたまま
Vercel を指す**構成を推奨（メールの DNS も同じ画面で管理できる／後でホスティングを変えても
ドメイン設定を作り直さずに済む）。

### つなぐ
1. Vercel の Project → Settings → Domains に `example.com` と `www.example.com` を追加
2. Vercel が表示する値を Cloudflare の DNS に登録する
   - `www` → **CNAME** → `cname.vercel-dns.com`（Vercel が指示する値をそのまま）
   - apex `example.com` → Vercel は A レコードを指示する。Cloudflare なら **CNAME を書いてもよい**
3. **プロキシ状態は必ず「DNS のみ（グレー雲）」にする** ← 最重要

#### なぜ apex に CNAME を書けるのか（CNAME フラット化）
DNS の仕様上、apex には NS/SOA レコードが必ず存在し、CNAME はそれらと共存できない。
Cloudflare は **CNAME フラット化**という機能で、内部では CNAME を保持しつつ、問い合わせに対しては
解決済みの A レコードを返す。結果として apex に CNAME を書ける。

#### なぜプロキシを OFF にするのか
オレンジ雲にすると Cloudflare が通信を中継し、Cloudflare のIPを返す。すると
- Vercel が証明書を発行するためのドメイン検証に失敗しやすい
- Cloudflare と Vercel の CDN が二重になり、キャッシュとリダイレクトの挙動が読めなくなる
- SSL/TLS モードが `Flexible` のままだとリダイレクトループが起きる

Vercel 公式も DNS-only を推奨している。**Cloudflare は「ドメインとDNSの管理場所」として使い、
配信は Vercel に任せる**、と割り切るのが事故が少ない。

### www をどちらかに寄せる
`example.com` を正とし、`www` は Vercel の Domains 画面で apex へリダイレクトさせる。
同じ内容が2つのURLで見えると、OAuth のリダイレクトURI や OGP のキャッシュで混乱の元になる。

---

## 3. 手順②：Resend にメール用サブドメインを認証させる

### なぜサブドメインを使うのか
メールの「送信ドメイン評判」は**名前ごとに**積み上がる。通知メールを `mail.example.com` から出せば、
万一大量に迷惑メール報告されても、`example.com`（Webサイトや将来の連絡用メール）の評判を
巻き添えにしない。逆に、Web 側で何かあってもメール到達率に影響しない。**分離＝保険**。

### 手順
1. Resend ダッシュボード → Domains → Add Domain → `mail.example.com`
2. 表示された **TXT（SPF）/ TXT（DKIM）/ MX** の値を、Cloudflare の DNS にそのまま登録
   - Cloudflare が「名前」に自動でドメインを補完する場合がある。`mail.example.com.example.com`
     のような二重にならないか、登録後に必ず確認する
   - メール系レコードは**絶対にプロキシしない**（TXT/MX はそもそも対象外だが、CNAME 形式で
     出てくる値をオレンジ雲にすると壊れる）
3. Resend の Verify を押す。数分〜数十分かかることがある
4. **DMARC を自分で足す**（Resend は必須にしていないが、Gmail 対策として入れる）
   - 名前: `_dmarc.mail.example.com`
   - 値: `v=DMARC1; p=none; rua=mailto:あなたの連絡先`
   - `p=none` は「失敗しても受信は拒否しないが、レポートは送って」の意味。まずここから始め、
     レポートを見て問題がなければ `quarantine` に上げる

### アプリ側（実装済み）
`RESEND_FROM` を設定するだけで送信元が切り替わる。

```
RESEND_FROM=Class Pilot <noreply@mail.example.com>
RESEND_REPLY_TO=公開連絡先のアドレス
```

未設定なら `onboarding@resend.dev` にフォールバックする（＝自分宛のテストは今まで通り可能）。
メール本文には `NEXT_PUBLIC_APP_URL` を基準にした**「通知設定を変更・停止する」リンク**が入る。
これは親切心ではなく実利で、止め方が見つからないと人は「迷惑メール報告」を押し、
その1回が送信ドメイン全体の評判を削る。

### 枠の確認
Resend 無料枠は **100通/日・3,000通/月**。1ユーザーが1日に受け取るのは多くて数通なので、
初期の数十人なら足りる。超えそうになったら有料プランか、1日1通のダイジェストに寄せる。

---

## 4. 手順③：Google OAuth を新ドメインに対応させる

Google Cloud Console → 認証情報 → OAuth 2.0 クライアント ID

| 項目 | 追加する値 |
|---|---|
| 承認済みの JavaScript 生成元 | `https://example.com` |
| 承認済みのリダイレクト URI | `https://example.com/api/auth/callback/google` |

- **既存の `*.vercel.app` のエントリは消さない**。切り戻し先とプレビュー環境が死ぬ
- リダイレクト URI は**完全一致**。末尾スラッシュ・`www` の有無で別物として扱われる

OAuth 同意画面（ブランディング）にも登録する：

| 項目 | 値 |
|---|---|
| アプリのホームページ | `https://example.com` |
| プライバシーポリシー | `https://example.com/privacy` |
| 利用規約 | `https://example.com/terms` |
| 承認済みドメイン | `example.com` |

> 本アプリは `classroom.*.readonly` の**機密スコープを使っていない**ため、Google の審査は不要
> （backlog A2 で確認済み）。ここで登録するのは同意画面の見た目と信頼性の問題。

---

## 5. 手順④：環境変数を入れ替える

Vercel → Settings → Environment Variables（**Production**）

```
AUTH_URL=https://example.com                       # NextAuth のコールバック基準URL
NEXT_PUBLIC_APP_URL=https://example.com            # メールの絶対リンク / OGP の metadataBase
RESEND_FROM=Class Pilot <noreply@mail.example.com>
RESEND_REPLY_TO=公開連絡先のアドレス
```

**入れ替えたら必ず再デプロイする。** `NEXT_PUBLIC_` で始まる変数はビルド時にコードへ焼き込まれる
ため、変数を保存しただけでは反映されない。

---

## 6. 確認手順

```bash
# DNS が引けるか（Windows PowerShell）
nslookup -type=TXT mail.example.com
nslookup -type=TXT _dmarc.mail.example.com
```

1. Resend ダッシュボードのドメインが **Verified** になっている
2. **自分以外のアドレス**（大学メールなど）に実際にテスト送信して届く
   ← `onboarding@resend.dev` のままだとここで必ず失敗するので、切り替えの真の合否判定になる
3. 届いたメールを Gmail で開き「メッセージのソースを表示」→ **SPF / DKIM / DMARC がすべて PASS**
4. `https://example.com` が Vercel の中身を返し、鍵マークが出る
5. ログイン → Google 同意画面に新しいドメインとポリシーURLが出る
6. LINE か X に URL を貼って、タイトルと画像が出る（OGP）

---

## 7. つまずきやすい点

| 症状 | 原因 |
|---|---|
| 証明書が発行されない / リダイレクトループ | Cloudflare のプロキシが ON（オレンジ雲）。DNS のみに変更 |
| Resend が Verify されない | レコード名が二重（`mail.example.com.example.com`）／値の前後に空白／伝播待ち |
| メールが迷惑メールに入る | DMARC 未設定、または本文に配信停止導線が無い |
| ログインで `redirect_uri_mismatch` | Console の URI と実際のURLが完全一致していない（`www` / 末尾スラッシュ） |
| メール内リンクが localhost | `NEXT_PUBLIC_APP_URL` 未設定、または env 変更後に再デプロイしていない |
| OGP が古いまま | 各SNSがOG情報をキャッシュしている。デバッガで再取得する |
