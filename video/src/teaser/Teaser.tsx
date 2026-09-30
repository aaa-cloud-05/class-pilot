import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Html5Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { Calendar, CALENDAR_FRAMES } from "./scenes/Calendar";
import { End, END_FRAMES } from "./scenes/End";
import { Mail, MAIL_FRAMES } from "./scenes/Mail";
import { PhoneTour, PHONE_TOUR_FRAMES } from "./scenes/PhoneTour";
import { Problems, PROBLEMS_FRAMES } from "./scenes/Problems";
import { Scatter, SCATTER_FRAMES } from "./scenes/Scatter";
import { Start, START_FRAMES } from "./scenes/Start";

/** 場面の順と長さ（30fps）。構成案は docs/video-plan.md の A */
const SCENES = [
  { id: "problems", frames: PROBLEMS_FRAMES, C: Problems },
  { id: "scatter", frames: SCATTER_FRAMES, C: Scatter },
  { id: "phone", frames: PHONE_TOUR_FRAMES, C: PhoneTour },
  { id: "calendar", frames: CALENDAR_FRAMES, C: Calendar },
  { id: "mail", frames: MAIL_FRAMES, C: Mail },
  { id: "start", frames: START_FRAMES, C: Start },
  { id: "end", frames: END_FRAMES, C: End },
];
const FADE = 12;

export const TEASER_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);

/** BGM（scripts/make-audio.mjs で合成）。頭は少し上げてから下げ、最後の1.5秒で消す */
function Bgm() {
  const { durationInFrames } = useVideoConfig();
  return (
    <Html5Audio
      src={staticFile("audio/bgm-teaser.wav")}
      volume={(f) => interpolate(f, [0, 12, durationInFrames - 45, durationInFrames - 1], [0, 0.32, 0.32, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
}

/**
 * X に貼る紹介動画。無音で見られる前提で、言いたいことは見出しに全部書く（音は BGM と効果音だけ）。
 * 正方形（1080×1080）が本命、同じ構成で横長（1920×1080）も書き出す。並べ方は stage.tsx が決める。
 */
export const Teaser = () => {
  return (
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
};
