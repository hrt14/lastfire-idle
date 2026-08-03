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
  reward: number;
  unlockCost: number;
  autoCost: number;
  art: "sort" | "crusher" | "washer" | "furnace" | "refinery" | "press" | "assembly";
};

export const SCRAP_WORLD = { w: 1180, h: 820 };
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const SHIP_POS: Vec = { x: 390, y: 470 };
export const SOURCE_POS: Vec = { x: 85, y: 250 };

export const resources: Record<
  ResourceId,
  { name: string; short: string; icon: string; color: string }
> = {
  raw: { name: "宇宙ゴミ", short: "ゴミ", icon: "🗑️", color: "#9ca3af" },
  sorted: { name: "選別材", short: "選別", icon: "🧲", color: "#7dd3fc" },
  crushed: { name: "破砕材", short: "破砕", icon: "🪨", color: "#a3a3a3" },
  washed: { name: "洗浄材", short: "洗浄", icon: "💧", color: "#67e8f9" },
  molten: { name: "溶融金属", short: "溶融", icon: "🔥", color: "#fb923c" },
  ingot: { name: "再生インゴット", short: "鋼材", icon: "🧱", color: "#cbd5e1" },
  parts: { name: "機械部品", short: "部品", icon: "⚙️", color: "#fde68a" },
  robots: { name: "作業ロボット", short: "ロボ", icon: "🤖", color: "#c4b5fd" },
};

export const saleValues: Record<ResourceId, number> = {
  raw: 0,
  sorted: 15,
  crushed: 45,
  washed: 130,
  molten: 380,
  ingot: 1100,
  parts: 3200,
  robots: 9000,
};

export const saleValue = (kind: ResourceId) => saleValues[kind] ?? 0;

