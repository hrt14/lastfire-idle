import type { MetadataRoute } from "next";

// Progression watchdog is part of the shared gameplay engine; keep this source
// change so production deploys include the latest engine commit.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ワーキングプラネット ― 働いて大きくする放置ゲーム",
    short_name: "ワーキングプラネット",
    description:
      "働いて街と星を大きくしていく放置ゲームのシリーズ。",
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
