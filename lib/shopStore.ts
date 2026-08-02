import {
  SAVE_KEY,
  applyOffline,
  applyStage,
  createState,
  fromPersisted,
  openAreas,
  toPersisted,
  type OfflineReport,
  type Persisted,
  type ShopState,
} from "@/lib/shop";
import { stageDefs, type StageId } from "@/data/stages";
import {
  GACHA_COST,
  GACHA_REFUND,
  MAX_STARS,
  rollSkin,
  skinById,
  type Skin,
} from "@/data/skins";
import { setSkinShine } from "@/lib/shop";

type Vault = {
  active: StageId;
  stages: Partial<Record<StageId, Persisted>>;
  /** ガチャで当てた見た目（ステージ共通） */
  skins: string[];
  /** 見た目ごとの★（ダブるたびに増えて光り方が変わる） */
  stars: Record<string, number>;
  equipped: string;
};

const emptyVault = (): Vault => ({
  active: "ramen",
  stages: {},
  skins: ["default"],
  stars: {},
  equipped: "default",
});

let vault: Vault = emptyVault();
let state: ShopState | null = null;
let loaded = false;

const readVault = (): Vault => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return emptyVault();
    const parsed = JSON.parse(raw) as Partial<Vault> & Partial<Persisted>;
    // 旧形式（ステージ1のセーブがそのまま入っている）を読み替える
    if (parsed && typeof parsed === "object" && !("stages" in parsed)) {
      return { ...emptyVault(), stages: { ramen: parsed as Persisted } };
    }
    const owned = Array.isArray(parsed.skins)
      ? parsed.skins.filter((id): id is string => typeof id === "string")
      : [];
    const stars: Record<string, number> = {};
    if (parsed.stars && typeof parsed.stars === "object") {
      for (const [id, value] of Object.entries(parsed.stars)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          stars[id] = Math.max(0, Math.min(MAX_STARS, Math.floor(value)));
        }
      }
    }
    return {
      active: parsed.active === "park" ? "park" : "ramen",
      stages: (parsed.stages ?? {}) as Partial<Record<StageId, Persisted>>,
      skins: Array.from(new Set(["default", ...owned])),
      stars,
      equipped:
        typeof parsed.equipped === "string" && skinById.has(parsed.equipped)
          ? parsed.equipped
          : "default",
    };
  } catch {
    return emptyVault();
  }
};

const writeVault = () => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(vault));
  } catch {
    // 保存できない環境ではそのまま続行する
  }
};

const build = (id: StageId): ShopState => {
  applyStage(id);
  const saved = vault.stages[id];
  const next = saved ? fromPersisted(saved) : createState();
  next.stageId = id;
  return next;
};

/** クライアントでのみ呼ぶこと */
export const getState = (): ShopState => {
  if (!loaded) {
    vault = readVault();
    loaded = true;
    setSkinShine(vault.stars[vault.equipped] ?? 0);
  }
  if (!state) state = build(vault.active);
  return state;
};

export const save = () => {
  if (!state) return;
  vault.stages[state.stageId] = toPersisted(state);
  vault.active = state.stageId;
  writeVault();
};

export const activeStage = (): StageId => {
  getState();
  return vault.active;
};

/** そのステージを始められるか（前のステージの区画をいくつ開けたか） */
export const stageUnlocked = (id: StageId): boolean => {
  if (!loaded) {
    vault = readVault();
    loaded = true;
  }
  const need = stageDefs[id].requiresAreas;
  if (need <= 0) return true;
  const ramen = vault.stages.ramen;
  const opened = ramen?.unlocked?.filter((key) => key.startsWith("area-")).length ?? 0;
  // area-0 は最初から開いているので +1
  return opened + 1 >= need;
};

/** 前ステージの進み具合（トップページの表示用） */
export const stageProgress = (id: StageId) => {
  if (!loaded) {
    vault = readVault();
    loaded = true;
  }
  const saved = vault.stages[id];
  const def = stageDefs[id];
  const opened =
    (saved?.unlocked?.filter((key) => key.startsWith("area-")).length ?? 0) + 1;
  return {
    started: !!saved,
    money: saved?.money ?? 0,
    served: saved?.served ?? 0,
    areas: Math.min(opened, def.areas.length),
    totalAreas: def.areas.length,
  };
};

export const switchStage = (id: StageId) => {
  if (state) save();
  state = build(id);
  vault.active = id;
  writeVault();
  return state;
};

export const resetState = () => {
  const id = state?.stageId ?? vault.active;
  applyStage(id);
  state = createState();
  state.stageId = id;
  vault.stages[id] = toPersisted(state);
  writeVault();
  return state;
};

export const catchUp = (): OfflineReport | null => {
  const current = getState();
  return applyOffline(current, Date.now());
};

/** いま何区画開いているか */
export const openedAreas = () => openAreas(getState()).length;

/* ---------- ガチャ（見た目） ---------- */

export type GachaResult = {
  skin: Skin;
  duplicate: boolean;
  /** ダブりで★が上がったか */
  shined: boolean;
  stars: number;
  /** ★が上限で、お金に変わったか */
  refunded: boolean;
};

export const ownedSkins = (): string[] => {
  getState();
  return vault.skins;
};

export const equippedSkin = (): Skin => {
  getState();
  return skinById.get(vault.equipped) ?? skinById.get("default")!;
};

/** その見た目の★の数 */
export const skinStars = (id: string): number => {
  getState();
  return vault.stars[id] ?? 0;
};

export const equippedStars = (): number => {
  getState();
  return vault.stars[vault.equipped] ?? 0;
};

/** 装備中の★を、足の速さのおまけとしてエンジンに渡す */
const syncShine = () => {
  setSkinShine(vault.stars[vault.equipped] ?? 0);
};

export const equipSkin = (id: string) => {
  getState();
  if (!vault.skins.includes(id)) return;
  vault.equipped = id;
  syncShine();
  writeVault();
};

export const canPull = (): boolean => getState().money >= GACHA_COST;

export const pullGacha = (): GachaResult | null => {
  const current = getState();
  if (current.money < GACHA_COST) return null;
  current.money -= GACHA_COST;

  const skin = rollSkin();
  const duplicate = vault.skins.includes(skin.id);
  let shined = false;
  let refunded = false;

  if (duplicate) {
    const stars = vault.stars[skin.id] ?? 0;
    if (stars < MAX_STARS) {
      // ダブると★が増えて、光り方が変わる
      vault.stars[skin.id] = stars + 1;
      vault.equipped = skin.id;
      shined = true;
    } else {
      current.money += GACHA_REFUND;
      refunded = true;
    }
  } else {
    vault.skins.push(skin.id);
    vault.equipped = skin.id;
  }
  syncShine();
  save();
  return {
    skin,
    duplicate,
    shined,
    stars: vault.stars[skin.id] ?? 0,
    refunded,
  };
};
