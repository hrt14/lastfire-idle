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

export type StageId = "ramen" | "park";

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
};

export type StageDef = {
  id: StageId;
  name: string;
  subtitle: string;
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
  /** このステージを開けるのに必要な、前ステージの区画数 */
  requiresAreas: number;
};

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
    unlockAfter: table.unlockAfter,
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
    unlockAfter: shelf.unlockAfter,
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
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 700, area: 0 },
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
      unlockAfter: "area-3",
    },
  ]),
];

const ramenHires: HireSpec[] = [
  ...ramenStoves.map((stove, i) => ({
    id: `cook-${i + 1}`,
    kind: "cook" as const,
    pos: { x: stove.pos.x + 40, y: 130 },
    price: [600, 1800, 4500, 30000, 70000][i],
    label: "調理人",
    stoveId: stove.id,
    area: stove.area,
  })),
  { id: "waiter-1", kind: "waiter", pos: { x: 50, y: 394 }, price: 280, label: "ホール店員", area: 0 },
  { id: "waiter-2", kind: "waiter", pos: { x: 130, y: 394 }, price: 1500, label: "ホール店員", area: 0 },
  { id: "collector-1", kind: "collector", pos: { x: 230, y: 394 }, price: 900, label: "レジ係", area: 0 },
  { id: "robot-1", kind: "robot", pos: { x: 310, y: 394 }, price: 4000, label: "配膳ロボ", area: 0 },
  { id: "waiter-3", kind: "waiter", pos: { x: 60, y: 700 }, price: 9000, label: "ホール店員", area: 1 },
  { id: "collector-2", kind: "collector", pos: { x: 180, y: 704 }, price: 14000, label: "レジ係", area: 1 },
  { id: "robot-2", kind: "robot", pos: { x: 300, y: 700 }, price: 26000, label: "配膳ロボ", area: 1 },
  { id: "master-1", kind: "master", pos: { x: 430, y: 700 }, price: 180000, label: "板前", area: 3 },
  { id: "robot-3", kind: "robot", pos: { x: 560, y: 700 }, price: 260000, label: "配膳ロボ", area: 3 },
  { id: "waiter-4", kind: "waiter", pos: { x: 680, y: 700 }, price: 90000, label: "ホール店員", area: 3 },
  // 持ち帰りコーナーができると、製麺所に品出しが立てられる
  { id: "stocker-r1", kind: "stocker", pos: { x: 450, y: 440 }, price: 1800000, label: "品出し", area: 2, unlockAfter: "area-3" },
];

const ramenEquipment: EquipSpec[] = [
  { id: "noodle", name: "製麺機", detail: "すべての寸胴の調理が +30%", pos: { x: 420, y: 300 }, price: 30000, area: 2 },
  { id: "fridge", name: "大型冷蔵庫", detail: "寸胴に置ける数 +4杯", pos: { x: 520, y: 300 }, price: 45000, area: 2 },
  { id: "ticket", name: "券売機", detail: "お金が自動で入る・レジ係はホールへ", pos: { x: 112, y: 0 }, price: 80000, area: 0, outside: true },
  { id: "sign", name: "呼び込み看板", detail: "お客さんが 1.5倍のペースで来る", pos: { x: 240, y: 0 }, price: 120000, area: 0, outside: true },
];

