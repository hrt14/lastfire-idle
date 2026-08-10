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
import { formatMoney } from "@/lib/format";

export default function ScrapGame() {
  const [ready, setReady] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    enterScrapSession();
    setReady(true);
    const persist = () => save();
    window.addEventListener("pagehide", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      leaveScrapSession();
    };
  }, []);

  if (!ready) return <main className="scrap-boot">SCRAP PLANET 起動中…</main>;

  return (
    <main className="app scrap-app">
      <header className="hud scrap-hud">
        <div className="scrap-brand">
          <Link href="/" className="chip-button" aria-label="ステージ選択へ">☰</Link>
          <div>
            <strong>SCRAP PLANET</strong>
            <small>RECLAIM / SORT / RECYCLE</small>
          </div>
        </div>
        <div className="hud-right">
          <span className="chip" aria-label="再生ポイント">
            <i className="chip-mark" aria-hidden>⚙</i>
            {formatMoney(sample?.money ?? 0, "")}
            <small>RP</small>
          </span>
          <button type="button" className="chip-button" onClick={() => setResetOpen(true)} aria-label="最初から">↺</button>
        </div>
      </header>

      <div className="scrap-sector" aria-hidden>
        <b>SECTOR 01</b><span>廃棄平原・再生ライン</span>
      </div>

      <Shop key="scrap-taiga-engine" onSample={setSample} paused={resetOpen} />

      <footer className="dock scrap-dock">
        <div className="carry">
          <span>♻</span>
          <strong>{sample?.carry ?? 0}<small> / {sample?.maxCarry ?? 3}</small></strong>
          <small className="carry-note">積載</small>
        </div>
        <p className="dock-note">拾う → 運ぶ → 選別 → 加工 → 自動化。止まった惑星を再生する。</p>
      </footer>

      {sample?.toast ? <div className="toast">{sample.toast}</div> : null}

      {resetOpen ? (
        <div className="modal" role="dialog" aria-modal aria-labelledby="scrap-reset-title">
          <div className="modal-card">
            <h2 id="scrap-reset-title">SCRAP PLANETを最初からやり直しますか？</h2>
            <p className="reset-note">SCRAPの再生記録だけを消します。ほかのステージには影響しません。</p>
            <div className="modal-actions">
              <button type="button" className="ghost" autoFocus onClick={() => setResetOpen(false)}>キャンセル</button>
              <button type="button" className="is-danger" onClick={() => {
                resetState();
                setSample(null);
                setResetOpen(false);
                window.location.reload();
              }}>リセットする</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
