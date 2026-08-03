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
  | "hunter";

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
    | "market";
};

export type AreaSpec = {
  id: string;
  label: string;
  price: number;
  rect: Rect;
  /** 買う枠の位置（すでに開いている区画の中に置く） */
  padPos: Vec;
  palette: AreaPalette;
  /** これを買うまで出てこない（順ぐりに増やしていくため） */
  unlockAfter?: string;
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
      label: currentStage.labels.producer,
      sub: "同時に作れる数が増える",
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
  x: 306,
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

/** 行列の立ち位置（0 が先頭＝席に近い側。入口へ向かって下に伸びる） */
export const linePos = (state: ShopState, index: number): Vec => {
  const street = streetPos(state);
  return { x: street.x, y: street.y - 120 + index * 26 };
};

/** 待っている人の並び位置 */
const queueSpot = (at: Vec, index: number): Vec => ({
  x: at.x + ((index % 4) - 1.5) * 22,
  y: at.y + 26 + Math.floor(index / 4) * 20,
});

/** お客さんが現れる歩道の位置 */
export const streetPos = (state: ShopState): Vec => ({
  x: 306,
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

export type Pop = { id: number; pos: Vec; text: string; age: number };

export type Staff = {
  id: number;
  kind: StaffKind;
  pos: Vec;
  carry: number;
  /** いま手に持っているものの種類 */
  item: ItemKind | null;
  stoveId: string | null;
  /** 待機場所（雇った場所） */
  home: Vec;
  /** 板前の見回りなどに使う小さなカウンタ */
  trips: number;
  /** 片づけ係が拭いているあいだの残り時間 */
  charge: number;
  /** 次の相手を選び直すまでの待ち時間（くじ引き） */
  wait: number;
  /** いま担当している場所（ほかのスタッフと取り合わないように） */
  target: string | null;
  /** 目的地に着いて作業中か（着いた人は押されない） */
  settled?: boolean;
  /** 担当エリア（雇った区画。ここを優先して回る） */
  area: number;
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

/** いま持っている合計の数 */
export const carryTotal = (player: Player) =>
  Object.values(player.bag).reduce((sum, n) => sum + n, 0);

/** その種類を何個持っているか */
export const carryOf = (player: Player, kind: ItemKind) => player.bag[kind] ?? 0;

/** 代表の種類（HUD やアイコン用。いちばん多いもの） */
export const topKind = (player: Player): ItemKind | null => {
  let best: ItemKind | null = null;
  let most = 0;
  for (const [kind, n] of Object.entries(player.bag)) {
    if (n > most) {
      most = n;
      best = kind;
    }
  }
  return best;
};

const addToBag = (player: Player, kind: ItemKind, n = 1) => {
  player.bag[kind] = (player.bag[kind] ?? 0) + n;
};

const takeFromBag = (player: Player, kind: ItemKind, n: number) => {
  const have = player.bag[kind] ?? 0;
  const took = Math.min(have, n);
  if (took >= have) delete player.bag[kind];
  else player.bag[kind] = have - took;
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
};

export type ShopState = Persisted & {
  stageId: StageId;
  player: Player;
  staff: Staff[];
  customers: Customer[];
  coins: Coin[];
  /** 狩り場の動物 */
  prey: Prey[];
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
export const PICK_RADIUS = 44;
export const SERVE_RADIUS = 46;
export const COIN_RADIUS = 34;
export const PAD_RADIUS = 26;
export const STOVE_CAPACITY = 5;
/** 運ぶ人がくじを引く範囲（待っている1〜5番目） */
export const ROBOT_PICKS = 5;
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
/** 狩り場に動物が湧く間隔（秒）と、同時にいられる数 */
export const HUNT_SPAWN = 2.4;
export const HUNT_CAP = 4;
/** 動物を狩れる距離 */
export const CATCH_RADIUS = 30;

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

const makeStaff = (hire: HireSpec, id: number, at: Vec): Staff => ({
  id,
  kind: hire.kind,
  pos: { ...at },
  carry: 0,
  item: null,
  stoveId: hire.stoveId ?? null,
  home: { ...at },
  area: hire.area,
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

const startFuel = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of startUnlocked()) {
    const stove = stoveById.get(id);
    if (stove?.fuel) out[id] = 0;
  }
  return out;
};

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  stageId: currentStage.id,
  money: 0,
  unlocked: [...startUnlocked()],
  padProgress: {},
  levels: { carry: 0, speed: 0, cook: 0, price: 0, gate: 0 },
  served: 0,
  playTime: 0,
  lastSeen: Date.now(),
  player: { pos: { x: 180, y: 250 }, bag: {}, moving: false, step: 0, serveCd: 0 },
  staff: [],
  customers: [],
  coins: [],
  prey: [],
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

const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toPersisted = (state: ShopState): Persisted => ({
  version: SAVE_VERSION,
  stageId: state.stageId,
  money: state.money,
  unlocked: state.unlocked,
  padProgress: state.padProgress,
  levels: state.levels,
  served: state.served,
  playTime: state.playTime,
  lastSeen: Date.now(),
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

  for (const stove of stoves) {
    if (state.unlocked.includes(stove.id)) {
      state.ready[stove.id] = 0;
      state.cooking[stove.id] = 0;
      if (isStation(stove)) state.hold[stove.id] = 0;
      if (stove.fuel) state.fuel[stove.id] = 0;
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

export const openStoves = (state: ShopState) =>
  stoves.filter((stove) => state.unlocked.includes(stove.id));

export const openSeats = (state: ShopState) =>
  seats.filter((seat) => state.unlocked.includes(seat.id));

/** その場所の遊び方 */
export const seatMode = (seat: SeatSpec) => seat.mode ?? "ride";

/** その場所が受け取るもの */
export const seatNeeds = (seat: SeatSpec): ItemKind => seat.needs ?? "main";

/** 一度に必要な数（2枚・3枚いる乗り物がある） */
export const seatCost = (seat: SeatSpec) => Math.max(1, seat.cost ?? 1);

/** その作る場所が作るもの */
export const stoveItem = (stove: StoveSpec): ItemKind => stove.item ?? "main";

/** 工程の作業場か（受け取ってから作る＝手前の工程が要る） */
export const isStation = (stove: StoveSpec) => stove.takes !== undefined;

/** 受け口・出し口に積める数 */
export const holdCap = (state: ShopState, stove: StoveSpec) =>
  stove.hold ?? stoveCapacity(state);

/** 受け口にたまっている数 */
export const heldAt = (state: ShopState, stoveId: string) =>
  state.hold[stoveId] ?? 0;

/** まき（燃料）の受け口にたまっている数 */
export const fuelAt = (state: ShopState, stoveId: string) =>
  state.fuel[stoveId] ?? 0;

/**
 * この作業場が、その品をどちらの受け口で受け取れるか。
 * 空きがなければ null。
 */
export const stationAccepts = (
  state: ShopState,
  stove: StoveSpec,
  item: ItemKind,
): "hold" | "fuel" | null => {
  if (stove.takes === item && heldAt(state, stove.id) < holdCap(state, stove)) {
    return "hold";
  }
  if (stove.fuel === item && fuelAt(state, stove.id) < holdCap(state, stove)) {
    return "fuel";
  }
  return null;
};

/** このステージが工程（数珠つなぎ）を使うか */
export const isChainStage = () => stoves.some((stove) => isStation(stove));

/** この種類を受け取る、まだ空きのある作業場（近い順に呼び出し側でならべる） */
const stationsWanting = (state: ShopState, item: ItemKind) =>
  openStoves(state).filter(
    (stove) => isStation(stove) && stationAccepts(state, stove, item) !== null,
  );

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

export const maxCarry = (state: ShopState) => 3 + state.levels.carry;

/** 光っている見た目（★の数）による足の速さのおまけ。ガチャ側から入れる */
let skinShine = 0;
export const setSkinShine = (stars: number) => {
  skinShine = Math.max(0, stars);
};
export const skinShineBonus = () => skinShine * 0.05;

export const playerSpeed = (state: ShopState) =>
  PLAYER_BASE_SPEED * (1 + state.levels.speed * 0.1) * (1 + skinShineBonus());

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

export const stoveHasCook = (state: ShopState, stoveId: string) =>
  state.staff.some(
    (worker) => worker.kind === "cook" && worker.stoveId === stoveId,
  );

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

/** いま店内に出ている枠 */
export const availablePads = (state: ShopState) =>
  pads.filter((pad) => {
    // 値段が入っていない枠は出さない（データの取りこぼし対策）
    if (pad.kind !== "upgrade" && !Number.isFinite(pad.price)) return false;
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
      worker.carry = 0;
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

const spawnCustomers = (state: ShopState, dt: number) => {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = spawnInterval(state);

  const taken = new Set(
    state.customers
      .filter((customer) => customer.state !== "leaving")
      .map((customer) => customer.seatId),
  );
  const free = openSeats(state).find(
    (seat) => !taken.has(seat.id) && !isDirty(state, seat.id),
  );

  const newGuest = (over: Partial<Customer>): Customer => ({
    id: state.nextId++,
    seatId: "",
    state: "walking",
    pos: {
      x: streetPos(state).x + (Math.random() * 40 - 20),
      y: streetPos(state).y,
    },
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
    // 狩り場は勝手に作らない。動物を狩ると肉がたまる（updateHunt を見よ）
    if (isHunt(stove)) continue;
    const ready = state.ready[stove.id] ?? 0;
    const cap = holdCap(state, stove);
    if (ready >= cap) continue;
    // 工程の作業場は、受け口に材料がないと作れない（まきが要る焼き場はまきも）
    if (isStation(stove) && heldAt(state, stove.id) <= 0) {
      state.cooking[stove.id] = 0;
      continue;
    }
    if (stove.fuel && fuelAt(state, stove.id) <= 0) {
      state.cooking[stove.id] = 0;
      continue;
    }
    const boost = stoveHasCook(state, stove.id) ? COOK_BOOST : 1;
    const work = stove.work ?? 1;
    const progress =
      (state.cooking[stove.id] ?? 0) + (dt * boost) / (COOK_TIME * work * factor);
    if (progress >= 1) {
      state.ready[stove.id] = ready + 1;
      state.cooking[stove.id] = progress - 1;
      // 1つ作ったら、材料を1つ・まきを1つ使う
      if (isStation(stove)) state.hold[stove.id] = heldAt(state, stove.id) - 1;
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
    // だいたい 0.5 秒に1つ流す（速いはこび手より速い）
    if (state.autoTimer[key] < 0.5) continue;
    const fromStove = stoveById.get(from);
    const toStove = stoveById.get(to);
    if (!fromStove || !toStove) continue;
    if ((state.ready[from] ?? 0) <= 0) continue;
    // 送り先の、正しい受け口（材料 or まき）へ入れる
    const slot = stationAccepts(state, toStove, stoveItem(fromStove));
    if (!slot) continue;
    const buffer = slot === "fuel" ? state.fuel : state.hold;
    state.autoTimer[key] = 0;
    state.ready[from] -= 1;
    buffer[to] = (buffer[to] ?? 0) + 1;
  }
};

/* ---------- 狩り場 ---------- */

/** 狩り場か（動物を狩って肉にする場所） */
export const isHunt = (stove: StoveSpec) => stove.art === "hunt";

/** 狩り場のうろつく範囲（作業場のまわり） */
export const huntZone = (state: ShopState, stove: StoveSpec): Rect => {
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

const payOut = (state: ShopState, seat: SeatSpec, at: Vec) => {
  const value = coinValue(state.levels.price) * (seat.value ?? 1);
  if (hasEquip(state, "ticket")) {
    // 券売機／自動改札があるとお金は自動でサイフに入る
    state.money += value;
    pop(state, { x: at.x, y: at.y - 10 }, `+${Math.round(value).toLocaleString("ja-JP")}円`);
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
      seat.id !== customer.seatId && !taken.has(seat.id) && !isDirty(state, seat.id),
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
      if (moveToward(customer.pos, seat.pos, 96, dt)) customer.state = "waiting";
    } else if (customer.state === "waiting" && mode === "shelf") {
      // お土産屋は自分で棚から取る。並んでいなければ待つ
      if (shelfStock(state, seat.id) > 0) {
        state.shelf[seat.id] = shelfStock(state, seat.id) - 1;
        customer.state = "paying";
        pop(state, { x: seat.pos.x, y: seat.pos.y - 26 }, "これください！");
      }
    } else if (customer.state === "paying") {
      const till = payPos(seat);
      if (moveToward(customer.pos, till, 100, dt)) {
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
        moveToward(
          customer.pos,
          { x: seat.pos.x + Math.cos(t) * 60, y: seat.pos.y + Math.sin(t) * 34 },
          70,
          dt,
        );
      }
    } else if (customer.state === "leaving") {
      if (moveToward(customer.pos, streetPos(state), 112, dt)) customer.id = -1;
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
      pop(state, { x: at.x, y: at.y - 14 }, `+${fee.toLocaleString("ja-JP")}円`);
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

const pickUp = (
  state: ShopState,
  pos: Vec,
  carry: number,
  limit: number,
  holding: ItemKind | null,
  want?: ItemKind | null,
): ItemKind | null => {
  if (carry >= limit) return null;
  for (const stove of openStoves(state)) {
    if ((state.ready[stove.id] ?? 0) <= 0) continue;
    const item = stoveItem(stove);
    if (holding && item !== holding) continue;
    if (want && item !== want) continue;
    if (dist(pos, stove.pos) > PICK_RADIUS) continue;
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
    if (!isStation(stove)) continue;
    const slot = stationAccepts(state, stove, holding);
    if (!slot) continue;
    if (dist(pos, stove.pos) > SERVE_RADIUS) continue;
    const buffer = slot === "fuel" ? state.fuel : state.hold;
    const cap = holdCap(state, stove);
    const room = cap - (buffer[stove.id] ?? 0);
    const put = Math.min(room, carry);
    if (put <= 0) continue;
    buffer[stove.id] = (buffer[stove.id] ?? 0) + put;
    pop(state, { x: stove.pos.x, y: stove.pos.y - 12 }, slot === "fuel" ? "くべた！" : "セット！");
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
    `+${Math.round(coin.value).toLocaleString("ja-JP")}円`,
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
    if (!isBlocked(state, { x: nextX, y: player.pos.y })) player.pos.x = nextX;
    if (!isBlocked(state, { x: player.pos.x, y: nextY })) player.pos.y = nextY;
    player.step += dt * speed * 0.06 * scale;
  }

  // 連鎖はしばらく渡さないでいると切れる
  state.comboLeft = Math.max(0, state.comboLeft - dt);
  if (state.comboLeft <= 0) state.combo = 0;
  player.serveCd = Math.max(0, (player.serveCd ?? 0) - dt);

  // 狩り場の動物に近づいたら、自分で狩る
  catchPrey(state, player.pos);

  // 近くの出し口から受け取る（複数の種類を同時に持てる）
  if (carryTotal(player) < maxCarry(state)) {
    const got = pickUp(state, player.pos, 0, 1, null);
    if (got) addToBag(player, got, 1);
  }

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
  worker.kind === "server" ? "food" : worker.kind === "stocker" ? "goods" : "main";

/** スタッフが一度に運べる数。強化（両手鍋／チケットホルダー）で増える */
export const carrierLimit = (state: ShopState, worker: Staff) =>
  worker.kind === "robot"
    ? Math.max(5, maxCarry(state))
    : 3 + Math.floor(state.levels.carry / 2);

/** スタッフの足の速さ。強化（厨房シューズ／園内カート）の半分だけ効く */
export const staffSpeedFactor = (state: ShopState) => 1 + state.levels.speed * 0.05;

const staffSpeed = (state: ShopState) => STAFF_SPEED * staffSpeedFactor(state);

const carrierSpeed = (state: ShopState, worker: Staff) =>
  (worker.kind === "robot" ? ROBOT_SPEED : STAFF_SPEED) * staffSpeedFactor(state);

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
  return moveToward(worker.pos, target, speed, dt);
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
  // まっすぐ向かう。重ならないように行き先だけ少しずらす
  if (worker.kind === "robot") return at;
  return { x: at.x + ((worker.id % 3) - 1) * 10, y: at.y };
};

/** 手が空いたときの待ち場所（雇った場所で待つ） */
const idleSpot = (_state: ShopState, worker: Staff): Vec => worker.home;

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
 * 工程のはこび手（人・ロボ）。
 * 出し口から取って、それを求めている次の作業場か客へ運ぶ。
 * 区間を決め打ちせず、いま運べる仕事のうち近いものを選ぶ。
 */
const updateHauler = (state: ShopState, worker: Staff, dt: number) => {
  const speed = carrierSpeed(state, worker);
  const limit = carrierLimit(state, worker);

  // 何か持っている: それを受け取る「次の作業場」か「待っている客」へ届ける
  if (worker.carry > 0 && worker.item) {
    const item = worker.item;
    type Target = { id: string; at: Vec; deliver: () => number };
    const targets: Target[] = [];
    for (const stove of stationsWanting(state, item)) {
      if (claimedByOther(state, worker, stove.id)) continue;
      const slot = stationAccepts(state, stove, item);
      if (!slot) continue;
      const buffer = slot === "fuel" ? state.fuel : state.hold;
      targets.push({
        id: stove.id,
        at: stove.pos,
        deliver: () => {
          const room = holdCap(state, stove) - (buffer[stove.id] ?? 0);
          const put = Math.min(room, worker.carry);
          if (put <= 0) return 0;
          buffer[stove.id] = (buffer[stove.id] ?? 0) + put;
          return put;
        },
      });
    }
    for (const customer of state.customers) {
      if (customer.state !== "waiting") continue;
      const seat = seatById.get(customer.seatId);
      if (!seat || seatMode(seat) === "shelf" || hasAuto(state, seat)) continue;
      if (seatNeeds(seat) !== item || seatCost(seat) > worker.carry) continue;
      if (claimedByOther(state, worker, seat.id)) continue;
      targets.push({
        id: seat.id,
        at: seat.serve,
        deliver: () => serve(state, worker.pos, item, worker.carry),
      });
    }
    if (targets.length === 0) {
      // 行き先がない: 待つ
      go(state, worker, idleSpot(state, worker), speed * 0.4, dt);
      return;
    }
    // いま担当している行き先を続けて、目移りしない
    const keep = targets.find((t) => t.id === worker.target);
    const pick =
      keep ??
      targets.sort(
        (a, b) => dist(worker.pos, a.at) - dist(worker.pos, b.at),
      )[0];
    worker.target = pick.id;
    go(state, worker, approach(state, worker, pick.at), speed, dt);
    if (dist(worker.pos, pick.at) <= SERVE_RADIUS) {
      const used = pick.deliver();
      if (used > 0) {
        worker.carry -= used;
        worker.target = null;
        if (worker.carry === 0) worker.item = null;
      }
    }
    return;
  }

  // 手ぶら: 下流で使い道のある出し口から取ってくる
  const sources = openStoves(state)
    .filter(
      (stove) =>
        (state.ready[stove.id] ?? 0) > 0 &&
        itemHasDemand(state, stoveItem(stove)) &&
        !claimedByOther(state, worker, stove.id),
    )
    .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos));
  const source = sources[0];
  if (!source) {
    go(state, worker, idleSpot(state, worker), speed * 0.4, dt);
    return;
  }
  worker.target = source.id;
  go(state, worker, approach(state, worker, source.pos), speed, dt);
  const item = stoveItem(source);
  while (
    worker.carry < limit &&
    (state.ready[source.id] ?? 0) > 0 &&
    dist(worker.pos, source.pos) <= PICK_RADIUS
  ) {
    state.ready[source.id] -= 1;
    worker.item = item;
    worker.carry += 1;
  }
  if (worker.carry > 0) worker.target = null;
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
    if (stockOf(state, need) < cost) continue;
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
    if (worker.kind === "cook") {
      go(state, worker, cookPost(worker), staffSpeed(state), dt);
      continue;
    }

    if (worker.kind === "hunter") {
      // 狩人: 担当の狩り場で、いちばん近い動物を追って狩る
      const ground = worker.stoveId ? stoveById.get(worker.stoveId) : null;
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

      if (worker.carry > 0) {
        if (!shelfNeed) {
          go(state, worker, { x: worker.pos.x, y: worker.pos.y }, speed, dt);
          continue;
        }
        worker.target = shelfNeed.id;
        go(state, worker, approach(state, worker, shelfNeed.tray), speed, dt);
        if (restock(state, worker.pos)) {
          worker.carry -= 1;
          worker.target = null;
          if (worker.carry === 0) worker.item = null;
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
      while (worker.carry < limit) {
        const item = pickUp(state, worker.pos, worker.carry, limit, worker.item, "goods");
        if (!item) break;
        worker.item = item;
        worker.carry += 1;
      }
      continue;
    }

    // 工程のあるステージでは、はこび手は「作業場から作業場へ」も運ぶ
    if (
      isChainStage() &&
      (worker.kind === "waiter" || worker.kind === "robot")
    ) {
      updateHauler(state, worker, dt);
      continue;
    }

    // ホール店員・配膳ロボ・料理係: 自分が扱えるものだけを運ぶ
    const speed = carrierSpeed(state, worker);
    const mine = handledItem(worker);
    if (worker.item && worker.item !== mine) {
      // 担当外のものは持たない（古いセーブから来たときの保険）
      worker.carry = 0;
      worker.item = null;
    }


    const limit = carrierLimit(state, worker);

    if (worker.carry > 0) {
      // いま持っている数で足りる相手をさがす。
      // ホール店員は近い席から、配膳ロボは遠い席から回る（担当が分かれる）
      const reachable = state.customers
        .filter((customer) => {
          if (customer.state !== "waiting") return false;
          const item = seatById.get(customer.seatId);
          return (
            !!item &&
            seatMode(item) !== "shelf" &&
            // 自動供給機が付いている場所は機械にまかせる
            !hasAuto(state, item) &&
            seatNeeds(item) === mine &&
            seatNeeds(item) === worker.item &&
            seatCost(item) <= worker.carry &&
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
        const used = serve(state, worker.pos, worker.item, worker.carry);
        if (used > 0) {
          worker.carry -= used;
          worker.target = null;
          worker.wait = 0;
          if (worker.carry === 0) worker.item = null;
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
        if (seatNeeds(item) !== mine) continue;
        maxNeed = Math.max(maxNeed, seatCost(item));
      }
      const fill = Math.min(limit, maxNeed);
      const more =
        worker.carry < fill
          ? openStoves(state)
              .filter(
                (item) =>
                  stoveItem(item) === worker.item && (state.ready[item.id] ?? 0) > 0,
              )
              .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0]
          : null;
      if (more) {
        go(state, worker, approach(state, worker, more.pos), speed, dt);
        while (worker.carry < fill) {
          const item = pickUp(state, worker.pos, worker.carry, fill, worker.item);
          if (!item) break;
          worker.carry += 1;
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

    const ready = openStoves(state).filter(
      (item) => (state.ready[item.id] ?? 0) > 0 && stoveItem(item) === mine,
    );
    // すでに持っているものがあれば、それと同じ種類だけ足す
    const usable = worker.item
      ? ready.filter((item) => stoveItem(item) === worker.item)
      : ready;
    // ロボは在庫の多い場所へまとめて取りに行き、店員は近い場所から取る
    // 待っている人が必要とする数までしか取らない（余らせない）
    const buffer = Math.min(limit, demand.get(mine) ?? 0);
    if (buffer <= 0 || worker.carry >= buffer) {
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
    while (worker.carry < buffer) {
      const item = pickUp(state, worker.pos, worker.carry, buffer, worker.item);
      if (!item) break;
      worker.item = item;
      worker.carry += 1;
    }
  }
};

export const update = (state: ShopState, input: Input, dt: number) => {
  state.playTime += dt;
  updateStoves(state, dt);
  updateHunt(state, dt);
  spawnCustomers(state, dt);
  updateCustomers(state, dt);
  updatePlayer(state, input, dt);
  updateAuto(state, dt);
  updateStaff(state, dt);
  spread(state, dt);
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

export const currentObjective = (state: ShopState): Objective => {
  const waiting = state.customers.filter((c) => c.state === "waiting");
  const player = state.player;

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

  const hasHunter = (stoveId: string) =>
    state.staff.some((w) => w.kind === "hunter" && w.stoveId === stoveId);
  const cookRate = openStoves(state).reduce((sum, stove) => {
    // 狩り場は、狩人がいるあいだだけ肉がとれる（留守は本人が狩れない）
    if (isHunt(stove)) {
      return sum + (hasHunter(stove.id) ? 1 / HUNT_SPAWN : 0);
    }
    return (
      sum + (stoveHasCook(state, stove.id) ? COOK_BOOST : 1) / (COOK_TIME * factor)
    );
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
    if (hire?.kind === "waiter") lines.push("雇うと放置中も稼いでくれる");
    if (hire?.kind === "robot") lines.push("店員より速く、5杯以上まとめて運ぶ");
    if (hire?.kind === "cook") lines.push(`調理が ${COOK_BOOST}倍速になる`);
    if (hire?.kind === "collector") lines.push("券売機を入れるとホールへ移る");
    if (pad.id === "equip-ticket") lines.push("雇っていたレジ係はホール店員になる");
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
        (COOK_TIME * cookFactor(state.levels.cook)) / (hasCook ? COOK_BOOST : 1);
      const L = stageLabels();
      const item = stoveItem(stove);
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
                : `${L.staff.cook}を雇うと2.2倍速`,
          "近づくと自動で受け取る（違うものは同時に持てない）",
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
      const unit = stageLabels().item === "丼" ? "杯" : "枚";
      if (worker.kind === "cook") {
        lines.push(
          `${stageLabels().producer}の前に立って速くする`,
          `いまの倍率 ${COOK_BOOST}倍`,
        );
      } else if (worker.kind === "master") {
        lines.push("全体を仕切り、すべての作る場所を1.4倍速にする");
      } else if (worker.kind === "collector") {
        lines.push("落ちたお金を拾ってくれる");
      } else if (worker.kind === "hunter") {
        lines.push(
          "狩り場をまわって動物を狩ってくれる",
          "狩ると、この狩り場に肉がたまる",
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
        lines.push(
          `${stageLabels().item}を受け取って、待っている相手へ運ぶ`,
          `一度に ${carrierLimit(state, worker)}${unit}${
            worker.kind === "robot" ? "・足が速い" : ""
          }`,
          `いま ${worker.carry}${unit} 持っている`,
        );
      }
      if (worker.kind === "robot" || worker.kind === "waiter" || worker.kind === "server") {
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
        worker.kind !== "hunter"
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
