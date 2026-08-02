import type { BuildingId, Cost } from "@/data/buildings";
import { quests } from "@/data/quests";
import {
  SAVE_KEY,
  applyOffline,
  computeDerived,
  createState,
  migrate,
  normalizeState,
  purchase,
  step,
  stoke,
  type GameState,
  type OfflineReport,
} from "@/lib/game";

export type Snapshot = {
  game: GameState | null;
  offline: OfflineReport | null;
};

const EMPTY: Snapshot = { game: null, offline: null };

let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

let loopTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;

const emit = () => {
  for (const listener of listeners) listener();
};

const commit = (game: GameState, offline: OfflineReport | null | undefined) => {
  snapshot = {
    game,
    offline: offline === undefined ? snapshot.offline : offline,
  };
  emit();
};

const save = () => {
  const game = snapshot.game;
  if (!game) return;
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...game, lastSeen: Date.now() }),
    );
  } catch {
    // プライベートモードなど保存できない環境ではそのまま続行する
  }
};

const load = () => {
  let loaded: GameState;
  try {
    const stored = window.localStorage.getItem(SAVE_KEY);
    loaded = stored ? normalizeState(JSON.parse(stored)) : createState();
  } catch {
    loaded = createState();
  }
  const { state, report } = applyOffline(loaded, Date.now());
  snapshot = { game: state, offline: report };
};

const tick = () => {
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const game = snapshot.game;
  if (!game || dt <= 0 || document.hidden) return;
  commit(step(game, Math.min(2, dt)), undefined);
};

const onVisibilityChange = () => {
  const game = snapshot.game;
  if (!game) return;
  if (document.hidden) {
    save();
    return;
  }
  // 復帰時は、離れていた時間ぶんの生産をまとめて反映する。
  lastTick = Date.now();
  const { state, report } = applyOffline(game, Date.now());
  commit(state, report ?? snapshot.offline);
};

const start = () => {
  if (!snapshot.game) load();
  lastTick = Date.now();
  loopTimer = setInterval(tick, 100);
  saveTimer = setInterval(save, 5000);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", save);
};

const stop = () => {
  save();
  if (loopTimer) clearInterval(loopTimer);
  if (saveTimer) clearInterval(saveTimer);
  loopTimer = null;
  saveTimer = null;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pagehide", save);
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
};

export const getSnapshot = () => snapshot;

export const getServerSnapshot = () => EMPTY;

/* ---------- 操作 ---------- */

export const stokeFire = (): Cost => {
  const game = snapshot.game;
  if (!game) return {};
  const { state, gained } = stoke(game);
  commit(state, undefined);
  return gained;
};

export const build = (id: BuildingId, count: number) => {
  const game = snapshot.game;
  if (!game) return;
  const next = purchase(game, id, count);
  if (next) commit(next, undefined);
};

export const claimQuest = (questId: string) => {
  const game = snapshot.game;
  if (!game || game.claimed.includes(questId)) return false;
  const quest = quests.find((item) => item.id === questId);
  if (!quest) return false;
  if (quest.current(game, computeDerived(game)) < quest.target) return false;

  const resources = { ...game.resources };
  for (const [resource, amount] of Object.entries(quest.reward)) {
    resources[resource as keyof typeof resources] += amount;
  }
  commit(
    { ...game, resources, claimed: [...game.claimed, questId] },
    undefined,
  );
  save();
  return true;
};

export const migrateCamp = () => {
  const game = snapshot.game;
  if (!game) return false;
  const next = migrate(game);
  if (!next) return false;
  commit(next, null);
  save();
  return true;
};

export const resetGame = () => {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // 何もしない
  }
  commit(createState(), null);
};

export const dismissOffline = () => {
  const game = snapshot.game;
  if (!game) return;
  commit(game, null);
};
