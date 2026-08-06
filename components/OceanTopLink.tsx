"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { oceanProgress } from "@/lib/oceanStore";

export default function OceanTopLink() {
  const pathname = usePathname();
  const [target, setTarget] = useState<Element | null>(null);
  const [progress, setProgress] = useState({
    started: false,
    areas: 1,
    totalAreas: 7,
    restoration: 0,
    delivered: 0,
  });

  useEffect(() => {
    if (pathname !== "/") {
      setTarget(null);
      return;
    }
    const find = () => {
      const list = document.querySelector(".stage-scrap")?.parentElement ?? null;
      setTarget(list);
      if (list) setProgress(oceanProgress());
      return !!list;
    };
    if (find()) return;
    const observer = new MutationObserver(() => {
      if (find()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname !== "/" || !target) return null;

  return createPortal(
    <li
      className="stage-card stage-ocean"
      style={{
        background:
          "linear-gradient(135deg, rgba(7, 76, 112, .96), rgba(6, 148, 162, .82))",
      }}
    >
      <div className="stage-art" aria-hidden>
        🌊
      </div>
      <div className="stage-body">
        <strong>OCEAN PLANET｜海の星</strong>
        <p>漁業・加工・船団を自動化し、海底都市まで海を再生</p>
        <span className="stage-progress">
          {progress.started
            ? `海域 ${progress.areas}/${progress.totalAreas}・海洋再生 ${progress.restoration}%`
            : "SCRAP PLANETシリーズ 第2ステージ"}
        </span>
      </div>
      <a className="stage-go" href="/ocean">
        {progress.started ? "つづき" : "はじめる"}
      </a>
    </li>,
    target,
  );
}
