import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";

/**
 * PC の Chrome（ライト）を簡単に描いたもの。録画を見て形を合わせているが、細部までは写さない。
 * 座標は「ブラウザの左上を (0,0)、幅 1440」。ページは PAGE_TOP から下に 1440×900 で入る。
 */
export const TAB_H = 42;
export const TOOL_H = 48;
export const BAR_H = 32;
export const pageTop = (bar: boolean) => TAB_H + TOOL_H + (bar ? BAR_H : 0);
export const BROWSER_W = 1440;
export const PAGE_H = 900;
/** アドレスバーの ☆ の位置（ブラウザの座標） */
export const STAR = { x: 1318, y: TAB_H + TOOL_H / 2 };

const INK = "#1f1f1f";
const MUTED = "#5f6368";
const FONT = `"Segoe UI", "Noto Sans JP", sans-serif`;

const Svg = ({ children, size = 18, color = MUTED, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

export const Fav = ({ size = 16 }: { size?: number }) => <Img src={staticFile("mark.png")} style={{ width: size, height: size }} />;
/** WebClass のタブのアイコン（ロゴは描かず、灰色の四角） */
export const Blank = ({ size = 16 }: { size?: number }) => <span style={{ display: "inline-block", width: size, height: size, borderRadius: 4, background: "#c4c7cc" }} />;

export type Tab = { title: string; icon?: "app" | "blank"; active?: boolean };
export type Bookmark = { label: string; icon?: "app" | "blank" };

/** ブラウザの枠。url は文字列か、ドメインを伏せる部品 */
export function Browser({
  tabs,
  url,
  bar = false,
  bookmarks = [],
  starred = false,
  children,
}: {
  tabs: Tab[];
  url: ReactNode;
  bar?: boolean;
  bookmarks?: Bookmark[];
  starred?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "relative", width: BROWSER_W, borderRadius: 14, overflow: "hidden", background: "#dfe3e8", fontFamily: FONT, boxShadow: "0 40px 90px -30px rgba(12,13,14,0.45), 0 0 0 1px rgba(12,13,14,0.08)" }}>
      {/* タブ */}
      <div style={{ height: TAB_H, display: "flex", alignItems: "flex-end", padding: "0 10px", gap: 4 }}>
        {tabs.map((t) => (
          <div
            key={t.title}
            style={{
              width: 250,
              height: 34,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              borderRadius: "10px 10px 0 0",
              background: t.active ? "#fff" : "transparent",
              color: INK,
              fontSize: 13,
            }}
          >
            {t.icon === "blank" ? <Blank /> : <Fav />}
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
            <span style={{ color: MUTED, fontSize: 14 }}>✕</span>
          </div>
        ))}
        <span style={{ margin: "0 0 8px 6px", color: MUTED, fontSize: 20 }}>＋</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: "flex", gap: 26, margin: "0 12px 11px 0", color: MUTED, fontSize: 14 }}>
          <span>—</span>
          <span>▢</span>
          <span>✕</span>
        </span>
      </div>
      {/* ツールバー */}
      <div style={{ height: TOOL_H, display: "flex", alignItems: "center", gap: 14, padding: "0 14px", background: "#fff" }}>
        <Svg>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Svg>
        <Svg color="#bdc1c6">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </Svg>
        <Svg>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
        </Svg>
        <div style={{ flex: 1, height: 34, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderRadius: 999, background: "#f1f3f4", color: INK, fontSize: 14 }}>
          <Svg size={15}>
            <path d="M4 6h10M4 12h6M4 18h12M18 4v4M14 10v4M20 16v4" />
          </Svg>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{url}</span>
          <Svg size={18} color={starred ? "#1a73e8" : MUTED}>
            <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z" fill={starred ? "#1a73e8" : "none"} />
          </Svg>
        </div>
        <span style={{ width: 26, height: 26, borderRadius: 99, background: "#dadce0" }} />
        <Svg>
          <circle cx="12" cy="5" r="1" fill={MUTED} />
          <circle cx="12" cy="12" r="1" fill={MUTED} />
          <circle cx="12" cy="19" r="1" fill={MUTED} />
        </Svg>
      </div>
      {/* ブックマーク バー */}
      {bar && (
        <div style={{ height: BAR_H, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "#fff", borderBottom: "1px solid #e8eaed", fontSize: 12.5, color: INK }}>
          {bookmarks.map((b) => (
            <span key={b.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 9px", borderRadius: 999 }}>
              {b.icon === "blank" ? <Blank size={14} /> : <Fav size={14} />}
              {b.label}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: INK }}>
            <Svg size={15}>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </Svg>
            すべてのブックマーク
          </span>
        </div>
      )}
      <div style={{ position: "relative", width: BROWSER_W, height: PAGE_H, overflow: "hidden", background: "#fff" }}>{children}</div>
    </div>
  );
}

/** ブックマーク バーの n 番目の項目の中心（ブラウザの座標）。文字の長さから大まかに出す */
export function barItemCenter(labels: string[], n: number) {
  let x = 12;
  for (let i = 0; i < n; i++) x += 9 + 14 + 7 + labels[i].length * 12.5 + 9 + 6;
  const w = 14 + 7 + labels[n].length * 12.5;
  return { x: x + 9 + w / 2, y: TAB_H + TOOL_H + BAR_H / 2, w: w + 18 };
}

