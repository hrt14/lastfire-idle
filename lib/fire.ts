/**
 * 「火のはじまり」第2区画以降の仕組み。
 *
 * 1区画目は「仕事を覚えて、仕組みにする」だけだった。
 * 2区画目からは、区画ごとに新しい問題を足していく:
 *
 *   第2区画 集落のはじまり  昼夜・備蓄・住居・人口
 *   第3区画 マンモスの谷    集団狩猟・討伐・解体・大量輸送
 *   第4区画 冬を越す        気温・吹雪・防寒・集落の維持
 *   第5区画 村の誕生        人口・職業・公共設備
 *   第6区画 川への道        探索・造船・水運・出航
 *
 * ここはその5つぶんの「時間・人・生きもの・天気」を持つ。
 * 置き場所や値段は data/stages.ts、運ぶ仕組みは lib/shop.ts にある。
 *
 * lib/shop.ts からは型だけを取り込む（実行時の輪にしない）。
 */

import { stageDefs } from "@/data/stages";
import { taigaSail } from "@/lib/taiga";
import type { ShopState, StoveSpec, Vec } from "@/lib/shop";

/* ---------- 時間 ---------- */

/** 昼・夕方・夜の長さ（秒）。合わせて1日 */
export const DAY_TIME = 90;
export const DUSK_TIME = 15;
export const NIGHT_TIME = 30;
export const FULL_DAY = DAY_TIME + DUSK_TIME + NIGHT_TIME;

export type FirePhase = "day" | "dusk" | "night";

export type Weather = "clear" | "cold" | "blizzard";

/** 集落に住む人。夜は住居へ帰り、昼は広場に集まる */
export type Resident = {
  id: number;
  pos: Vec;
  target: Vec;
  /** 住んでいる家（建築予定地の id） */
  home: string;
  bob: number;
  /** 手ぶらで手伝っているか（見た目のちがい） */
  helper: boolean;
};

/**
 * 谷の巨獣（マンモス）。
 * 一定時間ごとに肉を出す設備ではなく、歩き、警戒し、突進する生きもの。
 */
export type Beast = {
  id: number;
  pos: Vec;
  target: Vec;
  /** 体力（0 で倒れる） */
  hp: number;
  /** 持久力（追い込むと減る。減ると疲れて体力が削れるようになる） */
  stamina: number;
  /** 警戒度 */
  alert: number;
  state: "roam" | "graze" | "flee" | "charge" | "falling" | "down";
  timer: number;
  face: number;
  /** 解体の進み（0〜1） */
  cut: number;
  /** 品種ごとに、もう取り出した数 */
  given: Record<string, number>;
  /** 仮置き場が満杯で解体が止まっているか */
  stuck: boolean;
  /** 止まったまま経った秒数（長く続くと、その資源はあきらめる） */
  stuckTime: number;
  /** 置き場がなくて取りこぼした品 */
  spoiled: string[];
  /** 倒れてからの秒数（骨格が残っているあいだ） */
  rest: number;
};

/** 夜の森に現れるオオカミ。倒す敵ではなく、光で距離を取らせる。 */
export type NightWolf = {
  id: number;
  pos: Vec;
  target: Vec;
  state: "roam" | "approach" | "flee";
  timer: number;
  face: number;
};

export type NightReport = {
  day: number;
  need: number;
  got: number;
  ok: boolean;
  /** 寒さで越せなかったか */
  cold: boolean;
};

export type FireState = {
  clock: number;
  day: number;
  phase: FirePhase;
  /** 越した夜の数 */
  nights: number;
  /** 越した「寒い夜」の数（第4区画） */
  coldNights: number;
  /** きのう足りなかった保存肉 */
  shortfall: number;
  /** 今日の作業の調子（1.0 が基準） */
  morale: number;
  /** いまの住民の数 */
  pop: number;
  residents: Resident[];
  weather: Weather;
  weatherLeft: number;
  /** いまの気温（およその度） */
  temp: number;
  beast: Beast | null;
  /** 次の1頭が現れるまで */
  beastWait: number;
  /** 倒した数 */
  kills: number;
  /** 解体してからの秒数（肉の鮮度） */
  fresh: number;
  /** 出た探索の回数 */
  voyages: number;
  voyageLeft: number;
  /** 見つけた土地 */
  finds: string[];
  /** 大型いかだで出航したか */
  sailed: boolean;
  report: NightReport | null;
  /** 直前に鳴らす合図（描画側が拾う） */
  flash: string | null;
  /** 建てかけの建物が、まだ欲しがっている品と数（毎フレーム数え直す） */
  wants: Record<string, number>;

  /* ---- 寄り道「夜の森」 ---- */
  nightWolves: NightWolf[];
  wolfSpawn: number;
  /** 餌を受け取って近づいた夜の数。3で犬になる */
  wolfTrust: number;
  /** 同じ夜に何度も餌を食べないための日付 */
  wolfFedDay: number;
  /** たいまつ台へ薪を入れた日 */
  nightFuelDay: number;
  /** 今夜、実際に点いているたいまつ台の本数 */
  nightLitPosts: number;
  dogTamed: boolean;
  dogPos: Vec;
};

export const createFire = (): FireState => ({
  clock: 0,
  day: 1,
  phase: "day",
  nights: 0,
  coldNights: 0,
  shortfall: 0,
  morale: 1,
  pop: 0,
  residents: [],
  weather: "clear",
  weatherLeft: 0,
  temp: 8,
  beast: null,
  beastWait: 6,
  kills: 0,
  fresh: 999,
  voyages: 0,
  voyageLeft: 0,
  finds: [],
  sailed: false,
  report: null,
  flash: null,
  wants: {},
  nightWolves: [],
  wolfSpawn: 2,
  wolfTrust: 0,
  wolfFedDay: -1,
  nightFuelDay: -1,
  nightLitPosts: 0,
  dogTamed: false,
  dogPos: { x: 2470, y: -450 },
});

