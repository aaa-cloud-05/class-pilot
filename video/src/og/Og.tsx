import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

const { fontFamily: noto } = loadNoto("normal", { weights: ["500", "700", "800"], ignoreTooManyRequestsWarning: true });
// ワードマークはアプリのヘッダーと同じ書体（src/app/layout.tsx の brandFont）
const { fontFamily: jakarta } = loadJakarta("normal", { weights: ["700", "800"], subsets: ["latin"] });

/** アプリのライトのトークン（src/app/globals.css）と同じ色 */
const C = {
  bg: "#fafafa",
  fg: "#0c0d0e",
  sub: "#5b6169",
  primary: "#2f6bff",
  warn: "#e3b169",
  card: "#ffffff",
  line: "rgba(12,13,14,0.08)",
};

function Chip({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        height: 42,
        padding: "0 17px",
        borderRadius: 999,
        background: C.card,
        boxShadow: `0 0 0 1px ${C.line}`,
        fontSize: 17,
        fontWeight: 700,
        color: C.fg,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: C.primary }} />
      {children}
    </span>
  );
}

/** 締切の前にメールが届いた様子（件名はアプリが実際に送るものと同じ形） */
function MailCard({ left, top }: { left: number; top: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 448,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "16px 18px",
        borderRadius: 20,
        background: C.card,
        boxShadow: "0 28px 56px -18px rgba(12,13,14,0.30), 0 0 0 1px rgba(12,13,14,0.06)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: 12,
          background: C.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500, color: C.sub }}>
          <span style={{ fontFamily: jakarta, fontWeight: 700, color: C.fg }}>UnionFetch</span>
          <span>20:59</span>
        </div>
        <div style={{ marginTop: 3, fontSize: 17, fontWeight: 800, color: C.fg }}>【締切まであと3時間】</div>
        <div style={{ marginTop: 1, fontSize: 15, fontWeight: 500, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          第4回 小テスト（エントロピー）
        </div>
      </div>
    </div>
  );
}

/**
 * 共有したときのカード（1200×630）。X・LINE・Slack で 1.91:1 のまま出る大きさ。
 * 他社のロゴ（Google Classroom・WebClass）は入れない。サービス名は文字だけで書く。
 */
export const Og = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, overflow: "hidden" }}>
      {/* 背景の淡い色。左上にアプリの青、右下に「24時間以内」の黄 */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(900px 620px at 0% 0%, rgba(47,107,255,0.11), transparent 62%), radial-gradient(760px 520px at 100% 100%, rgba(227,177,105,0.18), transparent 62%)",
        }}
      />

      {/* 左: ブランドとコピー */}
      <div style={{ position: "absolute", left: 76, top: 66, width: 620 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Img src={staticFile("mark.png")} style={{ width: 54, height: 54 }} />
          <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em", color: C.fg }}>
            UnionFetch
          </span>
        </div>

        <h1 style={{ margin: "70px 0 0", fontWeight: 800, fontSize: 66, lineHeight: 1.2, letterSpacing: "-0.03em", color: C.fg }}>
          課題の締切を、
          <br />
          ひとつの場所で。
        </h1>

        <p style={{ margin: "24px 0 0", width: 548, fontWeight: 500, fontSize: 23, lineHeight: 1.7, color: C.sub }}>
          WebClass と Google Classroom の課題を締切順にまとめて、締切の前にメールでお知らせします。
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
          <Chip>締切順の一覧</Chip>
          <Chip>1週間の見通し</Chip>
          <Chip>締切前にメール</Chip>
        </div>
      </div>

      {/* 右: スマホで見たホーム（デモデータで撮影したもの。下は切れてよい） */}
      <div style={{ position: "absolute", left: 752, top: 56, width: 330, transform: "rotate(-4deg)", transformOrigin: "50% 0%" }}>
        <div
          style={{
            borderRadius: 54,
            padding: 10,
            background: C.fg,
            boxShadow: "0 44px 90px -24px rgba(12,13,14,0.38), 0 0 0 1px rgba(12,13,14,0.06)",
          }}
        >
          <Img src={staticFile("home-mobile.png")} style={{ display: "block", width: "100%", borderRadius: 44 }} />
        </div>
      </div>

      <MailCard left={632} top={432} />
    </AbsoluteFill>
  );
};
