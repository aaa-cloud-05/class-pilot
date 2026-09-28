import type { Metadata } from "next";

export const metadata: Metadata = { title: "通知の設定" };

/** タイトルを付けるためだけのレイアウト（page.tsx が Client Component で metadata を書けないため） */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