/** 保存するぶん（人や獣の居場所は持ち越さない） */
export const toFire = (fire: FireState) => ({
  clock: fire.clock,
  day: fire.day,
  phase: fire.phase,
  nights: fire.nights,
  coldNights: fire.coldNights,
  pop: fire.pop,
  kills: fire.kills,
  voyages: fire.voyages,
  finds: fire.finds,
  sailed: fire.sailed,
  wolfTrust: fire.wolfTrust,
  wolfFedDay: fire.wolfFedDay,
  dogTamed: fire.dogTamed,
});

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const fromFire = (raw: unknown): FireState => {
  const fire = createFire();
  if (!raw || typeof raw !== "object") return fire;
  const saved = raw as Record<string, unknown>;
  fire.clock = Math.max(0, Math.min(FULL_DAY, num(saved.clock, 0)));
  fire.day = Math.max(1, Math.floor(num(saved.day, 1)));
  fire.phase =
    saved.phase === "dusk" || saved.phase === "night" ? saved.phase : "day";
  fire.nights = Math.max(0, Math.floor(num(saved.nights, 0)));
  fire.coldNights = Math.max(0, Math.floor(num(saved.coldNights, 0)));
  fire.pop = Math.max(0, Math.floor(num(saved.pop, 0)));
  fire.kills = Math.max(0, Math.floor(num(saved.kills, 0)));
  fire.voyages = Math.max(0, Math.floor(num(saved.voyages, 0)));
  fire.sailed = saved.sailed === true;
  fire.wolfTrust = Math.max(0, Math.min(3, Math.floor(num(saved.wolfTrust, 0))));
  fire.wolfFedDay = Math.floor(num(saved.wolfFedDay, -1));
  fire.dogTamed = saved.dogTamed === true || fire.wolfTrust >= 3;
  if (Array.isArray(saved.finds)) {
    fire.finds = saved.finds.filter((id): id is string => typeof id === "string");
  }
  return fire;
};

/* ---------- 区画のなかを見る ---------- */

/*
 * いま遊んでいるステージの作業場。
 * 建築予定地は「火のはじまり」だけの仕組みではなくなったので、
 * ここを fire に固定したままだと、ほかのステージの建物が永久に建たない
 */
const specs = (state: ShopState) => stageDefs[state.stageId].stoves;

const areaOpen = (state: ShopState, area: number) =>
  area === 0 || state.unlocked.includes(`area-${area}`);

/** いま動いている作業場（買ってあって、区画も開いているもの） */
export const liveStoves = (state: ShopState): StoveSpec[] =>
  specs(state).filter(
    (stove) => state.unlocked.includes(stove.id) && areaOpen(state, stove.area),
  );

/** 建てあがったか */
export const isBuilt = (state: ShopState, id: string) => state.built.includes(id);

/** 建てあがった建築予定地 */
export const builtSites = (state: ShopState): StoveSpec[] =>
  specs(state).filter((stove) => stove.needs && isBuilt(state, stove.id));

/** 集落の様子を見て回るのに使う、ちいさな道具 */
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

const step = (pos: Vec, to: Vec, speed: number, dt: number) => {
  const dx = to.x - pos.x;
  const dy = to.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.5) return true;
  const move = Math.min(d, speed * dt);
  pos.x += (dx / d) * move;
  pos.y += (dy / d) * move;
  return false;
};

const say = (state: ShopState, at: Vec, text: string) => {
  state.pops.push({ id: state.nextId++, pos: { ...at }, text, age: 0 });
};

const toast = (state: ShopState, text: string) => {
  state.toast = { text, at: Date.now() };
};

/* ---------- 昼夜 ---------- */

/** 第2区画が開いていれば、昼と夜がめぐりはじめる */
export const fireLive = (state: ShopState) =>
  state.stageId === "fire" && state.unlocked.includes("area-1");

/**
 * 冬のさなかか（第4区画）。
 * 寒い夜を3回越えると雪は解けはじめ、村づくりの季節になる。
 */
export const COLD_NIGHTS = 3;

export const winterOn = (state: ShopState) =>
  state.stageId === "fire" &&
  state.unlocked.includes("area-3") &&
  state.fire.coldNights < COLD_NIGHTS;

export const phaseLabel = (phase: FirePhase) =>
  phase === "day" ? "昼" : phase === "dusk" ? "夕方" : "夜";

/** いまの区切りが終わるまでの残り秒 */
export const phaseLeft = (fire: FireState) => {
  if (fire.phase === "day") return DAY_TIME - fire.clock;
  if (fire.phase === "dusk") return DAY_TIME + DUSK_TIME - fire.clock;
  return FULL_DAY - fire.clock;
};

/**
 * 夜の結果を出しておく長さ（秒）。
 * 夜そのものは30秒あるが、その全部を結果表示でふさぐと
 * 「メッセージが消えない」ように感じてしまう。夜のはじめの数秒だけ見せる
 */
export const REPORT_SHOW = 6;

/** いま夜越しの結果を出す番か（夜になってからの数秒だけ） */
export const reportVisible = (fire: FireState) =>
  fire.phase === "night" && fire.clock - (DAY_TIME + DUSK_TIME) < REPORT_SHOW;

/** 夜の暗さ（0 = 昼、1 = 真夜中） */
export const darkness = (fire: FireState) => {
  if (fire.phase === "day") return 0;
  if (fire.phase === "dusk") return ((fire.clock - DAY_TIME) / DUSK_TIME) * 0.72;
  const t = (fire.clock - DAY_TIME - DUSK_TIME) / NIGHT_TIME;
  // 夜の終わりは少しずつ明ける
  return 0.72 + Math.sin(Math.min(1, t) * Math.PI) * 0.1 - Math.max(0, t - 0.8) * 1.2;
};

/* ---------- 備蓄 ---------- */

/** 貯蔵庫（食料庫・薪倉庫） */
export const stores = (state: ShopState, kind: string) =>
  liveStoves(state).filter((stove) => stove.store && stove.takes === kind);

/** その種類の備蓄の合計 */
export const stockIn = (state: ShopState, kind: string) =>
  stores(state, kind).reduce((sum, stove) => sum + (state.hold[stove.id] ?? 0), 0);

/** 貯蔵庫から取り出す。取れた数を返す */
const drawFrom = (state: ShopState, kind: string, count: number) => {
  let left = count;
  for (const stove of stores(state, kind)) {
    const have = state.hold[stove.id] ?? 0;
    const take = Math.min(have, left);
    if (take <= 0) continue;
    state.hold[stove.id] = have - take;
    left -= take;
    if (left <= 0) break;
  }
  return count - left;
};

/** 定住できる人数（住居の合計） */
export const popCap = (state: ShopState) =>
  builtSites(state).reduce((sum, site) => sum + (site.gives?.houses ?? 0), 0);

/** 今夜いる食べもの（住民ひとりに保存肉ひとつ） */
export const nightNeed = (state: ShopState) => state.fire.pop;

/**
 * 今夜のぶんが、まだ足りていないか。
 *
 * 足りていないあいだは、はこび手が保存肉づくりのほうを先に助ける。
 * こうしないと、待っている仲間へ焼き肉を配るのが always 優先されて、
 * 燻製小屋にはいつまでも材料が回らず、毎晩ひもじいままになる。
 */
