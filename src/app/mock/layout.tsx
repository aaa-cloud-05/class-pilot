import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { IBM_Plex_Sans_JP, LINE_Seed_JP, Noto_Sans_JP, Plus_Jakarta_Sans } from "next/font/google"
import { MockPanel } from "./_components/mock-panel"
import { MockProvider } from "./_components/provider"

// 和文フォントは容量が大きいので先読みしない（使うときにだけ必要な文字の分が読まれる）
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-m-jakarta" })
const noto = Noto_Sans_JP({ preload: false, variable: "--font-m-noto" })
const line = LINE_Seed_JP({ preload: false, weight: ["400", "700", "800"], variable: "--font-m-line" })
const plex = IBM_Plex_Sans_JP({ preload: false, weight: ["400", "500", "600", "700"], variable: "--font-m-plex" })

export const metadata: Metadata = {
  title: "UI モック",
  robots: { index: false, follow: false },
}

export default function MockLayout({ children }: { children: React.ReactNode }) {
  // モックは本番に出さない（ローカルと Vercel のプレビューでだけ見られる）
  if (process.env.VERCEL_ENV === "production") notFound()

  return (
    <MockProvider fontClassName={`${jakarta.variable} ${noto.variable} ${line.variable} ${plex.variable}`}>
      {children}
      <MockPanel />
    </MockProvider>
  )
}
