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
  /**
   * ここに書いたものを開くと、同時に見せる枠の数がこの数まで増える。
   * 1区画目は「次の一手」だけ、2区画目からは 5〜10個から選べるようにする。
   */
  revealLimitBy?: Record<string, number>;
  /** 入口とお客さんの来る通りの横位置（省略で 306） */
  entranceX?: number;
  /** はじめる位置（省略で x180 y250） */
  startPos?: { x: number; y: number };
  /** 最初からくべてあるまき（1食目だけ、火の世話を教えずに済ませる） */
  startFuel?: Record<string, number>;
};

/**
 * 一列のうち、先まで見せておく枠の数。
 *
 * 1 だと「ひとつ買うと隣がひとつ出る」だけで、どれから手を付けるか選べない。
 * かといって全部見えていると多すぎて分からなくなるので、少し先まで見せる
 */
const AHEAD = 2;

/**
 * 席は左から順に出す。AHEAD 個先まで並んで見えていて、
 * ひとつ買うと、そのぶん先の枠が出てくる
 */
const chain = (prefix: string, area: number, i: number) =>
  i >= AHEAD ? `${prefix}-${area}-${i + 1 - AHEAD}` : undefined;

const seatRow = (
  area: number,
  xs: number[],
  baseY: number,
  prices: number[],
  label: string,
  /** 一度に必要な数。席ごとに変えるときは配列で渡す */
  cost: number | number[] = 1,
): SeatSpec[] =>
  xs.map((x, i) => {
    const need = Array.isArray(cost) ? cost[i] : cost;
    return {
      id: `seat-${area}-${i + 1}`,
      pos: { x, y: baseY + 64 },
      serve: { x, y: baseY },
      tray: { x, y: baseY + 24 },
      price: prices[i],
      area,
      label,
      cost: need,
      value: need * 1.25,
      unlockAfter: chain("seat", area, i),
    };
  });

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
    unlockAfter: table.unlockAfter ?? chain("table", area, i),
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
    unlockAfter: shelf.unlockAfter ?? chain("shelf", area, i),
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
  /**
   * 最後の区画。ここだけ桁がひとつもふたつも違う。
   * 席は一度に何杯もまとめて出す注文ばかりで、
   * 運ぶ数（両手鍋）と作る速さを上げきらないと、まともに回らない
   */
  {
    id: "area-4",
    label: "幻の総本店をつくる",
    price: 50000000,
    // 屋台の街区と同じ高さをまるごと使う、いちばん大きな建物
    rect: { x0: 720, y0: 0, x1: 1080, y1: 790 },
    padPos: { x: 658, y: 250 },
    palette: { floor: "#332a2c", deep: "#221a1c", prop: "none" },
    // 宣伝トラックが町を回るくらい有名になってから、はじめて話が来る
    unlockAfter: "equip-truck",
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
  // 総本店の厨房。ここの寸胴だけ桁が違う
  { id: "stove-6", pos: { x: 800, y: 176 }, price: 90000000, area: 4, label: "秘伝の寸胴" },
  { id: "stove-7", pos: { x: 940, y: 176 }, price: 260000000, area: 4, label: "大釜" },
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
  // 総本店の席。一度に 4杯・5杯・6杯 とまとめて出す大口の注文ばかり
  ...seatRow(
    4,
    [790, 900, 1010],
    294,
    [400000000, 1400000000, 5000000000],
    "特上座敷",
    [4, 5, 6],
  ),
];

/**
 * 調理人は、担当の寸胴を買えば出てくる（寸胴は engine 側で必ず要る）。
 * 1人目だけ、2つ目の寸胴を買ってから ―「まず自分で回してみる」を挟むため
 */
const ramenCookAfter = ["stove-2"];

