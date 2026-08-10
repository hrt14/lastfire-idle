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
  /** 最後に保存した時刻。クラウドと突き合わせるときに使う */
  savedAt?: number;
  active: StageId;
  stages: Partial<Record<StageId, Persisted>>;
  /** SCRAP PLANETの専用工場データ。同じユーザーセーブ内に保存する */
  scrap?: Record<string, unknown>;
  /** ガチャで当てた見た目（ステージ共通） */
  skins: string[];
  /** 見た目ごとの★（ダブるたびに増えて光り方が変わる） */
  stars: Record<string, number>;
  equipped: string;
  /**
   * 開いたガチャの段（1 は最初から）。
   * 一度開いたら、あとでスキンが増えて割合が下がっても閉じない
   */
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

/** その段で、いくつの種類を持っているか（ダブりと★は数えない） */
const countInTier = (owned: string[], tier: Tier) =>
  tierPool(tier).filter((skin) => owned.includes(skin.id)).length;

/**
 * 持っている見た目から、開いているべき段を数え直す。
 *
 * 引いた瞬間だけで判定すると、下の段を集めきったあと
 * （引いてもダブりしか出ない）に上の段が永久に開かなくなる。
 * 読み込みのたびに持ち物から数え直して、条件を満たしていれば開ける。
 * 一度開いた段は、あとでスキンが増えて割合が下がっても閉じない
 */
const openedTiers = (owned: string[], saved: Tier[]): Tier[] => {
  const open = new Set<Tier>([1, ...saved]);
  for (let i = 0; i < gachaTiers.length - 1; i += 1) {
    const from = gachaTiers[i].tier;
    const next = gachaTiers[i + 1].tier;
    if (!open.has(from)) continue;
    if (countInTier(owned, from) >= tierNeed(from)) open.add(next);
  }
  // 段の順に並べる（下から上へ）
  return gachaTiers.map((item) => item.tier).filter((tier) => open.has(tier));
};

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
    const skins = Array.from(new Set(["default", ...owned]));
    const savedTiers = Array.isArray(parsed.gacha)
      ? parsed.gacha.filter((tier): tier is Tier => gachaTierById.has(tier as Tier))
      : [];
    return {
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
      // 遊んでいたステージを覚えておく（知らない名前のときだけラーメンに戻す）
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
      // 集めきったあとで足された段も、ここで開き直す
      gacha: openedTiers(skins, savedTiers),
    };
  } catch {
    return emptyVault();
  }
};

const writeVault = () => {
  vault.savedAt = Date.now();
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(vault));
  } catch {
    // 保存できない環境ではそのまま続行する
  }
  // ログインしているときは、少し待ってからクラウドにも送る
  syncVault(vault as unknown as Record<string, unknown>);
};

const build = (id: StageId): ShopState => {
  applyStage(id);
  const saved = vault.stages[id];
  const next = saved ? fromPersisted(saved) : createState();
  next.stageId = id;
  return next;
};

/** クラウド側と受け渡しするための出入口 */
const readVaultForCloud = () => {
  if (!loaded) {
    vault = readVault();
    loaded = true;
  }
  return vault as unknown as Record<string, unknown>;
};

/** クラウドのセーブを取り込む（新しい方が向こうにあったとき） */
const writeVaultFromCloud = (incoming: Record<string, unknown>) => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(incoming));
  } catch {
    // 保存できないときは、そのまま次の保存にまかせる
  }
  // 取り込んだ内容で遊べるように、いちど読み直す
  window.location.reload();
};

bindVault(readVaultForCloud, writeVaultFromCloud);

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
  /** この抽選で、上の段のガチャが開いたか（開いたらその段） */
  unlockedTier: Tier | null;
};

/** その段の集まりぐあい */
export type TierProgress = {
  tier: Tier;
  /** 取得ずみの固有スキン数（ダブりと★は数えない） */
  owned: number;
  total: number;
  /** 次の段が開くのに要る種類数 */
  need: number;
  open: boolean;
  /** 次の段（いちばん上ならなし） */
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

/** その段で、いくつの種類を持っているか（ダブりと★は数えない） */
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

/**
 * 下の段が70%そろっていたら、上の段を開ける。
 * 新しく取ったときだけでなく、引くたびに数え直す
 * （すでに集めきっている持ち物でも開くように）
 */
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
      // ダブると★が増えて、光り方が変わる
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
  // この抽選で、上の段が開くことがある
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
