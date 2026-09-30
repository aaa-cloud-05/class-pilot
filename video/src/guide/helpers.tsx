import type { CSSProperties, ReactNode } from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { phoneMetrics } from "../parts/Phone";
import { C, noto } from "../theme";
import { type Cam, project, tween, type Key } from "../teaser/camera";
import { clamp, ease } from "../teaser/stage";
import { BROWSER_W } from "./ui/chrome";
import { GBOX } from "./GuideStage";

/** カメラの寄せ先を置く場所（右の箱の真ん中） */
export const AX = GBOX.w / 2;
export const AY = GBOX.h / 2;
/** ブラウザ全体が箱に収まる倍率 */
export const FIT = GBOX.w / BROWSER_W;

/** ブラウザ用のカメラ。keys はブラウザの座標（px, py）と倍率 */
export function browserCam(frame: number, keys: Key<{ z: number; px: number; py: number }>[]): Cam {
  const k = tween(frame, keys);
  return { z: k.z, fx: k.px, fy: k.py, ax: AX, ay: AY };
}

/** スマホ（画面の CSS px）を箱のどこに置くか。PHONE_W の幅で、箱の真ん中・上寄せ */
export const PHONE_W = 470;
export const PX0 = (GBOX.w - PHONE_W) / 2;
export const PY0 = 20;
export const PM = phoneMetrics(PHONE_W);
/** 画面の CSS px → 箱の座標（カメラをかける前） */
export const onPhone = (x: number, y: number) => ({ x: PX0 + PM.bezel + x * PM.q, y: PY0 + PM.bezel + y * PM.q });
export function phoneCam(frame: number, keys: Key<{ z: number; px: number; py: number }>[]): Cam {
  const k = tween(frame, keys);
  const f = onPhone(k.px, k.py);
  return { z: k.z, fx: f.x, fy: f.y, ax: AX, ay: AY };
}
export const projectPhone = (c: Cam, x: number, y: number) => {
  const p = onPhone(x, y);
  return project(c, p.x, p.y);
};

/** 押す動き。at で押し込み、戻る（0→1→0） */
export const pressAt = (frame: number, at: number, hold = 0) => interpolate(frame, [at - 2, at, at + 5 + hold], [0, 1, 0], clamp);

/** 画面をなぞる指（スマホ用）。press で少し縮んで濃くなる */
export function Finger({ x, y, press = 0, opacity = 1 }: { x: number; y: number; press?: number; opacity?: number }) {
  const r = 26 - press * 4;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: 99,
        background: `rgba(255,255,255,${0.45 + press * 0.25})`,
        border: `3px solid rgba(12,13,14,${0.35 + press * 0.3})`,
        boxShadow: "0 6px 16px rgba(12,13,14,0.25)",
        opacity,
      }}
    />
  );
}

/** キーボードの操作を見せる札（Ctrl + V など） */
export function Keys({ keys, x, y, opacity }: { keys: string[]; x: number; y: number; opacity: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 8, opacity, fontFamily: noto }}>
      {keys.map((k, i) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {i > 0 && <span style={{ fontSize: 22, fontWeight: 800, color: C.sub }}>+</span>}
          <span style={{ minWidth: 46, padding: "8px 14px", borderRadius: 10, background: "#fff", boxShadow: "0 3px 0 #c9ccd1, 0 0 0 1px #d6d8dc", fontSize: 22, fontWeight: 800, color: C.fg, textAlign: "center" }}>{k}</span>
        </span>
      ))}
    </div>
  );
}

/** start から出て、end で消える（それ以外は 0） */
export const window01 = (frame: number, start: number, end: number, fadeIn = 8, fadeOut = 8) => ease(frame, start, fadeIn) * (1 - ease(frame, end - fadeOut, fadeOut));

/** ばねで出す（ポップアップ・メニュー用）。0→1 */
export function usePop(at: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.6 } });
}

export const outCubic = Easing.out(Easing.cubic);

/** 画面の画像を1枚置く（幅・高さは CSS px） */
export const Shot = ({ src, w, h, style }: { src: string; w: number; h: number; style?: CSSProperties }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, ...style }} />
);

/** 画像の一部（rect）だけを切り出して、同じ位置に置く（課題が入ってくる様子に使う） */
export function Crop({ src, w, h, rect, style, children }: { src: string; w: number; h: number; rect: { x: number; y: number; w: number; h: number }; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, overflow: "hidden", ...style }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: -rect.x, top: -rect.y, width: w, height: h }} />
      {children}
    </div>
  );
}

export { project, tween, type Key };
