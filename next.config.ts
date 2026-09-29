import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// バージョンは package.json、コミットは Vercel がビルド時に入れる値（手元では空）。
// 画面の「バージョン」に出して、問い合わせのときにどの版かを分かるようにする
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: version,
    APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },

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
