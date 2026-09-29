import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, noto, WASH } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 正方形（X のタイムラインで大きく出る）か横長か。場面はこれで並べ方だけ変える */
export function useLayout() {
  const { width, height } = useVideoConfig();
  return { wide: width > height, width, height };
}

/** start から dur フレームかけて 0→1（はじめ速く、終わりゆっくり） */
export function ease(frame: number, start: number, dur = 14) {
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
}

/** at フレーム目から、下から浮かび上がって出る */
export function Rise({ at, children, dy = 28, style }: { at: number; children: ReactNode; dy?: number; style?: CSSProperties }) {
  const p = ease(useCurrentFrame(), at, 16);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style }}>{children}</div>;
}

/** 場面の見出し。無音で見られる前提なので、言いたいことはここに全部書く */
export function Caption({ lines, sub, at = 4 }: { lines: string[]; sub?: ReactNode; at?: number }) {
  const { wide } = useLayout();
  return (
    <div>
      {lines.map((l, i) => (
        <Rise key={l} at={at + i * 5}>
          <div style={{ fontSize: wide ? 68 : 64, fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.03em", color: C.fg }}>{l}</div>
        </Rise>
      ))}
      {sub && (
        <Rise at={at + lines.length * 5 + 6}>
          <div style={{ marginTop: wide ? 24 : 16, fontSize: wide ? 36 : 31, fontWeight: 700, color: C.sub }}>{sub}</div>
        </Rise>
      )}
    </div>
  );
}

/** 場面の中身を描く箱の大きさ。正方形ではそのまま、横長では右半分に縮めて置く */
export const BOX = { w: 960, h: 720 };

/**
 * 見出しと中身の並べ方。正方形は見出しが上・中身が下、横長は見出しが左・中身が右。
 * 中身は BOX の座標で描き、はみ出した分（スマホの下など）は画面の端で切れる。
 * clip を付けると、寄ったときに中身が見出しにかぶらないよう、見出し側の縁をぼかして切る。
 */
export function Stage({ caption, children, clip = false }: { caption: ReactNode; children: ReactNode; clip?: boolean }) {
  const { wide, width, height } = useLayout();
  const s = wide ? Math.min(1000 / BOX.w, 900 / BOX.h) : 1;
  const left = wide ? 870 : (width - BOX.w) / 2;
  const top = wide ? (height - BOX.h * s) / 2 : 330;
  // 切り抜く範囲（BOX の座標）。正方形は上の縁、横長は左の縁をぼかす
  const view = wide
    ? { x: -10, y: -top / s, w: (width - left) / s + 10, h: height / s, mask: "linear-gradient(to right, transparent 0, #000 44px)" }
    : { x: -left, y: -8, w: width, h: height - top + 8, mask: "linear-gradient(to bottom, transparent 0, #000 40px)" };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div
        style={
          wide
            ? { position: "absolute", left: 150, width: 700, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" }
            : { position: "absolute", left: 60, right: 60, top: 84, textAlign: "center" }
        }
      >
        {caption}
      </div>
      <div style={{ position: "absolute", left, top, width: BOX.w, height: BOX.h, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        {clip ? (
          <div style={{ position: "absolute", left: view.x, top: view.y, width: view.w, height: view.h, overflow: "hidden", maskImage: view.mask, WebkitMaskImage: view.mask }}>
            <div style={{ position: "absolute", left: -view.x, top: -view.y, width: BOX.w, height: BOX.h }}>{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </AbsoluteFill>
  );
}
