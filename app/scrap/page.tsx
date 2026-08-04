import type { Metadata } from "next";
import ScrapPlanet from "@/components/ScrapPlanet";

export const metadata: Metadata = {
  title: "SCRAP PLANET｜ワーキングプラネット",
  description:
    "宇宙ゴミを資源へ変え、自動工場と作業ロボットで荒廃した惑星を再生するアーケードアイドルゲーム。",
};

export default function ScrapPage() {
  return <ScrapPlanet />;
}
