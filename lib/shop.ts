/**
 * アーケードアイドル（My Perfect Hotel / Pizza Ready 系）のラーメン屋シミュレーション。
 *
 * 中核のループ:
 *   1. プレイヤーを直接動かす
 *   2. 調理台のどんぶりを拾う（頭の上に積み上がる）
 *   3. 席で待っている客に運ぶ
 *   4. 食べ終わった客がカウンターにお金を置く → 歩いて拾う
 *   5. 解放パッドの上に立つとお金が吸い出され、席や調理台が増える
 *   6. 店員を雇うと 2〜4 を自動でやってくれる（＝放置で増える）
 */

export type Vec = { x: number; y: number };

export const WORLD = { w: 360, h: 560 };

export const SAVE_KEY = "ramen-arcade-idle-v1";
export const SAVE_VERSION = 1;

/* ---------- 設備の配置 ---------- */

export type StoveSpec = {
  id: string;
  /** 見た目（寸胴）の位置 */
  pos: Vec;
  /** 店主が立って受け取る位置（カウンターの手前） */
  stand: Vec;
  price: number;
};

export type SeatSpec = {
  id: string;
  /** 客が座る位置 */
  pos: Vec;
  /** 店側（プレイヤーが立って渡す）位置 */
  serve: Vec;
  price: number;
  row: 0 | 1;
};

export type HireSpec = {
  id: string;
  kind: "waiter" | "collector";
  pos: Vec;
  price: number;
  label: string;
};

export const stoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 72, y: 116 }, stand: { x: 72, y: 172 }, price: 0 },
  { id: "stove-2", pos: { x: 180, y: 116 }, stand: { x: 180, y: 172 }, price: 260 },
  { id: "stove-3", pos: { x: 288, y: 116 }, stand: { x: 288, y: 172 }, price: 1400 },
];

const rowA = [60, 140, 220, 300];
const rowB = [96, 180, 264];

export const seats: SeatSpec[] = [
  ...rowA.map((x, i) => ({
    id: `seat-a${i + 1}`,
    pos: { x, y: 350 },
    serve: { x, y: 288 },
    price: [0, 45, 170, 520][i],
    row: 0 as const,
  })),
  ...rowB.map((x, i) => ({
    id: `seat-b${i + 1}`,
    pos: { x, y: 470 },
    serve: { x, y: 424 },
    price: [1100, 2600, 5400][i],
    row: 1 as const,
  })),
];

export const hires: HireSpec[] = [
  {
    id: "waiter-1",
    kind: "waiter",
    pos: { x: 60, y: 380 },
    price: 700,
    label: "ホール店員",
  },
  {
    id: "waiter-2",
    kind: "waiter",
    pos: { x: 140, y: 380 },
    price: 3400,
    label: "ホール店員",
  },
  {
    id: "collector-1",
    kind: "collector",
    pos: { x: 220, y: 380 },
    price: 1800,
    label: "レジ係",
  },
  {
    id: "collector-2",
    kind: "collector",
    pos: { x: 300, y: 380 },
    price: 7200,
    label: "レジ係",
  },
];

export type Pad = {
  id: string;
  pos: Vec;
  price: number;
  label: string;
  sub: string;
};

export const pads: Pad[] = [
  ...stoves
    .filter((stove) => stove.price > 0)
    .map((stove) => ({
      id: stove.id,
      pos: stove.stand,
      price: stove.price,
      label: "調理台",
      sub: "同時に作れる数が増える",
    })),
  ...seats
    .filter((seat) => seat.price > 0)
    .map((seat) => ({
      id: seat.id,
      pos: seat.serve,
      price: seat.price,
      label: seat.row === 0 ? "カウンター席" : "テーブル席",
      sub: "お客さんが増える",
    })),
  ...hires.map((hire) => ({
    id: hire.id,
    pos: hire.pos,
    price: hire.price,
    label: hire.label,
    sub: hire.kind === "waiter" ? "自動で運んでくれる" : "自動でお金を拾う",
  })),
];

export const padById = new Map(pads.map((pad) => [pad.id, pad]));

export const ENTRANCE: Vec = { x: 180, y: 548 };

/* ---------- 強化 ---------- */

export type UpgradeId = "carry" | "speed" | "cook" | "price";

export type Upgrade = {
  id: UpgradeId;
  name: string;
  detail: (level: number) => string;
  basePrice: number;
  growth: number;
  max: number;
};