export const nightShort = (state: ShopState) =>
  fireLive(state) &&
  stockIn(state, "smoked") < Math.max(nightNeed(state), MIN_LARDER);

/** 人がいなくても、これだけは食料庫に置いておく */
export const MIN_LARDER = 4;

/**
 * 建てかけの建物があるあいだ、貯蔵庫が抱えこんでよい数。
 *
 * これがないと、食料番が保存肉を全部 食料庫へ入れてしまい、
 * 「あと2こで建つ住居」がいつまでも建たない。
 * 夜のぶんを確保したら、余りは建築へ回す。
 */
export const storeKeep = (state: ShopState, kind: string) => {
  if (kind === "smoked") return Math.max(nightNeed(state), MIN_LARDER);
  if (kind === "wood") return winterOn(state) ? 12 : 8;
  return 4;
};

/** 建てかけの建物が、まだ欲しがっている品と数を数え直す */
const countWants = (state: ShopState) => {
  const wants: Record<string, number> = {};
  for (const site of liveStoves(state)) {
    if (!site.needs || isBuilt(state, site.id)) continue;
    for (const [kind, need] of Object.entries(site.needs)) {
      const got = state.parts[site.id]?.[kind] ?? 0;
      if (got < need) wants[kind] = (wants[kind] ?? 0) + (need - got);
    }
  }
  state.fire.wants = wants;
};

/** 共同たき火があるか */
const hearths = (state: ShopState) =>
  builtSites(state).filter((site) => site.gives?.hearth);

/** 集落の暖かさ（建てたものと薪で決まる） */
export const warmth = (state: ShopState) => {
  let warm = builtSites(state).reduce(
    (sum, site) => sum + (site.gives?.warm ?? 0),
    0,
  );
  // 共同たき火は、薪があるあいだだけ効く
  if (hearths(state).length > 0 && stockIn(state, "wood") > 0) warm += 3;
  // 仕立てた防寒着は、着ている人のぶんだけ効く
  const coats = Math.min(state.fire.pop, stockIn(state, "coat"));
  warm += coats * 0.4;
  return warm;
};

/** いまの気温 */
export const temperature = (state: ShopState) => {
  const fire = state.fire;
  const base = fire.phase === "day" ? 7 : fire.phase === "dusk" ? 2 : -3;
  const winter = winterOn(state) ? -9 : 0;
  const sky =
    fire.weather === "blizzard" ? -9 : fire.weather === "cold" ? -4 : 0;
  return Math.round(base + winter + sky + warmth(state));
};

export const tempLabel = (temp: number) =>
  temp >= 5 ? "暖かい" : temp >= 0 ? "寒い" : temp >= -6 ? "厳寒" : "吹雪";

/* ---------- 作業の速さ ---------- */

/** 外の仕事か（夜と吹雪で止まりやすい） */
const outdoor = (stove: StoveSpec) =>
  stove.art === "hunt" || stove.art === "forest" || stove.art === "clay";

/**
 * その作業場の進みの倍率。
 * 夜は外の仕事が止まり、寒いとみんな遅くなる。0 を返すと止まる。
 */
export const fireWork = (state: ShopState, stove: StoveSpec) => {
  if (!fireLive(state)) return 1;
  const fire = state.fire;
  let rate = fire.morale;
  if (fire.phase === "night" && outdoor(stove)) return 0;
  if (fire.phase === "dusk" && outdoor(stove)) rate *= 0.6;
  if (fire.weather === "blizzard" && outdoor(stove)) return 0;
  const temp = fire.temp;
  if (temp < 0) rate *= Math.max(0.55, 1 + temp * 0.035);
  return rate;
};

/** 歩く速さの倍率（雪の上は遅い） */
export const fireMove = (state: ShopState) => {
  if (!fireLive(state)) return 1;
  const fire = state.fire;
  let rate = 1;
  if (fire.weather === "blizzard") rate *= 0.72;
  else if (fire.temp < -3) rate *= 0.86;
  if (fire.phase === "night") rate *= 0.92;
  return rate;
};

/** 地面に積もった雪の深さ（0〜1）。見た目に使う */
export const snowDepth = (state: ShopState) => {
  if (!winterOn(state)) return 0;
  const fire = state.fire;
  const base = 0.45 + (fire.weather === "blizzard" ? 0.4 : fire.weather === "cold" ? 0.2 : 0);
  return Math.min(1, base);
};

/* ---------- 住民 ---------- */

const houseSites = (state: ShopState) =>
  builtSites(state).filter((site) => (site.gives?.houses ?? 0) > 0);

/** 住民が集まる広場（集会所か、いちばん最初の住居のそば） */
export const plazaPos = (state: ShopState): Vec | null => {
  const hall = builtSites(state).find((site) => site.gives?.hearth);
  if (hall) return { x: hall.pos.x, y: hall.pos.y + 40 };
  const house = houseSites(state)[0];
  return house ? { x: house.pos.x + 60, y: house.pos.y + 30 } : null;
};

const scatter = (at: Vec, i: number, radius: number): Vec => ({
  x: at.x + Math.cos(i * 2.4) * radius,
  y: at.y + Math.sin(i * 2.4) * radius * 0.5,
});

const updateResidents = (state: ShopState, dt: number) => {
  const fire = state.fire;
  const houses = houseSites(state);
  if (houses.length === 0) {
    fire.residents = [];
    return;
  }
  // 人数に合わせて、住民を出したり引っこめたりする
  while (fire.residents.length > fire.pop) fire.residents.pop();
  while (fire.residents.length < fire.pop) {
    const home = houses[fire.residents.length % houses.length];
    fire.residents.push({
      id: state.nextId++,
      pos: { x: home.pos.x, y: home.pos.y + 24 },
      target: { x: home.pos.x, y: home.pos.y + 24 },
      home: home.id,
      bob: Math.random() * 6,
      helper: fire.residents.length % 3 === 0,
    });
  }

  const plaza = plazaPos(state);
  fire.residents.forEach((person, i) => {
    const house = houses.find((item) => item.id === person.home) ?? houses[0];
    person.home = house.id;
    const night = fire.phase === "night" || fire.weather === "blizzard";
    const want = night
      ? { x: house.pos.x + ((i % 3) - 1) * 12, y: house.pos.y + 22 }
      : plaza
        ? scatter(plaza, i, 38)
        : { x: house.pos.x, y: house.pos.y + 30 };
    person.target = want;
    const moving = !step(person.pos, want, 42, dt);
    person.bob += dt * (moving ? 9 : 2.2);
  });
};

/* ---------- 夜越し ---------- */

