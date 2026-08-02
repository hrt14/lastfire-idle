import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ラーメン一直線 ― 放置ラーメン屋経営",
    short_name: "ラーメン一直線",
    description:
      "丼を運び、お客をさばき、店員を雇って店を広げるアーケードアイドル系の放置経営ゲーム。",
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
