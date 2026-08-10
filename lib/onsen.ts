/**
 * 湯けむり温泉街の、町ぜんぶにかかるしくみ。
 *
 *   昼夜   ― 10分でひとめぐり。夜は夜見世が繁盛し、昼は食べ歩きと公園が強い
 *   天候   ― 晴れ・曇り・小雪。小雪の日は露天がよく出て、道の足がすこし遅くなる
 *   湯量   ― 源泉から出る湯には限りがある。使いすぎると湯がぬるくなり、
 *            湯を汲む作業場が遅くなる（止まりはしない）
 *   評判   ― 渡せた客と、待ちきれず帰った客の割合
 *   大祭   ── 町ぜんぶに灯籠がともる夜。客がどっと来る
 *
 * 区画や席の中身は data/stages.ts、運ぶ・渡す・雇うは lib/shop.ts にある。
 * ここはそのうえにかぶせる「町の一日」だけを持つ。
 */

import type { SeatSpec, ShopState, StoveSpec } from "@/lib/shop";

export type OnsenPhase = "day" | "dusk" | "night";
export type OnsenWeather = "clear" | "cloud" | "snow";

/** 昼6分・夕方1分・夜3分で、ひとめぐり10分（仕様書 §15） */
export const ONSEN_DAY = 360;
export const ONSEN_DUSK = 60;
export const ONSEN_NIGHT = 180;
export const ONSEN_FULL = ONSEN_DAY + ONSEN_DUSK + ONSEN_NIGHT;

/** 評判をならす窓（この人数ぶんの出来事で見る） */
const FAME_WINDOW = 40;

export type OnsenState = {
  clock: number;
  day: number;
  phase: OnsenPhase;
  weather: OnsenWeather;
  /** いまの天気があと何日続くか */
  weatherLeft: number;
  /** 渡せた客・待ちきれず帰った客（ならした数） */
  pleased: number;
  upset: number;
  /** 湯あかり大祭をひらいた夜の数 */
  festivals: number;
  /** 大祭をやりきったか（クリア） */
  cleared: boolean;
  /** 描画側が拾う合図 */
  flash: string | null;
};

export const createOnsen = (): OnsenState => ({
  clock: 0,
  day: 1,
  phase: "day",
  weather: "clear",
  weatherLeft: 2,
  pleased: 0,
  upset: 0,
  festivals: 0,
  cleared: false,
  flash: null,
});

export const toOnsen = (onsen: OnsenState) => ({
  clock: onsen.clock,
  day: onsen.day,
  phase: onsen.phase,
  weather: onsen.weather,
  weatherLeft: onsen.weatherLeft,
  pleased: onsen.pleased,
  upset: onsen.upset,
  festivals: onsen.festivals,
  cleared: onsen.cleared,
});

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const fromOnsen = (raw: unknown): OnsenState => {
  const onsen = createOnsen();
  if (!raw || typeof raw !== "object") return onsen;
  const saved = raw as Record<string, unknown>;
  onsen.clock = Math.max(0, Math.min(ONSEN_FULL, num(saved.clock, 0)));
  onsen.day = Math.max(1, Math.floor(num(saved.day, 1)));
  onsen.phase =
    saved.phase === "dusk" || saved.phase === "night" ? saved.phase : "day";
  onsen.weather =
    saved.weather === "cloud" || saved.weather === "snow" ? saved.weather : "clear";
  onsen.weatherLeft = Math.max(0, num(saved.weatherLeft, 2));
  onsen.pleased = Math.max(0, num(saved.pleased, 0));
  onsen.upset = Math.max(0, num(saved.upset, 0));
  onsen.festivals = Math.max(0, Math.floor(num(saved.festivals, 0)));
  onsen.cleared = saved.cleared === true;
  return onsen;
};

/* ---------- どこまで進んだか ---------- */

const isOpen = (state: ShopState, areaId: string) =>
  state.unlocked.includes(areaId);

/**
 * 町の一日がめぐりはじめるか。
 * 最初の数分は、足湯と手ぬぐいだけを覚えてもらいたいので昼のまま止めておく。
 * 到着広場をひらいた（＝客が来る町になった）ところから時計が動く
 */
export const onsenLive = (state: ShopState) =>
  state.stageId === "onsen" && isOpen(state, "area-2");

/** 天気が変わるようになるか（源泉広場から。山の天気が町に届く） */
const weatherLive = (state: ShopState) => isOpen(state, "area-6");

export const phaseLabel = (phase: OnsenPhase) =>
  phase === "day" ? "昼" : phase === "dusk" ? "夕方" : "夜";

export const weatherLabel = (weather: OnsenWeather) =>
  weather === "snow" ? "小雪" : weather === "cloud" ? "曇り" : "晴れ";

