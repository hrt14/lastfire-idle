/**
 * ガチャで当たる見た目。
 *
 * 価格帯ごとに3段（1億／10億／100億）あり、
 * 下の段をだいたい集めると、上の段が出てくる（§11）。
 * 抽選は、選んでいる段のスキンだけを相手にする。
 */

export type Rarity = "N" | "R" | "SR" | "UR" | "LR";

export type Hat =
  | "none"
  | "chef"
  | "cowboy"
  | "crown"
  | "helmet"
  | "topknot"
  | "ears"
  | "cap"
  /** とんがり帽子（大魔法使い・森の精） */
  | "wizard"
  /** 三角帽（海賊船長） */
  | "tricorn"
  /** 毛皮のフード（雪国の探検家） */
  | "hood"
  /** 火祭りの面 */
  | "mask"
  /** 光の輪（最上位） */
  | "halo"
  /** 角（龍・神） */
  | "horns";

/** 動物の見た目（耳・鼻・しっぽが付く） */
export type Face =
  | "cat"
  | "shiba"
  | "chick"
  | "bear"
  | "bunny"
  | "penguin"
  | "frog"
  | "tiger"
  | "panda"
  | "unicorn"
  | "dragon"
  | "fox"
  | "wolf"
  | "redpanda"
  | "capybara"
  | "owl"
  | "mammoth"
  | "phoenix"
  | "ninetails";

/** まわりに出る、動く飾り（最上位のスキンに付く） */
export type Aura =
  | "none"
  | "flame"
  | "star"
  | "moon"
  | "galaxy"
  | "rainbow"
  | "gold"
  | "clock"
  | "water"
  | "sun";

/** どの価格帯のガチャから出るか */
export type Tier = 1 | 2 | 3;

export type Skin = {
  id: string;
  name: string;
  rarity: Rarity;
  /** 出てくるガチャの段（省略で 1億円ガチャ） */
  tier?: Tier;
  coat: string;
  head: string;
  hat: Hat;
  hatColor?: string;
  /** 動物スキンはこれが付く */
  face?: Face;
  /** 耳やしっぽの色 */
  faceColor?: string;
  /** まわりに出る動く飾り */
  aura?: Aura;
  /** マントや羽など、背中に付く飾りの色 */
  cape?: string;
  /** 一覧に出す小さな絵 */
  icon?: string;
};

