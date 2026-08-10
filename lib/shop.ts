/**
 * アーケードアイドル（My Perfect Hotel / Pizza Ready 系）のラーメン屋シミュレーション。
 *
 * 中核のループ:
 *   1. プレイヤーを直接動かす
 *   2. 寸胴のどんぶりを拾う（頭の上に積み上がる）
 *   3. 席で待っている客に運ぶ
 *   4. 食べ終わった客がカウンターにお金を置く → 歩いて拾う
 *   5. 緑の枠に立つとお金が吸い出され、席・寸胴・店員・強化が手に入る
 *   6. 店員（ホール店員・配膳ロボ・調理人・レジ係）を雇うと 2〜4 が自動になる
 *
 * 買い物はすべて店内の「枠」に立って行う。メニュー画面は無い。
 * 序盤は数往復で必ず何か買えるように価格を低く置いている。
 */

import type { SoundId } from "@/lib/sfx";
import {
  FINDS,
  MARK_IDS,
  createFire,
  cutBeast,
  fireLive,
  fireMove,
  fireWork,
  firePriorityPads,
  fromFire,
  nightNeed,
  nightShort,
  storeKeep,
  phaseLeft,
  stockIn,
  toFire,
  updateFire,
  type FireState,
} from "@/lib/fire";
import {
  TAIGA_MARK_IDS,
  createTaiga,
  fromTaiga,
  taigaCrew,
  taigaMove,
  taigaWork,
  toTaiga,
  updateTaiga,
  type TaigaState,
} from "@/lib/taiga";

export type Vec = { x: number; y: number };

export const WORLD = { w: 360, h: 620 };

export const SAVE_KEY = "ramen-arcade-idle-v1";
export const SAVE_VERSION = 2;

/* ---------- 設備の配置 ---------- */

/**
 * 運ぶものの種類。作る場所と受け取る場所が合っていないと渡せない。
 * ラーメン・パークは "main"/"food"/"goods" の3種。
 * ワーキングプラネットは工程ごとに別の種類（"nut"→"roast" など）を作る。
 */
export type ItemKind = string;

export type StoveSpec = {
  id: string;
  pos: Vec;
  price: number;
  area: number;
  /** 何を作るか（省略時は main = 丼／チケット） */
  item?: ItemKind;
  /**
   * 作るのに、先に受け取っておくもの（工程の途中の作業場）。
   * 省略すると素材（何もいらず、勝手にできる）。
   */
  takes?: ItemKind;
  /** 受け口に積んでおける数。省略で STOVE_CAPACITY */
  hold?: number;
  /** 作るのに、燃やすまき（第2の材料）。焼き場だけ使う */
  fuel?: ItemKind;
  /** 1つ作るのにかかる時間の倍率。省略で 1 */
  work?: number;
  /** 見た目（kitchen = 厨房、stock = 倉庫） */
  art?: string;
  label?: string;
  /** この区画（area-N）が開くまで出てこない */
  unlockAfter?: string;
  /**
   * 動物がうろつく草原・木が生える森の範囲。
   * ここを歩きまわって獲物や木を取り、この作業場の出し口へ持ち帰る。
   */
  zone?: Rect;
  /**
   * 人の手が要る作業場（薪割り場）。
   * 担当者を雇うか、プレイヤーがそばに立っているあいだだけ進む。
   */
  manual?: boolean;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;

  /* ---- 火のはじまり 第2区画以降 ---- */
  /**
   * 貯蔵庫（食料庫・薪倉庫）。takes のものを受け取るだけで、何も作らない。
   * 夜の食事や暖房は、ここに積んであるものから減っていく。
   */
  store?: boolean;
  /**
   * 解体で出た資源の仮置き場。出し口（ready）にたまるだけで自分では作らない。
   * 満杯になると解体が止まる。
   */
  pile?: boolean;
  /**
   * 建築予定地。この材料をぜんぶ運びこむと建物になる。
   * 積んだ数は state.parts に品種ごとに残る。
   */
  needs?: Record<ItemKind, number>;
  /** 建ったときの効き目（建築予定地だけ） */
  gives?: {
    /** 定住できる人数 +N */
    houses?: number;
    /** 集落を暖める強さ（第4区画の寒さをやわらげる） */
    warm?: number;
    /** 夜に薪を燃やして集落を照らす（共同たき火） */
    hearth?: boolean;
    /** 建つと探索に出られるようになる（いかだ） */
    dock?: boolean;
    /** 建つと「火のはじまり」が終わる（大型いかだ） */
    sail?: boolean;
    /** 建ったことを知らせる一言 */
    note?: string;
  };
  /** 巨獣（マンモス）がうろつく谷 */
  beast?: boolean;

  /* ---- ラーメン 2号店（第5区画以降） ---- */
  /**
   * 1つ作るのに要るもの（多品目）。takes / fuel の一般形。
   * 盛り付け台のように、玉・スープ・チャーシュー…を同時に要るときに使う。
   * たまった数は state.parts[id][kind] に品種ごとに残る（建築予定地と同じ置き場）。
   */
  recipe?: Record<ItemKind, number>;
};

export type SeatSpec = {
  id: string;
  /** 客が座る位置 */
  pos: Vec;
  /** 店側（立って渡す）位置 */
  serve: Vec;
  /** 配膳口（丼を置く場所） */
  tray: Vec;
  price: number;
  /** どの区画にあるか */
  area: number;
  label: string;
  /** 見た目の種類（パークのアトラクションは1つずつ違う） */
  art?: string;
  /** 長押しの説明（アトラクションの紹介文） */
  detail?: string;
  /**
   * 遊び方の種類。
   * ride  = 乗り物／席（運んで渡す・そのまま帰る）
   * table = レストランの席（食べ終わると皿が残る。片づけないと次が来ない）
   * shelf = お店の棚（先に商品を並べておくと、客が自分で取ってレジで払う）
   */
  mode?: "ride" | "table" | "shelf";
  /** 受け取るもの（省略時は main） */
  needs?: ItemKind;
  /** 売上の倍率（レストランやお土産は高い） */
  value?: number;
  /** 一度に必要な枚数（大きい乗り物は2枚・3枚いる） */
  cost?: number;
  /** 棚のとき、客がお金を払いに行く場所 */
  pay?: Vec;
  /** この区画（area-N）が開くまで出てこない */
  unlockAfter?: string;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
};

export type StaffKind =
  | "waiter"
  | "robot"
  | "collector"
  | "cook"
  | "master"
  /** レストランの片づけ係 */
  | "busser"
  /** お土産屋の品出し係 */
  | "stocker"
  /** レストランの料理を運ぶ係 */
  | "server"
  /** 入口で入場券を売る係 */
  | "seller"
  /** 改札でお客さんを通す係 */
  | "gatekeeper"
  /** 狩り場で動物を狩る係 */
  | "hunter"
  /** 森で立木を切り、丸太を出し口へ持ち帰る係 */
  | "logger"
  /** 薪割り場で丸太を薪に割る係 */
  | "splitter"
  /** 倒したマンモスを解体して、資源を仮置き場へ出す係 */
  | "butcher"
  /** 建築予定地へ材料を運びこみ、建物を建てる係 */
  | "builder"
  /** 保存肉を食料庫へ入れ、夜のぶんを確保する係 */
  | "keeper"
  /** 夜に共同たき火へ薪を足す係 */
  | "nightman"
  /** いかだで川を下り、新しい土地を見つけてくる係 */
  | "explorer"
  /** 作業場から作業場へ材料を運ぶ係（2号店の工程） */
  | "runner"
  /**
   * 川を行き来する運搬船（大河の文明）。
   * 陸の運び手より多く積めて速いが、遠くへ行くときは必ず川を通る
   */
  | "boat";

export type HireSpec = {
  id: string;
  kind: StaffKind;
  pos: Vec;
  price: number;
  label: string;
  /** 調理人が担当する寸胴 */
  stoveId?: string;
  /** どの区画にあるか */
  area: number;
  /** この区画（area-N）が開くまで出てこない */
  unlockAfter?: string;
  /** 店の外（歩道・並木道）に置く枠。入口の係など */
  outside?: boolean;
  /** 外の並び。0 は店より、1 は道より */
  row?: number;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
  /**
   * 運ぶ品。省略すると種類ごとの既定（ホール店員＝丼）。
   * 特製ラーメンのように、別の品を運ぶ係を置くときに指定する
   */
  carries?: ItemKind;
};

import { stageDefs, type StageDef, type StageId } from "@/data/stages";

/** 歩いて入れる作業場（厨房・券売所の帯） */
export type Room = { top: number; bottom: number };

export type Rect = { x0: number; y0: number; x1: number; y1: number };

export type AreaPalette = {
  floor: string;
  deep: string;
  prop:
    | "none"
    | "castle"
    | "snow"
    | "cactus"
    | "ship"
    | "star"
    | "fossil"
    | "diner"
    | "market"
    | "volcano"
    | "horror"
    | "nightforest"
    | "northmeadow"
    | "moonmarsh"
    | "rockcave"
    | "starglen"
    | "headwater";
};

export type AreaSpec = {
  id: string;
  label: string;
  price: number;
  rect: Rect;
  /**
   * どの棟に属するか。同じ id の区画はひと続きの建物になり、あいだに壁が立たない。
   * 省略すると壁を持たない（いままでのステージ）
   */
  building?: string;
  /** どの店に属するか（0＝1号店 / 1＝2号店）。店員はこの店から出ない */
  shop?: number;
  /**
   * 客用の戸口。棟の南の壁（通り側）に開いた穴。
   * 壁の位置は開いている区画によって変わるので、横位置と幅だけを持つ
   */
  door?: { x: number; w: number };
  /** この区画を買うとついてくる渡り廊下（棟と棟をつなぐ、歩ける床） */
  corridor?: Rect;
  /** 買う枠の位置（すでに開いている区画の中に置く） */
  padPos: Vec;
  palette: AreaPalette;
  /** これを買うまで出てこない（順ぐりに増やしていくため） */
  unlockAfter?: string;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
};

/** 設備の名前。集客オブジェクトもここに並ぶ */
export type EquipId = string;

export type EquipSpec = {
  id: EquipId;
  name: string;
  detail: string;
  /** 店内はこの位置。外のものは x だけ使い、y は店先に合わせる */
  pos: Vec;
  price: number;
  area: number;
  /** 店の外（歩道）に置く */
  outside?: boolean;
  /** 外の並び。0 は店より、1 は道より */
  row?: number;
  /** 集客の倍率（お客さんが来る速さ）。掛け算で効く */
  draw?: number;
  /** この区画が開くまで出てこない */
  unlockAfter?: string;
  /**
   * これを買うと、作業場どうしを直につなぐ（樋・ベルト）。
   * from の出し口から to の受け口へ、運ばなくても流れる。
   */
  link?: { from: string; to: string };
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
  /**
   * 谷に置く罠。数字が大きいほど、マンモスを早く追い込める。
   * 買うと、マップ上のその場所に実物が現れる。
   */
  trap?: number;
  /** 貯蔵庫に積める数を増やす（食料庫拡張など） */
  capacity?: { stove: string; plus: number };
  /** 建物どうしをつなぐ道（通ると足が速くなる） */
  road?: { from: Vec; to: Vec };
  /**
   * 渡り廊下。買うと、この長方形が歩けるようになり、
   * 両はしが触れている棟の壁に穴が開く（客も店員も自分も通れる）
   */
  corridor?: Rect;
  /**
   * この設備（水門）を買うと、この水路が優先になり、流れが速くなる。
   * 上流に多く流すと下流が細る ―― その分配を、買い物で選ばせる
   */
  priority?: EquipId;
};

export type UpgradeId = "carry" | "speed" | "cook" | "price" | "gate";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  detail: (level: number) => string;
  pos: Vec;
  basePrice: number;
  growth: number;
  max: number;
  /** 店の外（入口）に置く強化 */
  outside?: boolean;
  /** 外の並び。0 は店より、1 は道より */
  row?: number;
  /** これを買うまで出てこない（順ぐりに増やしていくため） */
  unlockAfter?: string;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
};

/* ---------- いま遊んでいるステージ ---------- */

let currentStage: StageDef = stageDefs.ramen;

export const stage = (): StageDef => currentStage;
export const stageLabels = () => currentStage.labels;

export let KITCHEN: Room = currentStage.frontRoom;
export let areas: AreaSpec[] = currentStage.areas;
export let stoves: StoveSpec[] = currentStage.stoves;
export let seats: SeatSpec[] = currentStage.seats;
export let hires: HireSpec[] = currentStage.hires;
export let equipment: EquipSpec[] = currentStage.equipment;
export let upgrades: Upgrade[] = currentStage.upgrades;

export let areaById = new Map(areas.map((item) => [item.id, item]));
export let seatById = new Map(seats.map((item) => [item.id, item]));
export let stoveById = new Map(stoves.map((item) => [item.id, item]));
export let hireById = new Map(hires.map((item) => [item.id, item]));
export let equipById = new Map(equipment.map((item) => [item.id, item]));
export let upgradeById = new Map(upgrades.map((item) => [item.id, item]));
export let pads: Pad[] = [];
export let padById = new Map<string, Pad>();

export const cookFactor = (level: number) => Math.pow(0.92, level);
export const coinValue = (level: number) =>
  Math.round(currentStage.baseValue * Math.pow(1.4, level));

/** このステージのお金の単位（火のはじまりは「貝」） */
export const currency = () => currentStage.currency ?? "円";

/** 画面の横幅（ワールド単位）。広い区画のステージは少し引いて見せる */
export const viewWidth = () => currentStage.view ?? WORLD.w;

/** 1つ作るのにかかる基本の時間 */
export const cookTime = () => currentStage.cookTime ?? COOK_TIME;

/** 担当者が付いた作業場の速さ（火の番・薪割りなど） */
export const cookBoost = () => currentStage.cookBoost ?? COOK_BOOST;

/**
 * 同時に見せておく、まだ買っていない枠の数。
 * 指定のないステージは今までどおり、条件を満たしたものを全部出す。
 *
 * 1区画目は「いま覚えた仕事の次の改善」だけを出すので少ない。
 * 区画が増えると revealLimitBy でこの数を増やし、
 * 5〜10個のなかから選べる状態にする（仕様書 §2.1）。
 */
export const revealLimit = (state: ShopState) => {
  const base = currentStage.revealLimit;
  if (base === undefined) return Infinity;
  let limit = base;
  for (const [id, value] of Object.entries(currentStage.revealLimitBy ?? {})) {
    if (state.unlocked.includes(id)) limit = Math.max(limit, value);
  }
  return limit;
};

/** 入場券の値段（入口で受け取る）。ステージに入場料がないときは 0 */
export const admissionValue = (state: ShopState) =>
  currentStage.admission
    ? Math.round(currentStage.admission * Math.pow(1.45, state.levels.gate ?? 0))
    : 0;


export const upgradePrice = (id: UpgradeId, level: number) => {
  const upgrade = upgradeById.get(id);
  if (!upgrade) return Infinity;
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.growth, level));
};

/* ---------- 枠（買い物する場所） ---------- */

export type Pad = {
  id: string;
  kind: "unlock" | "upgrade";
  pos: Vec;
  label: string;
  sub: string;
  upgradeId?: UpgradeId;
  /** 解放系のみ。強化系はレベルごとに計算する */
  price?: number;
  /** 店の外に置く枠 */
  outside?: boolean;
  /** 外の並び */
  row?: number;
  /** 順ぐりに出す並び順（小さいほど先に出る） */
  reveal?: number;
  /** これだけ提供するまで出てこない */
  needServed?: number;
  /** 枠が出たときに一度だけ見せる short な説明 */
  hint?: string;
};

/** その場所に付ける自動供給機（自動券売機・自動配膳レール）の id */
export const autoId = (seat: SeatSpec) => `auto-${seat.id}`;

/** 自動供給機の値段。場所が高いほど高い */
export const autoPrice = (seat: SeatSpec) =>
  Math.max(2500, Math.round(seat.price * 6 + 2500));

export const hasAuto = (state: ShopState, seat: SeatSpec) =>
  !!currentStage.autoServer && state.unlocked.includes(autoId(seat));

/** 自動供給機を置く場所（配膳口の横） */
export const autoPos = (seat: SeatSpec): Vec => ({
  x: seat.tray.x + 30,
  y: seat.tray.y - 2,
});

const hireSub: Record<StaffKind, string> = {
  waiter: "自分の代わりに運ぶ",
  robot: "とても速く運ぶ",
  collector: "自動でお金を拾う",
  cook: "この寸胴が速くなる",
  master: "すべての寸胴が1.4倍速くなる",
  busser: "テーブルの皿を片づける",
  stocker: "倉庫から棚へ商品を並べる",
  server: "厨房の料理をテーブルへ運ぶ",
  seller: "入場券を売ってくれる（1人ずつ）",
  gatekeeper: "改札で通してくれる（1人ずつ）",
  hunter: "狩り場の動物を狩ってくれる",
  logger: "森で木を切って丸太にしてくれる",
  splitter: "丸太を薪に割ってくれる",
  butcher: "倒したマンモスを解体してくれる",
  builder: "建築予定地へ材料を運んで建ててくれる",
  keeper: "保存肉を食料庫へ入れてくれる",
  nightman: "夜に共同たき火の薪を絶やさない",
  explorer: "先まわりして、獲物や土地を見つけてくる",
  runner: "作業場のあいだを運んでくれる",
  boat: "川を行き来して、まとめて運んでくれる",
};

const buildPads = (): Pad[] => [
  // 場所ごとの自動供給機（置けるステージだけ）
  ...(currentStage.autoServer ? seats : []).map(
    (seat): Pad => ({
      id: autoId(seat),
      kind: "unlock",
      pos: autoPos(seat),
      label: currentStage.labels.auto,
      sub: "運ばなくても回るようになる",
      price: autoPrice(seat),
    }),
  ),
  ...stoves
    .filter((stove) => stove.price > 0)
    .map((stove): Pad => ({
      id: stove.id,
      kind: "unlock",
      pos: stove.pos,
      price: stove.price,
      label: stove.label ?? currentStage.labels.producer,
      // 建築予定地は「同時に作れる数が増える」だと意味が通らないので分ける
      sub: stove.needs !== undefined ? "資材を運びこむと建つ" : "同時に作れる数が増える",
      reveal: stove.reveal,
      needServed: stove.needServed,
    })),
  ...seats
    .filter((seat) => seat.price > 0)
    .map((seat): Pad => ({
      id: seat.id,
      kind: "unlock",
      pos: seat.serve,
      price: seat.price,
      label: seat.label,
      sub: "お客さんが増える",
      reveal: seat.reveal,
      needServed: seat.needServed,
    })),
  ...equipment.map((item): Pad => ({
    id: `equip-${item.id}`,
    kind: "unlock",
    pos: item.pos,
    price: item.price,
    label: item.name,
    sub: item.detail,
    outside: item.outside,
    row: item.row,
    reveal: item.reveal,
    needServed: item.needServed,
  })),
  ...areas
    .filter((area) => area.price > 0)
    .map((area): Pad => ({
      id: area.id,
      kind: "unlock",
      pos: area.padPos,
      price: area.price,
      label: area.label,
      sub: "店がその先まで広がる",
      reveal: area.reveal,
      needServed: area.needServed,
    })),
  ...hires.map((hire): Pad => ({
    id: hire.id,
    kind: "unlock",
    pos: hire.pos,
    price: hire.price,
    label: hire.label,
    sub: hireSub[hire.kind],
    outside: hire.outside,
    row: hire.row,
    reveal: hire.reveal,
    needServed: hire.needServed,
  })),
  ...upgrades.map((upgrade): Pad => ({
    id: `up-${upgrade.id}`,
    kind: "upgrade",
    pos: upgrade.pos,
    label: upgrade.name,
    sub: "何度でも強化できる",
    upgradeId: upgrade.id,
    outside: upgrade.outside,
    row: upgrade.row,
    reveal: upgrade.reveal,
    needServed: upgrade.needServed,
  })),
];


/** ステージを差し替える */
export const applyStage = (id: StageId) => {
  currentStage = stageDefs[id];
  KITCHEN = currentStage.frontRoom;
  areas = currentStage.areas;
  stoves = currentStage.stoves;
  seats = currentStage.seats;
  hires = currentStage.hires;
  equipment = currentStage.equipment;
  upgrades = currentStage.upgrades;
  areaById = new Map(areas.map((item) => [item.id, item]));
  seatById = new Map(seats.map((item) => [item.id, item]));
  stoveById = new Map(stoves.map((item) => [item.id, item]));
  hireById = new Map(hires.map((item) => [item.id, item]));
  equipById = new Map(equipment.map((item) => [item.id, item]));
  upgradeById = new Map(upgrades.map((item) => [item.id, item]));
  pads = buildPads();
  padById = new Map(pads.map((pad) => [pad.id, pad]));
};

applyStage("ramen");


export const openAreas = (state: ShopState) =>
  areas.filter((area) => area.price === 0 || state.unlocked.includes(area.id));

/** 店先（歩道）の深さ */
export const OUTSIDE_DEPTH = 118;

/** 建物の南端。ここから下が店の外 */
export const outsideTop = (state: ShopState) =>
  openAreas(state).reduce((max, area) => Math.max(max, area.rect.y1), 480);

/** いまの店の外周（店の外を含む） */
export const worldBounds = (state: ShopState): Rect => {
  const open = openAreas(state);
  const box = open.reduce<Rect>(
    (acc, area) => ({
      x0: Math.min(acc.x0, area.rect.x0),
      y0: Math.min(acc.y0, area.rect.y0),
      x1: Math.max(acc.x1, area.rect.x1),
      y1: Math.max(acc.y1, area.rect.y1),
    }),
    { ...areas[0].rect },
  );
  return { ...box, y1: outsideTop(state) + OUTSIDE_DEPTH };
};

/** 店の外にある設備・枠の位置（row 1 は道ぎわの二列目） */
export const outsidePos = (state: ShopState, x: number, row = 0): Vec => ({
  x,
  y: outsideTop(state) + 50 + row * 40,
});

export const equipPos = (state: ShopState, item: EquipSpec): Vec =>
  item.outside ? outsidePos(state, item.pos.x, item.row) : item.pos;

export const padPosOf = (state: ShopState, pad: Pad): Vec => {
  if (!pad.outside) return pad.pos;
  return outsidePos(state, pad.pos.x, pad.row);
};

export const worldHeight = (state: ShopState) => worldBounds(state).y1;

/** 入口（建物の南端） */
export const entrancePos = (state: ShopState): Vec => ({
  x: currentStage.entranceX ?? 306,
  y: outsideTop(state) - 16,
});

/** 入場券売り場（自分で売る。自動入場券売機を入れると自動になる） */
export const boothPos = (state: ShopState): Vec => ({
  x: entrancePos(state).x - 84,
  y: outsideTop(state) + 30,
});

/** 入場の改札（自分で通す。自動改札機を入れると自動になる） */
export const turnstilePos = (state: ShopState): Vec => ({
  x: entrancePos(state).x,
  y: outsideTop(state) + 6,
});

/** 入場の仕組みがあるステージか */
export const hasGate = () => !!currentStage.admission;

/** 席が埋まったら、あふれた客が行列にならぶステージか */
export const queueMode = () => !!currentStage.queue;

/**
 * 行列の立ち位置（0 が先頭＝席に近い側）。
 * 入口の外に、横3人ずつの塊で並ぶ。区画のなかへはみ出さない
 */
export const linePos = (state: ShopState, index: number): Vec => {
  const street = streetPos(state);
  return {
    x: street.x + ((index % 3) - 1) * 30,
    y: outsideTop(state) + 26 + Math.floor(index / 3) * 26,
  };
};

/** 待っている人の並び位置 */
const queueSpot = (at: Vec, index: number): Vec => ({
  x: at.x + ((index % 4) - 1.5) * 22,
  y: at.y + 26 + Math.floor(index / 4) * 20,
});

/** お客さんが現れる歩道の位置 */
export const streetPos = (state: ShopState): Vec => ({
  x: currentStage.entranceX ?? 306,
  y: outsideTop(state) + 86,
});

/** 次に買える区画（なければ null） */
export const nextArea = (state: ShopState) =>
  areas.find((area) => area.price > 0 && !state.unlocked.includes(area.id)) ??
  null;

/* ---------- 状態 ---------- */

export type Customer = {
  id: number;
  seatId: string;
  /**
   * walking = 席／棚へ向かう
   * waiting = 待っている（棚なら在庫待ち）
   * eating  = 使っている（乗る・食べる）
   * buying  = 入場券売り場で券を買うのを待つ
   * entering = 改札で通してもらうのを待つ
   * paying  = 商品を持ってレジへ向かう
   * roaming = 次に空く場所を園内で待つ
   * leaving = 帰る
   */
  state:
    | "buying"
    | "entering"
    | "walking"
    | "waiting"
    | "eating"
    | "paying"
    | "roaming"
    /** 席が空くまで、行列にならんで待つ */
    | "lining"
    | "leaving";
  pos: Vec;
  timer: number;
  /** 今日まわる予定の数（場所が増えるほど増える） */
  budget: number;
  /** もう体験した数 */
  visits: number;
  /** 行列にならんでいるときの位置（0 が先頭） */
  lane?: number;
  /** 戸口や渡り廊下をたどる経由地（壁のあるステージだけ） */
  path?: Vec[];
  pathTo?: Vec;
  pathEpoch?: number;
};

