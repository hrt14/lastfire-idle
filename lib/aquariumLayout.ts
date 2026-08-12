/**
 * 世界水族館の館内レイアウト（5×4のグリッド）。
 *
 * 区画の座標を作る data/aquarium-square-v4.ts と、
 * 館内の絵を描く lib/aquariumTheme.ts が同じ並びを見るために、ここへ置く。
 */

export const AQUARIUM_CELL_W = 360;
export const AQUARIUM_CELL_H = 420;

/**
 * 入口は下中央。右側→上側→左側を回って、最後に中央へ入る。
 * 18区画でほぼ正方形の施設になり、WORLD OCEAN が中央ランドマークになる。
 */
export const AQUARIUM_AREA_PATH = [
  [2, 3],
  [3, 3],
  [3, 2],
  [4, 2],
  [4, 1],
  [4, 0],
  [3, 0],
  [3, 1],
  [2, 1],
  [2, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 3],
  [1, 2],
  [2, 2],
] as const;

export type AquariumSide = "left" | "right" | "top" | "bottom";

/**
 * その展示室から、順路の前後の展示室へ抜ける向き。
 * 壁で閉じきらずここに通路を開けると、18個の箱ではなく一つの館に見える。
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
