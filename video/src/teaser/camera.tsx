import { Easing, interpolate } from "remotion";
import { C } from "../theme";
import { clamp } from "./stage";

/**
 * 画面の中を寄って見せるためのカメラとカーソル。
 * 座標はすべて「中身の箱（BOX）」の座標。カメラは点 (fx, fy) を (ax, ay) に置き、z 倍に拡大する。
 */
export type Cam = { z: number; fx: number; fy: number; ax: number; ay: number };
export type Key<T> = T & { at: number };

const inOut = Easing.inOut(Easing.cubic);

/** キーフレームの間をなめらかにつなぐ（数値の項目だけ） */
export function tween<T extends Record<string, number>>(frame: number, keys: Key<T>[]): T {
  const i = keys.findIndex((k) => k.at > frame);
  if (i === 0) return keys[0];
  if (i === -1) return keys[keys.length - 1];
  const a = keys[i - 1];
  const b = keys[i];
  const t = interpolate(frame, [a.at, b.at], [0, 1], { ...clamp, easing: inOut });
  const out = {} as Record<string, number>;
  for (const key of Object.keys(b)) out[key] = (a as Record<string, number>)[key] + ((b as Record<string, number>)[key] - (a as Record<string, number>)[key]) * t;
  return out as T;
}

export const camStyle = (c: Cam) => ({
  transform: `translate(${c.ax - c.fx * c.z}px, ${c.ay - c.fy * c.z}px) scale(${c.z})`,
  transformOrigin: "0 0",
});

/** 中身の点が、カメラを通すと箱のどこに来るか（カーソルは拡大しないので、これで位置だけ合わせる） */
export const project = (c: Cam, x: number, y: number) => ({ x: c.ax + (x - c.fx) * c.z, y: c.ay + (y - c.fy) * c.z });

/** マウスのカーソル。先端が (x, y)。press（0→1）で少し縮む */
export function Cursor({ x, y, press = 0, opacity = 1 }: { x: number; y: number; press?: number; opacity?: number }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 3,
        opacity,
        transform: `scale(${1 - press * 0.14})`,
        transformOrigin: "7px 3px",
        filter: "drop-shadow(0 4px 8px rgba(12,13,14,0.35))",
        overflow: "visible",
      }}
    >
      <path d="M5.5 3.2v16.4l4.3-4.1 2.9 6.2 3-1.4-2.9-6.1h6z" fill={C.fg} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** 押した場所に広がる波紋。t は押してからのフレーム数 */
export function Ripple({ x, y, t }: { x: number; y: number; t: number }) {
  if (t < 0 || t > 20) return null;
  const p = interpolate(t, [0, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const r = 14 + p * 46;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: 999,
        border: `4px solid ${C.primary}`,
        background: "rgba(47,107,255,0.14)",
        opacity: 1 - p,
      }}
    />
  );
}

/** ページの中の要素を囲む枠（Phone の children に入れて、ページの座標で描く） */
export function Ring({ x, y, w, h, opacity, pad = 6, radius = 16 }: { x: number; y: number; w: number; h: number; opacity: number; pad?: number; radius?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - pad,
        top: y - pad,
        width: w + pad * 2,
        height: h + pad * 2,
        borderRadius: radius,
        border: `2.5px solid ${C.primary}`,
        boxShadow: "0 0 0 6px rgba(47,107,255,0.14)",
        opacity,
      }}
    />
  );
}
