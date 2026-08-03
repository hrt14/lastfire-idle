import { SAVE_KEY, type Persisted } from "@/lib/shop";
import { syncVault } from "@/lib/cloud";
import {
  createScrapState,
  fromScrapPersisted,
  tickScrap,
  toScrapPersisted,
  type ScrapPersisted,
  type ScrapState,
} from "@/lib/scrap";

type SharedVault = {
  savedAt?: number;
  active?: "ramen" | "park";
  stages?: Record<string, Persisted>;
  skins?: string[];
  stars?: Record<string, number>;
  equipped?: string;
  scrap?: ScrapPersisted;
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

export const loadScrap = (): ScrapState => {
  if (typeof window === "undefined") return createScrapState();
  const shared = readShared();
  return tickScrap(fromScrapPersisted(shared.scrap));
};

export const saveScrap = (state: ScrapState) => {
  if (typeof window === "undefined") return;
  const shared = readShared();
  const next: SharedVault = {
    ...shared,
    savedAt: Date.now(),
    scrap: toScrapPersisted({ ...state, lastSeen: Date.now() }),
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  syncVault(next);
};

export const scrapProgress = () => {
  const state = loadScrap();
  return {
    started: state.totalActions > 0,
    unlocked: state.unlocked,
    total: 9,
    robots: Math.floor(state.resources.robots),
    automated: state.automated.length,
  };
};

export const resetScrap = () => {
  const state = createScrapState();
  saveScrap(state);
  return state;
};
