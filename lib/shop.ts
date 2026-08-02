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

export type StoveSpec = {
  id: string;
  pos: Vec;
  price: number;
  area: number;
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
};

export type StaffKind = "waiter" | "robot" | "collector" | "cook" | "master";

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
};

import { stageDefs, type StageDef, type StageId } from "@/data/stages";

/** 歩いて入れる作業場（厨房・券売所の帯） */
export type Room = { top: number; bottom: number };

export type Rect = { x0: number; y0: number; x1: number; y1: number };

export type AreaPalette = {
  floor: string;
  deep: string;
  prop: "none" | "castle" | "snow" | "cactus" | "ship" | "star" | "fossil";
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

export type EquipId = "noodle" | "fridge" | "ticket" | "sign";

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
};

export type UpgradeId = "carry" | "speed" | "cook" | "price";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  detail: (level: number) => string;
  pos: Vec;
  basePrice: number;
  growth: number;
  max: number;
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
};

const hireSub: Record<StaffKind, string> = {
  waiter: "自分の代わりに運ぶ",
  robot: "とても速く運ぶ",
  collector: "自動でお金を拾う",
  cook: "この寸胴が速くなる",
  master: "すべての寸胴が1.4倍速くなる",
};

const buildPads = (): Pad[] => [
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

/** 店の外にある設備・枠の位置 */
export const outsidePos = (state: ShopState, x: number): Vec => ({
  x,
  y: outsideTop(state) + 56,
});

export const equipPos = (state: ShopState, item: EquipSpec): Vec =>
  item.outside ? outsidePos(state, item.pos.x) : item.pos;

export const padPosOf = (state: ShopState, pad: Pad): Vec => {
  if (!pad.outside) return pad.pos;
  return outsidePos(state, pad.pos.x);
};

export const worldHeight = (state: ShopState) => worldBounds(state).y1;

/** 入口（建物の南端） */
export const entrancePos = (state: ShopState): Vec => ({
  x: 306,
  y: outsideTop(state) - 16,
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
  state: "walking" | "waiting" | "eating" | "leaving";
  pos: Vec;
  timer: number;
};

export type Coin = { id: number; pos: Vec; value: number; age: number };

export type Pop = { id: number; pos: Vec; text: string; age: number };

export type Staff = {
  id: number;
  kind: StaffKind;
  pos: Vec;
  carry: number;
  stoveId: string | null;
};

export type Player = {
  pos: Vec;
  carry: number;
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
  stoveId: hire.stoveId ?? null,
});

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  stageId: currentStage.id,
  money: 0,
  unlocked: ["stove-1", "seat-0-1", "seat-0-2"],
  padProgress: {},
  levels: { carry: 0, speed: 0, cook: 0, price: 0 },
  served: 0,
  playTime: 0,
  lastSeen: Date.now(),
  player: { pos: { x: 180, y: 250 }, carry: 0, moving: false, step: 0 },
  staff: [],
  customers: [],
  coins: [],
  pops: [],
  ready: { "stove-1": 0 },
  cooking: { "stove-1": 0 },
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

export const playerSpeed = (state: ShopState) =>
  PLAYER_BASE_SPEED * (1 + state.levels.speed * 0.1);

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

export const spawnInterval = (state: ShopState) =>
  SPAWN_TIME / (hasEquip(state, "sign") ? 1.5 : 1);

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
    if (pad.kind === "upgrade" && pad.upgradeId) {
      const upgrade = upgradeById.get(pad.upgradeId);
      return !!upgrade && state.levels[pad.upgradeId] < upgrade.max;
    }
    if (state.unlocked.includes(pad.id)) return false;

    // 調理人はその寸胴を買ってから
    const hire = hireById.get(pad.id);
    if (hire?.kind === "collector" && hasEquip(state, "ticket")) return false;
    if (hire?.stoveId) return state.unlocked.includes(hire.stoveId);

    // 席・店員・寸胴・設備は、その区画が開いてから出す
    const seat = seatById.get(pad.id);
    if (seat) return areaOpen(state, seat.area);
    if (hire) return areaOpen(state, hire.area);
    const stove = stoveById.get(pad.id);
    if (stove) return areaOpen(state, stove.area);
    const equip = equipById.get(pad.id.replace("equip-", "") as EquipId);
    if (equip) return equip.outside || areaOpen(state, equip.area);

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
  const free = openSeats(state).find((seat) => !taken.has(seat.id));
  if (!free) return;

  state.customers.push({
    id: state.nextId++,
    seatId: free.id,
    state: "walking",
    pos: {
      x: streetPos(state).x + (Math.random() * 40 - 20),
      y: streetPos(state).y,
    },
    timer: 0,
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

const updateCustomers = (state: ShopState, dt: number) => {
  for (const customer of state.customers) {
    const seat = seatById.get(customer.seatId);
    if (!seat) continue;

    if (customer.state === "walking") {
      if (moveToward(customer.pos, seat.pos, 96, dt)) customer.state = "waiting";
    } else if (customer.state === "eating") {
      customer.timer -= dt;
      if (customer.timer <= 0) {
        customer.state = "leaving";
        const value = coinValue(state.levels.price);
        if (hasEquip(state, "ticket")) {
          // 券売機があるとお金は自動でサイフに入る
          state.money += value;
          pop(
            state,
            { x: seat.serve.x, y: seat.serve.y - 10 },
            `+${Math.round(value).toLocaleString("ja-JP")}円`,
          );
          state.sfx.push("coin");
        } else {
          state.coins.push({
            id: state.nextId++,
            pos: { x: seat.serve.x + (Math.random() * 18 - 9), y: seat.serve.y },
            value,
            age: 0,
          });
        }
        state.served += 1;
      }
    } else if (customer.state === "leaving") {
      if (moveToward(customer.pos, streetPos(state), 112, dt)) customer.id = -1;
    }
  }
  state.customers = state.customers.filter((customer) => customer.id !== -1);
};

const pickUp = (state: ShopState, pos: Vec, carry: number, limit: number) => {
  if (carry >= limit) return null;
  for (const stove of openStoves(state)) {
    if ((state.ready[stove.id] ?? 0) <= 0) continue;
    if (dist(pos, stove.pos) > PICK_RADIUS) continue;
    state.ready[stove.id] -= 1;
    return stove.id;
  }
  return null;
};

const serve = (state: ShopState, pos: Vec) => {
  for (const customer of state.customers) {
    if (customer.state !== "waiting") continue;
    const seat = seatById.get(customer.seatId);
    if (!seat) continue;
    const reach = Math.min(dist(pos, seat.serve), dist(pos, seat.pos));
    if (reach > SERVE_RADIUS) continue;
    customer.state = "eating";
    customer.timer = EAT_TIME;
    const at = trayPos(seat);
    pop(state, { x: at.x, y: at.y - 12 }, "どうぞ！");
    state.sfx.push("serve");
    return true;
  }
  return false;
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

  if (pickUp(state, player.pos, player.carry, maxCarry(state))) player.carry += 1;
  if (player.carry > 0 && serve(state, player.pos)) player.carry -= 1;

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

const carrierLimit = (state: ShopState, worker: Staff) =>
  worker.kind === "robot" ? Math.max(5, maxCarry(state)) : 3;

const carrierSpeed = (worker: Staff) =>
  worker.kind === "robot" ? ROBOT_SPEED : STAFF_SPEED;

/** 調理人の立ち位置（寸胴の奥） */
export const cookPost = (worker: Staff): Vec => {
  const stove = worker.stoveId ? stoveById.get(worker.stoveId) : null;
  if (!stove) return { x: 30, y: 120 };
  return { x: stove.pos.x, y: stove.pos.y - 40 };
};

const updateStaff = (state: ShopState, dt: number) => {
  for (const worker of state.staff) {
    if (worker.kind === "cook") {
      moveToward(worker.pos, cookPost(worker), STAFF_SPEED, dt);
      continue;
    }

    if (worker.kind === "master") {
      moveToward(worker.pos, { x: 180, y: 128 }, STAFF_SPEED, dt);
      continue;
    }

    if (worker.kind === "collector") {
      let best: Coin | null = null;
      let bestDist = Infinity;
      for (const coin of state.coins) {
        const d = dist(worker.pos, coin.pos);
        if (d < bestDist) {
          best = coin;
          bestDist = d;
        }
      }
      if (!best) {
        moveToward(worker.pos, { x: 230, y: 380 }, STAFF_SPEED * 0.6, dt);
        continue;
      }
      if (moveToward(worker.pos, best.pos, STAFF_SPEED, dt)) {
        collectCoin(state, best);
        state.coins = state.coins.filter((item) => item.id !== -1);
      }
      continue;
    }

    // ホール店員・配膳ロボ: 丼を集めて、待っている客に配る
    const speed = carrierSpeed(worker);
    if (worker.carry > 0) {
      const target = state.customers.find(
        (customer) => customer.state === "waiting",
      );
      const seat = target ? seatById.get(target.seatId) : null;
      if (!seat) {
        // 出す相手がいないあいだは持ったまま待つ（捨てない）
        moveToward(worker.pos, { x: 180, y: 250 }, speed * 0.5, dt);
        continue;
      }
      if (moveToward(worker.pos, seat.serve, speed, dt)) {
        if (serve(state, worker.pos)) worker.carry -= 1;
      }
      continue;
    }

    const stove = openStoves(state)
      .filter((item) => (state.ready[item.id] ?? 0) > 0)
      .sort((a, b) => dist(worker.pos, a.pos) - dist(worker.pos, b.pos))[0];
    if (!stove) {
      moveToward(worker.pos, { x: 90, y: 250 }, speed * 0.6, dt);
      continue;
    }
    if (moveToward(worker.pos, stove.pos, speed, dt)) {
      const limit = carrierLimit(state, worker);
      while (worker.carry < limit) {
        if (!pickUp(state, worker.pos, worker.carry, limit)) break;
        worker.carry += 1;
      }
    }
  }
};

export const update = (state: ShopState, input: Input, dt: number) => {
  state.playTime += dt;
  updateStoves(state, dt);
  spawnCustomers(state, dt);
  updateCustomers(state, dt);
  updatePlayer(state, input, dt);
  updateStaff(state, dt);
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

  if (state.player.carry > 0 && waiting.length > 0) {
    const seat = seatById.get(waiting[0].seatId);
    if (seat) {
      return {
        kind: "serve",
        pos: trayPos(seat),
        label: stageLabels().objective.serve,
      };
    }
  }

  if (state.player.carry < maxCarry(state)) {
    const stove = openStoves(state)
      .filter((item) => (state.ready[item.id] ?? 0) > 0)
      .sort(
        (a, b) => dist(state.player.pos, a.pos) - dist(state.player.pos, b.pos),
      )[0];
    if (stove) {
      return {
        kind: "pickup",
        pos: stove.pos,
        label: stageLabels().objective.pickup,
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
  const seatRate = openSeats(state).length / (EAT_TIME + 2.2);
  const carryRate = carriers.reduce(
    (sum, worker) => sum + (worker.kind === "robot" ? 0.95 : 0.55),
    0,
  );
  const perSecond = Math.min(cookRate, seatRate, carryRate);
  const earned = Math.floor(
    perSecond * capped * coinValue(state.levels.price) * 0.75,
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
  consider(
    { x: streetPos(state).x, y: streetPos(state).y },
    40,
    () => ({
      title: stageLabels().outside,
      lines: [
        `${stageLabels().guest}はここから入ってくる`,
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
      return {
        title: L.producer,
        lines: [
          `${seconds.toFixed(1)}秒に1${L.item === "丼" ? "杯" : "枚"}できる`,
          `${stoveCapacity(state)}まで置いておける`,
          hasCook ? `${L.staff.cook}が付いている` : `${L.staff.cook}を雇うと2.2倍速`,
          "近づくと自動で受け取る",
        ],
        pos: stove.pos,
      };
    });
  }

  for (const seat of openSeats(state)) {
    const tray = trayPos(seat);
    const make = (): Inspect => ({
      title: seat.label,
      lines: [
        `${stageLabels().guest}が${stageLabels().item}を待つ`,
        `光っている${stageLabels().tray}に持っていくと渡せる`,
        `終わると ${yen(coinValue(state.levels.price))} 置いていく`,
      ],
      pos: tray,
    });
    consider(tray, 30, make);
    consider(seat.pos, 30, make);
  }

  for (const worker of state.staff) {
    consider(worker.pos, 22, () => {
      const lines: string[] = [];
      if (worker.kind === "cook") {
        lines.push("寸胴の前に立って調理を速くする", `いまの倍率 ${COOK_BOOST}倍`);
      } else if (worker.kind === "master") {
        lines.push("厨房を仕切り、すべての寸胴を1.4倍速にする");
      } else if (worker.kind === "collector") {
        lines.push("落ちたお金を拾ってくれる");
      } else {
        lines.push(
          "丼を受け取って、待っている席へ運ぶ",
          worker.kind === "robot"
            ? `一度に ${Math.max(5, maxCarry(state))}杯・足が速い`
            : "一度に 3杯",
          `いま ${worker.carry}杯 持っている`,
        );
      }
      return { title: staffLabel(worker.kind), lines, pos: worker.pos };
    });
  }

  for (const customer of state.customers) {
    consider(customer.pos, 22, () => ({
      title: stageLabels().guest,
      lines:
        customer.state === "waiting"
          ? [`${stageLabels().item}を待っている`, `${stageLabels().tray}まで運ぼう`]
          : customer.state === "eating"
            ? [`${stageLabels().using}（あと ${Math.max(0, customer.timer).toFixed(1)}秒）`]
            : ["席へ向かっている"],
      pos: customer.pos,
    }));
  }

  consider(state.player.pos, 24, () => ({
    title: "あなた",
    lines: [
      `運べる数 ${state.player.carry} / ${maxCarry(state)}杯`,
      `足の速さ +${state.levels.speed * 10}%`,
      "スワイプで移動・近づくだけで持つ／出す",
    ],
    pos: state.player.pos,
  }));

  return best ? (best as { make: () => Inspect }).make() : null;
};
