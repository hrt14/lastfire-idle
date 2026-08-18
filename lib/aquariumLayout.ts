/**
 * 世界水族館の館内レイアウト（9×6のグリッド・54区画）。
 *
 * 区画の座標を作る data/aquarium-square-v4.ts と、
 * 館内の絵を描く lib/aquariumTheme.ts が同じ並びを見るために、ここへ置く。
 *
 * 順路はひと筆書き。入口（下段中央）から右ウイングを蛇行して本館18区画をめぐり、
 * 館の中ほどにある施設棟4区画（ショップ・レストラン・両生類館・爬虫類館）で息をつぎ、
 * そこから古代棟32区画で時代をさかのぼりながら館をぐるりと一周して、
 * 最後は入口のとなりの扉 ―― 生命誕生の海 ―― へ戻ってくる。
 */

export const AQUARIUM_CELL_W = 360;
export const AQUARIUM_CELL_H = 420;

export const AQUARIUM_COLS = 9;
export const AQUARIUM_ROWS = 6;

/** 本館（現世の世界の海）。ここは既存セーブと同じ18区画 */
export const AQUARIUM_MAIN_END = 17;
/** 施設棟（ショップ・レストラン・両生類館・爬虫類館） */
export const AQUARIUM_FACILITY_START = 18;
export const AQUARIUM_FACILITY_END = 21;
/** 古代棟（時代をさかのぼる32区画） */
export const AQUARIUM_ANCIENT_START = 22;
export const AQUARIUM_ANCIENT_END = 53;

export const AQUARIUM_AREA_COUNT = 54;

export type AquariumWing = "main" | "facility" | "ancient";

export const aquariumWing = (index: number): AquariumWing =>
  index <= AQUARIUM_MAIN_END
    ? "main"
    : index <= AQUARIUM_FACILITY_END
      ? "facility"
      : "ancient";

/**
 * 入口は下段中央 (4,5)。
 *
 * 1. 右ウイング（列4〜8）を下段から天井際まで蛇行する。30区画。
 * 2. 天井際で左ウイング（列0〜3）へ渡り、下段まで蛇行して下りる。24区画。
 * 3. 終点 (3,5) は入口のとなり。館を一周して、いちばん古い海へ戻ってくる。
 */
const buildPath = (): [number, number][] => {
  const path: [number, number][] = [];

  for (let row = AQUARIUM_ROWS - 1; row >= 0; row -= 1) {
    const leftToRight = row % 2 === 1;
    for (let step = 0; step < 5; step += 1) {
      path.push([leftToRight ? 4 + step : 8 - step, row]);
    }
  }

  for (let row = 0; row < AQUARIUM_ROWS; row += 1) {
    const rightToLeft = row % 2 === 0;
    for (let step = 0; step < 4; step += 1) {
      path.push([rightToLeft ? 3 - step : step, row]);
    }
  }

  return path;
};

export const AQUARIUM_AREA_PATH = buildPath();

export type AquariumSide = "left" | "right" | "top" | "bottom";

/**
 * その展示室から、順路の前後の展示室へ抜ける向き。
 * 壁で閉じきらずここに通路を開けると、54個の箱ではなく一つの館に見える。
 */
export const aquariumDoorways = (index: number): AquariumSide[] => {
  const here = AQUARIUM_AREA_PATH[index];
  if (!here) return [];
  const sides: AquariumSide[] = [];
  for (const step of [-1, 1]) {
    const there = AQUARIUM_AREA_PATH[index + step];
    if (!there) continue;
    const dx = there[0] - here[0];
    const dy = there[1] - here[1];
    if (dx === 1 && dy === 0) sides.push("right");
    else if (dx === -1 && dy === 0) sides.push("left");
    else if (dx === 0 && dy === 1) sides.push("bottom");
    else if (dx === 0 && dy === -1) sides.push("top");
  }
  return sides;
};
