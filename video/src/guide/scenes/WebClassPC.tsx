import { useCurrentFrame } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, Ripple } from "../../teaser/camera";
import { ease } from "../../teaser/stage";
import { GuideStage } from "../GuideStage";
import { browserCam, FIT, Keys, pressAt, project, Shot, tween, usePop, window01 } from "../helpers";
import shots from "../shots.json";
import { barItemCenter, Browser, ContextMenu, EDIT, EditDialog, menuItemAt, pageTop, STAR, STAR_POPUP_DONE, StarPopup, TAB_H, TOOL_H } from "../ui/chrome";

export const WEBCLASS_PC_FRAMES = 580;

const TOP = pageTop(true);
const W = 1440;
const H = 900;
const BH = TOP + H;
const OLD = "セットアップ | UnionFetch";
export const CODE = "javascript:(()=>{const u='https://unionfetch.com/import#';fetch('/webclass/…";

const T = { copy: 40, star: 130, done: 196, right: 282, edit: 326, url: 364, paste: 394, save: 446, end: 486 };
const copy = { x: shots.pc.copyButton.x + shots.pc.copyButton.w / 2, y: shots.pc.copyButton.y + shots.pc.copyButton.h / 2 + TOP };
const popup = { x: STAR.x + 22 - 380, y: TAB_H + TOOL_H + 6 };
const doneBtn = { x: popup.x + STAR_POPUP_DONE.x, y: popup.y + STAR_POPUP_DONE.y };

/**
 * WebClass（PC の Chrome）: コードをコピー → ☆ でブックマーク → 右クリック「編集」→ 名前と URL を変えて保存。
 * ブラウザの画面は簡単に描いたもの。アプリの画面だけ本物（scripts/guide-shots.mjs）
 */
