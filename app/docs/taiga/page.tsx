import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Feedback from "@/components/Feedback";
import { renderMarkdown } from "@/lib/markdown";

/** 仕様書は書き出しのときに読みこむ（できあがったページは、ただのHTML） */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "大河の文明 ― 仕様書 v0.1｜ワーキングプラネット",
  description:
    "「火のはじまり」の次のステージ「大河の文明」の仕様書 v0.1。農業・水路・土器・牧畜・船と交易・町の6区画。",
};

const source = fs.readFileSync(
  path.join(process.cwd(), "docs", "taiga-civilization.md"),
  "utf8",
);

export default function TaigaSpecPage() {
  return (
    <main className="doc">
      <Feedback where="大河の文明の仕様書" />
      <Link className="doc-back" href="/">
        ← ワーキングプラネット
      </Link>
      <article className="doc-body">{renderMarkdown(source)}</article>
      <p className="doc-foot">
        これは実装前のたたき台です。次は区画ごとの購入順・価格・生産速度を数値化します。
      </p>
    </main>
  );
}
