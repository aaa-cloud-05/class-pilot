# v5 を本番 UI にする — 差分と実装計画

最終更新: 2026-09-22
基準の実装: `src/app/mock-v5/` ／ 作法: `docs/ui-playbook.md` ／ 画面仕様: `docs/ui-redesign.md`

現行の本番 UI と v5 を突き合わせて、**落ちる機能・意味が変わるもの・矛盾**を洗い出した。
本番の実装はまだしていない（モックの修正だけ済み）。

## 0. 決定（2026-09-22）

| # | 論点 | 決定 |
|---|---|---|
| A | 提出済みの色 | **青**。ぶつかる「まだ先の未提出」は**灰**に回す（→ §2A に確定表） |
| B | 現行の「緑＝提出済」 | **緑は捨てる** |
| C | 黄色の意味 | **締切まで24時間以内**（v5 のまま） |
| D | 同期失敗からの復帰 | **同期シートの中に「再試行」を1つ置く**。ヘッダーの更新ボタンは復活させない |
| E | 並び替え | **「最近」「すべて」タブの右に置く**。タブをまたいで、どちらのリストにも効く |
| F | 手動追加のコース色 | **名前から自動で割り当てる**（色選択の欄は作らない） |
| G | 提出済（遅延） | **`dueLabel` の sub に「提出済み（遅れ）」を出す** |
| H | 通知の見落とし | **未読があるとき、下タブの「ホーム」に赤ドット** |
| I | 鮮度のしきい値 | **v5 を採用**（ソースごとに別のしきい値）。`week-adapter.freshnessOf` は捨てる |
| J | WebClass URL の入力欄 | **2か所のままでよい**。保存先は1つにして即反映を確認する |

### モック側で済ませた修正（2026-09-22）

- 「すべて」＞ 期限なし の3タブを、見出しの横から**下のフル幅**へ。3つが等幅（112px）になり、
  選択のピルが幅を変えずに滑るようになった（前は 80 / 67 / 93px でピルが歪んでいた）
- 「すべて」の**今週バッジを廃止**し、代わりに**今週の週の日付を青**にした
- ホームの棒グラフを**その週でいちばん多い日が満杯**になる目盛りに戻した
  （件数が少ない週でも棒が育つように。週をまたいだ比較はできなくなる、と割り切る）

---

## 1. ルートの対応

| 現行 | v5 後 | 扱い |
|---|---|---|
| `/`（Dashboard） | `/` | 中身を全面差し替え |
| — | `/calendar` | **新規** |
| `/activity` | `/activity`（中身は v5 の通知画面） | URL は維持する方が安全 |
| `/new` | FAB → 追加シート | ルートは残して `/` へ redirect（外部リンク対策） |
| `/me` | — | `/settings` へ redirect |
| `/settings` | `/settings` + `/settings/notifications` `/settings/courses` `/settings/setup` | 782行を4画面に分割 |
| `/docs` | `/settings/help` | redirect |
| `/docs/webclass` | `/settings/setup` | redirect |
| `/docs/screen` | `/settings/help/screen` | redirect |
| `/docs/sync` | `/settings/help/sync` | redirect |
| `/docs/help` | `/settings/help/safety` | redirect |
| `/import` `/login` `/privacy` `/terms` | 同じ | 見た目だけ差し替え |

ナビ: **5タブ（ホーム/アクティビティ/追加/ガイド/アカウント）→ 3タブ＋FAB（ホーム/カレンダー/設定）**。
通知はホームのヘッダーのベル（未読ドット）と PC サイドバーへ。

---

## 2. 直さないといけない矛盾（優先度順）

### ✅ A. 「提出済み」の色（決着・モック反映済み）

| 場所 | 実装 | 見える色 |
|---|---|---|
| リストの丸チェック | `assignment.tsx` `border-primary bg-primary` | **青** |
| カレンダーのドット・チップ | `calendar-parts.tsx` `DOT_BG.ok = bg-muted-foreground/30` | **灰** |
| 棒グラフ・進捗バー | `status-bar.tsx` `CAT_BG.done = bg-muted-foreground/25` | **薄い灰** |
| ヘルプ「画面の見かた」の説明図 | `help/screen/page.tsx` `bg-ok` | **緑** |

**ヘルプの説明が実装と違う**（緑と書いてあるが実物は青）。実装自体も2系統ある。

**確定した表**（モックには反映済み）:

| 意味 | 色 |
|---|---|
| 提出済み | `--primary` 青 |
| 締切を過ぎた未提出 | `--destructive` 赤 |
| 24時間以内が締切 | `--ui-warn-fill` 黄 |
| まだ先の未提出 | `--muted-foreground` 45% 濃い灰 |
| 不明 | `--muted-foreground` 25% 薄い灰 |

青を「まだ先の未提出」から取り上げて灰に回したので、**週が進むほど進捗バーが青く埋まる**。

- 本番の対応: この表を `src/lib/status.ts` に1本化し、リスト・カレンダー・グラフ・
  **ヘルプの説明図**が全部そこを `import` する。ヘルプに色見本をハードコードしない。
