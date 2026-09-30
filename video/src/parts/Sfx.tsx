import { Html5Audio, Sequence, staticFile } from "remotion";

export type SfxName = "pop" | "click" | "whoosh" | "chime" | "success";

/** 効果音を at フレーム目に鳴らす（音は scripts/make-audio.mjs で合成したもの） */
export function Sfx({ at, name, volume = 0.5 }: { at: number; name: SfxName; volume?: number }) {
  return (
    <Sequence from={Math.round(at)} durationInFrames={45} layout="none">
      <Html5Audio src={staticFile(`audio/sfx-${name}.wav`)} volume={volume} />
    </Sequence>
  );
}
