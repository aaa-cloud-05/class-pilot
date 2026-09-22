# デザイン参照（design-refs）

UnionFetch のデザインを決めるときに**参考にする**外部の DESIGN.md 置き場。
ここにあるファイルは**正本ではない**。UnionFetch 自身のルールはモック確定後にルートの
`DESIGN.md` として書き起こす（それまでの作業メモは [`../ui-redesign.md`](../ui-redesign.md)）。

どれも各社の**マーケティングサイト**を分析したもので、アプリ画面（リスト・タブ・シート）の
決まりは書かれていない。色・文字・角丸・余白の「考え方」だけを借り、レイアウトは借りない。

| ファイル | 元 | 何を借りるか |
|---|---|---|
| [cal.md](./cal.md) | Cal.com | **土台**。カレンダー系SaaS。ほぼモノクロ＋青を少し、角丸 8/12/16 の使い分け、グレーのカード面、ピル型の切替 |
| [coinbase.md](./coinbase.md) | Coinbase | **「青」方向**。白地に鮮やかな青（#0052ff）1色だけを主ボタンに使う抑え方 |
| [linear.md](./linear.md) | Linear | **ダークモード**。影を使わず、面の明るさの段差（canvas → surface-1〜4）と細い線で階層を作る |
| [vercel.md](./vercel.md) | Vercel | **「モノクロ」方向**。旧 `DESIGN.md`（ここへ移動）。黒インクの主ボタン、細い線 |
| [uber.md](./uber.md) | Uber | モバイル寄りの白黒。ピル型の操作部品、太めの見出し |

## 出典とライセンス

- 上記5ファイルは [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
  （MIT License, Copyright (c) 2026 VoltAgent）の `design-md/<name>/DESIGN.md` をそのまま複製したもの。
- [Refero Styles](https://styles.refero.design/) は `robots.txt` で AI クローラー（ClaudeBot 等）を
  拒否しているため、自動取得はしていない。使いたいスタイルがあれば、ブラウザで開いて
  DESIGN.md を手でコピーし、このフォルダに置く。
