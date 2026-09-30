import { AbsoluteFill, Img, staticFile } from "remotion";
import { MailCard } from "../parts/MailCard";
import { Phone } from "../parts/Phone";
import { C, jakarta, noto, WASH } from "../theme";

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

/**
 * 共有したときのカード（1200×630）。X・LINE・Slack で 1.91:1 のまま出る大きさ。
 * 他社のロゴ（Google Classroom・WebClass）は入れない。サービス名は文字だけで書く。
 */
export const Og = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, overflow: "hidden" }}>
      {/* 背景の淡い色。左上にアプリの青、右下に「24時間以内」の黄 */}
      <AbsoluteFill style={{ background: WASH }} />

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
      <Phone style={{ position: "absolute", left: 752, top: 56, transform: "rotate(-4deg)", transformOrigin: "50% 0%" }} />

      <MailCard style={{ position: "absolute", left: 632, top: 432 }} />
    </AbsoluteFill>
  );
};
