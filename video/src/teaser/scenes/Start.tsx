import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone, phoneMetrics } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, project, Ripple, tween, type Key } from "../camera";
import shots from "../shots.json";
import { BOX, Caption, clamp, ease, Stage } from "../stage";

export const START_FRAMES = 96;

const PHONE_W = 440;
const X0 = (BOX.w - PHONE_W) / 2;
const Y0 = 16;
const { bezel, q } = phoneMetrics(PHONE_W);
const AX = BOX.w / 2;
const AY = 360;

const btn = shots.login.button;
const target = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
const CLICK = 38;

/** ログイン画面のボタンに寄る → 押すとホーム（課題が並んだ画面）に替わり、少し引く */
const CAM: Key<{ z: number; px: number; py: number }>[] = [
  { at: 0, z: 1.3, px: 215, py: target.y - 40 },
  { at: CLICK + 10, z: 1.3, px: 215, py: target.y - 40 },
  { at: CLICK + 40, z: 1.05, px: 215, py: 380 },
];

/** 23.5–27秒: はじめ方。Google でログインするだけで Classroom の課題が並ぶ */
export function Start() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });
  const cam = tween(frame, CAM);
  const c = { z: cam.z, ax: AX, ay: AY, fx: X0 + bezel + cam.px * q, fy: Y0 + bezel + cam.py * q };
  const toBox = (x: number, y: number) => project(c, X0 + bezel + x * q, Y0 + bezel + y * q);
  const cur = tween(frame, [
    { at: 12, x: target.x + 110, y: target.y + 190 },
    { at: CLICK - 6, x: target.x + 30, y: target.y + 4 },
  ]);
  const curPos = toBox(cur.x, cur.y);
  const press = interpolate(frame, [CLICK - 2, CLICK, CLICK + 5], [0, 1, 0], clamp);

  return (
    <Stage
      clip
      caption={
        <Caption
          lines={["Google でログインするだけ。"]}
          wideLines={["Google で", "ログインするだけ。"]}
          sub="Classroom の課題が、すぐに並びます"
        />
      }
    >
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(c) }}>
        <Phone
          width={PHONE_W}
          src="teaser/login.png"
          src2="teaser/home.png"
          mix={ease(frame, CLICK + 6, 12)}
          screen={shots.viewport.height}
          style={{ position: "absolute", left: X0, top: Y0, transform: `translateY(${interpolate(enter, [0, 1], [90, 0])}px)`, opacity: enter }}
        />
      </div>
      <Ripple {...toBox(target.x + 30, target.y + 4)} t={frame - CLICK} />
      <Cursor x={curPos.x} y={curPos.y} press={press} opacity={ease(frame, 12, 8) * (1 - ease(frame, CLICK + 10, 8))} />
      <Sfx at={CLICK} name="click" volume={0.6} />
      <Sfx at={CLICK + 14} name="success" volume={0.35} />
    </Stage>
  );
}
