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
  MAX_STARS,
  gachaTierById,
  gachaTiers,
  rollSkin,
  skinById,
  tierNeed,
  tierPool,
  type Skin,
  type Tier,
} from "@/data/skins";
import { setSkinShine } from "@/lib/shop";
import { bindVault, syncVault } from "@/lib/cloud";

type Vault = {
  savedAt?: number;
  active: StageId;
  stages: Partial<Record<StageId, Persisted>>;
  /** SCRAP PLANET は大河エンジンを使うが、進行はここへ完全分離して保存する */
  scrap?: Record<string, unknown>;
  skins: string[];
  stars: Record<string, number>;
  equipped: string;
  gacha?: Tier[];
};

const emptyVault = (): Vault => ({
  active: "ramen",
  stages: {},
  skins: ["default"],
  stars: {},
  equipped: "default",
  gacha: [1],
});

let vault: Vault = emptyVault();
let state: ShopState | null = null;
let loaded = false;
/** SCRAPでは内部ステージIDはtaigaのまま。保存先だけvault.scrapへ切り替える。 */
let scrapSession = false;

const countInTier = (owned: string[], tier: Tier) =>
  tierPool(tier).filter((skin) => owned.includes(skin.id)).length;

const openedTiers = (owned: string[], saved: Tier[]): Tier[] => {
  const open = new Set<Tier>([1, ...saved]);
  for (let i = 0; i < gachaTiers.length - 1; i += 1) {
    const from = gachaTiers[i].tier;
    const next = gachaTiers[i + 1].tier;
    if (!open.has(from)) continue;
    if (countInTier(owned, from) >= tierNeed(from)) open.add(next);
  }
  return gachaTiers.map((item) => item.tier).filter((tier) => open.has(tier));
};

const readVault = (): Vault => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return emptyVault();
    const parsed = JSON.parse(raw) as Partial<Vault> & Partial<Persisted>;
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
    const skins = Array.from(new Set(["default", ...owned]));
    const savedTiers = Array.isArray(parsed.gacha)
      ? parsed.gacha.filter((tier): tier is Tier => gachaTierById.has(tier as Tier))
      : [];
    return {
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
      active:
        typeof parsed.active === "string" && parsed.active in stageDefs
          ? (parsed.active as StageId)
          : "ramen",
      stages: (parsed.stages ?? {}) as Partial<Record<StageId, Persisted>>,
      scrap:
        parsed.scrap && typeof parsed.scrap === "object"
          ? (parsed.scrap as Record<string, unknown>)
          : undefined,
      skins,
      stars,
      equipped:
        typeof parsed.equipped === "string" && skinById.has(parsed.equipped)
          ? parsed.equipped
          : "default",
      gacha: openedTiers(skins, savedTiers),
    };
  } catch {
    return emptyVault();
  }
};

const ensureLoaded = () => {
  if (loaded) return;
  vault = readVault();
  loaded = true;
  setSkinShine(vault.stars[vault.equipped] ?? 0);
};

const writeVault = () => {
  vault.savedAt = Date.now();
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(vault));
  } catch {
    // 保存できない環境ではそのまま続行する
  }
  syncVault(vault as unknown as Record<string, unknown>);
};

const scrapPersisted = (): Persisted | undefined =>
  vault.scrap as unknown as Persisted | undefined;

const build = (id: StageId): ShopState => {
  applyStage(id);
  const saved = scrapSession && id === "taiga" ? scrapPersisted() : vault.stages[id];
  const next = saved ? fromPersisted(saved) : createState();
  next.stageId = id;
  return next;
};

const readVaultForCloud = () => {
  ensureLoaded();
  return vault as unknown as Record<string, unknown>;
};

const writeVaultFromCloud = (incoming: Record<string, unknown>) => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(incoming));
  } catch {
    // 保存できないときは、そのまま次の保存にまかせる
  }
  window.location.reload();
};

bindVault(readVaultForCloud, writeVaultFromCloud);

export const getState = (): ShopState => {
  ensureLoaded();
  if (!state) state = build(scrapSession ? "taiga" : vault.active);
  return state;
};

export const save = () => {
  if (!state) return;
  const persisted = toPersisted(state);
  if (scrapSession && state.stageId === "taiga") {
    vault.scrap = persisted as unknown as Record<string, unknown>;
  } else {
    vault.stages[state.stageId] = persisted;
    vault.active = state.stageId;
  }
  writeVault();
};

/** SCRAP PLANET専用セッションを開始。大河の文明の進行とは完全に別保存。 */
export const enterScrapSession = () => {
  ensureLoaded();
  if (state && !scrapSession) save();
  scrapSession = true;
  state = build("taiga");
  return state;
};

