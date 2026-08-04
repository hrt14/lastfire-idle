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

export type ScrapPersisted = Partial<
  Omit<ScrapState, "offlineReport" | "version" | "carry">
> & {
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

const legacyCarry = (
  saved: ScrapPersisted,
  resourcesOut: Record<ResourceId, number>,
) => {
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

export const fromScrapPersisted = (
  saved: ScrapPersisted | undefined,
): ScrapState => {
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
      x: Math.max(
        30,
        Math.min(SCRAP_WORLD.w - 30, finite(saved.player?.x, base.player.x)),
      ),
      y: Math.max(
        80,
        Math.min(SCRAP_WORLD.h - 30, finite(saved.player?.y, base.player.y)),
      ),
    },
    sourceProgress: Math.max(0, finite(saved.sourceProgress, 0)),
    orderDelivered: migrated
      ? 0
      : Math.max(0, Math.floor(finite(saved.orderDelivered, 0))),
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
export const moveSpeed = (state: ScrapState) =>
  140 * (1 + state.speedLevel * 0.09);
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