export const skins: Skin[] = [
  { id: "default", name: "見習い", rarity: "N", coat: "#e2483c", head: "#f7d9b8", hat: "none" },
  { id: "apron", name: "黒エプロン", rarity: "N", coat: "#2f3238", head: "#f0cfae", hat: "none" },
  { id: "blue", name: "藍のはっぴ", rarity: "N", coat: "#2f5fa8", head: "#f0cfae", hat: "cap", hatColor: "#1d3f74" },
  { id: "green", name: "みどりのつなぎ", rarity: "N", coat: "#3f7a49", head: "#f0cfae", hat: "cap", hatColor: "#2b5733" },
  { id: "pink", name: "桃色まえかけ", rarity: "N", coat: "#d4649a", head: "#f0cfae", hat: "none" },
  { id: "chef", name: "白衣の料理長", rarity: "R", coat: "#eee8dc", head: "#f0cfae", hat: "chef", hatColor: "#fbf7ef" },
  { id: "cowboy", name: "カウボーイ", rarity: "R", coat: "#9c6b3f", head: "#f0cfae", hat: "cowboy", hatColor: "#5c3f24" },
  { id: "ninja", name: "忍び", rarity: "R", coat: "#232a33", head: "#232a33", hat: "none" },
  { id: "clown", name: "ピエロ", rarity: "R", coat: "#c94f9a", head: "#fbe6d2", hat: "cap", hatColor: "#4ec4c9" },
  { id: "samurai", name: "侍", rarity: "SR", coat: "#4a3b6b", head: "#f0cfae", hat: "topknot", hatColor: "#2b2338" },
  { id: "astro", name: "宇宙飛行士", rarity: "SR", coat: "#dfe6ef", head: "#bcd6f0", hat: "helmet", hatColor: "#eaf3ff" },
  { id: "dino", name: "恐竜きぐるみ", rarity: "SR", coat: "#4f8f4a", head: "#7cc46f", hat: "ears", hatColor: "#3d7038" },
  { id: "gold", name: "黄金の店主", rarity: "SR", coat: "#e0a52b", head: "#f7d9b8", hat: "crown", hatColor: "#ffd166" },

  /* 動物スキン */
  { id: "cat", name: "ねこ店長", rarity: "N", coat: "#d9d3c8", head: "#f2ece0", hat: "none", face: "cat", faceColor: "#c9c1b2" , icon: "🐱" },
  { id: "shiba", name: "しばいぬ", rarity: "N", coat: "#d99a4e", head: "#f0c88c", hat: "none", face: "shiba", faceColor: "#b87a34" , icon: "🐶" },
  { id: "chick", name: "ひよこ", rarity: "N", coat: "#ffd85e", head: "#ffe58a", hat: "none", face: "chick", faceColor: "#f5a623" , icon: "🐤" },
  { id: "bear", name: "くまさん", rarity: "R", coat: "#8a6242", head: "#a97f57", hat: "none", face: "bear", faceColor: "#6b4a2f" , icon: "🐻" },
  { id: "bunny", name: "うさぎ", rarity: "R", coat: "#f4f1ea", head: "#fbf7ef", hat: "none", face: "bunny", faceColor: "#f0a6c0" , icon: "🐰" },
  { id: "penguin", name: "ぺんぎん", rarity: "R", coat: "#2b3440", head: "#f4f9ff", hat: "none", face: "penguin", faceColor: "#ffb038" , icon: "🐧" },
  { id: "frog", name: "かえる", rarity: "R", coat: "#4f9e4a", head: "#6fbf5f", hat: "none", face: "frog", faceColor: "#3d7a38" , icon: "🐸" },
  { id: "tiger", name: "とら", rarity: "SR", coat: "#e08a2b", head: "#f5b96a", hat: "none", face: "tiger", faceColor: "#3a2a1a" , icon: "🐯" },
  { id: "panda", name: "パンダ", rarity: "SR", coat: "#f4f1ea", head: "#fbf7ef", hat: "none", face: "panda", faceColor: "#2b2b33" , icon: "🐼" },
  { id: "unicorn", name: "ユニコーン", rarity: "SR", coat: "#e9d6ff", head: "#f6ecff", hat: "none", face: "unicorn", faceColor: "#a78bfa" , icon: "🦄" },
  { id: "dragon", name: "ドラゴン", rarity: "SR", coat: "#3f8f7a", head: "#5fb39b", hat: "none", face: "dragon", faceColor: "#ffd166" , icon: "🐲" },

  /* ==================== 10億円ガチャ（12種） ====================
   * 既存より飾りの多いテーマ衣装と動物。マントや帽子で輪郭から見分けられる
   */
  { id: "spirit", name: "森の精", rarity: "UR", tier: 2, coat: "#3f8f6a", head: "#d8f0d8", hat: "wizard", hatColor: "#2f6b4e", cape: "#7ee7a8", aura: "star", icon: "🌿" },
  { id: "festival", name: "火祭りの長", rarity: "UR", tier: 2, coat: "#c2402f", head: "#f0cfae", hat: "mask", hatColor: "#ffd166", cape: "#ff8c3c", aura: "flame", icon: "🔥" },
  { id: "pirate", name: "海賊船長", rarity: "UR", tier: 2, coat: "#2f3b4d", head: "#e8c49a", hat: "tricorn", hatColor: "#1a2230", cape: "#a33b3b", icon: "🏴‍☠️" },
  { id: "archmage", name: "大魔法使い", rarity: "UR", tier: 2, coat: "#4a3b8f", head: "#f0cfae", hat: "wizard", hatColor: "#332a63", cape: "#6b5ac2", aura: "star", icon: "🪄" },
  { id: "explorer", name: "雪国の探検家", rarity: "UR", tier: 2, coat: "#d8e4ef", head: "#f0cfae", hat: "hood", hatColor: "#8a7a5a", cape: "#b9c9dc", icon: "🧭" },
  { id: "king", name: "王様", rarity: "UR", tier: 2, coat: "#8f2f4a", head: "#f0cfae", hat: "crown", hatColor: "#ffd166", cape: "#c2405f", aura: "gold", icon: "👑" },
  { id: "fox", name: "きつね", rarity: "UR", tier: 2, coat: "#e08a3c", head: "#f5c48a", hat: "none", face: "fox", faceColor: "#f4f1ea", icon: "🦊" },
  { id: "wolf", name: "おおかみ", rarity: "UR", tier: 2, coat: "#6b7684", head: "#8b96a4", hat: "none", face: "wolf", faceColor: "#3a424c", icon: "🐺" },
  { id: "redpanda", name: "レッサーパンダ", rarity: "UR", tier: 2, coat: "#c2603a", head: "#f4e3d2", hat: "none", face: "redpanda", faceColor: "#8a3f26", icon: "🦝" },
  { id: "capybara", name: "カピバラ", rarity: "UR", tier: 2, coat: "#a98055", head: "#c2a077", hat: "none", face: "capybara", faceColor: "#7a5a38", icon: "🦫" },
  { id: "owl", name: "ふくろう", rarity: "UR", tier: 2, coat: "#7a6247", head: "#c4b295", hat: "none", face: "owl", faceColor: "#ffd166", icon: "🦉" },
  { id: "mammoth", name: "マンモス", rarity: "UR", tier: 2, coat: "#8a5f3f", head: "#a97a52", hat: "none", face: "mammoth", faceColor: "#e8ddc8", icon: "🦣" },

  /* ==================== 100億円ガチャ（12種） ====================
   * 専用のオーラや動く飾りを持つ、いちばん上の見た目
   */
  { id: "phoenix", name: "不死鳥", rarity: "LR", tier: 3, coat: "#e8541f", head: "#ffd166", hat: "none", face: "phoenix", faceColor: "#ffd166", cape: "#ff8c3c", aura: "flame", icon: "🔥" },
  { id: "ninetails", name: "九尾", rarity: "LR", tier: 3, coat: "#f4e3c2", head: "#fbf3e2", hat: "none", face: "ninetails", faceColor: "#e0a52b", aura: "gold", icon: "🦊" },
  { id: "whitedragon", name: "白龍", rarity: "LR", tier: 3, coat: "#eef4fb", head: "#f8fbff", hat: "horns", hatColor: "#c8dcf0", face: "dragon", faceColor: "#9fd0ff", cape: "#cfe4f8", aura: "water", icon: "🐉" },
  { id: "blackdragon", name: "黒龍", rarity: "LR", tier: 3, coat: "#232a33", head: "#333d4a", hat: "horns", hatColor: "#8a3f5f", face: "dragon", faceColor: "#c2405f", cape: "#3f2a3f", aura: "galaxy", icon: "🐲" },
  { id: "sungod", name: "太陽神", rarity: "LR", tier: 3, coat: "#ffcf4a", head: "#ffe9b0", hat: "halo", hatColor: "#fff0c2", cape: "#ffa726", aura: "sun", icon: "☀️" },
  { id: "moongod", name: "月の神", rarity: "LR", tier: 3, coat: "#3f4a7a", head: "#dfe6ef", hat: "halo", hatColor: "#cfe0ff", cape: "#5b6ba8", aura: "moon", icon: "🌙" },
  { id: "voyager", name: "銀河の旅人", rarity: "LR", tier: 3, coat: "#2b2f52", head: "#d6d0f0", hat: "helmet", hatColor: "#b6c8ff", cape: "#5b4a9e", aura: "galaxy", icon: "🌌" },
  { id: "timeking", name: "時の王", rarity: "LR", tier: 3, coat: "#5a4a2b", head: "#f0cfae", hat: "crown", hatColor: "#d9b45a", cape: "#8a7130", aura: "clock", icon: "⏳" },
  { id: "prism", name: "虹の幻獣", rarity: "LR", tier: 3, coat: "#8fd6c2", head: "#e6f7f0", hat: "horns", hatColor: "#ff8fd0", face: "unicorn", faceColor: "#ff8fd0", cape: "#a78bfa", aura: "rainbow", icon: "🌈" },
  { id: "goldmammoth", name: "黄金マンモス", rarity: "LR", tier: 3, coat: "#e0a52b", head: "#ffd166", hat: "none", face: "mammoth", faceColor: "#fff0c2", aura: "gold", icon: "🦣" },
  { id: "starknight", name: "星の騎士", rarity: "LR", tier: 3, coat: "#c8d4e4", head: "#f0cfae", hat: "helmet", hatColor: "#e8f0ff", cape: "#3f5ba8", aura: "star", icon: "⭐" },
  { id: "abyss", name: "深海の王", rarity: "LR", tier: 3, coat: "#1f4a5c", head: "#8fd0d8", hat: "crown", hatColor: "#4fd6c2", cape: "#2f7a8a", aura: "water", icon: "🔱" },
];

