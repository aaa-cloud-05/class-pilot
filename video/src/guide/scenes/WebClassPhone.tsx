import { useCurrentFrame } from "remotion";
import { Phone } from "../../parts/Phone";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Ripple } from "../../teaser/camera";
import { ease } from "../../teaser/stage";
import { GuideStage, typed } from "../GuideStage";
import { Finger, phoneCam, PHONE_W, pressAt, projectPhone, PX0, PY0, Shot, tween, usePop, window01 } from "../helpers";
import shots from "../shots.json";
import { AddedToast, bookmarkRow, EDIT_SCREEN, menuAt, PASTE, SAFARI_MORE, SafariBar, SafariBookmarks, SafariEditScreen, SafariMenu, SHEET_EDIT } from "../ui/safari";
import { CODE } from "./WebClassPC";

export const WEBCLASS_PHONE_FRAMES = 650;

const OLD = "セットアップ | UnionFetch";
const NEW = "WebClass を取り込む";
const copy = { x: shots.phone.copyButton.x + shots.phone.copyButton.w / 2, y: shots.phone.copyButton.y + shots.phone.copyButton.h / 2 };
const T = { copy: 36, more1: 110, add: 150, more2: 226, books: 256, edit: 296, row: 322, title: 356, url: 428, clear: 446, hold: 470, paste: 506, save: 540, end: 580 };

/**
 * WebClass（iPhone の Safari）: コードをコピー →「…」→ ブックマークに追加 →「…」→ ブックマーク → 編集 → 名前と URL を変えて保存。
 * Safari の画面は簡単に描いたもの。アプリの画面だけ本物（scripts/guide-shots.mjs）
 */
