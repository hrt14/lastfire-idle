/** ガチャで当たる見た目。1億円で1回引ける。 */

export type Rarity = "N" | "R" | "SR";

export type Hat =
  | "none"
  | "chef"
  | "cowboy"
  | "crown"
  | "helmet"
  | "topknot"
  | "ears"
  | "cap";

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
  | "dragon";

export type Skin = {
  id: string;
  name: string;
  rarity: Rarity;
  coat: string;
  head: string;
  hat: Hat;
  hatColor?: string;
  /** 動物スキンはこれが付く */
  face?: Face;
  /** 耳やしっぽの色 */
  faceColor?: string;
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
];

export const skinById = new Map(skins.map((skin) => [skin.id, skin]));

export const rarityLabel: Record<Rarity, string> = {
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
};

export const rarityWeight: Record<Rarity, number> = { N: 60, R: 32, SR: 8 };

/** 1回の値段 */
export const GACHA_COST = 100_000_000;

/** ★が上がりきったあと、ダブったときの払い戻し */
export const GACHA_REFUND = 30_000_000;

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

export const rollSkin = (): Skin => {
  const pool = skins.filter((skin) => skin.id !== "default");
  const total = pool.reduce((sum, skin) => sum + rarityWeight[skin.rarity], 0);
  let point = Math.random() * total;
  for (const skin of pool) {
    point -= rarityWeight[skin.rarity];
    if (point <= 0) return skin;
  }
  return pool[pool.length - 1];
};
