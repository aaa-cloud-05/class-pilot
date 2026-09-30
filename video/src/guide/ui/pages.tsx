import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, jakarta, noto } from "../../theme";

/**
 * アプリ以外のページ（Google の許可の画面・WebClass）を簡単に描いたもの。
 * 名前・メールアドレス・大学名などはスケルトン（灰色の棒）にして、ロゴは描かない。
 */
const FONT = `"Segoe UI", "Noto Sans JP", sans-serif`;
const INK = "#1f1f1f";
const MUTED = "#444746";
const Bar = ({ w, h = 12, c = "#dadce0" }: { w: number; h?: number; c?: string }) => <span style={{ display: "inline-block", width: w, height: h, borderRadius: h / 2, background: c }} />;

/** アカウント（顔写真と名前は伏せる） */
const Account = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px", borderRadius: 999, border: "1px solid #c4c7c5" }}>
    <span style={{ width: 26, height: 26, borderRadius: 99, background: "#c7d2fe" }} />
    <Bar w={170} />
    <span style={{ color: MUTED, fontSize: 12 }}>▾</span>
  </span>
);

const GoogleCard = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <div style={{ position: "absolute", inset: 0, background: "#f0f4f9", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative", width: 1040, height: 560, padding: "40px 44px", borderRadius: 28, background: "#fff", boxSizing: "border-box" }}>
      <div style={{ fontSize: 14, color: MUTED }}>Google でログイン</div>
      <div style={{ display: "flex", gap: 48, marginTop: 26 }}>
        <div style={{ width: 400 }}>{left}</div>
        <div style={{ flex: 1 }}>{right}</div>
      </div>
    </div>
  </div>
);

const GBtns = ({ primaryLabel = "次へ" }: { primaryLabel?: string }) => (
  <div style={{ position: "absolute", right: 44, bottom: 40, display: "flex", gap: 12 }}>
    <span style={{ padding: "10px 26px", borderRadius: 999, border: "1px solid #747775", color: "#0b57d0", fontSize: 15, fontWeight: 600 }}>キャンセル</span>
    <span style={{ padding: "10px 26px", borderRadius: 999, background: "#0b57d0", color: "#fff", fontSize: 15, fontWeight: 600 }}>{primaryLabel}</span>
  </div>
);
/** 「次へ」の中心（ページの座標）。カードは 1040×560 でページの真ん中 */
export const GOOGLE_NEXT = { x: 200 + 1040 - 44 - 41, y: 170 + 560 - 40 - 20 };

/** 1枚目: unionfetch.com にログイン */
export function GoogleSignIn() {
  return (
    <GoogleCard
      left={
        <>
          <div style={{ fontSize: 36, lineHeight: 1.3, color: INK }}>unionfetch.com にログイン</div>
          <div style={{ marginTop: 20 }}>
            <Account />
          </div>
        </>
      }
      right={
        <>
          <div style={{ fontSize: 17, lineHeight: 1.6, color: INK }}>
            Google は、あなたに関する以下の情報へのアクセスを <span style={{ color: "#0b57d0" }}>unionfetch.com</span> に許可します
          </div>
          {["名前とプロフィール写真", "メールアドレス"].map((l) => (
            <div key={l} style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, border: "2px solid #444746" }} />
              <span>
                <Bar w={200} />
                <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{l}</div>
              </span>
            </div>
          ))}
          <div style={{ marginTop: 24, fontSize: 13, lineHeight: 1.7, color: MUTED }}>
            unionfetch.com のプライバシー ポリシーと利用規約をご確認ください。変更は Google アカウントからいつでもできます。
          </div>
          <GBtns />
        </>
      }
    />
  );
}

/** 2枚目: アクセスできる情報を選ぶ。checked で「すべて選択」を押したあと */
export function GoogleScopes({ checked }: { checked: boolean }) {
  const Box = ({ on }: { on: boolean }) => (
    <span style={{ width: 20, height: 20, borderRadius: 4, border: on ? "none" : "2px solid #444746", background: on ? "#0b57d0" : "transparent", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {on ? "✓" : ""}
    </span>
  );
  return (
    <GoogleCard
      left={
        <>
          <div style={{ fontSize: 34, lineHeight: 1.3, color: INK }}>unionfetch.com が Google アカウントへのアクセスを求めています</div>
          <div style={{ marginTop: 20 }}>
            <Account />
          </div>
        </>
      }
      right={
        <>
          <div style={{ fontSize: 17, lineHeight: 1.6, color: INK }}>
            <span style={{ color: "#0b57d0" }}>unionfetch.com</span> がアクセスできる情報を選択してください
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20, fontSize: 15, color: INK }}>
            <Box on={checked} />
            すべて選択
          </div>
          {["Google Classroom のコースの課題と成績の表示。", "Google Classroom クラスの表示。"].map((l) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, paddingTop: 16, borderTop: "1px solid #e1e3e1", fontSize: 15, color: INK }}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: "#e1e3e1" }} />
              <span style={{ flex: 1 }}>
                {l}
                <div style={{ fontSize: 13, color: "#0b57d0", marginTop: 3 }}>アクセス権の詳細を表示</div>
              </span>
              <Box on={checked} />
            </div>
          ))}
          <GBtns />
        </>
      }
    />
  );
}
/** 2枚目の「すべて選択」のチェックの中心（ページの座標） */
export const GOOGLE_SELECT_ALL = { x: 200 + 44 + 400 + 48 + 10, y: 314 };