const settleNight = (state: ShopState, value: number) => {
  const fire = state.fire;
  const need = nightNeed(state);
  const got = drawFrom(state, "smoked", need);
  const cold = winterOn(state) && fire.temp < -6;
  const ok = got >= need && !cold;
  fire.shortfall = Math.max(0, need - got);

  const plaza = plazaPos(state) ?? { x: 0, y: 0 };
  if (need === 0) {
    // まだ住民がいない夜は、静かに明ける（結果を出すほどの夜でもない）
    fire.report = null;
    fire.morale = 1;
    return;
  }
  fire.report = { day: fire.day, need, got, ok, cold };
  if (ok) {
    fire.nights += 1;
    if (winterOn(state)) fire.coldNights += 1;
    // 夜越しの祝いに、貝がらが集まる
    const bonus = Math.round(value * need * 0.9);
    state.money += bonus;
    fire.morale = 1.15;
    // 空きがあれば人が増える（集まる場所があると増えやすい）
    const cap = popCap(state);
    const grow = builtSites(state).some((site) => site.gives?.hearth) ? 3 : 2;
    if (fire.pop < cap) {
      fire.pop = Math.min(cap, fire.pop + grow);
      say(state, plaza, "仲間がふえた！");
    }
    say(state, { x: plaza.x, y: plaza.y - 20 }, `+${bonus}貝`);
    toast(state, `${fire.day}日目の夜を越した（保存肉 ${got}／${need}）`);
    state.sfx.push("coin");
  } else {
    fire.morale = 0.82;
    toast(
      state,
      cold
        ? `${fire.day}日目の夜は冷えこんだ。薪と毛皮を増やそう`
        : `保存肉が ${need - got}こ 足りなかった。明日は燻製を増やそう`,
    );
    say(state, plaza, cold ? "さむい…" : "おなかがすいた…");
  }
};

/* ---------- 天気 ---------- */

const updateWeather = (state: ShopState, dt: number) => {
  const fire = state.fire;
  if (!winterOn(state)) {
    fire.weather = "clear";
    fire.weatherLeft = 0;
    return;
  }
  fire.weatherLeft -= dt;
  if (fire.weatherLeft > 0) return;
  // 晴れ → 寒い → 吹雪 → 寒い …と移り変わる
  if (fire.weather === "blizzard") {
    fire.weather = "cold";
    fire.weatherLeft = 60;
  } else if (fire.weather === "cold") {
    // 夜のほうが吹雪きやすい
    fire.weather = fire.phase === "night" ? "blizzard" : "clear";
    fire.weatherLeft = fire.weather === "blizzard" ? 26 : 40;
    if (fire.weather === "blizzard") {
      toast(state, "吹雪だ。外の仕事は止まる ― 薪と食料を切らすな");
      fire.flash = "blizzard";
    }
  } else {
    fire.weather = "cold";
    fire.weatherLeft = 50;
  }
};

/* ---------- 谷の巨獣 ---------- */

/** 巨獣の谷（買ってあって、区画も開いているもの） */
const valley = (state: ShopState) =>
  liveStoves(state).find((stove) => stove.beast) ?? null;

export const beastZone = (stove: StoveSpec) =>
  stove.zone ?? {
    x0: stove.pos.x - 200,
    y0: stove.pos.y - 150,
    x1: stove.pos.x + 200,
    y1: stove.pos.y + 150,
  };

const spotIn = (rect: { x0: number; y0: number; x1: number; y1: number }): Vec => ({
  x: rect.x0 + Math.random() * (rect.x1 - rect.x0),
  y: rect.y0 + Math.random() * (rect.y1 - rect.y0),
});

/** 谷に置いた罠（買った設備がそのまま効く） */
export const traps = (state: ShopState) =>
  stageDefs.fire.equipment.filter(
    (item) => item.trap && state.unlocked.includes(`equip-${item.id}`),
  );

/** 罠の効き目の合計 */
const trapPower = (state: ShopState) =>
  traps(state).reduce((sum, item) => sum + (item.trap ?? 0), 0);

/** 仮置き場が満杯のまま、これだけ待たされたら、その品はあきらめる（秒） */
const SPOIL_WAIT = 30;

/** 取りこぼしを伝えるための呼び名（lib/shop.ts と同じ言い方にそろえる） */
const itemName = (kind: string) =>
  ({
    mmeat: "マンモス肉",
    hide: "毛皮",
    bone: "骨",
    fat: "脂",
    tusk: "牙",
  })[kind] ?? kind;

/** マンモスから取れるもの（1頭ぶん）。解体の進みに合わせて順に出てくる */
const YIELD: { kind: string; count: number; from: number }[] = [
  // 最初から肉が出はじめる
  { kind: "mmeat", count: 36, from: 0.05 },
  // 毛皮を外し、牙を取る
  { kind: "hide", count: 6, from: 0.25 },
  { kind: "tusk", count: 2, from: 0.45 },
  // 中ほどから脂、終わりに骨
  { kind: "fat", count: 8, from: 0.5 },
  { kind: "bone", count: 6, from: 0.7 },
];

/**
 * 積める数。lib/shop.ts の holdCap と同じ数え方をする
 * （型だけを取り込む決まりなので、ここでも同じ式を書いておく）
 */
const capacityOf = (state: ShopState, stove: StoveSpec) => {
  const plus = stageDefs.fire.equipment.reduce(
    (sum, item) =>
      item.capacity?.stove === stove.id &&
      state.unlocked.includes(`equip-${item.id}`)
        ? sum + item.capacity.plus
        : sum,
    0,
  );
  const base = stove.hold ?? (state.unlocked.includes("equip-fridge") ? 9 : 5);
  return base + plus;
};

/** その品の仮置き場（空きのあるもの） */
const pileFor = (state: ShopState, kind: string) =>
  liveStoves(state).find(
    (stove) =>
      stove.pile &&
      (stove.item ?? "") === kind &&
      (state.ready[stove.id] ?? 0) < capacityOf(state, stove),
  ) ?? null;

/** いま巨獣に向かっている狩人の数 */
const huntersOn = (state: ShopState, groundId: string) =>
  state.staff.filter(
    (worker) =>
      worker.kind === "hunter" &&
      worker.stoveId === groundId &&
      (worker.down ?? 0) <= 0,
  ).length;

const newBeast = (state: ShopState, ground: StoveSpec): Beast => {
  const zone = beastZone(ground);
  const at = spotIn(zone);
  return {
    id: state.nextId++,
    pos: at,
    target: spotIn(zone),
    hp: 1,
    stamina: 1,
    alert: 0,
    state: "roam",
    timer: 0,
    face: 1,
    cut: 0,
    given: {},
    stuck: false,
    stuckTime: 0,
    spoiled: [],
    rest: 0,
  };
};

