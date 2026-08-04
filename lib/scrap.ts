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

const machineById = new Map(machines.map((machine) => [machine.id, machine]));

const resourceRecord = (): Record<ResourceId, number> => ({
  raw: 6,
  sorted: 0,
  crushed: 0,
  washed: 0,
  molten: 0,
  ingot: 0,
  parts: 0,
  robots: 0,
});

const machineRecord = (value = 0): Record<MachineId, number> => ({
  sort: value,
  crush: value,
  wash: value,
  melt: value,
  refine: value,
  parts: value,
  robot: value,
});

export type ScrapState = {
  version: 5;
  credits: number;
  resources: Record<ResourceId, number>;
  inputs: Record<MachineId, number>;
  progress: Record<MachineId, number>;
  robotProgress: Record<MachineId, number> & { ship: number };
  levels: Record<MachineId, number>;
  unlocked: number;
  automated: string[];
  carry: { kind: ResourceId | null; amount: number };
  carryLevel: number;
  speedLevel: number;
  paid: Record<string, number>;
  player: Vec;
  sourceProgress: number;
  orderDelivered: number;
  contractsCompleted: number;
  restoration: number;
  tutorialStep: number;
  totalActions: number;
  totalProduced: number;
  totalDelivered: number;
  lastSeen: number;
  offlineReport?: OfflineReport;
};

export type ScrapPersisted = Partial<Omit<ScrapState, "offlineReport">> & {
  version?: number;
  bag?: Partial<Record<ResourceId, number>>;
  carry?: ScrapState["carry"] | { kind?: ResourceId | null; amount?: number };
  totalSold?: number;
};

export const createScrapState = (): ScrapState => ({
  version: 5,
  credits: 0,
  resources: resourceRecord(),
  inputs: machineRecord(),
  progress: machineRecord(),
  robotProgress: { ...machineRecord(), ship: 0 },
  levels: machineRecord(),
  unlocked: 1,
  automated: [],
  carry: { kind: null, amount: 0 },
  carryLevel: 0,
  speedLevel: 0,
  paid: {},
  player: { x: 150, y: 365 },
  sourceProgress: 0,
  orderDelivered: 0,
  contractsCompleted: 0,
  restoration: 0,
  tutorialStep: 0,
  totalActions: 0,
  totalProduced: 0,
  totalDelivered: 0,
  lastSeen: Date.now(),
});

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const safeResourceRecord = (value: unknown): Record<ResourceId, number> => {
  const base = resourceRecord();
  if (!value || typeof value !== "object") return base;
  for (const id of Object.keys(base) as ResourceId[]) {
    base[id] = Math.max(0, finite((value as Record<string, unknown>)[id], base[id]));
  }
  return base;
};

const safeMachineRecord = (value: unknown): Record<MachineId, number> => {
  const base = machineRecord();
  if (!value || typeof value !== "object") return base;
  for (const id of Object.keys(base) as MachineId[]) {
    base[id] = Math.max(0, finite((value as Record<string, unknown>)[id], 0));
  }
  return base;
};

const legacyCarry = (saved: ScrapPersisted, resourcesOut: Record<ResourceId, number>) => {
  const rawCarry = saved.carry;
  if (rawCarry && typeof rawCarry === "object" && "amount" in rawCarry) {
    const kind = rawCarry.kind && rawCarry.kind in resources ? rawCarry.kind : null;
    const amount = Math.max(0, Math.floor(finite(rawCarry.amount, 0)));
    return { kind: amount > 0 ? kind : null, amount: kind ? amount : 0 };
  }
  if (saved.bag && typeof saved.bag === "object") {
    let kind: ResourceId | null = null;
    let amount = 0;
    for (const id of Object.keys(resources) as ResourceId[]) {
      const count = Math.max(0, Math.floor(finite(saved.bag[id], 0)));
      if (count <= 0) continue;
      if (count > amount) {
        if (kind) resourcesOut[kind] += amount;
        kind = id;
        amount = count;
      } else {
        resourcesOut[id] += count;
      }
    }
    return { kind, amount };
  }
  return { kind: null, amount: 0 };
};

