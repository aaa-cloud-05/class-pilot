import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";

/**
 * iPhone の Safari（iOS 26）を簡単に描いたもの。録画を見て形を合わせているが、細部までは写さない。
 * 座標はすべてスマホの画面の CSS px（幅 430・高さ 932）。Phone の children に入れて使う。
 */
const FONT = `-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;
const INK = "#111";
const BLUE = "#0a84ff";
const GLASS: CSSProperties = { background: "rgba(255,255,255,0.86)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(0,0,0,0.12)", backdropFilter: "blur(20px)" };

const Svg = ({ children, size = 20, color = INK, sw = 2 }: { children: ReactNode; size?: number; color?: string; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const I = {
  share: <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />,
  book: <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM8 2v10l3-2 3 2V2" />,
  bookOpen: <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  hand: <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0" />,
  tabs: <path d="M8 4h12v12M4 8h12v12H4z" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z" />,
};

/** 下のバー（戻る・アドレス・…）。y は画面の上からの位置 */
export const SAFARI_BAR_Y = 932 - 34 - 56;
export const SAFARI_MORE = { x: 430 - 18 - 28, y: SAFARI_BAR_Y + 28 };
export function SafariBar({ host = "unionfetch.com" }: { host?: string }) {
  const circle: CSSProperties = { ...GLASS, width: 56, height: 56, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ position: "absolute", left: 18, right: 18, top: SAFARI_BAR_Y, height: 56, display: "flex", gap: 10, fontFamily: FONT }}>
      <span style={circle}>
        <Svg>
          <path d="m15 18-6-6 6-6" />
        </Svg>
      </span>
      <span style={{ ...GLASS, flex: 1, borderRadius: 99, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", fontSize: 17, color: INK }}>
        <Svg size={17}>
          <rect x="4" y="5" width="16" height="12" rx="2" />
          <path d="M8 21h8" />
        </Svg>
        <span style={{ flex: 1 }}>{host}</span>
        <Svg size={17}>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
        </Svg>
      </span>
      <span style={circle}>
        <Svg>
          <circle cx="5" cy="12" r="1.3" fill={INK} />
          <circle cx="12" cy="12" r="1.3" fill={INK} />
          <circle cx="19" cy="12" r="1.3" fill={INK} />
        </Svg>
      </span>
    </div>
  );
}

/** 「…」を押したときのメニュー。hover は押している項目 */
export const MENU = { x: 430 - 18 - 290, y: SAFARI_BAR_Y - 12 - 360, w: 290 };
const MENU_ROWS = [
  { k: "share", label: "共有" },
  { k: "book", label: "ブックマークに追加" },
  { k: "bookOpen", label: "ブックマークの追加先…" },
  { k: "-", label: "" },
  { k: "plus", label: "新規タブ" },
  { k: "hand", label: "新規プライベートタブ" },
] as const;
export function SafariMenu({ hover }: { hover?: string }) {
  return (
    <div style={{ ...GLASS, position: "absolute", left: MENU.x, top: MENU.y, width: MENU.w, borderRadius: 26, padding: "10px 0 6px", fontFamily: FONT, fontSize: 16.5, color: INK }}>
      {MENU_ROWS.map((r, i) =>
        r.k === "-" ? (
          <div key={i} style={{ height: 1, margin: "6px 18px", background: "rgba(0,0,0,0.1)" }} />
        ) : (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 14, height: 46, padding: "0 20px", background: hover === r.label ? "rgba(0,0,0,0.08)" : "transparent" }}>
            <Svg size={21}>{I[r.k]}</Svg>
            {r.label}
          </div>
        ),
      )}
      <div style={{ display: "flex", marginTop: 6, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        {[
          { k: "bookOpen" as const, label: "ブックマーク" },
          { k: "tabs" as const, label: "すべてのタブ" },
        ].map((b) => (
          <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0 6px", fontSize: 12, background: hover === b.label ? "rgba(0,0,0,0.08)" : "transparent" }}>
            <Svg size={22}>{I[b.k]}</Svg>
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
/** メニューの項目の中心（画面の座標） */
export function menuAt(label: string) {
  if (label === "ブックマーク") return { x: MENU.x + MENU.w * 0.25, y: MENU.y + 10 + 46 * 5 + 13 + 6 + 30 };
  let y = MENU.y + 10;
  for (const r of MENU_ROWS) {
    if (r.label === label) return { x: MENU.x + 110, y: y + 23 };
    y += r.k === "-" ? 13 : 46;
  }
  return { x: MENU.x, y };
}

/** ブックマークに追加したあとに出る「次に追加: ブックマーク」 */
export function AddedToast() {
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: SAFARI_BAR_Y - 70, height: 52, borderRadius: 99, background: "rgba(40,40,40,0.9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT, fontSize: 16 }}>
      次に追加:
      <Svg size={17} color={BLUE}>
        {I.book}
      </Svg>
      <span style={{ color: "#fff", fontWeight: 600 }}>ブックマーク</span> ⌄
    </div>
  );
}

/** ブックマークの一覧（下から出るシート）。editing で「編集」中の見た目。items は上から並ぶ項目 */
export const SHEET_TOP = 120;
export function SafariBookmarks({ items, editing = false, hover }: { items: string[]; editing?: boolean; hover?: string }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: SHEET_TOP, bottom: 0, borderRadius: "30px 30px 0 0", background: "#f2f2f7", fontFamily: FONT, color: INK, boxShadow: "0 -10px 40px rgba(0,0,0,0.2)" }}>
      <div style={{ width: 40, height: 5, borderRadius: 99, background: "#c7c7cc", margin: "8px auto 0" }} />
      <div style={{ display: "flex", alignItems: "center", padding: "14px 20px 8px" }}>
        <span style={{ flex: 1, fontSize: 28, fontWeight: 700 }}>ブックマーク</span>
        <span style={{ fontSize: 17, color: BLUE, fontWeight: 600 }}>{editing ? "完了" : "閉じる"}</span>
      </div>
      <div style={{ margin: "8px 16px", borderRadius: 14, background: "#fff" }}>
        {[{ label: "お気に入り", folder: true }, ...items.map((label) => ({ label, folder: false }))].map((it, i) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 12, height: 54, padding: "0 16px", borderTop: i ? "0.5px solid #d1d1d6" : undefined, background: hover === it.label ? "#e5e5ea" : "transparent" }}>
            {editing && !it.folder && <span style={{ width: 22, height: 22, borderRadius: 99, background: "#ff3b30", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}>−</span>}
            {it.folder ? (
              <Svg size={22} color={BLUE}>
                {I.star}
              </Svg>
            ) : (
              <Img src={staticFile("mark.png")} style={{ width: 22, height: 22, borderRadius: 5 }} />
            )}
            <span style={{ flex: 1, fontSize: 17 }}>{it.label}</span>
            <span style={{ color: "#c7c7cc", fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 22, bottom: 44, fontSize: 17, color: BLUE, fontWeight: 600 }}>{editing ? "新規フォルダ" : "編集"}</div>
    </div>
  );
}
/** 一覧の n 番目（お気に入りの次が 1）の中心と、右下の「編集」 */
export const bookmarkRow = (n: number) => ({ x: 215, y: SHEET_TOP + 8 + 5 + 14 + 42 + 8 + 16 + 54 * n + 27 });
export const SHEET_EDIT = { x: 430 - 22 - 18, y: 932 - 44 - 11 };

/** 「ブックマークを編集」の画面 */
export const EDIT_SCREEN = { title: { x: 230, y: 176 }, url: { x: 230, y: 222 }, clear: { x: 396, y: 222 }, save: { x: 430 - 20 - 32, y: 92 } };
export function SafariEditScreen({ title, url, focus, paste }: { title: string; url: string; focus?: "title" | "url"; paste?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f2f2f7", fontFamily: FONT, color: INK }}>
      <div style={{ height: 60 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "6px 20px" }}>
        <span style={{ width: 44, height: 44, borderRadius: 99, background: "#e5e5ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✕</span>
        <span style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 700 }}>ブックマークを編集</span>
        <span style={{ padding: "10px 16px", borderRadius: 99, background: BLUE, color: "#fff", fontSize: 16, fontWeight: 600 }}>保存</span>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "18px 16px 0", padding: "12px 14px", borderRadius: 16, background: "#fff" }}>
        <Img src={staticFile("mark.png")} style={{ width: 58, height: 58, borderRadius: 12, boxShadow: "0 0 0 0.5px #d1d1d6" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: 46, display: "flex", alignItems: "center", borderBottom: "0.5px solid #d1d1d6", fontSize: 17 }}>
            {title}
            {focus === "title" && <span style={{ width: 2, height: 22, marginLeft: 1, background: BLUE }} />}
          </div>
          <div style={{ position: "relative", height: 46, display: "flex", alignItems: "center", fontSize: 15, color: "#3c3c43", whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{url}</span>
            {focus === "url" && <span style={{ width: 2, height: 20, marginLeft: 1, background: BLUE }} />}
            <span style={{ flex: 1 }} />
            {focus === "url" && url && <span style={{ width: 20, height: 20, borderRadius: 99, background: "#c7c7cc", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</span>}
          </div>
        </div>
      </div>
      {paste && (
        <div style={{ position: "absolute", left: 130, top: 222 - 64, padding: "10px 18px", borderRadius: 12, background: "rgba(30,30,30,0.92)", color: "#fff", fontSize: 16, fontWeight: 600 }}>
          ペースト
          <span style={{ position: "absolute", left: 40, bottom: -8, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid rgba(30,30,30,0.92)" }} />
        </div>
      )}
      <div style={{ margin: "26px 32px 8px", fontSize: 14, color: "#6d6d72" }}>場所</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 16px", padding: "14px 16px", borderRadius: 16, background: "#fff", fontSize: 17 }}>
        <Svg size={22} color={BLUE}>
          {I.folder}
        </Svg>
        ブックマーク
      </div>
    </div>
  );
}
export const PASTE = { x: 130 + 44, y: 222 - 64 + 20 };