export const upgrades: Upgrade[] = [
  {
    id: "carry",
    name: "両手鍋",
    detail: (level) => `一度に運べる数 ${3 + level}杯`,
    basePrice: 120,
    growth: 2.1,
    max: 9,
  },
  {
    id: "speed",
    name: "厨房シューズ",
    detail: (level) => `移動速度 +${level * 10}%`,
    basePrice: 90,
    growth: 1.85,
    max: 12,
  },
  {
    id: "cook",
    name: "業務用寸胴",
    detail: (level) => `調理速度 +${Math.round((1 / cookFactor(level) - 1) * 100)}%`,
    basePrice: 150,
    growth: 1.95,
    max: 14,
  },
  {
    id: "price",
    name: "看板メニュー",
    detail: (level) => `一杯の値段 ${coinValue(level)}円`,
    basePrice: 200,
    growth: 2.0,
    max: 20,
  },
];

export const upgradeById = new Map(upgrades.map((item) => [item.id, item]));

export const cookFactor = (level: number) => Math.pow(0.92, level);
export const coinValue = (level: number) => Math.round(8 * Math.pow(1.35, level));

export const upgradePrice = (id: UpgradeId, level: number) => {
  const upgrade = upgradeById.get(id);
  if (!upgrade) return Infinity;
  return Math.ceil(upgrade.basePrice * Math.pow(upgrade.growth, level));
};

/* ---------- 状態 ---------- */

export type Customer = {
  id: number;
  seatId: string;
  state: "walking" | "waiting" | "eating" | "leaving";
  pos: Vec;
  timer: number;
};

export type Coin = {
  id: number;
  pos: Vec;
  value: number;
  age: number;
};

export type Pop = {
  id: number;
  pos: Vec;
  text: string;
  age: number;
};

export type Staff = {
  id: number;
  kind: "waiter" | "collector";
  pos: Vec;
  carry: number;
  cooldown: number;
  targetId: string | null;
};

export type Player = {
  pos: Vec;
  carry: number;
  facing: number;
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
  /** 調理台ごとの完成した丼の数 */
  ready: Record<string, number>;
  cooking: Record<string, number>;
  spawnTimer: number;
  nextId: number;
  /** いま乗っているパッド */
  activePad: string | null;
  toast: { text: string; at: number } | null;
};

export const PLAYER_BASE_SPEED = 122;
export const STAFF_SPEED = 88;
export const PICK_RADIUS = 40;
export const SERVE_RADIUS = 46;
export const COIN_RADIUS = 34;
export const PAD_RADIUS = 26;
export const STOVE_CAPACITY = 5;
export const COOK_TIME = 2.4;
export const EAT_TIME = 3.4;
export const SPAWN_TIME = 1.5;

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

