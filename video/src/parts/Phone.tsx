import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C } from "../theme";

/** スマホの枠の太さと、画面の中の 1 CSS px が何 px になるか（幅430の画面を撮っている） */
export function phoneMetrics(width: number) {
  const k = width / 330;
  const bezel = 10 * k;
  const inner = width - 2 * bezel;
  return { k, bezel, inner, q: inner / 430 };
}

/**
 * スマホの枠に、デモデータで撮った画面を入れる。
 * - screen を渡さないと画像の高さのまま（OG。下は切れてよい）
 * - screen（CSS px の画面の高さ）を渡すとその高さで切り抜き、scroll（CSS px）だけ中身を上へ送る。
 *   ページ全体を撮った画像と組み合わせてスクロールに見せる
 * - src2 と mix で、2枚目の画像へ重ねて切り替える（押したあとの画面など）
 * - children はページの座標（CSS px）で描き、ページと一緒にスクロールする（強調の枠など）
 */
export function Phone({
  width = 330,
  src = "home-mobile.png",
  screen,
  scroll = 0,
  src2,
  mix = 0,
  children,
  style,
}: {
  width?: number;
  src?: string;
  screen?: number;
  scroll?: number;
  src2?: string;
  mix?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const { k, bezel, inner, q } = phoneMetrics(width);
  const img: CSSProperties = { display: "block", width: "100%" };
  return (
    <div style={{ width, ...style }}>
      <div
        style={{
          borderRadius: 54 * k,
          padding: bezel,
          background: C.fg,
          boxShadow: "0 44px 90px -24px rgba(12,13,14,0.38), 0 0 0 1px rgba(12,13,14,0.06)",
        }}
      >
        <div style={{ position: "relative", borderRadius: 44 * k, overflow: "hidden", height: screen ? screen * q : undefined, background: C.bg }}>
          <div style={{ position: "relative", transform: `translateY(${-scroll * q}px)` }}>
            <Img src={staticFile(src)} style={img} />
            {src2 && <Img src={staticFile(src2)} style={{ ...img, position: "absolute", left: 0, top: 0, opacity: mix }} />}
            {children && (
              <div style={{ position: "absolute", left: 0, top: 0, width: 430, height: screen, transform: `scale(${q})`, transformOrigin: "0 0" }}>{children}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
