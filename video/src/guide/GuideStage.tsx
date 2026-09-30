import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, noto, WASH } from "../theme";
import { ease } from "../teaser/stage";

/** 画面の中身を描く箱（右側）。ブラウザやスマホはこの座標で描き、カメラで寄る */
export const GBOX = { x: 660, y: 70, w: 1200, h: 940 };

export type Step = { at: number; title: string; body?: string; tip?: string };

/**
 * 使い方の動画の並べ方。左に「いま何をするか」、右に画面。
 * steps は at フレーム目から切り替わる手順。左上の札（chip）で PC かスマホか、どちらの設定かを示す。
 */
export function GuideStage({ chip, chipColor = C.primary, steps, children }: { chip: string; chipColor?: string; steps: Step[]; children: ReactNode }) {
  const frame = useCurrentFrame();
  const numbered = steps.filter((s) => /^[①-⑨]/.test(s.title)).length;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <div style={{ position: "absolute", left: 96, top: 110, width: 520 }}>
        <span style={{ display: "inline-block", padding: "8px 18px", borderRadius: 999, background: chipColor, color: "#fff", fontSize: 24, fontWeight: 800 }}>{chip}</span>
        {numbered > 1 && (
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            {steps
              .filter((s) => /^[①-⑨]/.test(s.title))
              .map((s, i, arr) => {
                const on = frame >= s.at && (i === arr.length - 1 || frame < arr[i + 1].at);
                const done = frame >= s.at;
                return <span key={s.at} style={{ width: on ? 44 : 14, height: 14, borderRadius: 99, background: done ? chipColor : "#d6d8dc", opacity: on || !done ? 1 : 0.45 }} />;
              })}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 96, top: 230, width: 520, height: 700 }}>
        {steps.map((s, i) => {
          const next = steps[i + 1]?.at ?? 1e9;
          const p = ease(frame, s.at, 14) * (1 - ease(frame, next - 8, 8));
          if (p <= 0) return null;
          return (
            <div key={s.at} style={{ position: "absolute", inset: 0, opacity: p, transform: `translateY(${(1 - Math.min(1, ease(frame, s.at, 14))) * 24}px)` }}>
              <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.02em", color: C.fg, whiteSpace: "pre-line" }}>{s.title}</div>
              {s.body && <div style={{ marginTop: 24, fontSize: 26, fontWeight: 500, lineHeight: 1.7, color: C.sub, whiteSpace: "pre-line" }}>{s.body}</div>}
              {s.tip && (
                <div style={{ marginTop: 34, display: "flex", gap: 14, padding: "18px 22px", borderRadius: 18, background: "#fff", boxShadow: "0 0 0 1px rgba(12,13,14,0.08)" }}>
                  <span style={{ fontSize: 21, fontWeight: 800, color: chipColor, whiteSpace: "nowrap" }}>ヒント</span>
                  <span style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.65, color: C.fg, whiteSpace: "pre-line" }}>{s.tip}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: GBOX.x, top: GBOX.y, width: GBOX.w, height: GBOX.h }}>
        {/* 寄ったときに左の説明へかぶらないよう、左の縁をぼかして切る */}
        <div
          style={{
            position: "absolute",
            left: -30,
            top: -GBOX.y,
            width: GBOX.w + 90,
            height: 1080,
            overflow: "hidden",
            maskImage: "linear-gradient(to right, transparent 0, #000 50px)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 50px)",
          }}
        >
          <div style={{ position: "absolute", left: 30, top: GBOX.y, width: GBOX.w, height: GBOX.h }}>{children}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** text を start フレーム目から1秒に cps 文字ずつ打つ */
export function typed(text: string, frame: number, start: number, cps = 14) {
  const n = Math.max(0, Math.floor(((frame - start) / 30) * cps));
  return text.slice(0, n);
}
