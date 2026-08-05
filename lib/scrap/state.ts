import {
  SCRAP_WORLD,
  machineById,
  machineRecord,
  machines,
  resourceRecord,
  resources,
  type MachineId,
  type ResourceId,
  type Vec,
  type OfflineReport,
} from "@/lib/scrap/data";

export type ScrapState = {
  version: 6;
  credits: number;
  resources: Record<ResourceId, number>;
  inputs: Record<MachineId, number>;
  progress: Record<MachineId, number>;
  robotProgress: Record<MachineId, number> & { deliver: number; ship: number };
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

export type ScrapPersisted = Partial<
  Omit<ScrapState, "offlineReport" | "version" | "carry">
> & {
  version?: number;
  carry?: ScrapState["carry"] | { kind?: ResourceId | null; amount?: number };
};

export const createScrapState = (): ScrapState => ({
  version: 6,
  credits: 0,
  resources: resourceRecord(),
  inputs: machineRecord(),
  progress: machineRecord(),
  robotProgress: { ...machineRecord(), deliver: 0, ship: 0 },
  levels: machineRecord(),
  unlocked: 1,
  automated: [],
  carry: { kind: null, amount: 0 },
  carryLevel: 0,
  speedLevel: 0,
  paid: {},
  player: { x: 155, y: 285 },
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

const safeCarry = (value: unknown): ScrapState["carry"] => {
  if (!value || typeof value !== "object") return { kind: null, amount: 0 };
  const raw = value as { kind?: unknown; amount?: unknown };
  const kind = typeof raw.kind === "string" && raw.kind in resources
    ? (raw.kind as ResourceId)
    : null;
  const amount = Math.max(0, Math.floor(finite(raw.amount, 0)));
  return kind && amount > 0 ? { kind, amount } : { kind: null, amount: 0 };
};

export const fromScrapPersisted = (
  saved: ScrapPersisted | undefined,
): ScrapState => {
  const base = createScrapState();
  // 旧試作版は進行不能データを含むため、SCRAP PLANETだけ新仕様で開始する。
  if (!saved || saved.version !== 6) return base;
  const unlocked = Math.max(
    1,
    Math.min(machines.length, Math.floor(finite(saved.unlocked, 1))),
  );
  const robotProgress = saved.robotProgress as Partial<Record<MachineId | "deliver" | "ship", number>> | undefined;

  return {
    ...base,
    credits: Math.max(0, finite(saved.credits, 0)),
    resources: safeResourceRecord(saved.resources),
    inputs: safeMachineRecord(saved.inputs),
    progress: safeMachineRecord(saved.progress),
    robotProgress: {
      ...safeMachineRecord(saved.robotProgress),
      deliver: Math.max(0, finite(robotProgress?.deliver, 0)),
      ship: Math.max(0, finite(robotProgress?.ship, 0)),
    },
    levels: safeMachineRecord(saved.levels),
    unlocked,
    automated: Array.isArray(saved.automated)
      ? Array.from(new Set(saved.automated.filter((id): id is string => typeof id === "string")))
      : [],
    carry: safeCarry(saved.carry),
    carryLevel: Math.max(0, Math.min(7, Math.floor(finite(saved.carryLevel, 0)))),
    speedLevel: Math.max(0, Math.min(8, Math.floor(finite(saved.speedLevel, 0)))),
    paid: saved.paid && typeof saved.paid === "object" ? { ...saved.paid } : {},
    player: {
      x: Math.max(24, Math.min(SCRAP_WORLD.w - 24, finite(saved.player?.x, base.player.x))),
      y: Math.max(54, Math.min(SCRAP_WORLD.h - 24, finite(saved.player?.y, base.player.y))),
    },
    sourceProgress: Math.max(0, finite(saved.sourceProgress, 0)),
    orderDelivered: Math.max(0, Math.floor(finite(saved.orderDelivered, 0))),
    contractsCompleted: Math.max(0, Math.floor(finite(saved.contractsCompleted, 0))),
    restoration: Math.max(0, Math.min(100, finite(saved.restoration, 0))),
    tutorialStep: Math.max(0, Math.min(6, Math.floor(finite(saved.tutorialStep, 0)))),
    totalActions: Math.max(0, Math.floor(finite(saved.totalActions, 0))),
    totalProduced: Math.max(0, Math.floor(finite(saved.totalProduced, 0))),
    totalDelivered: Math.max(0, Math.floor(finite(saved.totalDelivered, 0))),
    lastSeen: Math.max(0, finite(saved.lastSeen, Date.now())),
  };
};

export const toScrapPersisted = (state: ScrapState): ScrapPersisted => {
  const { offlineReport: _offlineReport, ...persisted } = state;
  return persisted;
};

export const carryCapacity = (state: ScrapState) => 5 + state.carryLevel;
export const carryTotal = (state: ScrapState) => state.carry.amount;
export const carryOf = (state: ScrapState, kind: ResourceId) =>
  state.carry.kind === kind ? state.carry.amount : 0;
export const topCarry = (state: ScrapState) => state.carry.kind;
export const moveSpeed = (state: ScrapState) =>
  128 * (1 + state.speedLevel * 0.1);
export const machineCapacity = (state: ScrapState, id: MachineId) =>
  5 + state.levels[id] * 2;
export const outputCapacity = (state: ScrapState, id: MachineId) =>
  6 + state.levels[id] * 2;
export const machineCycle = (state: ScrapState, id: MachineId) => {
  const machine = machineById.get(id)!;
  return machine.cycleMs / (1 + state.levels[id] * 0.3);
};
export const machineBatch = () => 1;
export const machineUnlocked = (state: ScrapState, id: MachineId) =>
  machines.findIndex((machine) => machine.id === id) < state.unlocked;
export const isAutomated = (state: ScrapState, id: string) =>
  state.automated.includes(id);

export const upgradeCost = (state: ScrapState, id: MachineId) => {
  if (id === "sort" && state.levels.sort === 0) return 180;
  const index = machines.findIndex((machine) => machine.id === id);
  return Math.ceil((240 + index * 140) * Math.pow(1.55, state.levels[id]));
};
export const carryUpgradeCost = (state: ScrapState) =>
  state.carryLevel === 0 ? 300 : Math.ceil(420 * Math.pow(1.65, state.carryLevel));
export const speedUpgradeCost = (state: ScrapState) =>
  Math.ceil(260 * Math.pow(1.65, state.speedLevel));
export const shipAutoCost = () => 65000;

export const cloneState = (state: ScrapState): ScrapState => ({
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