/** いま谷にいる巨獣 */
export const beastOf = (state: ShopState) => state.fire.beast;

/**
 * プレイヤーや狩人が近づいたときの、追い込みと攻撃。
 * 持久力が残っているうちは体力が減らない（まず追い込む）。
 */
const pressBeast = (state: ShopState, beast: Beast, hunters: number, dt: number) => {
  const dogHelp =
    state.fire.dogTamed && dist(state.fire.dogPos, beast.pos) < 110 ? 0.35 : 0;
  const near = hunters + (dist(state.player.pos, beast.pos) < 90 ? 1 : 0) + dogHelp;
  if (near <= 0) {
    // だれも追っていないと、息を整えて回復する
    beast.stamina = Math.min(1, beast.stamina + dt * 0.02);
    beast.alert = Math.max(0, beast.alert - dt * 0.25);
    return;
  }
  beast.alert = Math.min(1, beast.alert + dt * 0.5);
  const trapped = 1 + trapPower(state) * 0.25;
  if (beast.stamina > 0) {
    beast.stamina = Math.max(
      0,
      beast.stamina - dt * 0.0045 * Math.pow(near, 0.75) * trapped,
    );
    if (beast.stamina === 0) {
      say(state, { x: beast.pos.x, y: beast.pos.y - 60 }, "つかれてきた！");
    }
  } else {
    // 疲れきってから、はじめて仕留めにかかれる
    beast.hp = Math.max(0, beast.hp - dt * 0.006 * Math.pow(near, 0.8));
  }
};

/** 突進。当たった狩人はしばらく起き上がれない（死なない） */
const chargeBeast = (state: ShopState, beast: Beast) => {
  for (const worker of state.staff) {
    if (worker.kind !== "hunter" && worker.kind !== "butcher") continue;
    if (dist(worker.pos, beast.pos) > 54) continue;
    worker.down = 5 + Math.random() * 5;
    say(state, { x: worker.pos.x, y: worker.pos.y - 30 }, "うわっ");
  }
};

const updateBeast = (state: ShopState, dt: number) => {
  const fire = state.fire;
  const ground = valley(state);
  if (!ground) {
    fire.beast = null;
    return;
  }
  if (!fire.beast) {
    fire.beastWait -= dt;
    if (fire.beastWait <= 0) {
      fire.beast = newBeast(state, ground);
      toast(state, "谷にマンモスの足跡を見つけた");
      fire.flash = "beast";
    }
    return;
  }

  const beast = fire.beast;
  const zone = beastZone(ground);
  const hunters = huntersOn(state, ground.id);

  if (beast.state === "down") {
    // 倒れたマンモスは、解体されるまでその場に残る
    beast.rest += dt;
    fire.fresh += dt;
    /*
     * 仮置き場が満杯のままだと、解体はそこで止まる。
     * ただし、その品の使い道がまだ無いとき（脂や牙は先の区画で使う）に
     * 永久に止まってしまうので、しばらく待っても運び出されなければ
     * その品はあきらめて先へ進む。取りこぼしたことは伝える。
     */
    if (beast.stuck) {
      beast.stuckTime += dt;
      if (beast.stuckTime >= SPOIL_WAIT) {
        beast.stuckTime = 0;
        const blocked = YIELD.find(
          (row) =>
            (beast.given[row.kind] ?? 0) < row.count && pileFor(state, row.kind) === null,
        );
        if (blocked) {
          const lost = blocked.count - (beast.given[blocked.kind] ?? 0);
          beast.given[blocked.kind] = blocked.count;
          beast.spoiled.push(blocked.kind);
          toast(
            state,
            `置き場がなくて${itemName(blocked.kind)}を${lost}こ 取りこぼした ― 運び出しを増やそう`,
          );
        }
      }
    } else {
      beast.stuckTime = 0;
    }
    return;
  }

  if (beast.state === "falling") {
    beast.timer -= dt;
    if (beast.timer <= 0) {
      beast.state = "down";
      beast.rest = 0;
      fire.kills += 1;
      fire.fresh = 0;
      toast(state, `マンモスが倒れた（${fire.kills}頭目）― 解体して運び出そう`);
      say(state, { x: beast.pos.x, y: beast.pos.y - 70 }, "しとめた！");
      state.sfx.push("buy");
    }
    return;
  }

  pressBeast(state, beast, hunters, dt);
  if (beast.hp <= 0) {
    beast.state = "falling";
    beast.timer = 2.2;
    return;
  }

  beast.timer -= dt;
  const speed = beast.stamina > 0.25 ? 34 : 18;
  if (beast.state === "charge") {
    if (step(beast.pos, beast.target, 96, dt) || beast.timer <= 0) {
      chargeBeast(state, beast);
      beast.state = "roam";
      beast.timer = 2.5;
      beast.target = spotIn(zone);
    }
  } else if (beast.state === "graze") {
    if (beast.timer <= 0) {
      beast.state = "roam";
      beast.target = spotIn(zone);
      beast.timer = 6;
    }
  } else {
    // 追われていて、まだ元気なら、ときどき突進してくる
    const chaser = state.staff.find(
      (worker) =>
        worker.kind === "hunter" &&
        worker.stoveId === ground.id &&
        (worker.down ?? 0) <= 0 &&
        dist(worker.pos, beast.pos) < 120,
    );
    if (beast.alert > 0.75 && beast.stamina > 0.3 && chaser && beast.timer <= 0) {
      beast.state = "charge";
      beast.target = { ...chaser.pos };
      beast.timer = 1.6;
      say(state, { x: beast.pos.x, y: beast.pos.y - 60 }, "ブオオ！");
    } else if (step(beast.pos, beast.target, speed, dt)) {
      beast.state = Math.random() < 0.5 ? "graze" : "roam";
      beast.target = spotIn(zone);
      beast.timer = 3 + Math.random() * 4;
    }
  }
  beast.face = beast.target.x >= beast.pos.x ? 1 : -1;
};

/**
 * 解体。倒れたマンモスを削って、資源を仮置き場へ出していく。
 * 仮置き場が満杯になると、そこで解体が止まる（運び出すまで進まない）。
 */