export const fromScrapPersisted = (saved: ScrapPersisted | undefined): ScrapState => {
  const base = createScrapState();
  if (!saved || typeof saved !== "object") return base;

  const savedResources = safeResourceRecord(saved.resources);
  const automated = Array.isArray(saved.automated)
    ? saved.automated.filter((id): id is string => typeof id === "string")
    : [];
  const unlocked = Math.max(
    1,
    Math.min(machines.length, Math.floor(finite(saved.unlocked, 1))),
  );
  const carry = legacyCarry(saved, savedResources);
  const migrated = saved.version !== 5;
  const oldSold = Math.max(0, Math.floor(finite(saved.totalSold, 0)));
  const tutorialStep = migrated
    ? automated.includes("sort")
      ? 6
      : unlocked >= 2
        ? 5
        : oldSold > 0
          ? 4
          : carry.kind === "sorted"
            ? 3
            : 0
    : Math.max(0, Math.min(6, Math.floor(finite(saved.tutorialStep, 0))));

  return {
    ...base,
    credits: Math.max(0, finite(saved.credits, 0)),
    resources: savedResources,
    inputs: safeMachineRecord(saved.inputs),
    progress: safeMachineRecord(saved.progress),
    robotProgress: {
      ...safeMachineRecord(saved.robotProgress),
      ship: Math.max(0, finite(saved.robotProgress?.ship, 0)),
    },
    levels: safeMachineRecord(saved.levels),
    unlocked,
    automated: Array.from(new Set(automated)),
    carry,
    carryLevel: Math.max(0, Math.min(8, Math.floor(finite(saved.carryLevel, 0)))),
    speedLevel: Math.max(0, Math.min(8, Math.floor(finite(saved.speedLevel, 0)))),
    paid: saved.paid && typeof saved.paid === "object" ? { ...saved.paid } : {},
    player: {
      x: Math.max(30, Math.min(SCRAP_WORLD.w - 30, finite(saved.player?.x, base.player.x))),
      y: Math.max(80, Math.min(SCRAP_WORLD.h - 30, finite(saved.player?.y, base.player.y))),
    },
    sourceProgress: Math.max(0, finite(saved.sourceProgress, 0)),
    orderDelivered: migrated ? 0 : Math.max(0, Math.floor(finite(saved.orderDelivered, 0))),
    contractsCompleted: migrated
      ? Math.floor(oldSold / 3)
      : Math.max(0, Math.floor(finite(saved.contractsCompleted, 0))),
    restoration: migrated
      ? Math.min(78, Math.max(0, (unlocked - 1) * 8 + Math.floor(oldSold / 8)))
      : Math.max(0, Math.min(100, finite(saved.restoration, 0))),
    tutorialStep,
    totalActions: Math.max(0, Math.floor(finite(saved.totalActions, 0))),
    totalProduced: migrated
      ? Math.max(0, Math.floor(finite(saved.totalActions, 0)))
      : Math.max(0, Math.floor(finite(saved.totalProduced, 0))),
    totalDelivered: migrated
      ? oldSold
      : Math.max(0, Math.floor(finite(saved.totalDelivered, 0))),
    lastSeen: Math.max(0, finite(saved.lastSeen, Date.now())),
  };
};

export const toScrapPersisted = (state: ScrapState): ScrapPersisted => {
  const { offlineReport: _offlineReport, ...persisted } = state;
  return persisted;
};

export const carryCapacity = (state: ScrapState) => 3 + state.carryLevel * 2;
export const carryTotal = (state: ScrapState) => state.carry.amount;
export const carryOf = (state: ScrapState, kind: ResourceId) =>
  state.carry.kind === kind ? state.carry.amount : 0;