export const createState = (): ShopState => ({
  version: SAVE_VERSION,
  money: 0,
  unlocked: ["stove-1", "seat-a1"],
  padProgress: {},
  levels: { carry: 0, speed: 0, cook: 0, price: 0 },
  served: 0,
  playTime: 0,
  lastSeen: Date.now(),
  player: {
    pos: { x: 180, y: 232 },
    carry: 0,
    facing: -Math.PI / 2,
    moving: false,
    step: 0,
  },
  staff: [],
  customers: [],
  coins: [],
  pops: [],
  ready: { "stove-1": 0 },
  cooking: { "stove-1": 0 },
  spawnTimer: 0.6,
  nextId: 1,
  activePad: null,
  toast: null,
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

  if (Array.isArray(raw.unlocked)) {
    const valid = new Set<string>([
      ...stoves.map((item) => item.id),
      ...seats.map((item) => item.id),
      ...hires.map((item) => item.id),
    ]);
    const list = raw.unlocked.filter(
      (id): id is string => typeof id === "string" && valid.has(id),
    );
    state.unlocked = Array.from(new Set([...state.unlocked, ...list]));
  }

  if (raw.padProgress && typeof raw.padProgress === "object") {
    for (const pad of pads) {
      const value = finite(
        (raw.padProgress as Record<string, number>)[pad.id],
        0,
      );
      if (value > 0) state.padProgress[pad.id] = clamp(value, 0, pad.price);
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
    .map((hire, index) => ({
      id: index + 1,
      kind: hire.kind,
      pos: { ...hire.pos },
      carry: 0,
      cooldown: 0,
      targetId: null,
    }));
  state.nextId = state.staff.length + 1;

  return state;
};

/* ---------- 参照ヘルパー ---------- */

export const openStoves = (state: ShopState) =>
  stoves.filter((stove) => state.unlocked.includes(stove.id));

export const openSeats = (state: ShopState) =>
  seats.filter((seat) => state.unlocked.includes(seat.id));

export const maxCarry = (state: ShopState) => 3 + state.levels.carry;

export const playerSpeed = (state: ShopState) =>
  PLAYER_BASE_SPEED * (1 + state.levels.speed * 0.1);

export const seatById = new Map(seats.map((seat) => [seat.id, seat]));
export const stoveById = new Map(stoves.map((stove) => [stove.id, stove]));
export const hireById = new Map(hires.map((hire) => [hire.id, hire]));

/** いま解放できる（＝前提を満たした）パッド */
export const availablePads = (state: ShopState) =>
  pads.filter((pad) => {
    if (state.unlocked.includes(pad.id)) return false;
    const seat = seatById.get(pad.id);
    if (seat && seat.row === 1) {
      // テーブル席はカウンターを全部開けてから
      return seats
        .filter((item) => item.row === 0)
        .every((item) => state.unlocked.includes(item.id));
    }
    return true;
  });

/* ---------- 更新 ---------- */

export type Input = { x: number; y: number };

const takeMoney = (state: ShopState, amount: number) => {
  const paid = Math.min(state.money, amount);
  state.money -= paid;
  return paid;
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
  if (hire) {
    state.staff.push({
      id: state.nextId++,
      kind: hire.kind,
      pos: { ...hire.pos },
      carry: 0,
      cooldown: 0,
      targetId: null,
    });
  }
  const pad = padById.get(padId);
  state.toast = { text: `${pad?.label ?? ""}を開放した！`, at: Date.now() };
};

const spawnCustomers = (state: ShopState, dt: number) => {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = SPAWN_TIME;

  const taken = new Set(state.customers.map((customer) => customer.seatId));
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
    const progress = (state.cooking[stove.id] ?? 0) + dt / (COOK_TIME * factor);
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
      if (moveToward(customer.pos, seat.pos, 74, dt)) customer.state = "waiting";
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
      if (moveToward(customer.pos, ENTRANCE, 84, dt)) customer.id = -1;
    }
  }
  state.customers = state.customers.filter((customer) => customer.id !== -1);
};

/** 丼を1杯拾う。拾えたら true */
const pickUp = (state: ShopState, pos: Vec, carry: number, limit: number) => {
  if (carry >= limit) return null;
  for (const stove of openStoves(state)) {
    if ((state.ready[stove.id] ?? 0) <= 0) continue;
    if (dist(pos, stove.stand) > PICK_RADIUS) continue;
    state.ready[stove.id] -= 1;
    return stove.id;
  }
  return null;
};

/** 待っている客に1杯出す。出せたら true */
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
    state.pops.push({
      id: state.nextId++,
      pos: { x: at.x, y: at.y - 12 },
      text: "どうぞ！",
      age: 0,
    });
    return true;
  }
  return false;
};

const nearestCoin = (state: ShopState, pos: Vec) => {
  let best: Coin | null = null;
  let bestDist = Infinity;
  for (const coin of state.coins) {
    const d = dist(pos, coin.pos);
    if (d < bestDist) {
      best = coin;
      bestDist = d;
    }
  }
  return best;
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
    player.pos.y = clamp(player.pos.y + ny * speed * scale * dt, 152, 516);
    player.facing = Math.atan2(ny, nx);
    player.step += dt * speed * 0.06 * scale;
  }

  // 拾う・出す・お金を集める
  if (pickUp(state, player.pos, player.carry, maxCarry(state))) {
    player.carry += 1;
  }
  if (player.carry > 0 && serve(state, player.pos)) {
    player.carry -= 1;
  }
  for (const coin of state.coins) {
    if (dist(player.pos, coin.pos) <= COIN_RADIUS) {
      state.money += coin.value;
      coin.id = -1;
      state.pops.push({
        id: state.nextId++,
        pos: { x: coin.pos.x, y: coin.pos.y - 10 },
        text: `+${Math.round(coin.value).toLocaleString("ja-JP")}円`,
        age: 0,
      });
    }
  }
  state.coins = state.coins.filter((coin) => coin.id !== -1);
};

const updatePads = (state: ShopState, dt: number) => {
  const player = state.player;
  let active: string | null = null;

  for (const pad of availablePads(state)) {
    if (dist(player.pos, pad.pos) > PAD_RADIUS) continue;
    active = pad.id;
    const paid = state.padProgress[pad.id] ?? 0;
    const remain = pad.price - paid;
    if (remain <= 0) continue;
    const rate = Math.max(45, pad.price / 3);
    const want = Math.min(remain, rate * dt);
    const got = takeMoney(state, want);
    const next = paid + got;
    state.padProgress[pad.id] = next;
    if (next >= pad.price - 0.001) unlock(state, pad.id);
    break;
  }
  state.activePad = active;
};

