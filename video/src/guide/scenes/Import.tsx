import { interpolate, useCurrentFrame } from "remotion";
import { Phone } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, Ripple } from "../../teaser/camera";
import { clamp, ease } from "../../teaser/stage";
import { GuideStage } from "../GuideStage";
import { browserCam, FIT, Finger, phoneCam, PHONE_W, pressAt, project, projectPhone, PX0, PY0, Shot, tween, usePop, window01 } from "../helpers";
import shots from "../shots.json";
import { barItemCenter, Browser, MaskedWebClassUrl, pageTop } from "../ui/chrome";
import { ImportProgress, WebClassPC, WebClassPhone } from "../ui/pages";
import { bookmarkRow, menuAt, SAFARI_MORE, SafariBar, SafariBookmarks, SafariMenu } from "../ui/safari";

export const IMPORT_FRAMES = 560;

const TOP = pageTop(true);
const W = 1440;
const H = 900;
const BH = TOP + H;
const NAME = "WebClass を取り込む";
const T = { click: 50, progress: [58, 138], done: 140, home: 204, swap: 290, more: 336, books: 366, row: 400, mProgress: [406, 452], mDone: 454, mHome: 506 };

/**
 * 次からは: WebClass を開いてブックマークを押すだけ。PC → スマホの順に見せる。
 * 取り込み中の画面は一瞬で終わって撮れないので描いたもの。終わった画面とホームは本物
 */
