export type ResourceId =
  | "raw"
  | "sorted"
  | "crushed"
  | "washed"
  | "molten"
  | "ingot"
  | "parts"
  | "robots";

export type MachineId =
  | "sort"
  | "crush"
  | "wash"
  | "melt"
  | "refine"
  | "parts"
  | "robot";

export type Vec = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

export type MachineDef = {
  id: MachineId;
  name: string;
  short: string;
  icon: string;
  input: ResourceId;
  output: ResourceId;
  pos: Vec;
  cycleMs: number;
  unlockCost: number;
  autoCost: number;
  district: 1 | 2 | 3 | 4;
  art: "sort" | "crusher" | "washer" | "furnace" | "refinery" | "press" | "assembly";
};

export type Contract = {
  id: string;
  name: string;
  detail: string;
  resource: ResourceId;
  amount: number;
  reward: number;
  restoration: number;
};

export type OfflineReport = {
  elapsedMs: number;
  produced: number;
  delivered: number;
  credits: number;
  restoration: number;
  bottleneck: string;
};

/** 既存ステージと同じく、スマホ横幅360を1画面の基準にする。 */
export const SCRAP_VIEW_WIDTH = 360;
export const SCRAP_WORLD = { w: 720, h: 960 };
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

/** 第一区画は1画面に収める。 */
export const SOURCE_POS: Vec = { x: 70, y: 170 };
export const HQ_POS: Vec = { x: 180, y: 318 };

export const sourcePickupPos = (): Vec => ({ x: SOURCE_POS.x, y: SOURCE_POS.y + 66 });
export const machineInputPos = (machine: MachineDef): Vec => ({
  x: machine.pos.x - 48,
  y: machine.pos.y + 34,
});
export const machineOutputPos = (machine: MachineDef): Vec => ({
  x: machine.pos.x + 48,
  y: machine.pos.y + 34,
});
export const hqDropPos = (): Vec => ({ x: HQ_POS.x, y: HQ_POS.y + 64 });

export const resources: Record<
  ResourceId,
  { name: string; short: string; icon: string; color: string }
> = {
  raw: { name: "宇宙ゴミ", short: "ゴミ", icon: "🗑️", color: "#9ca3af" },
  sorted: { name: "外壁補修材", short: "補修材", icon: "🪨", color: "#c4b5fd" },
  crushed: { name: "破砕材", short: "破砕材", icon: "🔩", color: "#c4b5a5" },
  washed: { name: "再生資材", short: "再生材", icon: "💎", color: "#67e8f9" },
  molten: { name: "溶融金属", short: "溶融", icon: "🔥", color: "#fb923c" },
  ingot: { name: "再生インゴット", short: "鋼材", icon: "🧱", color: "#cbd5e1" },
  parts: { name: "機械部品", short: "部品", icon: "⚙️", color: "#fde68a" },
  robots: { name: "作業ロボット", short: "ロボ", icon: "🤖", color: "#c4b5fd" },
};

export const machines: MachineDef[] = [
  {
    id: "sort",
    name: "磁力選別機",
    short: "選別",
    icon: "🧲",
    input: "raw",
    output: "sorted",
    pos: { x: 250, y: 170 },
    cycleMs: 1000,
    unlockCost: 0,
    autoCost: 120,
    district: 1,
    art: "sort",
  },
  {
    id: "crush",
    name: "油圧破砕機",
    short: "破砕",
    icon: "⚒️",
    input: "sorted",
    output: "crushed",
    pos: { x: 115, y: 635 },
    cycleMs: 2100,
    unlockCost: 900,
    autoCost: 1200,
    district: 2,
    art: "crusher",
  },
  {
    id: "wash",
    name: "高圧洗浄槽",
    short: "洗浄",
    icon: "🚿",
    input: "crushed",
    output: "washed",
    pos: { x: 275, y: 635 },
    cycleMs: 2500,
    unlockCost: 0,
    autoCost: 1800,
    district: 2,
    art: "washer",
  },
  {
    id: "melt",
    name: "電気溶解炉",
    short: "溶解",
    icon: "🔥",
    input: "washed",
    output: "molten",
    pos: { x: 485, y: 170 },
    cycleMs: 3100,
    unlockCost: 12000,
    autoCost: 18000,
    district: 3,
    art: "furnace",
  },
  {
    id: "refine",
    name: "真空精錬炉",
    short: "精錬",
    icon: "🧪",
    input: "molten",
    output: "ingot",
    pos: { x: 635, y: 170 },
    cycleMs: 3700,
    unlockCost: 0,
    autoCost: 28000,
    district: 3,
    art: "refinery",
  },
  {
    id: "parts",
    name: "部品プレス機",
    short: "部品化",
    icon: "⚙️",
    input: "ingot",
    output: "parts",
    pos: { x: 485, y: 635 },
    cycleMs: 4200,
    unlockCost: 140000,
    autoCost: 220000,
    district: 4,
    art: "press",
  },
  {
    id: "robot",
    name: "ロボット組立台",
    short: "組立",
    icon: "🤖",
    input: "parts",
    output: "robots",
    pos: { x: 635, y: 635 },
    cycleMs: 4900,
    unlockCost: 0,
    autoCost: 360000,
    district: 4,
    art: "assembly",
  },
];

export const machineById = new Map(machines.map((machine) => [machine.id, machine]));

export const districtBounds = (unlocked: number): Rect => {
  if (unlocked >= 6) return { x0: 360, y0: 480, x1: 720, y1: 960 };
  if (unlocked >= 4) return { x0: 360, y0: 0, x1: 720, y1: 480 };
  if (unlocked >= 3) return { x0: 0, y0: 480, x1: 360, y1: 960 };
  return { x0: 0, y0: 0, x1: 360, y1: 480 };
};

export const worldBounds = (unlocked: number): Rect => {
  if (unlocked >= 6) return { x0: 0, y0: 0, x1: 720, y1: 960 };
  if (unlocked >= 4) return { x0: 0, y0: 0, x1: 720, y1: 480 };
  if (unlocked >= 3) return { x0: 0, y0: 0, x1: 360, y1: 960 };
  return { x0: 0, y0: 0, x1: 360, y1: 480 };
};

export const resourceRecord = (): Record<ResourceId, number> => ({
  raw: 12,
  sorted: 0,
  crushed: 0,
  washed: 0,
  molten: 0,
  ingot: 0,
  parts: 0,
  robots: 0,
});

export const machineRecord = (value = 0): Record<MachineId, number> => ({
  sort: value,
  crush: value,
  wash: value,
  melt: value,
  refine: value,
  parts: value,
  robot: value,
});
