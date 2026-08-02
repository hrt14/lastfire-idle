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

export type Skin = {
  id: string;
  name: string;
  rarity: Rarity;
  coat: string;
  head: string;
  hat: Hat;
  hatColor?: string;
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
