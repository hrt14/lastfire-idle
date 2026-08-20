/**
 * 青銅の王国 ―― 「配合」と「位」。
 *
 * 仕様書（docs/bronze-kingdom.md §3 / §4）の中身をここに置く。
 *
 * このステージの新しさは二つ。
 *
 * ひとつは **配合**。銅だけでは、やわらかくて刃が立たない。
 * 遠くから運んでくる錫をひとつまみ混ぜて、はじめて青銅になる。
 * 銅は近くの谷で採れるが、錫は隊商でしか来ない ――
 * だから「たくさん掘る」だけでは値が上がらない、という形にする。
 *
 * もうひとつは **位**。納めた器の数だけ、王の名簿で上へ行く。
 * 位が上がると、工房が速くなり、人が集まり、器の値が上がる。
 *
 * どちらも罰ではなく、次に何を買えばいいかの合図として出す。
 */

import type { ShopState, StoveSpec } from "@/lib/shop";
import { stoveHasCook, stoveItem } from "@/lib/shop";

/* ==================== 配合 ==================== */

/**
 * 配合を見る窓の大きさ（地金の数）。
 *
 * 「これまでの合計」で見ると、序盤に銅を掘りためたぶんが
 * いつまでも尾を引いて、あとから錫を足しても質が上がらない。
 * 直近だけを見るために、この数をこえたら両方を半分にたたむ。
 */
const ALLOY_WINDOW = 240;

export type Grade = {
  /** この割合から上 */
  from: number;
  name: string;
  /** 画面に出す一言 */
  note: string;
  /** 器の値の倍率 */
  value: number;
};

/**
 * 錫の混ざりぐあいで決まる、青銅の質。
 *
 * いちばん強いのは、銅九に錫一のあたり（実際の青銅もこの割合）。
 * 少なすぎればやわらかく、多すぎればもろい。
 * どちらの端でも 0.85 までしか下がらない ―― 配合で詰ませない。
 */
export const GRADES: Grade[] = [
  {
    from: 0,
    name: "赤がね",
    note: "錫がほとんど混ざっていない ― やわらかくて、刃が立たない",
    value: 0.85,
  },
  {
    from: 0.03,
    name: "並の青銅",
    note: "刃物にはなる。まだ王の目には留まらない",
    value: 1,
  },
  {
    from: 0.07,
    name: "良い青銅",
    note: "銅九に錫一のあたり。いちばん強い配合",
    value: 1.4,
  },
  {
    from: 0.2,
    name: "錫勝ちの青銅",
    note: "白っぽく、よく響く。鐘にはいいが、刃には向かない",
    value: 1.1,
  },
  {
    from: 0.32,
    name: "もろい青銅",
    note: "錫が多すぎる。落とすと欠ける",
    value: 0.85,
  },
];

/** 錫を知る前の、銅だけの世界 */
const COPPER_ONLY: Grade = {
  from: 0,
  name: "銅",
  note: "錫を知るまでは、これがいちばん硬い金属",
  value: 1,
};

/* ==================== 王の名簿（位） ==================== */

export type Rank = {
  level: number;
  id: string;
  /** 位の名前 */
  name: string;
  /** 「位Lv.3」ではなく、何が変わったかで見せる一言 */
  means: string;
  /** ゲーム効果の説明 */
  effect: string;
  /** ここまで納めると上がる */
  tribute: number;
  /** これを開いていないと上がらない（買い物と足並みをそろえる） */
  needs?: string;
};

export const RANKS: Rank[] = [
  {
    level: 0,
    id: "rank-digger",
    name: "谷の掘り手",
    means: "まだ王は、この谷を知らない",
    effect: "掘って、吹いて、谷の市で売るだけ",
    tribute: 0,
  },
  {
    level: 1,
    id: "rank-smith",
    name: "里の鋳手",
    means: "谷の炉のことが、里まで知られた",
    effect: "型と手つきが決まって、作業場が 8%速くなる",
    tribute: 12,
  },
  {
    level: 2,
    id: "rank-envoy",
    name: "王の使いが来る",
    means: "王の使いが、器を受け取りに谷まで来るようになった",
    effect: "遠くからも人が来る。集まりが 1.25倍",
    tribute: 70,
    needs: "area-1",
  },
  {
    level: 3,
    id: "rank-master",
    name: "宮の匠",
    means: "宮の名簿に、この工房の名が載った",
    effect: "受け持ちの決まった作業場が 18%速くなる",
    tribute: 300,
    needs: "area-2",
  },
  {
    level: 4,
    id: "rank-founder",
    name: "国の鋳師",
    means: "国じゅうの型が、この工房に集まってくる",
    effect: "器ひとつの値が 1.3倍になる",
    tribute: 1200,
    needs: "area-3",
  },
  {
    level: 5,
    id: "rank-treasurer",
    name: "王家の宝師",
    means: "王家の宝を、任されるようになった",
    effect: "工房ぜんたいが 12%速くなる・集まりが 1.4倍",
    tribute: 4500,
    needs: "area-4",
  },
  {
    level: 6,
    id: "rank-grandcaster",
    name: "大鼎の名匠",
    means: "大鼎を鋳るゆるしを得た",
    effect: "工房ぜんたいが 20%速くなる・器の値が 1.4倍",
    tribute: 16000,
    needs: "area-5",
  },
];

