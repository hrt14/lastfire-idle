import type { Metadata } from "next";
import ScrapGame from "@/components/ScrapGame";

export const metadata: Metadata = {
  title: "SCRAP PLANET｜ワーキングプラネット",
  description: "大河の文明エンジンをそのまま使い、独立セーブで再構築したSCRAP PLANET。",
};

export default function ScrapPage() {
  return <ScrapGame />;
}
