"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  RESOURCE_IDS,
  buildingById,
  buildings,
  resources as resourceMeta,
  type BuildingId,
  type Cost,
} from "@/data/buildings";
import { quests } from "@/data/quests";
import {
  BLIZZARD_UNLOCK_LEVELS,
  MIGRATION_UNLOCK_LEVELS,
  canAfford,
  computeDerived,
  costFor,
  isUnlocked,
  maxAffordable,
} from "@/lib/game";
import {
  build,
  claimQuest,
  dismissOffline,
  getServerSnapshot,
  getSnapshot,
  grantResources,
  migrateCamp,
  resetGame,
  stokeFire,
  subscribe,
} from "@/lib/store";
import {
  formatClock,
  formatDuration,
  formatNumber,
  formatRate,
} from "@/lib/format";
import CampScene, { iso, type Spark, type Token } from "@/components/CampScene";

type Overlay = "quest" | "info" | null;
type BuyMode = 1 | 10 | "max";

const buyModes: BuyMode[] = [1, 10, "max"];
const TOKEN_SECONDS = 25;
const TOKEN_LIFE = 11000;

const iconOf = (id: string) =>
  resourceMeta.find((resource) => resource.id === id)?.icon ?? "";

const costEntries = (cost: Cost) =>
  RESOURCE_IDS.filter((id) => (cost[id] ?? 0) > 0).map((id) => ({
    id,
    amount: cost[id] as number,
  }));

const firePos = iso(2, 2);

