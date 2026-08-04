/**
 * ステージ定義。エンジン（lib/shop.ts）は、ここから配置と名前を受け取る。
 *
 * どちらのステージも中核のループは同じ:
 *   作る場所（寸胴／券売所）→ 運ぶ → 待っている人に渡す → お金が落ちる
 */

import type {
  AreaSpec,
  EquipSpec,
  HireSpec,
  SeatSpec,
  StaffKind,
  StoveSpec,
  Upgrade,
} from "@/lib/shop";

export type StageId = "ramen" | "park" | "fire";

export type StageLabels = {
  /** 運ぶもの */
  item: string;
  /** 作る場所 */
  producer: string;
  /** 渡す場所（見出し） */
  tray: string;
  /** お客さん */
  guest: string;
  /** 使用中の状態 */
  using: string;
  staff: Record<StaffKind, string>;
  objective: {
    pickup: string;
    serve: string;
    coin: string;
    waitItem: string;
    waitGuest: string;
  };
  outside: string;
  outsideDetail: string;
  /** 場所ごとに置ける自動供給機の名前 */
  auto: string;
};

export type StageDef = {
  id: StageId;
  name: string;
  subtitle: string;
  /** 画面に出す絵文字 */
  icon: string;
  /** 運ぶものの絵文字 */
  itemIcon: string;
  /** 作る場所が並ぶ帯（歩いて入れる） */
  frontRoom: { top: number; bottom: number };
  areas: AreaSpec[];
  stoves: StoveSpec[];
  seats: SeatSpec[];
  hires: HireSpec[];
  equipment: EquipSpec[];
  upgrades: Upgrade[];
  labels: StageLabels;
  /** 一杯（一人）あたりの基本単価 */
  baseValue: number;
  /** 入口で取る入場券の基本料金（ないステージは省略） */
  admission?: number;
  /** 場所ごとの自動供給機を置けるステージか */
  autoServer?: boolean;
  /** このステージを開けるのに必要な、前ステージの区画数 */
  requiresAreas: number;
  /** 最初から開いているもの（省略で stove-1 / seat-0-1 / seat-0-2） */
  start?: string[];
  /** このステージが工程（数珠つなぎ）を使うか。トップの表示に使う */
  chain?: boolean;
  /** 席が埋まったら、あふれた客が行列にならぶか */
  queue?: boolean;
  /** お金の単位（省略で「円」。火のはじまりは「貝」） */
  currency?: string;
  /** 画面の横幅（ワールド単位）。広い区画のステージは少し引いて見せる */
  view?: number;
  /** 1つ作るのにかかる基本の時間（秒。省略で 2.0） */
  cookTime?: number;
  /** 担当者が付いた作業場の速さ（省略で 2.2） */
  cookBoost?: number;
  /**
   * 同時に見せておく、まだ買っていない枠の数。
   * 指定すると、条件を満たした枠を順ぐりに少しずつ出す
   */
  revealLimit?: number;
  /** 入口とお客さんの来る通りの横位置（省略で 306） */
  entranceX?: number;
  /** はじめる位置（省略で x180 y250） */
  startPos?: { x: number; y: number };
  /** 最初からくべてあるまき（1食目だけ、火の世話を教えずに済ませる） */
  startFuel?: Record<string, number>;
};

/**
 * 席は左から順に出す。ひとつ買うと、その隣が出てくる。
 * （最初から全部見えていると、やることが多すぎて選べない）
 */
const chain = (id: string | undefined, i: number) => (i > 0 ? id : undefined);

const seatRow = (
  area: number,
  xs: number[],
  baseY: number,
  prices: number[],
  label: string,
  cost = 1,
): SeatSpec[] =>
  xs.map((x, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x, y: baseY + 64 },
    serve: { x, y: baseY },
    tray: { x, y: baseY + 24 },
    price: prices[i],
    area,
    label,
    cost,
    value: cost * 1.25,
    unlockAfter: chain(`seat-${area}-${i}`, i),
  }));

/** レストランのテーブル。料理を運び、食べ終わったら皿を片づける */
const tableRow = (
  area: number,
  baseY: number,
  tables: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    unlockAfter?: string;
  }[],
): SeatSpec[] =>
  tables.map((table, i) => ({
    id: `table-${area}-${i + 1}`,
    pos: { x: table.x, y: baseY + 64 },
    serve: { x: table.x, y: baseY },
    tray: { x: table.x, y: baseY + 24 },
    price: table.price,
    area,
    label: table.label,
    art: table.art,
    detail: table.detail,
    mode: "table" as const,
    needs: "food" as const,
    value: 4,
    unlockAfter: table.unlockAfter ?? chain(`table-${area}-${i}`, i),
  }));

/** お土産の棚。並べておくと客が自分で取り、レジでお金を払う */
const shelfRow = (
  area: number,
  baseY: number,
  till: { x: number; y: number },
  shelves: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    unlockAfter?: string;
  }[],
): SeatSpec[] =>
  shelves.map((shelf, i) => ({
    id: `shelf-${area}-${i + 1}`,
    pos: { x: shelf.x, y: baseY + 64 },
    serve: { x: shelf.x, y: baseY },
    tray: { x: shelf.x, y: baseY + 24 },
    price: shelf.price,
    area,
    label: shelf.label,
    art: shelf.art,
    detail: shelf.detail,
    mode: "shelf" as const,
    needs: "goods" as const,
    value: 2.4,
    pay: till,
    unlockAfter: shelf.unlockAfter ?? chain(`shelf-${area}-${i}`, i),
  }));

/* ==================== ステージ1: ラーメン屋 ==================== */

const ramenAreas: AreaSpec[] = [
  {
    id: "area-0",
    label: "屋台",
    price: 0,
    rect: { x0: 0, y0: 0, x1: 360, y1: 480 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#3b322a", deep: "#282019", prop: "none" },
  },
  {
    id: "area-1",
    label: "テーブル席をつくる",
    price: 2600,
    rect: { x0: 0, y0: 480, x1: 360, y1: 790 },
    padPos: { x: 150, y: 452 },
    palette: { floor: "#3a3128", deep: "#272018", prop: "none" },
    // 屋台がひととおり埋まってから、はじめて外に広げる話が出てくる
    unlockAfter: "seat-0-4",
  },
  {
    id: "area-2",
    label: "製麺所をつくる",
    price: 22000,
    rect: { x0: 360, y0: 0, x1: 720, y1: 480 },
    padPos: { x: 298, y: 250 },
    palette: { floor: "#343029", deep: "#242019", prop: "none" },
  },
  {
    id: "area-3",
    label: "宴会場をつくる",
    price: 140000,
    rect: { x0: 360, y0: 480, x1: 720, y1: 790 },
    padPos: { x: 540, y: 452 },
    palette: { floor: "#3c3128", deep: "#282018", prop: "none" },
  },
];

const ramenStoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 72, y: 176 }, price: 0, area: 0 },
  { id: "stove-2", pos: { x: 180, y: 176 }, price: 150, area: 0 },
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 700, area: 0, unlockAfter: "cook-1" },
  { id: "stove-4", pos: { x: 470, y: 176 }, price: 26000, area: 2 },
  { id: "stove-5", pos: { x: 610, y: 176 }, price: 60000, area: 2 },
  // 宴会場まで開くと、製麺所に持ち帰りの倉庫が出せるようになる
  { id: "store-r1", pos: { x: 400, y: 380 }, price: 900000, area: 2, item: "goods", art: "stock", label: "みやげ倉庫", unlockAfter: "area-3" },
];