export const cutBeast = (state: ShopState, rate: number, dt: number) => {
  const beast = state.fire.beast;
  if (!beast || beast.state !== "down") return false;
  const next = Math.min(1, beast.cut + dt * rate);
  let stuck = false;
  for (const row of YIELD) {
    const span = 1 - row.from;
    const done = Math.max(0, (next - row.from) / span);
    const want = Math.min(row.count, Math.floor(done * row.count));
    while ((beast.given[row.kind] ?? 0) < want) {
      const pile = pileFor(state, row.kind);
      if (!pile) {
        stuck = true;
        break;
      }
      state.ready[pile.id] = (state.ready[pile.id] ?? 0) + 1;
      beast.given[row.kind] = (beast.given[row.kind] ?? 0) + 1;
    }
    if (stuck) break;
  }
  beast.stuck = stuck;
  if (!stuck) beast.cut = next;

  const total = YIELD.reduce((sum, row) => sum + row.count, 0);
  const out = YIELD.reduce((sum, row) => sum + (beast.given[row.kind] ?? 0), 0);
  if (beast.cut >= 1 && out >= total) {
    // 骨格をしばらく残してから、次の1頭を待つ
    state.fire.beast = null;
    state.fire.beastWait = 34;
    toast(state, "解体が終わった。骨まで運び出そう");
  }
  return !stuck;
};


/* ---------- 寄り道「夜の森」 ---------- */

export const NIGHT_FOREST = { x0: 1620, y0: -820, x1: 2860, y1: 0 };
const BAIT_POS: Vec = { x: 2470, y: -470 };
const NIGHT_POSTS: Vec[] = [
  { x: 1960, y: -250 },
  { x: 2280, y: -430 },
  { x: 2630, y: -620 },
];

export const nightForestOpen = (state: ShopState) =>
  state.stageId === "fire" && state.unlocked.includes("area-6");

const inNightForest = (pos: Vec) =>
  pos.x >= NIGHT_FOREST.x0 &&
  pos.x <= NIGHT_FOREST.x1 &&
  pos.y >= NIGHT_FOREST.y0 &&
  pos.y <= NIGHT_FOREST.y1;

const randomNightSpot = (): Vec => ({
  x: NIGHT_FOREST.x0 + 70 + Math.random() * (NIGHT_FOREST.x1 - NIGHT_FOREST.x0 - 140),
  y: NIGHT_FOREST.y0 + 70 + Math.random() * (NIGHT_FOREST.y1 - NIGHT_FOREST.y0 - 140),
});

const newNightWolf = (state: ShopState): NightWolf => {
  const pos = randomNightSpot();
  const target = randomNightSpot();
  return {
    id: state.nextId++,
    pos,
    target,
    state: "roam",
    timer: 2 + Math.random() * 4,
    face: target.x >= pos.x ? 1 : -1,
  };
};

const boughtNightPosts = (state: ShopState) =>
  NIGHT_POSTS.filter((_, i) => state.unlocked.includes(`equip-night-torch-${i + 1}`));

/** 描画側も同じ光源を使う。手持ちたいまつは自分と一緒に動く。 */
export const nightLights = (state: ShopState): { pos: Vec; r: number }[] => {
  if (!nightForestOpen(state) || state.fire.phase === "day") return [];
  const lights: { pos: Vec; r: number }[] = [];
  if (state.unlocked.includes("equip-hand-torch") && inNightForest(state.player.pos)) {
    lights.push({ pos: { ...state.player.pos }, r: 118 });
  }
  const posts = boughtNightPosts(state);
  for (let i = 0; i < Math.min(posts.length, state.fire.nightLitPosts); i += 1) {
    lights.push({ pos: posts[i], r: 145 + i * 10 });
  }
  return lights;
};

const litAt = (state: ShopState, pos: Vec) =>
  nightLights(state).some((light) => dist(light.pos, pos) <= light.r);

const updateDog = (state: ShopState, dt: number) => {
  const fire = state.fire;
  if (!fire.dogTamed) return;
  const dx = state.player.pos.x - fire.dogPos.x;
  const dy = state.player.pos.y - fire.dogPos.y;
  const d = Math.hypot(dx, dy);
  if (d > 42) step(fire.dogPos, state.player.pos, d > 180 ? 105 : 72, dt);
};

const updateNightForest = (state: ShopState, dt: number) => {
  const fire = state.fire;
  updateDog(state, dt);
  if (!nightForestOpen(state)) {
    fire.nightWolves = [];
    return;
  }

  if (fire.phase !== "night") {
    fire.nightWolves = [];
    fire.wolfSpawn = 2;
    fire.nightLitPosts = 0;
    return;
  }

  if (fire.nightFuelDay !== fire.day) {
    fire.nightFuelDay = fire.day;
    const wanted = boughtNightPosts(state).length;
    const have = state.hold["night-wood"] ?? 0;
    fire.nightLitPosts = Math.min(wanted, have);
    if (fire.nightLitPosts > 0) {
      state.hold["night-wood"] = have - fire.nightLitPosts;
    }
    if (wanted > fire.nightLitPosts) {
      toast(state, `夜の森の薪が ${wanted - fire.nightLitPosts}こ 足りない ― 消えたたいまつ台がある`);
    }
  }

  const bell = state.unlocked.includes("equip-wolf-bell") ? 2 : 0;
  const dogGuard = fire.dogTamed ? 1 : 0;
  const maxWolves = Math.max(2, 5 - bell - dogGuard);
  fire.wolfSpawn -= dt;
  if (fire.wolfSpawn <= 0 && fire.nightWolves.length < maxWolves) {
    fire.nightWolves.push(newNightWolf(state));
    fire.wolfSpawn = 4.5 + Math.random() * 4;
  }

  for (const wolf of fire.nightWolves) {
    wolf.timer -= dt;
    const dogNear = fire.dogTamed && dist(fire.dogPos, wolf.pos) < 78;
    if (litAt(state, wolf.pos) || dogNear) {
      wolf.state = "flee";
      const threat = dogNear ? fire.dogPos : state.player.pos;
      const dx = wolf.pos.x - threat.x || (Math.random() - 0.5);
      const dy = wolf.pos.y - threat.y || -1;
      const n = Math.max(1, Math.hypot(dx, dy));
      wolf.target = {
        x: Math.max(NIGHT_FOREST.x0 + 20, Math.min(NIGHT_FOREST.x1 - 20, wolf.pos.x + (dx / n) * 180)),
        y: Math.max(NIGHT_FOREST.y0 + 20, Math.min(NIGHT_FOREST.y1 - 20, wolf.pos.y + (dy / n) * 180)),
      };
      wolf.timer = 2.5;
    } else if (inNightForest(state.player.pos) && dist(state.player.pos, wolf.pos) < 250) {
      wolf.state = "approach";
      wolf.target = { ...state.player.pos };
    } else if (wolf.timer <= 0 || dist(wolf.pos, wolf.target) < 8) {
      wolf.state = "roam";
      wolf.target = randomNightSpot();
      wolf.timer = 3 + Math.random() * 5;
    }

    const speed = wolf.state === "approach" ? 58 : wolf.state === "flee" ? 76 : 30;
    step(wolf.pos, wolf.target, speed, dt);
    wolf.face = wolf.target.x >= wolf.pos.x ? 1 : -1;

    if (wolf.state === "approach" && dist(state.player.pos, wolf.pos) < 36) {
      state.player.pos.y = Math.min(24, state.player.pos.y + 72);
      fire.morale = Math.max(0.82, fire.morale - 0.08);
      wolf.state = "flee";
      wolf.target = randomNightSpot();
      wolf.timer = 4;
      toast(state, "暗闇からオオカミが飛び出した ― たいまつの光へ戻ろう");
      say(state, { x: state.player.pos.x, y: state.player.pos.y - 30 }, "うわっ！");
    }
  }

  const nightAge = fire.clock - DAY_TIME - DUSK_TIME;
  const bait = state.hold["night-bait"] ?? 0;
  if (!fire.dogTamed && nightAge >= 7 && fire.wolfFedDay !== fire.day && bait >= 2) {
    state.hold["night-bait"] = bait - 2;
    fire.wolfFedDay = fire.day;
    fire.wolfTrust = Math.min(3, fire.wolfTrust + 1);
    say(state, { x: BAIT_POS.x, y: BAIT_POS.y - 34 }, `なつき ${fire.wolfTrust}/3`);
    if (fire.wolfTrust >= 3) {
      fire.dogTamed = true;
      fire.dogPos = { x: BAIT_POS.x + 22, y: BAIT_POS.y + 18 };
      fire.flash = "dog";
      toast(state, "オオカミが逃げなくなった ― 最初の犬が仲間になった！");
      state.sfx.push("buy");
    } else {
      toast(state, `オオカミが餌を食べた。こちらを見る目が変わった（${fire.wolfTrust}/3）`);
    }
  }
};

