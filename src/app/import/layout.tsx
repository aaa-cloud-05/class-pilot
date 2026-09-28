import type { Metadata } from "next";

export const metadata: Metadata = { title: "WebClass の取り込み" };

/** タイトルを付けるためだけのレイアウト（page.tsx が Client Component で metadata を書けないため） */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
