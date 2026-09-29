import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { VercelAnalytics } from "@/components/VercelAnalytics";
import { AppProvider } from "@/components/app/provider";
import { AppShell } from "@/components/app/shell";
import { getAppUrl } from "@/lib/server/app-url";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// ヘッダーのワードマーク専用（OG 画像のロゴ書体に寄せる）。本文には使わないので太さは1つだけ読む。
const brandFont = Plus_Jakarta_Sans({ subsets: ["latin"], weight: "700", variable: "--font-jakarta" });

const APP_URL = getAppUrl();
// LINE・X・Slack などで共有したとき、OG 画像と一緒に出るタイトルと説明文。売りは /login の3点に揃える
const TITLE = "UnionFetch — 課題の締切を、ひとつの場所で。";
const DESCRIPTION =
  "WebClass と Google Classroom の課題を、締切順にひとつのリストへ。通知機能のない WebClass の課題も、締切の前にメールでお知らせします。1週間の忙しさもひと目で。";

export const metadata: Metadata = {
  // 相対パスの OG 画像などを絶対URLに解決するための基準。未設定だとビルドが警告を出し、
  // LINE や X で共有したときにサムネイルが出ない。
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: "%s | UnionFetch",
  },
  description: DESCRIPTION,
  manifest: "/manifest.json",
  applicationName: "UnionFetch",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UnionFetch",
  },
  openGraph: {
    type: "website",
    siteName: "UnionFetch",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "ja_JP",
    // 画像は video/（Remotion）で作る。差し替えたら ?v= を上げる（LINE・X が古い画像をキャッシュするため）
    images: [{ url: "/og.png?v=2", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png?v=2"],
  },
};

export const viewport: Viewport = {
  themeColor: "#007AFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`h-full antialiased ${geistSans.variable} ${geistMono.variable} ${brandFont.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ServiceWorkerRegistrar />
        <NotificationScheduler />
        <VercelAnalytics />
        <SessionProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