export default function Page() {
  const { game, offline } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [selected, setSelected] = useState<BuildingId | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [buyMode, setBuyMode] = useState<BuyMode>(1);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const nextId = useRef(0);

  const derived = useMemo(() => (game ? computeDerived(game) : null), [game]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2400);
  }, []);

  const addSpark = useCallback((text: string, x: number, y: number) => {
    if (!text) return;
    const id = (nextId.current += 1);
    setSparks((list) => [...list.slice(-6), { id, text, x, y }]);
    window.setTimeout(() => {
      setSparks((list) => list.filter((item) => item.id !== id));
    }, 900);
  }, []);

  const sparkText = useCallback(
    (gain: Cost) =>
      costEntries(gain)
        .map(({ id, amount }) => `+${formatNumber(amount)}${iconOf(id)}`)
        .join(" "),
    [],
  );

  /* 焚き火をかき立てる */
  const handleStoke = useCallback(() => {
    const gained = stokeFire();
    addSpark(
      sparkText(gained),
      firePos.x + (Math.random() * 40 - 20),
      firePos.y - 30,
    );
  }, [addSpark, sparkText]);

  /* 箱庭に湧く資源を拾う */
  const handleCollect = useCallback(
    (token: Token) => {
      const gain: Cost = { [token.resource]: token.amount };
      grantResources(gain);
      setTokens((list) => list.filter((item) => item.id !== token.id));
      const building = buildingById.get(token.buildingId);
      const at = building ? iso(building.tile[0], building.tile[1]) : firePos;
      addSpark(sparkText(gain), at.x, at.y - 46);
    },
    [addSpark, sparkText],
  );

  /* 一定間隔で建物の上に資源を湧かせる */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const snapshot = getSnapshot().game;
      if (!snapshot) return;
      const producers = buildings.filter(
        (building) =>
          building.produces &&
          snapshot.levels[building.id] > 0 &&
          !(building.id === "furnace" && snapshot.resources.coal <= 0),
      );
      if (producers.length === 0) return;

      setTokens((list) => {
        if (list.length >= 3) return list;
        const building = producers[Math.floor(Math.random() * producers.length)];
        if (!building.produces) return list;
        const stats = computeDerived(snapshot);
        const amount =
          snapshot.levels[building.id] *
          building.produces.perLevel *
          stats.globalMult *
          TOKEN_SECONDS;
        const id = (nextId.current += 1);
        window.setTimeout(() => {
          setTokens((current) => current.filter((item) => item.id !== id));
        }, TOKEN_LIFE);
        return [
          ...list,
          {
            id,
            buildingId: building.id,
            resource: building.produces.resource,
            amount,
          },
        ];
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const handleBuild = useCallback(
    (id: BuildingId, count: number) => {
      build(id, count);
      const building = buildingById.get(id);
      if (building) {
        const at = iso(building.tile[0], building.tile[1]);
        addSpark("完成！", at.x, at.y - 40);
      }
    },
    [addSpark],
  );

  const handleClaim = useCallback(
    (questId: string) => {
      if (claimQuest(questId)) showToast("報酬を受け取りました");
    },
    [showToast],
  );

  const handleMigrate = useCallback(
    (reward: number) => {
      const ok = window.confirm(
        `拠点を捨てて新天地へ移住します。\n建物と資源はすべて失われますが、残り火を ${reward} 得て、以降の全生産が永続的に強化されます。\n移住しますか？`,
      );
      if (!ok) return;
      if (migrateCamp()) {
        setOverlay(null);
        setSelected(null);
        showToast(`残り火を ${reward} 獲得しました`);
      }
    },
    [showToast],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm("すべての記録を消して最初からやり直しますか？")) return;
    resetGame();
    setOverlay(null);
    setSelected(null);
    showToast("拠点を作り直しました");
  }, [showToast]);

  if (!game || !derived) {
    return (
      <main className="boot">
        <div className="boot-fire" />
        <p>拠点を掘り起こしています…</p>
      </main>
    );
  }

  const unlockedFn = (id: BuildingId) => isUnlocked(id, game.levels);
  const affordableFn = (id: BuildingId) =>
    canAfford(game.resources, costFor(id, game.levels[id], 1));

  const claimable = quests.some(
    (quest) =>
      !game.claimed.includes(quest.id) &&
      quest.current(game, derived) >= quest.target,
  );

  const selectedBuilding = selected ? buildingById.get(selected) : null;
  const fireCost = costFor("bonfire", game.levels.bonfire, 1);
  const fireAffordable = canAfford(game.resources, fireCost);
  const blizzardReady = derived.totalLevels >= BLIZZARD_UNLOCK_LEVELS;

  return (
    <main
      className={`app${game.blizzardActive ? " is-blizzard" : ""}${
        game.freezing ? " is-freezing" : ""
      }`}
    >
      <div className="snow snow-a" aria-hidden />
      <div className="snow snow-b" aria-hidden />
      <div className="snow snow-c" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🔥</span>
          <span>
            <strong>ラストファイア</strong>
            <small>雪原拠点経営</small>
          </span>
        </div>
        <div className="badges">
          <span className="badge">拠点 Lv{derived.campLevel}</span>
          {game.embers > 0 ? (
            <span className="badge badge-ember">残り火 {game.embers}</span>
          ) : null}
        </div>
      </header>

      <section className="resources">
        {resourceMeta.map((resource) => {
          if (
            resource.id === "steel" &&
            game.levels.furnace === 0 &&
            game.resources.steel <= 0
          ) {
            return null;
          }
          const rate = derived.net[resource.id];
          return (
            <div key={resource.id} className="resource">
              <span className="resource-icon">{resource.icon}</span>
              <span className="resource-body">
                <strong>{formatNumber(game.resources[resource.id])}</strong>
                <small className={rate < 0 ? "is-negative" : undefined}>
                  {formatRate(rate)}
                </small>
              </span>
            </div>
          );
        })}
      </section>

      {blizzardReady ? (
        <div
          className={`weather${game.blizzardActive ? " is-active" : ""}${
            game.freezing ? " is-danger" : ""
          }`}
        >
          {game.freezing ? (
            <span>❄ 石炭が尽きた！ 生存者が凍えている</span>
          ) : game.blizzardActive ? (
            <span>
              ❄ 吹雪 — 石炭 -{formatNumber(derived.blizzardDrain)}/秒 ・ 残り{" "}
              {formatClock(game.blizzardTimer)}
            </span>
          ) : (
            <span>次の吹雪まで {formatClock(game.blizzardTimer)}</span>
          )}
        </div>
      ) : null}

      <div className="stage">
        <CampScene
          levels={game.levels}
          campLevel={derived.campLevel}
          population={game.population}
          heat={game.heat}
          fireScale={1 + Math.min(0.45, game.levels.bonfire * 0.02)}
          blizzard={game.blizzardActive}
          freezing={game.freezing}
          unlocked={unlockedFn}
          affordable={affordableFn}
          selected={selected}
          onSelect={setSelected}
          onStoke={handleStoke}
          tokens={tokens}
          onCollect={handleCollect}
          sparks={sparks}
        />

        <div className="stage-stats">
          <span>
            👥 {Math.floor(game.population)}/{derived.capacity}
          </span>
          <span>⚡ ×{derived.globalMult.toFixed(2)}</span>
        </div>
      </div>

      {game.taps < 6 && game.migrations === 0 ? (
        <p className="hint">焚き火をタップして木を集めよう</p>
      ) : null}

      <div className="firebar">
        <button
          type="button"
          className="firebar-tap"
          onPointerDown={(event) => {
            event.preventDefault();
            handleStoke();
          }}
        >
          <span className="firebar-icon">🔥</span>
          <span className="firebar-body">
            <strong>焚き火 Lv{game.levels.bonfire}</strong>
            <span className="heat-bar">
              <span style={{ width: `${game.heat}%` }} />
            </span>
            <small>
              暖 {Math.round(game.heat)}％ ・ 生産 +
              {Math.round(derived.heatBonus * 100)}％
            </small>
          </span>
        </button>
        <button
          type="button"
          className="firebar-up"
          disabled={!fireAffordable}
          onClick={() => handleBuild("bonfire", 1)}
        >
          <span>強化</span>
          <span className="build-cost">
            {costEntries(fireCost).map(({ id, amount }) => (
              <span key={id}>
                {iconOf(id)}
                {formatNumber(amount)}
              </span>
            ))}
          </span>
        </button>
      </div>

      <nav className="dock">
        <button
          type="button"
          className={claimable ? "has-badge" : undefined}
          onClick={() => setOverlay("quest")}
        >
          🎯 目標
        </button>
        <button type="button" onClick={() => setOverlay("info")}>
          📖 記録
        </button>
      </nav>

      {/* 建設・強化シート */}
      {selectedBuilding ? (
        <>
          <button
            type="button"
            className="sheet-scrim"
            aria-label="閉じる"
            onClick={() => setSelected(null)}
          />
          <section className="sheet">
            <div className="sheet-head">
              <span className="sheet-icon">{selectedBuilding.icon}</span>
              <div>
                <strong>{selectedBuilding.name}</strong>
                <span className="level">
                  Lv{game.levels[selectedBuilding.id]}
                </span>
                <p className="summary">{selectedBuilding.summary}</p>
              </div>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>

            {unlockedFn(selectedBuilding.id) ? (
              <>
                <p className="effect">
                  {selectedBuilding.effect(game.levels[selectedBuilding.id])}
                </p>
                <div className="buy-modes">
                  {buyModes.map((mode) => (
                    <button
                      key={String(mode)}
                      type="button"
                      className={buyMode === mode ? "is-active" : undefined}
                      onClick={() => setBuyMode(mode)}
                    >
                      {mode === "max" ? "MAX" : `×${mode}`}
                    </button>
                  ))}
                </div>
                {(() => {
                  const level = game.levels[selectedBuilding.id];
                  const count =
                    buyMode === "max"
                      ? Math.max(
                          1,
                          maxAffordable(
                            game.resources,
                            selectedBuilding.id,
                            level,
                          ),
                        )
                      : buyMode;
                  const cost = costFor(selectedBuilding.id, level, count);
                  const ok = canAfford(game.resources, cost);
                  return (
                    <button
                      type="button"
                      className="build"
                      disabled={!ok}
                      onClick={() => handleBuild(selectedBuilding.id, count)}
                    >
                      <span className="build-label">
                        {level === 0 ? "建設する" : "強化する"} ×{count}
                      </span>
                      <span className="build-cost">
                        {costEntries(cost).map(({ id, amount }) => (
                          <span key={id}>
                            {iconOf(id)}
                            {formatNumber(amount)}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })()}
              </>
            ) : (
              <p className="locked-note">
                建物の合計レベルが {selectedBuilding.unlockAt} になると解禁されます
                （現在 {derived.totalLevels}）。
              </p>
            )}
          </section>
        </>
      ) : null}

      {/* 目標 */}
      {overlay === "quest" ? (
        <section className="overlay">
          <header className="overlay-head">
            <h2>目標</h2>
            <button type="button" onClick={() => setOverlay(null)}>
              ✕
            </button>
          </header>
          <ul className="quests">
            {quests.map((quest) => {
              const claimed = game.claimed.includes(quest.id);
              const current = quest.current(game, derived);
              const done = current >= quest.target;
              const ratio = Math.min(1, current / quest.target);
              return (
                <li
                  key={quest.id}
                  className={`quest${claimed ? " is-claimed" : ""}`}
                >
                  <div className="quest-head">
                    <strong>{quest.title}</strong>
                    <span>
                      {Math.floor(Math.min(current, quest.target))} /{" "}
                      {quest.target}
                    </span>
                  </div>
                  <p>{quest.detail}</p>
                  <div className="quest-bar">
                    <span style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <div className="quest-foot">
                    <span className="quest-reward">
                      {costEntries(quest.reward).map(({ id, amount }) => (
                        <span key={id}>
                          {iconOf(id)}
                          {formatNumber(amount)}
                        </span>
                      ))}
                    </span>
                    <button
                      type="button"
                      disabled={!done || claimed}
                      onClick={() => handleClaim(quest.id)}
                    >
                      {claimed ? "受取済" : done ? "受け取る" : "未達成"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 記録 */}
      {overlay === "info" ? (
        <section className="overlay">
          <header className="overlay-head">
            <h2>記録</h2>
            <button type="button" onClick={() => setOverlay(null)}>
              ✕
            </button>
          </header>

          <div className="card">
            <h3>遊びかた</h3>
            <ul className="notes">
              <li>焚き火をタップすると資源が手に入り、「暖」が上がって全生産が最大 +80％ になります。</li>
              <li>空き地をタップすると建物を建てられます。強化するほど拠点の見た目も育ちます。</li>
              <li>建物の上に湧く資源は、タップで拾うと約{TOKEN_SECONDS}秒ぶんまとめて手に入ります。</li>
              <li>
                アプリを閉じているあいだも {derived.offlineCapHours}
                時間ぶんまで生産が進みます（効率60％）。
              </li>
              <li>
                建物の合計レベルが {BLIZZARD_UNLOCK_LEVELS}{" "}
                を超えると吹雪が来ます。石炭を切らすと生存者が凍えます。
              </li>
            </ul>
          </div>

          <div className="card">
            <h3>拠点の記録</h3>
            <dl className="stats">
              <div>
                <dt>プレイ時間</dt>
                <dd>{formatDuration(game.playTime)}</dd>
              </div>
              <div>
                <dt>かき立てた回数</dt>
                <dd>{game.taps.toLocaleString("ja-JP")}</dd>
              </div>
              <div>
                <dt>やり過ごした吹雪</dt>
                <dd>{game.blizzardsSurvived}</dd>
              </div>
              <div>
                <dt>移住回数</dt>
                <dd>{game.migrations}</dd>
              </div>
              <div>
                <dt>建物の合計レベル</dt>
                <dd>{derived.totalLevels}</dd>
              </div>
              <div>
                <dt>残り火ボーナス</dt>
                <dd>+{game.embers * 15}％</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h3>移住</h3>
            {derived.migrationReward > 0 ? (
              <>
                <p>
                  いまの拠点を捨てると、残り火を{" "}
                  <strong>{derived.migrationReward}</strong> 獲得します。
                  残り火1つにつき、全生産が永続で +15％ 強くなります。
                </p>
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleMigrate(derived.migrationReward)}
                >
                  新天地へ移住する
                </button>
              </>
            ) : (
              <p>
                建物の合計レベルが {MIGRATION_UNLOCK_LEVELS}{" "}
                になると解禁されます（現在 {derived.totalLevels}）。
              </p>
            )}
          </div>

          <div className="card">
            <h3>データ</h3>
            <p>記録はこの端末のブラウザにのみ保存されます。</p>
            <button type="button" className="ghost" onClick={handleReset}>
              最初からやり直す
            </button>
          </div>
        </section>
      ) : null}

      {offline ? (
        <div className="modal" role="dialog" aria-modal>
          <div className="modal-card">
            <h2>おかえりなさい</h2>
            <p>
              留守にしていた {formatDuration(offline.seconds)}{" "}
              のあいだに、拠点はこれだけ資源を集めました。
            </p>
            <ul className="offline-list">
              {RESOURCE_IDS.filter(
                (id) => Math.abs(offline.gains[id]) >= 1,
              ).map((id) => {
                const value = offline.gains[id];
                return (
                  <li key={id}>
                    <span>
                      {iconOf(id)}{" "}
                      {resourceMeta.find((item) => item.id === id)?.name}
                    </span>
                    <strong className={value < 0 ? "is-negative" : undefined}>
                      {value >= 0 ? "+" : "-"}
                      {formatNumber(Math.abs(value))}
                    </strong>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={dismissOffline}>
              受け取る
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}
