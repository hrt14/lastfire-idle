import type { Metadata } from "next";
import ScrapRebuild from "@/components/ScrapRebuild";

export const metadata: Metadata = {
  title: "SCRAP PLANET｜ワーキングプラネット",
  description:
    "大河の文明エンジンをベースに、回収・加工・物流・自動化で廃棄惑星を再生するSCRAP PLANET。",
};

export default function ScrapPage() {
  return <ScrapRebuild />;
}