export const skinById = new Map(skins.map((skin) => [skin.id, skin]));

export const rarityLabel: Record<Rarity, string> = {
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
  UR: "ウルトラレア",
  LR: "レジェンド",
};

export const rarityWeight: Record<Rarity, number> = {
  N: 60,
  R: 32,
  SR: 8,
  UR: 20,
  LR: 20,
};

/** そのスキンが出るガチャの段（省略は 1億円ガチャ） */
export const skinTier = (skin: Skin): Tier => skin.tier ?? 1;

/* ---------- 段階式のガチャ ---------- */

export type GachaTier = {
  tier: Tier;
  /** 表示名。単位はステージごとに差し替える */
  name: string;
  cost: number;
  /** ★上限のあとの払い戻し（1回の値段の30%） */
  refund: number;
  /** 次の段が開く割合 */
  nextAt: number;
};

export const gachaTiers: GachaTier[] = [
  { tier: 1, name: "1億", cost: 100_000_000, refund: 30_000_000, nextAt: 0.7 },
  { tier: 2, name: "10億", cost: 1_000_000_000, refund: 300_000_000, nextAt: 0.7 },
  { tier: 3, name: "100億", cost: 10_000_000_000, refund: 3_000_000_000, nextAt: 0.7 },
];

export const gachaTierById = new Map(gachaTiers.map((item) => [item.tier, item]));

