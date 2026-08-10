"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shop, { type Sample } from "@/components/Shop";
import ScrapOverlay from "@/components/ScrapOverlay";
import {
  enterScrapSession,
  leaveScrapSession,
  resetState,
  save,
} from "@/lib/shopStore";
import { applyScrapStageTheme, restoreTaigaStageTheme } from "@/data/scrap-stage-theme";
import { formatMoney } from "@/lib/format";

export default function ScrapGame() {
  const [ready, setReady] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    applyScrapStageTheme();
    enterScrapSession();
    setReady(true);
    const persist = () => save();
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      leaveScrapSession();
      restoreTaigaStageTheme();
    };
  }, []);

  if (!ready) {
    return <main className="scrap-boot">SCRAP PLANET 起動中…</main>;
  }

  return (
    <main className="app scrap-app">
      <header className="hud scrap-hud">
        <div className="scrap-brand">
          <Link href="/" className="chip-button" aria-label="ステージ選択へ">☰</Link>
          <div>
            <strong>SCRAP PLANET</strong>
            <small>PLANET RECLAMATION / SECTOR 01</small>
          </div>
        </div>
        <div className="hud-right">
          <span className="chip" aria-label="再生ポイント">
            <i className="chip-mark" aria-hidden>⚙️</i>
            {formatMoney(sample?.money ?? 0, "")}
            <small> RP</small>
          </span>
          <button type="button" className="chip-button" onClick={() => setResetOpen(true)} aria-label="最初から">↺</button>
        </div>
      </header>

      <div className="scrap-sector-strip" aria-hidden>
        <span>SECTOR 01</span>
        <strong>廃棄平原・再生ライン</strong>
        <i>ONLINE</i>
      </div>

      <div className="scrap-world-shell">
        <Shop key="scrap-taiga-engine" onSample={setSample} paused={resetOpen} />
        <ScrapOverlay />
        <div className="scrap-scanlines" aria-hidden />
        <div className="scrap-warning-rail" aria-hidden><span /><span /><span /><span /><span /><span /></div>
      </div>

      <footer className="dock scrap-dock">
        <div className="carry">
          <span>♻️</span>
          <strong>{sample?.carry ?? 0}<small> / {sample?.maxCarry ?? 3}</small></strong>
          <small className="carry-note">回収資源</small>
        </div>
        <p className="dock-note">回収 → 選別 → 破砕 → 精製 → 搬送。廃棄惑星を再生工場へ変えていく。</p>
      </footer>

      {sample?.toast ? <div className="toast">{sample.toast}</div> : null}

      {resetOpen ? (
        <div className="modal" role="dialog" aria-modal aria-labelledby="scrap-reset-title">
          <div className="modal-card">
            <h2 id="scrap-reset-title">SCRAP PLANETを最初からやり直しますか？</h2>
            <p className="reset-note">大河の文明など、ほかのステージの記録は消えません。</p>
            <div className="modal-actions">
              <button type="button" className="ghost" autoFocus onClick={() => setResetOpen(false)}>キャンセル</button>
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  resetState();
                  setSample(null);
                  setResetOpen(false);
                  window.location.reload();
                }}
              >
                リセットする
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
