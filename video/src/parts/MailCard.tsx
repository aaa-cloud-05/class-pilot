import type { CSSProperties } from "react";
import { C, FLOAT, jakarta } from "../theme";

/**
 * 締切の前にメールが届いた様子（件名はアプリが実際に送るものと同じ形）。
 * OG と紹介動画で使う。大きさは width で決め、中身は幅に合わせて拡大する。
 */
export function MailCard({
  time = "16:59",
  subject = "【締切まであと3時間】",
  title = "レポート2 ソートアルゴリズムの比較",
  width = 448,
  style,
}: {
  time?: string;
  subject?: string;
  title?: string;
  width?: number;
  style?: CSSProperties;
}) {
  const k = width / 448;
  return (
    <div
      style={{
        width,
        display: "flex",
        gap: 14 * k,
        alignItems: "flex-start",
        padding: `${16 * k}px ${18 * k}px`,
        borderRadius: 20 * k,
        background: C.card,
        boxShadow: FLOAT,
        ...style,
      }}
    >
      <div
        style={{
          width: 44 * k,
          height: 44 * k,
          flexShrink: 0,
          borderRadius: 12 * k,
          background: C.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={24 * k} height={24 * k} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 * k, fontWeight: 500, color: C.sub }}>
          <span style={{ fontFamily: jakarta, fontWeight: 700, color: C.fg }}>UnionFetch</span>
          <span>{time}</span>
        </div>
        <div style={{ marginTop: 3 * k, fontSize: 17 * k, fontWeight: 800, color: C.fg }}>{subject}</div>
        <div
          style={{
            marginTop: 1 * k,
            fontSize: 15 * k,
            fontWeight: 500,
            color: C.sub,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
