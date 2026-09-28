import type { Metadata } from "next";

// 文字列で書くと子ページにルートの「| UnionFetch」が付かなくなるので、template も持たせる
export const metadata: Metadata = { title: { default: "ヘルプ", template: "%s | UnionFetch" } };

/** タイトルを付けるためだけのレイアウト（page.tsx が Client Component で metadata を書けないため） */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