export const topCarry = (state: ScrapState) => state.carry.kind;
export const moveSpeed = (state: ScrapState) => 140 * (1 + state.speedLevel * 0.09);
export const machineCapacity = (state: ScrapState, id: MachineId) =>
  4 + state.levels[id] * 2;
export const outputCapacity = (state: ScrapState, id: MachineId) =>
  6 + state.levels[id] * 2;
export const machineCycle = (state: ScrapState, id: MachineId) => {
  const machine = machineById.get(id)!;
  return machine.cycleMs / (1 + state.levels[id] * 0.18);
};
/** 生産倍率は廃止。全工程 1入力 → 1出力。 */
export const machineBatch = () => 1;
export const machineUnlocked = (state: ScrapState, id: MachineId) =>
  machines.findIndex((machine) => machine.id === id) < state.unlocked;
export const isAutomated = (state: ScrapState, id: MachineId | "ship") =>
  state.automated.includes(id);

export const upgradeCost = (state: ScrapState, id: MachineId) => {
  const index = machines.findIndex((machine) => machine.id === id);
  return Math.ceil((80 + index * 95) * Math.pow(1.55, state.levels[id]));
};
export const carryUpgradeCost = (state: ScrapState) =>
  Math.ceil(90 * Math.pow(1.7, state.carryLevel));
export const speedUpgradeCost = (state: ScrapState) =>
  Math.ceil(110 * Math.pow(1.72, state.speedLevel));
export const shipAutoCost = () => 65000;

export const contract = (state: ScrapState): Contract => {
  const index = Math.max(0, Math.min(machines.length - 1, state.unlocked - 1));
  const table: Omit<Contract, "id" | "resource">[] = [
    {
      name: "緊急選別資材",
      detail: "漂着ゴミから使える金属を回収する",
      amount: 3,
      reward: 160,
      restoration: 2,
    },
    {
      name: "外壁補修材",
      detail: "居住区の外壁を補強する",
      amount: 3,
      reward: 280,
      restoration: 3,
    },
    {
      name: "浄水設備資材",
      detail: "汚染水を処理する設備を直す",
      amount: 3,
      reward: 950,
      restoration: 4,
    },
    {
      name: "熱源再起動計画",
      detail: "停止した発電区画へ金属を送る",
      amount: 3,
      reward: 3200,
      restoration: 5,
    },
    {
      name: "都市骨格再建",
      detail: "再生インゴットで街の骨格を作る",
      amount: 3,
      reward: 10000,
      restoration: 7,
    },
    {
      name: "無人工場建設",
      detail: "自動工場の機械部品をそろえる",
      amount: 3,
      reward: 32000,
      restoration: 9,
    },
    {
      name: "惑星復旧ロボ派遣",
      detail: "作業ロボットを荒廃区域へ派遣する",
      amount: 2,
      reward: 85000,
      restoration: 12,
    },
  ];
  const latest = machines[index];
  return {
    id: `contract-${latest.id}`,
    resource: latest.output,
    ...table[index],
  };
};

export const currentDistrict = (state: ScrapState) => {
  if (state.unlocked >= 7) return { index: 4, name: "ロボット復旧基地" };
  if (state.unlocked >= 5) return { index: 3, name: "精密加工区画" };
  if (state.unlocked >= 3) return { index: 2, name: "素材再生区画" };
  return { index: 1, name: "漂着ゴミ処理場" };
};

export const restorationLabel = (state: ScrapState) => {
  if (state.restoration >= 100) return "再生完了";
  if (state.restoration >= 75) return "都市機能復旧";
  if (state.restoration >= 50) return "産業基盤再建";
  if (state.restoration >= 25) return "居住区復旧";
  return "緊急復旧中";
};