export const machines: MachineDef[] = [
  {
    id: "sort",
    name: "磁力選別機",
    short: "選別",
    icon: "🧲",
    input: "raw",
    output: "sorted",
    pos: { x: 285, y: 250 },
    cycleMs: 1100,
    reward: 4,
    unlockCost: 0,
    autoCost: 180,
    art: "sort",
  },
  {
    id: "crush",
    name: "油圧破砕機",
    short: "破砕",
    icon: "⚒️",
    input: "sorted",
    output: "crushed",
    pos: { x: 510, y: 250 },
    cycleMs: 2600,
    reward: 10,
    unlockCost: 45,
    autoCost: 520,
    art: "crusher",
  },
  {
    id: "wash",
    name: "高圧洗浄槽",
    short: "洗浄",
    icon: "🚿",
    input: "crushed",
    output: "washed",
    pos: { x: 735, y: 250 },
    cycleMs: 3000,
    reward: 25,
    unlockCost: 160,
    autoCost: 1500,
    art: "washer",
  },
  {
    id: "melt",
    name: "電気溶解炉",
    short: "溶解",
    icon: "🔥",
    input: "washed",
    output: "molten",
    pos: { x: 960, y: 250 },
    cycleMs: 3600,
    reward: 65,
    unlockCost: 520,
    autoCost: 4200,
    art: "furnace",
  },
  {
    id: "refine",
    name: "真空精錬炉",
    short: "精錬",
    icon: "🧪",
    input: "molten",
    output: "ingot",
    pos: { x: 960, y: 600 },
    cycleMs: 4200,
    reward: 160,
    unlockCost: 1700,
    autoCost: 12000,
    art: "refinery",
  },
  {
    id: "parts",
    name: "部品プレス機",
    short: "部品化",
    icon: "⚙️",
    input: "ingot",
    output: "parts",
    pos: { x: 735, y: 600 },
    cycleMs: 4600,
    reward: 420,
    unlockCost: 5600,
    autoCost: 35000,
    art: "press",
  },
  {
    id: "robot",
    name: "ロボット組立台",
    short: "組立",
    icon: "🤖",
    input: "parts",
    output: "robots",
    pos: { x: 510, y: 600 },
    cycleMs: 5400,
    reward: 1100,
    unlockCost: 18500,
    autoCost: 100000,
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
  version: 4;
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
  totalActions: number;
  totalSold: number;
  lastSeen: number;
};

export type ScrapPersisted = Partial<ScrapState> & { version?: number };

export const createScrapState = (): ScrapState => ({
  version: 4,
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
  player: { x: 150, y: 360 },
  sourceProgress: 0,
  totalActions: 0,
  totalSold: 0,
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

export const fromScrapPersisted = (saved: ScrapPersisted | undefined): ScrapState => {
  const base = createScrapState();
  if (!saved || saved.version !== 4) return base;
  const automated = Array.isArray(saved.automated)
    ? saved.automated.filter((id): id is string => typeof id === "string")
    : [];
  const carryKind =
    saved.carry?.kind && saved.carry.kind in resources
      ? (saved.carry.kind as ResourceId)
      : null;
  return {
    ...base,
    credits: Math.max(0, finite(saved.credits, base.credits)),
    resources: safeResourceRecord(saved.resources),
    inputs: safeMachineRecord(saved.inputs),
    progress: safeMachineRecord(saved.progress),
    robotProgress: {
      ...safeMachineRecord(saved.robotProgress),
      ship: Math.max(0, finite(saved.robotProgress?.ship, 0)),
    },
    levels: safeMachineRecord(saved.levels),
    unlocked: Math.max(1, Math.min(machines.length, Math.floor(finite(saved.unlocked, 1)))),
    automated: Array.from(new Set(automated)),
    carry: {
      kind: carryKind,
      amount: carryKind ? Math.max(0, Math.floor(finite(saved.carry?.amount, 0))) : 0,
    },
    carryLevel: Math.max(0, Math.min(12, Math.floor(finite(saved.carryLevel, 0)))),
    speedLevel: Math.max(0, Math.min(12, Math.floor(finite(saved.speedLevel, 0)))),
    paid: saved.paid && typeof saved.paid === "object" ? { ...saved.paid } : {},
    player: {
      x: Math.max(30, Math.min(SCRAP_WORLD.w - 30, finite(saved.player?.x, base.player.x))),
      y: Math.max(80, Math.min(SCRAP_WORLD.h - 30, finite(saved.player?.y, base.player.y))),
    },
    sourceProgress: Math.max(0, finite(saved.sourceProgress, 0)),
    totalActions: Math.max(0, Math.floor(finite(saved.totalActions, 0))),
    totalSold: Math.max(0, Math.floor(finite(saved.totalSold, 0))),
    lastSeen: Math.max(0, finite(saved.lastSeen, Date.now())),
  };
};

export const toScrapPersisted = (state: ScrapState): ScrapPersisted => ({ ...state });

export const carryCapacity = (state: ScrapState) => 3 + state.carryLevel;
export const moveSpeed = (state: ScrapState) => 128 * (1 + state.speedLevel * 0.1);
export const machineCapacity = (state: ScrapState, id: MachineId) =>
  4 + state.levels[id] * 2;
export const machineCycle = (state: ScrapState, id: MachineId) => {
  const machine = machineById.get(id)!;
  return machine.cycleMs / (1 + state.levels[id] * 0.16);
};
export const machineBatch = (state: ScrapState, id: MachineId) =>
  1 + Math.floor(state.levels[id] / 4);
export const machineUnlocked = (state: ScrapState, id: MachineId) =>
  machines.findIndex((machine) => machine.id === id) < state.unlocked;
export const isAutomated = (state: ScrapState, id: MachineId | "ship") =>
  state.automated.includes(id);

export const upgradeCost = (state: ScrapState, id: MachineId) => {
  const index = machines.findIndex((machine) => machine.id === id);
  return Math.ceil((65 + index * 85) * Math.pow(1.72, state.levels[id]));
};

export const carryUpgradeCost = (state: ScrapState) =>
  Math.ceil(90 * Math.pow(1.78, state.carryLevel));
export const speedUpgradeCost = (state: ScrapState) =>
  Math.ceil(75 * Math.pow(1.74, state.speedLevel));
export const shipAutoCost = () => 240000;

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
});

const outputLimit = (state: ScrapState, id: MachineId) =>
  8 + state.levels[id] * 3;

const transportOne = (next: ScrapState, machine: MachineDef) => {
  if (!machineUnlocked(next, machine.id)) return;
  const available = next.resources[machine.input];
  const room = machineCapacity(next, machine.id) - next.inputs[machine.id];
  if (available < 1 || room < 1) return;
  next.resources[machine.input] -= 1;
  next.inputs[machine.id] += 1;
};

export const advanceScrap = (state: ScrapState, dtMs: number): ScrapState => {
  if (dtMs <= 0) return state;
  const next = cloneState(state);
  const dt = Math.min(dtMs, OFFLINE_CAP_MS);

  next.sourceProgress += dt;
  const sourceEvery = 1800;
  while (next.sourceProgress >= sourceEvery && next.resources.raw < 30) {
    next.sourceProgress -= sourceEvery;
    next.resources.raw += 1;
  }
  if (next.resources.raw >= 30) next.sourceProgress = Math.min(next.sourceProgress, sourceEvery);

  for (const machine of machines) {
    if (!isAutomated(next, machine.id) || !machineUnlocked(next, machine.id)) continue;
    next.robotProgress[machine.id] += dt;
    const interval = Math.max(520, 1700 - next.levels[machine.id] * 80);
    while (next.robotProgress[machine.id] >= interval) {
      next.robotProgress[machine.id] -= interval;
      transportOne(next, machine);
    }
  }

  for (const machine of machines) {
    if (!machineUnlocked(next, machine.id)) continue;
    const limit = outputLimit(next, machine.id);
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
      const made = Math.min(machineBatch(next, machine.id), limit - next.resources[machine.output]);
      next.resources[machine.output] += made;
      next.totalActions += made;
    }
  }

  if (isAutomated(next, "ship")) {
    next.robotProgress.ship += dt;
    while (next.robotProgress.ship >= 1250 && next.resources.robots >= 1) {
      next.robotProgress.ship -= 1250;
      next.resources.robots -= 1;
      next.credits += saleValue("robots");
      next.totalSold += 1;
    }
  }

  next.lastSeen = Date.now();
  return next;
};

