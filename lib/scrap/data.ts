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

export const SCRAP_WORLD = { w: 1180, h: 820 };
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const SOURCE_POS: Vec = { x: 88, y: 245 };
export const HQ_POS: Vec = { x: 310, y: 470 };

export const resources: Record<
  ResourceId,
  { name: string; short: string; icon: string; color: string }
> = {
  raw: { name: "宇宙ゴミ", short: "ゴミ", icon: "🗑️", color: "#9ca3af" },
  sorted: { name: "選別材", short: "選別", icon: "🧲", color: "#7dd3fc" },
  crushed: { name: "破砕材", short: "破砕", icon: "🪨", color: "#c4b5a5" },
  washed: { name: "洗浄材", short: "洗浄", icon: "💧", color: "#67e8f9" },
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
    pos: { x: 285, y: 245 },
    cycleMs: 1050,
    unlockCost: 0,
    autoCost: 90,
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
    pos: { x: 505, y: 245 },
    cycleMs: 2200,
    unlockCost: 60,
    autoCost: 220,
    district: 1,
    art: "crusher",
  },
  {
    id: "wash",
    name: "高圧洗浄槽",
    short: "洗浄",
    icon: "🚿",
    input: "crushed",
    output: "washed",
    pos: { x: 725, y: 245 },
    cycleMs: 2700,
    unlockCost: 260,
    autoCost: 650,
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
    pos: { x: 945, y: 245 },
    cycleMs: 3200,
    unlockCost: 900,
    autoCost: 1800,
    district: 2,
    art: "furnace",
  },
  {
    id: "refine",
    name: "真空精錬炉",
    short: "精錬",
    icon: "🧪",
    input: "molten",
    output: "ingot",
    pos: { x: 945, y: 565 },
    cycleMs: 3800,
    unlockCost: 3000,
    autoCost: 4800,
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
    pos: { x: 725, y: 565 },
    cycleMs: 4300,
    unlockCost: 9500,
    autoCost: 13500,
    district: 3,
    art: "press",
  },
  {
    id: "robot",
    name: "ロボット組立台",
    short: "組立",
    icon: "🤖",
    input: "parts",
    output: "robots",
    pos: { x: 505, y: 565 },
    cycleMs: 5000,
    unlockCost: 30000,
    autoCost: 36000,
    district: 4,
    art: "assembly",
  },
];

export const machineById = new Map(machines.map((machine) => [machine.id, machine]));

export const resourceRecord = (): Record<ResourceId, number> => ({
  raw: 6,
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