const cloneState = (state: ScrapState): ScrapState => ({
  ...state,
  resources: { ...state.resources },
  inputs: { ...state.inputs },
  progress: { ...state.progress },
  robotProgress: { ...state.robotProgress },
  levels: { ...state.levels },
  automated: [...state.automated],
  carry: { ...state.carry },
  paid: { ...state.paid },
  player: { ...state.player },
  offlineReport: state.offlineReport ? { ...state.offlineReport } : undefined,
});

const transportOne = (next: ScrapState, machine: MachineDef) => {
  if (!machineUnlocked(next, machine.id)) return false;
  const available = next.resources[machine.input];
  const room = machineCapacity(next, machine.id) - next.inputs[machine.id];
  if (available < 1 || room < 1) return false;
  next.resources[machine.input] -= 1;
  next.inputs[machine.id] += 1;
  return true;
};

const completeContract = (next: ScrapState) => {
  const active = contract(next);
  next.orderDelivered -= active.amount;
  next.credits += active.reward;
  next.restoration = Math.min(100, next.restoration + active.restoration);
  next.contractsCompleted += 1;
  if (next.tutorialStep === 3) next.tutorialStep = 4;
};

const deliverStock = (next: ScrapState, kind: ResourceId, amount: number) => {
  const active = contract(next);
  if (kind !== active.resource || amount <= 0) return 0;
  let moved = Math.min(amount, Math.floor(next.resources[kind]));
  if (moved <= 0) return 0;
  next.resources[kind] -= moved;
  const original = moved;
  while (moved > 0) {
    const room = active.amount - next.orderDelivered;
    const add = Math.min(room, moved);
    next.orderDelivered += add;
    next.totalDelivered += add;
    moved -= add;
    if (next.orderDelivered >= active.amount) completeContract(next);
    if (next.restoration >= 100) break;
  }
  return original - moved;
};

export const advanceScrap = (state: ScrapState, dtMs: number): ScrapState => {
  if (dtMs <= 0) return state;
  const next = cloneState(state);
  const dt = Math.min(dtMs, OFFLINE_CAP_MS);

  next.sourceProgress += dt;
  const sourceEvery = 1400;
  const sourceLimit = 18 + next.carryLevel * 2;
  while (next.sourceProgress >= sourceEvery && next.resources.raw < sourceLimit) {
    next.sourceProgress -= sourceEvery;
    next.resources.raw += 1;
  }
  if (next.resources.raw >= sourceLimit) {
    next.sourceProgress = Math.min(next.sourceProgress, sourceEvery);
  }

  for (const machine of machines) {
    if (!isAutomated(next, machine.id) || !machineUnlocked(next, machine.id)) continue;
    next.robotProgress[machine.id] += dt;
    const interval = Math.max(420, 1300 - next.levels[machine.id] * 70);
    while (next.robotProgress[machine.id] >= interval) {
      next.robotProgress[machine.id] -= interval;
      if (!transportOne(next, machine)) break;
    }
  }

  for (const machine of machines) {
    if (!machineUnlocked(next, machine.id)) continue;
    const limit = outputCapacity(next, machine.id);
    if (next.inputs[machine.id] <= 0 || next.resources[machine.output] >= limit) {
      next.progress[machine.id] = Math.min(next.progress[machine.id], machineCycle(next, machine.id));
      continue;
    }
    next.progress[machine.id] += dt;
    const cycle = machineCycle(next, machine.id);
    while (
      next.progress[machine.id] >= cycle &&
      next.inputs[machine.id] > 0 &&
      next.resources[machine.output] < limit
    ) {
      next.progress[machine.id] -= cycle;
      next.inputs[machine.id] -= 1;
      next.resources[machine.output] += 1;
      next.totalProduced += 1;
    }
  }

  if (isAutomated(next, "ship") && next.unlocked >= machines.length) {
    next.robotProgress.ship += dt;
    while (next.robotProgress.ship >= 1100 && next.resources.robots >= 1) {
      next.robotProgress.ship -= 1100;
      if (deliverStock(next, "robots", 1) <= 0) break;
    }
  }

  next.lastSeen = Date.now();
  delete next.offlineReport;
  return next;
};