/** 夜の暗さ（0〜1）。夕方のあいだにゆっくり暗くなる */
export const darkness = (onsen: OnsenState) => {
  if (onsen.phase === "day") return 0;
  if (onsen.phase === "dusk") return ((onsen.clock - ONSEN_DAY) / ONSEN_DUSK) * 0.55;
  const left = ONSEN_FULL - onsen.clock;
  // 夜明け前の30秒でだんだん明るくなる
  return left < 30 ? (left / 30) * 0.55 : 0.55;
};

/** いまの時間帯があと何秒か */
export const phaseLeft = (onsen: OnsenState) => {
  if (onsen.phase === "day") return ONSEN_DAY - onsen.clock;
  if (onsen.phase === "dusk") return ONSEN_DAY + ONSEN_DUSK - onsen.clock;
  return ONSEN_FULL - onsen.clock;
};

/* ---------- 湯量（仕様書 §10） ---------- */

/** 源泉から出る湯の量。設備を入れるほど増える */
const SPRING_BASE = 20;

/*
 * 設備で増える湯量。ぜんぶ入れて 196 で、町を建てきったときの使用量とほぼ同じ。
 * 大きな湯（大露天・大浴場）を建てると一気に足りなくなるので、
 * そのたびに源泉の側を掘り増すことになる
 */
const SPRING_PLUS: Record<string, number> = {
  noodle: 10, // 湯樋の掃除
  fridge: 10, // 木製分水槽
  yuguchi: 18, // 湯口の拡張
  bunyu: 18, // 配湯管の増設
  horimashi: 48, // 源泉の掘り増し
  yudamari: 72, // 大湯だまり
};

export const springCap = (state: ShopState) => {
  if (!isOpen(state, "area-6")) return SPRING_BASE;
  let cap = SPRING_BASE;
  for (const [id, plus] of Object.entries(SPRING_PLUS)) {
    if (state.unlocked.includes(`equip-${id}`)) cap += plus;
  }
  return cap;
};

/** いま湯を使っている量。開いている湯の席を数える */
export const springUse = (state: ShopState, seats: SeatSpec[]) =>
  seats.reduce(
    (total, seat) =>
      (seat.price === 0 || state.unlocked.includes(seat.id)) && seat.heat
        ? total + seat.heat
        : total,
    0,
  );

/**
 * 湯のゆきわたり具合（0.35〜1）。
 * 足りないと湯がぬるくなり、湯を汲む作業場が遅くなる。
 * 完全には止めない ―― 止めてしまうと、湯を増やす稼ぎまで消えてしまう（§10.2）
 */
export const springRatio = (state: ShopState, seats: SeatSpec[]) => {
  const use = springUse(state, seats);
  if (use <= 0) return 1;
  return Math.max(0.35, Math.min(1, springCap(state) / use));
};

/** 湯の温度の見せかた（不足するほどぬるい） */
export const springLabel = (ratio: number) =>
  ratio >= 0.999 ? "ちょうどよい湯" : ratio >= 0.7 ? "すこしぬるい" : "湯がぬるい";

/* ---------- 一日のめぐりが、稼ぎに効く ---------- */

/** 夜がにぎわう区画（夜見世通りと、その両側の店） */
const NIGHT_AREAS = new Set([24, 25, 26]);
/** 昼がにぎわう区画（食べ歩き通りと湯川公園） */
const DAY_AREAS = new Set([10, 11, 12, 13, 19, 20, 21, 22]);
/** 外の湯（小雪の日に人気が上がる） */
const OPEN_AIR = new Set([19, 20, 22, 29]);

/**
 * その席の単価にかかる倍率。
 * 時間帯・天気・大祭で変わる ―― 同じ席でも、いつ来るかで実入りが違う
 */
export const payBonus = (
  state: ShopState,
  seat: SeatSpec,
  festival: boolean,
) => {
  if (state.stageId !== "onsen") return 1;
  const { phase, weather } = state.onsen;
  let bonus = 1;
  if (phase === "night" && NIGHT_AREAS.has(seat.area)) bonus *= 2;
  if (phase === "night" && !NIGHT_AREAS.has(seat.area)) bonus *= 1.1;
  if (phase === "day" && DAY_AREAS.has(seat.area)) bonus *= 1.25;
  if (weather === "snow" && OPEN_AIR.has(seat.area)) bonus *= 1.3;
  if (weather === "cloud") bonus *= 0.95;
  if (festival) bonus *= 1.5;
  return bonus;
};

/** 集客にかかる倍率（夜と大祭で人出が変わる） */
export const drawBonus = (state: ShopState, festival: boolean) => {
  if (!onsenLive(state)) return 1;
  const { phase, weather } = state.onsen;
  let bonus = phase === "night" ? 1.2 : phase === "dusk" ? 1.1 : 1;
  if (weather === "snow") bonus *= 0.85;
  if (festival) bonus *= 3;
  return bonus;
};

