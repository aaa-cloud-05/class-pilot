import type { Metadata } from "next";
import { SettingsFrame } from "./settings-frame";

// 子ページがタイトルを持たないとき（/settings）はこれが使われる
// 文字列で書くと子ページにルートの「| UnionFetch」が付かなくなるので、template も持たせる
export const metadata: Metadata = { title: { default: "設定", template: "%s | UnionFetch" } };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