const ramenSeats: SeatSpec[] = [
  ...seatRow(0, [60, 140, 220, 300], 294, [0, 0, 100, 300], "カウンター席"),
  ...seatRow(1, [80, 180, 280], 552, [400, 900, 2000], "テーブル席", 2),
  ...seatRow(3, [432, 516, 600, 684], 552, [9000, 18000, 34000, 60000], "座敷席", 3),
  // あとから出てくる持ち帰りコーナー（並べておくと客が自分で買っていく）
  ...shelfRow(2, 356, { x: 660, y: 420 }, [
    {
      x: 520,
      price: 1200000,
      label: "生ラーメン棚",
      art: "sweets",
      detail: "家で作れる持ち帰りセット",
      unlockAfter: "area-3",
    },
    {
      x: 620,
      price: 3000000,
      label: "名物どんぶり棚",
      art: "limited",
      detail: "店のロゴ入りどんぶり",
      unlockAfter: "shelf-2-1",
    },
  ]),
];

/** 調理人は、担当の寸胴を買ったあと、ひとりずつ出てくる */
const ramenCookAfter = ["stove-2", "cook-1", "cook-2"];

const ramenHires: HireSpec[] = [
  ...ramenStoves
    .filter((stove) => (stove.item ?? "main") === "main")
    .map((stove, i) => ({
      id: `cook-${i + 1}`,
      kind: "cook" as const,
      pos: { x: stove.pos.x + 40, y: 130 },
      price: [600, 1800, 4500, 30000, 70000][i],
      label: "調理人",
      stoveId: stove.id,
      area: stove.area,
      unlockAfter: ramenCookAfter[i],
    })),
  // 持ち帰りの倉庫番
  { id: "keeper-r1", kind: "cook", pos: { x: 340, y: 340 }, price: 2600000, label: "倉庫番", stoveId: "store-r1", area: 2, unlockAfter: "area-3" },
  { id: "waiter-1", kind: "waiter", pos: { x: 50, y: 394 }, price: 280, label: "ホール店員", area: 0, unlockAfter: "seat-0-3" },
  { id: "waiter-2", kind: "waiter", pos: { x: 130, y: 394 }, price: 1500, label: "ホール店員", area: 0, unlockAfter: "seat-0-4" },
  { id: "collector-1", kind: "collector", pos: { x: 230, y: 394 }, price: 900, label: "レジ係", area: 0, unlockAfter: "waiter-1" },
  { id: "robot-1", kind: "robot", pos: { x: 310, y: 394 }, price: 4000, label: "配膳ロボ", area: 0, unlockAfter: "waiter-2" },
  { id: "waiter-3", kind: "waiter", pos: { x: 60, y: 700 }, price: 9000, label: "ホール店員", area: 1 },
  { id: "collector-2", kind: "collector", pos: { x: 180, y: 704 }, price: 14000, label: "レジ係", area: 1, unlockAfter: "waiter-3" },
  { id: "robot-2", kind: "robot", pos: { x: 300, y: 700 }, price: 26000, label: "配膳ロボ", area: 1, unlockAfter: "waiter-3" },
  { id: "master-1", kind: "master", pos: { x: 430, y: 700 }, price: 180000, label: "板前", area: 3 },
  { id: "robot-3", kind: "robot", pos: { x: 560, y: 700 }, price: 260000, label: "配膳ロボ", area: 3, unlockAfter: "waiter-4" },
  { id: "waiter-4", kind: "waiter", pos: { x: 680, y: 700 }, price: 90000, label: "ホール店員", area: 3 },
  // 持ち帰りコーナーができると、製麺所に品出しが立てられる
  { id: "stocker-r1", kind: "stocker", pos: { x: 450, y: 440 }, price: 1800000, label: "品出し", area: 2, unlockAfter: "area-3" },
];

const ramenEquipment: EquipSpec[] = [
  { id: "noodle", name: "製麺機", detail: "すべての寸胴の調理が +30%", pos: { x: 420, y: 300 }, price: 30000, area: 2 },
  { id: "fridge", name: "大型冷蔵庫", detail: "寸胴に置ける数 +4杯", pos: { x: 520, y: 300 }, price: 45000, area: 2, unlockAfter: "equip-noodle" },
  { id: "ticket", name: "券売機", detail: "お金が自動で入る・レジ係はホールへ", pos: { x: 112, y: 0 }, price: 80000, area: 0, outside: true, unlockAfter: "area-1" },
  { id: "sign", name: "呼び込み看板", detail: "お客さんが 1.5倍のペースで来る", pos: { x: 240, y: 0 }, price: 120000, area: 0, outside: true, draw: 1.5, unlockAfter: "equip-ticket" },
  // 集客オブジェクト（掛け算で効く）
  { id: "flag", name: "のぼり旗", detail: "通りから目立つ。集客 1.25倍", pos: { x: 40, y: 0 }, price: 9000, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "waiter-2" },
  { id: "lantern", name: "大提灯", detail: "夜の通りで光る。集客 1.35倍", pos: { x: 176, y: 0 }, price: 260000, area: 0, outside: true, row: 1, draw: 1.35, unlockAfter: "area-2" },
  { id: "queue", name: "行列の整理棒", detail: "並ぶ人が見えて人を呼ぶ。集客 1.4倍", pos: { x: 330, y: 0 }, price: 900000, area: 0, outside: true, row: 1, draw: 1.4, unlockAfter: "area-3" },
  { id: "screen", name: "街頭ビジョン", detail: "でかい映像で宣伝する。集客 1.6倍", pos: { x: 470, y: 0 }, price: 4000000, area: 2, outside: true, draw: 1.6, unlockAfter: "area-2" },
  { id: "truck", name: "宣伝トラック", detail: "町じゅうを回ってくる。集客 1.8倍", pos: { x: 620, y: 0 }, price: 18000000, area: 3, outside: true, draw: 1.8, unlockAfter: "area-3" },
];

