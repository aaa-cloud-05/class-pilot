import type { Metadata } from "next";

export const metadata: Metadata = { title: "安全性とよくある質問" };

/** タイトルを付けるためだけのレイアウト（page.tsx が Client Component で metadata を書けないため） */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
