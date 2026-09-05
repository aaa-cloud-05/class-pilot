import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { getAppUrl } from "@/lib/server/app-url";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const APP_URL = getAppUrl();
const DESCRIPTION =
  "Google Classroom と WebClass の課題を1か所にまとめ、締切前にメールとブラウザ通知でお知らせします。";

export const metadata: Metadata = {
  // 相対パスの OG 画像などを絶対URLに解決するための基準。未設定だとビルドが警告を出し、
  // LINE や X で共有したときにサムネイルが出ない。
  metadataBase: new URL(APP_URL),
  title: {
    default: "UnionFetch — 課題を、見逃さない。",
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
    title: "UnionFetch — 課題を、見逃さない。",
    description: DESCRIPTION,
    url: "/",
    locale: "ja_JP",
    // TODO: 1200x630 の OG 画像を用意したら /og.png に差し替える（デザイン改修の一部）
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "UnionFetch" }],
  },
  twitter: {
    card: "summary",
    title: "UnionFetch — 課題を、見逃さない。",
    description: DESCRIPTION,
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
      className={`light h-full antialiased ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ServiceWorkerRegistrar />
        <NotificationScheduler />
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
