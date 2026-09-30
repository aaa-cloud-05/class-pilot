import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Sfx } from "../../parts/Sfx";
import { SourceTag } from "../../parts/SourceTag";
import { C, FLOAT, jakarta } from "../../theme";
import { Caption, clamp, ease, Rise, Stage, useLayout } from "../stage";

/**
 * 課題（scripts/demo-seed.mjs のデモデータと同じもの）。src はどちらから来たか、
 * from は散らばっているときの位置（WebClass は左の窓、Classroom は右の窓）、order は締切順
 */
const TASKS = [
  { title: "レポート2 ソートアルゴリズムの比較", course: "アルゴリズムとデータ構造", due: "今日 19:59", left: "あと1時間", soon: true, src: "webclass", from: [30, 120, -4], order: 0 },
  { title: "ER 図の作成レポート", course: "データベース", due: "明日 15:30", left: "あと20時間", soon: true, src: "webclass", from: [48, 300, 2], order: 2 },
  { title: "演習問題6（対角化）", course: "線形代数学 II", due: "10/1 18:00", left: "あと2日", soon: false, src: "webclass", from: [26, 482, -1.5], order: 5 },
  { title: "課題7 連結リストの実装", course: "プログラミング演習", due: "今日 23:30", left: "あと4時間", soon: true, src: "classroom", from: [502, 160, 3], order: 1 },
  { title: "Unit 5 Speaking Log", course: "英語コミュニケーション", due: "明日 23:30", left: "あと1日", soon: false, src: "classroom", from: [512, 342, -2.5], order: 3 },
  { title: "課題3 パケットキャプチャ", course: "コンピュータネットワーク", due: "10/1 17:00", left: "あと2日", soon: false, src: "classroom", from: [498, 524, 1.5], order: 4 },
] as const;

export const SCATTER_FRAMES = 160;
const CARD_W = 430;
const MERGE = 72; // この フレームから1列に集まる

function TaskCard({ t }: { t: (typeof TASKS)[number] }) {
  return (
    <div style={{ position: "relative", width: CARD_W, padding: "18px 22px", borderRadius: 18, background: C.card, boxShadow: FLOAT }}>
      {/* どちらから来たかの札。1列に並んでも混ざっているのが分かるよう、カードの角に付けたまま動かす */}
      <SourceTag source={t.src} size={14} style={{ position: "absolute", right: 14, top: -13, boxShadow: "0 0 0 3px #fff" }} />
      <div style={{ fontSize: 21, fontWeight: 700, color: C.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
      <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 17, fontWeight: 500, color: C.sub, whiteSpace: "nowrap" }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{t.course}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{t.due}</span>
        <span style={{ fontWeight: 700, color: t.soon ? C.warn : C.faint }}>{t.left}</span>
      </div>
    </div>
  );
}

/** ブラウザの窓。サービス名は文字だけで書く（他社のロゴは使わない） */
function Window({ name, x, y, rot }: { name: string; x: number; y: number; rot: number }) {
  const frame = useCurrentFrame();
  const inP = ease(frame, 0, 14);
  const out = ease(frame, MERGE + 6, 18);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 450,
        height: 640,
        borderRadius: 24,
        background: "#f1f2f4",
        boxShadow: "0 0 0 1px rgba(12,13,14,0.07)",
        opacity: inP * (1 - out),
        transform: `translateY(${(1 - inP) * 30}px) rotate(${rot}deg) scale(${1 - out * 0.06})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 56, padding: "0 20px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: "#d6d8dc" }} />
        ))}
        <span
          style={{
            marginLeft: 12,
            padding: "5px 16px",
            borderRadius: 99,
            background: "#fff",
            fontSize: 19,
            fontWeight: 700,
            color: C.sub,
            boxShadow: "0 0 0 1px rgba(12,13,14,0.06)",
          }}
        >
          {name}
        </span>
      </div>
      {/* 中身はスケルトン（実際の画面・名前は映さない） */}
      <div style={{ padding: "8px 26px" }}>
        {SKELETON.map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 58, borderTop: i ? "1px solid rgba(12,13,14,0.05)" : undefined }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "#e2e4e7" }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", width: `${w}%`, height: 12, borderRadius: 6, background: "#e2e4e7" }} />
              <span style={{ display: "block", marginTop: 8, width: `${w * 0.55}%`, height: 10, borderRadius: 5, background: "#e9ebed" }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SKELETON = [78, 62, 90, 55, 70, 84, 60, 74, 66];

/**
 * 5–10秒: 課題が WebClass と Classroom の窓に散らばっている → 締切順の1列に集まる → キャッチコピー。
 * 見出しは「UnionFetch なら、WebClass と Classroom をまとめて取り込み。」→ 集まったらキャッチコピーに入れ替わる
 * （UnionFetch のロゴと名前はそのまま残す）。
 */
export function Scatter() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { wide } = useLayout();
  const firstOut = ease(frame, MERGE - 8, 12);

  const caption = (
    <div>
      {/* ロゴと名前は場面のあいだ出したまま。「なら、」だけ、集まったら消す */}
      <Rise at={2}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: wide ? "flex-start" : "center", gap: 14, marginTop: wide ? 0 : -14 }}>
          <Img src={staticFile("mark.png")} style={{ width: 54, height: 54 }} />
          <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 48, letterSpacing: "-0.02em", color: C.fg }}>UnionFetch</span>
          <span style={{ fontSize: 46, fontWeight: 800, color: C.fg, opacity: 1 - firstOut }}>なら、</span>
        </div>
      </Rise>
      <div style={{ position: "relative", marginTop: 10 }}>
        <div style={{ opacity: 1 - firstOut }}>
          <Caption lines={["WebClass と Classroom を、", "まとめて取り込み。"]} wideLines={["WebClass と", "Classroom を、", "まとめて取り込み。"]} at={8} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
          <Caption lines={["課題の締切を、", "ひとつの場所で。"]} at={MERGE + 24} />
        </div>
      </div>
    </div>
  );

  return (
    <Stage caption={caption}>
      <Window name="WebClass" x={14} y={28} rot={-2.5} />
      <Window name="Google Classroom" x={496} y={64} rot={2} />
      {TASKS.map((t, i) => {
        const pop = spring({ frame: frame - (14 + [0, 3, 5, 1, 4, 2][i] * 5), fps, config: { damping: 14, mass: 0.7 } });
        const m = spring({ frame: frame - (MERGE + t.order * 3), fps, config: { damping: 17, mass: 0.85 } });
        const [fx, fy, fr] = t.from;
        const tx = (960 - CARD_W) / 2;
        const ty = 18 + t.order * 114;
        return (
          <div
            key={t.title}
            style={{
              position: "absolute",
              left: interpolate(m, [0, 1], [fx, tx]),
              top: interpolate(m, [0, 1], [fy, ty]),
              zIndex: t.order + 1,
              opacity: interpolate(pop, [0, 0.4], [0, 1], clamp),
              transform: `rotate(${interpolate(m, [0, 1], [fr, 0])}deg) scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
            }}
          >
            <TaskCard t={t} />
          </div>
        );
      })}
      <Sfx at={MERGE} name="whoosh" volume={0.4} />
      <Sfx at={MERGE + 24} name="pop" volume={0.35} />
    </Stage>
  );
}
