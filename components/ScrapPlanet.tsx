"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ScrapPlanet.module.css";
import {
  batchSize,
  bottleneck,
  buyAutomation,
  buyUpgrade,
  canAutomate,
  completedLines,
  createScrapState,
  cycleMs,
  machines,
  resourceLabels,
  runManual,
  tickScrap,
  upgradeCost,
  type MachineDef,
  type ScrapState,
} from "@/lib/scrap";
import { loadScrap, resetScrap, saveScrap } from "@/lib/scrapStore";
import { equippedSkin } from "@/lib/shopStore";
import { formatNumber } from "@/lib/format";

const hats: Record<string, string> = {
  chef: "👨‍🍳",
  cowboy: "🤠",
  crown: "👑",
  helmet: "🧑‍🚀",
  topknot: "🥷",
  ears: "🦖",
  cap: "🧢",
  none: "🧑‍🔧",
};

const price = (value: number) =>
  value < 100_000 ? Math.ceil(value).toLocaleString("ja-JP") : formatNumber(value);

const requirement = (machine: MachineDef) => {
  const items = [`${price(machine.autoCredits)} C`];
  if (machine.autoParts) items.push(`⚙️ ${machine.autoParts}`);
  if (machine.autoRobots) items.push(`🤖 ${machine.autoRobots}`);
  return items.join(" + ");
};