export function Import() {
  const frame = useCurrentFrame();
  const item = barItemCenter([NAME], 0);
  const pcOn = 1 - ease(frame, T.swap, 14);
  const phoneOn = ease(frame, T.swap + 6, 14);
  const menu = usePop(T.more + 2);
  const sheet = usePop(T.books + 2);

  const cam = browserCam(frame, [
    { at: 0, z: FIT, px: W / 2, py: BH / 2 },
    { at: 20, z: 1.4, px: 360, py: 240 },
    { at: T.click + 6, z: 1.4, px: 360, py: 240 },
    { at: T.click + 26, z: 1.45, px: W / 2, py: TOP + H / 2 + 20 },
    { at: T.home, z: 1.45, px: W / 2, py: TOP + H / 2 + 20 },
    { at: T.home + 24, z: 1.0, px: 700, py: TOP + 380 },
  ]);
  const cur = tween(frame, [
    { at: 8, x: 800, y: 600 },
    { at: T.click - 6, x: item.x, y: item.y },
  ]);
  const cp = project(cam, cur.x, cur.y);
  const pcPage = frame < T.click + 6 ? "webclass" : frame < T.done ? "progress" : frame < T.home ? "done" : "home";
  const pcTabs =
    pcPage === "webclass"
      ? [{ title: "WebClass", icon: "blank" as const, active: true }, { title: "UnionFetch" }]
      : [{ title: "WebClass", icon: "blank" as const }, { title: pcPage === "home" ? "UnionFetch" : "WebClass の取り込み | UnionFetch", active: true }];

  const pc = phoneCam(frame, [
    { at: T.swap, z: 1.1, px: 215, py: 470 },
    { at: T.more - 20, z: 1.25, px: 250, py: 640 },
    { at: T.row - 10, z: 1.25, px: 250, py: 640 },
    { at: T.row + 12, z: 1.35, px: 215, py: 430 },
    { at: T.mHome, z: 1.35, px: 215, py: 430 },
    { at: T.mHome + 20, z: 1.05, px: 215, py: 466 },
  ]);
  const taps = [
    { at: T.more, p: SAFARI_MORE },
    { at: T.books, p: menuAt("ブックマーク") },
    { at: T.row, p: bookmarkRow(1) },
  ];
  const f = tween(frame, [
    { at: T.swap + 10, x: 330, y: 780 },
    ...taps.flatMap((t) => [
      { at: t.at - 8, x: t.p.x, y: t.p.y },
      { at: t.at + 4, x: t.p.x, y: t.p.y },
    ]),
  ]);
  const fp = projectPhone(pc, f.x, f.y);
  const phonePage = frame < T.row + 6 ? "webclass" : frame < T.mDone ? "progress" : frame < T.mHome ? "done" : "home";

  return (
    <GuideStage
      chip="次からは"
      chipColor={"#2f6bff"}
      steps={[
        { at: 0, title: "WebClass を開いて、\nブックマークを押す", body: "WebClass にログインした状態で\n「WebClass を取り込む」を押します。" },
        { at: T.done - 10, title: "自動で取り込まれます", body: "数秒でホームに戻ります。" },
        { at: T.home, title: "取り込んだ課題が\nホームに並びます", body: "締切が変わったら、\nもう一度押せば更新されます。" },
        { at: T.swap, title: "スマホは「…」→\n「ブックマーク」から", body: "WebClass を開いたまま、\n「WebClass を取り込む」を押します。" },
      ]}
    >
      {pcOn > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(cam), opacity: pcOn * ease(frame, 0, 12) }}>
          <Browser tabs={pcTabs} url={pcPage === "webclass" ? <MaskedWebClassUrl /> : pcPage === "home" ? "unionfetch.com" : "unionfetch.com/import"} bar bookmarks={[{ label: NAME }]}>
            {pcPage === "webclass" && <WebClassPC />}
            {pcPage === "progress" && <ImportProgress width={W} height={H} progress={interpolate(frame, T.progress, [4, 100], clamp)} />}
            {(pcPage === "done" || pcPage === "home") && <Shot src="guide/pc-import-done.png" w={W} h={H} />}
            {pcPage === "home" && <Shot src="guide/pc-home-full.png" w={W} h={H} style={{ opacity: ease(frame, T.home, 10) }} />}
          </Browser>
        </div>
      )}
      {pcOn > 0 && (
        <>
          <Ripple {...project(cam, item.x, item.y)} t={frame - T.click} />
          <Cursor x={cp.x} y={cp.y} press={pressAt(frame, T.click)} opacity={window01(frame, 8, T.click + 18) * pcOn} />
        </>
      )}

      {phoneOn > 0 && (
        <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(pc), opacity: phoneOn }}>
          <Phone width={PHONE_W} src="guide/phone-import-done.png" screen={shots.phone.viewport.height} style={{ position: "absolute", left: PX0, top: PY0 }}>
            {phonePage === "webclass" && (
              <>
                <WebClassPhone />
                <SafariBar host="webclass.…ac.jp" />
                {frame >= T.more + 2 && frame < T.books + 6 && (
                  <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, menu * 1.4) * (1 - ease(frame, T.books + 2, 5)), transform: `scale(${0.9 + 0.1 * menu})`, transformOrigin: "90% 88%" }}>
                    <SafariMenu hover={frame > T.books - 6 ? "ブックマーク" : undefined} />
                  </div>
                )}
                {frame >= T.books + 2 && (
                  <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - sheet) * 820}px)` }}>
                    <SafariBookmarks items={[NAME]} hover={frame > T.row - 4 ? NAME : undefined} />
                  </div>
                )}
              </>
            )}
            {phonePage === "progress" && <ImportProgress width={430} height={932} progress={interpolate(frame, T.mProgress, [4, 100], clamp)} />}
            {phonePage === "home" && <Shot src="teaser/home.png" w={430} h={4389 / 3} style={{ opacity: ease(frame, T.mHome, 10) }} />}
          </Phone>
        </div>
      )}
      {phoneOn > 0 && (
        <>
          {taps.map((t) => (
            <Ripple key={t.at} {...projectPhone(pc, t.p.x, t.p.y)} t={frame - t.at} />
          ))}
          <Finger x={fp.x} y={fp.y} press={Math.max(...taps.map((t) => pressAt(frame, t.at)))} opacity={window01(frame, T.swap + 12, T.row + 16)} />
        </>
      )}

      <Sfx at={T.click} name="click" volume={0.55} />
      <Sfx at={T.done + 2} name="success" volume={0.35} />
      {taps.map((t) => (
        <Sfx key={t.at} at={t.at} name="click" volume={0.45} />
      ))}
      <Sfx at={T.mDone + 2} name="success" volume={0.35} />
    </GuideStage>
  );
}
