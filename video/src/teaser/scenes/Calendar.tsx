import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone, phoneMetrics } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, project, Ring, Ripple, tween, type Key } from "../camera";
import shots from "../shots.json";
import { BOX, Caption, clamp, ease, Stage } from "../stage";

export const CALENDAR_FRAMES = 145;

const PHONE_W = 440;
const X0 = (BOX.w - PHONE_W) / 2;
const Y0 = 16;
const { bezel, q } = phoneMetrics(PHONE_W);
const AX = BOX.w / 2;
const AY = 360;

const { calendar, calendarPicked } = shots;
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const CLICK = 46;
const cell = center(calendar.cell);

/** 月のカレンダーに寄り、日付を押したら下のリストへ */
const CAM: Key<{ z: number; px: number; py: number }>[] = [
  { at: 0, z: 1.25, px: 215, py: center(calendar.grid).y },
  { at: CLICK + 8, z: 1.25, px: 215, py: center(calendar.grid).y },
  { at: CLICK + 40, z: 1.3, px: 215, py: calendarPicked.list!.y + 60 },
];

const CURSOR: Key<{ x: number; y: number }>[] = [
  { at: 16, x: cell.x + 120, y: cell.y + 160 },
  { at: CLICK - 6, x: cell.x, y: cell.y },
];

/** 16.5–20秒: 本物のカレンダー（月）。締切のある日に点が付く。日付を押すとその日の課題 */
export function Calendar() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });
  const cam = tween(frame, CAM);
  const c = { z: cam.z, ax: AX, ay: AY, fx: X0 + bezel + cam.px * q, fy: Y0 + bezel + cam.py * q };
  const toBox = (x: number, y: number) => project(c, X0 + bezel + x * q, Y0 + bezel + y * q);
  const cur = tween(frame, CURSOR);
  const curPos = toBox(cur.x, cur.y);
  const press = interpolate(frame, [CLICK - 2, CLICK, CLICK + 5], [0, 1, 0], clamp);

  return (
    <Stage clip caption={<Caption lines={["1か月の締切も、", "カレンダーで。"]} />}>
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(c) }}>
        <Phone
          width={PHONE_W}
          src="teaser/calendar.png"
          src2="teaser/calendar-picked.png"
          mix={ease(frame, CLICK + 2, 6)}
          screen={shots.viewport.height}
          style={{ position: "absolute", left: X0, top: Y0, transform: `translateY(${interpolate(enter, [0, 1], [90, 0])}px)`, opacity: enter }}
        >
          <Ring {...calendarPicked.list!} opacity={ease(frame, CLICK + 34, 10)} />
        </Phone>
      </div>
      <Ripple {...toBox(cell.x, cell.y)} t={frame - CLICK} />
      <Cursor x={curPos.x} y={curPos.y} press={press} opacity={ease(frame, 16, 8) * (1 - ease(frame, CLICK + 14, 10))} />
      <Sfx at={CLICK} name="click" volume={0.6} />
    </Stage>
  );
}
