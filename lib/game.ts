import {
  BUILDING_IDS,
  RESOURCE_IDS,
  buildingById,
  buildings,
  type BuildingId,
  type Cost,
  type ResourceId,
} from "@/data/buildings";

export const SAVE_KEY = "lastfire-save-v1";
export const SAVE_VERSION = 1;

export const BLIZZARD_INTERVAL = 165;
export const BLIZZARD_DURATION = 28;
export const BLIZZARD_WARNING = 22;
export const BLIZZARD_UNLOCK_LEVELS = 8;
export const MIGRATION_UNLOCK_LEVELS = 120;
export const OFFLINE_EFFICIENCY = 0.6;
export const OFFLINE_BASE_HOURS = 8;

export type Resources = Record<ResourceId, number>;
export type Levels = Record<BuildingId, number>;

export type GameState = {
  version: number;
  resources: Resources;
  levels: Levels;
  population: number;
  heat: number;
  embers: number;
  migrations: number;
  claimed: string[];
  blizzardActive: boolean;
  blizzardTimer: number;
  freezing: boolean;
  taps: number;
  blizzardsSurvived: number;
  playTime: number;
  startedAt: number;
  lastSeen: number;
};

export type Derived = {
  totalLevels: number;
  campLevel: number;
  capacity: number;
  globalMult: number;
  heatBonus: number;
  laborMult: number;
  gross: Resources;
  net: Resources;
  foodUpkeep: number;
  coalUpkeep: number;
  blizzardDrain: number;
  offlineCapHours: number;
  tapPower: number;
  migrationReward: number;
};

export const emptyResources = (): Resources => ({
  wood: 0,
  food: 0,
  coal: 0,
  steel: 0,
});

const emptyLevels = (): Levels => ({
  bonfire: 0,
  lumber: 0,
  hunter: 0,
  mine: 0,
  shelter: 0,
  canteen: 0,
  furnace: 0,
  workshop: 0,
  watchtower: 0,
});

