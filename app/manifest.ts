import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ラストファイア ― 雪原拠点経営",
    short_name: "ラストファイア",
    description:
      "焚き火をかき立て、資源を集め、雪原の拠点を大きくしていく放置系の経営シミュレーションゲーム。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070d18",
    theme_color: "#070d18",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
