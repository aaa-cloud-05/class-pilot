import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone, phoneMetrics } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { SOURCE, SourceTag, type Source } from "../../parts/SourceTag";
import { camStyle, Cursor, project, Ring, Ripple, tween, type Key } from "../camera";
import shots from "../shots.json";
import { BOX, Caption, clamp, ease, Rise, Stage } from "../stage";

/** この場面の長さ（フレーム） */
export const PHONE_TOUR_FRAMES = 240;

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
const listMid = (home.today.y + home.tomorrow.y + home.tomorrow.h) / 2;

// 何フレーム目に何をするか
const T = {
  toList: [28, 72], // リストまでスクロールしながら寄る
  tags: 76, // 行に札が付き始める
  swap: 112, // 見出しを入れ替え、今週のカードへ
  toWeek: [116, 146],
  ring: 146, // いちばん多い木曜の棒を囲む
  click: 166, // 木曜の棒を押す
  toPicked: [178, 214], // その日の課題へ下りる
};

/** カメラ（ページの座標 px, py を AX, AY に置いて z 倍） */
const CAM: Key<{ z: number; px: number; py: number }>[] = [
  { at: 0, z: 1, px: 215, py: (AY - Y0 - bezel) / q },
  { at: T.toList[0], z: 1, px: 215, py: (AY - Y0 - bezel) / q },
  { at: T.toList[1], z: 1.22, px: 215, py: listMid },
  { at: T.toWeek[0], z: 1.22, px: 215, py: listMid },
  { at: T.toWeek[1], z: 2.05, px: 215, py: center(home.week).y },
  { at: T.toPicked[0], z: 2.05, px: 215, py: center(home.week).y },
  { at: T.toPicked[1], z: 1.35, px: 215, py: center(picked.picked!).y },
];

/** ページのスクロール（CSS px） */
const SCROLL: Key<{ s: number }>[] = [
  { at: T.toList[0], s: 0 },
  { at: T.toList[1], s: 460 },
  { at: T.toWeek[0], s: 460 },
  { at: T.toWeek[1], s: 0 },
  { at: T.toPicked[0], s: 0 },
  { at: T.toPicked[1], s: 440 },
];

/** カーソル（ページの座標）。木曜の棒へ */
const thu = { x: THU.x + THU.w / 2, y: THU.y + 40 };
const CURSOR: Key<{ x: number; y: number }>[] = [
  { at: T.ring - 6, x: thu.x + 70, y: thu.y + 150 },
  { at: T.click - 6, x: thu.x, y: thu.y },
];

/**
 * 10–16.5秒: スマホで見た本物のホーム（scripts/teaser-shots.mjs で撮影）。
 * リストへスクロールし、行の外に「WebClass / Classroom」の札を出して混ざっていることを見せる
 * （WebClass は左、Classroom は右。前の場面の窓と同じ側）→ 今週のカードに寄り、いちばん多い木曜を囲む
 * → 木曜の棒を押すと、その日の課題が並ぶ（押したあとの画面も本物）。
 */
export function PhoneTour() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 20, mass: 0.9 } });
  const { s: scroll } = tween(frame, SCROLL);
  const cam = tween(frame, CAM);
  const c = { z: cam.z, ax: AX, ay: AY, fx: X0 + bezel + cam.px * q, fy: Y0 + bezel + (cam.py - scroll) * q };
  const toBox = (x: number, y: number) => project(c, X0 + bezel + x * q, Y0 + bezel + (y - scroll) * q);
  const phoneL = project(c, X0, 0).x;
  const phoneR = project(c, X0 + PHONE_W, 0).x;
  const tagsOut = ease(frame, T.swap - 6, 8);
  const cur = tween(frame, CURSOR);
  const cp = toBox(cur.x, cur.y);
  const press = interpolate(frame, [T.click - 2, T.click, T.click + 5], [0, 1, 0], clamp);
  const mix = ease(frame, T.click + 2, 6);

  const firstOut = ease(frame, T.swap - 6, 10);
  const caption = (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 1 - firstOut }}>
        <Caption lines={["WebClass も Classroom も、", "締切順に並ぶ。"]} wideLines={["WebClass も", "Classroom も、", "締切順に並ぶ。"]} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>
        <Caption lines={["今週の忙しさが、", "ひと目で。"]} at={T.swap + 6} />
        <Rise at={T.click + 4}>
          <div style={{ marginTop: 12, fontSize: 31, fontWeight: 700, color: "#5b6169" }}>棒を押すと、その日の課題が並ぶ</div>
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
          <Ring x={THU.x + 2} y={THU.y - 4} w={THU.w - 4} h={THU.h + 4} radius={10} pad={4} opacity={ease(frame, T.ring, 10) * (1 - ease(frame, T.click + 2, 6))} />
          <Ring {...picked.picked!} opacity={ease(frame, T.toPicked[1] - 12, 10)} />
        </Phone>
      </div>

      {/* 行の外に出す札。行の高さに合わせ、スマホの縁から線でつなぐ */}
      {home.rows.map((r, i) => {
        const at = T.tags + i * 5;
        const p = spring({ frame: frame - at, fps, config: { damping: 15, mass: 0.6 } });
        const src = r.source as Source;
        const left = src === "webclass";
        const y = toBox(0, r.y + r.h / 2 + 4).y;
        const edge = left ? phoneL : phoneR;
        const gap = 26;
        return (
          <div key={r.title} style={{ position: "absolute", top: y - 17, left: 0, width: BOX.w, height: 34, opacity: Math.min(1, p * 1.5) * (1 - tagsOut) }}>
            <div
              style={{
                position: "absolute",
                top: 16,
                height: 2,
                left: left ? edge - gap : edge,
                width: gap * p,
                marginLeft: left ? gap * (1 - p) : 0,
                background: SOURCE[src].dot,
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                ...(left ? { right: BOX.w - (edge - gap) } : { left: edge + gap }),
                transform: `translateX(${(1 - p) * (left ? -24 : 24)}px)`,
              }}
            >
              <SourceTag source={src} size={23} style={{ boxShadow: "0 8px 20px -10px rgba(12,13,14,0.35)" }} />
            </div>
          </div>
        );
      })}
      {home.rows.map((r, i) => (
        <Sfx key={r.title} at={T.tags + i * 5} name="pop" volume={0.22} />
      ))}
      <Ripple {...toBox(thu.x, thu.y)} t={frame - T.click} />
      <Cursor x={cp.x} y={cp.y} press={press} opacity={ease(frame, T.ring - 6, 8) * (1 - ease(frame, T.click + 12, 8))} />
      <Sfx at={T.toWeek[0]} name="whoosh" volume={0.25} />
      <Sfx at={T.click} name="click" volume={0.6} />
    </Stage>
  );
}