/**
 * 納めた器の重み。
 * 大きく、手数のかかったものほど、王の名簿で重い
 */
const TRIBUTE: Record<string, number> = {
  blade: 1,
  bell: 3,
  mirror: 5,
  crown: 12,
};

/* ==================== 状態 ==================== */

export type BronzeState = {
  /** 王に納めた器の重みの合計。このステージの成長そのもの */
  tribute: number;
  /** いまの位（0〜6） */
  rank: number;
  /** 直近に吹いた精銅の数（配合を見るための窓） */
  copper: number;
  /** 直近に届いた錫の数 */
  tin: number;
  /** 大鼎を鋳て、この時代が終わったか */
  casted: boolean;
  /** 描画側が拾う合図 */
  flash: string | null;
};

export const createBronze = (): BronzeState => ({
  tribute: 0,
  rank: 0,
  copper: 0,
  tin: 0,
  casted: false,
  flash: null,
});

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toBronze = (bronze: BronzeState) => ({
  tribute: bronze.tribute,
  rank: bronze.rank,
  copper: bronze.copper,
  tin: bronze.tin,
  casted: bronze.casted,
});

export const fromBronze = (input: unknown): BronzeState => {
  const bronze = createBronze();
  if (!input || typeof input !== "object") return bronze;
  const raw = input as Record<string, unknown>;
  bronze.tribute = Math.max(0, Math.floor(finite(raw.tribute, 0)));
  bronze.rank = Math.min(
    RANKS.length - 1,
    Math.max(0, Math.floor(finite(raw.rank, 0))),
  );
  bronze.copper = Math.max(0, finite(raw.copper, 0));
  bronze.tin = Math.max(0, finite(raw.tin, 0));
  bronze.casted = raw.casted === true;
  return bronze;
};

/* ==================== 読み出し ==================== */

export const isBronze = (state: ShopState) => state.stageId === "bronze";

/**
 * 錫を手に入れる道があるか。
 *
 * 隊商宿を買うまでは、配合そのものが世界にない ―― 銅しか知らない。
 * 「区画を開けたら質が落ちた」にしないため、
 * 錫を取りに行くと決めた（＝隊商宿を買った）ときから配合を見る
 */
export const alloyKnown = (state: ShopState) =>
  isBronze(state) && state.unlocked.includes("caravan-1");

/** 錫の混ざりぐあい（0〜1） */
export const blend = (state: ShopState) => {
  if (!isBronze(state)) return 0;
  const total = state.bronze.copper + state.bronze.tin;
  if (total <= 0) return 0;
  return state.bronze.tin / total;
};

/** いまの青銅の質 */
export const grade = (state: ShopState): Grade => {
  if (!alloyKnown(state)) return COPPER_ONLY;
  const share = blend(state);
  let found = GRADES[0];
  for (const item of GRADES) if (share >= item.from) found = item;
  return found;
};

/** いまの位 */
export const rank = (state: ShopState): Rank =>
  RANKS[isBronze(state) ? state.bronze.rank : 0];

/** 次の位（もう最後なら null） */
export const nextRank = (state: ShopState): Rank | null =>
  isBronze(state) && state.bronze.rank + 1 < RANKS.length
    ? RANKS[state.bronze.rank + 1]
    : null;

/** 次の位までの進みぐあい（0〜1）。HUDの帯に使う */
export const rankProgress = (state: ShopState) => {
  const next = nextRank(state);
  if (!next) return 1;
  const from = RANKS[state.bronze.rank].tribute;
  const span = Math.max(1, next.tribute - from);
  return Math.max(0, Math.min(1, (state.bronze.tribute - from) / span));
};

/**
 * 配合をどう直せばいいか、の一言。
 * 「質が低い」だけだと、何を買えばいいか分からない
 */
export const blendHint = (state: ShopState) => {
  if (!alloyKnown(state)) return "錫の隊商路をひらくと、配合がはじまる";
  const share = blend(state);
  if (share < 0.03) return "錫が足りない ― 隊商宿と錫の運び手を増やそう";
  if (share < 0.07) return "もう少し錫を混ぜると、いちばん強い青銅になる";
  if (share < 0.2) return "いまがいちばん強い配合";
  if (share < 0.32) return "錫が勝ちすぎ ― 掘り場と石の炉を足そう";
  return "錫が多すぎる ― 精銅を増やして薄めよう";
};