const Field = ({ label, children, focus }: { label: string; children: ReactNode; focus?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
    <span style={{ width: 64, fontSize: 13, color: INK }}>{label}</span>
    <div style={{ flex: 1, height: 36, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: `${focus ? 2 : 1}px solid ${focus ? "#1a73e8" : "#c4c7c5"}`, fontSize: 14, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>
      {children}
    </div>
  </div>
);

const Btn = ({ children, primary }: { children: ReactNode; primary?: boolean }) => (
  <span style={{ padding: "8px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, background: primary ? "#0b57d0" : "#fff", color: primary ? "#fff" : "#0b57d0", border: primary ? "none" : "1px solid #c4c7c5" }}>
    {children}
  </span>
);

/** ☆ を押したときの「ブックマークを追加しました」。right は ☆ の右端に揃える */
export function StarPopup({ name, style }: { name: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 380, padding: "18px 20px", borderRadius: 12, background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,0.22)", fontFamily: FONT, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, color: INK }}>
        ブックマークを追加しました<span style={{ color: MUTED, fontWeight: 400 }}>✕</span>
      </div>
      <Field label="名前">{name}</Field>
      <Field label="フォルダ">
        <span style={{ flex: 1 }}>ブックマーク バー</span>▾
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <Btn>削除</Btn>
        <Btn primary>完了</Btn>
      </div>
    </div>
  );
}
/** ☆ の吹き出しの「完了」の位置（吹き出しの左上からの距離） */
export const STAR_POPUP_DONE = { x: 380 - 20 - 34, y: 18 + 22 + 50 + 50 + 18 + 17 };

/** ブックマークを右クリックしたときのメニュー。hover は強調する項目 */
export const MENU_ITEMS = ["新しいタブで開く", "新しいウィンドウで開く", "シークレット ウィンドウで開く", "-", "編集...", "削除", "-", "ページを追加...", "フォルダを追加..."];
export function ContextMenu({ hover, style }: { hover?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 260, padding: "6px 0", borderRadius: 10, background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,0.22)", fontFamily: FONT, fontSize: 13.5, color: INK, ...style }}>
      {MENU_ITEMS.map((m, i) =>
        m === "-" ? (
          <div key={i} style={{ height: 1, margin: "6px 0", background: "#e8eaed" }} />
        ) : (
          <div key={m} style={{ height: 32, display: "flex", alignItems: "center", padding: "0 18px", background: m === hover ? "#e8f0fe" : "transparent" }}>
            {m}
          </div>
        ),
      )}
    </div>
  );
}
/** メニューの項目 label の中心（メニューの左上からの距離） */
export function menuItemAt(label: string) {
  let y = 6;
  for (const m of MENU_ITEMS) {
    if (m === label) return { x: 130, y: y + 16 };
    y += m === "-" ? 13 : 32;
  }
  return { x: 130, y };
}

/** 「ブックマークを編集」。focus は枠を青くする欄、urlSelected は URL を全部選んだ状態 */
export function EditDialog({ name, url, focus, urlSelected }: { name: string; url: string; focus?: "name" | "url"; urlSelected?: boolean }) {
  return (
    <div style={{ position: "absolute", left: (BROWSER_W - 540) / 2, top: 150, width: 540, padding: "24px 26px", borderRadius: 14, background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: FONT }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: INK }}>ブックマークを編集</div>
      <Field label="名前" focus={focus === "name"}>
        {name}
        {focus === "name" && <span style={{ width: 1.5, height: 18, marginLeft: 1, background: INK }} />}
      </Field>
      <Field label="URL" focus={focus === "url"}>
        <span style={{ background: urlSelected ? "#c2dbff" : "transparent", overflow: "hidden", textOverflow: "ellipsis" }}>{url}</span>
      </Field>
      <div style={{ marginTop: 16, height: 150, borderRadius: 8, border: "1px solid #c4c7c5", padding: 8, fontSize: 13.5, color: INK }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "#d3e3fd" }}>📁 ブックマーク バー</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px" }}>📁 その他のブックマーク</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <Btn>新しいフォルダ</Btn>
        <span style={{ flex: 1 }} />
        <Btn primary>保存</Btn>
        <Btn>キャンセル</Btn>
      </div>
    </div>
  );
}
/** 編集の欄・ボタンの中心（ブラウザの座標） */
export const EDIT = {
  name: { x: (BROWSER_W - 540) / 2 + 26 + 78 + 200, y: 150 + 24 + 25 + 14 + 18 },
  url: { x: (BROWSER_W - 540) / 2 + 26 + 78 + 200, y: 150 + 24 + 25 + 14 + 36 + 14 + 18 },
  save: { x: (BROWSER_W - 540) / 2 + 540 - 26 - 108 - 10 - 32, y: 150 + 24 + 25 + 50 + 50 + 16 + 150 + 18 + 17 },
};

/** WebClass のアドレス。大学のドメインは伏せる */
export function MaskedWebClassUrl() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      webclass.<span style={{ display: "inline-block", width: 90, height: 12, borderRadius: 6, background: "#d5d8dc" }} />.ac.jp/webclass/
    </span>
  );
}