export const createState = (embers = 0, migrations = 0): GameState => {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    resources: { ...emptyResources(), wood: 15 },
    levels: { ...emptyLevels(), lumber: 1 },
    population: 1,
    heat: 40,
    embers,
    migrations,
    claimed: [],
    blizzardActive: false,
    blizzardTimer: BLIZZARD_INTERVAL,
    freezing: false,
    taps: 0,
    blizzardsSurvived: 0,
    playTime: 0,
    startedAt: now,
    lastSeen: now,
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const normalizeState = (input: unknown): GameState => {
  const base = createState();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<GameState>;

  const resources = emptyResources();
  for (const id of RESOURCE_IDS) {
    resources[id] = Math.max(0, finite(raw.resources?.[id], 0));
  }

  const levels = emptyLevels();
  for (const id of BUILDING_IDS) {
    levels[id] = Math.max(0, Math.floor(finite(raw.levels?.[id], 0)));
  }
  if (Object.values(levels).every((level) => level === 0)) {
    levels.lumber = 1;
  }

  return {
    version: SAVE_VERSION,
    resources,
    levels,
    population: clamp(finite(raw.population, 1), 0, 100000),
    heat: clamp(finite(raw.heat, 0), 0, 100),
    embers: Math.max(0, Math.floor(finite(raw.embers, 0))),
    migrations: Math.max(0, Math.floor(finite(raw.migrations, 0))),
    claimed: Array.isArray(raw.claimed)
      ? raw.claimed.filter((id): id is string => typeof id === "string")
      : [],
    blizzardActive: raw.blizzardActive === true,
    blizzardTimer: clamp(
      finite(raw.blizzardTimer, BLIZZARD_INTERVAL),
      0,
      BLIZZARD_INTERVAL,
    ),
    freezing: false,
    taps: Math.max(0, Math.floor(finite(raw.taps, 0))),
    blizzardsSurvived: Math.max(0, Math.floor(finite(raw.blizzardsSurvived, 0))),
    playTime: Math.max(0, finite(raw.playTime, 0)),
    startedAt: finite(raw.startedAt, Date.now()),
    lastSeen: finite(raw.lastSeen, Date.now()),
  };
};

export const totalLevels = (levels: Levels) =>
  BUILDING_IDS.reduce((sum, id) => sum + levels[id], 0);

export const isUnlocked = (id: BuildingId, levels: Levels) => {
  const building = buildingById.get(id);
  if (!building) return false;
  if (levels[id] > 0) return true;
  return totalLevels(levels) >= building.unlockAt;
};

export const computeDerived = (state: GameState): Derived => {
  const { levels, resources } = state;
  const total = totalLevels(levels);

  const capacity = 4 + levels.shelter * 3;
  const population = Math.min(state.population, capacity);
  const laborMult = 1 + population * 0.015;
  const heatBonus = (state.heat / 100) * 0.8;
  const freezePenalty = state.freezing ? 0.4 : 1;

  const globalMult =
    (1 + levels.bonfire * 0.08) *
    (1 + levels.workshop * 0.03) *
    (1 + state.embers * 0.15) *
    laborMult *
    (1 + heatBonus) *
    freezePenalty;

  const gross = emptyResources();
  for (const building of buildings) {
    if (!building.produces) continue;
    const level = levels[building.id];
    if (level <= 0) continue;
    if (building.id === "furnace" && resources.coal <= 0) continue;
    gross[building.produces.resource] +=
      level * building.produces.perLevel * globalMult;
  }

  const foodUpkeep =
    population * 0.05 * (1 - Math.min(0.6, levels.canteen * 0.04));

  const shield =
    1 -
    Math.min(0.4, levels.bonfire * 0.02) -
    Math.min(0.5, levels.watchtower * 0.05);
  const blizzardDrain =
    (2 + population * 0.12 + total * 0.25) * Math.max(0.15, shield);

  const furnaceCoal = resources.coal > 0 ? levels.furnace * 0.2 : 0;
  const coalUpkeep = furnaceCoal + (state.blizzardActive ? blizzardDrain : 0);

  const net = { ...gross };
  net.food = gross.food - foodUpkeep;
  net.coal = gross.coal - coalUpkeep;

  return {
    totalLevels: total,
    campLevel: 1 + Math.floor(total / 8),
    capacity,
    globalMult,
    heatBonus,
    laborMult,
    gross,
    net,
    foodUpkeep,
    coalUpkeep,
    blizzardDrain,
    offlineCapHours: OFFLINE_BASE_HOURS + levels.watchtower,
    tapPower: (1 + levels.workshop * 0.25) * (1 + state.embers * 0.15),
    migrationReward: migrationReward(total),
  };
};

export const migrationReward = (total: number) =>
  total < MIGRATION_UNLOCK_LEVELS
    ? 0
    : Math.max(1, Math.floor((total - MIGRATION_UNLOCK_LEVELS) / 25) + 1);

/** 1ティック進める。dt は秒。state は破壊的に更新した新しいオブジェクトを返す。 */
export const step = (previous: GameState, dt: number): GameState => {
  const state: GameState = {
    ...previous,
    resources: { ...previous.resources },
    levels: { ...previous.levels },
  };

  state.heat = Math.max(0, state.heat - dt * 3.2);

  const derived = computeDerived(state);

  for (const id of RESOURCE_IDS) {
    state.resources[id] = Math.max(0, state.resources[id] + derived.net[id] * dt);
  }

  // 食料が尽きると生存者が減り、余っていれば集まってくる。
  if (state.resources.food <= 0 && derived.net.food < 0) {
    state.population = Math.max(1, state.population - dt * 0.2);
  } else if (state.population < derived.capacity) {
    // 空きが多いほど早く人が集まる（避難所を建てた直後の伸びを気持ちよくする）
    const room = derived.capacity - state.population;
    const speed =
      Math.max(0.04, room * 0.025) * (1 + state.levels.canteen * 0.08);
    state.population = Math.min(derived.capacity, state.population + dt * speed);
  } else {
    state.population = Math.min(state.population, derived.capacity);
  }

  if (derived.totalLevels >= BLIZZARD_UNLOCK_LEVELS) {
    state.blizzardTimer -= dt;
    if (state.blizzardTimer <= 0) {
      if (state.blizzardActive) {
        state.blizzardActive = false;
        state.freezing = false;
        state.blizzardTimer = BLIZZARD_INTERVAL;
        state.blizzardsSurvived += 1;
      } else {
        state.blizzardActive = true;
        state.blizzardTimer = BLIZZARD_DURATION;
      }
    }
  }

  state.freezing =
    state.blizzardActive && state.resources.coal <= 0 && derived.net.coal < 0;
  if (state.freezing) {
    state.population = Math.max(1, state.population - dt * 0.25);
    state.heat = Math.max(0, state.heat - dt * 4);
  }

  state.playTime += dt;
  state.lastSeen = Date.now();
  return state;
};

export type OfflineReport = {
  seconds: number;
  gains: Resources;
  cappedHours: number;
};

export const applyOffline = (
  state: GameState,
  now: number,
): { state: GameState; report: OfflineReport | null } => {
  const elapsed = (now - state.lastSeen) / 1000;
  if (!Number.isFinite(elapsed) || elapsed < 60) {
    return { state: { ...state, lastSeen: now }, report: null };
  }

  const derived = computeDerived({ ...state, heat: 0, blizzardActive: false });
  const capped = Math.min(elapsed, derived.offlineCapHours * 3600);

  const next: GameState = {
    ...state,
    resources: { ...state.resources },
    heat: 0,
    blizzardActive: false,
    blizzardTimer: BLIZZARD_INTERVAL,
    freezing: false,
    lastSeen: now,
    playTime: state.playTime + capped,
  };

  // 留守のあいだは生産だけが進み、吹雪は焚き火が食い止めたものとして扱う。
  // 食料は生存者ぶんだけ消費される。
  const eaten = derived.foodUpkeep * capped * OFFLINE_EFFICIENCY;
  const gains = emptyResources();
  for (const id of RESOURCE_IDS) {
    const gain = derived.gross[id] * capped * OFFLINE_EFFICIENCY;
    gains[id] = id === "food" ? gain - eaten : gain;
    next.resources[id] = Math.max(0, next.resources[id] + gains[id]);
  }

  return {
    state: next,
    report: { seconds: capped, gains, cappedHours: derived.offlineCapHours },
  };
};

export const costFor = (id: BuildingId, level: number, count: number): Cost => {
  const building = buildingById.get(id);
  if (!building || count <= 0) return {};
  const { growth } = building;
  const factor =
    growth === 1
      ? count
      : (Math.pow(growth, level) * (Math.pow(growth, count) - 1)) / (growth - 1);
  const cost: Cost = {};
  for (const [resource, amount] of Object.entries(building.baseCost)) {
    cost[resource as ResourceId] = Math.ceil(amount * factor);
  }
  return cost;
};

export const canAfford = (resources: Resources, cost: Cost) =>
  RESOURCE_IDS.every((id) => resources[id] >= (cost[id] ?? 0));

export const maxAffordable = (
  resources: Resources,
  id: BuildingId,
  level: number,
  limit = 500,
) => {
  let count = 0;
  while (count < limit) {
    if (!canAfford(resources, costFor(id, level, count + 1))) break;
    count += 1;
  }
  return count;
};

export const purchase = (
  state: GameState,
  id: BuildingId,
  count: number,
): GameState | null => {
  if (count <= 0) return null;
  const cost = costFor(id, state.levels[id], count);
  if (!canAfford(state.resources, cost)) return null;
  const resources = { ...state.resources };
  for (const resource of RESOURCE_IDS) {
    resources[resource] -= cost[resource] ?? 0;
  }
  return {
    ...state,
    resources,
    levels: { ...state.levels, [id]: state.levels[id] + count },
  };
};

export const stoke = (state: GameState): { state: GameState; gained: Cost } => {
  const derived = computeDerived(state);
  const gained: Cost = {
    wood: (1 + derived.gross.wood * 1.5) * derived.tapPower,
  };
  if (state.levels.mine > 0) {
    gained.coal = (0.2 + derived.gross.coal * 1.2) * derived.tapPower;
  }
  const resources = { ...state.resources };
  for (const [resource, amount] of Object.entries(gained)) {
    resources[resource as ResourceId] += amount;
  }
  return {
    state: {
      ...state,
      resources,
      heat: Math.min(100, state.heat + 7 + state.levels.workshop * 0.5),
      taps: state.taps + 1,
    },
    gained,
  };
};

export const migrate = (state: GameState): GameState | null => {
  const reward = migrationReward(totalLevels(state.levels));
  if (reward <= 0) return null;
  const fresh = createState(state.embers + reward, state.migrations + 1);
  return {
    ...fresh,
    blizzardsSurvived: state.blizzardsSurvived,
    taps: state.taps,
    playTime: state.playTime,
    startedAt: state.startedAt,
  };
};
