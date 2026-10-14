import type { CSSProperties } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Og } from "../../og/Og";
import { MailCard } from "../../parts/MailCard";
import { Phone } from "../../parts/Phone";
import { C, jakarta, noto, WASH } from "../../theme";
import { clamp, useLayout } from "../stage";

export const COVER_FRAMES = 36;

function Chip({ children, size }: { children: string; size: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.45,
        height: size * 2.3,
        padding: `0 ${size * 0.9}px`,
        borderRadius: 999,
        background: C.card,
        boxShadow: `0 0 0 1px ${C.line}`,
        fontSize: size,
        fontWeight: 700,
        color: C.fg,
      }}
    >
      <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 999, background: C.primary }} />
      {children}
    </span>
  );
}

/**
 * 表紙。X は動画の最初のコマをサムネイルにするので、0 フレーム目で全部が見えている状態にする。
 * - 横長: OG（共有カード・src/og/Og.tsx）をそのまま一瞬見せる
 * - 正方形: OG と同じ構成を正方形に並べ直したもの（タイムラインで小さく出るので、文字は大きく・少なく）
 * どちらもゆっくり寄るだけ。「無料」は書かない
 */
export function Cover() {
  const frame = useCurrentFrame();
  const { wide, width, height } = useLayout();
  const zoom = interpolate(frame, [0, COVER_FRAMES], [1, 1.025], clamp);
  if (wide) {
    // 1200×630 を高さに合わせて拡大する（文字がにじまないよう画像ではなく部品のまま）。左右の余白が少し切れるだけ
    const k = height / 630;
    return (
      <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "40% 50%" }}>
          <div style={{ position: "absolute", left: (width - 1200 * k) / 2, top: 0, width: 1200, height: 630, transform: `scale(${k})`, transformOrigin: "0 0" }}>
            <Og />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const L = {
    brand: { left: 84, top: 74, mark: 62, font: 42 },
    title: { left: 84, top: 178, font: 100 },
    sub: { left: 84, top: 440, width: 900, font: 33 },
    // スマホにかぶらないよう2つだけ
    chips: { left: 84, top: 560, size: 25, items: ["締切順の一覧", "締切前にメール"] },
    phone: { left: 640, top: 520, width: 380 },
    mail: { left: 60, top: 780, width: 600 },
  };
  const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: noto, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: WASH }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "40% 50%" }}>
        <div style={abs({ left: L.brand.left, top: L.brand.top, display: "flex", alignItems: "center", gap: L.brand.mark * 0.26 })}>
          <Img src={staticFile("mark.png")} style={{ width: L.brand.mark, height: L.brand.mark }} />
          <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: L.brand.font, letterSpacing: "-0.02em", color: C.fg }}>UnionFetch</span>
        </div>

        <div style={abs({ left: L.title.left, top: L.title.top, fontWeight: 800, fontSize: L.title.font, lineHeight: 1.18, letterSpacing: "-0.04em", color: C.fg })}>
          課題の締切を、
          <br />
          ひとつの場所で。
        </div>

        <div style={abs({ left: L.sub.left, top: L.sub.top, width: L.sub.width, fontWeight: 700, fontSize: L.sub.font, lineHeight: 1.6, color: C.sub })}>
          WebClass と Google Classroom の課題をまとめて、
          <br />
          締切の前にメールでお知らせします。
        </div>

        <div style={abs({ left: L.chips.left, top: L.chips.top, display: "flex", gap: L.chips.size * 0.5 })}>
          {L.chips.items.map((t) => (
            <Chip key={t} size={L.chips.size}>
              {t}
            </Chip>
          ))}
        </div>

        {/* スマホで見たホーム（デモデータ）。下は画面の外へ切れてよい */}
        <Phone width={L.phone.width} style={abs({ left: L.phone.left, top: L.phone.top, transform: "rotate(-4deg)", transformOrigin: "50% 0%" })} />

        <MailCard width={L.mail.width} style={abs({ left: L.mail.left, top: L.mail.top })} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