export type Coin = { id: number; pos: Vec; value: number; age: number };

/** 狩り場をうろつく動物。狩ると、その狩り場の出し口に肉がたまる */
export type Prey = {
  id: number;
  /** どの狩り場のものか */
  stoveId: string;
  pos: Vec;
  /** うろつく先 */
  target: Vec;
  /** 見た目（いのしし・しか・うさぎ） */
  kind: string;
  /** 逃げているあいだの残り（狩り手が近いと少し逃げる） */
  flee: number;
};

/**
 * 森に生えている木。切ると切り株になり、しばらくして生えなおす。
 * 切ると、その森の出し口に丸太が1本たまる。
 */
export type Tree = {
  id: number;
  /** どの森のものか */
  stoveId: string;
  pos: Vec;
  /** 見た目（すぎ・ぶな・まつ） */
  kind: string;
  /** 切り株のあいだの残り時間。0 なら立っている */
  stump: number;
  /** 切っているあいだの進み（0〜1） */
  chop: number;
};

export type Pop = { id: number; pos: Vec; text: string; age: number };

export type Staff = {
  /** 仕事がないまま経った秒数（荷を返しに行くかどうかの目安） */
  idleTime?: number;
  id: number;
  kind: StaffKind;
  pos: Vec;
  /**
   * いま持っているもの。種類ごとの数。
   * 上限は種類ごとに別なので、生肉を持ったままでも薪を拾える。
   */
  bag: Record<string, number>;
  stoveId: string | null;
  /** 待機場所（雇った場所） */
  home: Vec;
  /** 板前の見回りなどに使う小さなカウンタ */
  trips: number;
  /** 片づけ係が拭いているあいだの残り時間 */
  charge: number;
  /** マンモスにはね飛ばされて、起き上がるまでの残り時間（死なない） */
  down?: number;
  /** 次の相手を選び直すまでの待ち時間（くじ引き） */
  wait: number;
  /** いま担当している場所（ほかのスタッフと取り合わないように） */
  target: string | null;
  /** 目的地に着いて作業中か（着いた人は押されない） */
  settled?: boolean;
  /** 向いている方向（1 = 右、-1 = 左）。犬ぞりの向きに使う */
  face?: number;
  /** いま歩いているか（脚や引き綱を動かすかどうか） */
  moving?: boolean;
  /** 担当エリア（雇った区画。ここを優先して回る） */
  area: number;
  /** 運ぶ品（HireSpec.carries）。省略すると種類ごとの既定 */
  carries?: ItemKind;
  /** どの店の人か（0＝1号店 / 1＝2号店）。担当の店から出ない */
  shop?: number;
  /** いま向かっている先までの経由地（戸口・渡り廊下） */
  path?: Vec[];
  /** その経路を引いたときの行き先と、そのときの通路の版 */
  pathTo?: Vec;
  pathEpoch?: number;
};

export type Player = {
  pos: Vec;
  /** いま持っているもの。種類ごとの数（複数の種類を同時に持てる） */
  bag: Record<string, number>;
  moving: boolean;
  step: number;
  /** 次に渡せるまでの間（リズミカルに1つずつ渡すための待ち） */
  serveCd?: number;
};

/** 持ちものを入れておける、種類ごとの数 */
type Holder = { bag: Record<string, number> };

/**
 * 古い形（種類1つ＋個数）の荷物を、種類ごとの数へ読み替える。
 * どちらの形で来ても荷物を落とさない。
 */
export const toBag = (input: unknown): Record<string, number> => {
  if (!input || typeof input !== "object") return {};
  const raw = input as {
    bag?: unknown;
    item?: unknown;
    carry?: unknown;
  };
  const out: Record<string, number> = {};
  if (raw.bag && typeof raw.bag === "object") {
    for (const [kind, n] of Object.entries(raw.bag as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0) {
        out[kind] = Math.floor(n);
      }
    }
  }
  // 「種類1つ＋個数」で保存されていた荷物を足し込む
  if (typeof raw.item === "string" && typeof raw.carry === "number" && raw.carry > 0) {
    out[raw.item] = (out[raw.item] ?? 0) + Math.floor(raw.carry);
  }
  return out;
};

/** いま持っている合計の数 */
export const carryTotal = (who: Holder) =>
  Object.values(who.bag).reduce((sum, n) => sum + n, 0);

/** その種類を何個持っているか */
export const carryOf = (who: Holder, kind: ItemKind) => who.bag[kind] ?? 0;

/** 持っている種類（多い順） */
export const carryKinds = (who: Holder): ItemKind[] =>
  Object.keys(who.bag)
    .filter((kind) => (who.bag[kind] ?? 0) > 0)
    .sort((a, b) => (who.bag[b] ?? 0) - (who.bag[a] ?? 0));

/** 代表の種類（HUD やアイコン用。いちばん多いもの） */
export const topKind = (who: Holder): ItemKind | null => {
  let best: ItemKind | null = null;
  let most = 0;
  for (const [kind, n] of Object.entries(who.bag)) {
    if (n > most) {
      most = n;
      best = kind;
    }
  }
  return best;
};

const addToBag = (who: Holder, kind: ItemKind, n = 1) => {
  who.bag[kind] = (who.bag[kind] ?? 0) + n;
};

const takeFromBag = (who: Holder, kind: ItemKind, n: number) => {
  const have = who.bag[kind] ?? 0;
  const took = Math.min(have, n);
  if (took >= have) delete who.bag[kind];
  else who.bag[kind] = have - took;
  return took;
};

export type Persisted = {
  version: number;
  stageId?: StageId;
  money: number;
  unlocked: string[];
  padProgress: Record<string, number>;
  levels: Record<UpgradeId, number>;
  served: number;
  playTime: number;
  lastSeen: number;
  /**
   * すでに姿を見せた枠。
   * 一度出した枠は、買うまで引っこめない（見えたり消えたりさせない）。
   */
  revealed?: string[];
  /** 建てあがった建築予定地 */
  built?: string[];
  /** 建築予定地に運びこんだ材料（まだ建っていないぶん） */
  parts?: Record<string, Record<string, number>>;
  /** 貯蔵庫に積んである数（食料庫・薪倉庫） */
  stored?: Record<string, number>;
  /** 火のはじまりの集落の様子（昼夜・人口・冬・谷） */
  fire?: unknown;
  /** 大河の文明の季節と増水 */
  taiga?: unknown;
};

export type ShopState = Persisted & {
  stageId: StageId;
  revealed: string[];
  /** 建てあがった建築予定地 */
  built: string[];
  /** 建築予定地に運びこんだ材料 */
  parts: Record<string, Record<string, number>>;
  /** 火のはじまりの集落（昼夜・人口・冬・谷・川） */
  fire: FireState;
  /** 大河の文明の季節と増水 */
  taiga: TaigaState;
  /** 次に新しい枠を出すまでの間（一度に増やしすぎない） */
  revealWait: number;
  player: Player;
  staff: Staff[];
  customers: Customer[];
  coins: Coin[];
  /** 狩り場の動物 */
  prey: Prey[];
  /** 森の木（切ると切り株になり、しばらくして生えなおす） */
  trees: Tree[];
  pops: Pop[];
  ready: Record<string, number>;
  cooking: Record<string, number>;
  /** 工程の作業場の受け口に、これから加工するものが積まれている数 */
  hold: Record<string, number>;
  /** まき（燃料）の受け口。まきを使う作業場だけ */
  fuel: Record<string, number>;
  /** 棚に並んでいる商品の数 */
  shelf: Record<string, number>;
  /** 自動供給機の待ち時間 */
  autoTimer: Record<string, number>;
  /** 皿が残っているテーブル（片づけるまで次の客が来ない） */
  dirty: Record<string, number>;
  spawnTimer: number;
  nextId: number;
  activePad: string | null;
  toast: { text: string; at: number } | null;
  /** 連続して渡した回数（爽快感の連鎖）。少し渡さないと 0 に戻る */
  combo: number;
  /** 連鎖が切れるまでの残り時間 */
  comboLeft: number;
  /** 描画側が毎フレーム取り出して鳴らす（数字は連鎖チャイムの段） */
  sfx: (SoundId | { combo: number })[];
};

export const PLAYER_BASE_SPEED = 128;
export const STAFF_SPEED = 92;
export const ROBOT_SPEED = 150;
/** 川を行く運搬船の速さ。陸の運び手より速いが、川へ出るまでの手間がある */
export const BOAT_SPEED = 205;
/** 川の水路。船はこの高さを通る */
export const RIVER_LANE = 108;
export const PICK_RADIUS = 44;
export const SERVE_RADIUS = 46;
export const COIN_RADIUS = 34;
export const PAD_RADIUS = 26;
export const STOVE_CAPACITY = 5;
/** 運ぶ人がくじを引く範囲（待っている1〜5番目） */
export const ROBOT_PICKS = 5;
/** 運び手が、いちどに持ち歩ける品種の数 */
export const KINDS_AT_ONCE = 3;
/** くじが外れたときに待つ時間（秒） */
export const ROBOT_WAIT = 1.2;

/** 自動供給機が1回動くのにかかる時間（秒） */
export const AUTO_TIME = 1.2;
/** 次の場所が空くのを待つ時間（秒） */
export const ROAM_TIME = 20;
export const COOK_TIME = 2.0;
export const COOK_BOOST = 2.2;
export const EAT_TIME = 2.8;
export const SPAWN_TIME = 1.1;
export const OFFLINE_CAP_HOURS = 8;
/** リズミカルに1つずつ渡す間隔（秒）。速いほど爽快 */
export const SERVE_RHYTHM = 0.13;
/** これだけ渡さないでいると、連鎖が切れる（秒） */
export const COMBO_WINDOW = 0.7;
/** 行列にならべる最大人数（工程ステージ） */
export const MAX_LINE = 6;

/** 待たされた客があきらめて帰るまで（工程が止まっても席が死なないように） */
export const PATIENCE = 60;
/** 狩り場に動物が湧く間隔（秒）と、同時にいられる数 */
export const HUNT_SPAWN = 2.4;
export const HUNT_CAP = 4;
/** 動物を狩れる距離 */
export const CATCH_RADIUS = 30;
/** 森に立っている木の数と、切り株から生えなおすまでの時間（秒） */
export const TREE_COUNT = 6;
export const TREE_REGROW = 14;
/** 1本切り倒すのにかかる時間（秒） */
export const CHOP_TIME = 1.2;
/** はこび手が1回ぶんの積み下ろしにかける間（秒）。1人では運びきれない重さの源 */
export const HAUL_PAUSE = 0.32;
/** 解体係ひとりが、1秒でどれだけマンモスを削れるか（1.0 で1頭ぶん） */
export const BUTCHER_RATE = 0.05;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

const moveToward = (pos: Vec, target: Vec, speed: number, dt: number) => {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const step = Math.min(d, speed * dt);
  pos.x += (dx / d) * step;
  pos.y += (dy / d) * step;
  return false;
};


/** 雇った場所。外の係は歩道の座標に置き直す */
const hireHome = (state: ShopState, hire: HireSpec): Vec =>
  hire.outside ? outsidePos(state, hire.pos.x, hire.row) : hire.pos;

const makeStaff = (
  hire: HireSpec,
  id: number,
  at: Vec,
  carried?: unknown,
): Staff => ({
  id,
  kind: hire.kind,
  pos: { ...at },
  // 古い形（種類1つ＋個数）で残っていた荷物も、そのまま引き継ぐ
  bag: toBag(carried),
  stoveId: hire.stoveId ?? null,
  home: { ...at },
  area: hire.area,
  carries: hire.carries,
  shop: shopOfArea(hire.area),
  trips: 0,
  charge: 0,
  wait: 0,
  target: null,
});

/** 最初から開いているもの。ステージが決める（省略で屋台の初期セット） */
export const startUnlocked = (): string[] =>
  currentStage.start ?? ["stove-1", "seat-0-1", "seat-0-2"];

const startReady = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of startUnlocked()) if (stoveById.has(id)) out[id] = 0;
  return out;
};

const startHold = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of startUnlocked()) {
    const stove = stoveById.get(id);
    if (stove && isStation(stove)) out[id] = 0;
  }
  return out;
};

/**
 * まきの受け口の初期値。
 * 1食目は「狩る → 置く → 渡す」だけを覚えてほしいので、
 * ステージが指定していれば、たき火にまきをくべた状態で始める。
 */
const startFuel = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of startUnlocked()) {
    const stove = stoveById.get(id);
    if (stove?.fuel) out[id] = currentStage.startFuel?.[id] ?? 0;
  }
  return out;
};

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  stageId: currentStage.id,
  money: 0,
  unlocked: [...startUnlocked()],
  revealed: [],
  built: [],
  parts: {},
  fire: createFire(),
  taiga: createTaiga(),
  revealWait: 0,
  padProgress: {},
  levels: { carry: 0, speed: 0, cook: 0, price: 0, gate: 0 },
  served: 0,
  playTime: 0,
  lastSeen: Date.now(),
  player: {
    pos: { ...(currentStage.startPos ?? { x: 180, y: 250 }) },
    bag: {},
    moving: false,
    step: 0,
    serveCd: 0,
  },
  staff: [],
  customers: [],
  coins: [],
  prey: [],
  trees: [],
  pops: [],
  ready: startReady(),
  cooking: startReady(),
  hold: startHold(),
  fuel: startFuel(),
  shelf: {},
  dirty: {},
  autoTimer: {},
  combo: 0,
  comboLeft: 0,
  spawnTimer: 0.4,
  nextId: 1,
  activePad: null,
  toast: null,
  sfx: [],
});

/** 探索で見つかる土地の合図（`found-village` のような形で unlocked に入る） */
const FOUND_IDS = FINDS.map((item) => `found-${item.id}`);

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** 貯蔵庫に積んであるぶんは、次に開いたときも残しておく */
const storedNow = (state: ShopState) => {
  const out: Record<string, number> = {};
  for (const stove of stoves) {
    if (!isStore(stove)) continue;
    const have = state.hold[stove.id] ?? 0;
    if (have > 0) out[stove.id] = have;
  }
  return out;
};

export const toPersisted = (state: ShopState): Persisted => ({
  version: SAVE_VERSION,
  stageId: state.stageId,
  money: state.money,
  unlocked: state.unlocked,
  revealed: state.revealed,
  built: state.built,
  parts: state.parts,
  stored: storedNow(state),
  fire: toFire(state.fire),
  taiga: toTaiga(state.taiga),
  padProgress: state.padProgress,
  levels: state.levels,
  served: state.served,
  playTime: state.playTime,
  // 見ていた最後の瞬間はここでは決めない（呼ぶたび now にすると、
  // タブを裏に置いたまま自動保存が走るたびに「いま」に更新されてしまい、
  // 本当は長く離れていたのに放置時間が0になる）。呼び出す側（実際に
  // 進めているとき）が state.lastSeen を進めるので、ここではそれを渡すだけ
  lastSeen: state.lastSeen,
});

export const fromPersisted = (input: unknown): ShopState => {
  const state = createState();
  if (!input || typeof input !== "object") return state;
  const raw = input as Partial<Persisted>;

  state.money = Math.max(0, finite(raw.money, 0));
  state.served = Math.max(0, Math.floor(finite(raw.served, 0)));
  state.playTime = Math.max(0, finite(raw.playTime, 0));
  state.lastSeen = finite(raw.lastSeen, Date.now());

  const valid = new Set<string>([
    ...stoves.map((item) => item.id),
    ...seats.map((item) => item.id),
    ...seats.map((item) => autoId(item)),
    ...hires.map((item) => item.id),
    ...areas.map((item) => item.id),
    ...equipment.map((item) => `equip-${item.id}`),
    // 建てあがった建物と、探索で見つけた土地も「開いたもの」として残す
    ...stoves.filter((item) => item.needs).map((item) => `built-${item.id}`),
    ...FOUND_IDS,
    ...MARK_IDS,
    ...TAIGA_MARK_IDS,
  ]);
  const migrate = (id: string) =>
    id.replace(/^seat-a(\d+)$/, "seat-0-$1").replace(/^seat-b(\d+)$/, "seat-1-$1");

  if (Array.isArray(raw.unlocked)) {
    const list = raw.unlocked
      .filter((id): id is string => typeof id === "string")
      .map(migrate)
      .filter((id) => valid.has(id));
    state.unlocked = Array.from(new Set([...state.unlocked, ...list]));
  }

  if (Array.isArray(raw.revealed)) {
    const known = new Set(pads.map((pad) => pad.id));
    state.revealed = Array.from(
      new Set(
        raw.revealed
          .filter((id): id is string => typeof id === "string")
          .map(migrate)
          .filter((id) => known.has(id)),
      ),
    );
  }

  if (raw.padProgress && typeof raw.padProgress === "object") {
    const stored = raw.padProgress as Record<string, number>;
    for (const pad of pads) {
      const value = finite(stored[pad.id], 0);
      if (value <= 0) continue;
      if (pad.kind === "unlock" && pad.price !== undefined) {
        const price = pad.price;
        if (value >= price) {
          // 値段を変えた結果、もう払い終えているぶんは開放しておく
          if (!state.unlocked.includes(pad.id)) state.unlocked.push(pad.id);
          continue;
        }
        state.padProgress[pad.id] = clamp(value, 0, price);
      } else {
        state.padProgress[pad.id] = Math.max(0, value);
      }
    }
  }

  for (const upgrade of upgrades) {
    state.levels[upgrade.id] = clamp(
      Math.floor(finite(raw.levels?.[upgrade.id], 0)),
      0,
      upgrade.max,
    );
  }

  // ただで付いてくる作業場は、読み込み直したときにも開いておく
  for (const extra of stoves) {
    if (extra.price !== 0 || !extra.unlockAfter) continue;
    if (state.unlocked.includes(extra.id)) continue;
    if (state.unlocked.includes(extra.unlockAfter)) state.unlocked.push(extra.id);
  }

  // 建てあがった建物と、積みかけの材料
  if (Array.isArray(raw.built)) {
    const sites = new Set(stoves.filter((item) => item.needs).map((item) => item.id));
    state.built = Array.from(
      new Set(
        raw.built.filter((id): id is string => typeof id === "string" && sites.has(id)),
      ),
    );
  }
  if (raw.parts && typeof raw.parts === "object") {
    for (const stove of stoves) {
      if (!stove.needs) continue;
      const saved = (raw.parts as Record<string, unknown>)[stove.id];
      if (!saved || typeof saved !== "object") continue;
      const bag: Record<string, number> = {};
      for (const [kind, need] of Object.entries(stove.needs)) {
        const value = finite((saved as Record<string, unknown>)[kind], 0);
        if (value > 0) bag[kind] = clamp(Math.floor(value), 0, need);
      }
      if (Object.keys(bag).length > 0) state.parts[stove.id] = bag;
    }
  }
  state.fire = fromFire(raw.fire);
  state.taiga = fromTaiga(raw.taiga);
  if (
    state.stageId === "taiga" &&
    state.taiga.sailed &&
    !state.built.includes("build-great-weir")
  ) {
    state.taiga.sailed = false;
  }

  for (const stove of stoves) {
    if (state.unlocked.includes(stove.id)) {
      state.ready[stove.id] = 0;
      state.cooking[stove.id] = 0;
      if (isStation(stove)) state.hold[stove.id] = 0;
      // 貯蔵庫に積んであったぶんは、そのまま残す（帰ってきたら空、をやらない）
      if (isStore(stove)) {
        const saved = finite((raw.stored ?? {})[stove.id], 0);
        state.hold[stove.id] = clamp(Math.floor(saved), 0, holdCap(state, stove));
      }
      if (stove.fuel) {
        // まだ一度も提供していない人には、1食目のぶんのまきをくべておく
        state.fuel[stove.id] =
          state.served > 0 ? 0 : currentStage.startFuel?.[stove.id] ?? 0;
      }
    }
  }
  const ticket = state.unlocked.includes("equip-ticket");
  state.staff = hires
    .filter((hire) => state.unlocked.includes(hire.id))
    .map((hire, index) => {
      const worker = makeStaff(hire, index + 1, hireHome(state, hire));
      // 券売機があるあいだ、レジ係はホール店員として働く
      if (ticket && worker.kind === "collector") worker.kind = "waiter";
      return worker;
    });
  state.nextId = state.staff.length + 1;

  return state;
};

/* ---------- 参照 ---------- */

/**
 * いま動いている作る場所・座る場所。
 *
 * 買ってあっても、その区画をまだ広げていなければ動かさない。
 * ふつうに遊んでいるとこの状態にはならないが、
 * 配置を組み替える前のセーブを読むと、id の指す先が変わって
 * 「買っていない区画の中に作業場を持っている」ことが起きる。
 * そこは歩いて行けないので、はこび手が材料を運びに行って
 * むだ足を踏まないよう、区画が開くまでは無いものとして扱う。
 */
export const openStoves = (state: ShopState) =>
  stoves.filter(
    (stove) => state.unlocked.includes(stove.id) && areaOpen(state, stove.area),
  );

export const openSeats = (state: ShopState) =>
  seats.filter(
    (seat) => state.unlocked.includes(seat.id) && areaOpen(state, seat.area),
  );

/** その場所の遊び方 */
export const seatMode = (seat: SeatSpec) => seat.mode ?? "ride";

/** その場所が受け取るもの */
export const seatNeeds = (seat: SeatSpec): ItemKind => seat.needs ?? "main";

/** 一度に必要な数（2枚・3枚いる乗り物がある） */
export const seatCost = (seat: SeatSpec) => Math.max(1, seat.cost ?? 1);

/** その作る場所が作るもの */
export const stoveItem = (stove: StoveSpec): ItemKind => stove.item ?? "main";

/** 工程の品の呼び名（説明文と、荷物の見出しに使う） */
const itemNames: Record<string, string> = {
  meat: "生肉",
  log: "丸太",
  wood: "薪",
  roast: "焼き肉",
  cut: "切り身",
  feast: "ごちそう",
  food: "料理",
  goods: "商品",
  // 第2区画から
  smoked: "保存肉",
  // 第3区画（マンモス）
  mmeat: "マンモス肉",
  hide: "毛皮",
  bone: "骨",
  fat: "脂",
  tusk: "牙",
  // 第4区画から
  coat: "防寒着",
  // 第5区画
  clay: "粘土",
  pot: "土器",
  tool: "道具",
  // 第6区画
  plank: "加工木材",
  rope: "縄",
  fish: "魚",
  // ラーメン 2号店
  kona: "粉",
  namamen: "生麺",
  tama: "玉",
  soup: "スープ",
  buta: "豚",
  chashu: "チャーシュー",
  tamago: "卵",
  ajitama: "味玉",
  takenoko: "たけのこ",
  menma: "メンマ",
  hone: "骨",
  dashi: "出汁",
  kaeshi: "かえし",
  kokusoup: "濃厚スープ",
  kake: "かけラーメン",
  chashumen: "チャーシュー麺",
  gomoku: "五目ラーメン",
  koku: "濃厚ラーメン",
  tokusei: "特製ラーメン",
  // 大河の文明
  water: "水",
  seed: "種",
  grain: "穀物",
  flour: "粉",
  bread: "パン",
  grass: "草",
  milk: "乳",
  wool: "毛",
  dried: "干し魚",
};

export const itemLabel = (kind: ItemKind): string =>
  itemNames[kind] ?? stageLabels().item;

/** 工程の作業場か（受け取ってから作る＝手前の工程が要る） */
export const isStation = (stove: StoveSpec) =>
  stove.takes !== undefined || stove.recipe !== undefined;

/** 多品目の受け口を持つ作業場（盛り付け台） */
export const isRecipe = (stove: StoveSpec) => stove.recipe !== undefined;

/** その作業場が、いま作れる状態か（材料がぜんぶそろっているか） */
export const recipeReady = (state: ShopState, stove: StoveSpec) =>
  Object.entries(stove.recipe ?? {}).every(
    ([kind, need]) => partsAt(state, stove.id, kind) >= need,
  );

/** 建築予定地か（材料をぜんぶ運びこむと建物になる） */
export const isBuild = (stove: StoveSpec) => stove.needs !== undefined;

/** 貯蔵庫か（受け取るだけで何も作らない） */
export const isStore = (stove: StoveSpec) => stove.store === true;

/** 解体で出た資源の仮置き場か（出し口にたまるだけ） */
export const isPile = (stove: StoveSpec) => stove.pile === true;

/** 何かを受け取る場所か（工程・貯蔵・建築予定地） */
export const takesItems = (stove: StoveSpec) => isStation(stove) || isBuild(stove);

/** 建てあがったか */
export const isDone = (state: ShopState, id: string) => state.built.includes(id);