export const tickScrap = (state: ScrapState, now = Date.now()): ScrapState => {
  const elapsed = Math.max(0, Math.min(OFFLINE_CAP_MS, now - state.lastSeen));
  if (elapsed < 300) return { ...state, lastSeen: now };
  const steps = Math.max(1, Math.min(720, Math.ceil(elapsed / 1500)));
  const step = elapsed / steps;
  let next = state;
  for (let i = 0; i < steps; i += 1) next = advanceScrap(next, step);
  next.lastSeen = now;
  return next;
};

export const pickup = (
  state: ScrapState,
  kind: ResourceId,
  amount = 1,
): ScrapState => {
  if (state.resources[kind] < 1) return state;
  if (state.carry.kind && state.carry.kind !== kind) return state;
  const room = carryCapacity(state) - state.carry.amount;
  if (room <= 0) return state;
  const moved = Math.min(amount, room, Math.floor(state.resources[kind]));
  if (moved <= 0) return state;
  const next = cloneState(state);
  next.resources[kind] -= moved;
  next.carry.kind = kind;
  next.carry.amount += moved;
  next.totalActions += moved;
  return next;
};

export const deposit = (state: ScrapState, id: MachineId, amount = 1): ScrapState => {
  const machine = machineById.get(id)!;
  if (!machineUnlocked(state, id)) return state;
  if (state.carry.kind !== machine.input || state.carry.amount <= 0) return state;
  const room = machineCapacity(state, id) - state.inputs[id];
  const moved = Math.min(amount, room, state.carry.amount);
  if (moved <= 0) return state;
  const next = cloneState(state);
  next.inputs[id] += moved;
  next.carry.amount -= moved;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.totalActions += moved;
  return next;
};

