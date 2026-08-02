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

/** 運ぶものの種類。作る場所と受け取る場所が合っていないと渡せない */
export type ItemKind = "main" | "food" | "goods";

export type StoveSpec = {
  id: string;
  pos: Vec;
  price: number;
  area: number;
  /** 何を作るか（省略時は main = 丼／チケット） */
  item?: ItemKind;
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
  | "stocker";

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
    | "leaving";
  pos: Vec;
  timer: number;
  /** 今日まわる予定の数（場所が増えるほど増える） */
  budget: number;
  /** もう体験した数 */
  visits: number;
};

export type Coin = { id: number; pos: Vec; value: number; age: number };

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
  carry: number;
  /** いま手に持っているものの種類（違うものは同時に持てない） */
  item: ItemKind | null;
  moving: boolean;
  step: number;
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
  pops: Pop[];
  ready: Record<string, number>;
  cooking: Record<string, number>;
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
  /** 描画側が毎フレーム取り出して鳴らす */
  sfx: SoundId[];
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


const makeStaff = (hire: HireSpec, id: number): Staff => ({
  id,
  kind: hire.kind,
  pos: { ...hire.pos },
  carry: 0,
  item: null,
  stoveId: hire.stoveId ?? null,
  home: { ...hire.pos },
  area: hire.area,
  trips: 0,
  charge: 0,
  wait: 0,
  target: null,
});

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  stageId: currentStage.id,
  money: 0,
  unlocked: ["stove-1", "seat-0-1", "seat-0-2"],
  padProgress: {},
  levels: { carry: 0, speed: 0, cook: 0, price: 0, gate: 0 },
  served: 0,
  playTime: 0,
  lastSeen: Date.now(),
  player: { pos: { x: 180, y: 250 }, carry: 0, item: null, moving: false, step: 0 },
  staff: [],
  customers: [],
  coins: [],
  pops: [],
  ready: { "stove-1": 0 },
  cooking: { "stove-1": 0 },
  shelf: {},
  dirty: {},
  autoTimer: {},
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
        if (value >= pad.price) {
          // 値下げ後の価格をすでに払い終えているぶんは開放しておく
          if (!state.unlocked.includes(pad.id)) state.unlocked.push(pad.id);
        } else {
          state.padProgress[pad.id] = clamp(value, 0, pad.price);
        }
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
    }
  }
  const ticket = state.unlocked.includes("equip-ticket");
  state.staff = hires
    .filter((hire) => state.unlocked.includes(hire.id))
    .map((hire, index) => {
      const worker = makeStaff(hire, index + 1);
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

/** いま店内に出ている枠 */
export const availablePads = (state: ShopState) =>
  pads.filter((pad) => {
    // 値段が入っていない枠は出さない（データの取りこぼし対策）
    if (pad.kind !== "upgrade" && !Number.isFinite(pad.price)) return false;
    if (pad.kind === "upgrade" && pad.upgradeId) {
      const upgrade = upgradeById.get(pad.upgradeId);
      return !!upgrade && state.levels[pad.upgradeId] < upgrade.max;
    }
    if (state.unlocked.includes(pad.id)) return false;

    // 調理人はその寸胴を買ってから
    const hire = hireById.get(pad.id);
    if (hire?.kind === "collector" && hasEquip(state, "ticket")) return false;
    if (hire?.stoveId) return state.unlocked.includes(hire.stoveId);

    // 自動供給機は、その場所を買ってから出す
    if (pad.id.startsWith("auto-")) {
      const owner = seatById.get(pad.id.slice(5));
      return !!owner && state.unlocked.includes(owner.id);
    }

    // 席・店員・寸胴・設備は、その区画が開いてから出す。
    // unlockAfter が付いているものは、あとの区画が開くと古い区画にも出てくる
    const seat = seatById.get(pad.id);
    if (seat) {
      if (seat.unlockAfter && !state.unlocked.includes(seat.unlockAfter)) return false;
      return areaOpen(state, seat.area);
    }
    if (hire) {
      if (hire.unlockAfter && !state.unlocked.includes(hire.unlockAfter)) return false;
      return areaOpen(state, hire.area);
    }
    const stove = stoveById.get(pad.id);
    if (stove) {
      if (stove.unlockAfter && !state.unlocked.includes(stove.unlockAfter)) return false;
      return areaOpen(state, stove.area);
    }
    const equip = equipById.get(pad.id.replace("equip-", "") as EquipId);
    if (equip) {
      if (equip.unlockAfter && !state.unlocked.includes(equip.unlockAfter)) return false;
      return equip.outside || areaOpen(state, equip.area);
    }

    // 区画の枠は、ひとつ前の区画が開いてから出す
    const area = areaById.get(pad.id);
    if (area) {
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

  if (stoveById.has(padId)) {
    state.ready[padId] = 0;
    state.cooking[padId] = 0;
  }
  const hire = hireById.get(padId);
  if (hire) state.staff.push(makeStaff(hire, state.nextId++));


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

  // 園内で次を待っている人がいるあいだは、新しい客を入れない
  if (state.customers.some((customer) => customer.state === "roaming")) return;

  const taken = new Set(
    state.customers
      .filter((customer) => customer.state !== "leaving")
      .map((customer) => customer.seatId),
  );
  // 皿が残っているテーブルには次の客が入れない
  const free = openSeats(state).find(
    (seat) => !taken.has(seat.id) && !isDirty(state, seat.id),
  );
  if (!free) return;

  // 遊べる場所が多いほど、ひとりが何か所もまわる
  const variety = Math.min(9, Math.floor(openSeats(state).length * 0.8));
  state.customers.push({
    id: state.nextId++,
    seatId: free.id,
    state: hasGate() ? "buying" : "walking",
    pos: {
      x: streetPos(state).x + (Math.random() * 40 - 20),
      y: streetPos(state).y,
    },
    timer: 0,
    budget: 1 + Math.max(0, Math.floor(Math.random() * (variety + 1))),
    visits: 0,
  });


};

const updateStoves = (state: ShopState, dt: number) => {
  const factor = cookSpeedFactor(state);
  const capacity = stoveCapacity(state);
  for (const stove of openStoves(state)) {
    const ready = state.ready[stove.id] ?? 0;
    if (ready >= capacity) continue;
    const boost = stoveHasCook(state, stove.id) ? COOK_BOOST : 1;
    const progress =
      (state.cooking[stove.id] ?? 0) + (dt * boost) / (COOK_TIME * factor);
    if (progress >= 1) {
      state.ready[stove.id] = ready + 1;
      state.cooking[stove.id] = progress - 1;
    } else {
      state.cooking[stove.id] = progress;
    }
  }
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
  for (const customer of state.customers) {
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
) => {
  for (const customer of state.customers) {
    if (customer.state !== "waiting") continue;
    const seat = seatById.get(customer.seatId);
    if (!seat || seatMode(seat) === "shelf") continue;
    if (holding && seatNeeds(seat) !== holding) continue;
    const need = seatCost(seat);
    if (carry < need) continue;
    const reach = Math.min(dist(pos, seat.serve), dist(pos, seat.pos));
    if (reach > SERVE_RADIUS) continue;
    customer.state = "eating";
    customer.timer = seatMode(seat) === "table" ? EAT_TIME * 1.6 : EAT_TIME;
    const at = trayPos(seat);
    pop(state, { x: at.x, y: at.y - 12 }, need > 1 ? `${need}つ どうぞ！` : "どうぞ！");
    state.sfx.push("serve");
    return need;
  }
  return 0;
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

  const got = pickUp(state, player.pos, player.carry, maxCarry(state), player.item);
  if (got) {
    player.item = got;
    player.carry += 1;
  }
  if (player.carry > 0) {
    const used =
      player.item === "goods"
        ? restock(state, player.pos)
          ? 1
          : 0
        : serve(state, player.pos, player.item, player.carry);
    if (used > 0) {
      player.carry -= used;
      if (player.carry === 0) player.item = null;
    }
  }
  // 手ぶらのときは、残った皿を片づける
  if (player.carry === 0) clearTable(state, player.pos);

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
    if (remain <= 0) break;

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

    // ホール店員・配膳ロボ: 待っている相手に合うものを運ぶ
    const speed = carrierSpeed(state, worker);


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

      // 足りないときは、同じものをもう少し受け取りに行く
      const anyoneWaiting = state.customers.some(
        (customer) => customer.state === "waiting",
      );
      const more =
        anyoneWaiting && worker.carry < limit
          ? openStoves(state)
              .filter(
                (item) =>
                  stoveItem(item) === worker.item && (state.ready[item.id] ?? 0) > 0,
              )
              .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0]
          : null;
      if (more) {
        go(state, worker, approach(state, worker, more.pos), speed, dt);
        while (worker.carry < limit) {
          const item = pickUp(state, worker.pos, worker.carry, limit, worker.item);
          if (!item) break;
          worker.carry += 1;
        }
        continue;
      }

      // 出す相手がいないときは、作る場所に返しに行く（抱えたまま止まらない）
      // 空きがなくても、いちばん近い作る場所へ返す（あふれても止まらない）
      const back = openStoves(state)
        .filter((item) => stoveItem(item) === worker.item)
        .sort((a, b) => {
          const room =
            ((state.ready[a.id] ?? 0) < stoveCapacity(state) ? 0 : 1) -
            ((state.ready[b.id] ?? 0) < stoveCapacity(state) ? 0 : 1);
          if (room !== 0) return room;
          return dist(worker.pos, a.pos) - dist(worker.pos, b.pos);
        })[0];
      worker.target = null;
      if (back) {
        if (go(state, worker, approach(state, worker, back.pos), speed, dt)) {
          state.ready[back.id] = (state.ready[back.id] ?? 0) + worker.carry;
          worker.carry = 0;
          worker.item = null;
          pop(state, { x: worker.pos.x, y: worker.pos.y - 30 }, "戻した");
        }
        continue;
      }
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
      wanted.add(kind);
      demand.set(kind, (demand.get(kind) ?? 0) + seatCost(seat));
    }

    const ready = openStoves(state).filter(
      (item) =>
        (state.ready[item.id] ?? 0) > 0 &&
        (wanted.size === 0 ? stoveItem(item) === "main" : wanted.has(stoveItem(item))),
    );
    // すでに持っているものがあれば、それと同じ種類だけ足す
    const usable = worker.item
      ? ready.filter((item) => stoveItem(item) === worker.item)
      : ready;
    // ロボは在庫の多い場所へまとめて取りに行き、店員は近い場所から取る
    // 待っている人がいないときは、少しだけ持って待つ（満載で止まらない）
    const buffer =
      wanted.size === 0
        ? Math.min(limit, 2)
        : Math.min(
            limit,
            Math.max(
              2,
              Math.max(...Array.from(demand.values(), (count) => count)),
            ),
          );
    if (worker.carry >= buffer) {
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

  // 入口の仕事が先（自動化するまでは自分でやる）
  if (hasGate()) {
    if (!hasEquip(state, "vend") && atBooth(state).length > 0) {
      return {
        kind: "serve",
        pos: boothPos(state),
        label: `入場券を売ろう（${atBooth(state).length}人 待ち）`,
      };
    }
    if (!hasEquip(state, "turnstile") && atGate(state).length > 0) {
      return {
        kind: "serve",
        pos: turnstilePos(state),
        label: `改札を通そう（${atGate(state).length}人 待ち）`,
      };
    }
  }

  // 商品を持っているときは、空いている棚へ
  if (player.carry > 0 && player.item === "goods") {
    const shelf = openSeats(state)
      .filter(
        (seat) => seatMode(seat) === "shelf" && shelfStock(state, seat.id) < SHELF_MAX,
      )
      .sort((a, b) => dist(player.pos, a.tray) - dist(player.pos, b.tray))[0];
    if (shelf) {
      return { kind: "serve", pos: shelf.tray, label: "棚に商品を並べよう" };
    }
  }

  if (player.carry > 0 && waiting.length > 0) {
    const seat = waiting
      .map((customer) => seatById.get(customer.seatId))
      .find(
        (item): item is SeatSpec =>
          !!item && seatMode(item) !== "shelf" && seatNeeds(item) === player.item,
      );
    if (seat) {
      const need = seatCost(seat);
      if (need > player.carry) {
        return {
          kind: "pickup",
          pos: null,
          label: `${seat.label}には ${need}つ必要（いま ${player.carry}）`,
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

  // 手ぶらのときは、皿の残ったテーブルを片づける
  if (player.carry === 0) {
    const table = openSeats(state)
      .filter((seat) => seatMode(seat) === "table" && isDirty(state, seat.id))
      .sort((a, b) => dist(player.pos, a.serve) - dist(player.pos, b.serve))[0];
    if (table) {
      return { kind: "serve", pos: table.tray, label: "テーブルの皿を片づけよう" };
    }
  }

  // 空いている棚があれば、倉庫から商品を取りに行く
  if (player.carry === 0) {
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

  if (player.carry < maxCarry(state)) {
    const stove = openStoves(state)
      .filter(
        (item) =>
          (state.ready[item.id] ?? 0) > 0 &&
          (!player.item || stoveItem(item) === player.item),
      )
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

  const cookRate = openStoves(state).reduce(
    (sum, stove) =>
      sum +
      (stoveHasCook(state, stove.id) ? COOK_BOOST : 1) / (COOK_TIME * factor),
    0,
  );
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
  const perSecond = Math.min(cookRate, seatRate, carryRate);
  const earned = Math.floor(
    perSecond * capped * coinValue(state.levels.price) * worth * 0.75,
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
          : "近づくと売れる（自動入場券売機で自動になる）",
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
          : "近づくと通せる（自動改札機で自動になる）",
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
      } else {
        lines.push(
          `${stageLabels().item}を受け取って、待っている相手へ運ぶ`,
          `一度に ${carrierLimit(state, worker)}${unit}${
            worker.kind === "robot" ? "・足が速い" : ""
          }`,
          `いま ${worker.carry}${unit} 持っている`,
        );
      }
      if (worker.kind === "robot" || worker.kind === "waiter") {
        lines.push(
          worker.wait > 0
            ? `次の相手を選び直すまで あと ${worker.wait.toFixed(1)}秒`
            : `待っている ${ROBOT_PICKS}人のなかから、くじで選んで運ぶ`,
        );
      }
      if (worker.kind !== "cook" && worker.kind !== "master") {
        const zone = areaById.get(`area-${worker.area}`);
        lines.push(
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
      `運べる数 ${state.player.carry} / ${maxCarry(state)}`,
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
