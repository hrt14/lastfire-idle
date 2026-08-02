"use client";

import { useCallback, useState } from "react";
import Shop, { type Sample } from "@/components/Shop";
import {
  OFFLINE_CAP_HOURS,
  buyUpgrade,
  upgradePrice,
  upgrades,
  type OfflineReport,
  type UpgradeId,
} from "@/lib/shop";
import { getState, resetState, save } from "@/lib/shopStore";
import { formatDuration, formatYen } from "@/lib/format";

const yen = formatYen;

export default function Page() {
  const [sample, setSample] = useState<Sample | null>(null);
  const [sheet, setSheet] = useState<"upgrade" | "help" | null>(null);
  const [offline, setOffline] = useState<OfflineReport | null>(null);

  const handleSample = useCallback((next: Sample) => {
    setSample(next);
    if (next.offline) setOffline(next.offline);
  }, []);

  const handleBuy = useCallback((id: UpgradeId) => {
    if (buyUpgrade(getState(), id)) save();
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("お店を最初から建て直しますか？")) return;
    resetState();
    setSheet(null);
    window.location.reload();
  }, []);

  const money = sample?.money ?? 0;
  const levels = sample?.levels ?? { carry: 0, speed: 0, cook: 0, price: 0 };

  return (
    <main className="app">
      <header className="hud">
        <div className="wallet">
          <span className="wallet-icon">💴</span>
          <strong>{money.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</strong>
          <small>円</small>
        </div>
        <div className="hud-right">
          <span className="chip">🍜 {sample?.served ?? 0}杯</span>
          <button
            type="button"
            className="chip-button"
            onClick={() => setSheet("help")}
          >
            ？
          </button>
        </div>
      </header>

      <Shop onSample={handleSample} paused={sheet !== null || offline !== null} />

      <footer className="dock">
        <div className="carry">
          <span>🍜</span>
          <strong>
            {sample?.carry ?? 0}
            <small> / {sample?.maxCarry ?? 3}</small>
          </strong>
          <small className="carry-note">運べる数</small>
        </div>
        <button
          type="button"
          className="upgrade-open"
          onClick={() => setSheet("upgrade")}
        >
          ⚙ 強化する
        </button>
      </footer>

      {sample && sample.served === 0 ? (
        <p className="hint">画面をスワイプして移動</p>
      ) : null}

      {sample?.toast ? <div className="toast">{sample.toast}</div> : null}

      {sheet === "upgrade" ? (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="閉じる"
            onClick={() => setSheet(null)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <h2>強化</h2>
              <span className="sheet-money">{yen(money)}</span>
              <button type="button" className="sheet-close" onClick={() => setSheet(null)}>
                ✕
              </button>
            </div>
            <ul className="upgrades">
              {upgrades.map((upgrade) => {
                const level = levels[upgrade.id];
                const maxed = level >= upgrade.max;
                const price = upgradePrice(upgrade.id, level);
                const ok = !maxed && money >= price;
                return (
                  <li key={upgrade.id}>
                    <div className="upgrade-body">
                      <div className="upgrade-head">
                        <strong>{upgrade.name}</strong>
                        <span className="level">Lv{level}</span>
                      </div>
                      <p>{upgrade.detail(level)}</p>
                    </div>
                    <button
                      type="button"
                      className="buy"
                      disabled={!ok}
                      onClick={() => handleBuy(upgrade.id)}
                    >
                      {maxed ? "MAX" : yen(price)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}

      {sheet === "help" ? (
        <>
          <button
            type="button"
            className="scrim"
            aria-label="閉じる"
            onClick={() => setSheet(null)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <h2>遊びかた</h2>
              <button type="button" className="sheet-close" onClick={() => setSheet(null)}>
                ✕
              </button>
            </div>
            <ul className="notes">
              <li>画面のどこでもスワイプすると、その方向へ店主が歩きます（PCは矢印キー）。</li>
              <li>画面上部に「次にやること」が出ます。金色の点線がその場所まで伸びます。</li>
              <li>厨房の寸胴には、できあがった丼が溜まります。近づくと自動で持ち上がります。</li>
              <li>
                お客さんが座ると、カウンターの<strong>配膳口が金色に光り、矢印が出ます</strong>。
                そこまで丼を持っていけば自動で出します。
              </li>
              <li>食べ終わったお客さんはカウンターにお金を置きます。踏むと回収できます。</li>
              <li>
                緑の枠に立つとお金が吸い出され、席・調理台・店員が増えます。
                お金が続く限り、立っているだけで解放が進みます。
              </li>
              <li>
                ホール店員を雇うと、閉じているあいだも最大{OFFLINE_CAP_HOURS}時間ぶん稼いでくれます。
              </li>
            </ul>
            <button type="button" className="ghost" onClick={handleReset}>
              最初からやり直す
            </button>
          </section>
        </>
      ) : null}

      {offline ? (
        <div className="modal" role="dialog" aria-modal>
          <div className="modal-card">
            <h2>ただいま！</h2>
            <p>
              閉じていた {formatDuration(offline.seconds)} のあいだ、
              店員がお店を回してくれました。
            </p>
            <div className="offline-earn">
              <span>💴</span>
              <strong>+{yen(offline.earned)}</strong>
            </div>
            <button type="button" onClick={() => setOffline(null)}>
              受け取る
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