/** 建築予定地に運びこんだ数 */
export const partsAt = (state: ShopState, id: string, kind: ItemKind) =>
  state.parts[id]?.[kind] ?? 0;

/** 受け口・出し口に積める数 */
export const holdCap = (state: ShopState, stove: StoveSpec) => {
  const plus = equipment.reduce(
    (sum, item) =>
      item.capacity?.stove === stove.id && hasEquip(state, item.id)
        ? sum + item.capacity.plus
        : sum,
    0,
  );
  return (stove.hold ?? stoveCapacity(state)) + plus;
};

/** 受け口にたまっている数 */
export const heldAt = (state: ShopState, stoveId: string) =>
  state.hold[stoveId] ?? 0;

/** まき（燃料）の受け口にたまっている数 */
export const fuelAt = (state: ShopState, stoveId: string) =>
  state.fuel[stoveId] ?? 0;

export type Slot = "hold" | "fuel" | "build" | "recipe";

/**
 * この作業場が、その品をどの受け口で受け取れるか。
 * 空きがなければ null。
 */
export const stationAccepts = (
  state: ShopState,
  stove: StoveSpec,
  item: ItemKind,
): Slot | null => {
  if (stove.takes === item && heldAt(state, stove.id) < holdCap(state, stove)) {
    /*
     * 貯蔵庫は、建てかけの建物があるあいだ、抱えこむ数に上限をつける。
     * 夜のぶんを確保したら、余りは建築へ回す（でないと家が建たない）
     */
    if (
      isStore(stove) &&
      (state.fire.wants[item] ?? 0) > 0 &&
      heldAt(state, stove.id) >= storeKeep(state, item)
    ) {
      return null;
    }
    return "hold";
  }
  if (stove.fuel === item && fuelAt(state, stove.id) < holdCap(state, stove)) {
    return "fuel";
  }
  // 多品目の受け口。品種ごとに上限を持つ
  if (stove.recipe?.[item] !== undefined) {
    if (partsAt(state, stove.id, item) < holdCap(state, stove)) return "recipe";
    return null;
  }
  // 建築予定地は、まだ足りていない材料だけを受け取る
  const need = stove.needs?.[item];
  if (need !== undefined && !isDone(state, stove.id)) {
    if (partsAt(state, stove.id, item) < need) return "build";
  }
  return null;
};

/** その受け口に、いまいくつ入っているか */
export const slotHave = (
  state: ShopState,
  stove: StoveSpec,
  item: ItemKind,
  slot: Slot,
) =>
  slot === "fuel"
    ? fuelAt(state, stove.id)
    : slot === "build" || slot === "recipe"
      ? partsAt(state, stove.id, item)
      : heldAt(state, stove.id);

/** その受け口に、あと何個入るか */
export const slotRoom = (
  state: ShopState,
  stove: StoveSpec,
  item: ItemKind,
  slot: Slot,
) =>
  slot === "build"
    ? Math.max(0, (stove.needs?.[item] ?? 0) - partsAt(state, stove.id, item))
    : holdCap(state, stove) - slotHave(state, stove, item, slot);

/** その受け口に入れる */
export const putSlot = (
  state: ShopState,
  stove: StoveSpec,
  item: ItemKind,
  slot: Slot,
  count: number,
) => {
  const put = Math.min(count, slotRoom(state, stove, item, slot));
  if (put <= 0) return 0;
  if (slot === "fuel") state.fuel[stove.id] = fuelAt(state, stove.id) + put;
  else if (slot === "hold") state.hold[stove.id] = heldAt(state, stove.id) + put;
  else {
    const bag = state.parts[stove.id] ?? {};
    bag[item] = (bag[item] ?? 0) + put;
    state.parts[stove.id] = bag;
  }
  return put;
};

/** このステージが工程（数珠つなぎ）を使うか */
export const isChainStage = () => stoves.some((stove) => isStation(stove));

/** この種類を受け取る、まだ空きのある作業場（近い順に呼び出し側でならべる） */
const stationsWanting = (state: ShopState, item: ItemKind) =>
  openStoves(state).filter(
    (stove) => takesItems(stove) && stationAccepts(state, stove, item) !== null,
  );

/**
 * その品を、いま何こ受け取れる先があるか。
 * 作業場の受け口の空きと、待っている人のぶんを足し、
 * ほかの人がもう運んでいるぶんを引いたもの。
 * これより多く拾うと、下ろす先のない荷を抱えて突っ立つことになる
 */
const demandFor = (state: ShopState, item: ItemKind) => {
  let need = 0;
  for (const stove of stationsWanting(state, item)) {
    const slot = stationAccepts(state, stove, item);
    if (slot) need += slotRoom(state, stove, item, slot);
  }
  for (const customer of state.customers) {
    if (customer.state !== "waiting") continue;
    const seat = seatById.get(customer.seatId);
    if (!seat || seatMode(seat) === "shelf" || seatNeeds(seat) !== item) continue;
    need += seatCost(seat);
  }
  /*
   * 引くのは「もう行き先が決まっている荷」だけ。
   * 持っているだけの荷まで引くと、遠くの誰かが1つ抱えているせいで
   * 目の前で材料待ちの作業場に誰も動かなくなる（実際そうなった）
   */
  for (const other of state.staff) {
    if (other.target?.startsWith(`${item}@`)) need -= carryOf(other, item);
  }
  return Math.max(0, need);
};

/** この種類を、待っている客か作業場のどちらかが求めているか */
const itemHasDemand = (state: ShopState, item: ItemKind) =>
  stationsWanting(state, item).length > 0 ||
  state.customers.some(
    (customer) =>
      customer.state === "waiting" &&
      (() => {
        const seat = seatById.get(customer.seatId);
        return !!seat && seatMode(seat) !== "shelf" && seatNeeds(seat) === item;
      })(),
  );

/** 棚に並べておける数 */
export const SHELF_MAX = 4;

/** 皿が残っているか */
export const isDirty = (state: ShopState, seatId: string) =>
  (state.dirty[seatId] ?? 0) > 0;

/** 棚の在庫 */
export const shelfStock = (state: ShopState, seatId: string) =>
  state.shelf[seatId] ?? 0;

/** レジ（棚の客がお金を払う場所） */
export const payPos = (seat: SeatSpec): Vec => seat.pay ?? seat.serve;

export const areaOpen = (state: ShopState, area: number) =>
  area === 0 || state.unlocked.includes(`area-${area}`);

/** まだ買っていない区画の中か（工事中で入れない） */
export const isBlocked = (state: ShopState, pos: Vec) =>
  pos.y <= outsideTop(state) &&
  areas.some(
    (area) =>
      area.price > 0 &&
      !state.unlocked.includes(area.id) &&
      pos.x > area.rect.x0 &&
      pos.x < area.rect.x1 &&
      pos.y > area.rect.y0 &&
      pos.y < area.rect.y1,
  );


/* ---------- 棟の壁・戸口・渡り廊下 ---------- */

/** このステージが棟の壁を持つか */
export const wallsOn = () => !!currentStage.walls;

const inRect = (rect: Rect, pos: Vec) =>
  pos.x > rect.x0 && pos.x < rect.x1 && pos.y > rect.y0 && pos.y < rect.y1;

const centerOf = (rect: Rect): Vec => ({
  x: (rect.x0 + rect.x1) / 2,
  y: (rect.y0 + rect.y1) / 2,
});

const touches = (a: Rect, b: Rect, slack = 6) =>
  a.x0 - slack < b.x1 && a.x1 + slack > b.x0 && a.y0 - slack < b.y1 && a.y1 + slack > b.y0;

export type Opening = { rect: Rect; nodes: string[] };

type WallCache = {
  key: string;
  rooms: { id: string; rect: Rect }[];
  openings: Opening[];
};
let wallCache: WallCache | null = null;

/** 買ったものが変わると経路も変わる。その版 */
export const pathEpoch = (state: ShopState) =>
  state.unlocked.length + (wallsOn() ? 0 : 0);

const wallData = (state: ShopState): WallCache => {
  const key = `${currentStage.id}:${state.unlocked.length}`;
  if (wallCache && wallCache.key === key) return wallCache;

  // 棟＝同じ building を持つ、開いている区画のまとまり（その外周が壁）
  const boxes = new Map<string, Rect>();
  for (const area of openAreas(state)) {
    if (!area.building) continue;
    const box = boxes.get(area.building);
    boxes.set(
      area.building,
      box
        ? {
            x0: Math.min(box.x0, area.rect.x0),
            y0: Math.min(box.y0, area.rect.y0),
            x1: Math.max(box.x1, area.rect.x1),
            y1: Math.max(box.y1, area.rect.y1),
          }
        : { ...area.rect },
    );
  }
  const rooms = [...boxes.entries()].map(([id, rect]) => ({ id, rect }));

  // 穴＝戸口（棟 ↔ 外）と渡り廊下（棟 ↔ 棟）
  const openings: Opening[] = [];
  for (const area of openAreas(state)) {
    if (!area.door || !area.building) continue;
    const box = boxes.get(area.building);
    if (!box) continue;
    // 戸口は南の壁（通り側）。壁の位置は棟が広がると下がる
    openings.push({
      rect: {
        x0: area.door.x - area.door.w / 2,
        x1: area.door.x + area.door.w / 2,
        y0: box.y1 - 14,
        y1: box.y1 + 14,
      },
      nodes: [area.building, "out"],
    });
  }
  const halls: Rect[] = [
    ...openAreas(state)
      .map((area) => area.corridor)
      .filter((rect): rect is Rect => !!rect),
    ...equipment
      .filter((item) => item.corridor && hasEquip(state, item.id))
      .map((item) => item.corridor as Rect),
  ];
  for (const rect of halls) {
    const ends = rooms.filter((room) => touches(rect, room.rect)).map((room) => room.id);
    openings.push({ rect, nodes: ends.length > 0 ? ends : ["out"] });
  }
  wallCache = { key, rooms, openings };
  return wallCache;
};

export const roomRects = (state: ShopState) => wallData(state).rooms;
export const openingsOf = (state: ShopState) => wallData(state).openings;

/** いまいる場所（棟の id か、屋外なら "out"） */
export const placeOf = (state: ShopState, pos: Vec): string => {
  for (const room of wallData(state).rooms) if (inRect(room.rect, pos)) return room.id;
  return "out";
};

/** 移動線が穴の長方形を横切るか。端点が穴の中に無くても通過を拾う。 */
const segmentHitsRect = (rect: Rect, from: Vec, to: Vec) => {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  return maxX >= rect.x0 && minX <= rect.x1 && maxY >= rect.y0 && minY <= rect.y1;
};

/**
 * 表通りの戸口を横切ったか。
 * 戸口は棟の南端にあるので、壁をまたいだ瞬間の x を直接見る。
 * モバイルでフレーム間の移動量が大きくても、見えている暖簾を通れば必ず抜けられる。
 */
const crossesSouthDoor = (
  room: { id: string; rect: Rect },
  hole: Opening,
  from: Vec,
  to: Vec,
) => {
  if (!hole.nodes.includes(room.id) || !hole.nodes.includes("out")) return false;
  const dy = to.y - from.y;
  if (Math.abs(dy) < 0.0001) return false;
  const t = (room.rect.y1 - from.y) / dy;
  if (t < 0 || t > 1) return false;
  const x = from.x + (to.x - from.x) * t;
  return x >= hole.rect.x0 - 10 && x <= hole.rect.x1 + 10;
};

/** その一歩で棟の壁をまたぐか（戸口・渡り廊下のところだけ通れる） */
export const wallBlocked = (state: ShopState, from: Vec, to: Vec) => {
  if (!wallsOn()) return false;
  const { rooms, openings } = wallData(state);
  for (const room of rooms) {
    if (inRect(room.rect, from) === inRect(room.rect, to)) continue;
    const open = openings.some(
      (hole) =>
        hole.nodes.includes(room.id) &&
        (segmentHitsRect(hole.rect, from, to) || crossesSouthDoor(room, hole, from, to)),
    );
    if (!open) return true;
  }
  return false;
};

/**
 * 行き先までに通る戸口・渡り廊下の並び。
 * 点は棟と屋外だけなので、幅優先で一瞬で解ける
 */
export const routeTo = (state: ShopState, from: Vec, to: Vec): Vec[] => {
  if (!wallsOn()) return [];
  const start = placeOf(state, from);
  const goal = placeOf(state, to);
  if (start === goal) return [];
  const { openings } = wallData(state);
  const back = new Map<string, { node: string; at: Vec }>();
  const seen = new Set<string>([start]);
  const queue: string[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    if (cur === goal) break;
    for (const hole of openings) {
      if (!hole.nodes.includes(cur)) continue;
      for (const next of hole.nodes) {
        if (next === cur || seen.has(next)) continue;
        seen.add(next);
        back.set(next, { node: cur, at: centerOf(hole.rect) });
        queue.push(next);
      }
    }
  }
  if (!seen.has(goal)) return [];
  const out: Vec[] = [];
  let cur = goal;
  while (cur !== start) {
    const step = back.get(cur);
    if (!step) break;
    out.unshift(step.at);
    cur = step.node;
  }
  return out;
};

type Walker = { pos: Vec; path?: Vec[]; pathTo?: Vec; pathEpoch?: number };

/**
 * 経由地をたどって行き先へ進む。壁の無いステージでは、まっすぐ進むだけ。
 * 行き先まで届いたら true
 */
export const walkTo = (
  state: ShopState,
  who: Walker,
  target: Vec,
  speed: number,
  dt: number,
) => {
  if (!wallsOn()) return moveToward(who.pos, target, speed, dt);
  const epoch = pathEpoch(state);
  const changed =
    !who.pathTo ||
    who.pathTo.x !== target.x ||
    who.pathTo.y !== target.y ||
    who.pathEpoch !== epoch;
  if (changed) {
    who.path = routeTo(state, who.pos, target);
    who.pathTo = { ...target };
    who.pathEpoch = epoch;
  }
  // 経由地に着いたら次へ。着いたあとは、そのまま行き先へ抜けていく
  while (who.path && who.path.length > 0 && dist(who.pos, who.path[0]) < 8) {
    who.path.shift();
  }
  const next = who.path && who.path.length > 0 ? who.path[0] : target;
  const before = { ...who.pos };
  const done = moveToward(who.pos, next, speed, dt);
  // 壁にぶつかったぶんは戻す（軸ごとに見て、壁ぎわを滑らせる）
  if (wallBlocked(state, before, { x: who.pos.x, y: before.y })) who.pos.x = before.x;
  if (wallBlocked(state, before, { x: before.x, y: who.pos.y })) who.pos.y = before.y;
  // 壁にはまって進めていないときだけ、道を引き直す
  const moved = Math.abs(who.pos.x - before.x) + Math.abs(who.pos.y - before.y);
  if (!done && moved < speed * dt * 0.25) {
    who.path = routeTo(state, who.pos, target);
    if (who.path.length > 0 && dist(who.pos, who.path[0]) < 8) who.path.shift();
  }
  return done && next === target;
};

export const maxCarry = (state: ShopState) => 3 + state.levels.carry;

/** 光っている見た目（★の数）による足の速さのおまけ。ガチャ側から入れる */
let skinShine = 0;
export const setSkinShine = (stars: number) => {
  skinShine = Math.max(0, stars);
};
export const skinShineBonus = () => skinShine * 0.05;

export const playerSpeed = (state: ShopState) =>
  PLAYER_BASE_SPEED *
  (1 + state.levels.speed * 0.1) *
  (1 + skinShineBonus()) *
  fireMove(state);

export const hasEquip = (state: ShopState, id: EquipId) =>
  state.unlocked.includes(`equip-${id}`);

export const hasMaster = (state: ShopState) =>
  state.staff.some((worker) => worker.kind === "master");

/** 設備・板前を含めた調理の速さ（小さいほど速い） */
export const cookSpeedFactor = (state: ShopState) =>
  cookFactor(state.levels.cook) *
  (hasEquip(state, "noodle") ? 1 / 1.3 : 1) *
  (hasMaster(state) ? 1 / 1.4 : 1);

export const stoveCapacity = (state: ShopState) =>
  STOVE_CAPACITY + (hasEquip(state, "fridge") ? 4 : 0);

/** 集客オブジェクトを全部かけ合わせた、お客さんの来る速さ */
export const customerDraw = (state: ShopState) =>
  equipment.reduce(
    (total, item) =>
      item.draw && hasEquip(state, item.id) ? total * item.draw : total,
    1,
  );

export const spawnInterval = (state: ShopState) => SPAWN_TIME / customerDraw(state);

/**
 * その作業場に付きっきりの担当者がいるか。
 * 調理人・火の番・薪割りは、担当の作業場に立って速さを上げる
 */
export const stoveHasCook = (state: ShopState, stoveId: string) =>
  state.staff.some(
    (worker) =>
      (worker.kind === "cook" || worker.kind === "splitter") &&
      worker.stoveId === stoveId,
  );

/**
 * 人の手が要る作業場（薪割り場）に、いま手があるか。
 * 担当者を雇っていれば常に、いなければプレイヤーがそばに立っているあいだだけ動く。
 */
export const isManned = (state: ShopState, stove: StoveSpec) =>
  stoveHasCook(state, stove.id) ||
  dist(state.player.pos, stove.pos) <= SERVE_RADIUS;

export const padPrice = (state: ShopState, pad: Pad) => {
  if (pad.kind === "upgrade" && pad.upgradeId) {
    return upgradePrice(pad.upgradeId, state.levels[pad.upgradeId]);
  }
  return pad.price ?? Infinity;
};

export const padLevel = (state: ShopState, pad: Pad) =>
  pad.kind === "upgrade" && pad.upgradeId ? state.levels[pad.upgradeId] : 0;

/** 先に買っておくものが済んでいるか（順ぐりに出していくための条件） */
const opened = (state: ShopState, needs: string | undefined) =>
  !needs || state.unlocked.includes(needs);

/**
 * 条件のうえでは出せる枠。
 * ここから「同時に出す数」をしぼって、実際に見せる枠を決める（availablePads）
 */
const eligiblePads = (state: ShopState) =>
  pads.filter((pad) => {
    // 値段が入っていない枠は出さない（データの取りこぼし対策）
    if (pad.kind !== "upgrade" && !Number.isFinite(pad.price)) return false;
    // 何食か出すまで、そもそも枠を見せない（まず仕事を覚えてもらう）
    if (pad.needServed !== undefined && state.served < pad.needServed) return false;
    if (pad.kind === "upgrade" && pad.upgradeId) {
      const upgrade = upgradeById.get(pad.upgradeId);
      if (!upgrade || !opened(state, upgrade.unlockAfter)) return false;
      return state.levels[pad.upgradeId] < upgrade.max;
    }
    if (state.unlocked.includes(pad.id)) return false;

    // 調理人はその寸胴を買ってから
    const hire = hireById.get(pad.id);
    if (hire?.kind === "collector" && hasEquip(state, "ticket")) return false;
    if (hire?.stoveId) {
      return (
        state.unlocked.includes(hire.stoveId) && opened(state, hire.unlockAfter)
      );
    }

    // 自動供給機は、その場所を買ってから出す
    if (pad.id.startsWith("auto-")) {
      const owner = seatById.get(pad.id.slice(5));
      return !!owner && state.unlocked.includes(owner.id);
    }

    // 席・店員・寸胴・設備は、その区画が開いてから出す。
    // unlockAfter は「これを買ってから出す」の指定。ひとつ買うと次が出てくる
    // 順ぐりの解放にも、あとの区画が開いたら古い区画に足すのにも使う
    const seat = seatById.get(pad.id);
    if (seat) {
      if (!opened(state, seat.unlockAfter)) return false;
      return areaOpen(state, seat.area);
    }
    if (hire) {
      if (!opened(state, hire.unlockAfter)) return false;
      return areaOpen(state, hire.area);
    }
    const stove = stoveById.get(pad.id);
    if (stove) {
      if (!opened(state, stove.unlockAfter)) return false;
      return areaOpen(state, stove.area);
    }
    const equip = equipById.get(pad.id.replace("equip-", "") as EquipId);
    if (equip) {
      if (!opened(state, equip.unlockAfter)) return false;
      return equip.outside || areaOpen(state, equip.area);
    }

    // 区画の枠は、ひとつ前の区画が開いてから出す
    const area = areaById.get(pad.id);
    if (area) {
      if (!opened(state, area.unlockAfter)) return false;
      const index = areas.indexOf(area);
      return index <= 0 || areaOpen(state, index - 1);
    }
    return true;
  });

/**
 * いま店内に出ている枠。
 *
 * revealLimit のあるステージ（火のはじまり）では、条件を満たしたものを
 * いっぺんに出さず、順ぐりに少しずつ見せる。まだ見せていない枠は
 * マップに出さない（薄いシルエットも出さない）。
 * 一度出した枠は、買うまで引っこめない。
 */
export const availablePads = (state: ShopState) => {
  const eligible = eligiblePads(state);
  if (!Number.isFinite(revealLimit(state))) return eligible;
  const seen = new Set(state.revealed);
  return eligible.filter(
    // 強化と次の区画は進行を止めない。区画枠を任意購入の枠に埋もれさせない
    (pad) =>
      pad.kind === "upgrade" ||
      areaById.has(pad.id) ||
      seen.has(pad.id),
  );
};

/**
 * いま「おすすめ」が付く枠（仕様書 §2.4）。
 * つまっている工程から選ぶだけで、買わなくても進めなくならない。
 */
export const recommendedPad = (state: ShopState): string | null => {
  if (state.stageId !== "fire" || !fireLive(state)) return null;
  const open = new Set(availablePads(state).map((pad) => pad.id));
  return firePriorityPads(state).find((id) => open.has(id)) ?? null;
};

/** 一度に新しく出す枠の数と、次に出すまでの間（秒） */
const REVEAL_BURST = 2;
const REVEAL_GAP = 10;

/**
 * 新しい枠を出すかどうかを決める。
 *
 * 出せる枠のうち、まだ見せていないものを reveal の順に、
 * 「いま出ていて、まだ買っていない枠」が上限に届くまで出す。
 * ただし一度に出すのは2つまで（§2.1）。まとめて増えると、
 * 何のための枠なのか分からなくなる。
 */
const updateReveals = (state: ShopState, dt: number) => {
  const limit = revealLimit(state);
  if (!Number.isFinite(limit)) return;
  state.revealWait = Math.max(0, state.revealWait - dt);
  if (state.revealWait > 0) return;

  const eligible = eligiblePads(state);
  const seen = new Set(state.revealed);
  // 買い切りの枠だけを数える。強化の枠は買っても消えないので数えない
  let showing = eligible.filter(
    (pad) =>
      pad.kind !== "upgrade" &&
      !areaById.has(pad.id) &&
      seen.has(pad.id),
  ).length;

  const queue = eligible
    .filter((pad) => !seen.has(pad.id))
    .sort((a, b) => (a.reveal ?? 999) - (b.reveal ?? 999));

  /*
   * 一度に出す数。ふだんは2つずつだが、いま1つも出ていないとき
   *（＝遊びはじめと、見えていた枠をぜんぶ買ったとき）は、
   * 上限までまとめて出す。何のために稼ぐのかが分からない時間を作らないため。
   * ステージごとに revealBurst で変えられる（大河の文明は最初から5つ）
   */
  const burst =
    showing === 0 ? Math.max(limit, REVEAL_BURST) : stage().revealBurst ?? REVEAL_BURST;

  const added: Pad[] = [];
  for (const pad of queue) {
    if (added.length >= burst) break;
    if (pad.kind !== "upgrade" && !areaById.has(pad.id)) {
      if (showing >= limit) continue;
      showing += 1;
    }
    state.revealed.push(pad.id);
    added.push(pad);
    const at = padPosOf(state, pad);
    pop(state, { x: at.x, y: at.y - 22 }, "NEW!");
  }
  if (added.length === 0) return;
  state.revealWait = REVEAL_GAP;
  state.toast = {
    text:
      added.length === 1
        ? `${added[0].label}が出せるようになった ― ${added[0].hint ?? added[0].sub}`
        : `${added.map((pad) => pad.label).join("・")}が出せるようになった`,
    at: Date.now(),
  };
};

/** 配膳口（丼を置く場所）の位置 */
export const trayPos = (seat: SeatSpec): Vec => seat.tray;

/* ---------- 更新 ---------- */

export type Input = { x: number; y: number };

const takeMoney = (state: ShopState, amount: number) => {
  const paid = Math.min(state.money, amount);
  state.money -= paid;
  return paid;
};

const pop = (state: ShopState, pos: Vec, text: string) => {
  state.pops.push({ id: state.nextId++, pos: { ...pos }, text, age: 0 });
};