export function WebClassPhone() {
  const frame = useCurrentFrame();
  const menu1 = usePop(T.more1 + 2);
  const menu2 = usePop(T.more2 + 2);
  const sheet = usePop(T.books + 2);
  const edit = usePop(T.row + 2);

  const cam = phoneCam(frame, [
    { at: 0, z: 1.05, px: 215, py: 420 },
    { at: 20, z: 1.05, px: 215, py: 420 },
    { at: 34, z: 1.3, px: 215, py: copy.y - 40 },
    { at: 80, z: 1.3, px: 215, py: copy.y - 40 },
    { at: 100, z: 1.2, px: 250, py: 640 },
    { at: 290, z: 1.2, px: 250, py: 640 },
    { at: 316, z: 1.05, px: 215, py: 440 },
    { at: 336, z: 1.05, px: 215, py: 440 },
    { at: 352, z: 1.55, px: 215, py: 210 },
    { at: T.save + 6, z: 1.55, px: 215, py: 210 },
    { at: T.save + 30, z: 1.05, px: 215, py: 440 },
  ]);
  const taps = [
    { at: T.copy, p: copy },
    { at: T.more1, p: SAFARI_MORE },
    { at: T.add, p: menuAt("ブックマークに追加") },
    { at: T.more2, p: SAFARI_MORE },
    { at: T.books, p: menuAt("ブックマーク") },
    { at: T.edit, p: SHEET_EDIT },
    { at: T.row, p: bookmarkRow(1) },
    { at: T.title, p: EDIT_SCREEN.title },
    { at: T.url, p: EDIT_SCREEN.url },
    { at: T.clear, p: EDIT_SCREEN.clear },
    { at: T.hold, p: EDIT_SCREEN.url, hold: 14 },
    { at: T.paste, p: PASTE },
    { at: T.save, p: EDIT_SCREEN.save },
  ];
  const f = tween(frame, [
    { at: 10, x: 330, y: 760 },
    ...taps.flatMap((t) => [
      { at: t.at - 8, x: t.p.x, y: t.p.y },
      { at: t.at + 4 + (t.hold ?? 0), x: t.p.x, y: t.p.y },
    ]),
  ]);
  const fp = projectPhone(cam, f.x, f.y);
  const press = Math.max(...taps.map((t) => pressAt(frame, t.at, t.hold ?? 0)));

  const editOn = frame >= T.row + 2 && frame < T.save + 6;
  const title = frame < T.title + 4 ? OLD : typed(NEW, frame, T.title + 8, 12);
  const url = frame < T.clear + 2 ? "https://unionfetch.com/settings/setup" : frame < T.paste + 2 ? "" : CODE;

  return (
    <GuideStage
      chip="WebClass ・ iPhone（Safari）"
      chipColor="#3d4a5c"
      steps={[
        { at: 0, title: "① コードをコピー", body: "設定 › セットアップ の手順2で\n「iPhone」を選び、\n「コードをコピー」を押します。" },
        { at: T.more1 - 24, title: "② ブックマークに追加", body: "下のバーの「…」→\n「ブックマークに追加」。" },
        { at: T.more2 - 16, title: "③ ブックマークを\n編集する", body: "「…」→「ブックマーク」を開き、\n右下の「編集」→ 追加した項目。" },
        { at: T.title - 16, title: "④ 名前を変えて、\nURL にコードを貼る", body: "URL は ✕ で消してから長押し →\n「ペースト」。最後に「保存」。" },
        { at: T.end, title: "これで準備は\n完了です", tip: "Android（Chrome）も同じ流れです。\n☆ で追加 → ブックマークを編集 →\nURL に貼って保存。" },
      ]}
    >
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(cam), opacity: ease(frame, 0, 12) }}>
        <Phone width={PHONE_W} src="guide/phone-setup-step2.png" screen={shots.phone.viewport.height} style={{ position: "absolute", left: PX0, top: PY0 }}>
          <Shot src="guide/phone-setup-copied.png" w={430} h={932} style={{ opacity: ease(frame, T.copy + 2, 6) * (1 - ease(frame, T.more1 - 20, 10)) }} />
          <SafariBar />
          {frame >= T.more1 + 2 && frame < T.add + 6 && (
            <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, menu1 * 1.4) * (1 - ease(frame, T.add + 2, 5)), transform: `scale(${0.9 + 0.1 * menu1})`, transformOrigin: "90% 88%" }}>
              <SafariMenu hover={frame > T.add - 6 ? "ブックマークに追加" : undefined} />
            </div>
          )}
          <div style={{ opacity: window01(frame, T.add + 6, T.add + 50) }}>
            <AddedToast />
          </div>
          {frame >= T.more2 + 2 && frame < T.books + 6 && (
            <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, menu2 * 1.4) * (1 - ease(frame, T.books + 2, 5)), transform: `scale(${0.9 + 0.1 * menu2})`, transformOrigin: "90% 88%" }}>
              <SafariMenu hover={frame > T.books - 6 ? "ブックマーク" : undefined} />
            </div>
          )}
          {frame >= T.books + 2 && frame < T.row + 14 && (
            <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - sheet) * 820}px)` }}>
              <SafariBookmarks items={[OLD]} editing={frame >= T.edit + 2} hover={frame > T.row - 4 ? OLD : undefined} />
            </div>
          )}
          {editOn && (
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - edit) * 430}px) translateY(${ease(frame, T.save + 2, 6) * 900}px)` }}>
              <SafariEditScreen title={title} url={url} focus={frame >= T.url ? "url" : frame >= T.title ? "title" : undefined} paste={frame >= T.hold + 12 && frame < T.paste + 2} />
            </div>
          )}
        </Phone>
      </div>
      {taps.map((t) => {
        const p = projectPhone(cam, t.p.x, t.p.y);
        return <Ripple key={t.at} x={p.x} y={p.y} t={frame - t.at} />;
      })}
      <Finger x={fp.x} y={fp.y} press={press} opacity={window01(frame, 10, T.save + 16)} />
      {taps.map((t) => (
        <Sfx key={t.at} at={t.at} name="click" volume={0.45} />
      ))}
      <Sfx at={T.end + 6} name="success" volume={0.35} />
    </GuideStage>
  );
}
