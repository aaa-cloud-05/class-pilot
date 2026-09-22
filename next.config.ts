import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 移行の途中。まだ作っていない画面は、いまある同じ内容のページに送る（PR 7・8 で外す）
  async redirects() {
    return [
      { source: "/settings/setup", destination: "/docs/webclass", permanent: false },
      { source: "/settings/help", destination: "/docs", permanent: false },
      { source: "/settings/help/screen", destination: "/docs/screen", permanent: false },
      { source: "/settings/help/sync", destination: "/docs/sync", permanent: false },
      { source: "/settings/help/safety", destination: "/docs/help", permanent: false },
    ]
  },

  allowedDevOrigins: ['192.168.10.11'],
};

export default nextConfig;