const unlock = (state: ShopState, padId: string) => {
  if (state.unlocked.includes(padId)) return;
  state.unlocked.push(padId);
  delete state.padProgress[padId];

  const stove = stoveById.get(padId);
  if (stove) {
    state.ready[padId] = 0;
    state.cooking[padId] = 0;
    if (isStation(stove)) state.hold[padId] = 0;
    if (stove.fuel) state.fuel[padId] = 0;
  }

  /*
   * ただで付いてくるもの（値段 0 で、これを買うと出てくる作業場）。
   * 解体場の仮置き場は狩猟キャンプについてくる。買い忘れて
   * 「毛皮の置き場がないから解体が止まる」が起きないようにするため
   */
  for (const extra of stoves) {
    if (extra.price !== 0 || extra.unlockAfter !== padId) continue;
    if (state.unlocked.includes(extra.id)) continue;
    state.unlocked.push(extra.id);
    state.ready[extra.id] = 0;
    state.cooking[extra.id] = 0;
    if (isStation(extra)) state.hold[extra.id] = 0;
    if (extra.fuel) state.fuel[extra.id] = 0;
  }
  // 値段0の席も同じ（2号店を買うと、動く店が丸ごとついてくる）
  for (const extra of seats) {
    if (extra.price !== 0 || extra.unlockAfter !== padId) continue;
    if (state.unlocked.includes(extra.id)) continue;
    state.unlocked.push(extra.id);
  }
  const hire = hireById.get(padId);
  if (hire) state.staff.push(makeStaff(hire, state.nextId++, hireHome(state, hire)));


  const area = areaById.get(padId);
  const pad = padById.get(padId);
  state.toast = {
    text: area ? `${area.label}！ 店が広がった` : `${pad?.label ?? ""}を手に入れた！`,
    at: Date.now(),
  };
  state.sfx.push("buy");

  // 新しい区画が開くと、前の区画にも新しいスポットが出てくる
  if (area) {
    const fresh = [
      ...seats.filter((item) => item.unlockAfter === padId),
      ...stoves.filter((item) => item.unlockAfter === padId),
      ...hires.filter((item) => item.unlockAfter === padId),
      ...equipment
        .filter((item) => item.unlockAfter === padId)
        .map((item) => ({ ...item, label: item.name })),
    ];
    if (fresh.length > 0) {
      const names = Array.from(new Set(fresh.map((item) => item.label ?? "新しい設備")));
      state.toast = {
        text: `前の区画に ${names.slice(0, 2).join("・")} が出せるようになった！`,
        at: Date.now(),
      };
      for (const item of fresh) {
        const at = "pos" in item ? item.pos : null;
        if (at) pop(state, { x: at.x, y: at.y - 20 }, "NEW!");
      }
    }
  }

  // 券売機を入れるとお金は自動で入るので、レジ係はホールへ回す
  if (padId === "equip-ticket") {
    let moved = 0;
    for (const worker of state.staff) {
      if (worker.kind !== "collector") continue;
      worker.kind = "waiter";
      worker.bag = {};
      moved += 1;
    }
    if (moved > 0) {
      state.toast = {
        text: `レジ係 ${moved}人をホールに配置転換した`,
        at: Date.now(),
      };
      pop(state, outsidePos(state, 112), "配置転換！");
    }
  }
};

/**
 * 仲間が歩いてくる場所。
 *
 * 火のはじまりは区画が横に長いので、みんなが同じ入口から来ると
 * 遠い区画のベンチにたどり着くだけで何十秒もかかる。
 * その区画の野から来てもらう（帰るときも同じ方角へ帰る）。
 */
/** その席のある棟の、客用の戸口（無ければ null） */
const doorFor = (seat: SeatSpec | null): { x: number; w: number } | null => {
  if (!seat) return null;
  const own = areaById.get(`area-${seat.area}`);
  if (!own) return null;
  if (own.door) return own.door;
  // 同じ棟のどこかにある戸口を使う（1号店は area-0 に置く）
  const mate = areas.find((item) => item.building === own.building && item.door);
  return mate?.door ?? null;
};

/** その席の客が出入りする、通りの位置 */
const streetFor = (state: ShopState, seat: SeatSpec | null): Vec => {
  const street = streetPos(state);
  const door = doorFor(seat);
  return { x: door ? door.x : street.x, y: street.y };
};

const guestEntry = (state: ShopState, seat: SeatSpec | null): Vec => {
  const street = streetFor(state, seat);
  const fallback = { x: street.x + (Math.random() * 40 - 20), y: street.y };
  if (state.stageId !== "fire" || !seat) return fallback;
  const area = areaById.get(`area-${seat.area}`);
  if (!area) return fallback;
  return {
    x: clamp(seat.pos.x + (Math.random() * 40 - 20), area.rect.x0 + 24, area.rect.x1 - 24),
    y: Math.min(worldHeight(state) - 10, area.rect.y1 + 28),
  };
};

const spawnCustomers = (state: ShopState, dt: number) => {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = spawnInterval(state);
  // 夜は仲間が来ない。みんな広場と住居にいる（第2区画から）
  if (fireLive(state) && state.fire.phase === "night") return;

  const taken = new Set(
    state.customers
      .filter((customer) => customer.state !== "leaving")
      .map((customer) => customer.seatId),
  );
  // 空席の中から毎回くじで選ぶ（先頭固定だと、あとから出す席
  // ＝川辺の席・交易の席のような枠に、空きがあっても客がまず来ない）。
  // 誰にも運べない数を要る席は、そもそも案内しない
  const freeCandidates = openSeats(state).filter(
    (seat) =>
      !taken.has(seat.id) && !isDirty(state, seat.id) && seatServable(state, seat),
  );
  const free =
    freeCandidates.length > 0
      ? freeCandidates[Math.floor(Math.random() * freeCandidates.length)]
      : undefined;

  const newGuest = (over: Partial<Customer>): Customer => ({
    id: state.nextId++,
    seatId: "",
    state: "walking",
    pos: guestEntry(state, over.seatId ? (seatById.get(over.seatId) ?? null) : null),
    timer: 0,
    budget: 1,
    visits: 0,
    ...over,
  });

  if (queueMode()) {
    // 席が空いていればそこへ、埋まっていれば行列にならぶ（一列ずつ）
    const lining = state.customers.filter((c) => c.state === "lining").length;
    if (free) {
      state.customers.push(newGuest({ seatId: free.id, state: "walking" }));
    } else if (lining < MAX_LINE) {
      state.customers.push(newGuest({ state: "lining", lane: lining }));
    }
    return;
  }

  // 園内で次を待っている人がいるあいだは、新しい客を入れない
  if (state.customers.some((customer) => customer.state === "roaming")) return;
  if (!free) return;

  // 遊べる場所が多いほど、ひとりが何か所もまわる
  const variety = Math.min(9, Math.floor(openSeats(state).length * 0.8));
  state.customers.push(
    newGuest({
      seatId: free.id,
      state: hasGate() ? "buying" : "walking",
      budget: 1 + Math.max(0, Math.floor(Math.random() * (variety + 1))),
    }),
  );
};

/** 行列の先頭から、空いた席へ順に案内する（工程ステージ） */
const advanceLine = (state: ShopState) => {
  if (!queueMode()) return;
  const taken = new Set(
    state.customers
      .filter((c) => c.state !== "leaving" && c.seatId)
      .map((c) => c.seatId),
  );
  const lining = state.customers
    .filter((c) => c.state === "lining")
    .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0));
  for (const seat of openSeats(state)) {
    if (taken.has(seat.id) || isDirty(state, seat.id)) continue;
    const next = lining.shift();
    if (!next) break;
    next.seatId = seat.id;
    next.state = "walking";
    next.lane = undefined;
    taken.add(seat.id);
  }
  // 並び直し（前が抜けたら詰める）
  state.customers
    .filter((c) => c.state === "lining")
    .sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0))
    .forEach((c, i) => {
      c.lane = i;
    });
};

const updateStoves = (state: ShopState, dt: number) => {
  const factor = cookSpeedFactor(state);
  // 直結の設備（樋・ベルト）は、まず前の作業場から次へ流しておく
  flowLinks(state, dt);
  for (const stove of openStoves(state)) {
    // 狩り場と森は勝手に作らない。動物を狩る・木を切ると出し口にたまる
    if (isHunt(stove) || isForest(stove)) continue;
    // 貯蔵庫・仮置き場・建築予定地は、受け取るだけで自分では作らない。
    // 谷は、マンモスを倒して解体しないと何も出ない
    if (isStore(stove) || isPile(stove) || isBuild(stove) || stove.beast) continue;
    const ready = state.ready[stove.id] ?? 0;
    const cap = holdCap(state, stove);
    if (ready >= cap) continue;
    // 工程の作業場は、受け口に材料がないと作れない（まきが要る焼き場はまきも）
    if (isRecipe(stove)) {
      // 盛り付け台。品目がひとつでも欠けたら止まる
      if (!recipeReady(state, stove)) {
        state.cooking[stove.id] = 0;
        continue;
      }
    } else if (isStation(stove) && heldAt(state, stove.id) <= 0) {
      state.cooking[stove.id] = 0;
      continue;
    }
    if (stove.fuel && fuelAt(state, stove.id) <= 0) {
      state.cooking[stove.id] = 0;
      continue;
    }
    // 人の手が要る作業場（薪割り場）は、担当者かプレイヤーがそばにいるあいだだけ進む。
    // 途中まで割った進みは残しておく（近づき直せば続きから）
    if (stove.manual && !isManned(state, stove)) continue;
    // 夜と吹雪は外の仕事を止める。寒いとみんな遅くなる（第2・第4区画）。
    // 大河の文明は、季節と増水でここが変わる
    const weather = fireWork(state, stove) * taigaWork(state, stove);
    if (weather <= 0) continue;
    const boost = stoveHasCook(state, stove.id) ? cookBoost() : 1;
    const work = stove.work ?? 1;
    const progress =
      (state.cooking[stove.id] ?? 0) +
      (dt * boost * weather) / (cookTime() * work * factor);
    if (progress >= 1) {
      state.ready[stove.id] = ready + 1;
      state.cooking[stove.id] = progress - 1;
      // 1つ作ったら、材料を1つ・まきを1つ使う
      if (isRecipe(stove)) {
        const bag = state.parts[stove.id] ?? {};
        for (const [kind, need] of Object.entries(stove.recipe ?? {})) {
          bag[kind] = Math.max(0, (bag[kind] ?? 0) - need);
        }
        state.parts[stove.id] = bag;
      } else if (isStation(stove)) {
        state.hold[stove.id] = heldAt(state, stove.id) - 1;
      }
      if (stove.fuel) state.fuel[stove.id] = fuelAt(state, stove.id) - 1;
    } else {
      state.cooking[stove.id] = progress;
    }
  }
};

/** 直結の設備で、出し口から次の受け口へ1つずつ流す */
const flowLinks = (state: ShopState, dt: number) => {
  for (const item of equipment) {
    if (!item.link || !hasEquip(state, item.id)) continue;
    const { from, to } = item.link;
    if (!state.unlocked.includes(from) || !state.unlocked.includes(to)) continue;
    const key = `link-${item.id}`;
    state.autoTimer[key] = (state.autoTimer[key] ?? 0) + dt;
    /*
     * だいたい 0.5 秒に1つ流す（速いはこび手より速い）。
     * 大河の文明では、水門を据えた水路だけ 0.3 秒になる。
     * 取水口の水はみんなで分け合うので、どの畑を優先するかが効いてくる
     */
    const gap = item.priority && hasEquip(state, item.priority) ? 0.3 : 0.5;
    if (state.autoTimer[key] < gap) continue;
    const fromStove = stoveById.get(from);
    const toStove = stoveById.get(to);
    if (!fromStove || !toStove) continue;
    if ((state.ready[from] ?? 0) <= 0) continue;
    // 送り先の、正しい受け口（材料 or まき）へ入れる
    const made = stoveItem(fromStove);
    /*
     * 建築予定地が同じ資材を必要としている間は、直結設備をいったん止める。
     * 直結設備は運び手より速いため、たとえば大河の文明で
     * 「丸太ころがし」が丸太をすべて薪割り場へ流すと、船着き場の
     * 建築係が丸太を1本も拾えず、永久に建たない状態になる。
     * 建築が必要数を受け取ったら stationAccepts が build を返さなくなり、
     * 直結設備は自動で通常運転へ戻る。
     */
    const buildNeedsMade = openStoves(state).some(
      (stove) =>
        isBuild(stove) && stationAccepts(state, stove, made) === "build",
    );
    if (buildNeedsMade) continue;
    const slot = stationAccepts(state, toStove, made);
    if (!slot) continue;
    state.autoTimer[key] = 0;
    state.ready[from] -= 1;
    putSlot(state, toStove, made, slot, 1);
  }
};

/* ---------- 狩り場 ---------- */

/** 狩り場か（動物を狩って肉にする場所） */
export const isHunt = (stove: StoveSpec) => stove.art === "hunt";

/** 森か（立木を切って丸太にする場所） */
export const isForest = (stove: StoveSpec) => stove.art === "forest";

/** 狩り場・森の広がり（指定がなければ作業場のまわり） */
export const huntZone = (state: ShopState, stove: StoveSpec): Rect => {
  if (stove.zone) return stove.zone;
  const top = outsideTop(state);
  return {
    x0: stove.pos.x - 46,
    y0: Math.max(KITCHEN.top + 6, stove.pos.y - 26),
    x1: stove.pos.x + 46,
    y1: Math.min(top - 8, stove.pos.y + 96),
  };
};

const PREY_KINDS = ["boar", "deer", "rabbit"];

const spotIn = (rect: Rect): Vec => ({
  x: rect.x0 + Math.random() * (rect.x1 - rect.x0),
  y: rect.y0 + Math.random() * (rect.y1 - rect.y0),
});

const preyOf = (state: ShopState, stoveId: string) =>
  state.prey.filter((animal) => animal.stoveId === stoveId);

/** 狩り場に動物を湧かせ、うろつかせる */
const updateHunt = (state: ShopState, dt: number) => {
  const grounds = openStoves(state).filter(isHunt);
  // いなくなった狩り場の動物は消す
  if (grounds.length === 0) {
    if (state.prey.length) state.prey = [];
    return;
  }
  const alive = new Set(grounds.map((stove) => stove.id));
  state.prey = state.prey.filter((animal) => alive.has(animal.stoveId));

  for (const stove of grounds) {
    const key = `hunt-${stove.id}`;
    state.autoTimer[key] = (state.autoTimer[key] ?? 0) + dt;
    if (
      state.autoTimer[key] >= HUNT_SPAWN &&
      preyOf(state, stove.id).length < HUNT_CAP
    ) {
      state.autoTimer[key] = 0;
      const zone = huntZone(state, stove);
      const at = spotIn(zone);
      state.prey.push({
        id: state.nextId++,
        stoveId: stove.id,
        pos: at,
        target: spotIn(zone),
        kind: PREY_KINDS[Math.floor(Math.random() * PREY_KINDS.length)],
        flee: 0,
      });
    }
  }

  // うろつき（狩り手が近いと少し逃げる）
  for (const animal of state.prey) {
    const stove = stoveById.get(animal.stoveId);
    if (!stove) continue;
    const zone = huntZone(state, stove);
    animal.flee = Math.max(0, animal.flee - dt);
    if (moveToward(animal.pos, animal.target, animal.flee > 0 ? 70 : 28, dt)) {
      animal.target = spotIn(zone);
    }
  }
};

/**
 * その場所の近くにいる動物を1匹狩る。狩り場の出し口に肉が1つたまる。
 * 出し口がいっぱいなら狩れない。狩れたら true。
 */
const catchPrey = (state: ShopState, pos: Vec): boolean => {
  let best: Prey | null = null;
  let bestDist = CATCH_RADIUS;
  for (const animal of state.prey) {
    const stove = stoveById.get(animal.stoveId);
    if (!stove) continue;
    if ((state.ready[stove.id] ?? 0) >= holdCap(state, stove)) continue;
    const d = dist(pos, animal.pos);
    if (d < bestDist) {
      best = animal;
      bestDist = d;
    }
  }
  if (!best) return false;
  state.ready[best.stoveId] = (state.ready[best.stoveId] ?? 0) + 1;
  pop(state, { x: best.pos.x, y: best.pos.y - 12 }, "しとめた！");
  state.sfx.push("serve");
  const id = best.id;
  state.prey = state.prey.filter((animal) => animal.id !== id);
  return true;
};

/* ---------- 森 ---------- */

const TREE_KINDS = ["cedar", "beech", "pine"];

/** 森ごとに、木を決まった場所へ植えておく（毎回同じ並びになる） */
const plantTrees = (state: ShopState, stove: StoveSpec) => {
  const zone = huntZone(state, stove);
  const w = zone.x1 - zone.x0;
  const h = zone.y1 - zone.y0;
  for (let i = 0; i < TREE_COUNT; i += 1) {
    // 3列×2段くらいに、少しずらして並べる
    const col = i % 3;
    const row = Math.floor(i / 3);
    state.trees.push({
      id: state.nextId++,
      stoveId: stove.id,
      pos: {
        x: zone.x0 + w * (0.18 + col * 0.32) + (row === 1 ? w * 0.08 : 0),
        y: zone.y0 + h * (0.28 + row * 0.42),
      },
      kind: TREE_KINDS[i % TREE_KINDS.length],
      stump: 0,
      chop: 0,
    });
  }
};

/** 森の木を生やし、切り株を育て直す */
const updateForest = (state: ShopState, dt: number) => {
  const woods = openStoves(state).filter(isForest);
  if (woods.length === 0) {
    if (state.trees.length) state.trees = [];
    return;
  }
  const alive = new Set(woods.map((stove) => stove.id));
  state.trees = state.trees.filter((tree) => alive.has(tree.stoveId));

  for (const stove of woods) {
    if (state.trees.some((tree) => tree.stoveId === stove.id)) continue;
    plantTrees(state, stove);
  }

  for (const tree of state.trees) {
    if (tree.stump > 0) {
      tree.stump = Math.max(0, tree.stump - dt);
      if (tree.stump === 0) tree.chop = 0;
      continue;
    }
    // 途中でやめた木は、ゆっくり切り口がふさがる
    if (tree.chop > 0) tree.chop = Math.max(0, tree.chop - dt * 0.35);
  }
};

/** その森の出し口に、まだ丸太を置ける空きがあるか */
const forestHasRoom = (state: ShopState, stoveId: string) => {
  const stove = stoveById.get(stoveId);
  if (!stove) return false;
  return (state.ready[stoveId] ?? 0) < holdCap(state, stove);
};

/**
 * その場所のいちばん近い立木を、少しずつ切る。
 * 切り倒したら森の出し口に丸太が1本たまり、true を返す。
 * 出し口が満杯なら、余分な伐採はしない（§5.2）
 */
const chopTree = (state: ShopState, pos: Vec, dt: number, rate = 1): boolean => {
  let best: Tree | null = null;
  let bestDist = CATCH_RADIUS;
  for (const tree of state.trees) {
    if (tree.stump > 0) continue;
    if (!forestHasRoom(state, tree.stoveId)) continue;
    const d = dist(pos, tree.pos);
    if (d < bestDist) {
      best = tree;
      bestDist = d;
    }
  }
  if (!best) return false;
  best.chop += (dt * rate) / CHOP_TIME;
  if (best.chop < 1) return false;
  best.chop = 0;
  best.stump = TREE_REGROW;
  state.ready[best.stoveId] = (state.ready[best.stoveId] ?? 0) + 1;
  pop(state, { x: best.pos.x, y: best.pos.y - 26 }, "切りたおした！");
  state.sfx.push("serve");
  return true;
};

/** いま切れる木（切り株でなく、出し口にも空きがある） */
const liveTrees = (state: ShopState, stoveId?: string) =>
  state.trees.filter(
    (tree) =>
      tree.stump <= 0 &&
      (!stoveId || tree.stoveId === stoveId) &&
      forestHasRoom(state, tree.stoveId),
  );

const payOut = (state: ShopState, seat: SeatSpec, at: Vec) => {
  const value = coinValue(state.levels.price) * (seat.value ?? 1);
  if (hasEquip(state, "ticket")) {
    // 券売機／自動改札があるとお金は自動でサイフに入る
    state.money += value;
    pop(
      state,
      { x: at.x, y: at.y - 10 },
      `+${Math.round(value).toLocaleString("ja-JP")}${currency()}`,
    );
    state.sfx.push("coin");
  } else {
    state.coins.push({
      id: state.nextId++,
      pos: { x: at.x + (Math.random() * 18 - 9), y: at.y },
      value,
      age: 0,
    });
  }
  state.served += 1;
};

/**
 * いま、いちばん多く運べる数（自分・配膳ロボ・ホール店員のうち最大）。
 * これを超える数を要る席は、誰も運べないので客を入れない
 */
export const bestCarry = (state: ShopState, kind: ItemKind) => {
  let best = maxCarry(state);
  for (const worker of state.staff) {
    if (handledItem(worker) !== kind) continue;
    if (worker.kind !== "waiter" && worker.kind !== "robot" && worker.kind !== "server") {
      continue;
    }
    best = Math.max(best, carrierLimit(state, worker));
  }
  return best;
};

/** その席は、いま誰かが運べるか（運べない席には客を入れない） */
export const seatServable = (state: ShopState, seat: SeatSpec) =>
  seatMode(seat) === "shelf" ||
  seatCost(seat) <= bestCarry(state, seatNeeds(seat));

/** いま空いている場所（ほかの人が向かっていない・皿も残っていない） */
const freeSeats = (state: ShopState, customer: Customer) => {
  const taken = new Set(
    state.customers
      .filter(
        (item) =>
          item.id !== customer.id &&
          item.state !== "leaving" &&
          item.state !== "roaming",
      )
      .map((item) => item.seatId),
  );
  return openSeats(state).filter(
    (seat) =>
      seat.id !== customer.seatId &&
      !taken.has(seat.id) &&
      !isDirty(state, seat.id) &&
      seatServable(state, seat),
  );
};

/** 次にまわる場所へ。空いていなければ、園内をぶらぶらして待つ */
const nextStop = (state: ShopState, customer: Customer) => {
  customer.visits += 1;
  if (customer.visits >= customer.budget) {
    customer.state = "leaving";
    return;
  }
  const free = freeSeats(state, customer);
  if (free.length === 0) {
    // すぐに帰らず、空くのを少し待つ
    customer.state = "roaming";
    customer.timer = ROAM_TIME;
    return;
  }
  const seat = free[Math.floor(Math.random() * free.length)];
  customer.seatId = seat.id;
  customer.state = "walking";
  customer.timer = 0;
  pop(state, { x: customer.pos.x, y: customer.pos.y - 30 }, "次いこう！");
};

const updateCustomers = (state: ShopState, dt: number) => {
  advanceLine(state);
  for (const customer of state.customers) {
    // 行列にならんで、席が空くのを待っている
    if (customer.state === "lining") {
      moveToward(customer.pos, linePos(state, customer.lane ?? 0), 108, dt);
      continue;
    }
    const seat = seatById.get(customer.seatId);
    if (!seat) continue;
    const mode = seatMode(seat);

    if (customer.state === "buying") {
      // 入場券売り場に並ぶ
      const line = state.customers.filter((item) => item.state === "buying");
      const spot = queueSpot(boothPos(state), line.indexOf(customer));
      const there = moveToward(customer.pos, spot, 96, dt);
      if (there && customer.timer < 1) customer.timer = 1;
      if (customer.timer >= 1 && hasEquip(state, "vend")) {
        customer.timer += dt;
        if (customer.timer >= 1 + AUTO_TIME * 0.6) sellTicket(state, customer);
      }
    } else if (customer.state === "entering") {
      // 改札の前に並ぶ
      const line = state.customers.filter((item) => item.state === "entering");
      const spot = queueSpot(turnstilePos(state), line.indexOf(customer));
      const there = moveToward(customer.pos, spot, 96, dt);
      if (there && customer.timer < 1) customer.timer = 1;
      if (customer.timer >= 1 && hasEquip(state, "turnstile")) {
        customer.timer += dt;
        if (customer.timer >= 1 + AUTO_TIME * 0.5) letIn(state, customer);
      }
    } else if (customer.state === "walking") {
      if (walkTo(state, customer, seat.pos, 96, dt)) customer.state = "waiting";
    } else if (customer.state === "waiting" && mode !== "shelf") {
      // 待ちくたびれたら帰る。止まった工程の前で、席が永久に埋まらないように
      customer.timer += dt;
      if (customer.timer > PATIENCE) {
        customer.state = "leaving";
        pop(state, { x: customer.pos.x, y: customer.pos.y - 30 }, "また来ます…");
      }
    } else if (customer.state === "waiting" && mode === "shelf") {
      // お土産屋は自分で棚から取る。並んでいなければ待つ
      if (shelfStock(state, seat.id) > 0) {
        state.shelf[seat.id] = shelfStock(state, seat.id) - 1;
        customer.state = "paying";
        pop(state, { x: seat.pos.x, y: seat.pos.y - 26 }, "これください！");
      }
    } else if (customer.state === "paying") {
      const till = payPos(seat);
      if (walkTo(state, customer, till, 100, dt)) {
        payOut(state, seat, till);
        state.sfx.push("serve");
        nextStop(state, customer);
      }
    } else if (customer.state === "eating") {
      customer.timer -= dt;
      if (customer.timer <= 0) {
        payOut(state, seat, { x: seat.serve.x, y: seat.serve.y });
        // レストランは皿が残る。片づけるまで次の客が来ない
        if (mode === "table") state.dirty[seat.id] = state.playTime;
        nextStop(state, customer);
      }
    } else if (customer.state === "roaming") {
      // 空くのを待ちながら、あたりを歩く
      customer.timer -= dt;
      const free = freeSeats(state, customer);
      if (free.length > 0) {
        const next = free[Math.floor(Math.random() * free.length)];
        customer.seatId = next.id;
        customer.state = "walking";
        customer.timer = 0;
        pop(state, { x: customer.pos.x, y: customer.pos.y - 30 }, "次いこう！");
      } else if (customer.timer <= 0) {
        customer.state = "leaving";
      } else {
        const t = state.playTime * 0.6 + customer.id;
        walkTo(
          state,
          customer,
          { x: seat.pos.x + Math.cos(t) * 60, y: seat.pos.y + Math.sin(t) * 34 },
          70,
          dt,
        );
      }
    } else if (customer.state === "leaving") {
      // 来た方角へ帰る（火のはじまりは区画ごとに野へ戻っていく）
      const away =
        state.stageId === "fire"
          ? { x: seat.pos.x, y: Math.min(worldHeight(state) - 10, seat.pos.y + 120) }
          : streetFor(state, seat);
      if (walkTo(state, customer, away, 112, dt)) customer.id = -1;
    }
  }
  state.customers = state.customers.filter((customer) => customer.id !== -1);
};

