import { Still } from "remotion";
import { Og } from "./og/Og";

/**
 * 作るものの一覧。`npm run studio` で見ながら直し、`npm run og` で書き出す。
 * - og … 共有したときのカード（public/og.png・1200×630）
 */
export const Root = () => {
  return <Still id="og" component={Og} width={1200} height={630} />;
};