const ramenHires: HireSpec[] = [
  ...ramenStoves
    .filter((stove) => (stove.item ?? "main") === "main")
    .map((stove, i) => ({
      id: `cook-${i + 1}`,
      kind: "cook" as const,
      pos: { x: stove.pos.x + 40, y: 130 },
      price: [600, 1800, 4500, 30000, 70000, 110000000, 320000000][i],
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
  { id: "robot-2", kind: "robot", pos: { x: 300, y: 700 }, price: 15000, label: "配膳ロボ", area: 1, unlockAfter: "waiter-3" },
  { id: "master-1", kind: "master", pos: { x: 430, y: 700 }, price: 180000, label: "板前", area: 3 },
  { id: "robot-3", kind: "robot", pos: { x: 560, y: 700 }, price: 260000, label: "配膳ロボ", area: 3, unlockAfter: "waiter-4" },
  { id: "waiter-4", kind: "waiter", pos: { x: 680, y: 700 }, price: 90000, label: "ホール店員", area: 3 },
  // 持ち帰りコーナーができると、製麺所に品出しが立てられる
  { id: "stocker-r1", kind: "stocker", pos: { x: 450, y: 440 }, price: 1800000, label: "品出し", area: 2, unlockAfter: "area-3" },
  // 総本店の面々
  { id: "waiter-5", kind: "waiter", pos: { x: 780, y: 560 }, price: 200000000, label: "ホール店員", area: 4 },
  { id: "robot-4", kind: "robot", pos: { x: 900, y: 560 }, price: 700000000, label: "配膳ロボ", area: 4, unlockAfter: "waiter-5" },
  { id: "collector-3", kind: "collector", pos: { x: 1020, y: 560 }, price: 1600000000, label: "レジ係", area: 4 },
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
  { id: "blimp", name: "飛行船の広告", detail: "空から町ぜんぶに知らせる。集客 2.2倍", pos: { x: 790, y: 0 }, price: 1200000000, area: 4, outside: true, draw: 2.2, unlockAfter: "area-4" },
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
  /**
   * 最後の区画。生きている火山のふもとに作る、いちばん過激なエリア。
   * 乗り物はどれも 4枚・5枚・6枚 とチケットをまとめて要求するので、
   * 発券の速さも、運べる枚数も、上げきらないと客がさばけない
   */
  {
    id: "area-9",
    label: "火山の秘境をひらく",
    price: 5000000000,
    // 山のふもとを縦にまるごと使う、園でいちばん広い区画
    rect: { x0: 1080, y0: 0, x1: 1440, y1: 1440 },
    padPos: { x: 1018, y: 250 },
    palette: { floor: "#5c3a30", deep: "#3a221c", prop: "volcano" },
    // おみやげ通りを最後まで並べきった園にだけ、開拓の許可が下りる
    unlockAfter: "shelf-8-3",
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
  // 火山の秘境の券売所。乗り物が一度に4〜6枚食うので、二軒めがいる
  { id: "crater-1", pos: { x: 1160, y: 176 }, price: 6000000000, area: 9, label: "火口の券売所" },
  { id: "crater-2", pos: { x: 1290, y: 880 }, price: 14000000000, area: 9, label: "溶岩原の券売所" },
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
    unlockAfter: chain("seat", area, i),
  }));

const parkSeats: SeatSpec[] = [
  ...rideRow(0, 294, [
    { x: 60, price: 0, label: "コーヒーカップ", art: "teacup", detail: "くるくる回るカップ" },
    { x: 140, price: 0, label: "パンダライド", art: "panda", detail: "小さな子に人気の乗り物" },
    { x: 220, price: 140, label: "射的コーナー", art: "shooting", detail: "的を撃ち抜く縁日ゲーム" },
    { x: 300, price: 420, label: "ミニ観覧車", cost: 2, art: "wheel", detail: "広場を見下ろす小さな観覧車" },
  ]),
  ...rideRow(1, 294, [
    { x: 432, price: 700, label: "メリーゴーラウンド", art: "carousel", detail: "白馬がゆっくり上下する" },
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

  /* 火山の秘境: 園でいちばん過激な3つ。チケットもまとめて要る */
  ...rideRow(9, 294, [
    { x: 1152, price: 10000000000, label: "マグマコースター", cost: 4, art: "coaster", detail: "火口すれすれを一気に落ちる" },
    { x: 1260, price: 26000000000, label: "溶岩ラフト", cost: 5, art: "lava", detail: "煮えたぎる流れをいかだで下る" },
    { x: 1368, price: 60000000000, label: "大噴火タワー", cost: 6, art: "blast", detail: "噴火に合わせて空へ打ち上がる" },
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

/** 券売スタッフは、担当の券売所を買えば出てくる（1人目だけ2つ目の券売所から） */
const parkCookAfter = ["stove-2"];

const parkHires: HireSpec[] = [
  // 券売所（stove-N）に付くスタッフは cook-1…と順に作る。
  // 火口の券売所は番号がぶつかるので、下で名前を付けて足す
  ...parkStoves
    .filter(
      (stove) =>
        (stove.item ?? "main") === "main" && stove.id.startsWith("stove-"),
    )
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

  // 火山の秘境
  { id: "cook-12", kind: "cook", pos: { x: 1200, y: 130 }, price: 8000000000, label: "券売スタッフ", stoveId: "crater-1", area: 9 },
  { id: "cook-13", kind: "cook", pos: { x: 1330, y: 834 }, price: 18000000000, label: "券売スタッフ", stoveId: "crater-2", area: 9 },
  { id: "waiter-6", kind: "waiter", pos: { x: 1140, y: 640 }, price: 9000000000, label: "案内係", area: 9 },
  { id: "robot-6", kind: "robot", pos: { x: 1260, y: 640 }, price: 24000000000, label: "案内ロボ", area: 9, unlockAfter: "waiter-6" },
  { id: "collector-4", kind: "collector", pos: { x: 1380, y: 640 }, price: 32000000000, label: "集金係", area: 9 },

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
  { id: "crater", name: "噴火ショー", detail: "夜ごと山が火を噴く園の目玉。集客 2.6倍", pos: { x: 940, y: 0 }, price: 40000000000, area: 9, outside: true, draw: 2.6, unlockAfter: "area-9" },
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
  /** 同じ区画に二種類のベンチを置くときの区別（id に入る） */
  tag = "",
): SeatSpec[] =>
  benches.map((bench, i) => ({
    id: `seat-${area}-${tag}${i + 1}`,
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
    // 席の列と同じで、ふたつ先まで並べて見せる
    unlockAfter:
      bench.unlockAfter ??
      (i >= AHEAD ? `seat-${area}-${tag}${i + 1 - AHEAD}` : undefined),
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
    label: "東に集落をひらく",
    price: 2400,
    rect: { x0: 720, y0: 0, x1: 1620, y1: 760 },
    padPos: { x: 690, y: 300 },
    palette: { floor: "#26301c", deep: "#182010", prop: "none" },
    // 1区画目が自動でまわるようになってから、はじめて外の話が出てくる。
    // 便利にする設備（樋・石おの）より先に見せて、
    //「いまを楽にするか、東へ広げるか」を選べるようにする
    unlockAfter: "robot-1",
    reveal: 11.6,
  },
  {
    id: "area-2",
    label: "マンモスの谷へ下りる",
    price: 18000,
    rect: { x0: 1620, y0: 0, x1: 2860, y1: 760 },
    padPos: { x: 1590, y: 300 },
    palette: { floor: "#3a3128", deep: "#241d17", prop: "none" },
    // 集会所ができて、みんなが集まってはじめて足跡の話が出る
    unlockAfter: "built-build-hall",
    reveal: 40,
  },
  {
    id: "area-3",
    label: "冬ごもりの丘へうつる",
    price: 180000,
    rect: { x0: 2860, y0: 0, x1: 3760, y1: 760 },
    padPos: { x: 2830, y: 300 },
    palette: { floor: "#44505c", deep: "#2a343e", prop: "snow" },
    // 大宴会のあと、雪雲が近づいてくる
    unlockAfter: "built-build-feast",
    reveal: 60,
  },
  {
    id: "area-4",
    label: "村をつくる",
    price: 700000,
    rect: { x0: 3760, y0: 0, x1: 4660, y1: 760 },
    padPos: { x: 3730, y: 300 },
    palette: { floor: "#3c4230", deep: "#252a1c", prop: "none" },
    // 寒い夜を3回越えると、雪が解けはじめる
    unlockAfter: "mark-cold-3",
    reveal: 80,
  },
  {
    id: "area-5",
    label: "川へ下りる",
    price: 3000000,
    rect: { x0: 4660, y0: 0, x1: 5560, y1: 760 },
    padPos: { x: 4630, y: 300 },
    palette: { floor: "#2f4247", deep: "#1b2a2f", prop: "ship" },
    // 村がひととおりそろってから、探索者が川を見つける
    unlockAfter: "mark-pop-24",
    reveal: 100,
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

  /* ============ area-1 第2区画「集落のはじまり」 ============
   *
   * その場で食べるだけの生活から、蓄えて、仲間が暮らす集落へ。
   *
   *   1区画目の生肉 ─┐
   *                   ├─▶ たき火 ──(焼き肉)─┬─▶ ベンチの仲間（貝がら）
   *   森 ─(丸太)─┬─ 薪割り場 ─(薪)─┘        └─▶ 燻製小屋 ─(保存肉)─▶ 食料庫 ─▶ 夜の食事
   *              └──────────────────────────────▶ 建築予定地（住居・集会所）
   *
   * 丸太をぜんぶ薪にすると家が建たない。ぜんぶ建築に回すと火が消える。
   * この配分が第2区画のいちばんの判断になる。
   */
  { id: "store-1", pos: { x: 1200, y: 300 }, price: 1200, area: 1, takes: "smoked", store: true, hold: 8, art: "store", label: "食料庫", reveal: 22 },
  { id: "smoke-1", pos: { x: 1040, y: 196 }, price: 1500, area: 1, item: "smoked", takes: "roast", fuel: "wood", art: "smoke", label: "燻製小屋", work: 1.5, reveal: 24 },
  { id: "fire-2", pos: { x: 880, y: 196 }, price: 1000, area: 1, item: "roast", takes: "meat", fuel: "wood", art: "fire", label: "たき火", reveal: 23 },
  { id: "forest-2", pos: { x: 1470, y: 330 }, price: 1700, area: 1, item: "log", art: "forest", label: "東の森", zone: { x0: 1330, y0: 80, x1: 1596, y1: 300 }, hold: 6, reveal: 25 },
  { id: "split-2", pos: { x: 1420, y: 430 }, price: 1900, area: 1, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5, reveal: 26 },
  // 建築予定地: 買うと予定地が立ち、材料を運びこむと建物になる
  {
    id: "build-hut-1", pos: { x: 800, y: 600 }, price: 600, area: 1,
    art: "hut", label: "最初の住居", needs: { log: 6, smoked: 4 },
    gives: { houses: 2, note: "住居ができた！ 仲間が住みはじめる" }, reveal: 28,
  },
  {
    id: "build-hearth", pos: { x: 1120, y: 590 }, price: 1300, area: 1,
    art: "hearth", label: "共同たき火", needs: { log: 4, wood: 4 },
    gives: { hearth: true, warm: 2, note: "共同たき火に火が入った。夜の広場が明るい" },
    unlockAfter: "built-build-hut-1", reveal: 31,
  },
  {
    id: "build-hut-2", pos: { x: 950, y: 650 }, price: 1800, area: 1,
    art: "hut", label: "2軒目の住居", needs: { log: 8, smoked: 6 },
    gives: { houses: 2, note: "2軒目の住居ができた" },
    unlockAfter: "built-build-hut-1", reveal: 33,
  },
  {
    id: "build-hut-3", pos: { x: 1270, y: 650 }, price: 3400, area: 1,
    art: "hut", label: "3軒目の住居", needs: { log: 10, smoked: 6 },
    gives: { houses: 3, note: "3軒目の住居ができた" },
    unlockAfter: "built-build-hut-2", reveal: 36,
  },
  {
    id: "build-hall", pos: { x: 1420, y: 590 }, price: 5000, area: 1,
    art: "hall", label: "集会所", needs: { log: 14, wood: 6, smoked: 6 },
    gives: { warm: 1, note: "集会所ができた ― 谷でマンモスの足跡が見つかった" },
    unlockAfter: "built-build-hut-2", reveal: 38,
  },

  /* ============ area-2 第3区画「マンモスの谷」 ============
   *
   * 一定時間ごとに肉を出す設備ではなく、
   * 歩き、警戒し、逃げ、突進してくる一頭を、みんなで追い込んで倒す。
   * 倒したあとは解体と大量輸送がはじまる。
   */
  {
    id: "mammoth-1", pos: { x: 2150, y: 470 }, price: 9000, area: 2,
    art: "valley", label: "狩猟キャンプ", beast: true, hold: 1,
    zone: { x0: 1700, y0: 80, x1: 2620, y1: 400 }, reveal: 41,
  },
  // 解体場は狩猟キャンプについてくる（買い忘れで解体が止まらないように）
  { id: "pile-meat", pos: { x: 2060, y: 640 }, price: 0, area: 2, item: "mmeat", pile: true, hold: 8, art: "pile", label: "肉置き場", unlockAfter: "mammoth-1" },
  { id: "pile-hide", pos: { x: 2200, y: 640 }, price: 0, area: 2, item: "hide", pile: true, hold: 6, art: "pile", label: "毛皮置き場", unlockAfter: "mammoth-1" },
  { id: "pile-bone", pos: { x: 2340, y: 640 }, price: 0, area: 2, item: "bone", pile: true, hold: 6, art: "pile", label: "骨置き場", unlockAfter: "mammoth-1" },
  { id: "pile-fat", pos: { x: 2480, y: 640 }, price: 0, area: 2, item: "fat", pile: true, hold: 6, art: "pile", label: "脂置き場", unlockAfter: "mammoth-1" },
  { id: "pile-tusk", pos: { x: 2620, y: 640 }, price: 0, area: 2, item: "tusk", pile: true, hold: 4, art: "pile", label: "牙置き場", unlockAfter: "mammoth-1" },
  { id: "grill-1", pos: { x: 1760, y: 600 }, price: 26000, area: 2, item: "feast", takes: "mmeat", fuel: "wood", art: "grill", label: "大かまど", reveal: 48 },
  { id: "bone-1", pos: { x: 1920, y: 600 }, price: 30000, area: 2, item: "tool", takes: "bone", art: "bonework", label: "骨細工場", work: 1.2, reveal: 52 },
  {
    id: "build-feast", pos: { x: 2760, y: 600 }, price: 40000, area: 2,
    art: "feast", label: "大宴会場", needs: { mmeat: 30, wood: 16, fat: 4 },
    gives: { warm: 1, note: "大宴会がはじまった ― 火の粉が夜空へ上がる" },
    unlockAfter: "mark-kills-2", reveal: 57,
  },

  /* ============ area-3 第4区画「冬を越す」 ============
   *
   * 集めるだけでなく、集落全体が生きられる環境をつくる。
   * 気温・吹雪・保温・防寒着。人は死なないが、寒いと何もかも遅くなる。
   */
  { id: "tan-1", pos: { x: 2960, y: 210 }, price: 60000, area: 3, item: "coat", takes: "hide", art: "tan", label: "皮なめし場", work: 1.2, reveal: 61 },
  { id: "store-coat", pos: { x: 3100, y: 210 }, price: 30000, area: 3, takes: "coat", store: true, hold: 10, art: "rack", label: "衣装棚", reveal: 62 },
  { id: "store-wood", pos: { x: 3250, y: 210 }, price: 45000, area: 3, takes: "wood", store: true, hold: 20, art: "woodstore", label: "大型薪倉庫", reveal: 63 },
  { id: "store-food2", pos: { x: 3400, y: 210 }, price: 70000, area: 3, takes: "smoked", store: true, hold: 16, art: "store", label: "保存肉倉庫", reveal: 66 },
  {
    id: "build-hearth-2", pos: { x: 3120, y: 570 }, price: 40000, area: 3,
    art: "hearth", label: "丘の共同たき火", needs: { log: 6, wood: 8 },
    gives: { hearth: true, warm: 3, note: "丘にも火が入った" }, reveal: 64,
  },
  {
    id: "build-hut-4", pos: { x: 2960, y: 570 }, price: 50000, area: 3,
    art: "furhut", label: "毛皮の住居", needs: { log: 10, hide: 4 },
    gives: { houses: 4, warm: 2, note: "毛皮の住居ができた。夜が寒くない" }, reveal: 65,
  },
  {
    id: "build-lamp", pos: { x: 3280, y: 570 }, price: 60000, area: 3,
    art: "lamp", label: "脂のランプ", needs: { fat: 4, bone: 2 },
    gives: { warm: 2, note: "脂のランプがともった。夜も手もとが見える" }, reveal: 68,
  },
  {
    id: "build-hut-5", pos: { x: 3440, y: 570 }, price: 90000, area: 3,
    art: "furhut", label: "大きな毛皮の住居", needs: { log: 14, hide: 6, coat: 2 },
    gives: { houses: 4, warm: 1, note: "大きな住居ができた" },
    unlockAfter: "built-build-hut-4", reveal: 70,
  },

  /* ============ area-4 第5区画「村の誕生」 ============
   *
   * 仮の集落から、長く暮らす村へ。ここからは人口が主な進み具合になる。
   */
  // 村と川辺には、それぞれの森を置く。
  // ここまで来て第1・第2区画から丸太を運ばせると、道のりが長すぎて
  // 土器も、いかだも、公共設備も、いつまでも建たない（素振りで詰まった）
  { id: "forest-4", pos: { x: 4570, y: 300 }, price: 90000, area: 4, item: "log", art: "forest", label: "村はずれの森", zone: { x0: 4400, y0: 90, x1: 4645, y1: 250 }, hold: 6, reveal: 80.5 },
  { id: "split-4", pos: { x: 4430, y: 300 }, price: 110000, area: 4, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5, reveal: 80.7 },
  { id: "claypit-1", pos: { x: 3860, y: 230 }, price: 120000, area: 4, item: "clay", art: "clay", label: "粘土穴", manual: true, work: 0.8, hold: 6, reveal: 81 },
  { id: "pottery-1", pos: { x: 4010, y: 230 }, price: 160000, area: 4, item: "pot", takes: "clay", fuel: "wood", art: "pottery", label: "土器工房", reveal: 82 },
  { id: "tool-1", pos: { x: 4160, y: 230 }, price: 200000, area: 4, item: "tool", takes: "bone", art: "toolshop", label: "道具工房", work: 0.8, reveal: 85 },
  {
    id: "build-well", pos: { x: 3860, y: 570 }, price: 100000, area: 4,
    art: "well", label: "井戸", needs: { log: 8, wood: 6 },
    gives: { note: "井戸ができた。水くみが village の仕事になる" }, reveal: 83,
  },
  {
    id: "build-gate", pos: { x: 4020, y: 570 }, price: 220000, area: 4,
    art: "gate", label: "村の門", needs: { log: 16, tusk: 2 },
    gives: { note: "村の門が立った" }, reveal: 87,
  },
  {
    id: "build-watch", pos: { x: 4180, y: 570 }, price: 260000, area: 4,
    art: "watch", label: "見張り台", needs: { log: 12, wood: 8, tool: 2 },
    gives: { note: "見張り台から遠くが見える" }, reveal: 89,
  },
  {
    id: "build-hut-6", pos: { x: 4340, y: 570 }, price: 300000, area: 4,
    art: "bighut", label: "大きな住居", needs: { log: 16, hide: 8, pot: 2 },
    gives: { houses: 6, warm: 1, note: "大きな住居ができた" }, reveal: 90,
  },
  {
    id: "build-hut-7", pos: { x: 4340, y: 660 }, price: 380000, area: 4,
    art: "bighut", label: "もう一軒の大きな住居", needs: { log: 18, hide: 8, pot: 4 },
    gives: { houses: 6, warm: 1, note: "村の住居がそろった" },
    unlockAfter: "built-build-hut-6", reveal: 92.5,
  },
  {
    id: "build-hall2", pos: { x: 4500, y: 570 }, price: 400000, area: 4,
    art: "hall", label: "集会所の拡張", needs: { log: 20, pot: 6, tusk: 2 },
    gives: { warm: 1, note: "集会所が広がった。村じゅうが集まれる" },
    unlockAfter: "built-build-gate", reveal: 93,
  },

  /* ============ area-5 第6区画「川への道」 ============
   *
   * 村の内側を整える段階から、遠くの土地を探し、交易をはじめる段階へ。
   */
  { id: "forest-5", pos: { x: 5080, y: 250 }, price: 300000, area: 5, item: "log", art: "forest", label: "川辺の林", zone: { x0: 4995, y0: 100, x1: 5180, y1: 225 }, hold: 6, reveal: 100.5 },
  { id: "split-5", pos: { x: 5080, y: 330 }, price: 340000, area: 5, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5, reveal: 100.7 },
  { id: "plank-1", pos: { x: 4770, y: 230 }, price: 600000, area: 5, item: "plank", takes: "log", art: "plank", label: "木材加工場", reveal: 101 },
  { id: "rope-1", pos: { x: 4920, y: 230 }, price: 500000, area: 5, item: "rope", takes: "log", art: "rope", label: "縄工房", work: 0.8, reveal: 102 },
  { id: "fish-1", pos: { x: 5330, y: 250 }, price: 400000, area: 5, item: "fish", art: "fish", label: "川の瀬", manual: true, hold: 6, zone: { x0: 5200, y0: 110, x1: 5530, y1: 360 }, reveal: 103 },
  { id: "store-river", pos: { x: 4920, y: 400 }, price: 800000, area: 5, takes: "smoked", store: true, hold: 20, art: "store", label: "川辺の倉庫", reveal: 106 },
  {
    id: "build-raft-s", pos: { x: 5090, y: 520 }, price: 700000, area: 5,
    art: "raft", label: "小型いかだ", needs: { plank: 6, rope: 4 },
    gives: { dock: true, note: "小型いかだができた ― 探索に出られる" }, reveal: 104,
  },
  {
    id: "build-raft-l", pos: { x: 5290, y: 560 }, price: 2000000, area: 5,
    art: "bigraft", label: "大型いかだ",
    needs: { plank: 14, rope: 8, smoked: 12, hide: 6, tool: 4, pot: 4 },
    gives: { sail: true, note: "大型いかだができた" },
    unlockAfter: "found-river", reveal: 110,
  },
];

const fireSeats: SeatSpec[] = [
  // 1席目は最初から。2席目は「はこび手を雇ったあと」に出す（段階5）
  ...benchRow(0, 424, "roast", 1, "丸太のベンチ", [
    { x: 120, price: 0 },
    { x: 248, price: 76, unlockAfter: "waiter-1", reveal: 5 },
    { x: 376, price: 90, unlockAfter: "waiter-2", reveal: 7.5 },
  ]),
  // 第2区画: 集落の広場に面したベンチ。焼き肉を渡すと貝がらが落ちる
  ...benchRow(1, 420, "roast", 1.6, "集落のベンチ", [
    { x: 790, price: 1400, reveal: 27 },
    { x: 910, price: 3400, reveal: 34 },
    { x: 1030, price: 8000, reveal: 37 },
  ]),
  // 第3区画: マンモスのごちそうを配る宴席
  ...benchRow(2, 690, "feast", 3.2, "谷の宴席", [
    { x: 1760, price: 24000, reveal: 49 },
    { x: 1920, price: 52000, reveal: 53 },
    { x: 2080, price: 110000, reveal: 58 },
  ]),
  // 第4区画: 冬のたき火席。保存肉は夜の食事でもあるので、配ると夜が細る
  ...benchRow(3, 390, "smoked", 2.2, "冬のたき火席", [
    { x: 2960, price: 60000, reveal: 67 },
    { x: 3110, price: 110000, reveal: 69 },
    { x: 3260, price: 200000, reveal: 72 },
  ]),
  // 第5区画: 村の食卓（土器）と、道具の市
  ...benchRow(4, 390, "pot", 3, "村の食卓", [
    { x: 3880, price: 150000, reveal: 84 },
    { x: 4020, price: 280000, reveal: 88 },
  ]),
  ...benchRow(4, 390, "tool", 3.4, "道具の市", [
    { x: 4300, price: 420000, reveal: 91 },
    { x: 4440, price: 700000, reveal: 94 },
  ], "t"),
  // 第6区画: 川辺の魚と、別の集落との交易
  ...benchRow(5, 390, "fish", 2.6, "川辺の席", [
    { x: 4770, price: 500000, reveal: 105 },
    { x: 4910, price: 900000, reveal: 108 },
  ]),
  ...benchRow(5, 390, "hide", 5, "交易の席", [
    { x: 5060, price: 1500000, unlockAfter: "found-village", reveal: 109 },
    { x: 5200, price: 2600000, reveal: 111 },
  ], "t"),
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

  /* --- area-1 第2区画: 集落を回す人たち --- */
  { id: "fireman-2", kind: "cook", pos: { x: 810, y: 150 }, price: 2800, label: "火の番", stoveId: "fire-2", area: 1, reveal: 23.5 },
  { id: "smoker-1", kind: "cook", pos: { x: 1110, y: 150 }, price: 3400, label: "燻製係", stoveId: "smoke-1", area: 1, reveal: 24.5 },
  { id: "logger-2", kind: "logger", pos: { x: 1540, y: 380 }, price: 2000, label: "木こり", stoveId: "forest-2", area: 1, reveal: 25.5 },
  { id: "splitter-2", kind: "splitter", pos: { x: 1490, y: 470 }, price: 2400, label: "薪割り", stoveId: "split-2", area: 1, reveal: 26.5 },
  { id: "waiter-3", kind: "waiter", pos: { x: 1160, y: 430 }, price: 3200, label: "はこび手", area: 1, reveal: 29 },
  { id: "builder-1", kind: "builder", pos: { x: 870, y: 510 }, price: 4000, label: "建築係", area: 1, reveal: 30 },
  { id: "keeper-1", kind: "keeper", pos: { x: 1280, y: 360 }, price: 4600, label: "食料番", area: 1, reveal: 32 },
  { id: "nightman-1", kind: "nightman", pos: { x: 1180, y: 680 }, price: 7000, label: "夜番", area: 1, unlockAfter: "built-build-hearth", reveal: 35 },
  { id: "robot-2", kind: "robot", pos: { x: 1330, y: 470 }, price: 26000, label: "犬ぞり", area: 1, reveal: 39 },

  /* --- area-2 第3区画: 狩猟隊と解体場 --- */
  { id: "hunter-v1", kind: "hunter", pos: { x: 1700, y: 490 }, price: 12000, label: "狩人", stoveId: "mammoth-1", area: 2, reveal: 42 },
  { id: "hunter-v2", kind: "hunter", pos: { x: 1790, y: 490 }, price: 16000, label: "狩人", stoveId: "mammoth-1", area: 2, unlockAfter: "hunter-v1", reveal: 43 },
  { id: "tracker-1", kind: "explorer", pos: { x: 1880, y: 490 }, price: 18000, label: "追跡者", area: 2, unlockAfter: "hunter-v2", reveal: 44 },
  { id: "butcher-1", kind: "butcher", pos: { x: 2340, y: 490 }, price: 20000, label: "解体係", stoveId: "mammoth-1", area: 2, unlockAfter: "mark-kills-1", reveal: 45 },
  { id: "waiter-4", kind: "waiter", pos: { x: 2460, y: 490 }, price: 24000, label: "はこび手", area: 2, reveal: 46 },
  { id: "hunter-v3", kind: "hunter", pos: { x: 1970, y: 490 }, price: 22000, label: "狩人", stoveId: "mammoth-1", area: 2, unlockAfter: "tracker-1", reveal: 47 },
  { id: "fireman-3", kind: "cook", pos: { x: 1700, y: 560 }, price: 34000, label: "火の番", stoveId: "grill-1", area: 2, reveal: 50 },
  { id: "butcher-2", kind: "butcher", pos: { x: 2420, y: 560 }, price: 34000, label: "解体係", stoveId: "mammoth-1", area: 2, unlockAfter: "butcher-1", reveal: 51 },
  { id: "hunter-v4", kind: "hunter", pos: { x: 2060, y: 490 }, price: 30000, label: "狩人", stoveId: "mammoth-1", area: 2, unlockAfter: "hunter-v3", reveal: 54 },
  { id: "chief-1", kind: "master", pos: { x: 2150, y: 560 }, price: 90000, label: "狩猟隊長", area: 2, unlockAfter: "hunter-v4", reveal: 55 },
  { id: "robot-3", kind: "robot", pos: { x: 2560, y: 490 }, price: 60000, label: "犬ぞり", area: 2, reveal: 56 },

  /* --- area-3 第4区画: 冬を越す人たち --- */
  { id: "tanner-1", kind: "cook", pos: { x: 2960, y: 160 }, price: 80000, label: "皮なめし職人", stoveId: "tan-1", area: 3, reveal: 71 },
  { id: "builder-2", kind: "builder", pos: { x: 2900, y: 660 }, price: 65000, label: "建築係", area: 3, reveal: 73 },
  { id: "nightman-2", kind: "nightman", pos: { x: 3120, y: 670 }, price: 70000, label: "夜番", area: 3, reveal: 74 },
  { id: "keeper-2", kind: "keeper", pos: { x: 3400, y: 300 }, price: 90000, label: "食料番", area: 3, reveal: 75 },
  { id: "robot-4", kind: "robot", pos: { x: 3600, y: 300 }, price: 160000, label: "雪用犬ぞり", area: 3, reveal: 76 },

  /* --- area-4 第5区画: 村の職業 --- */
  { id: "logger-4", kind: "logger", pos: { x: 4620, y: 370 }, price: 130000, label: "木こり", stoveId: "forest-4", area: 4, reveal: 80.6 },
  { id: "splitter-4", kind: "splitter", pos: { x: 4370, y: 350 }, price: 140000, label: "薪割り", stoveId: "split-4", area: 4, reveal: 80.8 },
  { id: "digger-1", kind: "cook", pos: { x: 3860, y: 175 }, price: 180000, label: "井戸番", stoveId: "claypit-1", area: 4, reveal: 86 },
  { id: "potter-1", kind: "cook", pos: { x: 4010, y: 175 }, price: 240000, label: "土器職人", stoveId: "pottery-1", area: 4, reveal: 92 },
  { id: "smith-1", kind: "cook", pos: { x: 4160, y: 175 }, price: 280000, label: "道具職人", stoveId: "tool-1", area: 4, reveal: 95 },
  { id: "builder-3", kind: "builder", pos: { x: 3800, y: 660 }, price: 260000, label: "建築係", area: 4, reveal: 96 },
  { id: "waiter-5", kind: "waiter", pos: { x: 4460, y: 300 }, price: 200000, label: "はこび手", area: 4, reveal: 97 },
  { id: "robot-5", kind: "robot", pos: { x: 4560, y: 300 }, price: 500000, label: "犬ぞり", area: 4, reveal: 98 },
  { id: "elder-1", kind: "master", pos: { x: 4340, y: 300 }, price: 900000, label: "村長", area: 4, unlockAfter: "built-build-hall2", reveal: 99 },

  /* --- area-5 第6区画: 川の人たち --- */
  { id: "logger-5", kind: "logger", pos: { x: 4990, y: 300 }, price: 380000, label: "木こり", stoveId: "forest-5", area: 5, reveal: 100.6 },
  { id: "splitter-5", kind: "splitter", pos: { x: 5150, y: 330 }, price: 420000, label: "薪割り", stoveId: "split-5", area: 5, reveal: 100.8 },
  { id: "sawyer-1", kind: "cook", pos: { x: 4770, y: 175 }, price: 900000, label: "船大工", stoveId: "plank-1", area: 5, reveal: 107 },
  { id: "roper-1", kind: "cook", pos: { x: 4920, y: 175 }, price: 800000, label: "縄職人", stoveId: "rope-1", area: 5, reveal: 112 },
  { id: "fisher-1", kind: "cook", pos: { x: 5330, y: 195 }, price: 700000, label: "漁師", stoveId: "fish-1", area: 5, reveal: 113 },
  { id: "explorer-1", kind: "explorer", pos: { x: 5060, y: 620 }, price: 1200000, label: "探索者", area: 5, unlockAfter: "built-build-raft-s", reveal: 114 },
  { id: "explorer-2", kind: "explorer", pos: { x: 5150, y: 620 }, price: 2000000, label: "探索者", area: 5, unlockAfter: "explorer-1", reveal: 115 },
  { id: "loader-1", kind: "builder", pos: { x: 5290, y: 660 }, price: 1500000, label: "積み込み係", area: 5, reveal: 116 },
  { id: "robot-6", kind: "robot", pos: { x: 4700, y: 400 }, price: 1800000, label: "水運の犬ぞり", area: 5, reveal: 117 },
];

const fireEquipment: EquipSpec[] = [
  // 直結の設備（区間を消す）: 生肉・丸太・薪を、次の場所へ直接おくる
  { id: "chute-meat", name: "肉はこびそり", detail: "生肉を、たき火へ直接おくる", pos: { x: 250, y: 260 }, price: 6000, area: 0, link: { from: "hunt-1", to: "fire-1" }, unlockAfter: "robot-1", reveal: 12 },
  { id: "chute-log", name: "丸太ころがし", detail: "丸太を、薪割り場へ直接おくる", pos: { x: 618, y: 360 }, price: 9000, area: 0, link: { from: "forest-1", to: "split-1" }, unlockAfter: "equip-chute-meat", reveal: 13 },
  { id: "chute-wood", name: "薪のとい", detail: "薪を、たき火へ直接おくる", pos: { x: 444, y: 300 }, price: 14000, area: 0, link: { from: "split-1", to: "fire-1" }, unlockAfter: "equip-chute-log", reveal: 14 },
  // 道具の強化・集客
  { id: "noodle", name: "石おの", detail: "すべての作業場が +30%速くなる", pos: { x: 660, y: 480 }, price: 24000, area: 0, unlockAfter: "equip-chute-wood", reveal: 15 },
  { id: "fridge", name: "ほぞ穴の倉", detail: "受け口・出し口に積める数 +4", pos: { x: 660, y: 220 }, price: 45000, area: 0, unlockAfter: "equip-noodle", reveal: 16 },
  { id: "ticket", name: "貝がら入れ", detail: "貝がらが自動でサイフに入る・拾い手は運びへ", pos: { x: 250, y: 0 }, price: 30000, area: 0, outside: true, unlockAfter: "equip-noodle", reveal: 17 },
  { id: "flag", name: "けむりのろし", detail: "遠くの仲間を呼ぶ。集まりが 1.25倍", pos: { x: 120, y: 0 }, price: 1200, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "collector-1", reveal: 18 },
  { id: "sign", name: "物見やぐら", detail: "仲間が 1.5倍のはやさで来る", pos: { x: 380, y: 0 }, price: 60000, area: 0, outside: true, unlockAfter: "equip-ticket", reveal: 19 },

  /* --- 第2区画: 蓄えを増やす --- */
  { id: "store-plus-1", name: "食料庫の棚", detail: "食料庫に積める数 +4", pos: { x: 1280, y: 250 }, price: 2400, area: 1, capacity: { stove: "store-1", plus: 4 }, unlockAfter: "store-1", reveal: 30.5 },
  { id: "smoke-rack", name: "大型燻製棚", detail: "燻製小屋に積める数 +4", pos: { x: 1040, y: 130 }, price: 9000, area: 1, capacity: { stove: "smoke-1", plus: 4 }, unlockAfter: "smoker-1", reveal: 34.5 },
  { id: "store-plus-2", name: "石づくりの食料庫", detail: "食料庫に積める数 +6", pos: { x: 1330, y: 250 }, price: 17000, area: 1, capacity: { stove: "store-1", plus: 6 }, unlockAfter: "equip-store-plus-1", reveal: 38.5 },
  { id: "lantern", name: "たいこ", detail: "音で人を集める。集まりが 1.4倍", pos: { x: 470, y: 0 }, price: 90000, area: 0, outside: true, row: 1, draw: 1.4, unlockAfter: "area-1", reveal: 36.5 },

  /* --- 第3区画: 罠と狩りの支度。買うと谷に実物が現れる --- */
  { id: "spear-rack", name: "槍置き場", detail: "狩人の追い込みが強くなる", pos: { x: 1700, y: 430 }, price: 9000, area: 2, trap: 1, reveal: 42.5 },
  { id: "rope-stake", name: "ロープ杭", detail: "マンモスの向きを変えさせる", pos: { x: 1860, y: 150 }, price: 14000, area: 2, trap: 1, unlockAfter: "equip-spear-rack", reveal: 44.5 },
  { id: "mud-lure", name: "ぬかるみ", detail: "足を取られて速さが落ちる", pos: { x: 2340, y: 130 }, price: 20000, area: 2, trap: 1, unlockAfter: "equip-rope-stake", reveal: 47.5 },
  { id: "pit-trap", name: "落とし穴", detail: "落ちると持久力が大きく減る", pos: { x: 2500, y: 280 }, price: 40000, area: 2, trap: 2, unlockAfter: "equip-mud-lure", reveal: 51.5 },
  { id: "stone-spear", name: "石槍", detail: "狩人の一撃が重くなる", pos: { x: 1780, y: 430 }, price: 45000, area: 2, trap: 1.5, unlockAfter: "mark-kills-1", reveal: 54.5 },
  { id: "fire-ring", name: "火の囲い", detail: "逃げ道をせばめて追い込む", pos: { x: 2050, y: 350 }, price: 60000, area: 2, trap: 1.5, unlockAfter: "equip-pit-trap", reveal: 56.5 },
  { id: "rock-drop", name: "岩落とし", detail: "一度だけ大きく効く", pos: { x: 2560, y: 160 }, price: 90000, area: 2, trap: 2, unlockAfter: "equip-fire-ring", reveal: 58.5 },
  { id: "queue", name: "かがり火", detail: "夜通し明るい。集まりが 1.6倍", pos: { x: 590, y: 0 }, price: 240000, area: 0, outside: true, row: 1, draw: 1.6, unlockAfter: "area-2", reveal: 59 },

  /* --- 第4区画: 冬じたく --- */
  { id: "pile-plus", name: "肉置き場の拡張", detail: "肉置き場に積める数 +6", pos: { x: 2060, y: 700 }, price: 50000, area: 2, capacity: { stove: "pile-meat", plus: 6 }, unlockAfter: "mark-kills-1", reveal: 59.5 },
  { id: "lookout", name: "見張り小屋", detail: "遠くの仲間まで見える。集まりが 1.5倍", pos: { x: 3600, y: 150 }, price: 120000, area: 3, draw: 1.5, reveal: 77 },
  { id: "wood-plus", name: "薪倉庫の増し積み", detail: "大型薪倉庫に積める数 +10", pos: { x: 3250, y: 150 }, price: 90000, area: 3, capacity: { stove: "store-wood", plus: 10 }, unlockAfter: "store-wood", reveal: 78 },

  /* --- 第5区画: 道。通ると足が速くなる --- */
  { id: "road-1", name: "村の道", detail: "村じゅうの足が速くなる", pos: { x: 4100, y: 460 }, price: 300000, area: 4, road: { from: { x: 3830, y: 460 }, to: { x: 4560, y: 460 } }, reveal: 93.5 },
  { id: "road-2", name: "川への道", detail: "村と川がつながる。さらに足が速くなる", pos: { x: 4620, y: 460 }, price: 900000, area: 4, road: { from: { x: 4560, y: 460 }, to: { x: 5100, y: 460 } }, unlockAfter: "equip-road-1", reveal: 100.5 },

  /* --- 第6区画: 川の道具 --- */
  { id: "net-1", name: "網", detail: "川の瀬でとれる魚が増える", pos: { x: 5330, y: 380 }, price: 700000, area: 5, capacity: { stove: "fish-1", plus: 6 }, reveal: 106.5 },
  { id: "map-1", name: "地図作り", detail: "探索が 1.6倍のはやさで帰ってくる", pos: { x: 5090, y: 400 }, price: 1600000, area: 5, unlockAfter: "built-build-raft-s", reveal: 113.5 },
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
        butcher: "解体係",
        builder: "建築係",
        keeper: "食料番",
        nightman: "夜番",
        explorer: "探索者",
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
        butcher: "解体係",
        builder: "建築係",
        keeper: "食料番",
        nightman: "夜番",
        explorer: "探索者",
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
    // 覚えたての仕事の周りだけを見せる。少なすぎると選ぶ楽しみがなくなるので、
    // 手を付けられる先を何本か並べておく
    revealLimit: 4,
    // 集落ができたら、さらに増やして 5〜10個のなかから選べるようにする（仕様書 §2.1）。
    // 強化の枠（編みかご・火をあおぐ・わらじ・石塩）は買っても消えないので、
    // ここの数＋4 が実際に見えている候補の数になる。合わせて 10個までに収める
    revealLimitBy: {
      "area-1": 6,
      "area-2": 7,
      "area-3": 7,
      "area-4": 7,
      "area-5": 7,
    },
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
        butcher: "解体係",
        builder: "建築係",
        keeper: "食料番",
        nightman: "夜番",
        explorer: "探索者",
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
