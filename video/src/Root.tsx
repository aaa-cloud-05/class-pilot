import { Composition, Still } from "remotion";
import { Guide, GUIDE_FRAMES } from "./guide/Guide";
import { Og } from "./og/Og";
import { Teaser, TEASER_FRAMES } from "./teaser/Teaser";

/**
 * 作るものの一覧。`npm run studio` で見ながら直し、npm run の各コマンドで書き出す。
 * - og … 共有したときのカード（public/og.png・1200×630）
 * - teaser … X に貼る紹介動画（正方形 1080×1080）。teaser-wide は同じ構成の横長（1920×1080）
 * - guide … 使い方の動画（1920×1080）。Classroom と WebClass（PC・iPhone）のつなぎ方
 */
export const Root = () => {
  return (
    <>
      <Still id="og" component={Og} width={1200} height={630} />
      <Composition id="teaser" component={Teaser} durationInFrames={TEASER_FRAMES} fps={30} width={1080} height={1080} />
      <Composition id="teaser-wide" component={Teaser} durationInFrames={TEASER_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="guide" component={Guide} durationInFrames={GUIDE_FRAMES} fps={30} width={1920} height={1080} />
    </>
  );
};
