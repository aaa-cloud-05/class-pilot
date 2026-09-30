import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Html5Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { CHAPTER_FRAMES, ChapterClassroom, ChapterWebClass, Intro, INTRO_FRAMES, Outro, OUTRO_FRAMES } from "./scenes/Bookends";
import { Classroom, CLASSROOM_FRAMES } from "./scenes/Classroom";
import { Import, IMPORT_FRAMES } from "./scenes/Import";
import { WebClassPC, WEBCLASS_PC_FRAMES } from "./scenes/WebClassPC";
import { WebClassPhone, WEBCLASS_PHONE_FRAMES } from "./scenes/WebClassPhone";

/** 章の順と長さ（30fps）。構成案は docs/video-plan.md の B */
const SCENES = [
  { id: "intro", frames: INTRO_FRAMES, C: Intro },
  { id: "chapter-classroom", frames: CHAPTER_FRAMES, C: ChapterClassroom },
  { id: "classroom", frames: CLASSROOM_FRAMES, C: Classroom },
  { id: "chapter-webclass", frames: CHAPTER_FRAMES + 20, C: ChapterWebClass },
  { id: "webclass-pc", frames: WEBCLASS_PC_FRAMES, C: WebClassPC },
  { id: "webclass-phone", frames: WEBCLASS_PHONE_FRAMES, C: WebClassPhone },
  { id: "import", frames: IMPORT_FRAMES, C: Import },
  { id: "outro", frames: OUTRO_FRAMES, C: Outro },
];
const FADE = 15;

export const GUIDE_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);

/** 章の始まりのフレーム（確認用） */
export const GUIDE_STARTS = SCENES.reduce<Record<string, number>>((acc, s, i) => {
  acc[s.id] = SCENES.slice(0, i).reduce((n, x) => n + x.frames, 0) - FADE * i;
  return acc;
}, {});

/** BGM は落ち着いたものを小さく流し続ける（44秒の繰り返し） */
function Bgm() {
  const { durationInFrames } = useVideoConfig();
  return (
    <Html5Audio
      src={staticFile("audio/bgm-guide.wav")}
      loop
      volume={(f) => interpolate(f, [0, 20, durationInFrames - 60, durationInFrames - 1], [0, 0.3, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
}

/**
 * 使い方の動画（YouTube の限定公開を想定・1920×1080）。字幕が主で、音は BGM と効果音だけ。
 * 1. Classroom（Google でログイン。2回目からは何もしない）→ 2. WebClass（はじめの1回: PC の Chrome・iPhone の Safari → 2回目から: ブックマークを押す）→ まとめ。
 */
export const Guide = () => (
  <>
    <TransitionSeries>
      {SCENES.flatMap(({ id, frames, C }, i) => [
        ...(i > 0 ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />] : []),
        <TransitionSeries.Sequence key={id} durationInFrames={frames}>
          <C />
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <Bgm />
  </>
);
