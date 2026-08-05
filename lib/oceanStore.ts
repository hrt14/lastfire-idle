import { SAVE_KEY, type Persisted } from "@/lib/shop";
import { syncVault } from "@/lib/cloud";
import {
  createOceanState,
  fromOceanPersisted,
  oceanAreas,
  tickOcean,
  toOceanPersisted,
  type OceanPersisted,
  type OceanState,
} from "@/lib/ocean";

type SharedVault = {
  savedAt?: number;
  active?: "ramen" | "park" | "fire";
  stages?: Record<string, Persisted | OceanPersisted | unknown>;
  skins?: string[];
  stars?: Record<string, number>;
  equipped?: string;
  [key: string]: unknown;
};

const readShared = (): SharedVault => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SharedVault & Partial<Persisted>;
    if (parsed && typeof parsed === "object" && !("stages" in parsed)) {
      return {
        active: "ramen",
        stages: { ramen: parsed as Persisted },
        skins: ["default"],
        stars: {},
        equipped: "default",
      };
    }
    return parsed;
  } catch {
    return {};
  }
};

export const loadOcean = (): OceanState => {
  if (typeof window === "undefined") return createOceanState();
  const shared = readShared();
  return tickOcean(
    fromOceanPersisted(shared.stages?.ocean as OceanPersisted | undefined),
  );
};

export const saveOcean = (state: OceanState) => {
  if (typeof window === "undefined") return;
  const shared = readShared();
  const next: SharedVault = {
    ...shared,
    savedAt: Date.now(),
    // 通常ステージの選択状態は変えず、海の星だけ独立して保存する。
    stages: {
      ...(shared.stages ?? {}),
      ocean: toOceanPersisted({ ...state, lastSeen: Date.now() }),
    },
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  syncVault(next);
};

export const oceanProgress = () => {
  const state = loadOcean();
  return {
    started: state.totalActions > 0,
    areas: state.unlockedAreas,
    totalAreas: oceanAreas.length,
    restoration: Math.floor(state.restoration),
    delivered: state.totalDelivered,
  };
};

export const resetOcean = () => {
  const state = createOceanState();
  saveOcean(state);
  return state;
};