- **緑の残し方（決定）**: 「完了」を表す印はすべて青に揃えた
  （設定＞セットアップのステップのチェックと進捗バー、できる/できない表の ✓、
  不明シートの「不明な課題はありません」のアイコン）。
  **緑が残るのは同期の鮮度ランプだけ**（緑/黄/赤/灰 の信号機は慣習として残す）。

### 🔴 B. 現行の「緑＝提出済」がなくなる

現行は `lamp.ts` の `toneForStatus` で 提出済=緑 / 締切前=琥珀 / 超過=赤 / 不明=灰。
`/docs/screen` にもそう書いてあり、ユーザーはこれで覚えている。

v5 は緑を状態色に使わない（`--ui-ok` はセットアップの完了チェックだけ）。

- 決定: **緑を捨てる**。
- 移行後の `/settings/help/screen` に「提出済みは緑ではなくなりました」と明記する。

### 🟠 C. 黄色の意味が変わる

| | 黄の意味 |
|---|---|
| 現行 | 未提出かつ締切前（**全部**） |
| v5 | 締切まで**24時間以内**。それより先の未提出は青 |

同じ課題が 青 → 黄 → 赤 と3段階で変わる。v5 の意図どおりだが、
`week-adapter.ts` の `statusFor()` が返す `TaskStatus`（4値）では**表現できない**。

- 決定: **v5 のまま（24時間以内が黄）**。
- 対応: `TaskStatus`（`submitted|pending|not-submitted|optional`）を
  v5 の5カテゴリ（`overdue|soon|open|unknown|done`）に置き換える。
  `lamp.ts` `dashboard-data.ts` `week-adapter.ts` はこの置き換えで役目を終える。

### 🟠 D. 手動更新ボタンを消したので、同期失敗から戻れない

現行はヘッダーの `RefreshControl` が `/api/classroom/sync` を強制実行する。
v5 は指示どおり削除した（自動取得は5分スロットル）。

- `reauth_required` → 再ログインで戻れる ✓
- `sync_failed` / `no_access_token` → **もう一度試す手段がない**

- 決定: **同期シートの中に「再試行」を1つだけ置く**（ヘッダーのボタンは消したまま）。
  シートは同期のために開く場所なので、置き場所としては自然。

### 🟠 E. 並び替えの置き場所

現行の「すべての課題」折りたたみには 日付順 / 状態順 のトグルがある。
v5 は「最近 ＞ 今週」の見出しにしか置いていない。

- 決定: **「最近」「すべて」タブの右に右寄せで置く**。タブをまたいで効かせる
  （最近＝各グループの並び、すべて＝各週の並び、の両方に適用）。
- 対応: `sort` を `view` の外に出し、`groupRecent` と `weeksOfMonth` の両方に渡す。
  「今週」の見出しに付けたトグルは外す。

### 🟡 F. 手動追加でコースの色が決まらない

現行 `/new` は `COURSE_COLORS` から色を選ばせ `courseColor` に保存する。
v5 の追加シートに色の欄はない。一方 **設定＞コースの行は色の丸を出している**。

- 決定: **追加時に自動で割り当てる**（コース名のハッシュ → `COURSE_COLORS`）。色選択の欄は作らない。

### 🟡 G. 「提出済（遅延）」が消える

現行の詳細カードは `isLate` を見て「提出済（遅延）」と出す。v5 は「提出済み」のみ。

- 決定: `dueLabel()` の `sub` を `submitted && isLate ? "提出済み（遅れ）" : "提出済み"` にする。1行。

### 🟡 H. ホーム以外から通知ベルが見えない

`MobileHeader variant="home"` のときだけベルが出る。カレンダー・設定の画面では見えない。

- 決定: 未読があるとき、**下タブの「ホーム」に赤ドット**を出す。

### 🟡 I. 鮮度のしきい値が2系統ある

| | Classroom | WebClass |
|---|---|---|
| 現行 `week-adapter` | fresh<6h / aging<24h / stale | 同じ |
| v5 `useSyncSummary` | ok<60分 | ok<48h / warn<7日 / danger |

- 決定: **v5 を採用**。Classroom は開くたび自動、WebClass は手動なので、
  同じしきい値にする理由がない。`week-adapter` の `freshnessOf` は捨てる。

### 🟢 J. WebClass の URL の入力欄が2か所にある

v5 は 設定＞セットアップ と 同期シート の両方にある。

- 決定: そのままでよい。ただし**保存先は1つ**にして、片方で変えたらもう片方に即反映されることを確認する。

### 🟢 K. 捨ててよいもの

- `EditorialCard` と `/public/editorial-ink.png`（SetupCard が代替）
- `AiInsight`（`weekHeadline()` に吸収済み）
- 下タブのドラッグで動くピル（意図的に簡素化）
- `StatsCard` `SubmissionChart` `completion-meter` `Collapsible` `SyncStatus` `lamp.tsx` `sync-lamps.tsx`
  `weekly-card.tsx` `task-table.tsx` `MonthGrid.tsx` `AssignmentDetailCard.tsx` `quiet-controls.tsx` `dashboard.tsx`
- `/me`（1行だけの画面）