/**
 * 近くの作る場所から1つ受け取る。
 * すでに違う種類のものを持っているときは受け取らない（丼と商品は混ぜられない）
 */
/** 入場券を売る（お金が落ちる／自動集金ならサイフへ） */
const sellTicket = (state: ShopState, customer: Customer) => {
  const fee = admissionValue(state);
  const at = boothPos(state);
  if (fee > 0) {
    if (hasEquip(state, "ticket")) {
      state.money += fee;
      pop(
        state,
        { x: at.x, y: at.y - 14 },
        `+${fee.toLocaleString("ja-JP")}${currency()}`,
      );
      state.sfx.push("coin");
    } else {
      state.coins.push({
        id: state.nextId++,
        pos: { x: at.x + (Math.random() * 26 - 13), y: at.y + 16 },
        value: fee,
        age: 0,
      });
    }
  }
  customer.state = "entering";
  customer.timer = 0;
  pop(state, { x: customer.pos.x, y: customer.pos.y - 30 }, "入場券！");
  state.sfx.push("serve");
};

/** 改札を通す */
const letIn = (state: ShopState, customer: Customer) => {
  customer.state = "walking";
  customer.timer = 0;
  pop(state, { x: customer.pos.x, y: customer.pos.y - 30 }, "いらっしゃい！");
  state.sfx.push("serve");
};

/** 入場券売り場・改札で待っている人（近い順） */
const atBooth = (state: ShopState) =>
  state.customers.filter(
    (customer) => customer.state === "buying" && customer.timer >= 1,
  );
const atGate = (state: ShopState) =>
  state.customers.filter(
    (customer) => customer.state === "entering" && customer.timer >= 1,
  );

const hasStaff = (state: ShopState, kind: StaffKind) =>
  state.staff.some((worker) => worker.kind === kind);

/** 入場券を、自分以外の誰か（係か機械）が売ってくれるか */
export const sellsTickets = (state: ShopState) =>
  hasEquip(state, "vend") || hasStaff(state, "seller");

/** 改札を、自分以外の誰か（係か機械）が通してくれるか */
export const opensGate = (state: ShopState) =>
  hasEquip(state, "turnstile") || hasStaff(state, "gatekeeper");

/**
 * 近くの出し口から1つ受け取る。受け取れた種類を返す（受け取れなければ null）。
 *
 * limit は「その種類を何個まで持てるか」。上限は品種ごとに別なので、
 * 生肉3・まき3 のように、いくつもの品を同時に持てる。
 */
const pickUp = (
  state: ShopState,
  pos: Vec,
  limit: number,
  want: ItemKind | null,
  bag: Record<string, number>,
): ItemKind | null => {
  for (const stove of openStoves(state)) {
    if ((state.ready[stove.id] ?? 0) <= 0) continue;
    const item = stoveItem(stove);
    if (want && item !== want) continue;
    if (dist(pos, stove.pos) > PICK_RADIUS) continue;
    if ((bag[item] ?? 0) >= limit) continue;
    state.ready[stove.id] -= 1;
    return item;
  }
  return null;
};

/**
 * 持っているものを、それを受け取る作業場の受け口に置く。
 * 置けた数を返す（0 なら置けなかった）
 */
const dropAtStation = (
  state: ShopState,
  pos: Vec,
  holding: ItemKind | null,
  carry: number,
) => {
  if (!holding || carry <= 0) return 0;
  for (const stove of openStoves(state)) {
    if (!takesItems(stove)) continue;
    const slot = stationAccepts(state, stove, holding);
    if (!slot) continue;
    if (dist(pos, stove.pos) > SERVE_RADIUS) continue;
    const put = putSlot(state, stove, holding, slot, carry);
    if (put <= 0) continue;
    pop(
      state,
      { x: stove.pos.x, y: stove.pos.y - 12 },
      slot === "fuel" ? "くべた！" : slot === "build" ? "積んだ！" : "セット！",
    );
    state.sfx.push("serve");
    return put;
  }
  return 0;
};

/** 皿を片づける。片づけたテーブルには次の客が来る */
const clearTable = (state: ShopState, pos: Vec) => {
  for (const seat of openSeats(state)) {
    if (seatMode(seat) !== "table" || !isDirty(state, seat.id)) continue;
    if (dist(pos, seat.serve) > SERVE_RADIUS && dist(pos, seat.pos) > SERVE_RADIUS) {
      continue;
    }
    delete state.dirty[seat.id];
    pop(state, { x: seat.tray.x, y: seat.tray.y - 12 }, "片づけた！");
    state.sfx.push("serve");
    return true;
  }
  return false;
};

/** 棚に商品を並べる */
const restock = (state: ShopState, pos: Vec) => {
  for (const seat of openSeats(state)) {
    if (seatMode(seat) !== "shelf") continue;
    if (shelfStock(state, seat.id) >= SHELF_MAX) continue;
    if (dist(pos, seat.tray) > SERVE_RADIUS && dist(pos, seat.pos) > SERVE_RADIUS) {
      continue;
    }
    state.shelf[seat.id] = shelfStock(state, seat.id) + 1;
    pop(state, { x: seat.tray.x, y: seat.tray.y - 12 }, "並べた！");
    state.sfx.push("serve");
    return true;
  }
  return false;
};

/**
 * 持っているものを、それを待っている相手に渡す。
 * 2枚・3枚いる場所には、その数だけ持っていないと渡せない。
 * 渡した数を返す（0 なら渡せなかった）
 */
const serve = (
  state: ShopState,
  pos: Vec,
  holding: ItemKind | null,
  carry: number,
  silent = false,
) => {
  // いちばん近い、待っている客に渡す（行列ならリズムよく先頭からさばける）
  let best: Customer | null = null;
  let bestSeat: SeatSpec | null = null;
  let bestReach = Infinity;
  for (const customer of state.customers) {
    if (customer.state !== "waiting") continue;
    const seat = seatById.get(customer.seatId);
    if (!seat || seatMode(seat) === "shelf") continue;
    if (holding && seatNeeds(seat) !== holding) continue;
    if (carry < seatCost(seat)) continue;
    const reach = Math.min(dist(pos, seat.serve), dist(pos, seat.pos));
    if (reach > SERVE_RADIUS || reach >= bestReach) continue;
    best = customer;
    bestSeat = seat;
    bestReach = reach;
  }
  if (!best || !bestSeat) return 0;
  const need = seatCost(bestSeat);
  best.state = "eating";
  best.timer = seatMode(bestSeat) === "table" ? EAT_TIME * 1.6 : EAT_TIME;
  const at = trayPos(bestSeat);
  pop(state, { x: at.x, y: at.y - 12 }, need > 1 ? `${need}つ どうぞ！` : "どうぞ！");
  if (!silent) state.sfx.push("serve");
  return need;
};

/**
 * プレイヤーが、持っているどれか1種類を、待っている客へ1人ぶん渡す。
 * いちばん近い、渡せる相手を選ぶ。渡せたら true。
 */
const serveFromBag = (state: ShopState, player: Player): boolean => {
  let best: Customer | null = null;
  let bestSeat: SeatSpec | null = null;
  let bestReach = Infinity;
  for (const customer of state.customers) {
    if (customer.state !== "waiting") continue;
    const seat = seatById.get(customer.seatId);
    if (!seat || seatMode(seat) === "shelf") continue;
    const need = seatCost(seat);
    if (carryOf(player, seatNeeds(seat)) < need) continue;
    const reach = Math.min(
      dist(player.pos, seat.serve),
      dist(player.pos, seat.pos),
    );
    if (reach > SERVE_RADIUS || reach >= bestReach) continue;
    best = customer;
    bestSeat = seat;
    bestReach = reach;
  }
  if (!best || !bestSeat) return false;
  const need = seatCost(bestSeat);
  takeFromBag(player, seatNeeds(bestSeat), need);
  best.state = "eating";
  best.timer = seatMode(bestSeat) === "table" ? EAT_TIME * 1.6 : EAT_TIME;
  const at = trayPos(bestSeat);
  pop(state, { x: at.x, y: at.y - 12 }, need > 1 ? `${need}つ どうぞ！` : "どうぞ！");
  return true;
};

const collectCoin = (state: ShopState, coin: Coin) => {
  state.money += coin.value;
  coin.id = -1;
  state.sfx.push("coin");
  pop(
    state,
    { x: coin.pos.x, y: coin.pos.y - 10 },
    `+${Math.round(coin.value).toLocaleString("ja-JP")}${currency()}`,
  );
};

const updatePlayer = (state: ShopState, input: Input, dt: number) => {
  const player = state.player;
  const speed = playerSpeed(state);
  const len = Math.hypot(input.x, input.y);

  player.moving = len > 0.08;
  if (player.moving) {
    const nx = input.x / len;
    const ny = input.y / len;
    const scale = Math.min(1, len);
    const box = worldBounds(state);
    const nextX = clamp(
      player.pos.x + nx * speed * scale * dt,
      box.x0 + 18,
      box.x1 - 18,
    );
    const nextY = clamp(
      player.pos.y + ny * speed * scale * dt,
      box.y0 + 54,
      box.y1 - 26,
    );
    // 工事中の区画には入れない（軸ごとに判定して壁ぎわを滑れるようにする）
    const stepX = { x: nextX, y: player.pos.y };
    const stepY = { x: player.pos.x, y: nextY };
    if (!isBlocked(state, stepX) && !wallBlocked(state, player.pos, stepX)) {
      player.pos.x = nextX;
    }
    const stepY2 = { x: player.pos.x, y: nextY };
    if (!isBlocked(state, stepY2) && !wallBlocked(state, player.pos, stepY2)) {
      player.pos.y = nextY;
    }
    void stepY;
    player.step += dt * speed * 0.06 * scale;
  }

  // 連鎖はしばらく渡さないでいると切れる
  state.comboLeft = Math.max(0, state.comboLeft - dt);
  if (state.comboLeft <= 0) state.combo = 0;
  player.serveCd = Math.max(0, (player.serveCd ?? 0) - dt);

  // 狩り場の動物に近づいたら、自分で狩る
  catchPrey(state, player.pos);
  // 森の立木に近づいたら、自分で切る（少しずつ切り進む）
  chopTree(state, player.pos, dt);
  // 倒れたマンモスに近づいたら、自分でも解体する（1頭目は自分が主役）
  if (state.fire.beast?.state === "down") {
    if (dist(player.pos, state.fire.beast.pos) <= 56) {
      cutBeast(state, BUTCHER_RATE * 1.2, dt);
    }
  }

  // 近くの出し口から受け取る（複数の種類を同時に持てる）
  // 上限は種類ごとに別なので、生肉を持っていてもまきを拾える
  const got = pickUp(state, player.pos, maxCarry(state), null, player.bag);
  if (got) addToBag(player, got, 1);

  if (carryTotal(player) > 0) {
    // まず、持っている種類を作業場の受け口・棚へ（まとめて）
    let stocked = false;
    for (const kind of Object.keys(player.bag)) {
      const put = dropAtStation(state, player.pos, kind, carryOf(player, kind));
      if (put > 0) {
        takeFromBag(player, kind, put);
        stocked = true;
        break;
      }
      if (kind === "goods" && restock(state, player.pos)) {
        takeFromBag(player, kind, 1);
        stocked = true;
        break;
      }
    }
    // 客へは、1つずつリズミカルに渡す（連鎖でチャイムが上がる）
    if (!stocked && (player.serveCd ?? 0) <= 0) {
      const served = serveFromBag(state, player);
      if (served) {
        player.serveCd = SERVE_RHYTHM;
        state.combo += 1;
        state.comboLeft = COMBO_WINDOW;
        state.sfx.push({ combo: state.combo });
        if (state.combo >= 2) {
          pop(state, { x: player.pos.x, y: player.pos.y - 42 }, `${state.combo}れんさ！`);
        }
      }
    }
  }
  // 手ぶらのときは、残った皿を片づける
  if (carryTotal(player) === 0) clearTable(state, player.pos);

  // 入場券を売る・改札を通す（近づくだけ）
  if (hasGate()) {
    if (dist(player.pos, boothPos(state)) <= SERVE_RADIUS + 14) {
      const guest = atBooth(state)[0];
      if (guest) sellTicket(state, guest);
    }
    if (dist(player.pos, turnstilePos(state)) <= SERVE_RADIUS + 14) {
      const guest = atGate(state)[0];
      if (guest) letIn(state, guest);
    }
  }

  for (const coin of state.coins) {
    if (dist(player.pos, coin.pos) <= COIN_RADIUS) collectCoin(state, coin);
  }
  state.coins = state.coins.filter((coin) => coin.id !== -1);
};

const updatePads = (state: ShopState, dt: number) => {
  const player = state.player;
  let active: string | null = null;

  for (const pad of availablePads(state)) {
    const at = padPosOf(state, pad);
    if (dist(player.pos, at) > PAD_RADIUS) continue;
    active = pad.id;

    const price = padPrice(state, pad);
    const paid = state.padProgress[pad.id] ?? 0;
    const remain = price - paid;
    // すでに払い終わっているのに残っている枠は、その場で解放する
    // （値段が下がったときに、払い込み分が上回ることがある）
    if (remain <= 0) {
      if (pad.kind === "upgrade" && pad.upgradeId) {
        state.levels[pad.upgradeId] += 1;
        state.padProgress[pad.id] = 0;
        pop(state, { x: at.x, y: at.y - 16 }, "強化！");
        state.sfx.push("upgrade");
      } else {
        unlock(state, pad.id);
      }
      break;
    }

    const rate = Math.max(60, price / 2.5);
    const got = takeMoney(state, Math.min(remain, rate * dt));
    const next = paid + got;

    if (next >= price - 0.001) {
      if (pad.kind === "upgrade" && pad.upgradeId) {
        state.levels[pad.upgradeId] += 1;
        state.padProgress[pad.id] = 0;
        pop(state, { x: at.x, y: at.y - 16 }, "強化！");
        state.toast = { text: `${pad.label}を強化した！`, at: Date.now() };
        state.sfx.push("upgrade");
      } else {
        unlock(state, pad.id);
      }
    } else {
      state.padProgress[pad.id] = next;
    }
    break;
  }
  state.activePad = active;
};

/**
 * その係が扱えるもの。
 * 案内係・配膳ロボはチケット（丼）だけ、料理は料理係、商品は品出しが運ぶ。
 * プレイヤーは何でも持てる
 */
export const handledItem = (worker: Staff): ItemKind =>
  worker.carries ??
  (worker.kind === "server" ? "food" : worker.kind === "stocker" ? "goods" : "main");

/** その区画がどの店のものか（0＝1号店 / 1＝2号店） */
export const shopOfArea = (area: number) => areaById.get(`area-${area}`)?.shop ?? 0;

/** その店員が、そこで働けるか（担当の店から出ない） */
export const inShop = (worker: Staff, area: number) =>
  (worker.shop ?? 0) === shopOfArea(area);

/** スタッフが一度に運べる数。強化（両手鍋／チケットホルダー）で増える */
export const carrierLimit = (state: ShopState, worker: Staff) =>
  // 船は荷が積める。陸の運び手より一段多い
  worker.kind === "boat"
    ? Math.max(10, maxCarry(state) * 2)
    : worker.kind === "robot"
      ? Math.max(5, maxCarry(state))
      : 3 + Math.floor(state.levels.carry / 2);

/** 敷いた道のぶんの足の速さ（村の道は、通る人みんなが速くなる） */
export const roadBonus = (state: ShopState) =>
  equipment.reduce(
    (total, item) => (item.road && hasEquip(state, item.id) ? total + 0.08 : total),
    1,
  );

/** スタッフの足の速さ。強化（厨房シューズ／園内カート）の半分だけ効く */
export const staffSpeedFactor = (state: ShopState) =>
  (1 + state.levels.speed * 0.05) * fireMove(state) * taigaMove(state) * roadBonus(state);

const staffSpeed = (state: ShopState) => STAFF_SPEED * staffSpeedFactor(state);

const carrierSpeed = (state: ShopState, worker: Staff) =>
  (worker.kind === "boat"
    ? BOAT_SPEED
    : worker.kind === "robot"
      ? ROBOT_SPEED
      : STAFF_SPEED) *
  staffSpeedFactor(state) *
  // 運びへ人手を配ると、運ぶ人みんなが速くなる（大河の文明）
  taigaCrew(state, worker.kind);

/** 調理人の立ち位置（寸胴の奥） */
export const cookPost = (worker: Staff): Vec => {
  const stove = worker.stoveId ? stoveById.get(worker.stoveId) : null;
  if (!stove) return { x: 30, y: 120 };
  return { x: stove.pos.x, y: stove.pos.y - 40 };
};

/**
 * 同じ役割でも、ひとりずつ性格が違う。
 * id から決まるので、雇い直しても同じ人は同じ動きをする
 */


/**
 * スタッフの移動。目的地の近くまで来たら settled を立てて、
 * ぶつかり判定で押されないようにする（その場で震えないため）
 */
const go = (
  state: ShopState,
  worker: Staff,
  target: Vec,
  speed: number,
  dt: number,
) => {
  const near = dist(worker.pos, target) < 26;
  worker.settled = near;
  const dx = target.x - worker.pos.x;
  // 向きは、はっきり横へ動いているときだけ変える（その場で反転しない）
  if (Math.abs(dx) > 6) worker.face = dx > 0 ? 1 : -1;
  worker.moving = !near;
  // 壁のあるステージでは、戸口と渡り廊下をたどって行く
  return walkTo(state, worker, target, speed, dt);
};

/**
 * 船の動き。遠くへ行くときは、いったん川へ出て、水の上を走り、
 * 目的地の正面まで来てから岸へ寄る。陸をまっすぐ突っ切らない。
 */
const sail = (
  state: ShopState,
  worker: Staff,
  target: Vec,
  speed: number,
  dt: number,
) => {
  const far = Math.abs(target.x - worker.pos.x) > 150;
  const onRiver = worker.pos.y <= RIVER_LANE + 24;
  if (far && !onRiver) {
    // まず川へ出る（いま居るところの真上）
    go(state, worker, { x: worker.pos.x, y: RIVER_LANE }, speed, dt);
    return;
  }
  if (far) {
    // 川の上を、目的地の正面まで走る
    go(state, worker, { x: target.x, y: RIVER_LANE }, speed, dt);
    return;
  }
  go(state, worker, target, speed, dt);
};

/**
 * その場所を、ほかのスタッフが担当していないか。
 * 配膳ロボは最初のとおり素直に動かすので、予約を見ない
 */
const claimedByOther = (state: ShopState, worker: Staff, id: string) =>
  worker.kind !== "robot" &&
  state.staff.some((other) => other.id !== worker.id && other.target === id);

/**
 * 近づく位置を少しずらす。
 * まっすぐ行く人、ふらふら回り込む人、外側から入る人がいる
 */
const approach = (_state: ShopState, worker: Staff, at: Vec): Vec => {
  /*
   * まっすぐ向かう。重ならないように行き先だけ少しずらす。
   *
   * 船もここは岸の荷そのものを指す。川を通るかどうかは sail が決める。
   * ここで川の上を返してしまうと、船は川で止まったまま
   * いつまでも荷を積めない（実際そうなった）
   */
  if (worker.kind === "robot" || worker.kind === "boat") return at;
  return { x: at.x + ((worker.id % 3) - 1) * 10, y: at.y };
};

/** 手が空いたときの待ち場所（雇った場所で待つ。船は川の上で待つ） */
const idleSpot = (_state: ShopState, worker: Staff): Vec =>
  worker.kind === "boat" ? { x: worker.home.x, y: RIVER_LANE } : worker.home;

/** 近くにいる仲間と少しだけ離れる（団子にならないように） */
const spread = (state: ShopState, dt: number) => {
  const list = state.staff;
  for (let i = 0; i < list.length; i += 1) {
    for (let k = i + 1; k < list.length; k += 1) {
      const a = list[i];
      const b = list[k];
      if (a.kind === "cook" || b.kind === "cook") continue;
      // ロボはぶつかり判定を持たない（すり抜ける）
      if (a.kind === "robot" || b.kind === "robot") continue;
      if (a.kind === "boat" || b.kind === "boat") continue;
      // 着いて作業している人は押さない（押し合いで震えないように）
      if (a.settled || b.settled) continue;
      if (a.charge > 0 || b.charge > 0) continue;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 15 || d < 0.001) continue;
      const push = ((15 - d) / 15) * 10 * dt;
      const nx = dx / d;
      const ny = dy / d;
      a.pos.x -= nx * push;
      a.pos.y -= ny * push;
      b.pos.x += nx * push;
      b.pos.y += ny * push;
    }
  }
};

/**
 * はこび手の仕事ひとつ。
 * 「どの品を、どこへ持っていく／どこで拾う」を、種類まで込みで1件にしたもの。
 * 同じ場所でも品が違えば別の仕事なので、2人が生肉とまきで分担できる。
 */
type HaulJob = {
  /** 予約の合図。品種と場所の組（`meat@fire-1` のような形） */
  id: string;
  kind: ItemKind;
  at: Vec;
  /** 届ける仕事か、拾う仕事か */
  drop: boolean;
  /** その先が材料切れで止まっているか（止まっている工程を先に助ける） */
  stalled: boolean;
  /** 同じ仕事に何人まで向かってよいか */
  slots: number;
  /**
   * 仕事の色分け。専門の係は自分の色の仕事しか取らない。
   *   work  = ふつうの工程あいだの運び
   *   store = 貯蔵庫へ入れる（食料番）
   *   build = 建築予定地へ積む（建築係）
   *   serve = 待っている仲間へ渡す
   *   pick  = 出し口から拾う
   */
  tag?: "work" | "store" | "build" | "serve" | "pick";
  /** 拾う仕事のとき、その品を待っているのが建築予定地か */
  forBuild?: boolean;
  /** 拾う仕事のとき、その品を待っているのが貯蔵庫か */
  forStore?: boolean;
  /** 今夜の食べものにつながる仕事か（足りない夜は、これを先に回す） */
  night?: boolean;
  /** 実行する。動かした数を返す */
  run: () => number;
};

/**
 * 専門の係が受け持つ仕事。
 * はこび手と犬ぞりは何でも運ぶが、食料番・建築係は自分の持ち場だけを見る。
 * （名前が違う人は、動きも違う）
 */
const jobAllowed = (worker: Staff, job: HaulJob) => {
  if (worker.kind === "builder") {
    return job.tag === "build" || (job.tag === "pick" && job.forBuild === true);
  }
  // 食料番は食べもの、夜番は薪。同じ「貯蔵庫へ入れる」でも持ち場が違う
  if (worker.kind === "keeper" || worker.kind === "nightman") {
    const mine = worker.kind === "nightman" ? job.kind === "wood" : job.kind !== "wood";
    const store = job.tag === "store" || (job.tag === "pick" && job.forStore === true);
    return mine && store;
  }
  return true;
};

/**
 * 持っている荷の、行き先のそば（空きが出るのを待つ場所）。
 * 満杯でもいい。そこに立っていれば、空いた瞬間に下ろせる
 */
const waitNear = (state: ShopState, worker: Staff): Vec | null => {
  let best: StoveSpec | null = null;
  let bestGap = Infinity;
  for (const kind of carryKinds(worker)) {
    for (const stove of stationsWanting(state, kind)) {
      const gap = dist(worker.pos, stove.pos);
      if (gap < bestGap) {
        bestGap = gap;
        best = stove;
      }
    }
  }
  return best ? { x: best.pos.x, y: best.pos.y + 40 } : null;
};