export const tickScrap = (state: ScrapState, now = Date.now()): ScrapState => {
  const elapsed = Math.max(0, Math.min(OFFLINE_CAP_MS, now - state.lastSeen));
  if (elapsed < 1000) return { ...state, lastSeen: now, offlineReport: undefined };

  const beforeProduced = state.totalProduced;
  const beforeDelivered = state.totalDelivered;
  const beforeCredits = state.credits;
  const beforeRestoration = state.restoration;
  const steps = Math.max(1, Math.min(720, Math.ceil(elapsed / 1500)));
  const step = elapsed / steps;
  let next = state;
  for (let i = 0; i < steps; i += 1) next = advanceScrap(next, step);
  next.lastSeen = now;
  next.offlineReport = {
    elapsedMs: elapsed,
    produced: Math.max(0, next.totalProduced - beforeProduced),
    delivered: Math.max(0, next.totalDelivered - beforeDelivered),
    credits: Math.max(0, next.credits - beforeCredits),
    restoration: Math.max(0, next.restoration - beforeRestoration),
    bottleneck: bottleneck(next),
  };
  return next;
};

export const pickup = (state: ScrapState, kind: ResourceId, amount = 1): ScrapState => {
  if (state.resources[kind] < 1) return state;
  if (state.carry.kind && state.carry.kind !== kind) return state;
  const room = carryCapacity(state) - state.carry.amount;
  if (room <= 0) return state;
  const moved = Math.min(amount, room, Math.floor(state.resources[kind]));
  if (moved <= 0) return state;
  const next = cloneState(state);
  next.resources[kind] -= moved;
  next.carry = { kind, amount: next.carry.amount + moved };
  next.totalActions += moved;
  if (kind === "raw" && next.carry.amount >= 3 && next.tutorialStep === 0) {
    next.tutorialStep = 1;
  }
  if (kind === "sorted" && next.tutorialStep === 2) next.tutorialStep = 3;
  return next;
};

export const deposit = (state: ScrapState, id: MachineId, amount = 1): ScrapState => {
  const machine = machineById.get(id)!;
  if (!machineUnlocked(state, id) || state.carry.kind !== machine.input) return state;
  const room = machineCapacity(state, id) - state.inputs[id];
  const moved = Math.min(amount, room, state.carry.amount);
  if (moved <= 0) return state;
  const next = cloneState(state);
  next.inputs[id] += moved;
  next.carry.amount -= moved;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.totalActions += moved;
  if (id === "sort" && next.tutorialStep === 1) next.tutorialStep = 2;
  return next;
};

export const deliverContract = (state: ScrapState, amount = 1): ScrapState => {
  const active = contract(state);
  if (state.carry.kind !== active.resource || state.carry.amount <= 0) return state;
  const next = cloneState(state);
  let budget = Math.min(amount, next.carry.amount);
  while (budget > 0 && next.restoration < 100) {
    const room = active.amount - next.orderDelivered;
    const moved = Math.min(room, budget);
    next.orderDelivered += moved;
    next.totalDelivered += moved;
    next.carry.amount -= moved;
    next.totalActions += moved;
    budget -= moved;
    if (next.orderDelivered >= active.amount) completeContract(next);
  }
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  return next;
};

/** 旧UI互換。現在の復旧依頼に一致する完成品だけを納品する。 */
export const sellFinished = (state: ScrapState) => deliverContract(state, carryTotal(state));
export const sellCarried = (state: ScrapState, amount = 1) => deliverContract(state, amount);

export type Purchase = {
  id: string;
  label: string;
  detail: string;
  cost: number;
  pos: Vec;
  kind: "unlock" | "auto" | "upgrade" | "carry" | "speed" | "ship";
  machine?: MachineId;
};

