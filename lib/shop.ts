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
};

export type SeatSpec = {
  id: string;
  /** 客が座る位置 */
  pos: Vec;
  /** 店側（立って渡す）位置 */
  serve: Vec;
  price: number;
  row: 0 | 1;
};

export type StaffKind = "waiter" | "robot" | "collector" | "cook";

export type HireSpec = {
  id: string;
  kind: StaffKind;
  pos: Vec;
  price: number;
  label: string;
  /** 調理人が担当する寸胴 */
  stoveId?: string;
};

/** 厨房エリア（歩いて入れる） */
export const KITCHEN = { top: 38, bottom: 210 };

export const stoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 72, y: 176 }, price: 0 },
  { id: "stove-2", pos: { x: 180, y: 176 }, price: 150 },
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 700 },
];

const rowA = [60, 140, 220, 300];
const rowB = [96, 180, 264];

export const seats: SeatSpec[] = [
  ...rowA.map((x, i) => ({
    id: `seat-a${i + 1}`,
    pos: { x, y: 358 },
    serve: { x, y: 294 },
    price: [0, 0, 100, 300][i],
    row: 0 as const,
  })),
  ...rowB.map((x, i) => ({
    id: `seat-b${i + 1}`,
    pos: { x, y: 520 },
    serve: { x, y: 466 },
    price: [800, 1800, 3600][i],
    row: 1 as const,
  })),
];

/** 調理人は寸胴の奥（厨房の中）で雇う */
export const hires: HireSpec[] = [
  ...stoves.map((stove, i) => ({
    id: `cook-${i + 1}`,
    kind: "cook" as const,
    pos: { x: stove.pos.x + 40, y: 130 },
    price: [600, 1800, 4500][i],
    label: "調理人",
    stoveId: stove.id,
  })),
  {
    id: "waiter-1",
    kind: "waiter",
    pos: { x: 50, y: 414 },
    price: 280,
    label: "ホール店員",
  },
  {
    id: "waiter-2",
    kind: "waiter",
    pos: { x: 130, y: 414 },
    price: 1500,
    label: "ホール店員",
  },
  {
    id: "collector-1",
    kind: "collector",
    pos: { x: 230, y: 414 },
    price: 900,
    label: "レジ係",
  },
  {
    id: "robot-1",
    kind: "robot",
    pos: { x: 310, y: 414 },
    price: 4000,
    label: "配膳ロボ",
  },
];

/* ---------- 強化（厨房の中の設置物） ---------- */

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

export const cookFactor = (level: number) => Math.pow(0.92, level);
export const coinValue = (level: number) => Math.round(55 * Math.pow(1.4, level));

export const upgrades: Upgrade[] = [
  {
    id: "carry",
    name: "両手鍋",
    detail: (level) => `${3 + level}杯まで持てる`,
    pos: { x: 46, y: 66 },
    basePrice: 60,
    growth: 1.7,
    max: 9,
  },
  {
    id: "speed",
    name: "厨房シューズ",
    detail: (level) => `足の速さ +${level * 10}%`,
    pos: { x: 138, y: 66 },
    basePrice: 50,
    growth: 1.65,
    max: 12,
  },
  {
    id: "cook",
    name: "業務用寸胴",
    detail: (level) =>
      `煮える速さ +${Math.round((1 / cookFactor(level) - 1) * 100)}%`,
    pos: { x: 230, y: 66 },
    basePrice: 80,
    growth: 1.7,
    max: 14,
  },
  {
    id: "price",
    name: "看板メニュー",
    detail: (level) => `一杯 ${coinValue(level)}円`,
    pos: { x: 314, y: 66 },
    basePrice: 120,
    growth: 1.75,
    max: 20,
  },
];

export const upgradeById = new Map(upgrades.map((item) => [item.id, item]));

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
};

const hireSub: Record<StaffKind, string> = {
  waiter: "自分の代わりに運ぶ",
  robot: "とても速く運ぶ",
  collector: "自動でお金を拾う",
  cook: "この寸胴が速くなる",
};

