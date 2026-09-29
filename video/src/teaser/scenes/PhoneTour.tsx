import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone, phoneMetrics } from "../../parts/Phone";
import { camStyle, Cursor, project, Ring, Ripple, tween, type Key } from "../camera";
import shots from "../shots.json";
import { BOX, Caption, clamp, ease, Rise, Stage } from "../stage";

/** この場面の長さ（フレーム） */
export const PHONE_TOUR_FRAMES = 285;

const PHONE_W = 440;
const X0 = (BOX.w - PHONE_W) / 2;
const Y0 = 16;
const { bezel, q } = phoneMetrics(PHONE_W);
/** カメラが寄せた点を置く場所（箱の座標） */
const AX = BOX.w / 2;
const AY = 370;

const { home, picked } = shots;
const THU = home.bars[3];
const center = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// 何フレーム目に何をするか
const T = {
  toList: [28, 76], // リストまでスクロールしながら寄る
  toWeek: [118, 150], // 今週のカードへ戻って大きく寄る
  click: 168, // 木曜の棒を押す
  toPicked: [180, 228], // 選んだ日の課題へ下りる
};

/** カメラ（ページの座標 px, py を AX, AY に置いて z 倍） */
const CAM: Key<{ z: number; px: number; py: number }>[] = [
  { at: 0, z: 1, px: 215, py: (AY - Y0 - bezel) / q },
  { at: T.toList[0], z: 1, px: 215, py: (AY - Y0 - bezel) / q },
  { at: T.toList[1], z: 1.3, px: 215, py: center(home.today).y },
  { at: T.toWeek[0], z: 1.3, px: 215, py: center(home.today).y },
  { at: T.toWeek[1], z: 2.05, px: 215, py: center(home.week).y },
  { at: T.toPicked[0], z: 2.05, px: 215, py: center(home.week).y },
  { at: T.toPicked[1], z: 1.35, px: 215, py: center(picked.picked!).y },
];

/** ページのスクロール（CSS px） */
const SCROLL: Key<{ s: number }>[] = [
  { at: T.toList[0], s: 0 },
  { at: T.toList[1], s: 440 },
  { at: T.toWeek[0], s: 440 },
  { at: T.toWeek[1], s: 0 },
  { at: T.toPicked[0], s: 0 },
  { at: T.toPicked[1], s: 440 },
];

/** カーソル（ページの座標）。「あと1時間」を指してから、木曜の棒へ */
const soon = center(home.soon!);
const thu = { x: THU.x + THU.w / 2, y: THU.y + 40 };
const CURSOR: Key<{ x: number; y: number }>[] = [
  { at: 84, x: soon.x + 90, y: soon.y + 150 },
  { at: 104, x: soon.x, y: soon.y },
  { at: T.toWeek[0], x: soon.x, y: soon.y },
  { at: T.click - 6, x: thu.x, y: thu.y },
];

/**
 * 8–17秒: スマホで見た本物のホーム（scripts/teaser-shots.mjs で撮影）。
 * 締切順のリストへスクロール → 今週のカードに寄る → 木曜の棒を押す → その日の課題へ。
 */
export function PhoneTour() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 20, mass: 0.9 } });
  const { s: scroll } = tween(frame, SCROLL);
  const cam = tween(frame, CAM);
  const c = { z: cam.z, ax: AX, ay: AY, fx: X0 + bezel + cam.px * q, fy: Y0 + bezel + (cam.py - scroll) * q };

  const cur = tween(frame, CURSOR);
  const curPos = project(c, X0 + bezel + cur.x * q, Y0 + bezel + (cur.y - scroll) * q);
  const curOn = ease(frame, 84, 8) * (1 - ease(frame, T.toPicked[0], 10));
  const press = interpolate(frame, [T.click - 2, T.click, T.click + 5], [0, 1, 0], clamp);
  const mix = ease(frame, T.click + 2, 6);

  const firstOut = ease(frame, 112, 10);
  const caption = (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 1 - firstOut }}>
        <Caption lines={["締切順に、", "ひとつのリストへ。"]} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>
        <Caption lines={["今週の忙しさが、", "ひと目で。"]} at={124} />
        <Rise at={T.click + 4}>
          <div style={{ marginTop: 14, fontSize: 31, fontWeight: 700, color: "#5b6169" }}>棒を押すと、その日の課題が並ぶ</div>
        </Rise>
      </div>
    </div>
  );

  return (
    <Stage caption={caption} clip>
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(c) }}>
        <Phone
          width={PHONE_W}
          src="teaser/home.png"
          src2="teaser/home-picked.png"
          mix={mix}
          screen={shots.viewport.height}
          scroll={scroll}
          style={{ position: "absolute", left: X0, top: Y0, transform: `translateY(${interpolate(enter, [0, 1], [620, 0])}px)` }}
        >
          <Ring {...home.today} opacity={ease(frame, 80, 12) * (1 - ease(frame, 112, 8))} />
          <Ring {...picked.picked!} opacity={ease(frame, T.toPicked[1] - 14, 12)} />
        </Phone>
      </div>
      <Ripple {...project(c, X0 + bezel + thu.x * q, Y0 + bezel + (thu.y - scroll) * q)} t={frame - T.click} />
      <Cursor x={curPos.x} y={curPos.y} press={press} opacity={curOn} />
    </Stage>
  );
}