/**
 * その段の抽選対象。
 * 初期スキン「見習い」は無料なので、1億円ガチャの分母に入れない
 */
export const tierPool = (tier: Tier): Skin[] =>
  skins.filter((skin) => skinTier(skin) === tier && skin.id !== "default");

/** 次の段が開くのに要る種類数（端数は切り上げ。23種の70% → 17種） */
export const tierNeed = (tier: Tier): number => {
  const spec = gachaTierById.get(tier);
  if (!spec) return Infinity;
  return Math.ceil(tierPool(tier).length * spec.nextAt);
};

/** 1回の値段（いちばん下の段。既存の呼び出し向け） */
export const GACHA_COST = gachaTiers[0].cost;

/** ★が上がりきったあと、ダブったときの払い戻し */
export const GACHA_REFUND = gachaTiers[0].refund;

/** 同じ見た目がダブるたびに★が増えて、光り方が6段階まで変わる */
export const MAX_STARS = 6;

const shineNames = [
  "光りなし",
  "ふちが光る",
  "きらきら",
  "虹のオーラ",
  "光の輪",
  "まわる星",
  "光の柱",
];

export const shineLabel = (stars: number): string =>
  shineNames[Math.max(0, Math.min(MAX_STARS, stars))];

/** ★1つにつき足の速さ +5% */
export const shineBonus = (stars: number) => stars * 5;

/**
 * 抽選。選んでいる段に属するスキンだけを相手にする。
 * 10億円ガチャから1億円ガチャのスキンは出ないし、その逆もない
 */
export const rollSkin = (tier: Tier = 1): Skin => {
  const pool = tierPool(tier);
  const total = pool.reduce((sum, skin) => sum + rarityWeight[skin.rarity], 0);
  let point = Math.random() * total;
  for (const skin of pool) {
    point -= rarityWeight[skin.rarity];
    if (point <= 0) return skin;
  }
  return pool[pool.length - 1];
};