export const pads: Pad[] = [
  ...stoves
    .filter((stove) => stove.price > 0)
    .map((stove): Pad => ({
      id: stove.id,
      kind: "unlock",
      pos: stove.pos,
      price: stove.price,
      label: "寸胴",
      sub: "同時に作れる数が増える",
    })),
  ...seats
    .filter((seat) => seat.price > 0)
    .map((seat): Pad => ({
      id: seat.id,
      kind: "unlock",
      pos: seat.serve,
      price: seat.price,
      label: seat.row === 0 ? "カウンター席" : "テーブル席",
      sub: "お客さんが増える",
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

export const padById = new Map(pads.map((pad) => [pad.id, pad]));

export const ENTRANCE: Vec = { x: 180, y: 598 };

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
  money: number;
  unlocked: string[];
  padProgress: Record<string, number>;
  levels: Record<UpgradeId, number>;
  served: number;
  playTime: number;
  lastSeen: number;
};

export type ShopState = Persisted & {
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

export const seatById = new Map(seats.map((seat) => [seat.id, seat]));
export const stoveById = new Map(stoves.map((stove) => [stove.id, stove]));
export const hireById = new Map(hires.map((hire) => [hire.id, hire]));

const makeStaff = (hire: HireSpec, id: number): Staff => ({
  id,
  kind: hire.kind,
  pos: { ...hire.pos },
  carry: 0,
  stoveId: hire.stoveId ?? null,
});

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  money: 0,
  unlocked: ["stove-1", "seat-a1", "seat-a2"],
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
  ]);
  if (Array.isArray(raw.unlocked)) {
    const list = raw.unlocked.filter(
      (id): id is string => typeof id === "string" && valid.has(id),
    );
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
  state.staff = hires
    .filter((hire) => state.unlocked.includes(hire.id))
    .map((hire, index) => makeStaff(hire, index + 1));
  state.nextId = state.staff.length + 1;

  return state;
};

/* ---------- 参照 ---------- */

export const openStoves = (state: ShopState) =>
  stoves.filter((stove) => state.unlocked.includes(stove.id));

export const openSeats = (state: ShopState) =>
  seats.filter((seat) => state.unlocked.includes(seat.id));

export const maxCarry = (state: ShopState) => 3 + state.levels.carry;

export const playerSpeed = (state: ShopState) =>
  PLAYER_BASE_SPEED * (1 + state.levels.speed * 0.1);

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
    if (hire?.stoveId) return state.unlocked.includes(hire.stoveId);

    // テーブル席はカウンターを全部開けてから
    const seat = seatById.get(pad.id);
    if (seat && seat.row === 1) {
      return seats
        .filter((item) => item.row === 0)
        .every((item) => state.unlocked.includes(item.id));
    }
    return true;
  });

/** 配膳口（丼を置く場所）の見た目上の位置 */
export const trayPos = (seat: SeatSpec): Vec => ({
  x: seat.serve.x,
  y: seat.row === 0 ? 318 : 488,
});

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

  const pad = padById.get(padId);
  state.toast = { text: `${pad?.label ?? ""}を手に入れた！`, at: Date.now() };
  state.sfx.push("buy");
};

const spawnCustomers = (state: ShopState, dt: number) => {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = SPAWN_TIME;

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
    pos: { x: ENTRANCE.x + (Math.random() * 40 - 20), y: ENTRANCE.y },
    timer: 0,
  });
};

