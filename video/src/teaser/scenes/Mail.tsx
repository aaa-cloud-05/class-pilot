import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MailCard } from "../../parts/MailCard";
import { Phone, phoneMetrics } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, project, Ripple, tween, type Key } from "../camera";
import shots from "../shots.json";
import { BOX, Caption, clamp, ease, Stage } from "../stage";

export const MAIL_FRAMES = 110;

const PHONE_W = 440;
const X0 = (BOX.w - PHONE_W) / 2;
const Y0 = 16;
const { bezel, q, inner } = phoneMetrics(PHONE_W);
const AX = BOX.w / 2;
const AY = 360;
const TAP = 44;

/** 本物のメール（scripts/teaser-shots.mjs でテンプレートから撮影）で、寄る先。「あと3時間」から締切の行まで */
const CAM: Key<{ z: number; px: number; py: number }>[] = [
  { at: 0, z: 1.3, px: 215, py: 250 },
  { at: TAP + 8, z: 1.3, px: 215, py: 250 },
  { at: TAP + 40, z: 1.6, px: 200, py: 190 },
];

/**
 * 20–23.5秒: 締切の前に通知が届く → 押すと本物のメール。
 * 通知のカードは OG と同じ部品（件名はアプリが送るものと同じ形）。
 */
export function Mail() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });
  const drop = spring({ frame: frame - 12, fps, config: { damping: 15, mass: 0.8 } });
  const away = ease(frame, TAP + 4, 10);
  const cam = tween(frame, CAM);
  const c = { z: cam.z, ax: AX, ay: AY, fx: X0 + bezel + cam.px * q, fy: Y0 + bezel + cam.py * q };

  // 通知のカード（画面の上端に降りてくる）
  const cardW = inner - 24;
  const cardX = X0 + bezel + 12;
  const cardY = Y0 + bezel + 14;
  const tapAt = { x: cardX + cardW * 0.62, y: cardY + 52 };
  const cursorKeys: Key<{ x: number; y: number }>[] = [
    { at: 20, x: tapAt.x + 150, y: tapAt.y + 260 },
    { at: TAP - 4, x: tapAt.x, y: tapAt.y },
  ];
  const cur = tween(frame, cursorKeys);
  const curPos = project(c, cur.x, cur.y);
  const tap = project(c, tapAt.x, tapAt.y);
  const press = interpolate(frame, [TAP - 2, TAP, TAP + 5], [0, 1, 0], clamp);

  return (
    <Stage
      clip
      caption={<Caption lines={["締切の前に、", "メールでお知らせ。"]} sub="通知のない WebClass の課題にも" />}
    >
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(c) }}>
        <Phone
          width={PHONE_W}
          src="teaser/mail.png"
          screen={shots.viewport.height}
          style={{ position: "absolute", left: X0, top: Y0, transform: `translateY(${interpolate(enter, [0, 1], [80, 0])}px)`, opacity: enter }}
        />
        <div
          style={{
            position: "absolute",
            left: cardX,
            top: cardY,
            opacity: interpolate(drop, [0, 0.3], [0, 1], clamp) * (1 - away),
            transform: `translateY(${interpolate(drop, [0, 1], [-160, 0]) - away * 60}px) scale(${1 - press * 0.03})`,
          }}
        >
          <MailCard width={cardW} />
        </div>
      </div>
      <Ripple x={tap.x} y={tap.y} t={frame - TAP} />
      <Cursor x={curPos.x} y={curPos.y} press={press} opacity={ease(frame, 20, 8) * (1 - ease(frame, TAP + 10, 10))} />
      <Sfx at={12} name="chime" volume={0.45} />
      <Sfx at={TAP} name="click" volume={0.6} />
    </Stage>
  );
}