/** SCRAPを閉じる前に専用進行を保存し、通常ステージへ戻せる状態にする。 */
export const leaveScrapSession = () => {
  if (scrapSession && state) save();
  scrapSession = false;
  state = null;
};

export const inScrapSession = () => scrapSession;

export const activeStage = (): StageId => {
  getState();
  return scrapSession ? "taiga" : vault.active;
};

export const stageUnlocked = (id: StageId): boolean => {
  ensureLoaded();
  const need = stageDefs[id].requiresAreas;
  if (need <= 0) return true;
  // どのステージの区画を数えるか（省略でラーメン一直線）
  const from = vault.stages[stageDefs[id].requiresStage ?? "ramen"];
  const opened = from?.unlocked?.filter((key) => key.startsWith("area-")).length ?? 0;
  // area-0 は最初から開いているので +1
  return opened + 1 >= need;
};

export const stageProgress = (id: StageId) => {
  ensureLoaded();
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

export const scrapProgress = () => {
  ensureLoaded();
  const saved = scrapPersisted();
  const def = stageDefs.taiga;
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
  scrapSession = false;
  state = build(id);
  vault.active = id;
  writeVault();
  return state;
};

export const resetState = () => {
  ensureLoaded();
  const id = state?.stageId ?? (scrapSession ? "taiga" : vault.active);
  applyStage(id);
  state = createState();
  state.stageId = id;
  if (scrapSession && id === "taiga") {
    vault.scrap = toPersisted(state) as unknown as Record<string, unknown>;
  } else {
    vault.stages[id] = toPersisted(state);
  }
  writeVault();
  return state;
};

export const catchUp = (): OfflineReport | null => applyOffline(getState(), Date.now());
export const openedAreas = () => openAreas(getState()).length;

export type GachaResult = {
  skin: Skin;
  duplicate: boolean;
  shined: boolean;
  stars: number;
  refunded: boolean;
  unlockedTier: Tier | null;
};

export type TierProgress = {
  tier: Tier;
  owned: number;
  total: number;
  need: number;
  open: boolean;
  next: Tier | null;
};

export const ownedSkins = (): string[] => {
  getState();
  return vault.skins;
};

export const equippedSkin = (): Skin => {
  getState();
  return skinById.get(vault.equipped) ?? skinById.get("default")!;
};

export const skinStars = (id: string): number => {
  getState();
  return vault.stars[id] ?? 0;
};

export const equippedStars = (): number => {
  getState();
  return vault.stars[vault.equipped] ?? 0;
};

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

const ownedInTier = (tier: Tier) => countInTier(vault.skins, tier);

export const tierProgress = (tier: Tier): TierProgress => {
  getState();
  const index = gachaTiers.findIndex((item) => item.tier === tier);
  const next = gachaTiers[index + 1]?.tier ?? null;
  return {
    tier,
    owned: ownedInTier(tier),
    total: tierPool(tier).length,
    need: tierNeed(tier),
    open: (vault.gacha ?? [1]).includes(tier),
    next,
  };
};

export const allTierProgress = (): TierProgress[] => {
  getState();
  return gachaTiers.map((item) => tierProgress(item.tier));
};

export const tierOpen = (tier: Tier): boolean => {
  getState();
  return (vault.gacha ?? [1]).includes(tier);
};

const openNextTier = (): Tier | null => {
  const before = new Set<Tier>(vault.gacha ?? [1]);
  vault.gacha = openedTiers(vault.skins, Array.from(before));
  return vault.gacha.find((tier) => !before.has(tier)) ?? null;
};

export const gachaCost = (tier: Tier): number =>
  gachaTierById.get(tier)?.cost ?? Infinity;

export const canPull = (tier: Tier = 1): boolean =>
  tierOpen(tier) && getState().money >= gachaCost(tier);

export const pullGacha = (tier: Tier = 1): GachaResult | null => {
  const current = getState();
  const spec = gachaTierById.get(tier);
  if (!spec || !tierOpen(tier)) return null;
  if (current.money < spec.cost) return null;
  current.money -= spec.cost;

  const skin = rollSkin(tier);
  const duplicate = vault.skins.includes(skin.id);
  let shined = false;
  let refunded = false;

  if (duplicate) {
    const stars = vault.stars[skin.id] ?? 0;
    if (stars < MAX_STARS) {
      vault.stars[skin.id] = stars + 1;
      vault.equipped = skin.id;
      shined = true;
    } else {
      current.money += spec.refund;
      refunded = true;
    }
  } else {
    vault.skins.push(skin.id);
    vault.equipped = skin.id;
  }
  const unlockedTier = openNextTier();
  syncShine();
  save();
  return {
    skin,
    duplicate,
    shined,
    stars: vault.stars[skin.id] ?? 0,
    refunded,
    unlockedTier,
  };
};
