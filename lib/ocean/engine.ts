import type {
  OceanAreaId,
  OceanOfflineReport,
  OceanResourceId,
  OceanState,
} from "@/lib/ocean/contracts";
import {
  OCEAN_OFFLINE_CAP_MS,
  oceanArea,
  oceanAreas,
} from "@/lib/ocean/data";
import { carryCapacity, cloneOcean } from "@/lib/ocean/state";

export const wildCapacity = (state: OceanState, id: OceanAreaId) =>
  8 + state.lines[id].level * 2;

export const harvestedCapacity = (state: OceanState, id: OceanAreaId) =>
  8 + state.lines[id].level * 3 + (state.lines[id].expanded ? 4 : 0);

export const inputCapacity = (state: OceanState, id: OceanAreaId) =>
  5 + state.lines[id].level * 2 + (state.lines[id].expanded ? 3 : 0);

export const outputCapacity = (state: OceanState, id: OceanAreaId) =>
  6 + state.lines[id].level * 2 + (state.lines[id].expanded ? 4 : 0);

export const processCycle = (state: OceanState, id: OceanAreaId) => {
  const def = oceanArea(id);
  const line = state.lines[id];
  return def.processMs / (1 + line.level * 0.14 + (line.expanded ? 0.2 : 0));
};

const completeOrder = (next: OceanState, id: OceanAreaId) => {
  const def = oceanArea(id);
  const line = next.lines[id];
  line.orders += 1;
  next.shells += def.orderReward;
  next.bluePoints += def.blueReward;
  next.restoration = Math.min(100, next.restoration + def.restorationReward);
  next.totalDelivered += def.orderSize;
  next.totalWaterPurified += Math.round(def.restorationReward * 25);
  if (id === "shallows") next.totalTrashCollected += 2;
};

export const advanceOcean = (state: OceanState, dtMs: number): OceanState => {
  if (dtMs <= 0) return state;
  const next = cloneOcean(state);
  const dt = Math.min(dtMs, OCEAN_OFFLINE_CAP_MS);

  for (const def of oceanAreas.slice(0, next.unlockedAreas)) {
    const line = next.lines[def.id];

    line.sourceProgress += dt;
    while (line.sourceProgress >= def.sourceEvery) {
      line.sourceProgress -= def.sourceEvery;
      if (line.wild < wildCapacity(next, def.id)) line.wild += 1;
      else {
        line.sourceProgress = Math.min(line.sourceProgress, def.sourceEvery);
        break;
      }
    }

    if (line.sourceAuto) {
      line.workerProgress += dt;
      const interval = Math.max(520, 1150 - line.level * 55);
      while (line.workerProgress >= interval) {
        line.workerProgress -= interval;
        if (line.wild < 1 || line.harvested >= harvestedCapacity(next, def.id)) break;
        line.wild -= 1;
        line.harvested += 1;
        next.totalFishCaught += 1;
      }
    }

    if (line.processAuto) {
      line.transportProgress += dt;
      const interval = Math.max(480, 1050 - line.level * 50);
      while (line.transportProgress >= interval) {
        line.transportProgress -= interval;
        if (line.harvested < 1 || line.input >= inputCapacity(next, def.id)) break;
        line.harvested -= 1;
        line.input += 1;
      }
    }

    if (line.input > 0 && line.output < outputCapacity(next, def.id)) {
      line.processProgress += dt;
      const cycle = processCycle(next, def.id);
      while (
        line.processProgress >= cycle &&
        line.input > 0 &&
        line.output < outputCapacity(next, def.id)
      ) {
        line.processProgress -= cycle;
        line.input -= 1;
        line.output += 1;
        next.totalActions += 1;
      }
    } else {
      line.processProgress = Math.min(line.processProgress, processCycle(next, def.id));
    }

    if (line.deliveryAuto) {
      line.deliveryProgress += dt;
      const interval = Math.max(900, 1800 - line.level * 65);
      while (line.deliveryProgress >= interval) {
        line.deliveryProgress -= interval;
        const need = def.orderSize - line.orderProgress;
        if (line.output < need) break;
        line.output -= need;
        line.orderProgress = 0;
        completeOrder(next, def.id);
      }
    }
  }

  next.lastSeen = Date.now();
  return next;
};

const producedTotal = (state: OceanState, id: OceanAreaId) => {
  const def = oceanArea(id);
  const line = state.lines[id];
  return line.output + line.orderProgress + line.orders * def.orderSize;
};

export const bottleneck = (state: OceanState): string => {
  for (const def of oceanAreas.slice(0, state.unlockedAreas)) {
    const line = state.lines[def.id];
    if (line.wild >= wildCapacity(state, def.id) && !line.sourceAuto) {
      return `${def.name}: ${def.sourceName}が満杯です`;
    }
    if (line.harvested >= harvestedCapacity(state, def.id) && !line.processAuto) {
      return `${def.name}: ${def.transportName}の自動化が必要です`;
    }
    if (line.input <= 0 && line.harvested > 0) {
      return `${def.name}: ${def.processorName}への投入が止まっています`;
    }
    if (line.output >= outputCapacity(state, def.id)) {
      return `${def.name}: ${def.productName}の出荷が詰まっています`;
    }
  }
  return "全海域が順調に動いています";
};

