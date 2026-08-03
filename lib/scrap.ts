export type ScrapResource =
  | "scrap"
  | "sorted"
  | "crushed"
  | "washed"
  | "molten"
  | "ingot"
  | "parts"
  | "robots";

export type MachineId =
  | "collector"
  | "sorter"
  | "crusher"
  | "washer"
  | "furnace"
  | "refinery"
  | "fabricator"
  | "assembler"
  | "shipping";

export type ScrapState = {
  version: 1;
  credits: number;
  resources: Record<ScrapResource, number>;
  levels: Record<MachineId, number>;
  automated: MachineId[];
  unlocked: number;
  totalActions: number;
  lastRun: Record<MachineId, number>;
  lastSeen: number;
};

export type ScrapPersisted = Omit<ScrapState, "lastRun"> & {
  lastRun?: Partial<Record<MachineId, number>>;
};

export type MachineDef = {
  id: MachineId;
  name: string;
  short: string;
  icon: string;
  input?: ScrapResource;
  output?: ScrapResource;
  baseCycle: number;
  autoCredits: number;
  autoParts?: number;
  autoRobots?: number;
};

export const machines: MachineDef[] = [
  {
    id: "collector",
    name: "スクラップ回収",
    short: "回収ドローン",
    icon: "🧲",
    output: "scrap",
    baseCycle: 2400,
    autoCredits: 60,
  },
  {
    id: "sorter",
    name: "素材選別",
    short: "自動選別機",
    icon: "🗂️",
    input: "scrap",
    output: "sorted",
    baseCycle: 2800,
    autoCredits: 120,
  },
  {
    id: "crusher",
    name: "破砕",
    short: "油圧クラッシャー",
    icon: "⚙️",
    input: "sorted",
    output: "crushed",
    baseCycle: 3200,
    autoCredits: 240,
  },
  {
    id: "washer",
    name: "高圧洗浄",
    short: "洗浄ライン",
    icon: "💦",
    input: "crushed",
    output: "washed",
    baseCycle: 3600,
    autoCredits: 480,
  },
  {
    id: "furnace",
    name: "溶解",
    short: "電気溶鉱炉",
    icon: "🔥",
    input: "washed",
    output: "molten",
    baseCycle: 4200,
    autoCredits: 900,
    autoParts: 4,
  },
  {
    id: "refinery",
    name: "精錬・鋳造",
    short: "精錬プレス",
    icon: "🏭",
    input: "molten",
    output: "ingot",
    baseCycle: 4800,
    autoCredits: 1800,
    autoParts: 8,
  },
  {
    id: "fabricator",
    name: "部品加工",
    short: "多軸加工機",
    icon: "🔩",
    input: "ingot",
    output: "parts",
    baseCycle: 5400,
    autoCredits: 3600,
    autoParts: 15,
  },
  {
    id: "assembler",
    name: "ロボット組立",
    short: "組立アーム",
    icon: "🤖",
    input: "parts",
    output: "robots",
    baseCycle: 6500,
    autoCredits: 7200,
    autoRobots: 2,
  },
  {
    id: "shipping",
    name: "出荷・再投資",
    short: "自動出荷ゲート",
    icon: "🚀",
    input: "robots",
    baseCycle: 7200,
    autoCredits: 14000,
    autoRobots: 5,
  },
];

export const resourceLabels: Record<ScrapResource, { name: string; icon: string }> = {
  scrap: { name: "宇宙ゴミ", icon: "🪨" },
  sorted: { name: "選別材", icon: "🧱" },
  crushed: { name: "破砕材", icon: "🔸" },
  washed: { name: "洗浄材", icon: "💠" },
  molten: { name: "溶融金属", icon: "🟠" },
  ingot: { name: "インゴット", icon: "▰" },
  parts: { name: "機械部品", icon: "⚙️" },
  robots: { name: "作業ロボ", icon: "🤖" },
};

const machineIds = machines.map((machine) => machine.id);

const emptyResources = (): Record<ScrapResource, number> => ({
  scrap: 0,
  sorted: 0,
  crushed: 0,
  washed: 0,
  molten: 0,
  ingot: 0,
  parts: 0,
  robots: 0,
});

const emptyLevels = (): Record<MachineId, number> =>
  Object.fromEntries(machineIds.map((id) => [id, 0])) as Record<MachineId, number>;

const emptyTimers = (now: number): Record<MachineId, number> =>
  Object.fromEntries(machineIds.map((id) => [id, now])) as Record<MachineId, number>;

export const createScrapState = (now = Date.now()): ScrapState => ({
  version: 1,
  credits: 35,
  resources: emptyResources(),
  levels: emptyLevels(),
  automated: [],
  unlocked: 1,
  totalActions: 0,
  lastRun: emptyTimers(now),
  lastSeen: now,
});

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;

export const fromScrapPersisted = (raw: unknown, now = Date.now()): ScrapState => {
  if (!raw || typeof raw !== "object") return createScrapState(now);
  const value = raw as Partial<ScrapPersisted>;
  const state = createScrapState(now);
  state.credits = finite(value.credits, 35);
  for (const key of Object.keys(state.resources) as ScrapResource[]) {
    state.resources[key] = finite(value.resources?.[key]);
  }
  for (const id of machineIds) {
    state.levels[id] = Math.min(30, Math.floor(finite(value.levels?.[id])));
    state.lastRun[id] = finite(value.lastRun?.[id], finite(value.lastSeen, now));
  }
  state.automated = Array.isArray(value.automated)
    ? value.automated.filter((id): id is MachineId => machineIds.includes(id as MachineId))
    : [];
  state.unlocked = Math.max(1, Math.min(machines.length, Math.floor(finite(value.unlocked, 1))));
  state.totalActions = Math.floor(finite(value.totalActions));
  state.lastSeen = finite(value.lastSeen, now);
  return state;
};