/* ==================== 効き目 ==================== */

/** その作業場の進みぐあいの倍率（位で決まる） */
export const bronzeWork = (state: ShopState, stove: StoveSpec) => {
  if (!isBronze(state)) return 1;
  const level = state.bronze.rank;
  let rate = 1;
  // 1 里の鋳手: 型と手つきが決まる
  if (level >= 1) rate *= 1.08;
  // 3 宮の匠: 受け持ちの決まった作業場が速くなる
  if (level >= 3 && stoveHasCook(state, stove.id)) rate *= 1.18;
  // 5 王家の宝師 / 6 大鼎の名匠: 工房ぜんたい
  if (level >= 6) rate *= 1.2;
  else if (level >= 5) rate *= 1.12;
  return rate;
};

/** 人の集まりやすさの倍率 */
export const bronzeDraw = (state: ShopState) => {
  if (!isBronze(state)) return 1;
  const level = state.bronze.rank;
  let rate = 1;
  if (level >= 2) rate *= 1.25;
  if (level >= 5) rate *= 1.4;
  return rate;
};

/** 器の値の倍率（位 × 配合の質） */
export const bronzeValue = (state: ShopState) => {
  if (!isBronze(state)) return 1;
  const level = state.bronze.rank;
  let rate = grade(state).value;
  if (level >= 4) rate *= 1.3;
  if (level >= 6) rate *= 1.4;
  return rate;
};

/* ==================== 地金と献上がたまる ==================== */

/**
 * 作業場がひとつ作りおえたときに呼ばれる。
 *
 * ここで見るのは二つだけ。
 *   - 地金（精銅・錫）… 配合の窓に足す
 *   - できあがった器 …… 王の名簿に足す
 */
export const bronzeMade = (state: ShopState, stove: StoveSpec) => {
  if (!isBronze(state)) return;
  const item = stoveItem(stove);
  const bronze = state.bronze;

  if (item === "copper") bronze.copper += 1;
  else if (item === "tin") bronze.tin += 1;

  // 窓からあふれたら、両方を半分にたたむ。割合はそのまま、効きは直近寄りになる
  if (bronze.copper + bronze.tin > ALLOY_WINDOW) {
    bronze.copper *= 0.5;
    bronze.tin *= 0.5;
  }

  const weight = TRIBUTE[item];
  if (weight) bronze.tribute += weight;
};

/* ==================== 進みの印 ==================== */

/**
 * 買い物では表せない条件。満たすと unlocked に入り、
 * 次の区画や枠がここにぶら下がる（文字のはじまりと同じ作り）。
 */
const BRONZE_MARKS: { id: string; reach: (state: ShopState) => boolean }[] = [
  { id: "mark-first-cast", reach: (state) => state.bronze.tribute >= 1 },
  { id: "mark-tribute-30", reach: (state) => state.bronze.tribute >= 30 },
  { id: "mark-tribute-200", reach: (state) => state.bronze.tribute >= 200 },
  { id: "mark-tribute-900", reach: (state) => state.bronze.tribute >= 900 },
  // 良い配合をいちど当てる。ここではじめて「錫を混ぜる意味」が腑に落ちる
  {
    id: "mark-good-blend",
    reach: (state) => alloyKnown(state) && blend(state) >= 0.07,
  },
  ...RANKS.map((item) => ({
    id: item.id,
    reach: (state: ShopState) => state.bronze.rank >= item.level,
  })),
];

export const BRONZE_MARK_IDS = BRONZE_MARKS.map((mark) => mark.id);

const toast = (state: ShopState, text: string) => {
  state.toast = { text, at: Date.now() };
};

/* ==================== 1フレーム ==================== */

export const updateBronze = (state: ShopState) => {
  if (!isBronze(state)) return;
  const bronze = state.bronze;
  bronze.flash = null;

  /* --- 位が一段あがる --- */
  const next = nextRank(state);
  if (
    next &&
    bronze.tribute >= next.tribute &&
    (!next.needs || state.unlocked.includes(next.needs))
  ) {
    bronze.rank = next.level;
    bronze.flash = "rank";
    toast(state, `🏺 ${next.name} ― ${next.means}`);
    state.sfx.push("buy");
  }

  /* --- 印 --- */
  for (const mark of BRONZE_MARKS) {
    if (state.unlocked.includes(mark.id)) continue;
    if (!mark.reach(state)) continue;
    state.unlocked.push(mark.id);
  }
};

/** 大鼎を鋳たときの、この時代の終わり */
export const bronzeCast = (state: ShopState) => {
  if (state.bronze.casted) return;
  state.bronze.casted = true;
  state.bronze.flash = "cast";
  toast(state, "人は、土から金属を取り出して形にできるようになった。");
};
