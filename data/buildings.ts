export const RESOURCE_IDS = ["wood", "food", "coal", "steel"] as const;

export type ResourceId = (typeof RESOURCE_IDS)[number];

export type Cost = Partial<Record<ResourceId, number>>;

export type ResourceMeta = {
  id: ResourceId;
  name: string;
  icon: string;
};

export const resources: ResourceMeta[] = [
  { id: "wood", name: "木材", icon: "🪵" },
  { id: "food", name: "食料", icon: "🍖" },
  { id: "coal", name: "石炭", icon: "🪨" },
  { id: "steel", name: "鋼材", icon: "⚙️" },
];

export const resourceById = new Map(
  resources.map((resource) => [resource.id, resource]),
);

export const BUILDING_IDS = [
  "bonfire",
  "lumber",
  "hunter",
  "mine",
  "shelter",
  "canteen",
  "furnace",
  "workshop",
  "watchtower",
] as const;

export type BuildingId = (typeof BUILDING_IDS)[number];

export type Building = {
  id: BuildingId;
  name: string;
  icon: string;
  summary: string;
  effect: (level: number) => string;
  produces?: { resource: ResourceId; perLevel: number };
  baseCost: Cost;
  growth: number;
  /** 建物の合計レベルがこの値に達すると解禁される */
  unlockAt: number;
};

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

export const buildings: Building[] = [
  {
    id: "bonfire",
    name: "焚き火",
    icon: "🔥",
    summary: "拠点の心臓。すべての生産を底上げし、吹雪から拠点を守る。",
    effect: (level) =>
      `全生産 +${percent(level * 0.08)} ／ 吹雪の消耗 -${percent(
        Math.min(0.4, level * 0.02),
      )}`,
    baseCost: { wood: 30, coal: 4 },
    growth: 1.17,
    unlockAt: 0,
  },
  {
    id: "lumber",
    name: "木こり小屋",
    icon: "🪓",
    summary: "枯れ木を切り出して木材を集める。すべての建設の土台。",
    effect: (level) => `木材 +${(level * 0.6).toFixed(1)}/秒`,
    produces: { resource: "wood", perLevel: 0.6 },
    baseCost: { wood: 20 },
    growth: 1.15,
    unlockAt: 0,
  },
  {
    id: "hunter",
    name: "狩猟小屋",
    icon: "🏹",
    summary: "雪原で獲物を狩る。食料がなければ生存者は増えない。",
    effect: (level) => `食料 +${(level * 0.45).toFixed(2)}/秒`,
    produces: { resource: "food", perLevel: 0.45 },
    baseCost: { wood: 45 },
    growth: 1.16,
    unlockAt: 2,
  },
  {
    id: "mine",
    name: "炭鉱",
    icon: "⛏️",
    summary: "石炭を掘る。吹雪をしのぐ燃料になる。",
    effect: (level) => `石炭 +${(level * 0.32).toFixed(2)}/秒`,
    produces: { resource: "coal", perLevel: 0.32 },
    baseCost: { wood: 140, food: 40 },
    growth: 1.17,
    unlockAt: 6,
  },
  {
    id: "shelter",
    name: "避難所",
    icon: "⛺",
    summary: "生存者の寝床。人口上限が増え、労働力が上がる。",
    effect: (level) => `人口上限 +${level * 3}人`,
    baseCost: { wood: 220, coal: 25 },
    growth: 1.19,
    unlockAt: 10,
  },
  {
    id: "canteen",
    name: "食堂",
    icon: "🍲",
    summary: "配給を効率化する。食料の消費が減り、生存者が早く集まる。",
    effect: (level) =>
      `食料消費 -${percent(Math.min(0.6, level * 0.04))} ／ 人口増加 +${percent(
        level * 0.08,
      )}`,
    baseCost: { wood: 600, food: 250 },
    growth: 1.2,
    unlockAt: 18,
  },
  {
    id: "furnace",
    name: "製鉄所",
    icon: "🏭",
    summary: "石炭を燃やして鋼材を作る。石炭が尽きると停止する。",
    effect: (level) =>
      `鋼材 +${(level * 0.07).toFixed(2)}/秒 ／ 石炭 -${(level * 0.2).toFixed(
        2,
      )}/秒`,
    produces: { resource: "steel", perLevel: 0.07 },
    baseCost: { wood: 2400, coal: 800 },
    growth: 1.22,
    unlockAt: 30,
  },
  {
    id: "workshop",
    name: "工房",
    icon: "🔧",
    summary: "道具を改良する。手作業の効率と全生産が上がる。",
    effect: (level) =>
      `全生産 +${percent(level * 0.03)} ／ 手作業 +${percent(level * 0.25)}`,
    baseCost: { wood: 6000, steel: 40 },
    growth: 1.23,
    unlockAt: 44,
  },
  {
    id: "watchtower",
    name: "見張り台",
    icon: "🗼",
    summary: "吹雪をいち早く察知する。被害が減り、放置できる時間も延びる。",
    effect: (level) =>
      `吹雪の消耗 -${percent(Math.min(0.5, level * 0.05))} ／ 放置上限 +${level}時間`,
    baseCost: { wood: 15000, steel: 220 },
    growth: 1.24,
    unlockAt: 60,
  },
];

export const buildingById = new Map(
  buildings.map((building) => [building.id, building]),
);
