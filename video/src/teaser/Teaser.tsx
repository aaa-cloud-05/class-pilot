import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { End } from "./scenes/End";
import { Hook } from "./scenes/Hook";
import { Mail, MAIL_FRAMES } from "./scenes/Mail";
import { PhoneTour, PHONE_TOUR_FRAMES } from "./scenes/PhoneTour";
import { Scatter } from "./scenes/Scatter";

/** 場面の順と長さ（30fps）。構成案は docs/video-plan.md の A */
const SCENES = [
  { id: "hook", frames: 75, C: Hook },
  { id: "scatter", frames: 190, C: Scatter },
  { id: "phone", frames: PHONE_TOUR_FRAMES, C: PhoneTour },
  { id: "mail", frames: MAIL_FRAMES, C: Mail },
  { id: "end", frames: 105, C: End },
];
const FADE = 12;

export const TEASER_FRAMES = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);

/**
 * X に貼る紹介動画。無音で見られる前提で、言いたいことは見出しに全部書く。
 * 正方形（1080×1080）が本命、同じ構成で横長（1920×1080）も書き出す。並べ方は stage.tsx が決める。
 */
export const Teaser = () => {
  return (
    <TransitionSeries>
      {SCENES.flatMap(({ id, frames, C }, i) => [
        ...(i > 0 ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />] : []),
        <TransitionSeries.Sequence key={id} durationInFrames={frames}>
          <C />
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  );
};