export const purchases = (state: ScrapState): Purchase[] => {
  const list: Purchase[] = [];
  const nextMachine = machines[state.unlocked];
  if (nextMachine) {
    list.push({
      id: `unlock-${nextMachine.id}`,
      label: `${nextMachine.short}ライン建設`,
      detail: `${nextMachine.name}を建てて工程を増やす`,
      cost: nextMachine.unlockCost,
      pos: { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 },
      kind: "unlock",
      machine: nextMachine.id,
    });
  } else if (!isAutomated(state, "ship")) {
    list.push({
      id: "auto-ship",
      label: "派遣ドローン",
      detail: "完成ロボットを復旧現場へ自動派遣",
      cost: shipAutoCost(),
      pos: { x: HQ_POS.x + 65, y: HQ_POS.y + 96 },
      kind: "ship",
    });
  }

  const automationTarget = machines
    .slice(0, state.unlocked)
    .find((machine) => !isAutomated(state, machine.id));
  if (automationTarget) {
    list.push({
      id: `auto-${automationTarget.id}`,
      label: `${automationTarget.short}ロボ`,
      detail: `${resources[automationTarget.input].short}の投入を自動化`,
      cost: automationTarget.autoCost,
      pos: { x: automationTarget.pos.x - 54, y: automationTarget.pos.y + 108 },
      kind: "auto",
      machine: automationTarget.id,
    });
  }

  if (state.carryLevel < 3) {
    list.push({
      id: "carry",
      label: "大型コンテナ",
      detail: `運べる数 ${carryCapacity(state)} → ${carryCapacity(state) + 2}`,
      cost: carryUpgradeCost(state),
      pos: { x: HQ_POS.x - 70, y: HQ_POS.y + 96 },
      kind: "carry",
    });
  } else {
    const latest = machines[Math.max(0, state.unlocked - 1)];
    if (state.levels[latest.id] < 8) {
      list.push({
        id: `upgrade-${latest.id}`,
        label: `${latest.short}強化`,
        detail: `処理時間と保管量を改善（LV ${state.levels[latest.id] + 1}）`,
        cost: upgradeCost(state, latest.id),
        pos: { x: latest.pos.x + 54, y: latest.pos.y + 108 },
        kind: "upgrade",
        machine: latest.id,
      });
    } else if (state.speedLevel < 8) {
      list.push({
        id: "speed",
        label: "磁気ブーツ",
        detail: `移動速度 +${Math.round((state.speedLevel + 1) * 9)}%`,
        cost: speedUpgradeCost(state),
        pos: { x: HQ_POS.x - 70, y: HQ_POS.y + 96 },
        kind: "speed",
      });
    }
  }
  return list.slice(0, 3);
};

const applyPurchase = (state: ScrapState, purchase: Purchase): ScrapState => {
  const next = cloneState(state);
  delete next.paid[purchase.id];
  if (purchase.kind === "unlock" && purchase.machine) {
    const index = machines.findIndex((machine) => machine.id === purchase.machine);
    next.unlocked = Math.max(next.unlocked, index + 1);
    if (purchase.machine === "crush" && next.tutorialStep === 4) next.tutorialStep = 5;
  } else if (purchase.kind === "auto" && purchase.machine) {
    next.automated = Array.from(new Set([...next.automated, purchase.machine]));
    if (purchase.machine === "sort" && next.tutorialStep === 5) next.tutorialStep = 6;
  } else if (purchase.kind === "upgrade" && purchase.machine) {
    next.levels[purchase.machine] = Math.min(8, next.levels[purchase.machine] + 1);
  } else if (purchase.kind === "carry") {
    next.carryLevel = Math.min(8, next.carryLevel + 1);
  } else if (purchase.kind === "speed") {
    next.speedLevel = Math.min(8, next.speedLevel + 1);
  } else if (purchase.kind === "ship") {
    next.automated = Array.from(new Set([...next.automated, "ship"]));
  }
  next.totalActions += 1;
  return next;
};