/**
 * 抱えたままの荷を返せる場所（その品を作った作業場の出し口）。
 * 空きのあるところだけを返す先にする
 */
const putBack = (state: ShopState, worker: Staff): StoveSpec | null => {
  for (const kind of carryKinds(worker)) {
    const spot = openStoves(state).find(
      (stove) =>
        stoveItem(stove) === kind &&
        !isBuild(stove) &&
        (state.ready[stove.id] ?? 0) < holdCap(state, stove),
    );
    if (spot) return spot;
  }
  return null;
};

/** 今夜の食事につながる場所か（燻製小屋と、保存肉の貯蔵庫） */
const feedsNight = (stove: StoveSpec) =>
  stove.item === "smoked" || (isStore(stove) && stove.takes === "smoked");

/**
 * いま最優先で完成させる建築と、その完成に必要な上流工程を洗い出す。
 *
 * 直接「土器が6こ必要」と分かっていても、土器がまだ1こも無い場合は
 * 従来の建築優先だけでは何も起きない。窯へ粘土・薪を運ぶところまで
 * 建築の仕事として扱うことで、工程の途中で永久に止まらないようにする。
 */
const buildSupplyPlan = (state: ShopState) => {
  const jobs = new Set<string>();
  const kinds = new Set<ItemKind>();
  const visiting = new Set<ItemKind>();

  const builds = openStoves(state)
    .filter((stove) => isBuild(stove) && !isDone(state, stove.id))
    .sort((a, b) => {
      const aStarted = Object.values(state.parts[a.id] ?? {}).reduce((sum, n) => sum + n, 0) > 0;
      const bStarted = Object.values(state.parts[b.id] ?? {}).reduce((sum, n) => sum + n, 0) > 0;
      if (aStarted !== bStarted) return aStarted ? -1 : 1;
      return (a.reveal ?? 999) - (b.reveal ?? 999);
    });
  const site = builds[0] ?? null;

  const trace = (kind: ItemKind, depth = 0) => {
    if (depth > 6 || visiting.has(kind)) return;
    kinds.add(kind);
    visiting.add(kind);
    for (const maker of openStoves(state)) {
      if (isBuild(maker) || stoveItem(maker) !== kind) continue;
      const deps: ItemKind[] = [];
      if (maker.takes) deps.push(maker.takes);
      if (maker.fuel) deps.push(maker.fuel);
      for (const dep of Object.keys(maker.recipe ?? {})) deps.push(dep);
      for (const dep of deps) {
        jobs.add(`${dep}@${maker.id}`);
        trace(dep, depth + 1);
      }
    }
    visiting.delete(kind);
  };

  if (site?.needs) {
    for (const [kind, need] of Object.entries(site.needs ?? {})) {
      const got = state.parts[site.id]?.[kind] ?? 0;
      if (got >= need) continue;
      jobs.add(`${kind}@${site.id}`);
      trace(kind);
    }
  }

  return { site, jobs, kinds };
};

/** その仕事に、いま何人が向かっているか */
const claimCount = (state: ShopState, worker: Staff, id: string) =>
  state.staff.filter((other) => other.id !== worker.id && other.target === id)
    .length;

/** そのはこび手が、その品をあと何個持てるか（上限は品種ごとに別） */
const roomFor = (state: ShopState, worker: Staff, kind: ItemKind) =>
  carrierLimit(state, worker) - carryOf(worker, kind);

/** いま届けられる仕事（持っている品を、受け口か待っている仲間へ） */
const dropJobs = (state: ShopState, worker: Staff): HaulJob[] => {
  const jobs: HaulJob[] = [];
  for (const kind of carryKinds(worker)) {
    const have = carryOf(worker, kind);
    for (const stove of stationsWanting(state, kind)) {
      if (!inShop(worker, stove.area)) continue;
      const slot = stationAccepts(state, stove, kind);
      if (!slot) continue;
      const room = slotRoom(state, stove, kind, slot);
      const tag = slot === "build" ? "build" : isStore(stove) ? "store" : "work";
      /*
       * 加工場（皮なめし場など）の受け口が空だと、いつもは最優先で助ける。
       * ただし、その材料を建てかけの建物も欲しがっているなら話は別。
       * そうしないと、せっかく集めた毛皮が、建物にはまわらず
       * 加工場の空きを埋めるだけで消えていく（本当に建てたいほうが後回しになる）
       */
      const stalled =
        slotHave(state, stove, kind, slot) <= 0 &&
        !(tag === "work" && (state.fire.wants[kind] ?? 0) > 0);
      jobs.push({
        id: `${kind}@${stove.id}`,
        kind,
        at: stove.pos,
        drop: true,
        stalled,
        tag,
        night: feedsNight(stove),
        slots: Math.max(1, Math.ceil(room / carrierLimit(state, worker))),
        run: () => {
          const put = putSlot(state, stove, kind, slot, carryOf(worker, kind));
          if (put <= 0) return 0;
          takeFromBag(worker, kind, put);
          return put;
        },
      });
    }
    for (const customer of state.customers) {
      if (customer.state !== "waiting") continue;
      const seat = seatById.get(customer.seatId);
      if (!seat || seatMode(seat) === "shelf" || hasAuto(state, seat)) continue;
      if (seatNeeds(seat) !== kind || seatCost(seat) > have) continue;
      jobs.push({
        id: `${kind}@${seat.id}`,
        kind,
        at: seat.serve,
        drop: true,
        /*
         * 待たせている仲間は、ふつうは「止まっている先」として先に回る。
         * ただし、その品を建てかけの建物がまだ欲しがっているときは違う。
         * そうしないと、せっかく集めた毛皮などの希少な資材が、
         * 建築を素通りして交易の席へ売られてしまう（欲しがっている先が2つ
         * あるとき、建築のほうを優先する）
         */
        stalled: (state.fire.wants[kind] ?? 0) <= 0,
        tag: "serve",
        slots: 1,
        run: () => {
          const used = serve(state, worker.pos, kind, carryOf(worker, kind));
          if (used > 0) takeFromBag(worker, kind, used);
          return used;
        },
      });
    }
  }
  return jobs;
};

/**
 * いま拾える仕事。
 * 持っている品が届けられなくても、別の品種に空きがあれば拾いに行ける（§4.5）。
 * 拾うのは「行き先があって、そこに空きのある品」だけ。
 */
const pickJobs = (
  state: ShopState,
  worker: Staff,
  /** 持っている荷を、いまどこへも下ろせないか（そのときは品種の上限を外す） */
  stuck = false,
): HaulJob[] => {
  const jobs: HaulJob[] = [];
  for (const source of openStoves(state)) {
    if (!inShop(worker, source.area)) continue;
    const stock = state.ready[source.id] ?? 0;
    if (stock <= 0) continue;
    const kind = stoveItem(source);
    if (roomFor(state, worker, kind) <= 0) continue;
    if (!itemHasDemand(state, kind)) continue;
    /*
     * 品種を持ちすぎない。
     * 何種類でも拾えると、運び手は道々あるものを全部かかえこみ、
     * どの受け口も満杯で下ろせないまま突っ立ってしまう
     *（品種の多い「大河の文明」で実際に起きた）。
     * すでに持っている品はいくらでも足していい
     */
    if (
      !stuck &&
      carryOf(worker, kind) <= 0 &&
      carryKinds(worker).length >= KINDS_AT_ONCE
    ) {
      continue;
    }
    // その品を待って止まっている先があるか
    const wanting = stationsWanting(state, kind);
    const stalled =
      wanting.some((stove) => {
        const slot = stationAccepts(state, stove, kind);
        return !!slot && slotHave(state, stove, kind, slot) <= 0;
      }) ||
      state.customers.some((customer) => {
        if (customer.state !== "waiting") return false;
        const seat = seatById.get(customer.seatId);
        return !!seat && seatMode(seat) !== "shelf" && seatNeeds(seat) === kind;
      });
    jobs.push({
      id: `pick:${kind}@${source.id}`,
      kind,
      at: source.pos,
      drop: false,
      stalled,
      tag: "pick",
      forBuild: wanting.some((stove) => isBuild(stove)),
      forStore: wanting.some((stove) => isStore(stove)),
      night: wanting.some(feedsNight),
      slots: Math.max(1, Math.ceil(stock / carrierLimit(state, worker))),
      run: () => {
        let took = 0;
        // 下ろせるぶんだけ拾う（少なくとも1こは拾って、空振りにしない）
        let want = Math.max(1, demandFor(state, kind));
        while (
          want > 0 &&
          roomFor(state, worker, kind) > 0 &&
          (state.ready[source.id] ?? 0) > 0
        ) {
          state.ready[source.id] -= 1;
          addToBag(worker, kind, 1);
          took += 1;
          want -= 1;
        }
        return took;
      },
    });
  }
  return jobs;
};

/**
 * 工程のはこび手（人・犬ぞり）。
 *
 * 区間を決め打ちせず、いま動かせる仕事のうち
 *   1. 止まっている工程を助けるもの
 *   2. 届ける仕事
 *   3. 近いもの
 * の順で選ぶ。持っている品が届けられなくても、荷物は捨てずに
 * 別の品種を拾って、詰まった工程を回し直す。
 */
const updateHauler = (state: ShopState, worker: Staff, dt: number) => {
  const speed = carrierSpeed(state, worker);

  // 積み下ろしの間。1人では全区間を運びきれない重さは、ここから来る
  if (worker.charge > 0) {
    worker.charge -= dt;
    worker.settled = true;
    return;
  }

  // 下ろす先が1つもないなら「詰まっている」。そのときは拾う品種を選ばない
  const plan = buildSupplyPlan(state);
  const critical = (job: HaulJob) =>
    plan.jobs.has(job.id) || (job.tag === "pick" && plan.kinds.has(job.kind));
  const allowed = (job: HaulJob) =>
    jobAllowed(worker, job) || (worker.kind === "builder" && critical(job));

  const drops = dropJobs(state, worker).filter(allowed);
  const stuck = drops.length === 0 && carryTotal(worker) > 0;
  const all = [...dropJobs(state, worker), ...pickJobs(state, worker, stuck)];
  const open = (allow: (job: HaulJob) => boolean) =>
    all.filter((job) => allow(job) && claimCount(state, worker, job.id) < job.slots);

  let jobs = open(allowed);
  /*
   * 建築係は建てるのが持ち場だが、いま運べる材料が1つも無いときは
   * ふつうの運びも手伝う。そうしないと、建て終わったとたんに手を止め、
   * 運びかけの荷を持ったまま突っ立ってしまう（実際そうなった）。
   * 建てる仕事が出てくれば、そちらが強く優先されるので戻ってくる
   */
  if (jobs.length === 0 && worker.kind === "builder") jobs = open(() => true);

  if (jobs.length === 0) {
    worker.target = null;
    /*
     * 下ろす先がないのに荷を持っていると、そのまま突っ立ってしまう。
     * しばらく待っても仕事が出てこなければ、置き場へ返しに行く。
     * こうしないと、品種の多いステージで運び手が荷を抱えたまま止まる
     */
    worker.idleTime = (worker.idleTime ?? 0) + dt;
    const back =
      carryTotal(worker) > 0 && (worker.idleTime ?? 0) > 3
        ? putBack(state, worker)
        : null;
    if (back) {
      go(state, worker, back.pos, speed, dt);
      if (dist(worker.pos, back.pos) <= PICK_RADIUS) {
        const kind = stoveItem(back);
        const room = holdCap(state, back) - (state.ready[back.id] ?? 0);
        const give = Math.min(room, carryOf(worker, kind));
        if (give > 0) {
          state.ready[back.id] = (state.ready[back.id] ?? 0) + give;
          takeFromBag(worker, kind, give);
          worker.idleTime = 0;
        }
      }
      return;
    }
    /*
     * 置き場も空いていないときは、下ろす先のそばまで行って待つ。
     * 何もないところで荷を抱えて突っ立っていると、止まって見える
     */
    const wait = carryTotal(worker) > 0 ? waitNear(state, worker) : null;
    go(state, worker, wait ?? idleSpot(state, worker), speed * 0.4, dt);
    return;
  }
  worker.idleTime = 0;

  /*
   * どの仕事から回すか。
   *   1. 今夜のぶんが足りていない日は、保存肉づくりを何より先に
   *   2. 次に、建てかけの建物へ材料を入れる（貯蔵庫にため込むより先）
   *   3. あとは、止まっている工程 → 届ける仕事 → 近いもの
   */
  const short = nightShort(state);
  const score = (job: HaulJob) =>
    dist(worker.pos, job.at) -
    (job.stalled ? 260 : 0) -
    (job.drop ? 70 : 0) -
    (job.night && short ? 620 : 0) -
    (job.tag === "build" || (job.tag === "pick" && job.forBuild) ? 240 : 0) -
    (critical(job) ? 1200 : 0);

  // いま向かっている仕事を続けて、目移りしない
  const keep = jobs.find((job) => job.id === worker.target);
  const pick =
    keep ?? jobs.reduce((best, job) => (score(job) < score(best) ? job : best));

  worker.target = pick.id;
  const to = approach(state, worker, pick.at);
  if (worker.kind === "boat") sail(state, worker, to, speed, dt);
  else go(state, worker, to, speed, dt);
  const reach = pick.drop ? SERVE_RADIUS : PICK_RADIUS;
  if (dist(worker.pos, pick.at) <= reach && pick.run() > 0) {
    worker.target = null;
    // 犬ぞりと船は荷台にまとめて積めるので、積み下ろしが速い
    worker.charge =
      worker.kind === "robot" || worker.kind === "boat"
        ? HAUL_PAUSE * 0.4
        : HAUL_PAUSE;
  }
};

/** 開いている作る場所から、その種類のものを取り出す */
const takeStock = (state: ShopState, item: ItemKind, count: number) => {
  const from = openStoves(state).filter(
    (stove) => stoveItem(stove) === item && (state.ready[stove.id] ?? 0) > 0,
  );
  let left = count;
  for (const stove of from) {
    while (left > 0 && (state.ready[stove.id] ?? 0) > 0) {
      state.ready[stove.id] -= 1;
      left -= 1;
    }
    if (left === 0) break;
  }
  return count - left;
};

/** その種類の在庫が全部でいくつあるか */
const stockOf = (state: ShopState, item: ItemKind) =>
  openStoves(state).reduce(
    (sum, stove) => (stoveItem(stove) === item ? sum + (state.ready[stove.id] ?? 0) : sum),
    0,
  );

/** 自動供給機（自動券売機）。置いた場所は運ばなくても回る */
const updateAuto = (state: ShopState, dt: number) => {
  for (const seat of openSeats(state)) {
    if (!hasAuto(state, seat)) continue;
    const need = seatNeeds(seat);

    if (seatMode(seat) === "shelf") {
      // 棚は自動で補充される
      const room = SHELF_MAX - shelfStock(state, seat.id);
      if (room <= 0) continue;
      state.autoTimer[seat.id] = (state.autoTimer[seat.id] ?? 0) + dt;
      if (state.autoTimer[seat.id] < AUTO_TIME) continue;
      if (takeStock(state, need, 1) === 1) {
        state.autoTimer[seat.id] = 0;
        state.shelf[seat.id] = shelfStock(state, seat.id) + 1;
        pop(state, { x: seat.tray.x, y: seat.tray.y - 12 }, "自動補充");
      }
      continue;
    }

    const guest = state.customers.find(
      (customer) => customer.seatId === seat.id && customer.state === "waiting",
    );
    if (!guest) {
      state.autoTimer[seat.id] = 0;
      continue;
    }
    const cost = seatCost(seat);
    const stock = stockOf(state, need);
    const buildReserve = state.fire.wants[need] ?? 0;
    // 建築が同じ品を待っているあいだは、自動販売で最後の在庫を食べ切らない
    if (stock < cost || (buildReserve > 0 && stock - cost < buildReserve)) continue;
    state.autoTimer[seat.id] = (state.autoTimer[seat.id] ?? 0) + dt;
    if (state.autoTimer[seat.id] < AUTO_TIME) continue;
    state.autoTimer[seat.id] = 0;
    if (takeStock(state, need, cost) < cost) continue;
    guest.state = "eating";
    guest.timer = seatMode(seat) === "table" ? EAT_TIME * 1.6 : EAT_TIME;
    pop(state, { x: seat.tray.x, y: seat.tray.y - 12 }, "自動でどうぞ！");
    state.sfx.push("serve");
  }
};

