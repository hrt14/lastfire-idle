import type { Metadata } from "next";
import ScrapPlanet from "@/components/ScrapPlanet";

export const metadata: Metadata = {
  title: "SCRAP PLANET｜ワーキングプラネット",
  description: "宇宙ゴミを加工し、ロボット工場を自動化する放置ゲーム。",
};

export default function ScrapPage() {
  return <ScrapPlanet />;
}
