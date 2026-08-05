import type { Metadata } from "next";
import OceanPlanet from "@/components/OceanPlanet";

export const metadata: Metadata = {
  title: "OCEAN PLANET｜ワーキングプラネット",
  description:
    "海の資源を集め、漁業・加工・船を自動化しながら、7つの海域と海底都市を再生するアーケードアイドルゲーム。",
};

export default function OceanPage() {
  return <OceanPlanet />;
}