### 🟢 L. 影響しない差

- `description` `grade` `maxPoints` は `Assignment` 型にあるが、**現行の画面でも表示していない**。
  v5 で出さなくても機能減にならない（DB には残る）。

---

## 3. データの橋渡し

v5 のビュー型は本物より小さい。**アダプタを1本作る**のが一番安全。

```
src/lib/v5-adapter.ts
  toView(assignments: Assignment[], settings: NotificationSettings, courses): ViewAssignment[]
    ├ muted        ← settings.mutedAssignments.includes(id) で合成（Assignment は持っていない）
    ├ course       ← courseId から引く（v5 は courseById）
    ├ status       ← submissionState をそのまま（3値は同じ）
    └ cat          ← src/lib/status.ts の catOf(a, now) で5カテゴリに
```

| v5 | 本物 | 備考 |
|---|---|---|
| `status: "not_submitted"\|"submitted"\|"unknown"` | `submissionState` 同名3値 | **そのまま使える** |
| `due: Date\|null` | `dueDate` | 名前だけ |
| `muted: boolean` | `notification-store.mutedAssignments[]` | 合成が要る |
| `course.hidden` | 設定側の追跡フラグ | 意味を確認する（非表示＝取り込まない、で合っているか） |
| — | `isLate` `courseColor` | §G §F で使う |

---

## 4. 実装計画

PR は小さく、**画面単位**。各 PR で `docs/ui-redesign.md` の機能対応表にチェックを付ける。

| # | 内容 | 主な触るもの |
|---|---|---|
| 0 | **状態と色の一本化**。`src/lib/status.ts` に5カテゴリと色の表を作る。旧 `lamp.ts` はまだ消さない | 新規1ファイル |
| 1 | **トークン**。`mock-v5/ui-tokens.css` の中身を `globals.css` の `:root` / `.dark` へ。`--lamp-*` は残す | `globals.css` |
| 2 | **部品**。v5 の `_components/*` を `src/components/app/` へ。provider を本物の hooks に差し替え、`v5-adapter.ts` を作る | 新規ディレクトリ |
| 3 | **シェル**。ヘッダー・下タブ3つ＋FAB・PC サイドバー・同期シート（**再試行を追加** §D）・追加シート（**色の自動割り当て** §F）・トースト | `NavBar` `app-header` 置換 |
| 4 | **ホーム**。WeekHero＋最近/すべて＋不明バナー。`Dashboard` を捨てる。**すべてタブに並び替えを追加** §E | `src/app/page.tsx` |
| 5 | **カレンダー**。新規ルート | `src/app/calendar/` |
| 6 | **通知**。`/activity` の中身を差し替え（URL 維持） | `src/app/activity/` |
| 7 | **設定**。1ページ→トップ＋3サブページ。いちばん大きい。先に「何がどのページに行くか」を表で固めてから着手 | `src/app/settings/` |
| 8 | **ヘルプ**。`/docs/*` → `/settings/help/*`。`next.config.ts` に redirects（`/docs` `/docs/webclass` `/docs/screen` `/docs/sync` `/docs/help` `/me` `/new`） | `next.config.ts` |
| 9 | **ログイン / インポート** | 2ファイル |
| 10 | **掃除**。旧コンポーネント削除、`/mock`〜`/mock-v5` 削除、`globals.css` の `@import` 削除、`--lamp-*` 削除、`editorial-ink.png` 削除 | 広範囲 |

各 PR の完了条件:

1. `npx eslint src` / `npx tsc --noEmit` / `npx next build` が通る
2. 機能対応表にチェックが付いた
3. DOM で検証した（溢れのルール・sticky・色）— `docs/ui-playbook.md` §1.5
4. 見た目はユーザーが確認する

### 先に決めておくこと（コードを書く前）

- [x] 提出済みの色 → **青**（§0-A）。ただし「未提出（先）」と色がぶつかる件は未決 — §2A の「残る詰め」
- [ ] `/activity` の URL を維持するか `/notifications` にするか
- [ ] コースの `hidden` は「取り込まない」か「隠すだけ」か（現行の「追跡」との対応）
- [ ] 同期シートの「再試行」の文言と、失敗時に何を出すか — §D

---

## 5. 損なわれそうな UX（機能は減らないが、体験が変わるもの）

| 変わること | 影響 | 判断 |
|---|---|---|
| ホームから月カレンダーが消える（モバイル） | 「今月の忙しさ」に1タップ増える | 許容。カレンダーがタブになったので迷わない |
| ホームから「選択した日のリスト」が消える | 同じものがカレンダータブにある | 許容 |
| ガイドがタブから消える | 初回の人が手順に辿り着きにくい | SetupCard（ホーム）＋設定の「未設定」バッジで担保 |
| 下タブのドラッグ操作が消える | 遊びが減る | 意図的 |
| 「すべての課題」が月で区切られる | 一気に全部は見られない | 意図的（有限にする）。並び替えはタブの右に戻す（§E） |
| 5タブ→3タブ | 1タブあたりの中身が増える | 意図的。設定の中が2階層になる分、PC は2ペインで浅く見せる |