/* ---------- 探索と交易 ---------- */

/** 見つかる土地（順ぐりに必ず見つかる） */
export const FINDS: { id: string; name: string; note: string; pay: number }[] = [
  { id: "fishing", name: "魚のいる淵", note: "川辺の漁がはかどる", pay: 600 },
  { id: "clay", name: "粘土の岸", note: "土器の材料が手に入る", pay: 900 },
  { id: "forest", name: "向こう岸の森", note: "丸太を切り出せる", pay: 1400 },
  { id: "stone", name: "石切り場", note: "石の道具が作れる", pay: 2200 },
  { id: "village", name: "別の集落", note: "毛皮や土器を交換できる", pay: 3600 },
  { id: "river", name: "大きな川", note: "この先へ下れそうだ", pay: 5200 },
  { id: "plain", name: "麦の育つ平野", note: "次の土地が見えた", pay: 8000 },
];

/** 探索がひとまわりして帰ってくるまで（秒）。探索者と地図で短くなる */
const VOYAGE_TIME = 110;

/** いかだが出せるか（小型いかだが建っている） */
export const canSail = (state: ShopState) =>
  builtSites(state).some((site) => site.gives?.dock);

const updateVoyage = (state: ShopState, dt: number) => {
  const fire = state.fire;
  if (!canSail(state) || fire.finds.length >= FINDS.length) return;
  // 川を下るのは、川辺にいる探索者だけ（谷の追跡者は数えない）
  const dock = liveStoves(state).find((stove) => stove.gives?.dock);
  const crew = state.staff.filter(
    (worker) => worker.kind === "explorer" && worker.area === (dock?.area ?? 5),
  ).length;
  if (crew === 0 && fire.voyages > 0) return;
  const maps = state.unlocked.includes("equip-map-1") ? 1.6 : 1;
  fire.voyageLeft -= dt * (1 + crew * 0.5) * maps;
  if (fire.voyageLeft > 0) return;
  fire.voyageLeft = VOYAGE_TIME;
  const found = FINDS[fire.finds.length];
  if (!found) return;
  fire.finds.push(found.id);
  fire.voyages += 1;
  state.money += found.pay;
  state.unlocked.push(`found-${found.id}`);
  toast(state, `探索隊が「${found.name}」を見つけた ― ${found.note}`);
  state.sfx.push("coin");
};

/* ---------- 建てる ---------- */

/** その建築予定地に、あと何が要るか */
export const partsLeft = (state: ShopState, stove: StoveSpec) => {
  const left: { kind: string; need: number; got: number }[] = [];
  for (const [kind, need] of Object.entries(stove.needs ?? {})) {
    left.push({ kind, need, got: state.parts[stove.id]?.[kind] ?? 0 });
  }
  return left;
};

/** 建ちぐあい（0〜1） */
export const buildRatio = (state: ShopState, stove: StoveSpec) => {
  const rows = partsLeft(state, stove);
  const need = rows.reduce((sum, row) => sum + row.need, 0);
  const got = rows.reduce((sum, row) => sum + Math.min(row.need, row.got), 0);
  return need === 0 ? 1 : got / need;
};

const finishBuilds = (state: ShopState) => {
  for (const site of liveStoves(state)) {
    if (!site.needs || isBuilt(state, site.id)) continue;
    const done = partsLeft(state, site).every((row) => row.got >= row.need);
    if (!done) continue;
    state.built.push(site.id);
    state.unlocked.push(`built-${site.id}`);
    delete state.parts[site.id];
    say(state, { x: site.pos.x, y: site.pos.y - 34 }, "できた！");
    state.sfx.push("buy");

    const gives = site.gives ?? {};
    if (gives.houses) {
      // 建った日から、さっそくひとり住みはじめる
      state.fire.pop = Math.min(popCap(state), state.fire.pop + 1);
    }
    toast(state, gives.note ?? `${site.label ?? "建物"}ができた！`);
    // 旅の終わり。ステージごとに、出ていく舟がちがう
    if (gives.sail) {
      if (state.stageId === "taiga") taigaSail(state);
      else sailAway(state);
    }
  }
};

const sailAway = (state: ShopState) => {
  if (state.fire.sailed) return;
  state.fire.sailed = true;
  state.fire.flash = "sail";
  toast(state, `大型いかだが川へ出た ― 「${stageDefs[state.stageId].name}」の旅はここまで`);
};

/* ---------- 進み具合の合図 ---------- */

/**
 * 「3頭倒した」「寒い夜を3回越えた」のような、買い物では表せない条件。
 * 満たすと unlocked に印が入り、次の区画の枠がそこにぶら下がる。
 */
