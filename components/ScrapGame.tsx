"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shop, { type Sample } from "@/components/Shop";
import {
  enterScrapSession,
  leaveScrapSession,
  resetState,
  save,
} from "@/lib/shopStore";
import { applyScrapStageTheme, restoreTaigaStageTheme } from "@/data/scrap-stage-theme";
import { formatMoney } from "@/lib/format";

const SCRAP_RUNTIME_VERSION = "scrap-runtime-v3";

export default function ScrapGame() {
  const [ready, setReady] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    applyScrapStageTheme();
    enterScrapSession();

    // 以前の壊れたSCRAP実装で保存された座標・進行を一度だけ破棄する。
    // 他ステージのセーブには触れない。
    if (window.localStorage.getItem(SCRAP_RUNTIME_VERSION) !== "1") {
      resetState();
      window.localStorage.setItem(SCRAP_RUNTIME_VERSION, "1");
    }

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
            <small>TAIGA ENGINE / CLEAN RUNTIME</small>
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

      <div className="scrap-world-shell">
        <Shop key="scrap-taiga-engine-clean" onSample={setSample} paused={resetOpen} />
      </div>

      <footer className="dock scrap-dock">
        <div className="carry">
          <span>♻️</span>
          <strong>{sample?.carry ?? 0}<small> / {sample?.maxCarry ?? 3}</small></strong>
          <small className="carry-note">回収資源</small>
        </div>
        <p className="dock-note">まず操作確認版。大河の文明と同じ移動・回収・運搬ロジックで動作します。</p>
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
