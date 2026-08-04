import {
  OFFLINE_CAP_MS,
  machineById,
  machines,
  type MachineDef,
  type MachineId,
  type ResourceId,
} from "@/lib/scrap/data";
import {
  carryCapacity,
  carryTotal,
  cloneState,
  isAutomated,
  machineCapacity,
  machineCycle,
  machineUnlocked,
  outputCapacity,
  type ScrapState,
} from "@/lib/scrap/state";
import { bottleneck, contract } from "@/lib/scrap/contracts";

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
      next.progress[machine.id] = Math.min(
        next.progress[machine.id],
        machineCycle(next, machine.id),
      );
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
  if (elapsed < 1000) {
    return { ...state, lastSeen: now, offlineReport: undefined };
  }

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
  next.carry = { kind, amount: next.carry.amount + moved };
  next.totalActions += moved;
  if (kind === "raw" && next.carry.amount >= 3 && next.tutorialStep === 0) {
    next.tutorialStep = 1;
  }
  if (kind === "sorted" && next.tutorialStep === 2) next.tutorialStep = 3;
  return next;
};

export const deposit = (
  state: ScrapState,
  id: MachineId,
  amount = 1,
): ScrapState => {
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
export const sellFinished = (state: ScrapState) =>
  deliverContract(state, carryTotal(state));
export const sellCarried = (state: ScrapState, amount = 1) =>
  deliverContract(state, amount);
