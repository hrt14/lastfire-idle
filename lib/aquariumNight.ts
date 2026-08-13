import { hasEquip, stage, type ShopState } from "@/lib/shop";

/**
 * 世界水族館の一日。
 *
 * 「ナイトアクアリウム」を買うまでは、ずっと昼のまま時計が動かない。
 * 買うと館内に夜が来るようになり、照明が落ちて水槽だけが光る。
 *
 * 見た目だけの仕組みなので、集客も単価も進行も変わらない。
 * 時計は playTime（遊んだ秒数）から出しているため、
 * セーブの形を増やさずに、閉じて開いても続きから巡る。
 */

export const AQUARIUM_DAY = 300;
export const AQUARIUM_DUSK = 50;
export const AQUARIUM_NIGHT = 150;
export const AQUARIUM_DAWN = 50;
export const AQUARIUM_CYCLE =
  AQUARIUM_DAY + AQUARIUM_DUSK + AQUARIUM_NIGHT + AQUARIUM_DAWN;

/** 端で速さが 0 になる補間。夕暮れと夜明けを急に切り替えない */
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** ナイトアクアリウムを開催しているか（買ってあるか） */
export const nightAquariumOpen = (state: ShopState) =>
  stage().visualTheme === "aquarium" && hasEquip(state, "night");

/** いまの夜の深さ（0 = 昼、1 = 夜）。買うまでは常に 0 */
export const aquariumNightness = (state: ShopState) => {
  if (!nightAquariumOpen(state)) return 0;
  const t = state.playTime % AQUARIUM_CYCLE;
  if (t < AQUARIUM_DAY) return 0;
  if (t < AQUARIUM_DAY + AQUARIUM_DUSK) {
    return smooth((t - AQUARIUM_DAY) / AQUARIUM_DUSK);
  }
  if (t < AQUARIUM_DAY + AQUARIUM_DUSK + AQUARIUM_NIGHT) return 1;
  return 1 - smooth((t - AQUARIUM_DAY - AQUARIUM_DUSK - AQUARIUM_NIGHT) / AQUARIUM_DAWN);
};

export type AquariumPhase = "day" | "dusk" | "night" | "dawn";

export const aquariumPhase = (state: ShopState): AquariumPhase => {
  if (!nightAquariumOpen(state)) return "day";
  const t = state.playTime % AQUARIUM_CYCLE;
  if (t < AQUARIUM_DAY) return "day";
  if (t < AQUARIUM_DAY + AQUARIUM_DUSK) return "dusk";
  if (t < AQUARIUM_DAY + AQUARIUM_DUSK + AQUARIUM_NIGHT) return "night";
  return "dawn";
};

export const aquariumPhaseLabel = (phase: AquariumPhase) =>
  phase === "day"
    ? "昼の水族館"
    : phase === "dusk"
      ? "まもなくナイトアクアリウム"
      : phase === "night"
        ? "ナイトアクアリウム開催中"
        : "夜あけ";