export default function ScrapPlanet() {
  const [state, setState] = useState<ScrapState>(() => createScrapState());
  const [mounted, setMounted] = useState(false);
  const [flash, setFlash] = useState("宇宙ゴミを拾って最初のラインを動かそう");
  const stateRef = useRef(state);

  useEffect(() => {
    const loaded = loadScrap();
    stateRef.current = loaded;
    setState(loaded);
    setMounted(true);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!mounted) return;
    const timer = window.setInterval(() => {
      setState((current) => tickScrap(current));
    }, 500);
    const saver = window.setInterval(() => saveScrap(stateRef.current), 5000);
    const persist = () => saveScrap(stateRef.current);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", persist);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(saver);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", persist);
      persist();
    };
  }, [mounted]);

  const skin = useMemo(() => (mounted ? equippedSkin() : null), [mounted]);
  const linePercent = Math.round((state.unlocked / machines.length) * 100);
  const automated = completedLines(state);

  const commit = (next: ScrapState, message: string) => {
    stateRef.current = next;
    setState(next);
    saveScrap(next);
    setFlash(message);
  };

  const manual = (machine: MachineDef) => {
    const before = state;
    const next = runManual(before, machine.id);
    if (next.totalActions === before.totalActions) {
      setFlash("前の工程の材料が足りません");
      return;
    }
    const output = machine.output ? resourceLabels[machine.output].name : "クレジット";
    commit(next, `${machine.name}完了：${output}を生産`);
  };

  const upgrade = (machine: MachineDef) => {
    const next = buyUpgrade(state, machine.id);
    if (next === state) {
      setFlash("クレジットが足りません");
      return;
    }
    commit(next, `${machine.short}をレベル${next.levels[machine.id]}へ強化`);
  };

  const automate = (machine: MachineDef) => {
    const next = buyAutomation(state, machine.id);
    if (next === state) {
      setFlash("自動化に必要な資源が足りません");
      return;
    }
    commit(next, `${machine.name}を自動化しました`);
  };

  const reset = () => {
    if (!window.confirm("SCRAP PLANETの工場を最初から作り直しますか？")) return;
    const next = resetScrap();
    stateRef.current = next;
    setState(next);
    setFlash("小さな回収基地から再スタートしました");
  };

  return (
    <main className={styles.page}>
      <div className={styles.stars} aria-hidden />
      <header className={styles.header}>
        <a className={styles.back} href="/">
          ← シリーズ選択
        </a>
        <div className={styles.titleBlock}>
          <span className={styles.planet}>♻️</span>
          <div>
            <p>WORKING PLANET SERIES 03</p>
            <h1>SCRAP PLANET</h1>
            <small>廃棄惑星を巨大な自動工場へ</small>
          </div>
        </div>
        <button className={styles.reset} type="button" onClick={reset}>
          リセット
        </button>
      </header>

      <section className={styles.hud}>
        <div className={styles.credit}>
          <span>C</span>
          <strong>{price(state.credits)}</strong>
          <small>クレジット</small>
        </div>
        <div className={styles.avatar} title={skin?.name ?? "見習い"}>
          <span>{skin?.icon ?? hats[skin?.hat ?? "none"]}</span>
          <div>
            <strong>{skin?.name ?? "見習い"}</strong>
            <small>工場長</small>
          </div>
        </div>
        <div className={styles.overview}>
          <div>
            <strong>{state.unlocked}/9</strong>
            <small>工程解放</small>
          </div>
          <div>
            <strong>{automated}/9</strong>
            <small>自動化</small>
          </div>
          <div>
            <strong>{Math.floor(state.resources.robots)}</strong>
            <small>作業ロボ</small>
          </div>
        </div>
      </section>

      <section className={styles.progress} aria-label="工場完成度">
        <div style={{ width: `${linePercent}%` }} />
        <span>FACTORY COMPLETION {linePercent}%</span>
      </section>

      <p className={styles.status}>
        <span>⚠</span> {bottleneck(state)}
      </p>

      <section className={styles.resources} aria-label="資源一覧">
        {(Object.keys(resourceLabels) as Array<keyof typeof resourceLabels>).map((key) => (
          <div key={key} className={styles.resource}>
            <span>{resourceLabels[key].icon}</span>
            <div>
              <small>{resourceLabels[key].name}</small>
              <strong>{price(state.resources[key])}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.factory}>
        <div className={styles.factoryHead}>
          <div>
            <p>PROCESSING LINE</p>
            <h2>加工ライン</h2>
          </div>
          <p className={styles.flash}>{flash}</p>
        </div>

        <div className={styles.line}>
          {machines.map((machine, index) => {
            const open = index < state.unlocked;
            const auto = state.automated.includes(machine.id);
            const batch = batchSize(state, machine.id);
            const enoughInput = !machine.input || state.resources[machine.input] >= batch;
            const levelCost = upgradeCost(state, machine);
            const autoReady = canAutomate(state, machine);
            return (
              <article
                key={machine.id}
                className={`${styles.machine} ${open ? styles.open : styles.locked} ${
                  auto ? styles.auto : ""
                }`}
              >
                <div className={styles.machineNumber}>{String(index + 1).padStart(2, "0")}</div>
                <div className={styles.machineIcon}>{open ? machine.icon : "🔒"}</div>
                <div className={styles.machineTitle}>
                  <div>
                    <small>{machine.short}</small>
                    <h3>{machine.name}</h3>
                  </div>
                  {auto ? <span className={styles.autoBadge}>AUTO</span> : null}
                </div>

                {open ? (
                  <>
                    <div className={styles.recipe}>
                      <span>
                        {machine.input
                          ? `${resourceLabels[machine.input].icon} ${batch}`
                          : "宇宙空間"}
                      </span>
                      <b>→</b>
                      <span>
                        {machine.output
                          ? `${resourceLabels[machine.output].icon} ${batch}`
                          : `C ${batch * 650}`}
                      </span>
                    </div>
                    <div className={styles.machineStats}>
                      <span>LV.{state.levels[machine.id]}</span>
                      <span>{(cycleMs(state, machine) / 1000).toFixed(1)}秒</span>
                      <span>1回 {batch}個</span>
                    </div>
                    <button
                      className={styles.workButton}
                      type="button"
                      disabled={!enoughInput}
                      onClick={() => manual(machine)}
                    >
                      {enoughInput ? "手動で加工" : "材料待ち"}
                    </button>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={state.credits < levelCost}
                        onClick={() => upgrade(machine)}
                      >
                        強化 <span>C {price(levelCost)}</span>
                      </button>
                      <button
                        type="button"
                        className={auto ? styles.done : undefined}
                        disabled={auto || !autoReady}
                        onClick={() => automate(machine)}
                      >
                        {auto ? "自動化済み" : "自動化"}
                        {!auto ? <span>{requirement(machine)}</span> : null}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.lockMessage}>
                    前の工程を一度動かすと、この設備を建設できます
                  </div>
                )}
                {index < machines.length - 1 ? <div className={styles.connector}>›</div> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.guide}>
        <div>
          <span>1</span>
          <p><strong>手で動かす</strong>最初は各設備のボタンを押して加工する。</p>
        </div>
        <div>
          <span>2</span>
          <p><strong>設備を強化</strong>一度に加工できる量と処理速度が上がる。</p>
        </div>
        <div>
          <span>3</span>
          <p><strong>自動化する</strong>作った部品とロボットが、次の工場を動かす。</p>
        </div>
      </section>
    </main>
  );
}
