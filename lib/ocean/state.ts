import type {
  OceanAreaId,
  OceanCarry,
  OceanLineState,
  OceanPersisted,
  OceanResourceId,
  OceanState,
} from "@/lib/ocean/contracts";
import { oceanAreas, oceanAreaById } from "@/lib/ocean/data";

const line = (first = false): OceanLineState => ({
  wild: first ? 6 : 3,
  harvested: 0,
  input: 0,
  output: 0,
  processProgress: 0,
  sourceProgress: 0,
  workerProgress: 0,
  transportProgress: 0,
  deliveryProgress: 0,
  orderProgress: 0,
  orders: 0,
  expanded: false,
  sourceAuto: false,
  processAuto: false,
  deliveryAuto: false,
  level: 0,
});

const lines = (): Record<OceanAreaId, OceanLineState> => ({
  shallows: line(true),
  coral: line(),
  islands: line(),
  openSea: line(),
  abyss: line(),
  volcano: line(),
  iceCity: line(),
});

export const createOceanState = (): OceanState => ({
  version: 1,
  shells: 0,
  bluePoints: 0,
  restoration: 0,
  unlockedAreas: 1,
  currentArea: "shallows",
  lines: lines(),
  carry: { kind: null, amount: 0 },
  carryLevel: 0,
  totalActions: 0,
  totalDelivered: 0,
  totalFishCaught: 0,
  totalTrashCollected: 0,
  totalWaterPurified: 0,
  lastSeen: Date.now(),
});

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const safeLine = (value: unknown, base: OceanLineState): OceanLineState => {
  if (!value || typeof value !== "object") return { ...base };
  const item = value as Partial<OceanLineState>;
  return {
    wild: Math.max(0, finite(item.wild, base.wild)),
    harvested: Math.max(0, finite(item.harvested, 0)),
    input: Math.max(0, finite(item.input, 0)),
    output: Math.max(0, finite(item.output, 0)),
    processProgress: Math.max(0, finite(item.processProgress, 0)),
    sourceProgress: Math.max(0, finite(item.sourceProgress, 0)),
    workerProgress: Math.max(0, finite(item.workerProgress, 0)),
    transportProgress: Math.max(0, finite(item.transportProgress, 0)),
    deliveryProgress: Math.max(0, finite(item.deliveryProgress, 0)),
    orderProgress: Math.max(0, finite(item.orderProgress, 0)),
    orders: Math.max(0, Math.floor(finite(item.orders, 0))),
    expanded: bool(item.expanded),
    sourceAuto: bool(item.sourceAuto),
    processAuto: bool(item.processAuto),
    deliveryAuto: bool(item.deliveryAuto),
    level: Math.max(0, Math.min(10, Math.floor(finite(item.level, 0)))),
  };
};

const validResource = (value: unknown): value is OceanResourceId =>
  typeof value === "string" &&
  oceanAreas.some((area) => area.source === value || area.product === value);

const safeCarry = (value: unknown): OceanCarry => {
  if (!value || typeof value !== "object") return { kind: null, amount: 0 };
  const item = value as Partial<OceanCarry>;
  const kind = validResource(item.kind) ? item.kind : null;
  const amount = kind ? Math.max(0, Math.floor(finite(item.amount, 0))) : 0;
  return { kind, amount };
};

export const fromOceanPersisted = (saved: OceanPersisted | undefined): OceanState => {
  const base = createOceanState();
  if (!saved || saved.version !== 1) return base;
  const nextLines = lines();
  for (const area of oceanAreas) {
    nextLines[area.id] = safeLine(saved.lines?.[area.id], nextLines[area.id]);
  }
  const unlockedAreas = Math.max(
    1,
    Math.min(oceanAreas.length, Math.floor(finite(saved.unlockedAreas, 1))),
  );
  const current =
    typeof saved.currentArea === "string" && oceanAreaById.has(saved.currentArea as OceanAreaId)
      ? (saved.currentArea as OceanAreaId)
      : "shallows";
  const currentIndex = oceanAreas.findIndex((area) => area.id === current);
  return {
    ...base,
    shells: Math.max(0, finite(saved.shells, 0)),
    bluePoints: Math.max(0, finite(saved.bluePoints, 0)),
    restoration: Math.max(0, Math.min(100, finite(saved.restoration, 0))),
    unlockedAreas,
    currentArea: currentIndex < unlockedAreas ? current : oceanAreas[unlockedAreas - 1].id,
    lines: nextLines,
    carry: safeCarry(saved.carry),
    carryLevel: Math.max(0, Math.min(7, Math.floor(finite(saved.carryLevel, 0)))),
    totalActions: Math.max(0, Math.floor(finite(saved.totalActions, 0))),
    totalDelivered: Math.max(0, Math.floor(finite(saved.totalDelivered, 0))),
    totalFishCaught: Math.max(0, Math.floor(finite(saved.totalFishCaught, 0))),
    totalTrashCollected: Math.max(0, Math.floor(finite(saved.totalTrashCollected, 0))),
    totalWaterPurified: Math.max(0, Math.floor(finite(saved.totalWaterPurified, 0))),
    lastSeen: Math.max(0, finite(saved.lastSeen, Date.now())),
  };
};

export const toOceanPersisted = (state: OceanState): OceanPersisted => ({
  ...state,
  offlineReport: undefined,
});

export const cloneOcean = (state: OceanState): OceanState => ({
  ...state,
  lines: Object.fromEntries(
    Object.entries(state.lines).map(([id, value]) => [id, { ...value }]),
  ) as Record<OceanAreaId, OceanLineState>,
  carry: { ...state.carry },
  offlineReport: state.offlineReport
    ? { ...state.offlineReport, produced: { ...state.offlineReport.produced } }
    : undefined,
});

export const carryCapacity = (state: OceanState) => 3 + state.carryLevel;
