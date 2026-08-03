import type { NextConfig } from "next";

/**
 * ログインの受け口を、このサイトと同じドメインに置く。
 *
 * スマホの Safari は「別ドメインへ飛んで戻ってくる」ログインを遮るので、
 * /__/auth/ 以下を Firebase の受け口へ中継して、同じドメインのまま済ませる。
 */
const nextConfig: NextConfig = {
  /** 旧アドレスで開いた人を、公開ドメインへ送る（?stay=1 を付けたときは残る） */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "lastfire-idle.vercel.app" }],
        missing: [{ type: "query", key: "stay" }],
        destination: "https://working-planet.hitobito.jp/:path*",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://working-planet.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