export const MARKS: { id: string; reach: (state: ShopState) => boolean }[] = [
  { id: "mark-night-1", reach: (state) => state.fire.nights >= 1 },
  { id: "mark-kills-1", reach: (state) => state.fire.kills >= 1 },
  { id: "mark-kills-2", reach: (state) => state.fire.kills >= 2 },
  { id: "mark-kills-3", reach: (state) => state.fire.kills >= 3 },
  { id: "mark-cold-3", reach: (state) => state.fire.coldNights >= COLD_NIGHTS },
  { id: "mark-pop-12", reach: (state) => state.fire.pop >= 12 },
  // 住居をぜんぶ建てると上限27人。24人（89%）は詰めすぎだったので20人に下げた
  { id: "mark-pop-20", reach: (state) => state.fire.pop >= 20 },
  { id: "mark-dog", reach: (state) => state.fire.dogTamed },
  { id: "mark-sailed", reach: (state) => state.fire.sailed },
];

export const MARK_IDS = MARKS.map((mark) => mark.id);

const updateMarks = (state: ShopState) => {
  for (const mark of MARKS) {
    if (state.unlocked.includes(mark.id)) continue;
    if (!mark.reach(state)) continue;
    state.unlocked.push(mark.id);
  }
};

/* ---------- おすすめ ---------- */

/**
 * いまのつまりから、買ってほしい枠を並べる（仕様書 §2.4）。
 * 実際に出ている枠のなかから、先頭の1つだけに「おすすめ」が付く。
 * 強制はしない。別の買い方をしても進めなくならない。
 */
export const firePriorityPads = (state: ShopState): string[] => {
  const wish: string[] = [];
  const fire = state.fire;
  const has = (id: string) => state.unlocked.includes(id);
  const readyOf = (id: string) => state.ready[id] ?? 0;

  // 夜の森へ入ったら、まず光を確保する。これは本編の強制条件にはしない。
  if (has("area-6") && !has("equip-hand-torch")) wish.push("equip-hand-torch");
  if (has("equip-hand-torch") && !has("night-bait")) wish.push("night-bait", "night-wood");

  // 解体が止まっている（仮置き場が満杯）
  if (fire.beast?.stuck) wish.push("robot-3", "waiter-4", "pile-meat");
  // 谷にマンモスがいるのに、狩人が足りない
  if (fire.beast && fire.beast.state !== "down") {
    const hunters = state.staff.filter((w) => w.kind === "hunter").length;
    if (hunters < 3) wish.push("hunter-v1", "hunter-v2", "hunter-v3");
  }
  // 倒したのに解体できていない
  if (fire.beast?.state === "down") wish.push("butcher-1", "butcher-2");
  // 今夜の保存肉が足りない
  if (fire.pop > 0 && stockIn(state, "smoked") < nightNeed(state)) {
    wish.push("smoke-1", "smoker-1", "store-1", "keeper-1", "smoke-2");
  }
  // 冬に薪がない
  if (winterOn(state) && stockIn(state, "wood") <= 2) {
    wish.push("store-wood", "build-hearth-2", "splitter-4");
  }
  // 住むところがない
  if (fire.pop >= popCap(state)) {
    wish.push("build-hut-1", "build-hut-2", "build-hut-3", "build-hut-4", "build-hut-5");
  }
  // 材料が足りない作業場から
  for (const stove of liveStoves(state)) {
    if (stove.takes && (state.hold[stove.id] ?? 0) <= 0) {
      if (stove.takes === "log") wish.push("logger-2", "logger-3", "logger-4");
      if (stove.takes === "roast") wish.push("fireman-2", "hunter-2");
      if (stove.takes === "meat") wish.push("hunter-2", "robot-1");
    }
    if (stove.fuel && (state.fuel[stove.id] ?? 0) <= 0) {
      wish.push("splitter-2", "splitter-3", "split-2");
    }
  }
  // 出し口にたまっているのに運べていない
  const piled = liveStoves(state).some(
    (stove) => readyOf(stove.id) >= (stove.hold ?? 5),
  );
  if (piled) wish.push("waiter-3", "robot-2", "waiter-4", "robot-3");
  // 何もつまっていなければ、次の建物をすすめる
  if (!has("build-hall")) wish.push("build-hall");
  return wish;
};

/* ---------- まとめ ---------- */

/**
 * 1フレームぶん進める。
 * 昼夜 → 天気 → 住民 → 谷 → 探索 → 建てあがり、の順に見る。
 */
export const updateFire = (state: ShopState, dt: number, coinValue: number) => {
  const fire = state.fire;
  if (state.stageId === "fire") fire.flash = null;
  /*
   * 建築予定地は「火のはじまり」だけの仕組みではない。
   * 大河の文明の船着き場・市場・町の建物も、材料を運びこめば建ちあがる。
   * ここから下（昼夜・寒さ・谷・住民）は、火のはじまりだけのもの。
   */
  finishBuilds(state);
  countWants(state);
  if (state.stageId !== "fire") return;
  updateMarks(state);
  // 住むところが減ることはないが、古いセーブから来たときのために合わせておく
  fire.pop = Math.min(fire.pop, popCap(state));
  if (!fireLive(state)) {
    fire.temp = temperature(state);
    return;
  }

  fire.clock += dt;
  const was = fire.phase;
  if (fire.clock >= FULL_DAY) {
    fire.clock -= FULL_DAY;
    fire.day += 1;
    fire.phase = "day";
  } else if (fire.clock >= DAY_TIME + DUSK_TIME) {
    fire.phase = "night";
  } else if (fire.clock >= DAY_TIME) {
    fire.phase = "dusk";
  } else {
    fire.phase = "day";
  }

  if (was !== fire.phase) {
    if (fire.phase === "night") {
      settleNight(state, coinValue);
      fire.flash = "night";
    } else if (fire.phase === "day") {
      fire.report = null;
      fire.flash = "morning";
      toast(state, `${fire.day}日目の朝`);
    } else if (fire.phase === "dusk") {
      fire.flash = "dusk";
    }
  }
  // 朝いちばんの調子は、昼のあいだにゆっくり基準へ戻る
  if (fire.phase === "day") {
    fire.morale += (1 - fire.morale) * Math.min(1, dt * 0.05);
  }

  updateWeather(state, dt);
  fire.temp = temperature(state);
  // 共同たき火は、夜のあいだ薪を燃やす
  if (fire.phase === "night" && hearths(state).length > 0) {
    const key = "hearth";
    state.autoTimer[key] = (state.autoTimer[key] ?? 0) + dt;
    if (state.autoTimer[key] >= 6) {
      state.autoTimer[key] = 0;
      drawFrom(state, "wood", 1);
    }
  }
  updateResidents(state, dt);
  updateBeast(state, dt);
  updateNightForest(state, dt);
  updateVoyage(state, dt);
};
