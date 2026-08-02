import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "はんじょうダッシュ ― お店とパークの放置ゲーム",
    short_name: "はんじょうダッシュ",
    description:
      "スワイプで動かして、お店とテーマパークを大きくしていくアーケードアイドル系の放置ゲーム。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14100d",
    theme_color: "#14100d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
