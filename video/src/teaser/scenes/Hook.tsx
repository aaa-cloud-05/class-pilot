import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, noto } from "../../theme";
import { clamp, ease, useLayout } from "../stage";

/** 言葉を1つずつ、ぼかしから浮かび上がらせる。最初の1つは 0 フレーム目から見えている（X のサムネイルになる） */
function Word({ text, at }: { text: string; at: number }) {
  const p = at === 0 ? 1 : ease(useCurrentFrame(), at, 12);
  return (
    <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 26}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
      {text}
    </span>
  );
}

/** 0–2秒: 黒地に文字だけ。タイムラインで手を止めてもらう */
export function Hook() {
  const frame = useCurrentFrame();
  const { wide } = useLayout();
  const zoom = interpolate(frame, [0, 90], [1, 1.05], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: C.fg, fontFamily: noto, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${zoom})`,
          textAlign: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: wide ? 104 : 82,
          lineHeight: 1.3,
          letterSpacing: "-0.03em",
        }}
      >
        <div>
          <Word text="WebClass、" at={0} />
        </div>
        <div>
          <Word text="締切を" at={10} />
          <Word text="教えてくれない。" at={17} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