const updateStaff = (state: ShopState, dt: number) => {
  for (const worker of state.staff) {
    if (worker.kind === "collector") {
      const coin = nearestCoin(state, worker.pos);
      if (!coin) {
        moveToward(worker.pos, hires[2].pos, STAFF_SPEED * 0.6, dt);
        continue;
      }
      if (moveToward(worker.pos, coin.pos, STAFF_SPEED, dt)) {
        state.money += coin.value;
        coin.id = -1;
        state.pops.push({
          id: state.nextId++,
          pos: { x: coin.pos.x, y: coin.pos.y - 10 },
          text: `+${Math.round(coin.value).toLocaleString("ja-JP")}円`,
          age: 0,
        });
        state.coins = state.coins.filter((item) => item.id !== -1);
      }
      continue;
    }

    // ホール店員: 丼を集めて、待っている客に配る
    if (worker.carry > 0) {
      const target = state.customers.find(
        (customer) => customer.state === "waiting",
      );
      const seat = target ? seatById.get(target.seatId) : null;
      if (!seat) {
        worker.carry = 0;
        continue;
      }
      if (moveToward(worker.pos, seat.serve, STAFF_SPEED, dt)) {
        if (serve(state, worker.pos)) worker.carry -= 1;
      }
      continue;
    }

    const stove = openStoves(state)
      .filter((item) => (state.ready[item.id] ?? 0) > 0)
      .sort((a, b) => dist(worker.pos, a.stand) - dist(worker.pos, b.stand))[0];
    if (!stove) {
      moveToward(worker.pos, hires[0].pos, STAFF_SPEED * 0.6, dt);
      continue;
    }
    if (moveToward(worker.pos, stove.stand, STAFF_SPEED, dt)) {
      const limit = Math.min(3, maxCarry(state));
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
  for (const pop of state.pops) pop.age += dt;
  state.pops = state.pops.filter((pop) => pop.age < 1);
};

/* ---------- 強化 ---------- */

export const buyUpgrade = (state: ShopState, id: UpgradeId) => {
  const upgrade = upgradeById.get(id);
  if (!upgrade) return false;
  const level = state.levels[id];
  if (level >= upgrade.max) return false;
  const price = upgradePrice(id, level);
  if (state.money < price) return false;
  state.money -= price;
  state.levels[id] = level + 1;
  return true;
};

/* ---------- 放置収入 ---------- */

export type OfflineReport = { seconds: number; earned: number };

export const OFFLINE_CAP_HOURS = 8;

/** 店員が居るあいだだけ、閉じているあいだも稼ぐ */
export const applyOffline = (
  state: ShopState,
  now: number,
): OfflineReport | null => {
  const elapsed = (now - state.lastSeen) / 1000;
  state.lastSeen = now;
  if (!Number.isFinite(elapsed) || elapsed < 60) return null;

  const waiters = state.staff.filter((item) => item.kind === "waiter").length;
  if (waiters === 0) return null;

  const capped = Math.min(elapsed, OFFLINE_CAP_HOURS * 3600);
  const seatCount = openSeats(state).length;
  const stoveCount = openStoves(state).length;
  const factor = cookFactor(state.levels.cook);

  // 1秒あたりに出せる杯数は「調理の速さ」と「席数」の小さい方で決まる
  const cookRate = stoveCount / (COOK_TIME * factor);
  const seatRate = seatCount / (EAT_TIME + 2.5);
  const carryRate = waiters * 0.42;
  const perSecond = Math.min(cookRate, seatRate, carryRate);
  const earned = Math.floor(
    perSecond * capped * coinValue(state.levels.price) * 0.6,
  );
  if (earned <= 0) return null;

  state.money += earned;
  state.playTime += capped;
  return { seconds: capped, earned };
};

/* ---------- 案内 ---------- */

export type Objective =
  | { kind: "pickup"; pos: Vec; label: string }
  | { kind: "serve"; pos: Vec; label: string }
  | { kind: "coin"; pos: Vec; label: string }
  | { kind: "wait"; pos: null; label: string };

/** 配膳口（丼を置く場所）の見た目上の位置 */
export const trayPos = (seat: SeatSpec): Vec => ({
  x: seat.serve.x,
  y: seat.row === 0 ? 310 : 442,
});

/** いま何をすればいいか。画面の案内表示に使う */
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
        (a, b) =>
          Math.hypot(state.player.pos.x - a.stand.x, state.player.pos.y - a.stand.y) -
          Math.hypot(state.player.pos.x - b.stand.x, state.player.pos.y - b.stand.y),
      )[0];
    if (stove) {
      return { kind: "pickup", pos: stove.stand, label: "厨房で丼を受け取ろう" };
    }
  }

  if (state.coins.length > 0) {
    const coin = state.coins[0];
    return { kind: "coin", pos: coin.pos, label: "お金を踏んで回収しよう" };
  }

  if (waiting.length > 0) {
    return { kind: "wait", pos: null, label: "丼ができるまで待とう" };
  }
  return { kind: "wait", pos: null, label: "お客さんを待っています" };
};
