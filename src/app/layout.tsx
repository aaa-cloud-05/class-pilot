import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { NotificationScheduler } from "@/components/NotificationScheduler";

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
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <ServiceWorkerRegistrar />
        <NotificationScheduler />
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