export const sellCarried = (state: ScrapState, amount = 1): ScrapState => {
  const kind = state.carry.kind;
  if (!kind || kind === "raw" || state.carry.amount <= 0) return state;
  const price = saleValue(kind);
  const sold = Math.min(amount, state.carry.amount);
  const next = cloneState(state);
  next.carry.amount -= sold;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.credits += sold * price;
  next.totalSold += sold;
  next.totalActions += sold;
  return next;
};

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
      label: `${nextMachine.short}ライン`,
      detail: `${nextMachine.name}を建設`,
      cost: nextMachine.unlockCost,
      pos: { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 },
      kind: "unlock",
      machine: nextMachine.id,
    });
  }
  for (const machine of machines.slice(0, state.unlocked)) {
    if (!isAutomated(state, machine.id)) {
      list.push({
        id: `auto-${machine.id}`,
        label: "作業ロボ",
        detail: `${resources[machine.input].short}を自動搬送`,
        cost: machine.autoCost,
        pos: { x: machine.pos.x - 48, y: machine.pos.y + 102 },
        kind: "auto",
        machine: machine.id,
      });
    }
    if (state.levels[machine.id] < 10) {
      list.push({
        id: `upgrade-${machine.id}`,
        label: `${machine.short}強化`,
        detail: "速度・容量・生産数アップ",
        cost: upgradeCost(state, machine.id),
        pos: { x: machine.pos.x + 48, y: machine.pos.y + 102 },
        kind: "upgrade",
        machine: machine.id,
      });
    }
  }
  if (state.carryLevel < 12) {
    list.push({
      id: "carry",
      label: "大型コンテナ",
      detail: `運べる数 ${carryCapacity(state)} → ${carryCapacity(state) + 1}`,
      cost: carryUpgradeCost(state),
      pos: { x: 118, y: 470 },
      kind: "carry",
    });
  }
  if (state.speedLevel < 12) {
    list.push({
      id: "speed",
      label: "磁気ブーツ",
      detail: `移動速度 +${Math.round((state.speedLevel + 1) * 7.5)}%`,
      cost: speedUpgradeCost(state),
      pos: { x: 190, y: 470 },
      kind: "speed",
    });
  }
  if (state.unlocked >= machines.length && !isAutomated(state, "ship")) {
    list.push({
      id: "auto-ship",
      label: "出荷ドローン",
      detail: "完成ロボットを自動売却",
      cost: shipAutoCost(),
      pos: { x: SHIP_POS.x, y: SHIP_POS.y + 105 },
      kind: "ship",
    });
  }
  return list;
};

const applyPurchase = (state: ScrapState, purchase: Purchase): ScrapState => {
  const next = cloneState(state);
  delete next.paid[purchase.id];
  if (purchase.kind === "unlock" && purchase.machine) {
    const index = machines.findIndex((machine) => machine.id === purchase.machine);
    next.unlocked = Math.max(next.unlocked, index + 1);
  } else if (purchase.kind === "auto" && purchase.machine) {
    next.automated = Array.from(new Set([...next.automated, purchase.machine]));
  } else if (purchase.kind === "upgrade" && purchase.machine) {
    next.levels[purchase.machine] = Math.min(10, next.levels[purchase.machine] + 1);
  } else if (purchase.kind === "carry") {
    next.carryLevel = Math.min(12, next.carryLevel + 1);
  } else if (purchase.kind === "speed") {
    next.speedLevel = Math.min(12, next.speedLevel + 1);
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
  const rate = Math.max(28, purchase.cost / 2.4);
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
  if (state.carry.kind) {
    const machine = machines.find(
      (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,
    );
    if (machine) {
      const room = machineCapacity(state, machine.id) - state.inputs[machine.id];
      if (room > 0) return `${machine.name}へ運ぼう`;
      return `${machine.name}が満杯。加工が進むまで少し待とう`;
    }
    if (state.carry.kind !== "raw") {
      return `再生資源取引所へ運ぼう（1個 ${saleValue(state.carry.kind).toLocaleString("ja-JP")} C）`;
    }
    return "磁力選別機が満杯。手持ちのゴミが入るまで少し待とう";
  }

  const ready = machines.find(
    (machine) => machineUnlocked(state, machine.id) && state.resources[machine.output] > 0,
  );
  if (ready) return `${ready.name}の緑側で完成品を受け取ろう`;

  const running = machines.find(
    (machine) => machineUnlocked(state, machine.id) && state.inputs[machine.id] > 0,
  );
  if (running) return `${running.name}で加工中…完成品は緑側に出る`;

  const first = machines[0];
  const rawRoom = machineCapacity(state, first.id) - state.inputs[first.id];
  if (rawRoom > 0 && state.resources.raw > 0) {
    return "宇宙ゴミを拾って磁力選別機へ運ぼう";
  }

  const nextMachine = machines[state.unlocked];
  if (nextMachine) {
    if (state.credits >= nextMachine.unlockCost) {
      return `緑の建設枠で${nextMachine.name}を建てよう`;
    }
    return "完成した加工品を取引所で売って、次の設備代を稼ごう";
  }
  return "作業ロボを増やして、工場を完全自動化しよう";
};

export const bottleneck = (state: ScrapState): string => {
  for (const machine of machines.slice(0, state.unlocked)) {
    if (state.inputs[machine.id] <= 0 && state.resources[machine.input] > 0) {
      return `${machine.short}への搬送が止まっています`;
    }
    if (state.resources[machine.output] >= outputLimit(state, machine.id)) {
      return `${machine.short}の完成品が詰まっています`;
    }
  }
  return "ラインは順調に流れています";
};