/** 小雪の日は道が滑る。融雪の設備を入れると戻る */
export const moveBonus = (state: ShopState) => {
  if (!onsenLive(state) || state.onsen.weather !== "snow") return 1;
  return state.unlocked.includes("equip-yusetsu") ? 1 : 0.9;
};

/** 湯がぬるいと、湯を汲む作業場だけ遅くなる */
export const onsenWork = (
  state: ShopState,
  stove: StoveSpec,
  seats: SeatSpec[],
) => {
  if (state.stageId !== "onsen") return 1;
  if ((stove.item ?? "main") !== "main") return 1;
  return springRatio(state, seats);
};

/* ---------- 評判（仕様書 §18.1） ---------- */

export const reputation = (onsen: OnsenState) => {
  const all = onsen.pleased + onsen.upset;
  if (all < 4) return 1;
  return onsen.pleased / all;
};

/** 客に渡せた */
export const notePleased = (state: ShopState) => {
  if (state.stageId !== "onsen") return;
  const onsen = state.onsen;
  onsen.pleased += 1;
  if (onsen.pleased + onsen.upset > FAME_WINDOW) {
    onsen.pleased *= 0.9;
    onsen.upset *= 0.9;
  }
};

/** 待ちきれずに帰られた */
export const noteUpset = (state: ShopState) => {
  if (state.stageId !== "onsen") return;
  const onsen = state.onsen;
  onsen.upset += 1;
  if (onsen.pleased + onsen.upset > FAME_WINDOW) {
    onsen.pleased *= 0.9;
    onsen.upset *= 0.9;
  }
};

/* ---------- 湯あかり大祭（仕様書 §11 街区9 / §24） ---------- */

/** 大祭をひらける町か（大浴場まで建てて、灯籠を入れた） */
export const festivalReady = (state: ShopState) =>
  state.stageId === "onsen" &&
  isOpen(state, "area-29") &&
  state.unlocked.includes("equip-yuakari");

/** いま大祭のさなかか（開ける町の、夜のあいだ） */
export const festivalOn = (state: ShopState) =>
  festivalReady(state) && state.onsen.phase === "night";

/** クリアに要る評判 */
export const FESTIVAL_FAME = 0.8;

/* ---------- 時計を進める ---------- */

const nextWeather = (state: ShopState): OnsenWeather => {
  if (!weatherLive(state)) return "clear";
  const roll = Math.random();
  if (roll < 0.55) return "clear";
  if (roll < 0.85) return "cloud";
  return "snow";
};

export const updateOnsen = (state: ShopState, dt: number) => {
  if (state.stageId !== "onsen") return;
  const onsen = state.onsen;
  onsen.flash = null;
  if (!onsenLive(state)) {
    onsen.phase = "day";
    onsen.clock = 0;
    return;
  }

  onsen.clock += dt;
  const was = onsen.phase;
  if (onsen.clock >= ONSEN_FULL) {
    onsen.clock -= ONSEN_FULL;
    onsen.day += 1;
    onsen.phase = "day";
    onsen.weatherLeft -= 1;
    if (onsen.weatherLeft <= 0) {
      onsen.weather = nextWeather(state);
      onsen.weatherLeft = 1 + Math.floor(Math.random() * 2);
    }
  } else if (onsen.clock >= ONSEN_DAY + ONSEN_DUSK) {
    onsen.phase = "night";
  } else if (onsen.clock >= ONSEN_DAY) {
    onsen.phase = "dusk";
  } else {
    onsen.phase = "day";
  }

  if (was === onsen.phase) return;

  // 時間帯が変わった。合図と、大祭の始まり／終わり
  if (onsen.phase === "dusk") {
    onsen.flash = "dusk";
    state.toast = { text: "日が暮れてきた ― 提灯に灯が入る", at: Date.now() };
  }
  if (onsen.phase === "night") {
    if (festivalReady(state)) {
      onsen.flash = "festival";
      state.toast = {
        text: "湯あかり大祭がはじまった！ 町じゅうに灯籠がともる",
        at: Date.now(),
      };
    } else {
      onsen.flash = "night";
    }
  }
  if (was === "night") {
    // 夜が明けた。大祭をやりきったかを見る
    if (festivalReady(state)) {
      onsen.festivals += 1;
      const fame = reputation(onsen);
      if (fame >= FESTIVAL_FAME && !onsen.cleared) {
        onsen.cleared = true;
        onsen.flash = "cleared";
        state.toast = {
          text: "一本道から、ひとつの温泉街が生まれた",
          at: Date.now(),
        };
      } else if (!onsen.cleared) {
        state.toast = {
          text: `大祭が終わった ― 評判 ${Math.round(fame * 100)}%（80%で町が完成する）`,
          at: Date.now(),
        };
      }
    }
    onsen.flash = onsen.flash ?? "dawn";
  }
};