/** WebClass のトップ（PC）。中身はスケルトン */
export function WebClassPC() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", padding: "22px 120px 10px", gap: 16 }}>
        <span style={{ fontSize: 24, color: "#3a6ea5", textDecoration: "underline" }}>WebClass</span>
        <span style={{ flex: 1 }} />
        <Bar w={60} />
        <Bar w={80} />
        <span style={{ width: 22, height: 22, borderRadius: 4, background: "#d9c7ef" }} />
      </div>
      <div style={{ display: "flex", gap: 34, margin: "0 120px", padding: "12px 20px", background: "#f1f3f5", fontSize: 15, color: "#555" }}>
        <span>コース ▾</span>
        <span>マニュアル</span>
        <span style={{ flex: 1 }} />
        <span>ログアウト</span>
      </div>
      <div style={{ display: "flex", gap: 30, margin: "30px 120px" }}>
        <div style={{ width: 260 }}>
          <div style={{ padding: "10px 14px", background: "#f1f3f5", fontSize: 14, fontWeight: 700, color: "#333" }}>課題実施状況一覧</div>
          <div style={{ padding: "12px 14px" }}>
            <Bar w={140} c="#c9d6ea" />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ padding: "10px 14px", background: "#f1f3f5", fontSize: 14, fontWeight: 700, color: "#333" }}>お知らせ</div>
          {[300, 360, 280, 330, 250].map((w, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #eee" }}>
              <Bar w={w} c="#efc7c7" />
              <Bar w={180} />
            </div>
          ))}
          <div style={{ marginTop: 34, fontSize: 18, fontWeight: 700, color: "#333" }}>参加しているコース</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 2, marginTop: 14 }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} style={{ height: 54, background: i < 6 ? "#dbe4f0" : "#f5f6f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i >= 6 && i % 4 === 1 ? <Bar w={80} c="#c9d6ea" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** WebClass のトップ（スマホ）。中身はスケルトン。幅 430 の CSS px で描く */
export function WebClassPhone() {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 430, height: 932, background: "#fff", fontFamily: FONT }}>
      <div style={{ height: 60 }} />
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #eee" }}>
        <span style={{ fontSize: 22, color: "#3a6ea5", textDecoration: "underline" }}>WebClass</span>
        <span style={{ flex: 1 }} />
        <span style={{ width: 34, height: 28, borderRadius: 4, border: "1px solid #ccc" }} />
      </div>
      {["課題実施状況一覧", "お知らせ", "参加しているコース"].map((h, k) => (
        <div key={h} style={{ margin: "16px 14px 0" }}>
          <div style={{ padding: "8px 10px", background: "#f1f3f5", fontSize: 14, fontWeight: 700, color: "#333" }}>{h}</div>
          {Array.from({ length: k === 1 ? 5 : 2 }).map((_, i) => (
            <div key={i} style={{ padding: "10px", borderBottom: "1px solid #f0f0f0" }}>
              <Bar w={150 + ((i * 53) % 120)} c={k === 1 ? "#efc7c7" : "#c9d6ea"} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 取り込み中の画面（アプリの /import と同じ見た目）。取り込み中は一瞬で終わって撮れないので、ここで描く。
 * 幅 width の画面の真ん中にカードを置く
 */
export function ImportProgress({ progress, width, height, scale = 1 }: { progress: number; width: number; height: number; scale?: number }) {
  const k = scale;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, background: C.bg, fontFamily: noto }}>
      <div style={{ position: "absolute", left: 24 * k, top: 24 * k, display: "flex", alignItems: "center", gap: 8 * k }}>
        <Img src={staticFile("mark.png")} style={{ width: 24 * k, height: 24 * k }} />
        <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 18 * k, color: C.fg }}>UnionFetch</span>
      </div>
      <div style={{ position: "absolute", left: (width - 384 * k) / 2, top: height / 2 - 90 * k, width: 384 * k }}>
        <div style={{ padding: 24 * k, borderRadius: 14 * k, background: "#fff", boxShadow: "0 0 0 1px #e8e9eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * k }}>
            <span style={{ width: 44 * k, height: 44 * k, borderRadius: 99, background: "rgba(47,107,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={20 * k} height={20 * k} viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 16 * k, fontWeight: 700, color: C.fg }}>WebClass から取り込み中</div>
              <div style={{ marginTop: 2 * k, fontSize: 13 * k, color: C.sub }}>アカウントに保存しています</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * k, marginTop: 20 * k }}>
            <div style={{ flex: 1, height: 6 * k, borderRadius: 99, background: "#f4f5f6", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", borderRadius: 99, background: C.primary }} />
            </div>
            <span style={{ width: 40 * k, textAlign: "right", fontSize: 13 * k, color: C.sub }}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