const updateStoves = (state: ShopState, dt: number) => {
  const factor = cookFactor(state.levels.cook);
  for (const stove of openStoves(state)) {
    const ready = state.ready[stove.id] ?? 0;
    if (ready >= STOVE_CAPACITY) continue;
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
        state.coins.push({
          id: state.nextId++,
          pos: { x: seat.serve.x + (Math.random() * 18 - 9), y: seat.serve.y },
          value: coinValue(state.levels.price),
          age: 0,
        });
        state.served += 1;
      }
    } else if (customer.state === "leaving") {
      if (moveToward(customer.pos, ENTRANCE, 112, dt)) customer.id = -1;
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
    player.pos.x = clamp(player.pos.x + nx * speed * scale * dt, 18, WORLD.w - 18);
    player.pos.y = clamp(player.pos.y + ny * speed * scale * dt, 54, 566);
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
    if (dist(player.pos, pad.pos) > PAD_RADIUS) continue;
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
        pop(state, { x: pad.pos.x, y: pad.pos.y - 16 }, "強化！");
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
        label: "光っている配膳口まで運ぼう",
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
      return { kind: "pickup", pos: stove.pos, label: "厨房で丼を受け取ろう" };
    }
  }

  if (state.coins.length > 0) {
    return {
      kind: "coin",
      pos: state.coins[0].pos,
      label: "お金を踏んで回収しよう",
    };
  }

  if (waiting.length > 0) {
    return { kind: "wait", pos: null, label: "丼ができるまで待とう" };
  }
  return { kind: "wait", pos: null, label: "お客さんを待っています" };
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
  const factor = cookFactor(state.levels.cook);

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
  }

  lines.push(paid > 0 ? `残り ${yen(price - paid)}（${yen(price)}）` : yen(price));
  lines.push("枠の上に立つと払える");
  return {
    title: pad.kind === "upgrade" ? `${pad.label}（強化）` : pad.label,
    lines,
    pos: pad.pos,
  };
};

const staffLabel: Record<StaffKind, string> = {
  waiter: "ホール店員",
  robot: "配膳ロボ",
  collector: "レジ係",
  cook: "調理人",
};

/** その場所にあるものの説明を返す */
export const inspectAt = (state: ShopState, at: Vec): Inspect | null => {
  let best: { d: number; make: () => Inspect } | null = null;
  const consider = (pos: Vec, radius: number, make: () => Inspect) => {
    const d = dist(at, pos);
    if (d > radius) return;
    if (!best || d < best.d) best = { d, make };
  };

  for (const pad of availablePads(state)) {
    consider(pad.pos, PAD_RADIUS + 10, () => padInspect(state, pad));
  }

  for (const stove of openStoves(state)) {
    consider(stove.pos, 34, () => {
      const hasCook = stoveHasCook(state, stove.id);
      const seconds =
        (COOK_TIME * cookFactor(state.levels.cook)) / (hasCook ? COOK_BOOST : 1);
      return {
        title: "寸胴",
        lines: [
          `${seconds.toFixed(1)}秒に1杯できる`,
          `${STOVE_CAPACITY}杯まで置いておける`,
          hasCook ? "調理人が付いている" : "調理人を雇うと2.2倍速",
          "近づくと自動で持ち上げる",
        ],
        pos: stove.pos,
      };
    });
  }

  for (const seat of openSeats(state)) {
    const tray = trayPos(seat);
    const make = (): Inspect => ({
      title: seat.row === 0 ? "カウンター席" : "テーブル席",
      lines: [
        "お客さんが座って丼を待つ",
        "光っている配膳口に持っていくと出せる",
        `食べ終わると ${yen(coinValue(state.levels.price))} 置いていく`,
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
      return { title: staffLabel[worker.kind], lines, pos: worker.pos };
    });
  }

  for (const customer of state.customers) {
    consider(customer.pos, 22, () => ({
      title: "お客さん",
      lines:
        customer.state === "waiting"
          ? ["丼を待っている", "配膳口まで運ぼう"]
          : customer.state === "eating"
            ? [`食べている（あと ${Math.max(0, customer.timer).toFixed(1)}秒）`]
            : ["席へ向かっている"],
      pos: customer.pos,
    }));
  }

  consider(state.player.pos, 24, () => ({
    title: "店主（あなた）",
    lines: [
      `運べる数 ${state.player.carry} / ${maxCarry(state)}杯`,
      `足の速さ +${state.levels.speed * 10}%`,
      "スワイプで移動・近づくだけで持つ／出す",
    ],
    pos: state.player.pos,
  }));

  return best ? (best as { make: () => Inspect }).make() : null;
};
