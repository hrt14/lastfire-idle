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
  active?: "ramen" | "park" | "fire";
  stages?: Record<string, Persisted | ScrapPersisted | unknown>;
  skins?: string[];
  stars?: Record<string, number>;
  equipped?: string;
  /** v4までの保存場所。読み込み後は stages.scrap へ移す。 */
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
  const staged = shared.stages?.scrap as ScrapPersisted | undefined;
  return tickScrap(fromScrapPersisted(staged ?? shared.scrap));
};

export const saveScrap = (state: ScrapState) => {
  if (typeof window === "undefined") return;
  const shared = readShared();
  const { scrap: _legacyScrap, ...withoutLegacy } = shared;
  const next: SharedVault = {
    ...withoutLegacy,
    savedAt: Date.now(),
    // 通常ステージ側の active は変えない。スクラップは stages.scrap で独立管理する。
    stages: {
      ...(shared.stages ?? {}),
      scrap: toScrapPersisted({ ...state, lastSeen: Date.now(), offlineReport: undefined }),
    },
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
    districts: state.unlocked >= 7 ? 4 : state.unlocked >= 5 ? 3 : state.unlocked >= 3 ? 2 : 1,
    totalDistricts: 4,
    restoration: Math.floor(state.restoration),
    robots: Math.floor(state.resources.robots),
    automated: state.automated.length,
  };
};

export const resetScrap = () => {
  const state = createScrapState();
  saveScrap(state);
  return state;
};