export const payPurchase = (
  state: ScrapState,
  purchase: Purchase,
  dtMs: number,
): ScrapState => {
  const already = state.paid[purchase.id] ?? 0;
  if (already >= purchase.cost) return applyPurchase(state, purchase);
  if (state.credits <= 0) return state;
  const rate = Math.max(36, purchase.cost / 2.2);
  const amount = Math.min(state.credits, purchase.cost - already, (rate * dtMs) / 1000);
  if (amount <= 0) return state;
  const next = cloneState(state);
  next.credits -= amount;
  next.paid[purchase.id] = already + amount;
  if (next.paid[purchase.id] + 0.001 >= purchase.cost) return applyPurchase(next, purchase);
  return next;
};

export const purchaseRemaining = (state: ScrapState, purchase: Purchase) =>
  Math.max(0, purchase.cost - (state.paid[purchase.id] ?? 0));

export const objective = (state: ScrapState): string => {
  if (state.restoration >= 100) {
    return "惑星再生完了！ 自動工場を眺めるか、さらに効率を高めよう";
  }
  const tutorial = [
    "宇宙ゴミを3個拾おう",
    "磁力選別機の黄色い投入口へ運ぼう",
    "加工を待ち、緑の受取口で選別材を受け取ろう",
    "選別材3個を復旧本部へ納品しよう",
    "緑の建設枠で破砕機を建てよう",
    "選別機の作業ロボを雇って、投入を自動化しよう",
  ];
  if (state.tutorialStep < tutorial.length) return tutorial[state.tutorialStep];

  const active = contract(state);
  if (state.carry.kind) {
    if (state.carry.kind === active.resource) {
      return `復旧本部へ${resources[active.resource].short}を納品しよう`;
    }
    const nextMachine = machines.find(
      (machine) => machineUnlocked(state, machine.id) && machine.input === state.carry.kind,
    );
    if (nextMachine) return `${nextMachine.name}の黄色い投入口へ運ぼう`;
    return "手持ちの素材を使える工程へ運ぼう";
  }

  const ready = [...machines]
    .slice(0, state.unlocked)
    .reverse()
    .find((machine) => state.resources[machine.output] > 0);
  if (ready) return `${ready.name}の緑側で${resources[ready.output].short}を受け取ろう`;

  const nextMachine = machines[state.unlocked];
  if (nextMachine && state.credits >= nextMachine.unlockCost) {
    return `建設枠で${nextMachine.name}を建てよう`;
  }

  const autoTarget = machines
    .slice(0, state.unlocked)
    .find((machine) => !isAutomated(state, machine.id));
  if (autoTarget && state.credits >= autoTarget.autoCost) {
    return `${autoTarget.short}ロボを雇い、古い仕事を自動化しよう`;
  }

  const running = machines
    .slice(0, state.unlocked)
    .find((machine) => state.inputs[machine.id] > 0);
  if (running) return `${running.name}で加工中…`;

  if (state.resources.raw > 0) return "宇宙ゴミを拾い、加工ラインを動かそう";
  return `${active.name}：${active.amount - state.orderDelivered}個を納品しよう`;
};

export const bottleneck = (state: ScrapState): string => {
  for (const machine of machines.slice(0, state.unlocked)) {
    if (state.resources[machine.output] >= outputCapacity(state, machine.id)) {
      return `${machine.short}の完成品が満杯です`;
    }
  }
  for (const machine of machines.slice(0, state.unlocked)) {
    if (
      state.inputs[machine.id] <= 0 &&
      state.resources[machine.input] > 0 &&
      !isAutomated(state, machine.id)
    ) {
      return `${machine.short}への手動搬送が必要です`;
    }
  }
  const latest = machines[Math.max(0, state.unlocked - 1)];
  if (state.resources[latest.output] > 0 && state.carry.amount === 0) {
    return `${resources[latest.output].short}を復旧本部へ納品できます`;
  }
  return "ラインは順調に流れています";
};
