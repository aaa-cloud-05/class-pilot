import { useCurrentFrame } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { camStyle, Cursor, Ripple } from "../../teaser/camera";
import { ease } from "../../teaser/stage";
import { GuideStage } from "../GuideStage";
import { browserCam, Crop, FIT, pressAt, project, Shot, tween, window01 } from "../helpers";
import shots from "../shots.json";
import { Browser, pageTop } from "../ui/chrome";
import { GOOGLE_NEXT, GOOGLE_SELECT_ALL, GoogleScopes, GoogleSignIn } from "../ui/pages";

export const CLASSROOM_FRAMES = 480;

const TOP = pageTop(false);
const W = 1440;
const H = 900;
const mid = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 + TOP });

// 押すタイミング（フレーム）
const T = { setup: 50, google: 110, next1: 188, all: 246, next2: 296, reveal: 312 };
const P = {
  setup: mid(shots.pc.openSetup),
  google: mid(shots.pc.googleButton),
  next: { x: GOOGLE_NEXT.x, y: GOOGLE_NEXT.y + TOP },
  all: { x: GOOGLE_SELECT_ALL.x, y: GOOGLE_SELECT_ALL.y + TOP },
};
const BH = TOP + H;

/**
 * Classroom: Google でログインするだけ。ホーム → セットアップ → Google の許可（簡単に描いたもの）→ 課題が入る。
 * 課題が入る様子は作りもの（ログイン後のホームを、カードごとに出して見せる）
 */
export function Classroom() {
  const frame = useCurrentFrame();
  const cam = browserCam(frame, [
    { at: 0, z: FIT, px: W / 2, py: BH / 2 },
    { at: 26, z: FIT, px: W / 2, py: BH / 2 },
    { at: 44, z: 1.2, px: P.setup.x - 120, py: P.setup.y + 120 },
    { at: 62, z: 1.2, px: P.setup.x - 120, py: P.setup.y + 120 },
    { at: 90, z: 1.15, px: P.google.x + 160, py: P.google.y - 160 },
    { at: 120, z: 1.15, px: P.google.x + 160, py: P.google.y - 160 },
    { at: 140, z: 0.95, px: W / 2, py: BH / 2 + 20 },
    { at: 200, z: 0.95, px: W / 2, py: BH / 2 + 20 },
    { at: 222, z: 1.12, px: 800, py: 470 },
    { at: 300, z: 1.12, px: 800, py: 470 },
    { at: 322, z: FIT, px: W / 2, py: BH / 2 },
  ]);
  const cur = [
    { at: 20, x: 900, y: 700 },
    { at: T.setup - 6, x: P.setup.x, y: P.setup.y },
    { at: T.setup + 10, x: P.setup.x, y: P.setup.y },
    { at: T.google - 6, x: P.google.x, y: P.google.y },
    { at: T.google + 20, x: P.google.x, y: P.google.y },
    { at: T.next1 - 6, x: P.next.x, y: P.next.y },
    { at: T.next1 + 14, x: P.next.x, y: P.next.y },
    { at: T.all - 6, x: P.all.x, y: P.all.y },
    { at: T.all + 10, x: P.all.x, y: P.all.y },
    { at: T.next2 - 6, x: P.next.x, y: P.next.y },
  ];
  const c = tween(frame, cur);
  const cp = project(cam, c.x, c.y);
  const clicks = [T.setup, T.google, T.next1, T.all, T.next2];
  const press = Math.max(...clicks.map((c) => pressAt(frame, c)));
  const clickPos = [P.setup, P.google, P.next, P.all, P.next];

  const page = frame < T.setup + 4 ? "home" : frame < T.google + 6 ? "setup" : frame < T.next1 + 6 ? "g1" : frame < T.next2 + 6 ? "g2" : "done";
  const url = page === "home" || page === "done" ? "unionfetch.com" : page === "setup" ? "unionfetch.com/settings/setup" : "accounts.google.com/signin/oauth";
  const title = page === "g1" || page === "g2" ? "ログイン - Google アカウント" : page === "setup" ? "セットアップ | UnionFetch" : "UnionFetch — 課題の締切を、ひとつの場所で。";

  return (
    <GuideStage
      chip="Classroom"
      steps={[
        { at: 0, title: "① セットアップを開く", body: "ホームの「セットアップを開く」か、\n設定 › セットアップ から。" },
        { at: T.google - 14, title: "② 「Google で\nログイン」を押す" },
        { at: T.next1 - 10, title: "③ Classroom の\n読み取りを許可する", body: "「すべて選択」にチェックして\n「次へ」を押します。\n課題を読むだけで、書き込みはしません。" },
        { at: T.reveal - 6, title: "これで Classroom は\n完了です", body: "2回目からは、何もしなくて大丈夫。\n開くたびに自動で更新されます。\nスマホでも同じ手順です。" },
      ]}
    >
      <div style={{ position: "absolute", left: 0, top: 0, ...camStyle(cam), opacity: ease(frame, 0, 12) }}>
        <Browser tabs={[{ title, active: true }]} url={url}>
          {page === "home" && <Shot src="guide/pc-home-empty.png" w={W} h={H} />}
          {page === "setup" && <Shot src="guide/pc-setup-top.png" w={W} h={H} />}
          {page === "g1" && <GoogleSignIn />}
          {page === "g2" && <GoogleScopes checked={frame >= T.all + 2} />}
          {page === "done" && (
            <>
              <Shot src="guide/pc-home-empty.png" w={W} h={H} />
              {/* 「課題はまだありません」を消してから、ログイン後のカードを上から順に出す */}
              <div style={{ position: "absolute", left: shots.pc.emptyCard.x - 8, top: 0, width: 1440 - shots.pc.emptyCard.x, height: H, background: "#fafafa", opacity: ease(frame, T.reveal - 8, 8) }} />
              {shots.pc.cards.map((r, k) => {
                const p = ease(frame, T.reveal + k * 7, 14);
                return <Crop key={k} src="guide/pc-home-full.png" w={W} h={H} rect={r} style={{ opacity: p, transform: `translateY(${(1 - p) * 18}px)` }} />;
              })}
              {/* ログインしたアカウント（名前は伏せる） */}
              <div style={{ position: "absolute", left: shots.pc.account.x, top: shots.pc.account.y + shots.pc.account.h - 52, width: shots.pc.account.w, height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", background: "#fafafa", opacity: ease(frame, T.reveal, 10) }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, background: "#c7d2fe" }} />
                <span>
                  <span style={{ display: "block", width: 110, height: 10, borderRadius: 5, background: "#d6d8dc" }} />
                  <span style={{ display: "block", width: 150, height: 8, marginTop: 6, borderRadius: 4, background: "#e4e6e9" }} />
                </span>
              </div>
            </>
          )}
        </Browser>
      </div>
      {clicks.map((c, k) => {
        const p = project(cam, clickPos[k].x, clickPos[k].y);
        return <Ripple key={c} x={p.x} y={p.y} t={frame - c} />;
      })}
      <Cursor x={cp.x} y={cp.y} press={press} opacity={window01(frame, 18, T.reveal + 4)} />
      {clicks.map((c) => (
        <Sfx key={c} at={c} name="click" volume={0.55} />
      ))}
      <Sfx at={T.reveal + 8} name="success" volume={0.35} />
    </GuideStage>
  );
}
