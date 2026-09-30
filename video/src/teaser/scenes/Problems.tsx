import type { ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { C, FLOAT } from "../../theme";
import { BOX, Caption, clamp, Stage } from "../stage";

export const PROBLEMS_FRAMES = 140;

const Icon = ({ children, color }: { children: ReactNode; color: string }) => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/** 学生がいま困っていること。上から順に1枚ずつ出す。text は行ごと（変なところで折り返さないよう区切っておく） */
const ITEMS = [
  {
    at: -20, // 1枚目は最初から出しておく（X のサムネイルに入る）
    text: ["WebClass と Classroom に分かれていて、", "締切を管理しにくい"],
    tint: "#edf2ff",
    color: C.primary,
    icon: (
      <>
        <rect x="3" y="5" width="7.5" height="14" rx="1.6" />
        <rect x="13.5" y="5" width="7.5" height="14" rx="1.6" />
      </>
    ),
  },
  {
    at: 22,
    text: ["締切が近づいても通知が来ない"],
    tint: "#fbf3e6",
    color: "#b7791f",
    icon: (
      <>
        <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
        <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        <path d="m2 2 20 20" />
      </>
    ),
  },
  {
    at: 52,
    text: ["気づいたら、締切が過ぎていた"],
    tint: "#fbedec",
    color: C.danger,
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4" />
      </>
    ),
  },
];

/** 0–5秒: いまの困りごとを3つ。見出しは 0 フレーム目から見えている（X のサムネイルになる） */
export function Problems() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage caption={<Caption lines={["課題の締切、", "こんなことない？"]} at={-20} />}>
      <div style={{ position: "absolute", left: 30, top: 40, width: BOX.w - 60, display: "flex", flexDirection: "column", gap: 26 }}>
        {ITEMS.map((it) => {
          const p = spring({ frame: frame - it.at, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <div
              key={it.at}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: "32px 36px",
                borderRadius: 28,
                background: C.card,
                boxShadow: FLOAT,
                opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
                transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + p * 0.08})`,
              }}
            >
              <div style={{ width: 92, height: 92, flexShrink: 0, borderRadius: 26, background: it.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon color={it.color}>{it.icon}</Icon>
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.45, color: C.fg }}>
                {it.text.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {ITEMS.filter((it) => it.at > 0).map((it) => (
        <Sfx key={it.at} at={it.at} name="pop" volume={0.45} />
      ))}
    </Stage>
  );
}
