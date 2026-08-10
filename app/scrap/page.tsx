import type { Metadata } from "next";
import ScrapGame from "@/components/ScrapGame";
import "./scrap.css";
import "./scrap-world.css";

export const metadata: Metadata = {
  title: "SCRAP PLANET｜ワーキングプラネット",
  description: "廃棄物を回収・選別・加工し、止まった再生コロニーを復旧していくSCRAP PLANET。",
};

export default function ScrapPage() {
  return <ScrapGame />;
}
