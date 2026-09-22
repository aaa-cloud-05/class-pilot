import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 旧 URL を新しい画面に送る
  async redirects() {
    return [
      // 旧 URL。ブックマークや外からのリンクのために残す
      { source: "/docs", destination: "/settings/help", permanent: false },
      { source: "/docs/screen", destination: "/settings/help/screen", permanent: false },
      { source: "/docs/sync", destination: "/settings/help/sync", permanent: false },
      { source: "/docs/help", destination: "/settings/help/safety", permanent: false },
      { source: "/docs/webclass", destination: "/settings/setup", permanent: false },
      { source: "/me", destination: "/settings", permanent: false },
      { source: "/new", destination: "/", permanent: false },
    ]
  },

  allowedDevOrigins: ['192.168.10.11'],
};

export default nextConfig;
