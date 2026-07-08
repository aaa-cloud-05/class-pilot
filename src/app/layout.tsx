import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { NotificationScheduler } from "@/components/NotificationScheduler";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Class Pilot",
  description: "課題を、見逃さない。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Class Pilot",
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