const updateStaff = (state: ShopState, dt: number) => {
  for (const worker of state.staff) {
    // マンモスにはね飛ばされた人は、しばらく起き上がれない（死なない）
    if ((worker.down ?? 0) > 0) {
      worker.down = Math.max(0, (worker.down ?? 0) - dt);
      worker.settled = true;
      worker.moving = false;
      continue;
    }

    if (worker.kind === "cook") {
      go(state, worker, cookPost(worker), staffSpeed(state), dt);
      continue;
    }

    if (worker.kind === "butcher") {
      // 解体係: 倒れたマンモスへ行き、削って仮置き場へ出していく
      const beast = state.fire.beast;
      const post = worker.stoveId ? stoveById.get(worker.stoveId) : null;
      if (!beast || beast.state !== "down") {
        go(state, worker, post ? { x: post.pos.x, y: post.pos.y + 30 } : worker.home, staffSpeed(state) * 0.6, dt);
        worker.charge = 0;
        continue;
      }
      const stand = { x: beast.pos.x + (worker.id % 2 === 0 ? 34 : -34), y: beast.pos.y + 18 };
      if (go(state, worker, stand, staffSpeed(state), dt)) {
        worker.charge = 0.3; // 描画側が「刻んでいる」しるしに使う
        cutBeast(state, BUTCHER_RATE, dt);
      }
      continue;
    }

    if (worker.kind === "explorer") {
      // 先まわりして見つけてくる人。
      // 谷では追跡者としてマンモスを離れて追い、川では船着き場から探索に出る
      const beast = state.fire.beast;
      const valley = openStoves(state).find((stove) => stove.beast);
      if (beast && beast.state !== "down" && valley?.area === worker.area) {
        go(
          state,
          worker,
          {
            x: beast.pos.x - beast.face * 130,
            y: beast.pos.y - 60,
          },
          staffSpeed(state) * 0.95,
          dt,
        );
        worker.target = "beast";
        continue;
      }
      const dock = openStoves(state).find((stove) => stove.gives?.dock);
      const at = dock
        ? { x: dock.pos.x + ((worker.id % 3) - 1) * 22, y: dock.pos.y + 34 }
        : worker.home;
      go(state, worker, at, staffSpeed(state) * 0.7, dt);
      continue;
    }

    if (worker.kind === "hunter") {
      // 狩人: 担当の狩り場で、いちばん近い動物を追って狩る
      const ground = worker.stoveId ? stoveById.get(worker.stoveId) : null;
      if (ground?.beast) {
        // 谷の狩人は、群れでマンモスを追い込む（1人では倒れない）
        const beast = state.fire.beast;
        const speed = staffSpeed(state);
        if (!beast || beast.state === "down" || beast.state === "falling") {
          const zone = huntZone(state, ground);
          const t = state.playTime * 0.3 + worker.id;
          go(
            state,
            worker,
            {
              x: (zone.x0 + zone.x1) / 2 + Math.cos(t) * (zone.x1 - zone.x0) * 0.3,
              y: (zone.y0 + zone.y1) / 2 + Math.sin(t * 1.3) * (zone.y1 - zone.y0) * 0.3,
            },
            speed * 0.5,
            dt,
          );
          continue;
        }
        // 同じ場所に重ならないよう、まわりを取り囲む
        const mates = state.staff.filter(
          (item) => item.kind === "hunter" && item.stoveId === ground.id,
        );
        const slot = mates.indexOf(worker);
        const angle = (slot / Math.max(1, mates.length)) * Math.PI * 2;
        const reach = beast.stamina > 0 ? 62 : 40;
        go(
          state,
          worker,
          {
            x: beast.pos.x + Math.cos(angle) * reach,
            y: beast.pos.y + Math.sin(angle) * reach * 0.6,
          },
          speed * 1.05,
          dt,
        );
        worker.charge = dist(worker.pos, beast.pos) < 90 ? 0.3 : 0;
        continue;
      }
      const zone = ground ? huntZone(state, ground) : null;
      const speed = staffSpeed(state);
      const targets = worker.stoveId ? preyOf(state, worker.stoveId) : [];
      const animal = targets
        .slice()
        .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0];
      if (animal) {
        animal.flee = 0.4; // 追われると少し逃げる
        go(state, worker, animal.pos, speed * 1.1, dt);
        catchPrey(state, worker.pos);
      } else if (zone) {
        // 獲物がいなければ、狩り場のなかを見回る
        const t = state.playTime * 0.4 + worker.id;
        go(
          state,
          worker,
          {
            x: (zone.x0 + zone.x1) / 2 + Math.cos(t) * (zone.x1 - zone.x0) * 0.3,
            y: (zone.y0 + zone.y1) / 2 + Math.sin(t * 1.3) * (zone.y1 - zone.y0) * 0.3,
          },
          speed * 0.6,
          dt,
        );
      }
      continue;
    }

    if (worker.kind === "logger") {
      // 木こり: 担当の森で、いちばん近い立木を選んで切り倒す。
      // 丸太は森の出し口にたまる。そこから運ぶのは、はこび手かプレイヤー
      const wood = worker.stoveId ? stoveById.get(worker.stoveId) : null;
      const zone = wood ? huntZone(state, wood) : null;
      const speed = staffSpeed(state);
      const tree = liveTrees(state, worker.stoveId ?? undefined)
        .slice()
        .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0];
      if (tree) {
        worker.target = `tree-${tree.id}`;
        go(state, worker, { x: tree.pos.x - 16, y: tree.pos.y + 6 }, speed, dt);
        // 木のそばに着いたら、斧をふるって切り進む
        if (dist(worker.pos, tree.pos) <= CATCH_RADIUS) {
          worker.charge = 0.25; // 描画側が「切っている」しるしに使う
          chopTree(state, worker.pos, dt);
        }
      } else if (zone) {
        // 切れる木がない（切り株ばかり／出し口が満杯）ときは、森で待つ
        worker.target = null;
        worker.charge = Math.max(0, worker.charge - dt);
        const t = state.playTime * 0.3 + worker.id;
        go(
          state,
          worker,
          {
            x: (zone.x0 + zone.x1) / 2 + Math.cos(t) * (zone.x1 - zone.x0) * 0.28,
            y: (zone.y0 + zone.y1) / 2 + Math.sin(t * 1.3) * (zone.y1 - zone.y0) * 0.28,
          },
          speed * 0.5,
          dt,
        );
      }
      continue;
    }

    if (worker.kind === "splitter") {
      // 薪割り: 担当の薪割り場に立ち、丸太を薪へ割り続ける。
      // 材料も出し口も、進むかどうかは updateStoves が見ている
      const block = worker.stoveId ? stoveById.get(worker.stoveId) : null;
      const stand = block
        ? { x: block.pos.x - 24, y: block.pos.y + 6 }
        : worker.home;
      go(state, worker, stand, staffSpeed(state), dt);
      continue;
    }

    if (worker.kind === "master") {
      // 板前・園長は、作る場所のあいだをゆっくり見回る
      const posts = openStoves(state);
      if (posts.length === 0) {
        go(state, worker, worker.home, staffSpeed(state) * 0.5, dt);
        continue;
      }
      const post = posts[Math.floor(state.playTime / 6 + worker.id) % posts.length];
      if (
        go(
          state,
          worker,
          { x: post.pos.x, y: post.pos.y - 44 },
          staffSpeed(state) * 0.55,
          dt,
        )
      ) {
        worker.trips += dt;
      }
      continue;
    }

    if (worker.kind === "seller" || worker.kind === "gatekeeper") {
      // 入場券係・改札係: 持ち場に立って、並んだ人を1人ずつさばく
      if (worker.charge > 0) {
        worker.charge -= dt;
        continue;
      }
      const selling = worker.kind === "seller";
      const post = selling ? boothPos(state) : turnstilePos(state);
      // 同じ持ち場に2人いても重ならないように、少しずらして立つ
      const slot = state.staff
        .filter((item) => item.kind === worker.kind)
        .indexOf(worker);
      const stand = { x: post.x + (slot % 2 === 0 ? -16 : 16), y: post.y - 14 };
      const there = go(state, worker, stand, staffSpeed(state), dt);
      if (!there) continue;
      const guest = (selling ? atBooth(state) : atGate(state))[0];
      if (!guest) continue;
      if (selling) sellTicket(state, guest);
      else letIn(state, guest);
      // 1人さばくたびに手間がかかる。機械のように同時にはさばけない
      worker.charge = AUTO_TIME * (selling ? 0.8 : 0.65);
      worker.trips += 1;
      continue;
    }

    if (worker.kind === "collector") {
      // 集金係は高いお金から拾う。急ぐので少し速い
      let best: Coin | null = null;
      let bestScore = -Infinity;
      for (const coin of state.coins) {
        const score = coin.value * 3 - dist(worker.pos, coin.pos);
        if (score > bestScore) {
          best = coin;
          bestScore = score;
        }
      }
      if (!best) {
        // 手が空いたら、担当エリアのなかを見回る
        const zone = areaById.get(`area-${worker.area}`)?.rect;
        const box = zone ?? worldBounds(state);
        const t = state.playTime * 0.35 + worker.id;
        go(
          state,
          worker,
          {
            x: (box.x0 + box.x1) / 2 + Math.cos(t) * (box.x1 - box.x0) * 0.3,
            y:
              (box.y0 + Math.min(box.y1, outsideTop(state))) / 2 +
              Math.sin(t * 1.3) * (box.y1 - box.y0) * 0.26,
          },
          staffSpeed(state) * 0.8,
          dt,
        );
        continue;
      }
      if (go(state, worker, best.pos, staffSpeed(state) * 1.15, dt)) {
        collectCoin(state, best);
        state.coins = state.coins.filter((item) => item.id !== -1);
      }
      continue;
    }

    if (worker.kind === "busser") {
      // 片づけ係: 拭いている最中は動かない
      if (worker.charge > 0) {
        worker.charge -= dt;
        continue;
      }
      // 皿が残ったのが古いテーブルから片づける
      const table = openSeats(state)
        .filter(
          (seat) =>
            seatMode(seat) === "table" &&
            isDirty(state, seat.id) &&
            !claimedByOther(state, worker, seat.id),
        )
        .sort((a, b) => {
          const side =
            (a.area === worker.area ? 0 : 1) - (b.area === worker.area ? 0 : 1);
          if (side !== 0) return side;
          return (state.dirty[a.id] ?? 0) - (state.dirty[b.id] ?? 0);
        })[0];
      if (!table) {
        const home = openSeats(state).find((seat) => seatMode(seat) === "table");
        go(
          state,
          worker,
          home ? { x: home.serve.x, y: home.serve.y - 40 } : { x: 180, y: 250 },
          staffSpeed(state) * 0.6,
          dt,
        );
        continue;
      }
      worker.target = table.id;
      go(
        state,
        worker,
        approach(state, worker, table.serve),
        staffSpeed(state) * 0.9,
        dt,
      );
      if (clearTable(state, worker.pos)) {
        worker.charge = 0.8;
        worker.target = null;
      }
      continue;
    }

    if (worker.kind === "stocker") {
      // 品出し係: 倉庫から商品を運んで棚に並べる
      const speed = staffSpeed(state);
      const limit = carrierLimit(state, worker);
      // いちばん減っている棚から埋める
      const shelfNeed = openSeats(state)
        .filter(
          (seat) =>
            seatMode(seat) === "shelf" &&
            shelfStock(state, seat.id) < SHELF_MAX &&
            !claimedByOther(state, worker, seat.id),
        )
        .sort((a, b) => {
          const side =
            (a.area === worker.area ? 0 : 1) - (b.area === worker.area ? 0 : 1);
          if (side !== 0) return side;
          return shelfStock(state, a.id) - shelfStock(state, b.id);
        })[0];

      if (carryTotal(worker) > 0) {
        if (!shelfNeed) {
          go(state, worker, { x: worker.pos.x, y: worker.pos.y }, speed, dt);
          continue;
        }
        worker.target = shelfNeed.id;
        go(state, worker, approach(state, worker, shelfNeed.tray), speed, dt);
        if (restock(state, worker.pos)) {
          takeFromBag(worker, "goods", 1);
          worker.target = null;
        }
        continue;
      }

      const store = openStoves(state)
        .filter(
          (item) => stoveItem(item) === "goods" && (state.ready[item.id] ?? 0) > 0,
        )
        .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0];
      if (!store || !shelfNeed) {
        const home = openStoves(state).find((item) => stoveItem(item) === "goods");
        go(
          state,
          worker,
          home ? { x: home.pos.x, y: home.pos.y + 46 } : { x: 180, y: 250 },
          speed * 0.6,
          dt,
        );
        continue;
      }
      go(state, worker, approach(state, worker, store.pos), speed, dt);
      while (carryOf(worker, "goods") < limit) {
        const item = pickUp(state, worker.pos, limit, "goods", worker.bag);
        if (!item) break;
        addToBag(worker, item, 1);
      }
      continue;
    }

    // 工程のあるステージでは、はこび手は「作業場から作業場へ」も運ぶ。
    // 建築係・食料番・夜番は、同じ運びかたで持ち場だけが違う
    if (
      worker.kind === "runner" ||
      (currentStage.haulers &&
        isChainStage() &&
        (worker.kind === "waiter" ||
          worker.kind === "robot" ||
          worker.kind === "boat" ||
          worker.kind === "builder" ||
          worker.kind === "keeper" ||
          worker.kind === "nightman"))
    ) {
      updateHauler(state, worker, dt);
      continue;
    }

    // ホール店員・配膳ロボ・料理係: 自分が扱えるものだけを運ぶ
    const speed = carrierSpeed(state, worker);
    const mine = handledItem(worker);
    for (const kind of carryKinds(worker)) {
      // 担当外のものは持たない（古いセーブから来たときの保険）
      if (kind !== mine) takeFromBag(worker, kind, carryOf(worker, kind));
    }

    const limit = carrierLimit(state, worker);
    const carry = carryOf(worker, mine);

    if (carry > 0) {
      // いま持っている数で足りる相手をさがす。
      // ホール店員は近い席から、配膳ロボは遠い席から回る（担当が分かれる）
      const reachable = state.customers
        .filter((customer) => {
          if (customer.state !== "waiting") return false;
          const item = seatById.get(customer.seatId);
          return (
            !!item &&
            seatMode(item) !== "shelf" &&
            inShop(worker, item.area) &&
            // 自動供給機が付いている場所は機械にまかせる
            !hasAuto(state, item) &&
            seatNeeds(item) === mine &&
            seatCost(item) <= carry &&
            // ほかのスタッフが向かっている席は狙わない
            !claimedByOther(state, worker, customer.seatId)
          );
        })
        .map((customer) => ({
          customer,
          seat: seatById.get(customer.seatId)!,
        }))
        .sort((a, b) => {
          // ロボは待っている順（最初の挙動）
          if (worker.kind === "robot") return a.customer.id - b.customer.id;
          // 人は担当エリアを優先して、そのなかで近い順
          const side =
            (a.seat.area === worker.area ? 0 : 1) -
            (b.seat.area === worker.area ? 0 : 1);
          if (side !== 0) return side;
          return dist(worker.pos, a.seat.serve) - dist(worker.pos, b.seat.serve);
        });
      // いま担当している席を優先して、目移りしないようにする
      const keep = reachable.find((item) => item.seat.id === worker.target);
      let picked = keep ?? null;

      // 待っている人がいるときだけ、くじを引く。
      // 1〜5番目のどれかを狙い、その順番に相手がいなければ少し待って引き直す
      if (!picked && reachable.length > 0) {
        if (worker.wait > 0) {
          worker.wait -= dt;
          go(state, worker, idleSpot(state, worker), speed * 0.4, dt);
          continue;
        }
        const rank = Math.floor(Math.random() * ROBOT_PICKS);
        if (rank < reachable.length) {
          picked = reachable[rank];
        } else {
          worker.wait = ROBOT_WAIT;
          go(state, worker, idleSpot(state, worker), speed * 0.4, dt);
          continue;
        }
      }
      const seat = picked?.seat ?? null;

      if (seat) {
        worker.target = seat.id;
        go(state, worker, approach(state, worker, seat.serve), speed, dt);
        // 届く距離に入っていれば渡す（到着ぴったりを待たない）
        const used = serve(state, worker.pos, mine, carry);
        if (used > 0) {
          takeFromBag(worker, mine, used);
          worker.target = null;
          worker.wait = 0;
        }
        continue;
      }
      worker.target = null;

      // 足りないときは、必要な枚数までだけ受け取りに行く
      let maxNeed = 0;
      for (const customer of state.customers) {
        if (customer.state !== "waiting") continue;
        const item = seatById.get(customer.seatId);
        if (!item || seatMode(item) === "shelf" || hasAuto(state, item)) continue;
        if (!inShop(worker, item.area)) continue;
        if (seatNeeds(item) !== mine) continue;
        maxNeed = Math.max(maxNeed, seatCost(item));
      }
      const fill = Math.min(limit, maxNeed);
      const more =
        carry < fill
          ? openStoves(state)
              .filter(
                (item) =>
                  stoveItem(item) === mine &&
                  inShop(worker, item.area) &&
                  (state.ready[item.id] ?? 0) > 0,
              )
              .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0]
          : null;
      if (more) {
        go(state, worker, approach(state, worker, more.pos), speed, dt);
        while (carryOf(worker, mine) < fill) {
          const item = pickUp(state, worker.pos, fill, mine, worker.bag);
          if (!item) break;
          addToBag(worker, item, 1);
        }
        continue;
      }

      // 出す相手がいないときは、作る場所に返しに行く（抱えたまま止まらない）
      // 出す相手がいないあいだは、持ったまま持ち場で待つ
      worker.target = null;
      go(state, worker, idleSpot(state, worker), speed * 0.5, dt);
      continue;
    }

    // 手ぶら: 近くに皿が残っていたら片づけてから、待っている人の分を取りに行く
    const dirtyTable = openSeats(state)
      .filter((seat) => seatMode(seat) === "table" && isDirty(state, seat.id))
      .sort((a, b) => dist(worker.pos, a.serve) - dist(worker.pos, b.serve))[0];

    const wanted = new Set<ItemKind>();
    // 種類ごとに「いま必要な数」を数える（余分に持って止まらないように）
    const demand = new Map<ItemKind, number>();
    for (const customer of state.customers) {
      if (customer.state !== "waiting") continue;
      const seat = seatById.get(customer.seatId);
      if (!seat || seatMode(seat) === "shelf" || hasAuto(state, seat)) continue;
      const kind = seatNeeds(seat);
      // 自分が扱えるものだけを数える
      if (kind !== mine) continue;
      wanted.add(kind);
      demand.set(kind, (demand.get(kind) ?? 0) + seatCost(seat));
    }

    const usable = openStoves(state).filter(
      (item) => (state.ready[item.id] ?? 0) > 0 && stoveItem(item) === mine,
    );
    // ロボは在庫の多い場所へまとめて取りに行き、店員は近い場所から取る
    // 待っている人が必要とする数までしか取らない（余らせない）
    const buffer = Math.min(limit, demand.get(mine) ?? 0);
    if (buffer <= 0 || carry >= buffer) {
      go(state, worker, idleSpot(state, worker), speed * 0.5, dt);
      continue;
    }

    const stove = usable.sort((a, b) => {
      if (worker.kind !== "robot") {
        const side =
          (a.area === worker.area ? 0 : 1) - (b.area === worker.area ? 0 : 1);
        if (side !== 0) return side;
      }
      return dist(worker.pos, a.pos) - dist(worker.pos, b.pos);
    })[0];

    if (!stove) {
      if (dirtyTable && go(state, worker, dirtyTable.serve, speed, dt)) {
        clearTable(state, worker.pos);
        continue;
      }
      if (!dirtyTable) {
        worker.target = null;
        go(state, worker, idleSpot(state, worker), speed * 0.6, dt);
      }
      continue;
    }
    go(state, worker, approach(state, worker, stove.pos), speed, dt);
    while (carryOf(worker, mine) < buffer) {
      const item = pickUp(state, worker.pos, buffer, mine, worker.bag);
      if (!item) break;
      addToBag(worker, item, 1);
    }
  }
};

export const update = (state: ShopState, input: Input, dt: number) => {
  state.playTime += dt;
  // 昼夜・天気・住民・谷・探索は、ほかの何より先に決める
  updateFire(state, dt, coinValue(state.levels.price));
  updateTaiga(state, dt);
  updateStoves(state, dt);
  updateHunt(state, dt);
  updateForest(state, dt);
  spawnCustomers(state, dt);
  updateCustomers(state, dt);
  updatePlayer(state, input, dt);
  updateAuto(state, dt);
  updateStaff(state, dt);
  spread(state, dt);
  updateReveals(state, dt);
  updatePads(state, dt);
  for (const coin of state.coins) coin.age += dt;
  for (const item of state.pops) item.age += dt;
  state.pops = state.pops.filter((item) => item.age < 1);
};

/* ---------- 案内 ---------- */

export type Objective = {
  kind: "pickup" | "serve" | "coin" | "wait";
  pos: Vec | null;
  label: string;
};

/**
 * 火のはじまりの案内。
 *
 * その時点で必要な作業を1つだけ出す。
 * 1食目は「狩る → 置く → 渡す」だけ（まきは最初からくべてある）。
 * 1食出したら森と丸太を、2食目で薪割りを、3食目から二材料そろえる流れを教える。
 */
const chainObjective = (state: ShopState): Objective | null => {
  const player = state.player;
  const fires = openStoves(state).filter(
    (stove) => isStation(stove) && stove.fuel,
  );
  if (fires.length === 0) return null;

  // 集落ができてからは、その日その時間にいちばん大事なことを先に出す
  if (fireLive(state)) {
    const fire = state.fire;
    const beast = fire.beast;
    if (beast?.state === "down") {
      return {
        kind: "serve",
        pos: beast.pos,
        label: beast.stuck
          ? "仮置き場が満杯だ。運び出さないと解体が進まない"
          : "倒れたマンモスを解体しよう",
      };
    }
    if (beast && beast.state !== "falling") {
      const hunters = state.staff.filter(
        (worker) => worker.kind === "hunter" && worker.stoveId,
      ).length;
      if (hunters + 1 >= 3) {
        return {
          kind: "serve",
          pos: beast.pos,
          label:
            beast.stamina > 0
              ? "みんなでマンモスを追い立てよう"
              : "疲れている。いまなら仕留められる",
        };
      }
      return {
        kind: "wait",
        pos: beast.pos,
        label: "3人そろわないとマンモスには挑めない",
      };
    }
    if (fire.phase === "dusk") {
      const need = nightNeed(state);
      const have = stockIn(state, "smoked");
      if (need > 0 && have < need) {
        const smoker = openStoves(state)
          .filter((stove) => stove.takes === "roast")
          .sort((a, b) => dist(player.pos, a.pos) - dist(player.pos, b.pos))[0];
        return {
          kind: "serve",
          pos: smoker?.pos ?? null,
          label: `日暮れまであと${Math.ceil(phaseLeft(fire))}秒 ― 保存肉 ${have}/${need}`,
        };
      }
    }
    if (fire.phase === "night") {
      return {
        kind: "wait",
        pos: null,
        label:
          fire.shortfall > 0
            ? `保存肉が${fire.shortfall}こ足りなかった。明日は燻製を増やそう`
            : `${fire.day}日目の夜 ― 広場で朝を待とう`,
      };
    }
  }

  const near = <T,>(list: T[], at: (item: T) => Vec): T | null =>
    list.length === 0
      ? null
      : list.reduce((best, item) =>
          dist(player.pos, at(item)) < dist(player.pos, at(best)) ? item : best,
        );

  // 建てかけの建物があるなら、通常の配膳より「何が足りないか」を先に案内する。
  // 自動運搬が詰まったときも、画面下の目的が無関係な仕事を指し続けないため。
  const buildPlan = buildSupplyPlan(state);
  if (buildPlan.site?.needs) {
    const site = buildPlan.site;
    for (const [kind, need] of Object.entries(site.needs ?? {})) {
      const got = state.parts[site.id]?.[kind] ?? 0;
      if (got >= need) continue;
      if (carryOf(player, kind) > 0) {
        return {
          kind: "serve",
          pos: site.pos,
          label: `${itemLabel(kind)}を${site.label ?? "建築予定地"}へ届けよう（${got}/${need}）`,
        };
      }
      const source = near(
        openStoves(state).filter(
          (stove) => !isBuild(stove) && stoveItem(stove) === kind && (state.ready[stove.id] ?? 0) > 0,
        ),
        (stove) => stove.pos,
      );
      if (source) {
        return {
          kind: "pickup",
          pos: source.pos,
          label: `${source.label ?? "出し口"}の${itemLabel(kind)}を${site.label ?? "建築予定地"}へ運ぼう`,
        };
      }
      const maker = near(
        openStoves(state).filter((stove) => !isBuild(stove) && stoveItem(stove) === kind),
        (stove) => stove.pos,
      );
      if (maker) {
        return {
          kind: "wait",
          pos: maker.pos,
          label: `${site.label ?? "建築"}は${itemLabel(kind)}待ち ― ${maker.label ?? "作業場"}の供給を優先中`,
        };
      }
    }
  }

  // 森と薪の話は、1食出してから始める（一度に全部教えない）
  const teachWood = state.served >= 1;

  /**
   * いま立っている場所で、まだ積めるものがあるか。
   * せっかく出し口まで来たなら、上限まで積んでから運ぶ（往復を減らす）。
   * 狩人や木こりを雇うと出し口がたまるので、この積み込みが効いてくる
   */
  const loadingHere = openStoves(state).some(
    (stove) =>
      (state.ready[stove.id] ?? 0) > 0 &&
      carryOf(player, stoveItem(stove)) > 0 &&
      carryOf(player, stoveItem(stove)) < maxCarry(state) &&
      dist(player.pos, stove.pos) <= PICK_RADIUS,
  );

  /* 1. 持っているものに行き先があるなら、まずそれを届ける */
  if (!loadingHere) {
    for (const kind of carryKinds(player)) {
      const seat = near(
        openSeats(state).filter(
          (item) =>
            seatNeeds(item) === kind &&
            seatCost(item) <= carryOf(player, kind) &&
            state.customers.some(
              (c) => c.seatId === item.id && c.state === "waiting",
            ),
        ),
        (item) => item.tray,
      );
      if (seat) {
        return {
          kind: "serve",
          pos: seat.tray,
          label: `${itemLabel(kind)}を、待っている${stageLabels().guest}へ渡そう`,
        };
      }
      const station = near(stationsWanting(state, kind), (item) => item.pos);
      if (station) {
        const slot = stationAccepts(state, station, kind);
        return {
          kind: "serve",
          pos: station.pos,
          label:
            slot === "fuel"
              // 第2の材料はステージで違う（薪をくべる／畑に種をまく）
              ? `${station.label ?? "たき火"}に${itemLabel(kind)}を入れよう`
              : `${itemLabel(kind)}を${station.label ?? "作業場"}へ置こう`,
        };
      }
    }
  }

  /* 2. 焼けたものが出し口にあるなら、受け取りに行く */
  const done = near(
    openStoves(state).filter(
      (stove) =>
        (state.ready[stove.id] ?? 0) > 0 &&
        openSeats(state).some((seat) => seatNeeds(seat) === stoveItem(stove)) &&
        carryOf(player, stoveItem(stove)) < maxCarry(state) &&
        state.customers.some((c) => c.state === "waiting"),
    ),
    (stove) => stove.pos,
  );
  if (done) {
    return {
      kind: "pickup",
      pos: done.pos,
      // 「焼けた」はたき火の言葉。できあがったものの名前だけで言う
      label: `${done.label ?? "出し口"}の${itemLabel(stoveItem(done))}を受け取ろう`,
    };
  }

  /* 3. 貝がらが落ちていたら拾う（拾い手を雇うまでは自分の仕事） */
  if (state.coins.length > 0 && !hasStaff(state, "collector")) {
    const coin = near(state.coins, (item) => item.pos);
    if (coin) {
      return { kind: "coin", pos: coin.pos, label: stageLabels().objective.coin };
    }
  }

  /**
   * その品が足りていない受け口を助ける道すじ。
   * 出し口 → 受け口 の順に、いま自分ができることをひとつ返す
   */
  const supply = (
    fire: StoveSpec,
    kind: ItemKind,
    fuelSide: boolean,
    depth = 0,
  ): Objective | null => {
    if (depth > 4) return null;
    const have = fuelSide ? fuelAt(state, fire.id) : heldAt(state, fire.id);
    // 空になってから走り出すと間に合わないので、少し貯めておく分まで運ぶ
    if (have >= 2) return null;
    const source = near(
      openStoves(state).filter(
        (stove) => stoveItem(stove) === kind && (state.ready[stove.id] ?? 0) > 0,
      ),
      (stove) => stove.pos,
    );
    if (source) {
      return {
        kind: "pickup" as const,
        pos: source.pos,
        label: `${source.label ?? "出し口"}の${itemLabel(kind)}を、${
          fire.label ?? "たき火"
        }へ運ぼう`,
      };
    }
    // 出し口も空: もとを作りに行く
    const maker = openStoves(state).filter((stove) => stoveItem(stove) === kind);
    // 待つしかないときも、どこで待つのかは指しておく（案内が途切れないように）
    let waitAt: Objective | null = null;
    for (const stove of maker) {
      if (isHunt(stove)) {
        const animal = near(
          state.prey.filter((item) => item.stoveId === stove.id),
          (item) => item.pos,
        );
        if (animal) {
          return {
            kind: "pickup" as const,
            pos: animal.pos,
            label: "草原で動物を追いかけて狩ろう",
          };
        }
        waitAt ??= {
          kind: "wait" as const,
          pos: stove.pos,
          label: "草原で動物があらわれるのを待とう",
        };
        continue;
      }
      if (isForest(stove)) {
        const tree = near(liveTrees(state, stove.id), (item) => item.pos);
        if (tree) {
          return {
            kind: "pickup" as const,
            pos: tree.pos,
            label: "森で木を切って、丸太にしよう",
          };
        }
        waitAt ??= {
          kind: "wait" as const,
          pos: stove.pos,
          label: "切り株が生えなおすのを待とう",
        };
        continue;
      }
      /*
       * 素材の作業場（水くみ場・種置き場・粘土穴・牧草地・川の瀬）。
       * 狩り場と森だけが特別で、それ以外の採取場には案内が出ていなかった。
       * できるのを待つあいだも、どこで待つのかは必ず指しておく。
       */
      if (!isStation(stove)) {
        waitAt ??= {
          kind: "wait" as const,
          pos: stove.pos,
          label: stove.manual
            ? `${stove.label ?? "作業場"}に立つと、${itemLabel(stoveItem(stove))}がたまる`
            : `${stove.label ?? "作業場"}で${itemLabel(stoveItem(stove))}ができるのを待とう`,
        };
        continue;
      }
      // 加工の作業場（薪割り場）
      if (isStation(stove)) {
        if (heldAt(state, stove.id) > 0) {
          return {
            kind: "serve" as const,
            pos: stove.pos,
            label: stove.manual
              // 人の手が要る作業場（薪割り場・石臼）。作るものはステージで違う
              ? `${stove.label ?? "作業場"}に立って、${itemLabel(stoveItem(stove))}にしよう`
              : `${stove.label ?? "作業場"}でできるのを待とう`,
          };
        }
        const upstream = supply(stove, stove.takes ?? "", false, depth + 1);
        if (upstream) return upstream;
      }
    }
    return waitAt;
  };

  /* 4. たき火の材料をそろえる。生肉が先、薪はそのあと（教える順） */
  const fire = near(fires, (stove) => stove.pos) as StoveSpec;
  const meatStep = supply(fire, fire.takes ?? "meat", false);
  if (meatStep) return meatStep;
  if (teachWood && fire.fuel) {
    const woodStep = supply(fire, fire.fuel, true);
    if (woodStep) return woodStep;
  }

  /* 5. あとは焼けるのを待つ */
  if (state.customers.some((c) => c.state === "waiting")) {
    return { kind: "wait", pos: null, label: stageLabels().objective.waitItem };
  }
  return { kind: "wait", pos: null, label: stageLabels().objective.waitGuest };
};