export const toScrapPersisted = (state: ScrapState): ScrapPersisted => ({
  version: 1,
  credits: state.credits,
  resources: { ...state.resources },
  levels: { ...state.levels },
  automated: [...state.automated],
  unlocked: state.unlocked,
  totalActions: state.totalActions,
  lastRun: { ...state.lastRun },
  lastSeen: state.lastSeen,
});

export const cloneScrap = (state: ScrapState): ScrapState => ({
  ...state,
  resources: { ...state.resources },
  levels: { ...state.levels },
  automated: [...state.automated],
  lastRun: { ...state.lastRun },
});

export const batchSize = (state: ScrapState, id: MachineId) =>
  1 + Math.floor(state.levels[id] * 0.65);

export const cycleMs = (state: ScrapState, machine: MachineDef) =>
  Math.max(650, machine.baseCycle / (1 + state.levels[machine.id] * 0.16));

export const upgradeCost = (state: ScrapState, machine: MachineDef) =>
  Math.ceil(22 * (machines.indexOf(machine) + 1) * Math.pow(1.72, state.levels[machine.id]));

const availableCycles = (state: ScrapState, machine: MachineDef, requested: number) => {
  if (!machine.input) return requested;
  return Math.min(requested, Math.floor(state.resources[machine.input] / batchSize(state, machine.id)));
};

const process = (state: ScrapState, machine: MachineDef, requestedCycles: number) => {
  const cycles = availableCycles(state, machine, requestedCycles);
  if (cycles <= 0) return 0;
  const amount = batchSize(state, machine.id) * cycles;
  if (machine.input) state.resources[machine.input] -= amount;
  if (machine.output) {
    state.resources[machine.output] += amount;
  } else {
    state.credits += amount * 650;
  }
  if (machine.id === "collector") state.credits += cycles;
  state.totalActions += cycles;
  const index = machines.indexOf(machine);
  if (index + 1 < machines.length && state.unlocked < index + 2) {
    state.unlocked = index + 2;
  }
  return cycles;
};

export const runManual = (current: ScrapState, id: MachineId): ScrapState => {
  const state = cloneScrap(current);
  const machine = machines.find((item) => item.id === id);
  if (!machine || machines.indexOf(machine) >= state.unlocked) return state;
  process(state, machine, 1);
  state.lastSeen = Date.now();
  return state;
};

export const canAutomate = (state: ScrapState, machine: MachineDef) =>
  state.credits >= machine.autoCredits &&
  state.resources.parts >= (machine.autoParts ?? 0) &&
  state.resources.robots >= (machine.autoRobots ?? 0);

export const buyAutomation = (current: ScrapState, id: MachineId): ScrapState => {
  if (current.automated.includes(id)) return current;
  const machine = machines.find((item) => item.id === id);
  if (!machine || !canAutomate(current, machine)) return current;
  const state = cloneScrap(current);
  state.credits -= machine.autoCredits;
  state.resources.parts -= machine.autoParts ?? 0;
  state.resources.robots -= machine.autoRobots ?? 0;
  state.automated.push(id);
  state.lastRun[id] = Date.now();
  state.lastSeen = Date.now();
  return state;
};

export const buyUpgrade = (current: ScrapState, id: MachineId): ScrapState => {
  const machine = machines.find((item) => item.id === id);
  if (!machine) return current;
  const cost = upgradeCost(current, machine);
  if (current.credits < cost || current.levels[id] >= 30) return current;
  const state = cloneScrap(current);
  state.credits -= cost;
  state.levels[id] += 1;
  state.lastSeen = Date.now();
  return state;
};

export const tickScrap = (current: ScrapState, now = Date.now()): ScrapState => {
  const state = cloneScrap(current);
  for (const machine of machines) {
    if (!state.automated.includes(machine.id)) {
      state.lastRun[machine.id] = now;
      continue;
    }
    const elapsed = Math.max(0, Math.min(8 * 60 * 60 * 1000, now - state.lastRun[machine.id]));
    const cycles = Math.min(10000, Math.floor(elapsed / cycleMs(state, machine)));
    if (cycles <= 0) continue;
    process(state, machine, cycles);
    state.lastRun[machine.id] = now;
  }
  state.lastSeen = now;
  return state;
};

export const completedLines = (state: ScrapState) => state.automated.length;

export const bottleneck = (state: ScrapState): string => {
  const open = machines.slice(0, state.unlocked);
  for (let i = open.length - 1; i >= 1; i -= 1) {
    const machine = open[i];
    if (machine.input && state.resources[machine.input] <= 0) {
      return `${open[i - 1].name}が追いついていません`;
    }
  }
  const manual = open.find((machine) => !state.automated.includes(machine.id));
  if (manual) return `${manual.name}を自動化するとラインが伸びます`;
  return "ラインは順調に稼働中です";
};
