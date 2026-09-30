import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { SourceTag } from "../../parts/SourceTag";
import { C, FLOAT, jakarta, noto, WASH } from "../../theme";
import { Rise } from "../../teaser/stage";

export const INTRO_FRAMES = 165;
export const CHAPTER_FRAMES = 110;
export const OUTRO_FRAMES = 210;

/** 補足の文字。薄すぎると大事なことが読み飛ばされるので、灰色の中では濃いめ */
const NOTE = "#454b53";

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
      <Num n={n} />
      <div>
        <SourceTag source={tag} size={20} />
        <div style={{ marginTop: 12, fontSize: 40, fontWeight: 800, color: C.fg }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 600, color: NOTE }}>{body}</div>
      </div>
    </div>
  );
}

const Num = ({ n, size = 76 }: { n: number; size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 99,
      background: C.primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size / 2,
      fontWeight: 800,
    }}
  >
    {n}
  </span>
);

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
          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 600, lineHeight: 1.7, color: NOTE }}>
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

/**
 * 章の扉。Classroom と WebClass の区切りをはっきりさせ、
 * 「はじめにやること」と「2回目からやること」を並べて見せる（Classroom は2回目からは何もしない）
 */
function Chapter({ n, tag, title, rows }: { n: number; tag: "classroom" | "webclass"; title: string; rows: { when: string; what: string; sub?: string }[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "relative", width: 1240 }}>
        <Rise at={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Num n={n} size={92} />
            <SourceTag source={tag} size={28} />
          </div>
        </Rise>
        <Rise at={5}>
          <div style={{ marginTop: 26, fontSize: 88, fontWeight: 800, letterSpacing: "-0.03em", color: C.fg }}>{title}</div>
        </Rise>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
          {rows.map((r, i) => {
            const p = spring({ frame: frame - (16 + i * 10), fps, config: { damping: 16, mass: 0.7 } });
            return (
              <div
                key={r.when}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 30,
                  padding: "26px 34px",
                  borderRadius: 24,
                  background: "#fff",
                  boxShadow: FLOAT,
                  opacity: Math.min(1, p * 1.5),
                  transform: `translateY(${(1 - p) * 24}px)`,
                }}
              >
                <span style={{ width: 190, flexShrink: 0, fontSize: 28, fontWeight: 800, color: i === 0 ? C.primary : NOTE }}>{r.when}</span>
                <span>
                  <span style={{ display: "block", fontSize: 38, fontWeight: 800, color: C.fg }}>{r.what}</span>
                  {r.sub && <span style={{ display: "block", marginTop: 6, fontSize: 25, fontWeight: 600, color: NOTE }}>{r.sub}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <Sfx at={2} name="whoosh" volume={0.3} />
    </AbsoluteFill>
  );
}

export const ChapterClassroom = () => (
  <Chapter
    n={1}
    tag="classroom"
    title="Classroom をつなぐ"
    rows={[
      { when: "はじめ", what: "Google でログインするだけ", sub: "PC でもスマホでも同じ手順です" },
      { when: "2回目から", what: "何もしなくて大丈夫", sub: "開くたびに自動で更新されます" },
    ]}
  />
);

export const ChapterWebClass = () => (
  <Chapter
    n={2}
    tag="webclass"
    title="WebClass をつなぐ"
    rows={[
      { when: "はじめの1回", what: "ブックマークを1つ登録する", sub: "PC（Chrome）と iPhone（Safari）の順に見せます" },
      { when: "2回目から", what: "WebClass で、そのブックマークを押すだけ", sub: "締切が変わったら、もう一度押せば更新されます" },
    ]}
  />
);

/** おわり: 2つのまとめと、次にやること（メール通知）・困ったとき */
export function Outro() {
  const sum = [
    { tag: "classroom" as const, text: "Google でログインすれば、あとは自動で更新" },
    { tag: "webclass" as const, text: "WebClass を開いて、ブックマークを押す" },
  ];
  const more = [
    { label: "締切の前にメールで知らせる", where: "設定 › 通知" },
    { label: "困ったとき・ご意見", where: "設定 › ヘルプ" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "relative", width: 1160, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Rise at={0}>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.02em", color: C.fg }}>まとめ</div>
        </Rise>
        <div style={{ marginTop: 36, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
          {sum.map((r, i) => (
            <Rise key={r.tag} at={8 + i * 8}>
              <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "26px 34px", borderRadius: 22, background: "#fff", boxShadow: FLOAT }}>
                <SourceTag source={r.tag} size={24} style={{ width: 190, justifyContent: "center" }} />
                <span style={{ fontSize: 36, fontWeight: 800, color: C.fg }}>{r.text}</span>
              </div>
            </Rise>
          ))}
        </div>
        <div style={{ marginTop: 34, width: "100%", display: "flex", gap: 16 }}>
          {more.map((r, i) => (
            <Rise key={r.label} at={30 + i * 6} style={{ flex: 1 }}>
              <div style={{ padding: "20px 28px", borderRadius: 20, background: "rgba(255,255,255,0.7)", boxShadow: "0 0 0 1px rgba(12,13,14,0.08)" }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: NOTE }}>{r.label}</div>
                <div style={{ marginTop: 4, fontSize: 30, fontWeight: 800, color: C.primary }}>{r.where}</div>
              </div>
            </Rise>
          ))}
        </div>
        <Rise at={48}>
          <div style={{ marginTop: 50, display: "flex", alignItems: "center", gap: 16 }}>
            <Img src={staticFile("mark.png")} style={{ width: 54, height: 54 }} />
            <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 44, color: C.fg }}>unionfetch.com</span>
          </div>
        </Rise>
      </div>
    </AbsoluteFill>
  );
}
