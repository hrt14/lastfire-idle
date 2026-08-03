import type { NextConfig } from "next";

/**
 * ログインの受け口を、このサイトと同じドメインに置く。
 *
 * スマホの Safari は「別ドメインへ飛んで戻ってくる」ログインを遮るので、
 * /__/auth/ 以下を Firebase の受け口へ中継して、同じドメインのまま済ませる。
 */
const nextConfig: NextConfig = {
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