export function WebClassPC() {
  const frame = useCurrentFrame();
  const item = barItemCenter([OLD], 0);
  const menuAt = { x: item.x - 20, y: item.y + 14 };
  const editItem = { x: menuAt.x + menuItemAt("編集...").x, y: menuAt.y + menuItemAt("編集...").y };
  const starPop = usePop(T.star + 2);
  const menuPop = usePop(T.right + 2);
  const dialogPop = usePop(T.edit + 4);

  const cam = browserCam(frame, [
    { at: 0, z: FIT, px: W / 2, py: BH / 2 },
    { at: 16, z: FIT, px: W / 2, py: BH / 2 },
    { at: 34, z: 1.25, px: copy.x + 200, py: copy.y - 60 },
    { at: 84, z: 1.25, px: copy.x + 200, py: copy.y - 60 },
    { at: 116, z: 1.45, px: STAR.x - 180, py: 260 },
    { at: 214, z: 1.45, px: STAR.x - 180, py: 260 },
    { at: 250, z: 1.5, px: 330, py: 200 },
    { at: T.edit + 4, z: 1.5, px: 330, py: 200 },
    { at: T.edit + 24, z: 1.3, px: W / 2, py: 330 },
    { at: T.save + 10, z: 1.3, px: W / 2, py: 330 },
    { at: T.save + 34, z: 1.6, px: 330, py: 160 },
  ]);
  const cur = tween(frame, [
    { at: 12, x: 1000, y: 800 },
    { at: T.copy - 6, x: copy.x, y: copy.y },
    { at: T.copy + 30, x: copy.x, y: copy.y },
    { at: T.star - 6, x: STAR.x, y: STAR.y },
    { at: T.star + 20, x: STAR.x, y: STAR.y },
    { at: T.done - 6, x: doneBtn.x, y: doneBtn.y },
    { at: T.done + 30, x: doneBtn.x, y: doneBtn.y },
    { at: T.right - 6, x: item.x, y: item.y },
    { at: T.right + 12, x: item.x, y: item.y },
    { at: T.edit - 6, x: editItem.x, y: editItem.y },
    { at: T.edit + 20, x: editItem.x, y: editItem.y },
    { at: T.url - 6, x: EDIT.url.x, y: EDIT.url.y },
    { at: T.save - 20, x: EDIT.url.x, y: EDIT.url.y },
    { at: T.save - 6, x: EDIT.save.x, y: EDIT.save.y },
  ]);
  const cp = project(cam, cur.x, cur.y);
  const clicks = [
    { at: T.copy, p: copy },
    { at: T.star, p: STAR },
    { at: T.done, p: doneBtn },
    { at: T.right, p: item },
    { at: T.edit, p: editItem },
    { at: T.url, p: EDIT.url },
    { at: T.save, p: EDIT.save },
  ];
  const press = Math.max(...clicks.map((c) => pressAt(frame, c.at)));
  const dialogOn = frame >= T.edit + 4 && frame < T.save + 4;
  const url = frame < T.paste ? "https://unionfetch.com/settings/setup" : CODE;
  // キー操作の札はダイアログの右の外に出す
  const keyBadge = project(cam, (1440 + 540) / 2 + 24, EDIT.url.y - 24);
  const ring = project(cam, item.x - item.w / 2 - 6, item.y - 16);

  return (
    <GuideStage
      chip="WebClass ・ はじめの1回（PC）"
      chipColor="#3d4a5c"
      steps={[
        { at: 0, title: "① コードをコピー", body: "設定 › セットアップ の手順2で\n「コードをコピー」を押します。" },
        { at: T.star - 30, title: "② このページを\nブックマークする", body: "アドレスバーの ☆ を押して「完了」。\n（Ctrl + D でも同じです）", tip: "ブックマークバーは\nCtrl + Shift + B で表示できます。\n出しておくと、押すのが楽です。" },
        { at: T.right - 24, title: "③ ブックマークを\n右クリック →「編集」" },
        { at: T.url - 30, title: "④ URL にコードを貼る", body: "URL を全部消して、Ctrl + V で貼り、\n「保存」を押します。\n名前は変えなくて大丈夫です。" },
        { at: T.end, title: "これで WebClass の\n準備は完了です", body: "ここまでは、はじめの1回だけです。" },
      ]}
    >
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(cam), opacity: ease(frame, 0, 12) }}>
        <div style={{ position: "relative" }}>
          <Browser tabs={[{ title: OLD, active: true }]} url="unionfetch.com/settings/setup" bar bookmarks={frame >= T.done + 8 ? [{ label: OLD }] : []} starred={frame >= T.star + 2}>
            <Shot src="guide/pc-setup-step2.png" w={W} h={H} />
            <Shot src="guide/pc-setup-copied.png" w={W} h={H} style={{ opacity: ease(frame, T.copy + 2, 6) }} />
            {dialogOn && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.32)", opacity: Math.min(1, dialogPop) }} />}
          </Browser>
          {frame >= T.star + 2 && frame < T.done + 10 && (
            <StarPopup name={OLD} style={{ left: popup.x, top: popup.y, opacity: Math.min(1, starPop * 1.5) * (1 - ease(frame, T.done + 2, 8)), transform: `scale(${0.94 + 0.06 * starPop})`, transformOrigin: "100% 0" }} />
          )}
          {frame >= T.right + 2 && frame < T.edit + 4 && <ContextMenu hover={frame > T.edit - 8 ? "編集..." : undefined} style={{ left: menuAt.x, top: menuAt.y, opacity: Math.min(1, menuPop * 1.5), transform: `scale(${0.95 + 0.05 * menuPop})`, transformOrigin: "0 0" }} />}
          {dialogOn && (
            <div style={{ position: "absolute", left: 0, top: 0, width: W, opacity: Math.min(1, dialogPop * 1.4), transform: `scale(${0.96 + 0.04 * dialogPop})`, transformOrigin: "50% 30%" }}>
              <EditDialog name={OLD} url={url} focus={frame >= T.url ? "url" : undefined} urlSelected={frame >= T.url + 4 && frame < T.paste} />
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: ring.x,
          top: ring.y,
          width: (item.w + 12) * cam.z,
          height: 32 * cam.z,
          borderRadius: 999,
          border: "3px solid #2f6bff",
          boxShadow: "0 0 0 8px rgba(47,107,255,0.15)",
          opacity: ease(frame, T.end + 10, 10),
        }}
      />
      <Keys keys={["Ctrl", "A"]} x={keyBadge.x} y={keyBadge.y} opacity={window01(frame, T.url + 4, T.paste)} />
      <Keys keys={["Ctrl", "V"]} x={keyBadge.x} y={keyBadge.y} opacity={window01(frame, T.paste, T.paste + 34)} />
      {clicks.map((c) => {
        const p = project(cam, c.p.x, c.p.y);
        return <Ripple key={c.at} x={p.x} y={p.y} t={frame - c.at} />;
      })}
      <Cursor x={cp.x} y={cp.y} press={press} opacity={window01(frame, 10, T.save + 16)} />
      {clicks.map((c) => (
        <Sfx key={c.at} at={c.at} name="click" volume={0.55} />
      ))}
      <Sfx at={T.end + 6} name="success" volume={0.35} />
    </GuideStage>
  );
}