export const tickOcean = (state: OceanState, now = Date.now()): OceanState => {
  const elapsed = Math.max(0, Math.min(OCEAN_OFFLINE_CAP_MS, now - state.lastSeen));
  if (elapsed < 500) return { ...state, lastSeen: now };
  const beforeShells = state.shells;
  const beforeOrders = oceanAreas.reduce((sum, area) => sum + state.lines[area.id].orders, 0);
  const beforeRestoration = state.restoration;
  const beforeProduced = Object.fromEntries(
    oceanAreas.map((area) => [area.id, producedTotal(state, area.id)]),
  ) as Record<OceanAreaId, number>;

  const steps = Math.max(1, Math.min(720, Math.ceil(elapsed / 1500)));
  let next = state;
  for (let index = 0; index < steps; index += 1) {
    next = advanceOcean(next, elapsed / steps);
  }
  next.lastSeen = now;

  const produced: Partial<Record<OceanResourceId, number>> = {};
  for (const area of oceanAreas.slice(0, next.unlockedAreas)) {
    const made = Math.max(0, Math.floor(producedTotal(next, area.id) - beforeProduced[area.id]));
    if (made > 0) produced[area.product] = made;
  }
  const orders = oceanAreas.reduce((sum, area) => sum + next.lines[area.id].orders, 0) - beforeOrders;
  const report: OceanOfflineReport = {
    elapsedMs: elapsed,
    shells: Math.max(0, Math.floor(next.shells - beforeShells)),
    orders: Math.max(0, orders),
    restoration: Math.max(0, next.restoration - beforeRestoration),
    produced,
    bottleneck: bottleneck(next),
  };
  if (elapsed >= 60_000 && (report.shells > 0 || report.orders > 0 || Object.keys(produced).length > 0)) {
    next.offlineReport = report;
  }
  return next;
};

const canCarry = (state: OceanState, kind: OceanResourceId) =>
  state.carry.amount <= 0 || state.carry.kind === kind;

const addCarry = (next: OceanState, kind: OceanResourceId, amount: number) => {
  next.carry.kind = kind;
  next.carry.amount += amount;
  next.totalActions += amount;
};

export const collectSource = (state: OceanState, id: OceanAreaId): OceanState => {
  const def = oceanArea(id);
  if (!canCarry(state, def.source)) return state;
  const room = carryCapacity(state) - state.carry.amount;
  if (room <= 0) return state;
  const line = state.lines[id];
  const available = line.sourceAuto ? line.harvested : line.wild;
  if (available < 1) return state;
  const moved = Math.min(room, Math.floor(available));
  const next = cloneOcean(state);
  if (line.sourceAuto) next.lines[id].harvested -= moved;
  else next.lines[id].wild -= moved;
  addCarry(next, def.source, moved);
  next.totalFishCaught += moved;
  return next;
};

export const depositSource = (state: OceanState, id: OceanAreaId): OceanState => {
  const def = oceanArea(id);
  if (state.carry.kind !== def.source || state.carry.amount <= 0) return state;
  const room = inputCapacity(state, id) - state.lines[id].input;
  const moved = Math.min(room, state.carry.amount);
  if (moved <= 0) return state;
  const next = cloneOcean(state);
  next.lines[id].input += moved;
  next.carry.amount -= moved;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.totalActions += moved;
  return next;
};

export const collectProduct = (state: OceanState, id: OceanAreaId): OceanState => {
  const def = oceanArea(id);
  if (!canCarry(state, def.product)) return state;
  const room = carryCapacity(state) - state.carry.amount;
  const moved = Math.min(room, Math.floor(state.lines[id].output));
  if (moved <= 0) return state;
  const next = cloneOcean(state);
  next.lines[id].output -= moved;
  addCarry(next, def.product, moved);
  return next;
};

export const deliverProduct = (state: OceanState, id: OceanAreaId): OceanState => {
  const def = oceanArea(id);
  if (state.carry.kind !== def.product || state.carry.amount <= 0) return state;
  const line = state.lines[id];
  const need = def.orderSize - line.orderProgress;
  const moved = Math.min(need, state.carry.amount);
  if (moved <= 0) return state;
  const next = cloneOcean(state);
  const nextLine = next.lines[id];
  nextLine.orderProgress += moved;
  next.carry.amount -= moved;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.totalActions += moved;
  if (nextLine.orderProgress >= def.orderSize) {
    nextLine.orderProgress = 0;
    completeOrder(next, id);
  }
  return next;
};

export const dismissOfflineReport = (state: OceanState): OceanState => ({
  ...state,
  offlineReport: undefined,
});