const ramenUpgrades: Upgrade[] = [
  { id: "carry", name: "両手鍋", detail: (n) => `${3 + n}杯まで持てる・店員も ${3 + Math.floor(n / 2)}杯`, pos: { x: 46, y: 66 }, basePrice: 60, growth: 1.7, max: 9, unlockAfter: "stove-2" },
  { id: "speed", name: "厨房シューズ", detail: (n) => `足の速さ +${n * 10}%・店員も +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 50, growth: 1.65, max: 12, unlockAfter: "waiter-1" },
  { id: "cook", name: "業務用寸胴", detail: (n) => `煮える速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 80, growth: 1.7, max: 14, unlockAfter: "stove-3" },
  { id: "price", name: "看板メニュー", detail: (n) => `一杯 ${Math.round(55 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 120, growth: 1.75, max: 20, unlockAfter: "seat-0-3" },
];

/* ==================== ステージ2: テーマパーク ==================== */

const parkAreas: AreaSpec[] = [
  {
    id: "area-0",
    label: "入口広場",
    price: 0,
    rect: { x0: 0, y0: 0, x1: 360, y1: 480 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#4a4a52", deep: "#33333b", prop: "none" },
  },
  {
    id: "area-1",
    label: "メルヘンの丘をつくる",
    price: 3000,
    rect: { x0: 360, y0: 0, x1: 720, y1: 480 },
    padPos: { x: 298, y: 250 },
    palette: { floor: "#6f5a86", deep: "#4b3c5c", prop: "castle" },
    // 入口広場のアトラクションがそろってから、外へ広げる
    unlockAfter: "seat-0-4",
  },
  {
    id: "area-2",
    label: "雪の国をつくる",
    price: 26000,
    rect: { x0: 0, y0: 480, x1: 360, y1: 960 },
    padPos: { x: 150, y: 452 },
    palette: { floor: "#5f7690", deep: "#3f5468", prop: "snow" },
  },
  {
    id: "area-3",
    label: "ウェスタンの町をつくる",
    price: 130000,
    rect: { x0: 360, y0: 480, x1: 720, y1: 960 },
    padPos: { x: 540, y: 452 },
    palette: { floor: "#8a6a42", deep: "#5f482c", prop: "cactus" },
  },
  {
    id: "area-4",
    label: "海賊の入江をつくる",
    price: 700000,
    rect: { x0: 0, y0: 960, x1: 360, y1: 1440 },
    padPos: { x: 150, y: 932 },
    palette: { floor: "#3f6b78", deep: "#2a4c56", prop: "ship" },
  },
  {
    id: "area-5",
    label: "宇宙ステーションをつくる",
    price: 3200000,
    rect: { x0: 360, y0: 960, x1: 720, y1: 1440 },
    padPos: { x: 540, y: 932 },
    palette: { floor: "#3b3f63", deep: "#262a46", prop: "star" },
  },
  {
    id: "area-6",
    label: "恐竜の谷をつくる",
    price: 14000000,
    rect: { x0: 720, y0: 0, x1: 1080, y1: 480 },
    padPos: { x: 658, y: 250 },
    palette: { floor: "#4d6340", deep: "#33452b", prop: "fossil" },
  },
  {
    id: "area-7",
    label: "レストラン街をつくる",
    price: 60000000,
    rect: { x0: 720, y0: 480, x1: 1080, y1: 960 },
    padPos: { x: 900, y: 452 },
    palette: { floor: "#7a4a4a", deep: "#4f2f2f", prop: "diner" },
  },
  {
    id: "area-8",
    label: "おみやげ通りをつくる",
    price: 250000000,
    rect: { x0: 720, y0: 960, x1: 1080, y1: 1440 },
    padPos: { x: 900, y: 932 },
    palette: { floor: "#6a5a86", deep: "#443a5c", prop: "market" },
  },
];

const parkStoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 72, y: 176 }, price: 0, area: 0 },
  { id: "stove-2", pos: { x: 180, y: 176 }, price: 200, area: 0 },
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 900, area: 0, unlockAfter: "cook-1" },
  { id: "stove-4", pos: { x: 180, y: 656 }, price: 34000, area: 2 },
  { id: "stove-5", pos: { x: 540, y: 1136 }, price: 900000, area: 5 },
  // レストラン街の厨房
  { id: "kitchen-1", pos: { x: 800, y: 620 }, price: 70000000, area: 7, item: "food", art: "kitchen", label: "厨房" },
  { id: "kitchen-2", pos: { x: 1000, y: 620 }, price: 160000000, area: 7, item: "food", art: "kitchen", label: "厨房" },
  // おみやげ通りの倉庫
  { id: "store-1", pos: { x: 800, y: 1100 }, price: 300000000, area: 8, item: "goods", art: "stock", label: "倉庫" },
  { id: "store-2", pos: { x: 1000, y: 1100 }, price: 700000000, area: 8, item: "goods", art: "stock", label: "倉庫" },
  // 区画が増えると、前の区画にも新しい店が出せるようになる
  { id: "kitchen-0", pos: { x: 300, y: 250 }, price: 90000000, area: 0, item: "food", art: "kitchen", label: "広場のキッチンカー", unlockAfter: "area-7" },
  { id: "store-0", pos: { x: 620, y: 250 }, price: 320000000, area: 1, item: "goods", art: "stock", label: "丘のみやげ倉庫", unlockAfter: "area-8" },
];

/** アトラクションは1つずつ名前も見た目も違う */
const rideRow = (
  area: number,
  baseY: number,
  rides: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    /** 一度に必要なチケットの枚数 */
    cost?: number;
  }[],
): SeatSpec[] =>
  rides.map((ride, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x: ride.x, y: baseY + 64 },
    serve: { x: ride.x, y: baseY },
    tray: { x: ride.x, y: baseY + 24 },
    price: ride.price,
    area,
    label: ride.label,
    art: ride.art,
    detail: ride.detail,
    cost: ride.cost,
    // 枚数の多い乗り物は、そのぶん高く売れる
    value: ride.cost ? ride.cost * 1.25 : 1,
    unlockAfter: chain(`seat-${area}-${i}`, i),
  }));

const parkSeats: SeatSpec[] = [
  ...rideRow(0, 294, [
    { x: 60, price: 0, label: "コーヒーカップ", art: "teacup", detail: "くるくる回るカップ" },
    { x: 140, price: 0, label: "パンダライド", art: "panda", detail: "小さな子に人気の乗り物" },
    { x: 220, price: 140, label: "射的コーナー", art: "shooting", detail: "的を撃ち抜く縁日ゲーム" },
    { x: 300, price: 420, label: "ミニ観覧車", cost: 2, art: "wheel", detail: "広場を見下ろす小さな観覧車" },
  ]),
  ...rideRow(1, 294, [
    { x: 432, price: 1200, label: "メリーゴーラウンド", art: "carousel", detail: "白馬がゆっくり上下する" },
    { x: 540, price: 3000, label: "ゆめの気球", cost: 2, art: "balloonride", detail: "気球のゴンドラで空へ" },
    { x: 648, price: 7000, label: "おとぎの城ツアー", cost: 2, art: "castleride", detail: "城の中をトロッコで巡る" },
  ]),
  ...rideRow(2, 774, [
    { x: 72, price: 12000, label: "そりコースター", art: "sled", detail: "雪山を一気に滑り降りる" },
    { x: 180, price: 26000, label: "スケートリンク", cost: 2, art: "rink", detail: "氷の上をくるくる滑る" },
    { x: 288, price: 52000, label: "ペンギンボート", cost: 2, art: "penguin", detail: "氷の水路をボートで進む" },
  ]),
  ...rideRow(3, 774, [
    { x: 432, price: 70000, label: "ガンマンショー", art: "showdown", detail: "早撃ち対決の生ショー" },
    { x: 540, price: 140000, label: "幌馬車ライド", cost: 2, art: "wagon", detail: "馬車に揺られて町を一周" },
    { x: 648, price: 260000, label: "鉱山トロッコ", cost: 3, art: "minecart", detail: "坑道を走る暴走トロッコ" },
  ]),
  ...rideRow(4, 1254, [
    { x: 72, price: 300000, label: "バイキング船", cost: 3, art: "viking", detail: "大きく揺れる海賊船" },
    { x: 180, price: 560000, label: "大砲チャレンジ", cost: 2, art: "cannon", detail: "的をねらって大砲を撃つ" },
    { x: 288, price: 980000, label: "急流いかだ下り", cost: 3, art: "raft", detail: "水しぶきを浴びて川を下る" },
  ]),
  ...rideRow(5, 1254, [
    { x: 432, price: 1400000, label: "ロケット発射", cost: 3, art: "rocket", detail: "打ち上げの瞬間を体験" },
    { x: 540, price: 2600000, label: "無重力スピナー", cost: 3, art: "spinner", detail: "回って浮かぶ無重力体験" },
    { x: 648, price: 4800000, label: "宇宙シアター", cost: 3, art: "theater", detail: "ドーム映像で宇宙を旅する" },
  ]),
  ...rideRow(6, 294, [
    { x: 792, price: 6000000, label: "恐竜ライド", cost: 3, art: "dino", detail: "首長竜の背中に乗る" },
    { x: 900, price: 11000000, label: "化石発掘場", cost: 2, art: "dig", detail: "砂を掘って化石を探す" },
    { x: 1008, price: 20000000, label: "翼竜フライト", cost: 3, art: "ptera", detail: "翼竜にぶら下がって旋回" },
  ]),

  /* レストラン街: 厨房の料理を運ぶ。食べ終わると皿が残るので片づける */
  ...tableRow(7, 774, [
    { x: 792, price: 80000000, label: "パスタ食堂", art: "pasta", detail: "湯気の立つパスタが名物" },
    { x: 900, price: 140000000, label: "ステーキハウス", art: "steak", detail: "鉄板で焼く分厚いステーキ" },
    { x: 1008, price: 240000000, label: "スイーツカフェ", art: "cafe", detail: "パフェとケーキのお店" },
  ]),

  /* おみやげ通り: 先に棚へ並べておくと、客が自分で取ってレジで払う */
  ...shelfRow(8, 1254, { x: 900, y: 1402 }, [
    { x: 792, price: 400000000, label: "ぬいぐるみ棚", art: "plush", detail: "パークの人気キャラクター" },
    { x: 900, price: 900000000, label: "お菓子の棚", art: "sweets", detail: "箱入りのおみやげ菓子" },
    { x: 1008, price: 1800000000, label: "限定グッズ棚", art: "limited", detail: "ここでしか買えない限定品" },
  ]),

  /* 区画が増えると、前の区画にも新しいスポットが出てくる */
  ...tableRow(0, 294, [
    {
      x: 380,
      price: 120000000,
      label: "広場のテラス席",
      art: "terrace",
      detail: "キッチンカーの料理を食べられる",
      unlockAfter: "area-7",
    },
  ]),
  ...shelfRow(1, 294, { x: 560, y: 404 }, [
    {
      x: 700,
      price: 500000000,
      label: "メルヘンの雑貨棚",
      art: "plush",
      detail: "丘の上でしか買えない小物",
      unlockAfter: "area-8",
    },
  ]),
];

/** 券売スタッフは、担当の券売所を買ったあと、ひとりずつ出てくる */
const parkCookAfter = ["stove-2", "cook-1", "cook-2"];

const parkHires: HireSpec[] = [
  ...parkStoves
    .filter((stove) => (stove.item ?? "main") === "main")
    .map((stove, i) => ({
      id: `cook-${i + 1}`,
      kind: "cook" as const,
      pos: { x: stove.pos.x + 40, y: stove.pos.y - 46 },
      price: [800, 2400, 6000, 40000, 1200000][i],
      label: "券売スタッフ",
      stoveId: stove.id,
      area: stove.area,
      unlockAfter: parkCookAfter[i],
    })),
  // 広場のキッチンカーに付く料理人（あとから出る）
  { id: "cook-10", kind: "cook", pos: { x: 300, y: 300 }, price: 140000000, label: "料理人", stoveId: "kitchen-0", area: 0, unlockAfter: "area-7" },
  { id: "cook-11", kind: "cook", pos: { x: 620, y: 300 }, price: 480000000, label: "倉庫番", stoveId: "store-0", area: 1, unlockAfter: "area-8" },
  { id: "waiter-1", kind: "waiter", pos: { x: 50, y: 434 }, price: 340, label: "案内係", area: 0, unlockAfter: "seat-0-3" },
  { id: "waiter-2", kind: "waiter", pos: { x: 130, y: 434 }, price: 1800, label: "案内係", area: 0, unlockAfter: "seat-0-4" },
  { id: "collector-1", kind: "collector", pos: { x: 230, y: 434 }, price: 1100, label: "集金係", area: 0, unlockAfter: "waiter-1" },
  { id: "robot-1", kind: "robot", pos: { x: 310, y: 434 }, price: 5000, label: "案内ロボ", area: 0, unlockAfter: "waiter-2" },
  // 入口の係。まず人を立てて、あとから機械にできる
  { id: "seller-1", kind: "seller", pos: { x: 222, y: 0 }, price: 1600, label: "入場券係", area: 0, outside: true, unlockAfter: "waiter-1" },
  { id: "gatekeeper-1", kind: "gatekeeper", pos: { x: 340, y: 0 }, price: 4000, label: "入場ゲート係", area: 0, outside: true, unlockAfter: "seller-1" },
  { id: "waiter-3", kind: "waiter", pos: { x: 470, y: 434 }, price: 12000, label: "案内係", area: 1 },
  { id: "robot-2", kind: "robot", pos: { x: 620, y: 434 }, price: 40000, label: "案内ロボ", area: 1, unlockAfter: "waiter-3" },
  { id: "waiter-4", kind: "waiter", pos: { x: 80, y: 912 }, price: 90000, label: "案内係", area: 2 },
  { id: "collector-2", kind: "collector", pos: { x: 260, y: 912 }, price: 130000, label: "集金係", area: 2, unlockAfter: "waiter-4" },
  { id: "robot-3", kind: "robot", pos: { x: 470, y: 912 }, price: 420000, label: "案内ロボ", area: 3, unlockAfter: "waiter-5" },
  { id: "waiter-5", kind: "waiter", pos: { x: 630, y: 912 }, price: 260000, label: "案内係", area: 3 },
  { id: "robot-4", kind: "robot", pos: { x: 180, y: 1392 }, price: 2200000, label: "案内ロボ", area: 4 },
  { id: "master-1", kind: "master", pos: { x: 540, y: 1392 }, price: 9000000, label: "園長", area: 5 },
  { id: "robot-5", kind: "robot", pos: { x: 900, y: 434 }, price: 26000000, label: "案内ロボ", area: 6 },

  // レストラン街: 料理人・ホール・テーブル係
  { id: "cook-6", kind: "cook", pos: { x: 840, y: 574 }, price: 90000000, label: "料理人", stoveId: "kitchen-1", area: 7 },
  { id: "cook-7", kind: "cook", pos: { x: 1040, y: 574 }, price: 200000000, label: "料理人", stoveId: "kitchen-2", area: 7 },
  { id: "server-1", kind: "server", pos: { x: 780, y: 912 }, price: 110000000, label: "料理係", area: 7 },
  { id: "server-2", kind: "server", pos: { x: 860, y: 912 }, price: 280000000, label: "料理係", area: 7 },
  { id: "busser-1", kind: "busser", pos: { x: 900, y: 912 }, price: 150000000, label: "テーブル係", area: 7 },
  { id: "busser-2", kind: "busser", pos: { x: 1020, y: 912 }, price: 400000000, label: "テーブル係", area: 7 },

  // おみやげ通り: 倉庫番・品出し・レジ
  { id: "cook-8", kind: "cook", pos: { x: 840, y: 1054 }, price: 380000000, label: "倉庫番", stoveId: "store-1", area: 8 },
  { id: "cook-9", kind: "cook", pos: { x: 1040, y: 1054 }, price: 800000000, label: "倉庫番", stoveId: "store-2", area: 8 },
  { id: "stocker-1", kind: "stocker", pos: { x: 764, y: 1402 }, price: 500000000, label: "品出しスタッフ", area: 8 },
  { id: "stocker-2", kind: "stocker", pos: { x: 1036, y: 1402 }, price: 1200000000, label: "品出しスタッフ", area: 8 },
  { id: "collector-3", kind: "collector", pos: { x: 900, y: 1172 }, price: 700000000, label: "レジ係", area: 8 },

  // あとから前の区画に出てくるスタッフ
  { id: "server-3", kind: "server", pos: { x: 300, y: 434 }, price: 160000000, label: "料理係", area: 0, unlockAfter: "area-7" },
  { id: "busser-3", kind: "busser", pos: { x: 380, y: 434 }, price: 200000000, label: "テーブル係", area: 0, unlockAfter: "area-7" },
  { id: "stocker-3", kind: "stocker", pos: { x: 700, y: 434 }, price: 800000000, label: "品出しスタッフ", area: 1, unlockAfter: "area-8" },
];

const parkEquipment: EquipSpec[] = [
  { id: "noodle", name: "高速印刷機", detail: "すべての券売所が +30%", pos: { x: 470, y: 190 }, price: 40000, area: 1 },
  { id: "fridge", name: "チケット倉庫", detail: "券売所に貯めておける数 +4枚", pos: { x: 610, y: 190 }, price: 60000, area: 1, unlockAfter: "equip-noodle" },
  { id: "ticket", name: "自動集金ボックス", detail: "お金が自動で入る・集金係は案内へ", pos: { x: 160, y: 0 }, price: 110000, area: 0, outside: true, row: 1, unlockAfter: "area-1" },
  { id: "sign", name: "園内アナウンス", detail: "お客さんが 1.5倍のペースで来る", pos: { x: 280, y: 0 }, price: 160000, area: 0, outside: true, row: 1, draw: 1.5, unlockAfter: "equip-ticket" },
  // 集客オブジェクト（掛け算で効く）
  { id: "flag", name: "のぼり旗", detail: "並木道から目立つ。集客 1.25倍", pos: { x: 40, y: 0 }, price: 12000, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "waiter-2" },
  { id: "balloon", name: "巨大バルーン", detail: "遠くからでも見える。集客 1.4倍", pos: { x: 430, y: 0 }, price: 700000, area: 1, outside: true, draw: 1.4, unlockAfter: "area-1" },
  { id: "greet", name: "キャラクターグリーティング", detail: "着ぐるみが出迎える。集客 1.5倍", pos: { x: 520, y: 0 }, price: 6000000, area: 1, outside: true, draw: 1.5, unlockAfter: "area-2" },
  { id: "parade", name: "パレードカー", detail: "毎日パレードが出る。集客 1.7倍", pos: { x: 660, y: 0 }, price: 40000000, area: 3, outside: true, draw: 1.7, unlockAfter: "area-3" },
  { id: "firework", name: "花火の打ち上げ台", detail: "夜空に花火が上がる。集客 2倍", pos: { x: 800, y: 0 }, price: 600000000, area: 5, outside: true, draw: 2, unlockAfter: "area-5" },
  // 入場まわりの自動化（最初は自分で売って、自分で通す）
  { id: "vend", name: "自動入場券売機", detail: "入場券が自動で売れる。何人でも同時に", pos: { x: 400, y: 0 }, price: 900000, area: 0, outside: true, row: 1, unlockAfter: "equip-sign" },
  { id: "turnstile", name: "自動改札機", detail: "お客さんが自動で入場する。何人でも同時に", pos: { x: 520, y: 0 }, price: 3600000, area: 0, outside: true, row: 1, unlockAfter: "equip-vend" },
];

const parkUpgrades: Upgrade[] = [
  { id: "carry", name: "チケットホルダー", detail: (n) => `${3 + n}枚まで持てる・スタッフも ${3 + Math.floor(n / 2)}枚`, pos: { x: 46, y: 66 }, basePrice: 80, growth: 1.7, max: 9, unlockAfter: "stove-2" },
  { id: "speed", name: "園内カート", detail: (n) => `足の速さ +${n * 10}%・スタッフも +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 70, growth: 1.65, max: 12, unlockAfter: "waiter-1" },
  { id: "cook", name: "発券機の改良", detail: (n) => `発券の速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 100, growth: 1.7, max: 14, unlockAfter: "stove-3" },
  { id: "price", name: "乗り物券アップ", detail: (n) => `一回 ${Math.round(70 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 150, growth: 1.9, max: 20, unlockAfter: "seat-0-3" },
  // 入場券は入口で取る。乗らない人からももらえる
  { id: "gate", name: "入場券アップ", detail: (n) => `入場料 ${Math.round(40 * Math.pow(1.45, n))}円`, pos: { x: 100, y: 0 }, basePrice: 400, growth: 1.9, max: 20, outside: true, unlockAfter: "area-1" },
];

/* ==================== ワーキングプラネット: 火のはじまり ==================== */

/**
 * ベンチ（仲間）の席。運んできた完成品を渡すと、貝がらを置いていく。
 * つくりは乗り物の席と同じ（運んで渡す・そのまま帰る）。
 */
const benchRow = (
  area: number,
  baseY: number,
  needs: string,
  value: number,
  label: string,
  benches: { x: number; price: number; unlockAfter?: string; reveal?: number }[],
): SeatSpec[] =>
  benches.map((bench, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x: bench.x, y: baseY + 64 },
    serve: { x: bench.x, y: baseY },
    tray: { x: bench.x, y: baseY + 24 },
    price: bench.price,
    area,
    label,
    art: "bench",
    needs,
    value,
    reveal: bench.reveal,
    unlockAfter: bench.unlockAfter ?? (i > 0 ? `seat-${area}-${i}` : undefined),
  }));

