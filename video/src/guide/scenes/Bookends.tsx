import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { SourceTag } from "../../parts/SourceTag";
import { C, FLOAT, jakarta, noto, WASH } from "../../theme";
import { Rise } from "../../teaser/stage";

export const INTRO_FRAMES = 165;
export const OUTRO_FRAMES = 170;

function Card({ n, title, body, tag, at }: { n: number; title: string; body: string; tag: "classroom" | "webclass"; at: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <div
      style={{
        display: "flex",
        gap: 28,
        alignItems: "center",
        padding: "34px 40px",
        borderRadius: 28,
        background: "#fff",
        boxShadow: FLOAT,
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      <span
        style={{
          width: 76,
          height: 76,
          flexShrink: 0,
          borderRadius: 99,
          background: C.primary,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          fontWeight: 800,
        }}
      >
        {n}
      </span>
      <div>
        <SourceTag source={tag} size={20} />
        <div style={{ marginTop: 12, fontSize: 40, fontWeight: 800, color: C.fg }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 500, color: C.sub }}>{body}</div>
      </div>
    </div>
  );
}

/** はじめ: この動画でやること（2つ） */
export function Intro() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "absolute", left: 130, top: 0, bottom: 0, width: 640, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Rise at={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Img src={staticFile("mark.png")} style={{ width: 56, height: 56 }} />
            <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 38, color: C.fg }}>UnionFetch</span>
          </div>
        </Rise>
        <Rise at={6}>
          <div style={{ marginTop: 30, fontSize: 84, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.03em", color: C.fg }}>はじめ方</div>
        </Rise>
        <Rise at={12}>
          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 500, lineHeight: 1.7, color: C.sub }}>
            PC でもスマホでも、
            <br />
            やることは2つだけ。
          </div>
        </Rise>
      </div>
      <div style={{ position: "absolute", left: 820, right: 130, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <Card n={1} tag="classroom" title="Google でログイン" body="Classroom の課題が自動で入ります" at={22} />
        <Card n={2} tag="webclass" title="ブックマークを1つ登録" body="WebClass の課題も取り込めます" at={40} />
      </div>
      <Sfx at={22} name="pop" volume={0.35} />
      <Sfx at={40} name="pop" volume={0.35} />
    </AbsoluteFill>
  );
}

/** おわり: 次にやること（メール通知）と、困ったとき */
export function Outro() {
  const rows = [
    { label: "締切の前にメールで知らせる", where: "設定 › 通知" },
    { label: "困ったとき・ご意見", where: "設定 › ヘルプ" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "relative", width: 1100, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Rise at={0}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em", color: C.fg }}>準備はこれで終わりです</div>
        </Rise>
        <div style={{ marginTop: 44, width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
          {rows.map((r, i) => (
            <Rise key={r.label} at={10 + i * 8}>
              <div style={{ display: "flex", alignItems: "center", padding: "26px 36px", borderRadius: 22, background: "#fff", boxShadow: FLOAT, fontSize: 32 }}>
                <span style={{ flex: 1, fontWeight: 700, color: C.fg }}>{r.label}</span>
                <span style={{ fontWeight: 800, color: C.primary }}>{r.where}</span>
              </div>
            </Rise>
          ))}
        </div>
        <Rise at={30}>
          <div style={{ marginTop: 54, display: "flex", alignItems: "center", gap: 16 }}>
            <Img src={staticFile("mark.png")} style={{ width: 54, height: 54 }} />
            <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 44, color: C.fg }}>unionfetch.com</span>
          </div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
}
