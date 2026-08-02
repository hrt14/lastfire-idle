"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  RESOURCE_IDS,
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

type Tab = "camp" | "quest" | "info";
type BuyMode = 1 | 10 | "max";

type Floater = {
  id: number;
  text: string;
  x: number;
  y: number;
};

const buyModes: BuyMode[] = [1, 10, "max"];

const iconOf = (id: string) =>
  resourceMeta.find((resource) => resource.id === id)?.icon ?? "";

const costEntries = (cost: Cost) =>
  RESOURCE_IDS.filter((id) => (cost[id] ?? 0) > 0).map((id) => ({
    id,
    amount: cost[id] as number,
  }));

export default function Page() {
  const { game, offline } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [tab, setTab] = useState<Tab>("camp");
  const [buyMode, setBuyMode] = useState<BuyMode>(1);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const floaterId = useRef(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2400);
  }, []);

  const handleStoke = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const gained = stokeFire();
      const label = costEntries(gained)
        .map(({ id, amount }) => `+${formatNumber(amount)}${iconOf(id)}`)
        .join(" ");
      if (!label) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const id = (floaterId.current += 1);
      setFloaters((list) => [
        ...list.slice(-8),
        {
          id,
          text: label,
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        },
      ]);
      window.setTimeout(() => {
        setFloaters((list) => list.filter((item) => item.id !== id));
      }, 900);
    },
    [],
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
        setTab("camp");
        showToast(`残り火を ${reward} 獲得しました`);
      }
    },
    [showToast],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm("すべての記録を消して最初からやり直しますか？")) return;
    resetGame();
    setTab("camp");
    showToast("拠点を作り直しました");
  }, [showToast]);

  const derived = useMemo(() => (game ? computeDerived(game) : null), [game]);

  if (!game || !derived) {
    return (
      <main className="boot">
        <div className="boot-fire" />
        <p>拠点を掘り起こしています…</p>
      </main>
    );
  }

  const blizzardReady = derived.totalLevels >= BLIZZARD_UNLOCK_LEVELS;
  const fireScale = 1 + Math.min(0.45, game.levels.bonfire * 0.02);
  const population = Math.floor(game.population);

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
            <span>
              次の吹雪まで {formatClock(game.blizzardTimer)}
              {game.levels.watchtower > 0 ? " ・ 見張り台 稼働中" : ""}
            </span>
          )}
        </div>
      ) : null}

      <section className="scene">
        <div className="ring" aria-hidden>
          {buildings
            .filter((building) => game.levels[building.id] > 0)
            .map((building, index) => (
              <span
                key={building.id}
                className="ring-item"
                style={{
                  left: index % 2 === 0 ? "9%" : "91%",
                  top: `${16 + Math.floor(index / 2) * 15}%`,
                  fontSize: `${
                    1.1 + Math.min(0.6, game.levels[building.id] * 0.02)
                  }rem`,
                  animationDelay: `${index * -0.7}s`,
                }}
                title={building.name}
              >
                {building.icon}
              </span>
            ))}
        </div>

        <button
          type="button"
          className="fire"
          onPointerDown={handleStoke}
          style={
            {
              "--fire-scale": fireScale,
              "--heat": `${game.heat}%`,
            } as React.CSSProperties
          }
        >
          <span className="fire-ring" aria-hidden />
          <svg className="fire-core" viewBox="0 0 100 118" aria-hidden>
            <defs>
              <linearGradient id="flameOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5f1f" stopOpacity="0.1" />
                <stop offset="42%" stopColor="#ff6a12" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ffa233" />
              </linearGradient>
              <linearGradient id="flameInner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb43d" stopOpacity="0.2" />
                <stop offset="55%" stopColor="#ffc45a" />
                <stop offset="100%" stopColor="#ffe6a3" />
              </linearGradient>
              <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff8a2b" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#ff8a2b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse
              className="fire-glow"
              cx="50"
              cy="82"
              rx="48"
              ry="30"
              fill="url(#flameGlow)"
            />
            <path
              className="flame flame-1"
              d="M50 4C70 30 78 44 78 62C78 80 65 92 50 92C35 92 22 80 22 62C22 44 30 30 50 4Z"
              fill="url(#flameOuter)"
            />
            <path
              className="flame flame-2"
              d="M50 34C62 50 67 57 67 67C67 79 59 87 50 87C41 87 33 79 33 67C33 57 38 50 50 34Z"
              fill="url(#flameInner)"
            />
            <path
              className="flame flame-3"
              d="M50 58C56 66 58 69 58 74C58 81 54 85 50 85C46 85 42 81 42 74C42 69 44 66 50 58Z"
              fill="#fff6dc"
            />
            <g className="logs">
              <rect x="16" y="94" width="68" height="9" rx="4.5" />
              <rect x="22" y="99" width="56" height="8" rx="4" />
            </g>
          </svg>
          <span className="fire-label">
            <strong>かき立てる</strong>
            <small>
              暖 {Math.round(game.heat)}％ ・ 生産 +
              {Math.round(derived.heatBonus * 100)}％
            </small>
          </span>
          {floaters.map((floater) => (
            <span
              key={floater.id}
              className="floater"
              style={{ left: `${floater.x}%`, top: `${floater.y}%` }}
            >
              {floater.text}
            </span>
          ))}
        </button>

        <div className="scene-stats">
          <div>
            <strong>{population}</strong>
            <small>生存者 / {derived.capacity}</small>
          </div>
          <div>
            <strong>×{derived.globalMult.toFixed(2)}</strong>
            <small>生産倍率</small>
          </div>
          <div>
            <strong>{formatNumber(derived.gross.wood)}</strong>
            <small>木材/秒</small>
          </div>
        </div>
      </section>

      <nav className="tabs">
        {(
          [
            ["camp", "拠点"],
            ["quest", "目標"],
            ["info", "記録"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "camp" ? (
        <section className="panel">
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

          <ul className="buildings">
            {buildings.map((building) => {
              const level = game.levels[building.id];
              if (!isUnlocked(building.id, game.levels)) {
                return (
                  <li key={building.id} className="building is-locked">
                    <span className="building-icon">🔒</span>
                    <div className="building-body">
                      <div className="building-head">
                        <strong>？？？</strong>
                      </div>
                      <p className="summary">
                        建物の合計レベル {building.unlockAt} で解禁
                      </p>
                    </div>
                  </li>
                );
              }

              const count =
                buyMode === "max"
                  ? Math.max(1, maxAffordable(game.resources, building.id, level))
                  : buyMode;
              const cost = costFor(building.id, level, count);
              const affordable = canAfford(game.resources, cost);

              return (
                <li key={building.id} className="building">
                  <span className="building-icon">{building.icon}</span>
                  <div className="building-body">
                    <div className="building-head">
                      <strong>{building.name}</strong>
                      <span className="level">Lv{level}</span>
                    </div>
                    <p className="effect">{building.effect(level)}</p>
                    <p className="summary">{building.summary}</p>
                  </div>
                  <button
                    type="button"
                    className="build"
                    disabled={!affordable}
                    onClick={() => build(building.id as BuildingId, count)}
                  >
                    <span className="build-label">
                      {level === 0 ? "建設" : "強化"} ×{count}
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
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "quest" ? (
        <section className="panel">
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

      {tab === "info" ? (
        <section className="panel">
          <div className="card">
            <h2>遊びかた</h2>
            <ul className="notes">
              <li>
                焚き火をタップすると資源が手に入り、「暖」が上がって全生産が最大
                +80％ になります。
              </li>
              <li>
                集めた資源で建物を強化すると、放置しているあいだも自動で資源が貯まります。
              </li>
              <li>
                アプリを閉じているあいだも {derived.offlineCapHours}
                時間ぶんまで生産が進みます（効率60％）。
              </li>
              <li>
                建物の合計レベルが {BLIZZARD_UNLOCK_LEVELS}{" "}
                を超えると吹雪が来ます。石炭を切らすと生存者が凍えます。
              </li>
              <li>
                合計レベル {MIGRATION_UNLOCK_LEVELS}{" "}
                で「移住」が解禁され、残り火を持って最初からやり直せます。
              </li>
            </ul>
          </div>

          <div className="card">
            <h2>記録</h2>
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
            <h2>移住</h2>
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
            <h2>データ</h2>
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