/**
 * 火のはじまりの区画。
 *
 * 1区画目は、草原と森をそれぞれ別の場所として認識できる広さ（720 × 520）を取る。
 * 画面には収まりきらないので、カメラがプレイヤーを追い、
 * 目的地が画面の外にあるときは、へりに向きが出る。
 */
const fireAreas: AreaSpec[] = [
  {
    id: "area-0",
    label: "はじまりの野",
    price: 0,
    rect: { x0: 0, y0: 0, x1: 720, y1: 520 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#2a1c12", deep: "#1c130b", prop: "none" },
  },
  {
    id: "area-1",
    label: "南の草原をひらく",
    price: 2400,
    rect: { x0: 0, y0: 520, x1: 720, y1: 1040 },
    padPos: { x: 360, y: 492 },
    palette: { floor: "#26301c", deep: "#182010", prop: "none" },
    // 1区画目が自動でまわるようになってから、はじめて外の話が出てくる
    unlockAfter: "robot-1",
    reveal: 22,
  },
  {
    id: "area-2",
    label: "マンモスの谷へ下りる",
    price: 40000,
    rect: { x0: 720, y0: 0, x1: 1440, y1: 520 },
    padPos: { x: 690, y: 260 },
    palette: { floor: "#2a2320", deep: "#1a1512", prop: "none" },
    reveal: 30,
  },
];

/**
 * 火のはじまりの流れ（意味の通る工程）:
 *
 *   草原 ──(生肉)────────────────┐
 *                                 ├─▶ たき火（薪で焼く）──(焼き肉)──▶ ベンチの仲間
 *   森 ──(丸太)──▶ 薪割り場 ──(薪)┘
 *
 * 木こりは森で丸太を作り、薪割りは丸太を薪へ変える。
 * 運ぶのは、はこび手かプレイヤーの仕事。
 */
const fireStoves: StoveSpec[] = [
  /* --- area-0: 左に草原、右に森と薪割り場、中央にたき火 --- */
  {
    id: "hunt-1",
    pos: { x: 150, y: 322 },
    price: 0,
    area: 0,
    item: "meat",
    art: "hunt",
    label: "狩り場",
    zone: { x0: 26, y0: 66, x1: 268, y1: 288 },
    hold: 6,
  },
  {
    id: "forest-1",
    pos: { x: 574, y: 322 },
    price: 0,
    area: 0,
    item: "log",
    art: "forest",
    label: "森",
    zone: { x0: 452, y0: 66, x1: 694, y1: 288 },
    hold: 6,
  },
  {
    id: "split-1",
    pos: { x: 544, y: 400 },
    price: 0,
    area: 0,
    item: "wood",
    takes: "log",
    art: "split",
    label: "薪割り場",
    // 人の手が要る。薪割りを雇うまでは、自分で立って割る
    manual: true,
    work: 0.5,
  },
  {
    id: "fire-1",
    pos: { x: 344, y: 196 },
    price: 0,
    area: 0,
    item: "roast",
    takes: "meat",
    fuel: "wood",
    art: "fire",
    label: "たき火",
  },
  // 1区画目がまわり始めてから、2つ目のたき火を足せる
  {
    id: "fire-1b",
    pos: { x: 190, y: 196 },
    price: 1600,
    area: 0,
    item: "roast",
    takes: "meat",
    fuel: "wood",
    art: "fire",
    label: "2つ目のたき火",
    unlockAfter: "robot-1",
    reveal: 20,
  },

  /* --- area-1: 同じ工程がもう一式 --- */
  { id: "hunt-2", pos: { x: 150, y: 842 }, price: 5000, area: 1, item: "meat", art: "hunt", label: "狩り場", zone: { x0: 26, y0: 586, x1: 268, y1: 808 }, hold: 6, reveal: 23 },
  { id: "forest-2", pos: { x: 574, y: 842 }, price: 6000, area: 1, item: "log", art: "forest", label: "森", zone: { x0: 452, y0: 586, x1: 694, y1: 808 }, hold: 6, reveal: 24 },
  { id: "split-2", pos: { x: 544, y: 920 }, price: 7000, area: 1, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5, reveal: 25 },
  { id: "fire-2", pos: { x: 344, y: 716 }, price: 9000, area: 1, item: "roast", takes: "meat", fuel: "wood", art: "fire", label: "たき火", reveal: 26 },

  /* --- area-2: さばく工程が1つ増える（生肉 → 切り身 → ごちそう） --- */
  { id: "hunt-3", pos: { x: 870, y: 322 }, price: 40000, area: 2, item: "meat", art: "hunt", label: "マンモスの原", zone: { x0: 746, y0: 66, x1: 988, y1: 288 }, hold: 6 },
  { id: "forest-3", pos: { x: 1294, y: 322 }, price: 52000, area: 2, item: "log", art: "forest", label: "大森林", zone: { x0: 1172, y0: 66, x1: 1414, y1: 288 }, hold: 6 },
  { id: "split-3", pos: { x: 1264, y: 400 }, price: 60000, area: 2, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5 },
  { id: "butcher-1", pos: { x: 1060, y: 130 }, price: 80000, area: 2, item: "cut", takes: "meat", art: "cut", label: "さばき台" },
  { id: "grill-1", pos: { x: 1064, y: 300 }, price: 140000, area: 2, item: "feast", takes: "cut", fuel: "wood", art: "fire", label: "大かまど" },
];

const fireSeats: SeatSpec[] = [
  // 1席目は最初から。2席目は「はこび手を雇ったあと」に出す（段階5）
  ...benchRow(0, 424, "roast", 1, "丸太のベンチ", [
    { x: 120, price: 0 },
    { x: 248, price: 76, unlockAfter: "waiter-1", reveal: 5 },
    { x: 376, price: 90, unlockAfter: "waiter-2", reveal: 7.5 },
  ]),
  ...benchRow(1, 944, "roast", 1.4, "草原のベンチ", [
    { x: 120, price: 12000, reveal: 27 },
    { x: 248, price: 24000, reveal: 28 },
    { x: 376, price: 48000, reveal: 29 },
  ]),
  ...benchRow(2, 424, "feast", 3, "谷の宴席", [
    { x: 830, price: 90000 },
    { x: 980, price: 200000 },
  ]),
];

/**
 * 雇う順（§3.2）。
 * 5食ぶんを自分の手でやりきってから、狩り → 木 → 薪 → 運び …と
 * 「いま覚えた仕事の次の改善」だけを出していく。
 */
const fireHires: HireSpec[] = [
  /* --- area-0: 序盤の順ぐり --- */
  { id: "hunter-1", kind: "hunter", pos: { x: 150, y: 372 }, price: 40, label: "狩人", stoveId: "hunt-1", area: 0, needServed: 5, reveal: 1 },
  { id: "logger-1", kind: "logger", pos: { x: 574, y: 372 }, price: 28, label: "木こり", stoveId: "forest-1", area: 0, unlockAfter: "hunter-1", reveal: 2 },
  { id: "splitter-1", kind: "splitter", pos: { x: 610, y: 446 }, price: 48, label: "薪割り", stoveId: "split-1", area: 0, unlockAfter: "logger-1", reveal: 3 },
  { id: "waiter-1", kind: "waiter", pos: { x: 344, y: 300 }, price: 64, label: "はこび手", area: 0, unlockAfter: "splitter-1", reveal: 4 },
  { id: "waiter-2", kind: "waiter", pos: { x: 420, y: 300 }, price: 96, label: "はこび手", area: 0, unlockAfter: "seat-0-2", reveal: 7 },
  { id: "fireman-1", kind: "cook", pos: { x: 268, y: 196 }, price: 120, label: "火の番", stoveId: "fire-1", area: 0, unlockAfter: "seat-0-3", reveal: 8 },
  { id: "collector-1", kind: "collector", pos: { x: 464, y: 424 }, price: 140, label: "拾い手", area: 0, unlockAfter: "fireman-1", reveal: 9 },
  { id: "robot-1", kind: "robot", pos: { x: 464, y: 480 }, price: 320, label: "犬ぞり", area: 0, unlockAfter: "collector-1", reveal: 11 },
  // 2つ目のたき火を足したら、その火の番も雇える
  { id: "fireman-1b", kind: "cook", pos: { x: 114, y: 196 }, price: 2400, label: "火の番", stoveId: "fire-1b", area: 0, unlockAfter: "fire-1b", reveal: 20.5 },

  /* --- area-1 --- */
  { id: "hunter-2", kind: "hunter", pos: { x: 150, y: 892 }, price: 6000, label: "狩人", stoveId: "hunt-2", area: 1, reveal: 23.5 },
  { id: "logger-2", kind: "logger", pos: { x: 574, y: 892 }, price: 7000, label: "木こり", stoveId: "forest-2", area: 1, reveal: 24.5 },
  { id: "splitter-2", kind: "splitter", pos: { x: 610, y: 966 }, price: 8000, label: "薪割り", stoveId: "split-2", area: 1, reveal: 25.5 },
  { id: "fireman-2", kind: "cook", pos: { x: 268, y: 716 }, price: 12000, label: "火の番", stoveId: "fire-2", area: 1, reveal: 26.5 },
  { id: "waiter-3", kind: "waiter", pos: { x: 344, y: 820 }, price: 14000, label: "はこび手", area: 1, reveal: 27.5 },
  { id: "robot-2", kind: "robot", pos: { x: 464, y: 1000 }, price: 60000, label: "犬ぞり", area: 1, reveal: 29.5 },

  /* --- area-2 --- */
  { id: "hunter-3", kind: "hunter", pos: { x: 870, y: 372 }, price: 60000, label: "狩人", stoveId: "hunt-3", area: 2 },
  { id: "logger-3", kind: "logger", pos: { x: 1294, y: 372 }, price: 70000, label: "木こり", stoveId: "forest-3", area: 2 },
  { id: "splitter-3", kind: "splitter", pos: { x: 1330, y: 446 }, price: 80000, label: "薪割り", stoveId: "split-3", area: 2 },
  { id: "butcher-1c", kind: "cook", pos: { x: 990, y: 130 }, price: 120000, label: "さばき手", stoveId: "butcher-1", area: 2 },
  { id: "fireman-3", kind: "cook", pos: { x: 990, y: 300 }, price: 180000, label: "火の番", stoveId: "grill-1", area: 2 },
  { id: "waiter-4", kind: "waiter", pos: { x: 900, y: 470 }, price: 150000, label: "はこび手", area: 2 },
  { id: "robot-3", kind: "robot", pos: { x: 1010, y: 470 }, price: 400000, label: "犬ぞり", area: 2 },
];

const fireEquipment: EquipSpec[] = [
  // 直結の設備（区間を消す）: 生肉・丸太・薪を、次の場所へ直接おくる
  { id: "chute-meat", name: "肉はこびそり", detail: "生肉を、たき火へ直接おくる", pos: { x: 250, y: 260 }, price: 6000, area: 0, link: { from: "hunt-1", to: "fire-1" }, unlockAfter: "robot-1", reveal: 12 },
  { id: "chute-log", name: "丸太ころがし", detail: "丸太を、薪割り場へ直接おくる", pos: { x: 618, y: 360 }, price: 9000, area: 0, link: { from: "forest-1", to: "split-1" }, unlockAfter: "equip-chute-meat", reveal: 13 },
  { id: "chute-wood", name: "薪のとい", detail: "薪を、たき火へ直接おくる", pos: { x: 444, y: 300 }, price: 14000, area: 0, link: { from: "split-1", to: "fire-1" }, unlockAfter: "equip-chute-log", reveal: 14 },
  { id: "chute-cut", name: "石のすべり台", detail: "切り身を、大かまどへ直接おくる", pos: { x: 1124, y: 216 }, price: 600000, area: 2, link: { from: "butcher-1", to: "grill-1" }, unlockAfter: "fireman-3" },
  // 道具の強化・集客
  { id: "noodle", name: "石おの", detail: "すべての作業場が +30%速くなる", pos: { x: 660, y: 480 }, price: 24000, area: 0, unlockAfter: "equip-chute-wood", reveal: 15 },
  { id: "fridge", name: "ほぞ穴の倉", detail: "受け口・出し口に積める数 +4", pos: { x: 660, y: 220 }, price: 45000, area: 0, unlockAfter: "equip-noodle", reveal: 16 },
  { id: "ticket", name: "貝がら入れ", detail: "貝がらが自動でサイフに入る・拾い手は運びへ", pos: { x: 250, y: 0 }, price: 30000, area: 0, outside: true, unlockAfter: "equip-noodle", reveal: 17 },
  { id: "flag", name: "けむりのろし", detail: "遠くの仲間を呼ぶ。集まりが 1.25倍", pos: { x: 120, y: 0 }, price: 1200, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "collector-1", reveal: 18 },
  { id: "sign", name: "物見やぐら", detail: "仲間が 1.5倍のはやさで来る", pos: { x: 380, y: 0 }, price: 60000, area: 0, outside: true, unlockAfter: "equip-ticket", reveal: 19 },
  { id: "lantern", name: "たいこ", detail: "音で人を集める。集まりが 1.4倍", pos: { x: 470, y: 0 }, price: 90000, area: 0, outside: true, row: 1, draw: 1.4, unlockAfter: "area-1", reveal: 31 },
  { id: "queue", name: "かがり火", detail: "夜通し明るい。集まりが 1.6倍", pos: { x: 590, y: 0 }, price: 240000, area: 0, outside: true, row: 1, draw: 1.6, unlockAfter: "area-2", reveal: 32 },
];

/**
 * 強化は、その強化が効く相手を体験してから出す（§3.3）。
 *   編みかご   ← はこび手を雇ったあと
 *   火をあおぐ ← 火の番を雇ったあと
 *   わらじ     ← 集金が自動になったあと
 *   石塩       ← 犬ぞりまで来て、次の区画が見えるころ
 */
/*
 * 強化の枠は、買っても消えない。
 * 人の通り道に置くと、通りかかるたびに貝が吸い出されてしまうので、
 * 草原の西はしに「道具置き場」としてまとめ、往復の線から外しておく。
 */
const fireUpgrades: Upgrade[] = [
  { id: "carry", name: "編みかご", detail: (n) => `${3 + n}こまで持てる・はこび手も 品種ごとに ${3 + Math.floor(n / 2)}こ`, pos: { x: 40, y: 330 }, basePrice: 56, growth: 1.7, max: 9, unlockAfter: "waiter-1", reveal: 6 },
  { id: "cook", name: "火をあおぐ", detail: (n) => `作る速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 40, y: 390 }, basePrice: 150, growth: 1.7, max: 14, unlockAfter: "fireman-1", reveal: 8.5 },
  { id: "speed", name: "わらじ", detail: (n) => `足の速さ +${n * 10}%・仲間も +${n * 5}%`, pos: { x: 40, y: 450 }, basePrice: 110, growth: 1.65, max: 12, unlockAfter: "collector-1", reveal: 10 },
  { id: "price", name: "味つけの石塩", detail: (n) => `ひとつ ${Math.round(8 * Math.pow(1.4, n))}貝`, pos: { x: 40, y: 510 }, basePrice: 600, growth: 1.75, max: 20, unlockAfter: "robot-1", reveal: 11.5 },
];

/* ==================== 登録 ==================== */

export const stageDefs: Record<StageId, StageDef> = {
  ramen: {
    id: "ramen",
    name: "ラーメン一直線",
    subtitle: "屋台からはじめる",
    icon: "🍜",
    itemIcon: "🍜",
    frontRoom: { top: 38, bottom: 210 },
    areas: ramenAreas,
    stoves: ramenStoves,
    seats: ramenSeats,
    hires: ramenHires,
    equipment: ramenEquipment,
    upgrades: ramenUpgrades,
    baseValue: 55,
    requiresAreas: 0,
    labels: {
      item: "丼",
      producer: "寸胴",
      tray: "配膳口",
      guest: "お客さん",
      using: "食べている",
      staff: {
        waiter: "ホール店員",
        robot: "配膳ロボ",
        collector: "レジ係",
        cook: "調理人",
        master: "板前",
        busser: "皿洗い",
        stocker: "品出し",
        server: "配膳係",
        seller: "券売係",
        gatekeeper: "入口係",
        hunter: "狩人",
        logger: "木こり",
        splitter: "薪割り",
      },
      objective: {
        pickup: "厨房で丼を受け取ろう",
        serve: "光っている配膳口まで運ぼう",
        coin: "お金を踏んで回収しよう",
        waitItem: "丼ができるまで待とう",
        waitGuest: "お客さんを待っています",
      },
      auto: "自動配膳機",
      outside: "歩道",
      outsideDetail: "券売機と呼び込み看板はこの外に置く",
    },
  },
  park: {
    id: "park",
    name: "ドリームパーク",
    subtitle: "小さな遊園地からはじめる",
    icon: "🎡",
    itemIcon: "🎟️",
    frontRoom: { top: 38, bottom: 210 },
    areas: parkAreas,
    stoves: parkStoves,
    seats: parkSeats,
    hires: parkHires,
    equipment: parkEquipment,
    upgrades: parkUpgrades,
    baseValue: 70,
    admission: 40,
    requiresAreas: 4,
    labels: {
      item: "チケット",
      producer: "券売所",
      tray: "改札",
      guest: "お客さん",
      using: "乗っている",
      staff: {
        waiter: "案内係",
        robot: "案内ロボ",
        collector: "集金係",
        cook: "券売スタッフ",
        master: "園長",
        busser: "テーブル係",
        stocker: "品出しスタッフ",
        server: "料理係",
        seller: "入場券係",
        gatekeeper: "入場ゲート係",
        hunter: "狩人",
        logger: "木こり",
        splitter: "薪割り",
      },
      objective: {
        pickup: "券売所でチケットを受け取ろう",
        serve: "光っている改札まで届けよう",
        coin: "お金を踏んで回収しよう",
        waitItem: "チケットが刷れるまで待とう",
        waitGuest: "お客さんを待っています",
      },
      auto: "自動券売機",
      outside: "並木道",
      outsideDetail: "自動改札と園内アナウンスはこの外に置く",
    },
  },
  fire: {
    id: "fire",
    name: "火のはじまり",
    subtitle: "原始の火からはじめる",
    icon: "🔥",
    itemIcon: "🍖",
    frontRoom: { top: 38, bottom: 300 },
    areas: fireAreas,
    stoves: fireStoves,
    seats: fireSeats,
    hires: fireHires,
    equipment: fireEquipment,
    upgrades: fireUpgrades,
    baseValue: 8,
    requiresAreas: 0,
    chain: true,
    queue: true,
    currency: "貝",
    // 720幅の区画は画面に収まらないので、少し引いて見せてカメラで追う
    view: 400,
    entranceX: 360,
    startPos: { x: 344, y: 300 },
    // たき火は 4.0秒に1つ。火の番が付くと 2.0秒（§6）
    cookTime: 4.0,
    cookBoost: 2.0,
    // 「いま覚えた仕事の次の改善」だけを見せる
    revealLimit: 2,
    // 1食目は「狩る → 置く → 渡す」だけ。まきは最初からくべてある
    startFuel: { "fire-1": 3 },
    // 草原・森・薪割り場・たき火・最初のベンチだけ見えている
    start: ["hunt-1", "forest-1", "split-1", "fire-1", "seat-0-1"],
    labels: {
      item: "しなもの",
      producer: "作業場",
      tray: "ベンチ",
      guest: "仲間",
      using: "食べている",
      staff: {
        waiter: "はこび手",
        robot: "犬ぞり",
        collector: "拾い手",
        cook: "火の番",
        master: "長老",
        busser: "片づけ手",
        stocker: "並べ手",
        server: "はこび手",
        seller: "受付",
        gatekeeper: "門番",
        hunter: "狩人",
        logger: "木こり",
        splitter: "薪割り",
      },
      objective: {
        pickup: "出し口でしなものを受け取ろう",
        serve: "次の作業場か、仲間まで運ぼう",
        coin: "落ちた貝がらを拾おう",
        waitItem: "できあがるまで待とう",
        waitGuest: "仲間を待っています",
      },
      auto: "自動送り",
      outside: "野原",
      outsideDetail: "のろし・たいこはこの外に置く",
    },
  },
};

export const stageList: StageDef[] = [stageDefs.ramen, stageDefs.park];

/** ワーキングプラネットの並び（トップページで別のかたまりに出す） */
export const planetStages: StageDef[] = [stageDefs.fire];
