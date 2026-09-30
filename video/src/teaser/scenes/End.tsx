import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { C, jakarta, noto, WASH } from "../../theme";
import { Rise, useLayout } from "../stage";

export const END_FRAMES = 105;

/** 27–30秒: ロゴ・URL。最後の数秒は止まって読ませる */
export function End() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide } = useLayout();
  const pop = spring({ frame: frame - 2, fps, config: { damping: 12, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, transform: `scale(${0.7 + pop * 0.3})`, opacity: Math.min(1, pop * 2) }}>
          <Img src={staticFile("mark.png")} style={{ width: wide ? 112 : 100, height: wide ? 112 : 100 }} />
          <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: wide ? 84 : 72, letterSpacing: "-0.02em", color: C.fg }}>UnionFetch</span>
        </div>
        <Rise at={10}>
          <div style={{ marginTop: 34, fontSize: wide ? 46 : 42, fontWeight: 800, letterSpacing: "-0.02em", color: C.fg }}>課題の締切を、ひとつの場所で。</div>
        </Rise>
        <Rise at={20}>
          <div
            style={{
              marginTop: 56,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              padding: wide ? "22px 46px" : "20px 40px",
              borderRadius: 999,
              background: C.primary,
              color: "#fff",
              fontFamily: jakarta,
              fontWeight: 800,
              fontSize: wide ? 50 : 46,
              letterSpacing: "-0.01em",
              boxShadow: "0 24px 48px -16px rgba(47,107,255,0.55)",
            }}
          >
            unionfetch.com
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </Rise>
        <Rise at={30}>
          <div style={{ marginTop: 30, fontSize: wide ? 28 : 26, fontWeight: 700, color: C.sub }}>WebClass も、かんたんな設定で取り込めます</div>
        </Rise>
      </div>
      <Sfx at={2} name="pop" volume={0.4} />
    </AbsoluteFill>
  );
}
