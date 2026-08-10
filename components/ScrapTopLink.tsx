"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { scrapProgress } from "@/lib/shopStore";

export default function ScrapTopLink() {
  const pathname = usePathname();
  const [target, setTarget] = useState<Element | null>(null);
  const [progress, setProgress] = useState({ started: false, areas: 1, totalAreas: 9, money: 0, served: 0 });

  useEffect(() => {
    const removeInjected = () => {
      document.querySelectorAll("[data-scrap-injected]").forEach((node) => node.remove());
      setTarget(null);
    };

    if (pathname !== "/") {
      removeInjected();
      return;
    }

    const sync = () => {
      // / のままトップ→ゲーム画面へ切り替わるため、pathname だけでは判定できない。
      // トップ画面が消えたら、React の外側に差し込んだ SCRAP カードも必ず除去する。
      const top = document.querySelector("main.top");
      if (!top) {
        removeInjected();
        return;
      }

      let list = top.querySelector("[data-scrap-series]");
      if (!list) {
        const headings = Array.from(top.querySelectorAll(".series-head"));
        const working = headings.find((node) => node.textContent?.includes("ワーキングプラネット"));
        if (!working?.parentElement) return;

        const head = document.createElement("h2");
        head.className = "series-head";
        head.setAttribute("data-scrap-injected", "true");
        head.innerHTML = '<span aria-hidden="true">♻️</span> SCRAP PLANET';

        list = document.createElement("ul");
        list.className = "stages";
        list.setAttribute("data-scrap-series", "true");
        list.setAttribute("data-scrap-injected", "true");

        working.parentElement.insertBefore(head, working);
        working.parentElement.insertBefore(list, working);
      }

      setProgress(scrapProgress());
      setTarget(list);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      removeInjected();
    };
  }, [pathname]);

  if (pathname !== "/" || !target || !target.isConnected) return null;

  return createPortal(
    <li className="stage-card stage-scrap">
      <div className="stage-art" aria-hidden>🏭</div>
      <div className="stage-body">
        <strong>SCRAP PLANET｜スクラッププラネット</strong>
        <p>大河の文明エンジンをベースに、廃棄惑星をゼロから再生</p>
        <span className="stage-progress">
          {progress.started ? `区画 ${progress.areas}/${progress.totalAreas}` : "新規リビルド版"}
        </span>
      </div>
      <a className="stage-go" href="/scrap">{progress.started ? "つづき" : "はじめる"}</a>
    </li>,
    target,
  );
}