export const currentObjective = (state: ShopState): Objective => {
  const waiting = state.customers.filter((c) => c.state === "waiting");
  const player = state.player;

  // 工程のあるステージは、いま必要な一手だけを出す
  if (isChainStage()) {
    const step = chainObjective(state);
    if (step) return step;
  }

  // 入口の仕事が先（係を雇うか機械を入れるまでは自分でやる）
  if (hasGate()) {
    if (!sellsTickets(state) && atBooth(state).length > 0) {
      return {
        kind: "serve",
        pos: boothPos(state),
        label: `入場券を売ろう（${atBooth(state).length}人 待ち）`,
      };
    }
    if (!opensGate(state) && atGate(state).length > 0) {
      return {
        kind: "serve",
        pos: turnstilePos(state),
        label: `改札を通そう（${atGate(state).length}人 待ち）`,
      };
    }
  }

  const total = carryTotal(player);
  // 商品を持っているときは、空いている棚へ
  if (carryOf(player, "goods") > 0) {
    const shelf = openSeats(state)
      .filter(
        (seat) => seatMode(seat) === "shelf" && shelfStock(state, seat.id) < SHELF_MAX,
      )
      .sort((a, b) => dist(player.pos, a.tray) - dist(player.pos, b.tray))[0];
    if (shelf) {
      return { kind: "serve", pos: shelf.tray, label: "棚に商品を並べよう" };
    }
  }

  if (total > 0 && waiting.length > 0) {
    const seat = waiting
      .map((customer) => seatById.get(customer.seatId))
      .find(
        (item): item is SeatSpec =>
          !!item && seatMode(item) !== "shelf" && carryOf(player, seatNeeds(item)) > 0,
      );
    if (seat) {
      const need = seatCost(seat);
      if (need > carryOf(player, seatNeeds(seat))) {
        return {
          kind: "pickup",
          pos: null,
          label: `${seat.label}には ${need}つ必要（いま ${carryOf(player, seatNeeds(seat))}）`,
        };
      }
      return {
        kind: "serve",
        pos: trayPos(seat),
        label:
          seatMode(seat) === "table"
            ? "テーブルまで料理を運ぼう"
            : need > 1
              ? `${seat.label}へ ${need}つまとめて運ぼう`
              : stageLabels().objective.serve,
      };
    }
  }

  // 狩り場に動物がいて、まだ肉が足りていなければ、狩りに行く
  if (total < maxCarry(state) && state.prey.length > 0) {
    const grounds = openStoves(state).filter(
      (stove) => isHunt(stove) && !hasStaff(state, "hunter"),
    );
    const short = grounds.some((stove) => (state.ready[stove.id] ?? 0) <= 0);
    if (short) {
      const animal = state.prey
        .slice()
        .sort((a, b) => dist(player.pos, a.pos) - dist(player.pos, b.pos))[0];
      if (animal) {
        return { kind: "pickup", pos: animal.pos, label: "動物を追いかけて狩ろう" };
      }
    }
  }

  // 手ぶらのときは、皿の残ったテーブルを片づける
  if (total === 0) {
    const table = openSeats(state)
      .filter((seat) => seatMode(seat) === "table" && isDirty(state, seat.id))
      .sort((a, b) => dist(player.pos, a.serve) - dist(player.pos, b.serve))[0];
    if (table) {
      return { kind: "serve", pos: table.tray, label: "テーブルの皿を片づけよう" };
    }
  }

  // 空いている棚があれば、倉庫から商品を取りに行く
  if (total === 0) {
    const shelf = openSeats(state).find(
      (seat) => seatMode(seat) === "shelf" && shelfStock(state, seat.id) < SHELF_MAX,
    );
    if (shelf) {
      const store = openStoves(state)
        .filter(
          (item) => stoveItem(item) === "goods" && (state.ready[item.id] ?? 0) > 0,
        )
        .sort((a, b) => dist(player.pos, a.pos) - dist(player.pos, b.pos))[0];
      if (store) {
        return { kind: "pickup", pos: store.pos, label: "倉庫で商品を受け取ろう" };
      }
    }
  }

  if (total < maxCarry(state)) {
    const stove = openStoves(state)
      .filter((item) => (state.ready[item.id] ?? 0) > 0)
      .sort((a, b) => dist(player.pos, a.pos) - dist(player.pos, b.pos))[0];
    if (stove) {
      return {
        kind: "pickup",
        pos: stove.pos,
        label:
          stoveItem(stove) === "food"
            ? "厨房で料理を受け取ろう"
            : stoveItem(stove) === "goods"
              ? "倉庫で商品を受け取ろう"
              : stageLabels().objective.pickup,
      };
    }
  }

  if (state.coins.length > 0) {
    return {
      kind: "coin",
      pos: state.coins[0].pos,
      label: stageLabels().objective.coin,
    };
  }

  if (waiting.length > 0) {
    return { kind: "wait", pos: null, label: stageLabels().objective.waitItem };
  }
  return { kind: "wait", pos: null, label: stageLabels().objective.waitGuest };
};

/* ---------- 放置収入 ---------- */

export type OfflineReport = { seconds: number; earned: number };

export const applyOffline = (
  state: ShopState,
  now: number,
): OfflineReport | null => {
  const elapsed = (now - state.lastSeen) / 1000;
  state.lastSeen = now;
  if (!Number.isFinite(elapsed) || elapsed < 60) return null;

  const carriers = state.staff.filter(
    (item) => item.kind === "waiter" || item.kind === "robot",
  );
  if (carriers.length === 0) return null;

  const capped = Math.min(elapsed, OFFLINE_CAP_HOURS * 3600);
  const factor = cookSpeedFactor(state);

  const staffed = (kind: StaffKind, stoveId: string) =>
    state.staff.some((w) => w.kind === kind && w.stoveId === stoveId);
  // 席が受け取る品を作れる作業場だけを数える（工程の途中は稼ぎに直結しない）
  const wanted = new Set(openSeats(state).map((seat) => seatNeeds(seat)));
  const cookRate = openStoves(state).reduce((sum, stove) => {
    if (wanted.size > 0 && !wanted.has(stoveItem(stove))) return sum;
    // 貯蔵庫・仮置き場・建築予定地・谷は、それ自体は何も作らない
    if (isStore(stove) || isPile(stove) || isBuild(stove) || stove.beast) return sum;
    // 草原と森は、狩人・木こりがいるあいだだけ実る（留守は本人が動けない）
    if (isHunt(stove)) {
      return sum + (staffed("hunter", stove.id) ? 1 / HUNT_SPAWN : 0);
    }
    if (isForest(stove)) {
      return sum + (staffed("logger", stove.id) ? 1 / (CHOP_TIME + 1.2) : 0);
    }
    // 人の手が要る作業場は、担当者を雇っていないと留守のあいだ止まる
    if (stove.manual && !stoveHasCook(state, stove.id)) return sum;
    const speed = stoveHasCook(state, stove.id) ? cookBoost() : 1;
    return sum + speed / (cookTime() * (stove.work ?? 1) * factor);
  }, 0);
  const open = openSeats(state);
  const seatRate = open.length / (EAT_TIME + 2.2);
  const carryRate = carriers.reduce(
    (sum, worker) => sum + (worker.kind === "robot" ? 0.95 : 0.55),
    0,
  );
  // レストランやお土産は単価が高いので、平均の倍率で見積もる
  const worth =
    open.reduce((sum, seat) => sum + (seat.value ?? 1), 0) /
    Math.max(1, open.length);
  // 入場券は 1人につき1回。1人が何か所まわるかで割って、1回ぶんに直す。
  // 留守のあいだ入口に立てるのは、係か機械がいるときだけ
  const variety = Math.min(9, Math.floor(open.length * 0.8));
  const manned = sellsTickets(state) && opensGate(state);
  const gate = manned ? admissionValue(state) / (1 + variety / 2) : 0;
  const perSecond = Math.min(cookRate, seatRate, carryRate);
  const earned = Math.floor(
    perSecond * capped * (coinValue(state.levels.price) * worth + gate) * 0.75,
  );
  if (earned <= 0) return null;

  state.money += earned;
  state.playTime += capped;
  return { seconds: capped, earned };
};

/* ---------- 長押しで見る説明 ---------- */

export type Inspect = { title: string; lines: string[]; pos: Vec };

const yen = (value: number) =>
  value < 10000
    ? `${Math.round(value).toLocaleString("ja-JP")}円`
    : `${Math.round(value).toLocaleString("ja-JP")}円`;

const padInspect = (state: ShopState, pad: Pad): Inspect => {
  const at = padPosOf(state, pad);
  const price = padPrice(state, pad);
  const paid = state.padProgress[pad.id] ?? 0;
  const lines: string[] = [];

  if (pad.kind === "upgrade" && pad.upgradeId) {
    const upgrade = upgradeById.get(pad.upgradeId);
    const level = state.levels[pad.upgradeId];
    if (upgrade) {
      lines.push(`いま: ${upgrade.detail(level)}`);
      if (level + 1 <= upgrade.max) {
        lines.push(`次に: ${upgrade.detail(level + 1)}`);
      }
    }
  } else {
    lines.push(pad.sub);
    const hire = hireById.get(pad.id);
    const chain = isChainStage();
    if (hire?.kind === "waiter") {
      lines.push(
        chain
          ? "区間は決まっていない。詰まったところから助ける"
          : "雇うと、閉じているあいだも稼いでくれる",
      );
      if (chain) lines.push("1人では全部は運びきれない（足りなければもう1人）");
    }
    if (hire?.kind === "robot") {
      lines.push(chain ? "犬が引く荷台。速く、たくさん積める" : "店員より速く、5杯以上まとめて運ぶ");
    }
    if (hire?.kind === "cook") {
      lines.push(
        `${(cookTime() / cookBoost()).toFixed(1)}秒に1つになる（いまは ${cookTime().toFixed(1)}秒）`,
      );
    }
    if (hire?.kind === "logger") lines.push("森で立木を切り、丸太を出し口へ積む");
    if (hire?.kind === "splitter") {
      // 持ち場はステージごとに違う（薪割り場・水くみ場・石臼・牧草地…）。
      // その人が付く作業場の名前と、そこで作るもので言う
      const post = hire.stoveId ? stoveById.get(hire.stoveId) : null;
      const place = post?.label ?? "その作業場";
      const made = post ? itemLabel(stoveItem(post)) : "しなもの";
      lines.push(`${place}に立ちっぱなしで、${made}を作り続ける`);
      lines.push(`雇うまでは、自分で${place}に立つ`);
    }
    if (hire?.kind === "hunter") lines.push("草原の動物を追って、生肉を出し口へ積む");
    if (hire?.kind === "collector") {
      lines.push(chain ? "落ちた貝がらを集めてくれる" : "券売機を入れるとホールへ移る");
    }
    if (pad.id === "equip-ticket") {
      lines.push(chain ? "雇っていた拾い手ははこび手になる" : "雇っていたレジ係はホール店員になる");
    }
    // 建築予定地は、要る資材を名前つきで出す（アイコンだけでは分からないため）
    const buildStove = stoveById.get(pad.id);
    if (buildStove?.needs) {
      lines.push(
        Object.entries(buildStove.needs)
          .map(([kind, need]) => `${itemLabel(kind)} ${need}`)
          .join("・"),
      );
      if (buildStove.gives?.note) lines.push(buildStove.gives.note);
    }
  }

  lines.push(paid > 0 ? `残り ${yen(price - paid)}（${yen(price)}）` : yen(price));
  lines.push("枠の上に立つと払える");
  return {
    title: pad.kind === "upgrade" ? `${pad.label}（強化）` : pad.label,
    lines,
    pos: at,
  };
};

const staffLabel = (kind: StaffKind) => stageLabels().staff[kind];

/** その場所にあるものの説明を返す */
export const inspectAt = (state: ShopState, at: Vec): Inspect | null => {
  let best: { d: number; make: () => Inspect } | null = null;
  const consider = (pos: Vec, radius: number, make: () => Inspect) => {
    const d = dist(at, pos);
    if (d > radius) return;
    if (!best || d < best.d) best = { d, make };
  };

  for (const pad of availablePads(state)) {
    consider(padPosOf(state, pad), PAD_RADIUS + 10, () =>
      padInspect(state, pad),
    );
  }

  // 導入ずみの設備
  for (const item of equipment) {
    if (!hasEquip(state, item.id)) continue;
    const at = equipPos(state, item);
    consider(at, 34, () => ({
      title: item.name,
      lines: [
        item.detail,
        item.outside ? "店の外に置いてある" : "厨房の奥に置いてある",
        "導入ずみ",
      ],
      pos: at,
    }));
  }

  // 店の外
  if (hasGate()) {
    consider(boothPos(state), 34, () => ({
      title: "入場券売り場",
      lines: [
        `入場券は 1人 ${yen(admissionValue(state))}`,
        hasEquip(state, "vend")
          ? "自動入場券売機が売ってくれる"
          : hasStaff(state, "seller")
            ? "入場券係が売ってくれる"
            : "近づくと売れる（入場券係か自動入場券売機で自動になる）",
        `いま ${atBooth(state).length}人 待っている`,
      ],
      pos: boothPos(state),
    }));
    consider(turnstilePos(state), 30, () => ({
      title: "入場の改札",
      lines: [
        "入場券を買った人がここから入る",
        hasEquip(state, "turnstile")
          ? "自動改札機が通してくれる"
          : hasStaff(state, "gatekeeper")
            ? "入場ゲート係が通してくれる"
            : "近づくと通せる（入場ゲート係か自動改札機で自動になる）",
        `いま ${atGate(state).length}人 待っている`,
      ],
      pos: turnstilePos(state),
    }));
  }

  consider(
    { x: streetPos(state).x, y: streetPos(state).y },
    40,
    () => ({
      title: stageLabels().outside,
      lines: [
        `${stageLabels().guest}はここから入ってくる`,
        ...(admissionValue(state) > 0
          ? [`入場券は 1人 ${yen(admissionValue(state))}（入口に落ちる）`]
          : []),
        stageLabels().outsideDetail,
      ],
      pos: streetPos(state),
    }),
  );

  for (const stove of openStoves(state)) {
    consider(stove.pos, 34, () => {
      const hasCook = stoveHasCook(state, stove.id);
      const seconds =
        (cookTime() * (stove.work ?? 1) * cookFactor(state.levels.cook)) /
        (hasCook ? cookBoost() : 1);
      const L = stageLabels();
      const item = stoveItem(stove);
      const made = state.ready[stove.id] ?? 0;
      const full = made >= holdCap(state, stove);

      // 建てている途中の建築予定地。工程の作業場とは説明を分ける
      if (isBuild(stove) && !isDone(state, stove.id)) {
        return {
          title: stove.label ?? "建築予定地",
          lines: [
            ...Object.entries(stove.needs ?? {}).map(
              ([kind, need]) => `${itemLabel(kind)} ${partsAt(state, stove.id, kind)} / ${need}`,
            ),
            "はこび手が資材を運びこむと建つ",
          ],
          pos: stove.pos,
        };
      }

      // 草原と森は「取りに行く場所」。作業場とは説明を分ける
      if (isHunt(stove)) {
        const here = state.prey.filter((a) => a.stoveId === stove.id).length;
        return {
          title: stove.label ?? "狩り場",
          lines: [
            "動物がうろつく草原。近づくと狩れる",
            `いま ${here}頭・出し口に生肉 ${made} / ${holdCap(state, stove)}`,
            full ? "出し口が満杯。運び出すまで狩れない" : "狩人を雇うと、自動で狩ってくれる",
            "生肉をたき火へ運ぶのは、はこび手かあなたの仕事",
          ],
          pos: stove.pos,
        };
      }
      if (isForest(stove)) {
        const standing = liveTrees(state, stove.id).length;
        return {
          title: stove.label ?? "森",
          lines: [
            "立木のある森。そばに立つと切り倒せる",
            `切れる木 ${standing}本・出し口に丸太 ${made} / ${holdCap(state, stove)}`,
            `切り株は ${TREE_REGROW}秒で生えなおす`,
            full ? "出し口が満杯。運び出すまで切らない" : "木こりを雇うと、自動で切ってくれる",
          ],
          pos: stove.pos,
        };
      }

      const lines: string[] = [];
      if (isStation(stove)) {
        const takes = stove.takes ?? "";
        const held = heldAt(state, stove.id);
        lines.push(
          stove.fuel
            ? `${itemLabel(takes)}1こ + ${itemLabel(stove.fuel)}1こ → ${itemLabel(item)}1こ`
            : `${itemLabel(takes)}1こ → ${itemLabel(item)}1こ`,
          `${seconds.toFixed(1)}秒に1こできる`,
        );
        if (held <= 0) lines.push(`いまは${itemLabel(takes)}待ちで止まっている`);
        else if (stove.fuel && fuelAt(state, stove.id) <= 0) {
          lines.push(`いまは${itemLabel(stove.fuel)}待ちで火が消えている`);
        } else if (full) lines.push("出し口が満杯で止まっている");
        else if (stove.manual && !isManned(state, stove)) {
          lines.push("人の手が要る。そばに立つと進む");
        } else lines.push("いま作っているところ");
        if (stove.manual) {
          lines.push(
            hasCook
              ? `${L.staff.splitter}が付いている（${cookBoost()}倍速）`
              : `${L.staff.splitter}を雇うと、留守でも動き続ける`,
          );
        } else {
          lines.push(
            hasCook
              ? `${L.staff.cook}が付いている（${cookBoost()}倍速）`
              : `${L.staff.cook}を雇うと ${cookBoost()}倍速`,
          );
        }
        return { title: stove.label ?? L.producer, lines, pos: stove.pos };
      }

      const unit = item === "food" ? "皿" : item === "goods" ? "箱" : L.item === "丼" ? "杯" : "枚";
      return {
        title: stove.label ?? L.producer,
        lines: [
          `${seconds.toFixed(1)}秒に1${unit}できる`,
          `${stoveCapacity(state)}まで置いておける`,
          item === "food"
            ? "テーブル席に運ぶ料理を作る"
            : item === "goods"
              ? "棚に並べる商品を出す"
              : hasCook
                ? `${L.staff.cook}が付いている`
                : `${L.staff.cook}を雇うと${cookBoost()}倍速`,
          "近づくと自動で受け取る（品種ごとに上限まで持てる）",
        ],
        pos: stove.pos,
      };
    });
  }

  for (const seat of openSeats(state)) {
    const tray = trayPos(seat);
    const mode = seatMode(seat);
    const worth = yen(coinValue(state.levels.price) * (seat.value ?? 1));
    const make = (): Inspect => ({
      title: seat.label,
      lines: [
        ...(seat.detail ? [seat.detail] : []),
        ...(mode === "shelf"
          ? [
              `倉庫の商品を並べておく場所（いま ${shelfStock(state, seat.id)} / ${SHELF_MAX}）`,
              "お客さんが自分で取ってレジで払う",
              `1つ売れると ${worth}`,
            ]
          : mode === "table"
            ? [
                "厨房の料理を運ぶテーブル",
                isDirty(state, seat.id)
                  ? "皿が残っている。近づくと片づけられる"
                  : "食べ終わると皿が残る。片づけると次の客が来る",
                `1組で ${worth}`,
              ]
            : [
                `${stageLabels().guest}が${stageLabels().item}を待つ`,
                seatCost(seat) > 1
                  ? `一度に ${seatCost(seat)}つ 必要（まとめて運ぶ）`
                  : `光っている${stageLabels().tray}に持っていくと渡せる`,
                `終わると ${worth} 置いていく`,
              ]),
      ],
      pos: tray,
    });
    consider(tray, 30, make);
    consider(seat.pos, 30, make);

    if (hasAuto(state, seat)) {
      consider(autoPos(seat), 24, () => ({
        title: stageLabels().auto,
        lines: [
          `${seat.label}に付いている`,
          seatMode(seat) === "shelf"
            ? `${AUTO_TIME.toFixed(1)}秒に1つ、棚に自動で並ぶ`
            : `${AUTO_TIME.toFixed(1)}秒で自動で渡す（運ばなくていい）`,
          `${stageLabels().producer}の在庫から出る`,
        ],
        pos: autoPos(seat),
      }));
    }
  }

  for (const worker of state.staff) {
    consider(worker.pos, 22, () => {
      const lines: string[] = [];
      const unit = stageLabels().item === "丼" ? "杯" : "こ";
      const post = worker.stoveId ? stoveById.get(worker.stoveId) : null;
      if (worker.kind === "cook") {
        lines.push(
          `${post?.label ?? stageLabels().producer}の前に立って速くする`,
          `いまの倍率 ${cookBoost()}倍（${(cookTime() / cookBoost()).toFixed(1)}秒に1つ）`,
        );
      } else if (worker.kind === "splitter") {
        const held = post ? heldAt(state, post.id) : 0;
        const made = post ? state.ready[post.id] ?? 0 : 0;
        lines.push(
          "薪割り台の前で、丸太を1本ずつ薪に割る",
          `丸太1こ → 薪1こ（${(cookTime() * (post?.work ?? 1)) / cookBoost()}秒に1つ）`,
          held <= 0
            ? "いまは材料待ち（丸太を届けてもらうのを待っている）"
            : made >= (post ? holdCap(state, post) : 0)
              ? "薪の出し口が満杯で止まっている"
              : `丸太 ${held}こを割っているところ`,
          "割った薪を運ぶのは、はこび手かあなたの仕事",
        );
      } else if (worker.kind === "logger") {
        const left = liveTrees(state, worker.stoveId ?? undefined).length;
        lines.push(
          "森へ行き、斧で立木を切って丸太にする",
          "丸太は森の出し口にたまる（そこから運ぶ）",
          left > 0
            ? `いま切れる木が ${left}本ある`
            : "切れる木がない。切り株が育つのを待っている",
        );
      } else if (worker.kind === "master") {
        lines.push("全体を仕切り、すべての作る場所を1.4倍速にする");
      } else if (worker.kind === "collector") {
        lines.push("落ちたお金を拾ってくれる");
      } else if (worker.kind === "hunter") {
        lines.push(
          "草原をまわって動物を狩ってくれる",
          "狩ると、狩り場の出し口に生肉がたまる",
        );
      } else if (worker.kind === "seller") {
        lines.push(
          "入口に立って、入場券を売ってくれる",
          "1人ずつしかさばけない（自動入場券売機は同時にさばく）",
          `1人 ${yen(admissionValue(state))}・いま ${atBooth(state).length}人 待っている`,
        );
      } else if (worker.kind === "gatekeeper") {
        lines.push(
          "改札に立って、お客さんを通してくれる",
          "1人ずつしか通せない（自動改札機は同時に通す）",
          `いま ${atGate(state).length}人 待っている`,
        );
      } else {
        const load = carryKinds(worker)
          .map((kind) => `${itemLabel(kind)} ×${carryOf(worker, kind)}`)
          .join("・");
        lines.push(
          isChainStage()
            ? "工程のあいだを行き来して、必要なものを運ぶ"
            : `${stageLabels().item}を受け取って、待っている相手へ運ぶ`,
          isChainStage()
            ? `品種ごとに ${carrierLimit(state, worker)}${unit}まで（生肉と薪を同時に持てる）`
            : `一度に ${carrierLimit(state, worker)}${unit}${
                worker.kind === "boat"
                  ? "・川を通ってまとめて運ぶ"
                  : worker.kind === "robot"
                    ? "・足が速い"
                    : ""
              }`,
          load ? `いま ${load} を持っている` : "いまは手ぶら",
        );
      }
      if (
        !isChainStage() &&
        (worker.kind === "robot" ||
          worker.kind === "boat" ||
          worker.kind === "waiter" ||
          worker.kind === "server")
      ) {
        lines.push(
          worker.wait > 0
            ? `次の相手を選び直すまで あと ${worker.wait.toFixed(1)}秒`
            : `待っている ${ROBOT_PICKS}人のなかから、くじで選んで運ぶ`,
        );
      }
      if (
        worker.kind !== "cook" &&
        worker.kind !== "master" &&
        worker.kind !== "seller" &&
        worker.kind !== "gatekeeper" &&
        worker.kind !== "hunter" &&
        worker.kind !== "logger" &&
        worker.kind !== "splitter"
      ) {
        const zone = areaById.get(`area-${worker.area}`);
        lines.push(
          worker.kind === "server"
            ? "料理だけを運ぶ"
            : worker.kind === "stocker"
              ? "商品だけを運ぶ"
              : worker.kind === "collector"
                ? "お金だけを拾う"
                : worker.kind === "busser"
                  ? "皿だけを片づける"
                  : isChainStage()
                    ? "区間は決まっていない。詰まったところから助ける"
                    : `${stageLabels().item}だけを運ぶ`,
          `担当は ${zone ? zone.label.replace("をつくる", "") : "この区画"}（空いていれば他も手伝う）`,
          `強化のおかげで 足の速さ +${state.levels.speed * 5}%`,
        );
      }
      return { title: staffLabel(worker.kind), lines, pos: worker.pos };
    });
  }

  for (const customer of state.customers) {
    consider(customer.pos, 22, () => ({
      title: stageLabels().guest,
      lines: [
        ...(customer.state === "waiting"
          ? [`${stageLabels().item}を待っている`, `${stageLabels().tray}まで運ぼう`]
          : customer.state === "eating"
            ? [`${stageLabels().using}（あと ${Math.max(0, customer.timer).toFixed(1)}秒）`]
            : customer.state === "paying"
              ? ["商品を持ってレジへ向かっている"]
              : customer.state === "roaming"
              ? ["次に乗れる場所が空くのを待っている"]
              : customer.state === "leaving"
                ? ["満足して帰るところ"]
                : ["次の場所へ向かっている"]),
        `${customer.visits} / ${customer.budget} か所 まわった`,
      ],
      pos: customer.pos,
    }));
  }

  consider(state.player.pos, 24, () => ({
    title: "あなた",
    lines: [
      `運べる数 ${carryTotal(state.player)} / ${maxCarry(state)}`,
      `足の速さ +${state.levels.speed * 10}%（スタッフにも +${
        state.levels.speed * 5
      }%）`,
      `集客 ×${customerDraw(state).toFixed(2)}（${spawnInterval(state).toFixed(
        2,
      )}秒に1人）`,
      "スワイプで移動・近づくだけで持つ／出す",
    ],
    pos: state.player.pos,
  }));

  return best ? (best as { make: () => Inspect }).make() : null;
};