const ramenUpgrades: Upgrade[] = [
  { id: "carry", name: "両手鍋", detail: (n) => `${3 + n}杯まで持てる・店員も ${3 + Math.floor(n / 2)}杯`, pos: { x: 46, y: 66 }, basePrice: 60, growth: 1.7, max: 9 },
  { id: "speed", name: "厨房シューズ", detail: (n) => `足の速さ +${n * 10}%・店員も +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 50, growth: 1.65, max: 12 },
  { id: "cook", name: "業務用寸胴", detail: (n) => `煮える速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 80, growth: 1.7, max: 14 },
  { id: "price", name: "看板メニュー", detail: (n) => `一杯 ${Math.round(55 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 120, growth: 1.75, max: 20 },
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
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 900, area: 0 },
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

const parkHires: HireSpec[] = [
  ...parkStoves.map((stove, i) => ({
    id: `cook-${i + 1}`,
    kind: "cook" as const,
    pos: { x: stove.pos.x + 40, y: stove.pos.y - 46 },
    price: [800, 2400, 6000, 40000, 1200000][i],
    label: "券売スタッフ",
    stoveId: stove.id,
    area: stove.area,
  })),
  { id: "waiter-1", kind: "waiter", pos: { x: 50, y: 434 }, price: 340, label: "案内係", area: 0 },
  { id: "waiter-2", kind: "waiter", pos: { x: 130, y: 434 }, price: 1800, label: "案内係", area: 0 },
  { id: "collector-1", kind: "collector", pos: { x: 230, y: 434 }, price: 1100, label: "集金係", area: 0 },
  { id: "robot-1", kind: "robot", pos: { x: 310, y: 434 }, price: 5000, label: "案内ロボ", area: 0 },
  { id: "waiter-3", kind: "waiter", pos: { x: 470, y: 434 }, price: 12000, label: "案内係", area: 1 },
  { id: "robot-2", kind: "robot", pos: { x: 620, y: 434 }, price: 40000, label: "案内ロボ", area: 1 },
  { id: "waiter-4", kind: "waiter", pos: { x: 80, y: 912 }, price: 90000, label: "案内係", area: 2 },
  { id: "collector-2", kind: "collector", pos: { x: 260, y: 912 }, price: 130000, label: "集金係", area: 2 },
  { id: "robot-3", kind: "robot", pos: { x: 470, y: 912 }, price: 420000, label: "案内ロボ", area: 3 },
  { id: "waiter-5", kind: "waiter", pos: { x: 630, y: 912 }, price: 260000, label: "案内係", area: 3 },
  { id: "robot-4", kind: "robot", pos: { x: 180, y: 1392 }, price: 2200000, label: "案内ロボ", area: 4 },
  { id: "master-1", kind: "master", pos: { x: 540, y: 1392 }, price: 9000000, label: "園長", area: 5 },
  { id: "robot-5", kind: "robot", pos: { x: 900, y: 434 }, price: 26000000, label: "案内ロボ", area: 6 },

  // レストラン街: 料理人・ホール・テーブル係
  { id: "cook-6", kind: "cook", pos: { x: 840, y: 574 }, price: 90000000, label: "料理人", stoveId: "kitchen-1", area: 7 },
  { id: "cook-7", kind: "cook", pos: { x: 1040, y: 574 }, price: 200000000, label: "料理人", stoveId: "kitchen-2", area: 7 },
  { id: "waiter-6", kind: "waiter", pos: { x: 780, y: 912 }, price: 110000000, label: "ホール係", area: 7 },
  { id: "busser-1", kind: "busser", pos: { x: 900, y: 912 }, price: 150000000, label: "テーブル係", area: 7 },
  { id: "busser-2", kind: "busser", pos: { x: 1020, y: 912 }, price: 400000000, label: "テーブル係", area: 7 },

  // おみやげ通り: 倉庫番・品出し・レジ
  { id: "cook-8", kind: "cook", pos: { x: 840, y: 1054 }, price: 380000000, label: "倉庫番", stoveId: "store-1", area: 8 },
  { id: "cook-9", kind: "cook", pos: { x: 1040, y: 1054 }, price: 800000000, label: "倉庫番", stoveId: "store-2", area: 8 },
  { id: "stocker-1", kind: "stocker", pos: { x: 764, y: 1402 }, price: 500000000, label: "品出しスタッフ", area: 8 },
  { id: "stocker-2", kind: "stocker", pos: { x: 1036, y: 1402 }, price: 1200000000, label: "品出しスタッフ", area: 8 },
  { id: "collector-3", kind: "collector", pos: { x: 900, y: 1172 }, price: 700000000, label: "レジ係", area: 8 },

  // あとから前の区画に出てくるスタッフ
  { id: "busser-3", kind: "busser", pos: { x: 380, y: 434 }, price: 200000000, label: "テーブル係", area: 0, unlockAfter: "area-7" },
  { id: "stocker-3", kind: "stocker", pos: { x: 700, y: 434 }, price: 800000000, label: "品出しスタッフ", area: 1, unlockAfter: "area-8" },
];

const parkEquipment: EquipSpec[] = [
  { id: "noodle", name: "高速印刷機", detail: "すべての券売所が +30%", pos: { x: 470, y: 190 }, price: 40000, area: 1 },
  { id: "fridge", name: "チケット倉庫", detail: "券売所に貯めておける数 +4枚", pos: { x: 610, y: 190 }, price: 60000, area: 1 },
  { id: "ticket", name: "自動改札", detail: "お金が自動で入る・集金係は案内へ", pos: { x: 112, y: 0 }, price: 110000, area: 0, outside: true },
  { id: "sign", name: "園内アナウンス", detail: "お客さんが 1.5倍のペースで来る", pos: { x: 240, y: 0 }, price: 160000, area: 0, outside: true },
];

const parkUpgrades: Upgrade[] = [
  { id: "carry", name: "チケットホルダー", detail: (n) => `${3 + n}枚まで持てる・スタッフも ${3 + Math.floor(n / 2)}枚`, pos: { x: 46, y: 66 }, basePrice: 80, growth: 1.7, max: 9 },
  { id: "speed", name: "園内カート", detail: (n) => `足の速さ +${n * 10}%・スタッフも +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 70, growth: 1.65, max: 12 },
  { id: "cook", name: "発券機の改良", detail: (n) => `発券の速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 100, growth: 1.7, max: 14 },
  { id: "price", name: "入園料アップ", detail: (n) => `一人 ${Math.round(70 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 150, growth: 1.75, max: 20 },
];

/* ==================== 登録 ==================== */

export const stageDefs: Record<StageId, StageDef> = {
  ramen: {
    id: "ramen",
    name: "ラーメン一直線",
    subtitle: "屋台からはじめる",
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
      },
      objective: {
        pickup: "厨房で丼を受け取ろう",
        serve: "光っている配膳口まで運ぼう",
        coin: "お金を踏んで回収しよう",
        waitItem: "丼ができるまで待とう",
        waitGuest: "お客さんを待っています",
      },
      outside: "歩道",
      outsideDetail: "券売機と呼び込み看板はこの外に置く",
    },
  },
  park: {
    id: "park",
    name: "ドリームパーク",
    subtitle: "小さな遊園地からはじめる",
    frontRoom: { top: 38, bottom: 210 },
    areas: parkAreas,
    stoves: parkStoves,
    seats: parkSeats,
    hires: parkHires,
    equipment: parkEquipment,
    upgrades: parkUpgrades,
    baseValue: 70,
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
      },
      objective: {
        pickup: "券売所でチケットを受け取ろう",
        serve: "光っている改札まで届けよう",
        coin: "お金を踏んで回収しよう",
        waitItem: "チケットが刷れるまで待とう",
        waitGuest: "お客さんを待っています",
      },
      outside: "並木道",
      outsideDetail: "自動改札と園内アナウンスはこの外に置く",
    },
  },
};

export const stageList: StageDef[] = [stageDefs.ramen, stageDefs.park];
