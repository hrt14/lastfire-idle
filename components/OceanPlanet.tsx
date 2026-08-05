"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./OceanPlanet.module.css";
import {
  advanceOcean,
  areaAutomation,
  availablePurchases,
  bottleneck,
  buyOceanPurchase,
  carryCapacity,
  collectProduct,
  collectSource,
  deliverProduct,
  depositSource,
  dismissOfflineReport,
  inputCapacity,
  oceanArea,
  oceanAreas,
  oceanCompleted,
  oceanObjective,
  oceanResources,
  outputCapacity,
  processCycle,
  selectOceanArea,
  type OceanAreaId,
  type OceanPurchase,
  type OceanState,
} from "@/lib/ocean";
import { loadOcean, resetOcean, saveOcean } from "@/lib/oceanStore";
import { startCloud } from "@/lib/cloud";

const short = (value: number) => {
  if (value < 10_000) return Math.floor(value).toLocaleString("ja-JP");
  if (value < 100_000_000) return `${(value / 10_000).toFixed(value < 100_000 ? 1 : 0)}万`;
  return `${(value / 100_000_000).toFixed(1)}億`;
};

const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}時間${rest}分` : `${Math.max(1, minutes)}分`;
};

export default function OceanPlanet() {
  const [state, setState] = useState<OceanState | null>(null);
  const stateRef = useRef<OceanState | null>(null);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const commit = useCallback((next: OceanState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const change = useCallback(
    (run: (current: OceanState) => OceanState) => {
      const current = stateRef.current;
      if (!current) return;
      const next = run(current);
      if (next !== current) commit(next);
    },
    [commit],
  );

  useEffect(() => {
    const loaded = loadOcean();
    stateRef.current = loaded;
    setState(loaded);
    startCloud();

    let previous = performance.now();
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (!current) return;
      const now = performance.now();
      const dt = Math.min(1000, Math.max(0, now - previous));
      previous = now;
      commit(advanceOcean(current, dt));
    }, 250);
    const saveTimer = window.setInterval(() => {
      if (stateRef.current) saveOcean(stateRef.current);
    }, 2500);
    const onHidden = () => {
      if (document.visibilityState === "hidden" && stateRef.current) saveOcean(stateRef.current);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(saveTimer);
      document.removeEventListener("visibilitychange", onHidden);
      if (stateRef.current) saveOcean(stateRef.current);
    };
  }, [commit]);

  useEffect(() => {
    if (state && oceanCompleted(state)) setShowComplete(true);
  }, [state]);

  const current = state ? oceanArea(state.currentArea) : oceanAreas[0];
  const line = state?.lines[current.id];
  const purchases = useMemo(
    () => (state ? availablePurchases(state, current.id) : []),
    [state, current.id],
  );

  if (!state || !line) {
    return <main className={styles.loading}>海の星へ航行中…</main>;
  }

  const carry = state.carry;
  const carryInfo = carry.kind ? oceanResources[carry.kind] : null;
  const sourceInfo = oceanResources[current.source];
  const productInfo = oceanResources[current.product];
  const sourceAvailable = line.sourceAuto ? line.harvested : line.wild;
  const cycle = processCycle(state, current.id);
  const processRatio = line.input > 0 ? Math.min(1, line.processProgress / cycle) : 0;
  const orderRatio = Math.min(1, line.orderProgress / current.orderSize);
  const objective = oceanObjective(state);
  const canCollectSource =
    sourceAvailable >= 1 &&
    carry.amount < carryCapacity(state) &&
    (!carry.kind || carry.kind === current.source);
  const canDeposit = carry.kind === current.source && carry.amount > 0 && line.input < inputCapacity(state, current.id);
  const canCollectProduct =
    line.output >= 1 &&
    carry.amount < carryCapacity(state) &&
    (!carry.kind || carry.kind === current.product);
  const canDeliver = carry.kind === current.product && carry.amount > 0;

  const buy = (purchase: OceanPurchase) => {
    change((currentState) => buyOceanPurchase(currentState, purchase));
  };

  const handleReset = () => {
    const fresh = resetOcean();
    commit(fresh);
    setConfirmReset(false);
    setSettings(false);
  };

  return (
    <main className={styles.app}>
      <header className={styles.hud}>
        <div className={styles.wallet}>
          <span>🐚</span>
          <strong>{short(state.shells)}</strong>
          <small>シェル</small>
        </div>
        <div className={styles.restoration}>
          <div>
            <span>海洋再生</span>
            <strong>{Math.floor(state.restoration)}%</strong>
          </div>
          <div className={styles.bar}>
            <span style={{ width: `${state.restoration}%` }} />
          </div>
        </div>
        <div className={styles.hudButtons}>
          <button type="button" onClick={() => setHelp(true)} aria-label="遊び方">?</button>
          <button type="button" onClick={() => setSettings(true)} aria-label="設定">⚙</button>
          <Link href="/" aria-label="ステージ選択へ">☰</Link>
        </div>
      </header>

      <section className={styles.areaRail} aria-label="海域選択">
        {oceanAreas.map((area) => {
          const open = area.index < state.unlockedAreas;
          const selected = area.id === current.id;
          return (
            <button
              key={area.id}
              type="button"
              className={`${styles.areaChip}${selected ? ` ${styles.selected}` : ""}`}
              disabled={!open}
              onClick={() => change((value) => selectOceanArea(value, area.id))}
            >
              <span>{open ? area.icon : "🔒"}</span>
              <small>{area.index + 1}</small>
            </button>
          );
        })}
      </section>

      <section className={styles.sea} style={{ "--area-color": current.color } as React.CSSProperties}>
        <div className={styles.wave} aria-hidden />
        <div className={styles.hero}>
          <div className={styles.heroIcon}>{current.icon}</div>
          <div>
            <small>第{current.index + 1}海域</small>
            <h1>{current.name}</h1>
            <p>{current.subtitle}</p>
          </div>
          <div className={styles.autoBadge}>
            自動化 {areaAutomation(state, current.id)}/3
          </div>
        </div>

        <p className={styles.objective}>{objective}</p>

        <div className={styles.stations}>
          <article className={styles.station}>
            <div className={styles.stationHead}>
              <span className={styles.bigIcon}>{sourceInfo.icon}</span>
              <div>
                <small>採集</small>
                <strong>{current.sourceName}</strong>
              </div>
            </div>
            <div className={styles.stockRow}>
              <span>自然 {Math.floor(line.wild)}</span>
              {line.sourceAuto ? <span>水揚げ {Math.floor(line.harvested)}</span> : null}
            </div>
            <button
              type="button"
              className={styles.action}
              disabled={!canCollectSource}
              onClick={() => change((value) => collectSource(value, current.id))}
            >
              {line.sourceAuto ? "水揚げ品を受け取る" : `${sourceInfo.name}を集める`}
            </button>
            <small className={styles.status}>
              {line.sourceAuto ? `✅ ${current.workerName}が稼働中` : "自分で採集する"}
            </small>
          </article>

          <article className={styles.station}>
            <div className={styles.stationHead}>
              <span className={styles.bigIcon}>⚙️</span>
              <div>
                <small>加工</small>
                <strong>{current.processorName}</strong>
              </div>
            </div>
            <div className={styles.stockRow}>
              <span>投入 {Math.floor(line.input)}/{inputCapacity(state, current.id)}</span>
              <span>完成 {Math.floor(line.output)}/{outputCapacity(state, current.id)}</span>
            </div>
            <div className={styles.processBar}>
              <span style={{ width: `${processRatio * 100}%` }} />
            </div>
            <div className={styles.dualActions}>
              <button
                type="button"
                disabled={!canDeposit}
                onClick={() => change((value) => depositSource(value, current.id))}
              >
                投入
              </button>
              <button
                type="button"
                disabled={!canCollectProduct}
                onClick={() => change((value) => collectProduct(value, current.id))}
              >
                {productInfo.icon} 受取
              </button>
            </div>
            <small className={styles.status}>
              {line.processAuto ? `✅ ${current.transportName}が自動投入` : "材料を運ぶと自動で加工"}
            </small>
          </article>

          <article className={styles.station}>
            <div className={styles.stationHead}>
              <span className={styles.bigIcon}>📦</span>
              <div>
                <small>復旧依頼</small>
                <strong>{current.productName} ×{current.orderSize}</strong>
              </div>
            </div>
            <div className={styles.stockRow}>
              <span>{line.orderProgress}/{current.orderSize}</span>
              <span>報酬 🐚{short(current.orderReward)}・💧{current.blueReward}</span>
            </div>
            <div className={styles.orderBar}>
              <span style={{ width: `${orderRatio * 100}%` }} />
            </div>
            <button
              type="button"
              className={styles.action}
              disabled={!canDeliver}
              onClick={() => change((value) => deliverProduct(value, current.id))}
            >
              依頼へ納品する
            </button>
            <small className={styles.status}>
              {line.deliveryAuto ? `✅ ${current.deliveryName}が自動納品` : `完了 ${line.orders}回`}
            </small>
          </article>
        </div>
      </section>

      <section className={styles.dock}>
        <div className={styles.carry}>
          <span>{carryInfo?.icon ?? "🎒"}</span>
          <div>
            <strong>{carry.amount}/{carryCapacity(state)}</strong>
            <small>{carryInfo?.name ?? "手持ちなし"}</small>
          </div>
        </div>
        <div className={styles.purchases}>
          {purchases.length > 0 ? purchases.map((purchase) => (
            <button
              type="button"
              key={purchase.id}
              disabled={state.shells < purchase.cost}
              onClick={() => buy(purchase)}
            >
              <strong>{purchase.label}</strong>
              <small>{purchase.detail}</small>
              <span>🐚 {short(purchase.cost)}</span>
            </button>
          )) : (
            <div className={styles.noPurchase}>
              <strong>次の投資を出すには依頼を完了</strong>
              <small>{bottleneck(state)}</small>
            </div>
          )}
        </div>
      </section>

      {state.offlineReport ? (
        <div className={styles.modal}>
          <section className={styles.sheet}>
            <h2>🌙 留守中の海上レポート</h2>
            <p>{duration(state.offlineReport.elapsedMs)}のあいだに工場と船が働きました。</p>
            <div className={styles.reportGrid}>
              <span>収入<strong>🐚 {short(state.offlineReport.shells)}</strong></span>
              <span>依頼<strong>{state.offlineReport.orders}件</strong></span>
              <span>海洋再生<strong>+{state.offlineReport.restoration.toFixed(1)}%</strong></span>
            </div>
            <p className={styles.reportNote}>{state.offlineReport.bottleneck}</p>
            <button type="button" className={styles.primary} onClick={() => change(dismissOfflineReport)}>
              海へ戻る
            </button>
          </section>
        </div>
      ) : null}

      {help ? (
        <div className={styles.modal} onClick={() => setHelp(false)}>
          <section className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <h2>OCEAN PLANETの遊び方</h2>
            <ol>
              <li>海の資源を集め、加工設備へ投入する</li>
              <li>完成品を受け取り、復旧依頼へ納品する</li>
              <li>覚えた仕事を漁師・加工係・船へ順番に渡す</li>
              <li>3回の依頼と完全自動化で次の海域へ進む</li>
              <li>7海域を開き、海洋再生率100%を目指す</li>
            </ol>
            <button type="button" className={styles.primary} onClick={() => setHelp(false)}>わかった</button>
          </section>
        </div>
      ) : null}

      {settings ? (
        <div className={styles.modal} onClick={() => setSettings(false)}>
          <section className={styles.sheet} onClick={(event) => event.stopPropagation()}>
            <h2>設定</h2>
            <p>進行、設備、海域、シェル、海洋再生率をこのステージだけ最初からやり直せます。共通スキンと他ステージは残ります。</p>
            {!confirmReset ? (
              <button type="button" className={styles.danger} onClick={() => setConfirmReset(true)}>海の星をリセット</button>
            ) : (
              <div className={styles.confirm}>
                <strong>本当にリセットしますか？</strong>
                <button type="button" className={styles.danger} onClick={handleReset}>リセットする</button>
                <button type="button" onClick={() => setConfirmReset(false)}>キャンセル</button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {showComplete ? (
        <div className={styles.modal}>
          <section className={`${styles.sheet} ${styles.complete}`}>
            <div className={styles.planet}>🌍</div>
            <h2>海の星は、再び命に満ちた。</h2>
            <p>7つの海域と海底都市がつながり、海洋再生率100%を達成しました。</p>
            <button type="button" className={styles.primary} onClick={() => setShowComplete(false)}>この星を発展させ続ける</button>
            <Link href="/">ステージ選択へ戻る</Link>
          </section>
        </div>
      ) : null}
    </main>
  );
}
