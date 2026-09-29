import { loadFont as loadNoto } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

export const { fontFamily: noto } = loadNoto("normal", { weights: ["500", "700", "800"], ignoreTooManyRequestsWarning: true });
// ワードマークはアプリのヘッダーと同じ書体（src/app/layout.tsx の brandFont）
export const { fontFamily: jakarta } = loadJakarta("normal", { weights: ["700", "800"], subsets: ["latin"] });

/** アプリのライトのトークン（src/app/globals.css）と同じ色 */
export const C = {
  bg: "#fafafa",
  fg: "#0c0d0e",
  sub: "#5b6169",
  faint: "#8a9099",
  primary: "#2f6bff",
  danger: "#c8332c",
  warn: "#e3b169",
  card: "#ffffff",
  border: "#e8e9eb",
  line: "rgba(12,13,14,0.08)",
};

/** 状態の色（src/lib/status.ts の CAT_BG と同じ意味）。灰は muted-foreground の 45% */
export const CAT = {
  overdue: C.danger,
  soon: C.warn,
  open: "rgba(91,97,105,0.45)",
  done: C.primary,
} as const;

export type Cat = keyof typeof CAT;

/** 左上にアプリの青、右下に「24時間以内」の黄。OG と同じ背景 */
export const WASH =
  "radial-gradient(900px 620px at 0% 0%, rgba(47,107,255,0.11), transparent 62%), radial-gradient(760px 520px at 100% 100%, rgba(227,177,105,0.18), transparent 62%)";

/** 浮いているカードの影 */
export const FLOAT = "0 28px 56px -18px rgba(12,13,14,0.30), 0 0 0 1px rgba(12,13,14,0.06)";
