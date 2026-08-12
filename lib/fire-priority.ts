/**
 * Demand-driven facade for the Fire stage.
 *
 * The original fire module still owns the full simulation. This facade only
 * replaces mammoth butchering so one full temporary pile cannot block every
 * resource that comes after it. In particular, a full mammoth-meat pile must
 * not prevent hides needed by an active build from ever being extracted.
 */

export * from "./fire";

import { stageDefs } from "@/data/stages";
import type { ShopState, StoveSpec } from "@/lib/shop";
import { liveStoves } from "./fire";

/** Mammoth yield table. Keep this in sync with lib/fire.ts. */
const YIELD: { kind: string; count: number; from: number }[] = [
  { kind: "mmeat", count: 36, from: 0.05 },
  { kind: "hide", count: 6, from: 0.25 },
  { kind: "tusk", count: 2, from: 0.45 },
  { kind: "fat", count: 8, from: 0.5 },
  { kind: "bone", count: 6, from: 0.7 },
];

/** Same capacity rule as the Fire simulation. */
const capacityOf = (state: ShopState, stove: StoveSpec) => {
  const plus = stageDefs.fire.equipment.reduce(
    (sum, item) =>
      item.capacity?.stove === stove.id &&
      state.unlocked.includes(`equip-${item.id}`)
        ? sum + item.capacity.plus
        : sum,
    0,
  );
  const base = stove.hold ?? (state.unlocked.includes("equip-fridge") ? 9 : 5);
  return base + plus;
};

const pileFor = (state: ShopState, kind: string) =>
  liveStoves(state).find(
    (stove) =>
      stove.pile &&
      (stove.item ?? "") === kind &&
      (state.ready[stove.id] ?? 0) < capacityOf(state, stove),
  ) ?? null;

const dueAt = (row: (typeof YIELD)[number], cut: number) => {
  const span = 1 - row.from;
  const done = Math.max(0, (cut - row.from) / span);
  return Math.min(row.count, Math.floor(done * row.count));
};

/**
 * Demand-driven mammoth butchering.
 *
 * Rules:
 * 1. Resources currently required by unfinished construction are extracted first.
 * 2. A full pile blocks only that resource, never the whole carcass.
 * 3. Blocked resources stay pending and are retried on later ticks.
 * 4. Cutting can continue far enough to expose a later critical resource.
 *
 * The existing Fire watchdog still handles resources that remain blocked for a
 * long time (spoil/skip after its timeout), so this only removes starvation;
 * it does not make storage capacity meaningless.
 */
export const cutBeast = (state: ShopState, rate: number, dt: number) => {
  const beast = state.fire.beast;
  if (!beast || beast.state !== "down") return false;

  const next = Math.min(1, beast.cut + dt * rate);
  const rows = YIELD
    .map((row, index) => ({
      ...row,
      index,
      due: dueAt(row, next),
      demand: state.fire.wants[row.kind] ?? 0,
    }))
    .filter((row) => (beast.given[row.kind] ?? 0) < row.due)
    .sort((a, b) => {
      // An active build waiting for this material beats every ordinary output.
      const aCritical = a.demand > 0;
      const bCritical = b.demand > 0;
      if (aCritical !== bCritical) return aCritical ? -1 : 1;
      if (a.demand !== b.demand) return b.demand - a.demand;
      return a.index - b.index;
    });

  let blocked = false;
  let moved = 0;

  for (const row of rows) {
    while ((beast.given[row.kind] ?? 0) < row.due) {
      const pile = pileFor(state, row.kind);
      if (!pile) {
        // Important: skip only this kind. The old algorithm broke out of the
        // whole loop here, so a full meat pile could starve hide forever.
        blocked = true;
        break;
      }
      state.ready[pile.id] = (state.ready[pile.id] ?? 0) + 1;
      beast.given[row.kind] = (beast.given[row.kind] ?? 0) + 1;
      moved += 1;
    }
  }

  // Progress represents how far the carcass has been opened, not whether every
  // output pile has room. Pending outputs remain in beast.given and are retried.
  beast.cut = next;
  beast.stuck = blocked;

  const total = YIELD.reduce((sum, row) => sum + row.count, 0);
  const out = YIELD.reduce((sum, row) => sum + (beast.given[row.kind] ?? 0), 0);
  if (beast.cut >= 1 && out >= total) {
    state.fire.beast = null;
    state.fire.beastWait = 34;
    state.toast = { text: "解体が終わった。骨まで運び出そう", at: Date.now() };
  }

  return moved > 0 || !blocked;
};
