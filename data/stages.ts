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

export type StageId =
  | "ramen"
  | "park"
  | "onsen"
  | "fire"
  | "taiga"
  | "moji";

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
  /** ロジック上のstage idとは別に、画面の世界観だけを差し替える */
  visualTheme?: "park" | "aquarium";
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
  /** どのステージの区画を数えるか（省略でラーメン一直線） */
  requiresStage?: StageId;
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
  /** 一度に新しく出す枠の数（省略で2つずつ） */
  revealBurst?: number;
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
  /**
   * 工程のあるステージで、はこび手（ホール店員・配膳ロボ）にも
   * 作業場から作業場への運搬をさせるか。
   * 「火のはじまり」だけ true。ラーメンは専任の仕込み係だけが運ぶので false
   */
  haulers?: boolean;
  /** 棟の壁で当たり判定をするか（AreaSpec.building を使うステージ） */
  walls?: boolean;
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
    building: "shop1",
    shop: 0,
    // 1号店の暖簾。棟が下へ広がると、戸口もその壁へ下がる
    door: { x: 306, w: 64 },
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
    building: "shop1",
    shop: 0,
  },
  {
    id: "area-2",
    label: "製麺所をつくる",
    price: 22000,
    rect: { x0: 360, y0: 0, x1: 720, y1: 480 },
    padPos: { x: 298, y: 250 },
    palette: { floor: "#343029", deep: "#242019", prop: "none" },
    building: "shop1",
    shop: 0,
  },
  {
    id: "area-3",
    label: "宴会場をつくる",
    price: 140000,
    rect: { x0: 360, y0: 480, x1: 720, y1: 790 },
    padPos: { x: 540, y: 452 },
    palette: { floor: "#3c3128", deep: "#282018", prop: "none" },
    building: "shop1",
    shop: 0,
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
    building: "shop1",
    shop: 0,
  },
  /* ---------- 2号店（区画5〜9）。5つの棟が建つ、ひとつの敷地 ---------- */
  {
    id: "area-5",
    label: "2号店をひらく",
    price: 10000000000,
    rect: { x0: 1120, y0: 420, x1: 1460, y1: 790 },
    padPos: { x: 1040, y: 600 },
    palette: { floor: "#39312b", deep: "#26201b", prop: "none" },
    building: "honkan",
    shop: 1,
    door: { x: 1250, w: 64 },
    // 総本店を建て切った店にだけ、2号店の話が来る
    unlockAfter: "seat-4-3",
  },
  {
    id: "area-6",
    label: "焼き場をたてる",
    price: 20000000000,
    rect: { x0: 1120, y0: 0, x1: 1460, y1: 380 },
    padPos: { x: 1250, y: 450 },
    palette: { floor: "#3a2f28", deep: "#271f19", prop: "none" },
    building: "yakiba",
    shop: 1,
    door: { x: 1250, w: 64 },
    // 本館とのあいだの渡り廊下が、建てるとついてくる
    corridor: { x0: 1220, y0: 368, x1: 1280, y1: 432 },
  },
  {
    id: "area-7",
    label: "仕込み場をたてる",
    price: 32000000000,
    rect: { x0: 1500, y0: 0, x1: 1840, y1: 380 },
    padPos: { x: 1430, y: 190 },
    palette: { floor: "#38332a", deep: "#26221c", prop: "none" },
    building: "shikomi",
    shop: 1,
    door: { x: 1620, w: 64 },
    corridor: { x0: 1448, y0: 150, x1: 1512, y1: 210 },
  },
  {
    id: "area-8",
    label: "スープ蔵をたてる",
    price: 48000000000,
    rect: { x0: 1500, y0: 420, x1: 1840, y1: 790 },
    padPos: { x: 1620, y: 350 },
    palette: { floor: "#33302c", deep: "#22201d", prop: "none" },
    building: "soupgura",
    shop: 1,
    door: { x: 1620, w: 64 },
    corridor: { x0: 1590, y0: 368, x1: 1650, y1: 432 },
  },
  {
    id: "area-9",
    label: "離れをたてる",
    price: 70000000000,
    rect: { x0: 1880, y0: 0, x1: 2220, y1: 380 },
    padPos: { x: 1810, y: 190 },
    palette: { floor: "#3c342c", deep: "#28221c", prop: "none" },
    building: "hanare",
    shop: 1,
    door: { x: 2000, w: 64 },
    corridor: { x0: 1828, y0: 150, x1: 1892, y1: 210 },
  },
];

/** 2号店の席。棟のなかに横一列。値段0の席は、区画を買うとついてくる */
const shopSeats = (
  area: number,
  baseY: number,
  label: string,
  needs: string,
  cost: number,
  value: number,
  spots: { x: number; price: number }[],
  first?: string,
): SeatSpec[] =>
  spots.map((spot, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x: spot.x, y: baseY + 60 },
    serve: { x: spot.x, y: baseY },
    tray: { x: spot.x, y: baseY + 24 },
    price: spot.price,
    area,
    label,
    needs,
    cost,
    value,
    unlockAfter: i === 0 ? first : `seat-${area}-${i}`,
  }));

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

  /* ---------- 2号店（区画5〜9）。一杯が工程を通って完成する ---------- */
  /* 本館: 粉 → 麺打ち台 → 茹で釜 → 玉。スープ窯と合わせて かけラーメン */
  { id: "kona-1", pos: { x: 1160, y: 470 }, price: 0, area: 5, item: "kona", label: "粉ひき", unlockAfter: "area-5" },
  { id: "noodle-1", pos: { x: 1250, y: 470 }, price: 0, area: 5, takes: "kona", item: "namamen", manual: true, label: "麺打ち台", unlockAfter: "area-5" },
  { id: "boil-1", pos: { x: 1345, y: 470 }, price: 0, area: 5, takes: "namamen", item: "tama", work: 0.35, label: "茹で釜", unlockAfter: "area-5" },
  { id: "soupkama-1", pos: { x: 1425, y: 470 }, price: 0, area: 5, item: "soup", work: 0.35, label: "スープ窯", unlockAfter: "area-5" },
  { id: "plate-1", pos: { x: 1180, y: 565 }, price: 0, area: 5, recipe: { tama: 1, soup: 1 }, item: "kake", hold: 8, label: "盛り付け台", unlockAfter: "area-5" },
  /* 焼き場 */
  { id: "meat-1", pos: { x: 1180, y: 110 }, price: 18000000000, area: 6, item: "buta", label: "精肉台" },
  { id: "roast-1", pos: { x: 1300, y: 110 }, price: 22000000000, area: 6, takes: "buta", item: "chashu", work: 0.8, label: "焼豚窯" },
  { id: "plate-2", pos: { x: 1410, y: 190 }, price: 26000000000, area: 6, recipe: { tama: 1, soup: 1, chashu: 1 }, item: "chashumen", hold: 8, label: "盛り付け台" },
  /* 仕込み場 */
  { id: "egg-1", pos: { x: 1545, y: 90 }, price: 28000000000, area: 7, item: "tamago", label: "卵の仕込み" },
  { id: "ajitama-1", pos: { x: 1635, y: 90 }, price: 30000000000, area: 7, takes: "tamago", item: "ajitama", work: 0.6, label: "味玉漬け" },
  { id: "take-1", pos: { x: 1725, y: 90 }, price: 30000000000, area: 7, item: "takenoko", label: "たけのこ蔵" },
  { id: "menma-1", pos: { x: 1805, y: 90 }, price: 32000000000, area: 7, takes: "takenoko", item: "menma", work: 0.6, label: "メンマ樽" },
  { id: "plate-3", pos: { x: 1545, y: 175 }, price: 38000000000, area: 7, recipe: { tama: 1, soup: 1, chashu: 1, ajitama: 1, menma: 1 }, item: "gomoku", hold: 8, label: "盛り付け台" },
  /* スープ蔵: 骨 → 出汁、かえしと合わせて濃厚スープ */
  { id: "bone-1", pos: { x: 1545, y: 480 }, price: 42000000000, area: 8, item: "hone", label: "骨置き場" },
  { id: "dashi-1", pos: { x: 1640, y: 480 }, price: 46000000000, area: 8, takes: "hone", item: "dashi", work: 1.1, label: "出汁釜" },
  { id: "kaeshi-1", pos: { x: 1730, y: 480 }, price: 44000000000, area: 8, item: "kaeshi", label: "かえし壺" },
  { id: "blend-1", pos: { x: 1810, y: 480 }, price: 52000000000, area: 8, recipe: { dashi: 2, kaeshi: 1 }, item: "kokusoup", work: 0.8, hold: 12, label: "合わせ寸胴" },
  { id: "plate-4", pos: { x: 1545, y: 565 }, price: 56000000000, area: 8, recipe: { tama: 1, kokusoup: 1, chashu: 1, ajitama: 1, menma: 1 }, item: "koku", hold: 8, label: "盛り付け台" },
  /* 離れ: 全部乗せ */
  { id: "plate-5", pos: { x: 1935, y: 95 }, price: 80000000000, area: 9, recipe: { tama: 2, kokusoup: 1, chashu: 2, ajitama: 1, menma: 1 }, item: "tokusei", hold: 10, label: "特製の盛り付け台" },
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

  /* ---------- 2号店の席。具が増えるほど、まとめて出す数も単価も上がる ---------- */
  ...shopSeats(5, 650, "2号店のカウンター", "kake", 2, 250, [
    { x: 1180, price: 0 },
    { x: 1270, price: 13000000000 },
    { x: 1360, price: 16000000000 },
  ], "area-5"),
  ...shopSeats(6, 250, "炙りカウンター", "chashumen", 3, 375, [
    { x: 1170, price: 24000000000 },
    { x: 1260, price: 27000000000 },
    { x: 1350, price: 30000000000 },
  ]),
  ...shopSeats(7, 250, "仕込み場の卓", "gomoku", 4, 560, [
    { x: 1560, price: 36000000000 },
    { x: 1660, price: 40000000000 },
    { x: 1760, price: 44000000000 },
  ]),
  ...shopSeats(8, 650, "蔵の座敷", "koku", 5, 840, [
    { x: 1560, price: 54000000000 },
    { x: 1660, price: 58000000000 },
    { x: 1760, price: 62000000000 },
  ]),
  ...shopSeats(9, 240, "特製の間", "tokusei", 8, 1260, [
    { x: 1930, price: 75000000000 },
    { x: 2010, price: 80000000000 },
    { x: 2090, price: 85000000000 },
    { x: 2170, price: 100000000000 },
  ]),
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
  /* ---------- 2号店。工程を運ぶ仕込み係と、品ごとの配膳ロボ ---------- */
  { id: "runner-1", kind: "runner", pos: { x: 1155, y: 625 }, price: 18000000000, label: "仕込み係", area: 5 },
  { id: "noodler-1", kind: "cook", pos: { x: 1250, y: 515 }, price: 20000000000, label: "麺職人", stoveId: "noodle-1", area: 5 },
  { id: "robot-kake", kind: "robot", carries: "kake", pos: { x: 1425, y: 625 }, price: 15000000000, label: "配膳ロボ", area: 5, unlockAfter: "seat-5-2" },
  { id: "roaster-1", kind: "cook", pos: { x: 1300, y: 155 }, price: 28000000000, label: "焼き場の職人", stoveId: "roast-1", area: 6 },
  { id: "robot-chashu", kind: "robot", carries: "chashumen", pos: { x: 1170, y: 190 }, price: 32000000000, label: "配膳ロボ", area: 6 },
  { id: "runner-2", kind: "runner", pos: { x: 1800, y: 175 }, price: 38000000000, label: "仕込み係", area: 7 },
  { id: "shikomi-1", kind: "cook", pos: { x: 1635, y: 133 }, price: 42000000000, label: "仕込みの職人", stoveId: "ajitama-1", area: 7 },
  { id: "robot-gomoku", kind: "robot", carries: "gomoku", pos: { x: 1800, y: 250 }, price: 40000000000, label: "配膳ロボ", area: 7 },
  { id: "dashiman-1", kind: "cook", pos: { x: 1640, y: 525 }, price: 50000000000, label: "出汁の職人", stoveId: "dashi-1", area: 8 },
  { id: "runner-3", kind: "runner", pos: { x: 1805, y: 565 }, price: 52000000000, label: "仕込み係", area: 8 },
  { id: "robot-koku", kind: "robot", carries: "koku", pos: { x: 1805, y: 650 }, price: 60000000000, label: "配膳ロボ", area: 8 },
  { id: "plateman-1", kind: "cook", pos: { x: 1935, y: 140 }, price: 78000000000, label: "盛り付けの名人", stoveId: "plate-5", area: 9 },
  { id: "runner-4", kind: "runner", pos: { x: 2180, y: 95 }, price: 70000000000, label: "仕込み係", area: 9 },
  { id: "robot-tokusei", kind: "robot", carries: "tokusei", pos: { x: 2180, y: 320 }, price: 82000000000, label: "配膳ロボ", area: 9 },
  { id: "master-2", kind: "master", pos: { x: 2090, y: 340 }, price: 90000000000, label: "板場", area: 9 },
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
  /* ---------- 2号店。渡り廊下（誰でも通る）と、工程の直結 ---------- */
  { id: "pass-home", name: "通用口", detail: "1号店の厨房から2号店へ、まっすぐ行ける", pos: { x: 1100, y: 630 }, price: 22000000000, area: 5, corridor: { x0: 1058, y0: 600, x1: 1142, y1: 660 } },
  { id: "belt-kona", name: "麺のベルト", detail: "粉が麺打ち台へ自動で流れる", pos: { x: 1205, y: 440 }, price: 24000000000, area: 5, link: { from: "kona-1", to: "noodle-1" } },
  { id: "belt-boil", name: "茹でのレール", detail: "生麺が茹で釜へ自動で流れる", pos: { x: 1300, y: 440 }, price: 36000000000, area: 6, link: { from: "noodle-1", to: "boil-1" } },
  { id: "pass-cross", name: "中庭の四つ辻", detail: "本館・焼き場・仕込み場・スープ蔵が中庭で直につながる", pos: { x: 1480, y: 400 }, price: 42000000000, area: 7, corridor: { x0: 1440, y0: 360, x1: 1520, y1: 440 } },
  { id: "belt-gu", name: "具のレール", detail: "メンマが盛り付け台へ自動で流れる", pos: { x: 1700, y: 175 }, price: 46000000000, area: 7, link: { from: "menma-1", to: "plate-3" } },
  { id: "pass-soup", name: "渡り廊下", detail: "本館とスープ蔵が直につながる", pos: { x: 1480, y: 630 }, price: 60000000000, area: 8, corridor: { x0: 1440, y0: 600, x1: 1520, y1: 660 } },
  { id: "pipe-soup", name: "スープの配管", detail: "濃厚スープが盛り付け台へ自動で流れる", pos: { x: 1700, y: 565 }, price: 66000000000, area: 8, link: { from: "blend-1", to: "plate-4" } },
  { id: "rail-tokusei", name: "特製のレール", detail: "玉が特製の盛り付け台へ自動で流れる", pos: { x: 2030, y: 95 }, price: 95000000000, area: 9, link: { from: "boil-1", to: "plate-5" } },
  { id: "pass-roof", name: "大屋根", detail: "敷地ぜんぶに屋根がかかり、全部の棟が直につながる", pos: { x: 1650, y: 400 }, price: 100000000000, area: 9, corridor: { x0: 1058, y0: 380, x1: 2240, y1: 420 } },
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
  /*
   * 左側へ広がるナイトメア・パーク。
   * 入口広場の左から、闇の門 → 呪われた森 → 最深部の順で開いていく。
   */
  {
    id: "area-10",
    label: "呪われた門をひらく",
    price: 70000000000,
    rect: { x0: -360, y0: 0, x1: 0, y1: 480 },
    // 買う枠は現在の入口広場側に置き、購入すると左へ世界が伸びる
    padPos: { x: 24, y: 250 },
    palette: { floor: "#30273b", deep: "#191320", prop: "horror" },
    unlockAfter: "seat-9-3",
  },
  {
    id: "area-11",
    label: "呪われた森をひらく",
    price: 180000000000,
    rect: { x0: -720, y0: 0, x1: -360, y1: 960 },
    padPos: { x: -330, y: 250 },
    palette: { floor: "#292133", deep: "#130f19", prop: "horror" },
    unlockAfter: "seat-10-3",
  },
  {
    id: "area-12",
    label: "ナイトメア・パークをひらく",
    price: 500000000000,
    rect: { x0: -1080, y0: 0, x1: -720, y1: 1440 },
    padPos: { x: -690, y: 700 },
    palette: { floor: "#211927", deep: "#0d0911", prop: "horror" },
    unlockAfter: "seat-11-3",
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
  // 下層の高収益施設用。ここまで投資すると火山だけで資金を回しやすくなる
  { id: "crater-3", pos: { x: 1210, y: 1180 }, price: 18000000000, area: 9, label: "地底の券売所", unlockAfter: "volcano-lower-1" },
  // 区画が増えると、前の区画にも新しい店が出せるようになる
  { id: "kitchen-0", pos: { x: 300, y: 250 }, price: 90000000, area: 0, item: "food", art: "kitchen", label: "広場のキッチンカー", unlockAfter: "area-7" },
  { id: "store-0", pos: { x: 620, y: 250 }, price: 320000000, area: 1, item: "goods", art: "stock", label: "丘のみやげ倉庫", unlockAfter: "area-8" },
  // ナイトメア・パークの専用券売所。左へ進むほど発券能力が必要になる
  { id: "nightmare-ticket-1", pos: { x: -180, y: 176 }, price: 60000000000, area: 10, label: "闇の券売所" },
  { id: "nightmare-ticket-2", pos: { x: -540, y: 656 }, price: 180000000000, area: 11, label: "墓地の券売所" },
  { id: "nightmare-ticket-3", pos: { x: -900, y: 176 }, price: 520000000000, area: 12, label: "ナイトメア券売所" },
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

  /*
   * 火山の秘境・下層部。
   * ホラーへ直行してもよいが、ここへ投資すると通常アトラクションより
   * 1回あたりの売上倍率が大きく、次の区画資金を火山で稼ぎやすくなる。
   */
  {
    id: "volcano-lower-1",
    pos: { x: 1152, y: 838 },
    serve: { x: 1152, y: 774 },
    tray: { x: 1152, y: 798 },
    price: 10000000000,
    area: 9,
    label: "溶岩洞窟トロッコ",
    art: "minecart",
    detail: "地底の溶岩洞窟を走る高単価ツアー。火山下層の収益源。",
    cost: 5,
    value: 12,
    unlockAfter: "seat-9-1",
  },
  {
    id: "volcano-lower-2",
    pos: { x: 1368, y: 838 },
    serve: { x: 1368, y: 774 },
    tray: { x: 1368, y: 798 },
    price: 16000000000,
    area: 9,
    label: "火口ロープウェイ",
    art: "balloonride",
    detail: "溶岩原を見下ろす絶景ライド。少ない回転でも大きく稼げる。",
    cost: 6,
    value: 16,
    unlockAfter: "volcano-lower-1",
  },
  {
    id: "volcano-lower-3",
    pos: { x: 1152, y: 1318 },
    serve: { x: 1152, y: 1254 },
    tray: { x: 1152, y: 1278 },
    price: 22000000000,
    area: 9,
    label: "地熱スパ",
    art: "cafe",
    detail: "火山の地熱を使ったプレミアム施設。チケット消費に対して売上が高い。",
    cost: 4,
    value: 18,
    unlockAfter: "volcano-lower-1",
  },
  {
    id: "volcano-lower-4",
    pos: { x: 1368, y: 1318 },
    serve: { x: 1368, y: 1254 },
    tray: { x: 1368, y: 1278 },
    price: 32000000000,
    area: 9,
    label: "マグマナイトショー",
    art: "theater",
    detail: "噴火と炎を使う火山最大の夜公演。火山エリア最高の売上倍率。",
    cost: 7,
    value: 25,
    unlockAfter: "volcano-lower-2",
  },

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

  /* ナイトメア・パーク: 入口から左へ、怖さと必要チケット枚数が上がる */
  ...rideRow(10, 294, [
    { x: -300, price: 75000000000, label: "おばけスナック", cost: 4, art: "shooting", detail: "幽霊が店番する怪しいスナックスタンド" },
    { x: -200, price: 100000000000, label: "呪いの人形館", cost: 5, art: "carousel", detail: "人形たちがこちらを見つめる館" },
    { x: -100, price: 140000000000, label: "魔女の館", cost: 6, art: "castleride", detail: "大釜と魔法が待つ森の奥の館" },
  ]),
  ...rideRow(11, 774, [
    { x: -660, price: 220000000000, label: "呪われた墓地", cost: 5, art: "dig", detail: "霧の中で墓石と幽霊が増えていく墓地" },
    { x: -540, price: 300000000000, label: "呪われた教会", cost: 6, art: "theater", detail: "鐘が鳴るたびに怪異が起こる古い教会" },
    { x: -420, price: 420000000000, label: "地下迷宮", cost: 7, art: "minecart", detail: "地下へ入り、別の出口から戻ってくる迷宮" },
  ]),
  ...rideRow(12, 294, [
    { x: -1020, price: 700000000000, label: "幽霊列車", cost: 6, art: "coaster", detail: "紫の煙を吐きながら闇を周回する列車" },
    { x: -900, price: 950000000000, label: "呪われたホテル", cost: 7, art: "castleride", detail: "泊まった客が奇妙な体験をする巨大ホテル" },
    { x: -780, price: 1300000000000, label: "ザ・ナイトメア・ハウス", cost: 7, art: "theater", detail: "ナイトメア・パーク最後の巨大お化け屋敷" },
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
  { id: "cook-14", kind: "cook", pos: { x: 1250, y: 1134 }, price: 22000000000, label: "地底券売スタッフ", stoveId: "crater-3", area: 9, unlockAfter: "volcano-lower-1" },
  { id: "waiter-6", kind: "waiter", pos: { x: 1140, y: 640 }, price: 9000000000, label: "案内係", area: 9 },
  { id: "robot-6", kind: "robot", pos: { x: 1260, y: 640 }, price: 24000000000, label: "案内ロボ", area: 9, unlockAfter: "waiter-6" },
  { id: "robot-volcano-lower", kind: "robot", pos: { x: 1260, y: 1100 }, price: 26000000000, label: "地底案内ロボ", area: 9, unlockAfter: "volcano-lower-2" },
  { id: "collector-4", kind: "collector", pos: { x: 1380, y: 640 }, price: 32000000000, label: "集金係", area: 9 },

  // ナイトメア・パーク。専用券売所と案内を順に自動化する
  { id: "cook-horror-1", kind: "cook", pos: { x: -140, y: 130 }, price: 80000000000, label: "闇の券売スタッフ", stoveId: "nightmare-ticket-1", area: 10 },
  { id: "waiter-horror-1", kind: "waiter", pos: { x: -300, y: 434 }, price: 95000000000, label: "ホラー案内人", area: 10, unlockAfter: "seat-10-1" },
  { id: "cook-horror-2", kind: "cook", pos: { x: -500, y: 610 }, price: 240000000000, label: "墓地の券売スタッフ", stoveId: "nightmare-ticket-2", area: 11 },
  { id: "robot-horror-1", kind: "robot", pos: { x: -620, y: 912 }, price: 320000000000, label: "ゴースト案内ロボ", area: 11, unlockAfter: "seat-11-1" },
  { id: "cook-horror-3", kind: "cook", pos: { x: -860, y: 130 }, price: 700000000000, label: "ナイトメア券売スタッフ", stoveId: "nightmare-ticket-3", area: 12 },
  { id: "waiter-horror-2", kind: "waiter", pos: { x: -1020, y: 640 }, price: 850000000000, label: "夜の案内人", area: 12, unlockAfter: "seat-12-1" },
  { id: "collector-horror-1", kind: "collector", pos: { x: -780, y: 640 }, price: 1050000000000, label: "夜の集金係", area: 12, unlockAfter: "seat-12-2" },

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

/* ==================== ステージ3: 湯けむり温泉街 ==================== */

/**
 * 温泉街は、店の中ではなく道からはじまる。
 *
 * 区画は2種類ある。
 *   道（building なし）― 壁がなく、どこからでも入れる。足湯と屋台がここに出る
 *   建物（building あり）― 四方を壁で囲み、道に面した一辺に戸口を開ける
 *
 * 道を買うと、その道に面した建物用地が現れる。建物を買うと外側だけが建ち、
 * 中の作業場・席・棚・店員は、そこから一つずつ買っていく。
 * 店員は担当の店から出ない（shop の番号で分ける）ので、
 * 店をひとつ建てるたびに、その店の中だけで人手のやりくりが起きる。
 *
 * 座標は「南（下）が温泉街の入口、北（上）が山」。
 * いちばん下の入口道路が y1600 で、ここから上へ町が伸びていく。
 * 入口道路より下に区画を置かないので、客が歩いてくる通りの位置は動かない。
 */
const onsenAreas: AreaSpec[] = [
  /* ---------- 街区0: 温泉街入口（最初から開いている道） ---------- */
  {
    id: "area-0",
    label: "入口道路",
    price: 0,
    rect: { x0: 720, y0: 1360, x1: 1420, y1: 1600 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#5b524a", deep: "#403830", prop: "stone" },
  },
  {
    id: "area-1",
    label: "蒸しまんじゅう屋をたてる",
    price: 1200,
    rect: { x0: 840, y0: 1120, x1: 1120, y1: 1360 },
    padPos: { x: 1010, y: 1400 },
    palette: { floor: "#6b5a42", deep: "#4a3d2c", prop: "tatami" },
    building: "manju",
    shop: 1,
    door: { x: 1010, w: 60 },
    // 足湯がひととおり並んでから、はじめて店を建てる話が出てくる
    unlockAfter: "seat-0-3",
  },

  /* ---------- 街区1: 到着広場と、そこから登る湯坂 ---------- */
  {
    id: "area-2",
    label: "到着広場をひらく",
    price: 2900,
    rect: { x0: 1420, y0: 1300, x1: 2160, y1: 1600 },
    padPos: { x: 1390, y: 1500 },
    palette: { floor: "#5f564c", deep: "#433b33", prop: "stone" },
  },
  {
    id: "area-3",
    label: "観光案内所をたてる",
    price: 13000,
    rect: { x0: 2160, y0: 1300, x1: 2440, y1: 1540 },
    padPos: { x: 2130, y: 1420 },
    palette: { floor: "#6b5a42", deep: "#4a3d2c", prop: "tatami" },
    building: "annai",
    shop: 2,
    door: { x: 1420, w: 60, side: "w" },
  },
  {
    id: "area-4",
    label: "湯坂をのばす",
    price: 27000,
    rect: { x0: 1120, y0: 880, x1: 1420, y1: 1360 },
    padPos: { x: 1250, y: 1400 },
    palette: { floor: "#584f47", deep: "#3e372f", prop: "slope" },
  },
  /* ---------- 街区2: 源泉広場（温泉街の中心） ---------- */
  {
    id: "area-5",
    label: "湯の里売店をたてる",
    price: 65000,
    rect: { x0: 1420, y0: 880, x1: 1700, y1: 1120 },
    padPos: { x: 1390, y: 1000 },
    palette: { floor: "#6d5c46", deep: "#4b3e2e", prop: "tatami" },
    building: "baiten",
    shop: 3,
    door: { x: 1000, w: 60, side: "w" },
  },

  {
    id: "area-6",
    label: "源泉広場を復旧する",
    price: 130000,
    rect: { x0: 800, y0: 540, x1: 1420, y1: 880 },
    padPos: { x: 1250, y: 910 },
    palette: { floor: "#4d5a58", deep: "#33403f", prop: "yubatake" },
  },
  {
    id: "area-7",
    label: "共同浴場をたてる",
    price: 170000,
    rect: { x0: 1420, y0: 600, x1: 1740, y1: 880 },
    padPos: { x: 1390, y: 740 },
    palette: { floor: "#41606a", deep: "#2c434c", prop: "bath" },
    building: "yuba",
    shop: 4,
    door: { x: 740, w: 60, side: "w" },
  },
  {
    id: "area-8",
    label: "湯もみ小屋をたてる",
    price: 500000,
    rect: { x0: 520, y0: 540, x1: 800, y1: 860 },
    padPos: { x: 830, y: 700 },
    palette: { floor: "#6b5a42", deep: "#4a3d2c", prop: "tatami" },
    building: "yumomi",
    shop: 5,
    door: { x: 700, w: 60, side: "e" },
  },
  {
    id: "area-9",
    label: "甘酒茶屋をたてる",
    price: 850000,
    rect: { x0: 1060, y0: 240, x1: 1420, y1: 540 },
    padPos: { x: 1240, y: 570 },
    palette: { floor: "#6d5a44", deep: "#4a3c2c", prop: "tatami" },
    building: "amazake",
    shop: 6,
    door: { x: 1240, w: 60 },
  },

  /* ---------- 街区3: 食べ歩き通り ---------- */
  {
    id: "area-10",
    label: "食べ歩き通りをひらく",
    price: 500000,
    rect: { x0: 200, y0: 880, x1: 860, y1: 1080 },
    padPos: { x: 830, y: 860 },
    palette: { floor: "#5b524a", deep: "#403830", prop: "lantern" },
  },
  {
    id: "area-11",
    label: "山菜そば処をたてる",
    price: 1500000,
    rect: { x0: 200, y0: 620, x1: 520, y1: 880 },
    padPos: { x: 360, y: 910 },
    palette: { floor: "#5f4f3c", deep: "#413528", prop: "tatami" },
    building: "soba",
    shop: 7,
    door: { x: 360, w: 60 },
  },
  {
    id: "area-12",
    label: "串焼きと温泉たまごの店をたてる",
    price: 2600000,
    rect: { x0: 200, y0: 1080, x1: 520, y1: 1320 },
    padPos: { x: 360, y: 1050 },
    palette: { floor: "#6a5340", deep: "#48382a", prop: "tatami" },
    building: "kushi",
    shop: 8,
    door: { x: 360, w: 60, side: "n" },
  },
  {
    id: "area-13",
    label: "ミルクプリン店をたてる",
    price: 6500000,
    rect: { x0: 540, y0: 1080, x1: 800, y1: 1320 },
    padPos: { x: 670, y: 1050 },
    palette: { floor: "#7a6a52", deep: "#544736", prop: "tatami" },
    building: "purin",
    shop: 9,
    door: { x: 670, w: 60, side: "n" },
  },

  /* ---------- 街区4: 裏湯路地 ---------- */
  {
    id: "area-14",
    label: "裏湯路地をひらく",
    price: 7400000,
    rect: { x0: 1420, y0: 240, x1: 1740, y1: 600 },
    padPos: { x: 1390, y: 570 },
    palette: { floor: "#544b45", deep: "#3b342f", prop: "alley" },
  },
  {
    id: "area-15",
    label: "路地の甘味処をたてる",
    price: 14000000,
    rect: { x0: 1740, y0: 220, x1: 2020, y1: 460 },
    padPos: { x: 1710, y: 340 },
    palette: { floor: "#75634a", deep: "#514330", prop: "tatami" },
    building: "kanmi",
    shop: 10,
    door: { x: 340, w: 60, side: "w" },
  },
  {
    id: "area-16",
    label: "小さな共同湯をたてる",
    price: 24000000,
    rect: { x0: 1420, y0: 0, x1: 1700, y1: 220 },
    padPos: { x: 1560, y: 270 },
    palette: { floor: "#41606a", deep: "#2c434c", prop: "bath" },
    building: "koyu",
    shop: 11,
    door: { x: 1560, w: 60 },
  },

  /* ---------- 街区5: 宿場通り ---------- */
  {
    id: "area-17",
    label: "湯宿をひらく",
    price: 65000000,
    rect: { x0: 880, y0: 880, x1: 1120, y1: 1120 },
    padPos: { x: 1150, y: 1000 },
    palette: { floor: "#6d5b45", deep: "#4a3c2c", prop: "inn" },
    building: "yado1",
    shop: 12,
    door: { x: 1000, w: 60, side: "e" },
  },
  {
    id: "area-18",
    label: "大きな湯宿をたてる",
    price: 260000000,
    rect: { x0: 1700, y0: 1060, x1: 1980, y1: 1300 },
    padPos: { x: 1840, y: 1330 },
    palette: { floor: "#6d5b45", deep: "#4a3c2c", prop: "inn" },
    building: "yado2",
    shop: 13,
    door: { x: 1840, w: 60 },
  },

  /* ---------- 街区6: 湯川公園 ---------- */
  {
    id: "area-19",
    label: "湯川の遊歩道をひらく",
    price: 430000000,
    rect: { x0: 200, y0: 280, x1: 860, y1: 540 },
    padPos: { x: 830, y: 570 },
    palette: { floor: "#4a5a52", deep: "#33403a", prop: "river" },
  },
  {
    id: "area-20",
    label: "大露天風呂をひらく",
    price: 870000000,
    rect: { x0: 200, y0: 20, x1: 620, y1: 280 },
    padPos: { x: 420, y: 310 },
    palette: { floor: "#3f6570", deep: "#2a4650", prop: "bath" },
    building: "roten",
    shop: 14,
    door: { x: 420, w: 72 },
  },
  {
    id: "area-21",
    label: "湯上がり茶屋をたてる",
    price: 1300000000,
    rect: { x0: 660, y0: 20, x1: 920, y1: 280 },
    padPos: { x: 760, y: 310 },
    palette: { floor: "#6d5a44", deep: "#4a3c2c", prop: "tatami" },
    building: "chaya",
    shop: 15,
    door: { x: 760, w: 60 },
  },

  /* ---------- 街区7: 山門・展望坂 ---------- */
  {
    id: "area-22",
    label: "石段坂をひらく",
    price: 1900000000,
    rect: { x0: 920, y0: 20, x1: 1060, y1: 540 },
    padPos: { x: 990, y: 570 },
    palette: { floor: "#57504a", deep: "#3d3833", prop: "steps" },
  },
  {
    id: "area-23",
    label: "湯守の社をたてる",
    price: 2800000000,
    rect: { x0: 1060, y0: 20, x1: 1420, y1: 220 },
    padPos: { x: 1030, y: 120 },
    palette: { floor: "#5f4f42", deep: "#42372e", prop: "shrine" },
    building: "yashiro",
    shop: 16,
    door: { x: 120, w: 60, side: "w" },
  },

  /* ---------- 街区8: 夜見世通り ---------- */
  {
    id: "area-24",
    label: "夜見世通りをひらく",
    price: 4700000000,
    rect: { x0: 2180, y0: 1040, x1: 2460, y1: 1300 },
    padPos: { x: 2100, y: 1320 },
    palette: { floor: "#4b4239", deep: "#342e28", prop: "night" },
  },
  {
    id: "area-25",
    label: "炉端焼きの店をたてる",
    price: 5400000000,
    rect: { x0: 2180, y0: 800, x1: 2440, y1: 1040 },
    padPos: { x: 2260, y: 1070 },
    palette: { floor: "#5d4a38", deep: "#3f3226", prop: "tatami" },
    building: "robata",
    shop: 17,
    door: { x: 2260, w: 60 },
  },
  {
    id: "area-26",
    label: "夜パフェの店をたてる",
    price: 6200000000,
    rect: { x0: 2460, y0: 1040, x1: 2700, y1: 1280 },
    padPos: { x: 2430, y: 1160 },
    palette: { floor: "#6a5a6a", deep: "#483c48", prop: "night" },
    building: "yomise",
    shop: 18,
    door: { x: 1160, w: 60, side: "w" },
  },

  /* ---------- 街区9: 湯けむり大旅館 ---------- */
  {
    id: "area-27",
    label: "大旅館の車寄せをつくる",
    price: 8700000000,
    rect: { x0: 1980, y0: 800, x1: 2180, y1: 1300 },
    padPos: { x: 2080, y: 1320 },
    palette: { floor: "#5b524a", deep: "#403830", prop: "stone" },
  },
  {
    id: "area-28",
    label: "湯けむり大旅館をたてる",
    price: 9900000000,
    rect: { x0: 1980, y0: 460, x1: 2420, y1: 800 },
    padPos: { x: 2080, y: 840 },
    palette: { floor: "#705d46", deep: "#4d3f2e", prop: "inn" },
    building: "taikan",
    shop: 19,
    door: { x: 2080, w: 72 },
  },
  {
    /** 本館と壁でつながる棟。同じ building なので、あいだに壁は立たない */
    id: "area-29",
    label: "大浴場と庭園をつくる",
    price: 11000000000,
    rect: { x0: 2420, y0: 460, x1: 2700, y1: 800 },
    padPos: { x: 2140, y: 900 },
    palette: { floor: "#3f6570", deep: "#2a4650", prop: "garden" },
    building: "taikan",
    shop: 19,
  },
];

/**
 * 湯の席（足湯・浴槽・見物席）。
 * 手ぬぐいと湯かごを運んで渡すと、湯に入って、料金を置いて帰る。
 * つくりは乗り物の席と同じ（渡す・使う・帰る）
 */
/**
 * 湯の席が使う湯の量の目安（仕様書 §10.2）。
 * 大きな露天や大浴場は、ここでは足りないので席ごとに heat を書く
 */
const HEAT: Record<string, number> = {
  ashiyu: 1,
  ashiyuroof: 2,
  teyu: 1,
  taki: 1,
  neyu: 3,
  mise: 1,
  hinoki: 5,
  iwaburo: 6,
  utase: 5,
  bench: 0,
  deck: 0,
};

const yuRow = (
  area: number,
  baseY: number,
  baths: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    value: number;
    cost?: number;
    heat?: number;
    unlockAfter?: string;
  }[],
): SeatSpec[] =>
  baths.map((bath, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x: bath.x, y: baseY + 64 },
    serve: { x: bath.x, y: baseY },
    tray: { x: bath.x, y: baseY + 24 },
    price: bath.price,
    area,
    label: bath.label,
    art: bath.art,
    detail: bath.detail,
    cost: bath.cost,
    value: bath.value,
    heat: bath.heat ?? HEAT[bath.art] ?? 1,
    unlockAfter: bath.unlockAfter ?? chain("seat", area, i),
  }));

/** 食事処の席・旅館の客室。食べ終わると器が残るので、片づけないと次が来ない */
const zenRow = (
  area: number,
  baseY: number,
  tables: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    value: number;
    heat?: number;
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
    value: table.value,
    heat: table.heat ?? (table.art === "roomyu" ? 4 : table.art === "room" ? 2 : 0),
    unlockAfter: table.unlockAfter ?? chain("table", area, i),
  }));

/** 店先の棚・ショーケース。並べておくと客が自分で取り、帳場で払う */
const tanaRow = (
  area: number,
  baseY: number,
  till: { x: number; y: number },
  shelves: {
    x: number;
    price: number;
    label: string;
    art: string;
    detail: string;
    value: number;
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
    value: shelf.value,
    pay: till,
    unlockAfter: shelf.unlockAfter ?? chain("shelf", area, i),
  }));

const onsenStoves: StoveSpec[] = [
  /* 街区0: 道ばたの手ぬぐい箱。ここから温泉街がはじまる */
  { id: "stove-1", pos: { x: 790, y: 1400 }, price: 0, area: 0, label: "手ぬぐい箱" },
  { id: "stove-2", pos: { x: 1360, y: 1400 }, price: 1500, area: 0, label: "湯かご置き場", unlockAfter: "seat-0-4" },
  /* 街区2: 源泉広場の湯汲み場。町じゅうの湯の元 */
  { id: "stove-3", pos: { x: 860, y: 600 }, price: 130000, area: 6, label: "湯汲み場" },
  { id: "stove-4", pos: { x: 1360, y: 600 }, price: 2200000, area: 6, label: "湯樋の汲み口" },

  /* 蒸しまんじゅう屋 */
  { id: "mushi-1", pos: { x: 890, y: 1170 }, price: 900, area: 1, item: "goods", art: "stock", label: "蒸し器" },
  { id: "mushi-2", pos: { x: 1000, y: 1170 }, price: 7900, area: 1, item: "goods", art: "stock", label: "大蒸籠" },
  /* 観光案内所（湯めぐりの案内と絵はがき） */
  { id: "annai-1", pos: { x: 2210, y: 1350 }, price: 13000, area: 3, item: "goods", art: "stock", label: "刷り場" },
  /* 湯の里売店 */
  { id: "souvenir-1", pos: { x: 1480, y: 930 }, price: 65000, area: 5, item: "goods", art: "stock", label: "みやげ倉庫" },
  { id: "souvenir-2", pos: { x: 1640, y: 930 }, price: 760000, area: 5, item: "goods", art: "stock", label: "木彫りの工房" },
  /* 共同浴場・湯もみ小屋・小さな共同湯 */
  { id: "bath-1", pos: { x: 1470, y: 650 }, price: 170000, area: 7, label: "湯札の受付" },
  { id: "yumomi-1", pos: { x: 570, y: 590 }, price: 500000, area: 8, label: "木札の台" },
  { id: "bath-2", pos: { x: 1470, y: 50 }, price: 24000000, area: 16, label: "湯札の箱" },
  /* 甘酒茶屋・山菜そば処・串焼き・ミルクプリン */
  { id: "kitchen-1", pos: { x: 1110, y: 290 }, price: 850000, area: 9, item: "food", art: "kitchen", label: "厨房" },
  { id: "kitchen-2", pos: { x: 250, y: 670 }, price: 1500000, area: 11, item: "food", art: "kitchen", label: "厨房" },
  { id: "kitchen-3", pos: { x: 250, y: 1130 }, price: 2600000, area: 12, item: "food", art: "kitchen", label: "焼き台" },
  { id: "kitchen-4", pos: { x: 380, y: 1130 }, price: 11000000, area: 12, item: "food", art: "kitchen", label: "湯だまり（温泉たまご）" },
  { id: "sweets-1", pos: { x: 590, y: 1130 }, price: 6500000, area: 13, item: "goods", art: "stock", label: "仕込み場" },
  { id: "sweets-2", pos: { x: 1790, y: 270 }, price: 14000000, area: 15, item: "goods", art: "stock", label: "焼き菓子の窯" },
  /* 湯宿 */
  { id: "kitchen-5", pos: { x: 930, y: 930 }, price: 65000000, area: 17, item: "food", art: "kitchen", label: "板場" },
  { id: "kitchen-6", pos: { x: 1790, y: 1110 }, price: 260000000, area: 18, item: "food", art: "kitchen", label: "板場" },
  { id: "kitchen-7", pos: { x: 1900, y: 1110 }, price: 610000000, area: 18, item: "food", art: "kitchen", label: "板場" },
  /* 湯川公園・山門 */
  { id: "bath-3", pos: { x: 260, y: 70 }, price: 870000000, area: 20, label: "湯屋の受付" },
  { id: "kitchen-8", pos: { x: 710, y: 70 }, price: 1300000000, area: 21, item: "food", art: "kitchen", label: "厨房" },
  { id: "omamori-1", pos: { x: 1110, y: 60 }, price: 2800000000, area: 23, item: "goods", art: "stock", label: "御守り所" },
  /* 夜見世通り */
  { id: "kitchen-9", pos: { x: 2230, y: 850 }, price: 5400000000, area: 25, item: "food", art: "kitchen", label: "炉端" },
  { id: "kitchen-10", pos: { x: 2350, y: 850 }, price: 7300000000, area: 25, item: "food", art: "kitchen", label: "炉端" },
  { id: "sweets-3", pos: { x: 2510, y: 1090 }, price: 6200000000, area: 26, item: "goods", art: "stock", label: "夜パフェの仕込み" },
  /* 大旅館 */
  { id: "kitchen-11", pos: { x: 2030, y: 510 }, price: 9900000000, area: 28, item: "food", art: "kitchen", label: "大料理場" },
  { id: "kitchen-12", pos: { x: 2150, y: 510 }, price: 12000000000, area: 28, item: "food", art: "kitchen", label: "大料理場" },
  { id: "bath-4", pos: { x: 2470, y: 510 }, price: 11000000000, area: 29, label: "大浴場の受付" },
];

const onsenSeats: SeatSpec[] = [
  /* ---------- 街区0: 道ばたの足湯。最初のふたつは無料 ---------- */
  ...yuRow(0, 1460, [
    { x: 900, price: 0, label: "こわれかけの足湯", art: "ashiyu", detail: "板を直した、道ばたの足湯", value: 1 },
    { x: 990, price: 0, label: "石組みの足湯", art: "ashiyu", detail: "石を積んだ、二つめの足湯", value: 1 },
    { x: 1080, price: 120, label: "腰かけ足湯", art: "ashiyu", detail: "長い腰かけが付いた足湯", value: 1.2 },
    { x: 1170, price: 340, label: "屋根つき足湯", art: "ashiyuroof", detail: "雨の日でも入れる足湯", value: 1.4 },
    { x: 1260, price: 900, label: "湯けむりの足湯", art: "ashiyuroof", detail: "湯気の立つ、いちばん熱い足湯", value: 1.6 },
  ]),

  /* ---------- 街区1: 到着広場の待合 ---------- */
  ...yuRow(2, 1400, [
    { x: 1520, price: 4900, label: "待合の腰かけ", art: "bench", detail: "着いたばかりの客が休む", value: 1.2 },
    { x: 1640, price: 19000, label: "広場の足湯", art: "ashiyu", detail: "広場のまんなかの足湯", value: 1.6 },
    { x: 1760, price: 98000, label: "手湯の水盤", art: "teyu", detail: "手だけ温める小さな湯", value: 2 },
  ]),

  /* ---------- 街区2: 源泉広場と共同浴場 ---------- */
  ...yuRow(6, 760, [
    { x: 900, price: 260000, label: "湯坪の足湯", art: "ashiyuroof", detail: "源泉のすぐ横で入る足湯", value: 2.4 },
    { x: 1020, price: 760000, label: "湯滝の見物席", art: "taki", detail: "落ちてくる湯を眺める席", value: 3 },
    { x: 1140, price: 1700000, label: "撮影デッキ", art: "deck", detail: "湯けむり越しに町を撮る", value: 3.6 },
  ]),
  ...yuRow(7, 750, [
    { x: 1470, price: 320000, label: "檜の内湯", art: "hinoki", detail: "檜の香りがこもる湯船", value: 16 },
    { x: 1580, price: 940000, label: "岩の湯", art: "iwaburo", detail: "岩を組んだ広い湯船", value: 18, cost: 2 },
    { x: 1690, price: 2200000, label: "打たせ湯", art: "utase", detail: "肩へ湯を落とす湯船", value: 20, cost: 2 },
  ]),
  ...yuRow(8, 720, [
    { x: 570, price: 500000, label: "湯もみの見物席", art: "mise", detail: "板で湯をかき混ぜる演目を見る", value: 8 },
    { x: 660, price: 1200000, label: "桟敷席", art: "mise", detail: "一段高いところから見る", value: 9 },
    { x: 750, price: 2800000, label: "湯もみ体験の板", art: "mise", detail: "自分でも板を持ってみる", value: 10 },
  ]),

  /* ---------- 街区4: 裏湯路地の小さな湯 ---------- */
  ...yuRow(14, 460, [
    { x: 1460, price: 8100000, label: "顔湯", art: "teyu", detail: "湯気を顔に当てる小さな穴", value: 3 },
    { x: 1570, price: 16000000, label: "路地の手湯", art: "teyu", detail: "路地のかたすみの手湯", value: 3.6 },
    { x: 1690, price: 29000000, label: "石畳の足湯", art: "ashiyu", detail: "石畳をくりぬいた足湯", value: 4.2 },
  ]),
  ...yuRow(16, 120, [
    { x: 1470, price: 32000000, label: "板張りの湯船", art: "hinoki", detail: "地元の人が通う小さな湯", value: 22 },
    { x: 1620, price: 52000000, label: "打たせの小湯", art: "utase", detail: "細い湯が肩に落ちる", value: 26, cost: 2 },
  ]),

  /* ---------- 街区3: 食べ歩き通りのベンチ ---------- */
  ...yuRow(10, 950, [
    { x: 280, price: 760000, label: "食べ歩きベンチ", art: "bench", detail: "買ったものをここで食べる", value: 2.4 },
    { x: 420, price: 1500000, label: "屋根つきベンチ", art: "bench", detail: "日よけの下で休む", value: 3 },
    { x: 700, price: 3800000, label: "通りの足湯", art: "ashiyu", detail: "歩きつかれた足を入れる", value: 3.6 },
  ]),

  /* ---------- 街区6・7・8: 遠くの湯 ---------- */
  ...yuRow(19, 400, [
    { x: 300, price: 520000000, label: "川辺の足湯", art: "ashiyu", detail: "湯の川に足をひたす", value: 4.5 },
    { x: 440, price: 770000000, label: "河原の寝湯", art: "neyu", detail: "石に寝ころんで温まる", value: 6 },
  ]),
  ...yuRow(20, 160, [
    { x: 260, price: 1100000000, label: "岩の大露天", art: "iwaburo", detail: "森に囲まれた大きな露天", value: 40, heat: 12 },
    { x: 370, price: 1400000000, label: "檜の大露天", art: "hinoki", detail: "檜づくりの広い露天", value: 44, cost: 2, heat: 12 },
    { x: 480, price: 2000000000, label: "見晴らしの湯", art: "utase", detail: "谷を見おろす湯船", value: 48, cost: 2, heat: 14 },
    { x: 580, price: 2800000000, label: "湯滝の露天", art: "taki", detail: "湯滝の真下に入る", value: 52, cost: 3, heat: 16 },
  ]),
  ...yuRow(22, 380, [
    { x: 990, price: 2200000000, label: "石段の高台足湯", art: "ashiyuroof", detail: "町ぜんぶを見おろす足湯", value: 6 },
  ]),
  ...yuRow(24, 1120, [
    { x: 2230, price: 5100000000, label: "提灯の下の足湯", art: "ashiyuroof", detail: "夜がいちばんにぎわう足湯", value: 8 },
    { x: 2350, price: 5800000000, label: "夜の寝湯", art: "neyu", detail: "提灯を見上げて寝ころぶ", value: 10 },
  ]),
  ...yuRow(29, 620, [
    { x: 2470, price: 12000000000, label: "大浴場", art: "hinoki", detail: "旅館いちばんの広い湯", value: 300, cost: 2, heat: 18 },
    { x: 2570, price: 14000000000, label: "庭の露天", art: "iwaburo", detail: "庭を眺めながら入る", value: 340, cost: 3, heat: 20 },
    { x: 2660, price: 15000000000, label: "貸切の湯", art: "utase", detail: "一組だけで使う湯", value: 380, cost: 3, heat: 22 },
  ]),

  /* ---------- 食事処（膳を運ぶ・器を下げる） ---------- */
  ...zenRow(9, 400, [
    { x: 1120, price: 1100000, label: "甘酒の卓", art: "amazake", detail: "熱い甘酒と漬物", value: 10 },
    { x: 1250, price: 2600000, label: "囲炉裏の卓", art: "irori", detail: "囲炉裏を囲んで食べる", value: 12 },
    { x: 1370, price: 5000000, label: "縁側の卓", art: "chaya", detail: "広場を見ながら食べる", value: 13 },
  ]),
  ...zenRow(11, 760, [
    { x: 250, price: 2200000, label: "そばの卓", art: "soba", detail: "山菜を載せた温かいそば", value: 12 },
    { x: 360, price: 4000000, label: "小上がりの席", art: "soba", detail: "畳に上がって食べる", value: 13 },
    { x: 470, price: 8100000, label: "窓ぎわの卓", art: "soba", detail: "通りを見ながら食べる", value: 14 },
  ]),
  ...zenRow(12, 1210, [
    { x: 250, price: 3800000, label: "立ち食い台", art: "kushi", detail: "串を焼きたてで頬張る", value: 6 },
    { x: 360, price: 8100000, label: "焼き台の前", art: "kushi", detail: "煙のなかで立って食べる", value: 7 },
    { x: 470, price: 16000000, label: "たまごの台", art: "tamago", detail: "温泉たまごをその場で割る", value: 8 },
  ]),
  ...zenRow(21, 180, [
    { x: 700, price: 1500000000, label: "湯上がりの卓", art: "chaya", detail: "冷たい牛乳とところてん", value: 24 },
    { x: 830, price: 2200000000, label: "縁側の席", art: "chaya", detail: "森を見ながら涼む", value: 28 },
  ]),
  ...zenRow(25, 960, [
    { x: 2230, price: 5800000000, label: "炉端の席", art: "irori", detail: "目の前で焼いて出す", value: 60 },
    { x: 2320, price: 6500000000, label: "カウンター", art: "irori", detail: "板前と向かい合う席", value: 70 },
    { x: 2410, price: 7600000000, label: "奥座敷", art: "irori", detail: "静かな奥の席", value: 80 },
  ]),

  /* ---------- 湯宿の客室（泊まり客に膳を運ぶ） ---------- */
  ...zenRow(17, 1010, [
    { x: 930, price: 120000000, label: "六畳の客室", art: "room", detail: "小さな宿のひと部屋", value: 100 },
    { x: 1030, price: 190000000, label: "角部屋", art: "room", detail: "窓がふたつある部屋", value: 120 },
  ]),
  ...zenRow(18, 1220, [
    { x: 1770, price: 340000000, label: "川見の客室", art: "room", detail: "湯坂の下を見おろす部屋", value: 140 },
    { x: 1860, price: 580000000, label: "広縁つき客室", art: "room", detail: "広縁で碁を打てる部屋", value: 160 },
    { x: 1950, price: 870000000, label: "露天つき客室", art: "roomyu", detail: "部屋に小さな露天がある", value: 180 },
  ]),
  ...zenRow(28, 640, [
    { x: 2030, price: 11000000000, label: "本館の客室", art: "room", detail: "大旅館のふつうの部屋", value: 400 },
    { x: 2130, price: 12000000000, label: "上階の客室", art: "room", detail: "町の灯りを見おろす部屋", value: 450 },
    { x: 2230, price: 14000000000, label: "特別室", art: "roomyu", detail: "内風呂と広間が付く", value: 500 },
    { x: 2330, price: 15000000000, label: "貴賓室", art: "roomyu", detail: "宿でいちばん奥の部屋", value: 550 },
  ]),

  /* ---------- 甘味・みやげの棚（客が自分で取り、帳場で払う） ---------- */
  ...tanaRow(1, 1280, { x: 1080, y: 1170 }, [
    { x: 890, price: 1700, label: "蒸したての棚", art: "manju", detail: "湯気の立つ蒸しまんじゅう", value: 4 },
    { x: 990, price: 4900, label: "土産用の箱", art: "manju", detail: "持ち帰り用の箱入り", value: 5 },
  ]),
  ...tanaRow(3, 1420, { x: 2400, y: 1350 }, [
    { x: 2210, price: 25000, label: "湯めぐりの案内", art: "annai", detail: "町の地図と入浴の手引き", value: 5 },
    { x: 2320, price: 81000, label: "絵はがきの棚", art: "annai", detail: "湯けむりの絵はがき", value: 6 },
  ]),
  ...tanaRow(5, 1040, { x: 1560, y: 930 }, [
    { x: 1480, price: 150000, label: "湯の花の棚", art: "yunohana", detail: "湯の花を詰めた小袋", value: 24 },
    { x: 1560, price: 500000, label: "菓子の棚", art: "manju", detail: "箱入りのみやげ菓子", value: 28 },
    { x: 1640, price: 1100000, label: "木彫りの棚", art: "kibori", detail: "この町でしか買えない木彫り", value: 34 },
  ]),
  ...tanaRow(13, 1210, { x: 770, y: 1130 }, [
    { x: 590, price: 9600000, label: "冷蔵ショーケース", art: "purin", detail: "ガラス越しに並ぶミルクプリン", value: 8 },
    { x: 700, price: 18000000, label: "季節の棚", art: "purin", detail: "季節ごとに味が変わる", value: 9 },
  ]),
  ...tanaRow(15, 350, { x: 1990, y: 270 }, [
    { x: 1790, price: 20000000, label: "焼き菓子の棚", art: "yakigashi", detail: "窯から出したての焼き菓子", value: 10 },
    { x: 1900, price: 34000000, label: "路地の甘味台", art: "yakigashi", detail: "座って食べていける台", value: 12 },
  ]),
  ...tanaRow(23, 120, { x: 1390, y: 60 }, [
    { x: 1180, price: 3300000000, label: "御守りの棚", art: "omamori", detail: "湯を守る社の御守り", value: 40 },
    { x: 1290, price: 4000000000, label: "記念の札所", art: "omamori", detail: "願いを書いて掛けていく", value: 50 },
  ]),
  ...tanaRow(26, 1150, { x: 2680, y: 1090 }, [
    { x: 2510, price: 6500000000, label: "夜パフェの台", art: "parfait", detail: "夜だけ出す大きなパフェ", value: 60 },
    { x: 2610, price: 7600000000, label: "夜の甘味棚", art: "parfait", detail: "湯上がりの客が並ぶ", value: 70 },
  ]),
];

const onsenHires: HireSpec[] = [
  /* ---------- 街区0: 道の係。足湯と屋台を見る ---------- */
  { id: "waiter-1", kind: "waiter", pos: { x: 1120, y: 1570 }, price: 380, label: "手ぬぐい係", area: 0, unlockAfter: "seat-0-3" },
  { id: "collector-1", kind: "collector", pos: { x: 1200, y: 1570 }, price: 1200, label: "集金係", area: 0, unlockAfter: "waiter-1" },
  { id: "cook-1", kind: "cook", pos: { x: 860, y: 1400 }, price: 900, label: "湯かご係", stoveId: "stove-1", area: 0, unlockAfter: "stove-2" },
  { id: "waiter-2", kind: "waiter", pos: { x: 1280, y: 1570 }, price: 4100, label: "手ぬぐい係", area: 0, unlockAfter: "waiter-1" },
  { id: "cook-2", kind: "cook", pos: { x: 1290, y: 1400 }, price: 6100, label: "湯かご係", stoveId: "stove-2", area: 0 },
  { id: "robot-1", kind: "robot", pos: { x: 1360, y: 1570 }, price: 13000, label: "巡回ワゴン", area: 0, unlockAfter: "waiter-2" },

  /* 蒸しまんじゅう屋 */
  { id: "cook-3", kind: "cook", pos: { x: 890, y: 1240 }, price: 3000, label: "蒸し方", stoveId: "mushi-1", area: 1 },
  { id: "stocker-1", kind: "stocker", pos: { x: 1080, y: 1240 }, price: 4100, label: "品出し係", area: 1 },
  { id: "collector-2", kind: "collector", pos: { x: 1080, y: 1310 }, price: 7900, label: "帳場のレジ係", area: 1 },
  { id: "cook-4", kind: "cook", pos: { x: 1000, y: 1240 }, price: 19000, label: "蒸し方", stoveId: "mushi-2", area: 1 },

  /* 到着広場 */
  { id: "waiter-3", kind: "waiter", pos: { x: 1520, y: 1560 }, price: 13000, label: "手ぬぐい係", area: 2 },
  { id: "collector-3", kind: "collector", pos: { x: 1640, y: 1560 }, price: 30000, label: "集金係", area: 2, unlockAfter: "waiter-3" },
  { id: "robot-2", kind: "robot", pos: { x: 1760, y: 1560 }, price: 260000, label: "巡回ワゴン", area: 2, unlockAfter: "waiter-3" },

  /* 観光案内所 */
  { id: "cook-5", kind: "cook", pos: { x: 2320, y: 1350 }, price: 43000, label: "案内人", stoveId: "annai-1", area: 3 },
  { id: "stocker-2", kind: "stocker", pos: { x: 2400, y: 1420 }, price: 65000, label: "品出し係", area: 3 },
  { id: "collector-4", kind: "collector", pos: { x: 2400, y: 1500 }, price: 150000, label: "レジ係", area: 3 },

  /* 湯の里売店 */
  { id: "cook-6", kind: "cook", pos: { x: 1480, y: 1000 }, price: 260000, label: "倉庫番", stoveId: "souvenir-1", area: 5 },
  { id: "stocker-3", kind: "stocker", pos: { x: 1560, y: 1000 }, price: 400000, label: "品出し係", area: 5 },
  { id: "collector-5", kind: "collector", pos: { x: 1440, y: 930 }, price: 850000, label: "レジ係", area: 5 },
  { id: "cook-7", kind: "cook", pos: { x: 1640, y: 1000 }, price: 1500000, label: "木彫り職人", stoveId: "souvenir-2", area: 5 },

  /* 湯坂・源泉広場 */
  { id: "waiter-4", kind: "waiter", pos: { x: 1360, y: 1300 }, price: 260000, label: "手ぬぐい係", area: 4 },
  { id: "cook-8", kind: "cook", pos: { x: 930, y: 600 }, price: 500000, label: "湯守", stoveId: "stove-3", area: 6 },
  { id: "waiter-5", kind: "waiter", pos: { x: 1260, y: 860 }, price: 850000, label: "手ぬぐい係", area: 6 },
  { id: "collector-6", kind: "collector", pos: { x: 1340, y: 860 }, price: 1300000, label: "集金係", area: 6 },
  { id: "robot-3", kind: "robot", pos: { x: 1180, y: 860 }, price: 5000000, label: "巡回ワゴン", area: 6, unlockAfter: "waiter-5" },
  { id: "cook-9", kind: "cook", pos: { x: 1290, y: 600 }, price: 6500000, label: "湯守", stoveId: "stove-4", area: 6 },
  { id: "master-1", kind: "master", pos: { x: 1100, y: 860 }, price: 34000000, label: "女将", area: 6 },

  /* 共同浴場 */
  { id: "cook-10", kind: "cook", pos: { x: 1570, y: 650 }, price: 590000, label: "番台", stoveId: "bath-1", area: 7 },
  { id: "waiter-6", kind: "waiter", pos: { x: 1440, y: 860 }, price: 850000, label: "手ぬぐい係", area: 7 },
  { id: "collector-7", kind: "collector", pos: { x: 1720, y: 860 }, price: 1700000, label: "集金係", area: 7 },

  /* 湯もみ小屋 */
  { id: "cook-11", kind: "cook", pos: { x: 660, y: 590 }, price: 940000, label: "湯もみ頭", stoveId: "yumomi-1", area: 8 },
  { id: "waiter-7", kind: "waiter", pos: { x: 540, y: 840 }, price: 1500000, label: "案内係", area: 8 },
  { id: "collector-8", kind: "collector", pos: { x: 780, y: 840 }, price: 2800000, label: "集金係", area: 8 },

  /* 甘酒茶屋 */
  { id: "cook-12", kind: "cook", pos: { x: 1200, y: 290 }, price: 1500000, label: "料理人", stoveId: "kitchen-1", area: 9 },
  { id: "server-1", kind: "server", pos: { x: 1400, y: 290 }, price: 2200000, label: "配膳係", area: 9 },
  { id: "busser-1", kind: "busser", pos: { x: 1400, y: 520 }, price: 2600000, label: "片づけ係", area: 9 },

  /* 食べ歩き通り */
  { id: "waiter-8", kind: "waiter", pos: { x: 560, y: 1060 }, price: 1000000, label: "手ぬぐい係", area: 10 },
  { id: "collector-9", kind: "collector", pos: { x: 640, y: 1060 }, price: 1800000, label: "集金係", area: 10 },
  { id: "robot-4", kind: "robot", pos: { x: 720, y: 1060 }, price: 11000000, label: "巡回ワゴン", area: 10, unlockAfter: "waiter-8" },

  /* 山菜そば処 */
  { id: "cook-13", kind: "cook", pos: { x: 350, y: 670 }, price: 2200000, label: "料理人", stoveId: "kitchen-2", area: 11 },
  { id: "server-2", kind: "server", pos: { x: 460, y: 670 }, price: 3000000, label: "配膳係", area: 11 },
  { id: "busser-2", kind: "busser", pos: { x: 500, y: 860 }, price: 4000000, label: "片づけ係", area: 11 },

  /* 串焼きと温泉たまご */
  { id: "cook-14", kind: "cook", pos: { x: 300, y: 1180 }, price: 3800000, label: "焼き方", stoveId: "kitchen-3", area: 12 },
  { id: "server-3", kind: "server", pos: { x: 500, y: 1130 }, price: 5000000, label: "配膳係", area: 12 },
  { id: "busser-3", kind: "busser", pos: { x: 500, y: 1300 }, price: 8100000, label: "片づけ係", area: 12 },
  { id: "cook-15", kind: "cook", pos: { x: 430, y: 1180 }, price: 16000000, label: "湯だまり番", stoveId: "kitchen-4", area: 12 },

  /* ミルクプリン店 */
  { id: "cook-16", kind: "cook", pos: { x: 680, y: 1130 }, price: 9600000, label: "菓子職人", stoveId: "sweets-1", area: 13 },
  { id: "stocker-5", kind: "stocker", pos: { x: 780, y: 1200 }, price: 13000000, label: "品出し係", area: 13 },
  { id: "collector-10", kind: "collector", pos: { x: 780, y: 1300 }, price: 21000000, label: "レジ係", area: 13 },

  /* 裏湯路地 */
  { id: "waiter-9", kind: "waiter", pos: { x: 1450, y: 570 }, price: 11000000, label: "手ぬぐい係", area: 14 },
  { id: "collector-11", kind: "collector", pos: { x: 1560, y: 570 }, price: 18000000, label: "集金係", area: 14 },

  /* 路地の甘味処 */
  { id: "cook-17", kind: "cook", pos: { x: 1890, y: 270 }, price: 21000000, label: "菓子職人", stoveId: "sweets-2", area: 15 },
  { id: "stocker-6", kind: "stocker", pos: { x: 1990, y: 350 }, price: 29000000, label: "品出し係", area: 15 },
  { id: "collector-12", kind: "collector", pos: { x: 1990, y: 430 }, price: 44000000, label: "レジ係", area: 15 },

  /* 小さな共同湯 */
  { id: "cook-18", kind: "cook", pos: { x: 1570, y: 50 }, price: 34000000, label: "番台", stoveId: "bath-2", area: 16 },
  { id: "waiter-10", kind: "waiter", pos: { x: 1670, y: 50 }, price: 44000000, label: "手ぬぐい係", area: 16 },
  { id: "collector-13", kind: "collector", pos: { x: 1670, y: 190 }, price: 65000000, label: "集金係", area: 16 },

  /* 湯宿（小） */
  { id: "cook-19", kind: "cook", pos: { x: 1010, y: 930 }, price: 120000000, label: "料理長", stoveId: "kitchen-5", area: 17 },
  { id: "server-4", kind: "server", pos: { x: 1090, y: 930 }, price: 150000000, label: "仲居", area: 17 },
  { id: "busser-4", kind: "busser", pos: { x: 1090, y: 1000 }, price: 190000000, label: "布団係", area: 17 },
  { id: "collector-14", kind: "collector", pos: { x: 1090, y: 1070 }, price: 260000000, label: "帳場のレジ係", area: 17 },

  /* 湯宿（大） */
  { id: "cook-20", kind: "cook", pos: { x: 1790, y: 1175 }, price: 340000000, label: "料理長", stoveId: "kitchen-6", area: 18 },
  { id: "server-5", kind: "server", pos: { x: 1720, y: 1175 }, price: 430000000, label: "仲居", area: 18 },
  { id: "busser-5", kind: "busser", pos: { x: 1720, y: 1110 }, price: 580000000, label: "布団係", area: 18 },
  { id: "collector-15", kind: "collector", pos: { x: 1960, y: 1175 }, price: 710000000, label: "帳場のレジ係", area: 18 },
  { id: "cook-21", kind: "cook", pos: { x: 1900, y: 1240 }, price: 870000000, label: "料理長", stoveId: "kitchen-7", area: 18 },
  { id: "server-6", kind: "server", pos: { x: 1720, y: 1245 }, price: 1100000000, label: "仲居", area: 18 },
  { id: "master-2", kind: "master", pos: { x: 1960, y: 1110 }, price: 1800000000, label: "女将", area: 18 },

  /* 湯川公園 */
  { id: "waiter-11", kind: "waiter", pos: { x: 600, y: 520 }, price: 610000000, label: "手ぬぐい係", area: 19 },
  { id: "collector-16", kind: "collector", pos: { x: 680, y: 520 }, price: 870000000, label: "集金係", area: 19 },
  { id: "robot-5", kind: "robot", pos: { x: 760, y: 520 }, price: 2200000000, label: "人力車", area: 19, unlockAfter: "waiter-11" },
  { id: "cook-22", kind: "cook", pos: { x: 360, y: 70 }, price: 1100000000, label: "番台", stoveId: "bath-3", area: 20 },
  { id: "waiter-12", kind: "waiter", pos: { x: 260, y: 260 }, price: 1400000000, label: "手ぬぐい係", area: 20 },
  { id: "collector-17", kind: "collector", pos: { x: 590, y: 260 }, price: 1700000000, label: "集金係", area: 20 },
  { id: "cook-23", kind: "cook", pos: { x: 810, y: 70 }, price: 1500000000, label: "料理人", stoveId: "kitchen-8", area: 21 },
  { id: "server-7", kind: "server", pos: { x: 900, y: 70 }, price: 1800000000, label: "配膳係", area: 21 },
  { id: "busser-6", kind: "busser", pos: { x: 900, y: 260 }, price: 2200000000, label: "片づけ係", area: 21 },

  /* 山門・展望坂 */
  { id: "waiter-13", kind: "waiter", pos: { x: 990, y: 200 }, price: 2500000000, label: "手ぬぐい係", area: 22 },
  { id: "collector-18", kind: "collector", pos: { x: 990, y: 290 }, price: 3000000000, label: "集金係", area: 22 },
  { id: "cook-24", kind: "cook", pos: { x: 1180, y: 60 }, price: 3700000000, label: "社務の人", stoveId: "omamori-1", area: 23 },
  { id: "stocker-7", kind: "stocker", pos: { x: 1290, y: 60 }, price: 4000000000, label: "品出し係", area: 23 },
  { id: "collector-19", kind: "collector", pos: { x: 1390, y: 190 }, price: 4400000000, label: "レジ係", area: 23 },

  /* 夜見世通り */
  { id: "waiter-14", kind: "waiter", pos: { x: 2230, y: 1270 }, price: 5100000000, label: "手ぬぐい係", area: 24 },
  { id: "collector-20", kind: "collector", pos: { x: 2320, y: 1270 }, price: 5800000000, label: "集金係", area: 24 },
  { id: "robot-6", kind: "robot", pos: { x: 2410, y: 1270 }, price: 7300000000, label: "巡回ワゴン", area: 24, unlockAfter: "waiter-14" },
  { id: "cook-25", kind: "cook", pos: { x: 2230, y: 910 }, price: 6200000000, label: "板前", stoveId: "kitchen-9", area: 25 },
  { id: "server-8", kind: "server", pos: { x: 2420, y: 850 }, price: 6500000000, label: "配膳係", area: 25 },
  { id: "busser-7", kind: "busser", pos: { x: 2420, y: 910 }, price: 7300000000, label: "片づけ係", area: 25 },
  { id: "cook-26", kind: "cook", pos: { x: 2350, y: 910 }, price: 8400000000, label: "板前", stoveId: "kitchen-10", area: 25 },
  { id: "cook-27", kind: "cook", pos: { x: 2610, y: 1090 }, price: 7300000000, label: "菓子職人", stoveId: "sweets-3", area: 26 },
  { id: "stocker-8", kind: "stocker", pos: { x: 2680, y: 1160 }, price: 7600000000, label: "品出し係", area: 26 },
  { id: "collector-21", kind: "collector", pos: { x: 2680, y: 1240 }, price: 8700000000, label: "レジ係", area: 26 },

  /* 大旅館 */
  { id: "cook-28", kind: "cook", pos: { x: 2030, y: 570 }, price: 11000000000, label: "料理長", stoveId: "kitchen-11", area: 28 },
  { id: "cook-29", kind: "cook", pos: { x: 2150, y: 570 }, price: 13000000000, label: "料理長", stoveId: "kitchen-12", area: 28 },
  { id: "server-9", kind: "server", pos: { x: 2280, y: 510 }, price: 12000000000, label: "仲居", area: 28 },
  { id: "server-10", kind: "server", pos: { x: 2370, y: 510 }, price: 14000000000, label: "仲居", area: 28 },
  { id: "busser-8", kind: "busser", pos: { x: 2280, y: 570 }, price: 14000000000, label: "布団係", area: 28 },
  { id: "busser-9", kind: "busser", pos: { x: 2370, y: 570 }, price: 15000000000, label: "布団係", area: 28 },
  { id: "collector-22", kind: "collector", pos: { x: 2380, y: 740 }, price: 15000000000, label: "帳場のレジ係", area: 28 },
  { id: "master-3", kind: "master", pos: { x: 2000, y: 740 }, price: 18000000000, label: "大女将", area: 28 },
  { id: "cook-30", kind: "cook", pos: { x: 2580, y: 510 }, price: 13000000000, label: "番台", stoveId: "bath-4", area: 29 },
  { id: "waiter-15", kind: "waiter", pos: { x: 2470, y: 760 }, price: 14000000000, label: "手ぬぐい係", area: 29 },
  { id: "waiter-16", kind: "waiter", pos: { x: 2570, y: 760 }, price: 15000000000, label: "手ぬぐい係", area: 29 },
  { id: "collector-23", kind: "collector", pos: { x: 2660, y: 760 }, price: 16000000000, label: "集金係", area: 29 },
];

const onsenEquipment: EquipSpec[] = [
  /* 湯まわりの強化（源泉から町じゅうの湯へ効く） */
  { id: "noodle", name: "湯樋の掃除", detail: "すべての作業場が +30%・湯量 +10", pos: { x: 1000, y: 600 }, price: 500000, area: 6, unlockAfter: "area-6" },
  { id: "fridge", name: "木製分水槽", detail: "作業場に貯めておける数 +4・湯量 +10", pos: { x: 1080, y: 600 }, price: 1100000, area: 6, unlockAfter: "equip-noodle" },
  { id: "ticket", name: "湯銭箱", detail: "お金が自動で入る・集金係は手ぬぐいへ", pos: { x: 1160, y: 600 }, price: 6500000, area: 6, unlockAfter: "equip-fridge" },
  { id: "yuguchi", name: "湯口の拡張", detail: "源泉の湯汲み場に +6 ためられる・湯量 +18", pos: { x: 860, y: 680 }, price: 3000000, area: 6, capacity: { stove: "stove-3", plus: 6 }, unlockAfter: "area-6" },
  { id: "bunyu", name: "配湯管の増設", detail: "共同浴場の受付に +6 ためられる・湯量 +18", pos: { x: 1690, y: 650 }, price: 11000000, area: 7, capacity: { stove: "bath-1", plus: 6 }, unlockAfter: "area-7" },
  { id: "horimashi", name: "源泉の掘り増し", detail: "湯量 +48。町ぜんぶの湯にゆとりが出る", pos: { x: 1240, y: 690 }, price: 40000000, area: 6, unlockAfter: "area-14" },
  { id: "yudamari", name: "大湯だまり", detail: "湯量 +72。大きな露天と大浴場を支える", pos: { x: 1000, y: 690 }, price: 900000000, area: 6, unlockAfter: "area-20" },
  { id: "yusetsu", name: "融雪の湯道", detail: "小雪の日でも道の足がにぶらない", pos: { x: 1180, y: 1300 }, price: 300000000, area: 4, unlockAfter: "area-19" },

  /* 石畳（通ると足が速くなる。道をつなぐほど町が回る） */
  { id: "ishidatami1", name: "入口の石畳", detail: "石を敷き直す。町を歩く足が速くなる", pos: { x: 1030, y: 1400 }, price: 65000, area: 0, road: { from: { x: 1070, y: 1500 }, to: { x: 1270, y: 1100 } }, unlockAfter: "area-2" },
  { id: "ishidatami2", name: "湯坂の石畳", detail: "坂を石で舗装する。さらに足が速くなる", pos: { x: 1180, y: 1200 }, price: 2600000, area: 4, road: { from: { x: 1270, y: 1300 }, to: { x: 1100, y: 700 } }, unlockAfter: "area-6" },
  { id: "ishidatami3", name: "通りの石畳", detail: "食べ歩き通りを舗装する", pos: { x: 560, y: 1000 }, price: 29000000, area: 10, road: { from: { x: 800, y: 980 }, to: { x: 260, y: 980 } }, unlockAfter: "area-10" },
  { id: "kibashi", name: "湯川の木橋", detail: "川をまたぐ橋。公園までの足が速くなる", pos: { x: 600, y: 320 }, price: 1100000000, area: 19, road: { from: { x: 790, y: 420 }, to: { x: 300, y: 420 } }, unlockAfter: "area-19" },

  /* 集客（かけ算で効く。町のにぎわいそのもの） */
  { id: "nobori", name: "湯けむりののぼり", detail: "入口から目立つ。集客 1.25倍", pos: { x: 950, y: 1400 }, price: 13000, area: 0, draw: 1.25, unlockAfter: "waiter-1" },
  { id: "annaiban", name: "大きな案内板", detail: "行き先が分かる。集客 1.4倍", pos: { x: 1880, y: 1400 }, price: 260000, area: 2, draw: 1.4, unlockAfter: "area-2" },
  { id: "yumomiTaiko", name: "湯もみの太鼓", detail: "演目の音が町に響く。集客 1.6倍", pos: { x: 750, y: 590 }, price: 6500000, area: 8, draw: 1.6, unlockAfter: "area-8" },
  { id: "chochin", name: "提灯の並木", detail: "夜の通りが明るくなる。集客 1.8倍", pos: { x: 260, y: 1060 }, price: 79000000, area: 10, draw: 1.8, unlockAfter: "area-10" },
  { id: "yukata", name: "浴衣の貸し出し", detail: "浴衣で町を歩ける。集客 2倍", pos: { x: 1180, y: 1100 }, price: 870000000, area: 4, draw: 2, unlockAfter: "area-17" },
  { id: "tenbo", name: "展望台", detail: "石段の上から町を見わたす。集客 2.4倍", pos: { x: 990, y: 60 }, price: 3700000000, area: 22, draw: 2.4, unlockAfter: "area-22" },
  { id: "yuakari", name: "湯あかりの灯籠", detail: "町ぜんぶに灯籠がともる。集客 3倍", pos: { x: 2080, y: 1000 }, price: 11000000000, area: 27, draw: 3, unlockAfter: "area-28" },
];

const onsenUpgrades: Upgrade[] = [
  { id: "carry", name: "湯かご", detail: (n) => `${3 + n}こまで持てる・スタッフも ${3 + Math.floor(n / 2)}こ`, pos: { x: 780, y: 1570 }, basePrice: 70, growth: 1.7, max: 9, unlockAfter: "seat-0-3" },
  { id: "speed", name: "わらじ", detail: (n) => `足の速さ +${n * 10}%・スタッフも +${n * 5}%`, pos: { x: 860, y: 1570 }, basePrice: 60, growth: 1.65, max: 12, unlockAfter: "waiter-1" },
  { id: "cook", name: "湯口の手入れ", detail: (n) => `作る速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 940, y: 1570 }, basePrice: 110, growth: 1.7, max: 14, unlockAfter: "stove-2" },
  { id: "price", name: "もてなし", detail: (n) => `ひとり ${Math.round(60 * Math.pow(1.4, n))}円`, pos: { x: 1020, y: 1570 }, basePrice: 150, growth: 1.9, max: 20, unlockAfter: "seat-0-4" },
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
 * 文字のはじまりの受け渡し場。
 *
 * ござ・屋台・帳場・記録席と、渡す相手ごとに見た目を変える
 * （仕様書 §2「名前が違えば見た目も違わせる」）。
 * ベンチと違って一列に並べないので、x と y を1つずつ持たせる。
 */
const cityRow = (
  area: number,
  needs: string,
  value: number,
  label: string,
  art: string,
  spots: {
    x: number;
    y: number;
    price: number;
    unlockAfter?: string;
    reveal?: number;
  }[],
  tag = "",
): SeatSpec[] =>
  spots.map((spot, i) => ({
    id: `seat-${area}-${tag}${i + 1}`,
    pos: { x: spot.x, y: spot.y + 60 },
    serve: { x: spot.x, y: spot.y },
    tray: { x: spot.x, y: spot.y + 24 },
    price: spot.price,
    area,
    label,
    art,
    needs,
    value,
    reveal: spot.reveal,
    unlockAfter:
      spot.unlockAfter ??
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
    unlockAfter: "mark-pop-20",
    reveal: 100,
  },
  /*
   * 本編とは別の寄り道「夜の森」。
   * マンモスの谷から北へ分岐し、文明を先へ進めず、夜の危険と動物との共生を掘る。
   */
  {
    id: "area-6",
    label: "夜の森へ入る",
    price: 90000,
    rect: { x0: 1620, y0: -820, x1: 2860, y1: 0 },
    // 閉じているあいだも、谷側から入口の枠に触れられる
    padPos: { x: 2240, y: 34 },
    palette: { floor: "#243529", deep: "#101a14", prop: "nightforest" },
    // まず一度マンモスを倒して「集団で野生に向き合う」を経験してから分岐する
    unlockAfter: "mark-kills-1",
    reveal: 52,
  },
  /*
   * 北側の寄り道帯。夜の森だけが北へ飛び出して見えないように、
   * 本編の各区画と並走する「野生を広く使う投資ルート」をつなげる。
   * どれも本編クリアの必須条件にはしない。
   */
  {
    id: "area-7",
    label: "風の高台へ登る",
    price: 9000,
    rect: { x0: 0, y0: -820, x1: 720, y1: 0 },
    padPos: { x: 360, y: 34 },
    palette: { floor: "#39452b", deep: "#20291a", prop: "northmeadow" },
    unlockAfter: "area-1",
    reveal: 21.8,
  },
  {
    id: "area-8",
    label: "月の湿地へ入る",
    price: 28000,
    rect: { x0: 720, y0: -820, x1: 1620, y1: 0 },
    padPos: { x: 1170, y: 34 },
    palette: { floor: "#263c37", deep: "#142521", prop: "moonmarsh" },
    unlockAfter: "mark-night-1",
    reveal: 35.8,
  },
  {
    id: "area-9",
    label: "岩棚の洞窟をひらく",
    price: 260000,
    rect: { x0: 2860, y0: -820, x1: 3760, y1: 0 },
    padPos: { x: 3310, y: 34 },
    palette: { floor: "#3d4140", deep: "#202526", prop: "rockcave" },
    unlockAfter: "area-3",
    reveal: 61.5,
  },
  {
    id: "area-10",
    label: "星見の丘へ登る",
    price: 900000,
    rect: { x0: 3760, y0: -820, x1: 4660, y1: 0 },
    padPos: { x: 4210, y: 34 },
    palette: { floor: "#353d2b", deep: "#202617", prop: "starglen" },
    unlockAfter: "area-4",
    reveal: 81.5,
  },
  {
    id: "area-11",
    label: "上流の滝へ進む",
    price: 3800000,
    rect: { x0: 4660, y0: -820, x1: 5560, y1: 0 },
    padPos: { x: 5110, y: 34 },
    palette: { floor: "#29444a", deep: "#152a2f", prop: "headwater" },
    unlockAfter: "area-5",
    reveal: 101.5,
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
    art: "bighut", label: "大きな住居", needs: { log: 16, hide: 5, pot: 2 },
    gives: { houses: 6, warm: 1, note: "大きな住居ができた" }, reveal: 84.5,
  },
  {
    id: "build-hut-7", pos: { x: 4340, y: 660 }, price: 380000, area: 4,
    art: "bighut", label: "もう一軒の大きな住居", needs: { log: 18, hide: 5, pot: 4 },
    gives: { houses: 6, warm: 1, note: "村の住居がそろった" },
    unlockAfter: "built-build-hut-6", reveal: 85.5,
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

  /* ============ 寄り道 area-6 「夜の森」 ============ */
  {
    id: "night-wood", pos: { x: 1860, y: -170 }, price: 55000, area: 6,
    takes: "wood", store: true, hold: 16, art: "woodstore", label: "夜番の薪置き場",
    unlockAfter: "equip-hand-torch", reveal: 52.7,
  },
  {
    id: "night-bait", pos: { x: 2470, y: -470 }, price: 80000, area: 6,
    takes: "mmeat", store: true, hold: 10, art: "store", label: "オオカミの餌場",
    unlockAfter: "equip-hand-torch", reveal: 52.9,
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
  // 網（net-1）で獲れ高が伸びるわりに席が2つしかなく、供給過多で
  // 魚がだぶついていた（プレイテストのフィードバック）ので、
  // ひとつ手前の段にもう2席足して受け止め先を増やした
  ...benchRow(5, 480, "fish", 2.6, "川辺の席", [
    { x: 4770, price: 1300000, reveal: 118 },
    { x: 4910, price: 1800000, reveal: 120 },
  ], "f"),
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

  /* --- 寄り道「夜の森」: 光を点から線へ増やしていく --- */
  { id: "hand-torch", name: "手持ちたいまつ", detail: "夜の森で自分の周囲を照らし、オオカミを追い払える", pos: { x: 1760, y: -100 }, price: 45000, area: 6, reveal: 52.2 },
  { id: "night-torch-1", name: "森のたいまつ台", detail: "夜の森に最初の安全地帯をつくる。夜ごとに薪を1こ使う", pos: { x: 1960, y: -250 }, price: 65000, area: 6, unlockAfter: "equip-hand-torch", reveal: 53.1 },
  { id: "night-torch-2", name: "奥のたいまつ台", detail: "安全地帯を森の中央まで伸ばす。夜ごとに薪を1こ使う", pos: { x: 2280, y: -430 }, price: 110000, area: 6, unlockAfter: "equip-night-torch-1", reveal: 53.5 },
  { id: "night-torch-3", name: "最奥のたいまつ台", detail: "餌場まで光をつなぐ。夜ごとに薪を1こ使う", pos: { x: 2630, y: -620 }, price: 180000, area: 6, unlockAfter: "equip-night-torch-2", reveal: 53.9 },
  { id: "wolf-bell", name: "見張りの鐘", detail: "遠くの群れを先に察知して、一度に近づくオオカミを減らす", pos: { x: 2670, y: -180 }, price: 160000, area: 6, unlockAfter: "equip-night-torch-2", reveal: 54.2 },

  /* --- 夜の森を「買って育てる」ための追加投資 --- */
  { id: "night-torch-4", name: "古木のたいまつ台", detail: "巨大古木の周りまで安全地帯を伸ばす。夜ごとに薪を1こ使う", pos: { x: 2380, y: -690 }, price: 240000, area: 6, unlockAfter: "equip-night-torch-3", reveal: 54.4 },
  { id: "night-torch-5", name: "巣穴前のたいまつ台", detail: "洞穴の手前まで火をつなぐ。夜ごとに薪を1こ使う", pos: { x: 2740, y: -720 }, price: 340000, area: 6, unlockAfter: "equip-night-torch-4", reveal: 54.8 },
  { id: "night-path", name: "森の丸太道", detail: "入口から餌場までの移動が速くなる", pos: { x: 2190, y: -350 }, price: 140000, area: 6, road: { from: { x: 2180, y: -30 }, to: { x: 2470, y: -520 } }, unlockAfter: "equip-hand-torch", reveal: 53.3 },
  { id: "night-wood-rack", name: "薪の高床棚", detail: "夜番の薪置き場に積める数 +12", pos: { x: 1840, y: -235 }, price: 120000, area: 6, capacity: { stove: "night-wood", plus: 12 }, unlockAfter: "night-wood", reveal: 53.4 },
  { id: "night-bait-rack", name: "餌場の石囲い", detail: "オオカミの餌場に積める肉 +8", pos: { x: 2520, y: -520 }, price: 150000, area: 6, capacity: { stove: "night-bait", plus: 8 }, unlockAfter: "night-bait", reveal: 53.6 },
  { id: "wolf-feeding-rack", name: "餌の置き分け", detail: "一晩に必要なマンモス肉が 2こ→1こになる", pos: { x: 2550, y: -455 }, price: 220000, area: 6, unlockAfter: "equip-night-bait-rack", reveal: 54.0 },
  { id: "wolf-fence", name: "枝の防護柵", detail: "暗がりから同時に近づくオオカミをさらに1頭減らす", pos: { x: 2660, y: -330 }, price: 280000, area: 6, unlockAfter: "equip-wolf-bell", reveal: 54.6 },
  { id: "dog-shelter", name: "犬の寝床", detail: "最初の犬が速く走り、マンモスの追い込みも強くなる", pos: { x: 2490, y: -390 }, price: 420000, area: 6, unlockAfter: "mark-dog", reveal: 55.0 },

  /* --- area-7 風の高台: 初期区画の生産力を横から底上げ --- */
  { id: "north-trail", name: "高台の獣道", detail: "高台を縦に抜ける近道。通ると足が速くなる", pos: { x: 360, y: -310 }, price: 12000, area: 7, road: { from: { x: 360, y: -30 }, to: { x: 360, y: -700 } }, reveal: 22.1 },
  { id: "north-hunt-cache", name: "狩りの物置", detail: "はじまりの狩り場に置ける肉 +6", pos: { x: 150, y: -250 }, price: 16000, area: 7, capacity: { stove: "hunt-1", plus: 6 }, reveal: 22.4 },
  { id: "north-log-rack", name: "丸太の高床棚", detail: "はじまりの森に置ける丸太 +6", pos: { x: 570, y: -250 }, price: 19000, area: 7, capacity: { stove: "forest-1", plus: 6 }, unlockAfter: "equip-north-hunt-cache", reveal: 22.7 },
  { id: "north-hide", name: "狩人の雨よけ", detail: "高台で休める。仲間が少し集まりやすくなる", pos: { x: 210, y: -520 }, price: 26000, area: 7, draw: 1.05, reveal: 23.0 },
  { id: "north-fire", name: "高台ののろし火", detail: "遠くからも見える火。仲間がさらに集まりやすくなる", pos: { x: 520, y: -610 }, price: 42000, area: 7, draw: 1.06, unlockAfter: "equip-north-hide", reveal: 23.4 },

  /* --- area-8 月の湿地: 集落の備蓄と移動を強くする --- */
  { id: "marsh-walkway", name: "湿地の丸太道", detail: "ぬかるみを越える道。北側の移動が速くなる", pos: { x: 1120, y: -360 }, price: 36000, area: 8, road: { from: { x: 1140, y: -30 }, to: { x: 1120, y: -700 } }, reveal: 36.1 },
  { id: "marsh-food-rack", name: "湿地の保存棚", detail: "集落の食料庫に積める保存肉 +6", pos: { x: 900, y: -280 }, price: 46000, area: 8, capacity: { stove: "store-1", plus: 6 }, reveal: 36.4 },
  { id: "marsh-smoke-rack", name: "風通しの燻製棚", detail: "燻製小屋に置ける保存肉 +6", pos: { x: 1320, y: -270 }, price: 52000, area: 8, capacity: { stove: "smoke-1", plus: 6 }, unlockAfter: "equip-marsh-food-rack", reveal: 36.7 },
  { id: "marsh-log-rack", name: "水辺の丸太棚", detail: "東の森に置ける丸太 +6", pos: { x: 1450, y: -520 }, price: 62000, area: 8, capacity: { stove: "forest-2", plus: 6 }, reveal: 37.0 },
  { id: "marsh-watch", name: "水鳥の見張り台", detail: "湿地を見渡せる。仲間が少し集まりやすくなる", pos: { x: 850, y: -620 }, price: 78000, area: 8, draw: 1.06, unlockAfter: "equip-marsh-walkway", reveal: 37.4 },

  /* --- area-9 岩棚の洞窟: 冬の備蓄を厚くする --- */
  { id: "cave-trail", name: "洞窟への石道", detail: "雪の中でも洞窟へ抜けやすい近道", pos: { x: 3300, y: -330 }, price: 300000, area: 9, road: { from: { x: 3310, y: -30 }, to: { x: 3310, y: -700 } }, reveal: 62.0 },
  { id: "cave-wood-cache", name: "乾いた薪穴", detail: "大型薪倉庫に積める薪 +10", pos: { x: 3050, y: -300 }, price: 340000, area: 9, capacity: { stove: "store-wood", plus: 10 }, reveal: 62.4 },
  { id: "cave-food-cache", name: "岩陰の食料庫", detail: "保存肉倉庫に積める保存肉 +8", pos: { x: 3510, y: -300 }, price: 390000, area: 9, capacity: { stove: "store-food2", plus: 8 }, reveal: 62.8 },
  { id: "cave-coat-rack", name: "毛皮の乾燥棚", detail: "衣装棚に置ける防寒着 +6", pos: { x: 3080, y: -570 }, price: 460000, area: 9, capacity: { stove: "store-coat", plus: 6 }, unlockAfter: "equip-cave-wood-cache", reveal: 63.2 },
  { id: "cave-beacon", name: "洞窟口の火", detail: "吹雪でも洞窟の入口が分かる。仲間が少し集まりやすい", pos: { x: 3500, y: -610 }, price: 560000, area: 9, draw: 1.06, reveal: 63.6 },

  /* --- area-10 星見の丘: 村の工房を拡張する --- */
  { id: "ridge-trail", name: "丘の石段", detail: "村と丘を直につなぐ。移動が速くなる", pos: { x: 4200, y: -330 }, price: 1100000, area: 10, road: { from: { x: 4210, y: -30 }, to: { x: 4210, y: -700 } }, reveal: 82.0 },
  { id: "ridge-clay-rack", name: "粘土の乾燥棚", detail: "粘土穴に置ける粘土 +6", pos: { x: 3900, y: -280 }, price: 1250000, area: 10, capacity: { stove: "claypit-1", plus: 6 }, reveal: 82.4 },
  { id: "ridge-pot-rack", name: "土器の棚場", detail: "土器工房に置ける土器 +6", pos: { x: 4070, y: -510 }, price: 1450000, area: 10, capacity: { stove: "pottery-1", plus: 6 }, reveal: 82.8 },
  { id: "ridge-tool-rack", name: "道具の置き場", detail: "道具工房に置ける道具 +6", pos: { x: 4380, y: -500 }, price: 1700000, area: 10, capacity: { stove: "tool-1", plus: 6 }, reveal: 83.2 },
  { id: "ridge-lookout", name: "丘の見張り台", detail: "村の外まで見渡せる。仲間が少し集まりやすくなる", pos: { x: 4490, y: -650 }, price: 2200000, area: 10, draw: 1.07, reveal: 83.6 },

  /* --- area-11 上流の滝: 川の供給と探索を強くする --- */
  { id: "headwater-trail", name: "上流の岩道", detail: "川辺から滝までの移動が速くなる", pos: { x: 5100, y: -330 }, price: 4300000, area: 11, road: { from: { x: 5110, y: -30 }, to: { x: 5110, y: -700 } }, reveal: 102.0 },
  { id: "headwater-weir", name: "上流の魚どめ", detail: "川の瀬に置ける魚 +10", pos: { x: 5350, y: -250 }, price: 4900000, area: 11, capacity: { stove: "fish-1", plus: 10 }, reveal: 102.4 },
  { id: "headwater-store", name: "岩陰の川倉", detail: "川辺の倉庫に積める保存肉 +10", pos: { x: 4830, y: -260 }, price: 5600000, area: 11, capacity: { stove: "store-river", plus: 10 }, reveal: 102.8 },
  { id: "headwater-plank-rack", name: "乾燥木材棚", detail: "木材加工場に置ける板 +6", pos: { x: 4860, y: -530 }, price: 6500000, area: 11, capacity: { stove: "plank-1", plus: 6 }, reveal: 103.2 },
  { id: "headwater-rope-rack", name: "縄の乾燥棚", detail: "縄工房に置ける縄 +6", pos: { x: 5160, y: -520 }, price: 7600000, area: 11, capacity: { stove: "rope-1", plus: 6 }, reveal: 103.6 },
  { id: "headwater-marker", name: "上流の目印石", detail: "川の曲がりを覚え、探索隊がさらに1.25倍速く帰る", pos: { x: 5420, y: -650 }, price: 9200000, area: 11, unlockAfter: "equip-headwater-trail", reveal: 104.0 },

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

/* ==================== ワーキングプラネット: 大河の文明 ==================== */

/**
 * 「火のはじまり」の次のステージ（仕様書は docs/taiga-civilization.md）。
 *
 * 狩って得る生産から、育てて得る生産へ。
 *
 *   川 ──(水)──┐
 *               ├─▶ 畑 ──(穀物)──┬─▶ 川辺の食事場
 *   種置き場 ─(種)┘                └─▶ 石臼 ─(粉)─▶ パン窯 ─(パン)─▶ 席
 *
 * 畑は「水1こ + 種1こ → 穀物1こ」。作るのに時間がかかるところが作物らしさで、
 * 水を手で運ぶあいだは畑がよく止まる。第2区画の水路（直結の設備）を引くと、
 * その手運びが消える ―― これがこのステージのいちばんの山になる。
 */
const taigaAreas: AreaSpec[] = [
  {
    id: "area-0",
    label: "川辺の畑",
    price: 0,
    rect: { x0: 0, y0: 0, x1: 720, y1: 520 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#2f3a22", deep: "#1d2415", prop: "none" },
  },
  {
    id: "area-1",
    label: "水路をひらく",
    price: 2400,
    rect: { x0: 720, y0: 0, x1: 1620, y1: 760 },
    padPos: { x: 690, y: 300 },
    palette: { floor: "#2b3a2c", deep: "#1a251b", prop: "none" },
    // 1区画目が自分の手だけでひととおり回ってから、水路の話が出る
    unlockAfter: "robot-1",
    reveal: 11.6,
  },
  {
    id: "area-2",
    label: "土と火の工房をひらく",
    price: 18000,
    rect: { x0: 1620, y0: 0, x1: 2520, y1: 760 },
    padPos: { x: 1590, y: 300 },
    palette: { floor: "#3d3327", deep: "#251e16", prop: "none" },
    // 水路が2本つながって、穀物が余りはじめるころ
    unlockAfter: "equip-canal-2",
    reveal: 40,
  },
  {
    id: "area-3",
    label: "牧草地へ広げる",
    price: 180000,
    rect: { x0: 2520, y0: 0, x1: 3420, y1: 760 },
    padPos: { x: 2490, y: 300 },
    palette: { floor: "#33421f", deep: "#1f2914", prop: "none" },
    unlockAfter: "equip-chute-flour",
    reveal: 60,
  },
  {
    id: "area-4",
    label: "大河の市場へ下る",
    price: 700000,
    rect: { x0: 3420, y0: 0, x1: 4320, y1: 760 },
    padPos: { x: 3390, y: 300 },
    palette: { floor: "#2f4247", deep: "#1b2a2f", prop: "ship" },
    unlockAfter: "seat-3-t1",
    reveal: 80,
  },
  {
    id: "area-5",
    label: "村を町にする",
    price: 3000000,
    rect: { x0: 4320, y0: 0, x1: 5220, y1: 760 },
    padPos: { x: 4290, y: 300 },
    palette: { floor: "#414a3a", deep: "#282e23", prop: "market" },
    unlockAfter: "built-build-market",
    reveal: 100,
  },
  {
    id: "area-6",
    label: "大穀倉地帯を拓く",
    price: 32000000,
    rect: { x0: 5220, y0: 0, x1: 6120, y1: 760 },
    padPos: { x: 5190, y: 300 },
    palette: { floor: "#4b4a2b", deep: "#2d2c18", prop: "market" },
    unlockAfter: "built-build-ship",
    reveal: 120,
  },
  {
    id: "area-7",
    label: "川の三角州へ出る",
    price: 180000000,
    rect: { x0: 6120, y0: 0, x1: 7020, y1: 760 },
    padPos: { x: 6090, y: 300 },
    palette: { floor: "#29454a", deep: "#172b2f", prop: "ship" },
    unlockAfter: "built-build-granary-2",
    reveal: 140,
  },
  {
    id: "area-8",
    label: "大治水を完成させる",
    price: 900000000,
    rect: { x0: 7020, y0: 0, x1: 7920, y1: 760 },
    padPos: { x: 6990, y: 300 },
    palette: { floor: "#4a4033", deep: "#2c251d", prop: "none" },
    unlockAfter: "built-build-delta-dock",
    reveal: 160,
  },

];

const taigaStoves: StoveSpec[] = [
  /* --- area-0 第1区画「川辺の畑」 --------------------------------------
   *
   * 川で水を汲み、種を取り、畑へ入れる。あとは育つのを待って収穫する。
   * 水くみ場は人の手が要る（そばに立つとたまる）。ここが「川へ行く理由」になる。
   */
  {
    id: "river-1",
    pos: { x: 150, y: 150 },
    price: 0,
    area: 0,
    item: "water",
    art: "river",
    label: "水くみ場",
    /*
     * 川べりに置いた水がめに、勝手に水がたまっていく。
     * ここに人を張りつかせる遊びにはしない ―― 最初に覚えるのは「運ぶ」ことで、
     * 最初に雇うのも運ぶ人。水の自動化は、第2区画の取水口と水路でやる
     */
    work: 0.45,
    hold: 6,
  },
  {
    id: "seed-1",
    pos: { x: 574, y: 150 },
    price: 0,
    area: 0,
    item: "seed",
    art: "seedhut",
    label: "種置き場",
    work: 0.9,
    hold: 6,
  },
  {
    id: "field-1",
    pos: { x: 344, y: 300 },
    price: 0,
    area: 0,
    item: "grain",
    takes: "water",
    fuel: "seed",
    art: "field",
    label: "畑",
    work: 1.2,
  },
  {
    id: "field-2",
    pos: { x: 494, y: 300 },
    price: 150,
    area: 0,
    item: "grain",
    takes: "water",
    fuel: "seed",
    art: "field",
    label: "2面目の畑",
    work: 1.2,
    reveal: 5,
  },

  /* --- area-1 第2区画「水路の村」 --------------------------------------
   *
   * 取水口は、水くみ場とちがって人が要らない。
   * そこから畑へ水路（直結の設備）を引くと、水の手運びが消えていく。
   */
  { id: "intake-1", pos: { x: 860, y: 150 }, price: 1200, area: 1, item: "water", art: "intake", label: "取水口", work: 0.5, hold: 6, reveal: 22 },
  { id: "field-3", pos: { x: 1020, y: 300 }, price: 1000, area: 1, item: "grain", takes: "water", fuel: "seed", art: "field", label: "3面目の畑", work: 1.2, reveal: 23 },
  { id: "seed-2", pos: { x: 1480, y: 150 }, price: 900, area: 1, item: "seed", art: "seedhut", label: "村の種置き場", work: 0.9, hold: 6, reveal: 24 },
  { id: "field-4", pos: { x: 1180, y: 300 }, price: 1800, area: 1, item: "grain", takes: "water", fuel: "seed", art: "field", label: "4面目の畑", work: 1.2, reveal: 25 },
  { id: "field-5", pos: { x: 1340, y: 300 }, price: 3400, area: 1, item: "grain", takes: "water", fuel: "seed", art: "field", label: "5面目の畑", work: 1.2, reveal: 33 },

  /* --- area-2 第3区画「土と火の工房」 ----------------------------------
   *
   *   粘土穴 ─(粘土)─▶ 窯 ─(土器)─▶ 土器の市
   *   森 ─(丸太)─▶ 薪割り場 ─(薪)─┬▶ 窯
   *                                 └▶ パン窯
   *   畑の穀物 ─▶ 石臼 ─(粉)─▶ パン窯 ─(パン)─▶ パンの席
   *
   * 穀物をそのまま配るより、粉にしてパンに焼いたほうがずっと高く売れる。
   */
  { id: "clay-1", pos: { x: 1700, y: 240 }, price: 3000, area: 2, item: "clay", art: "clay", label: "粘土穴", manual: true, work: 0.8, hold: 6, reveal: 43 },
  { id: "kiln-1", pos: { x: 1860, y: 240 }, price: 6000, area: 2, item: "pot", takes: "clay", fuel: "wood", art: "kiln", label: "窯", work: 1.4, reveal: 45 },
  { id: "mill-1", pos: { x: 2020, y: 240 }, price: 4000, area: 2, item: "flour", takes: "grain", art: "mill", label: "石臼", manual: true, work: 0.6, reveal: 47 },
  { id: "oven-1", pos: { x: 2180, y: 240 }, price: 8000, area: 2, item: "bread", takes: "flour", fuel: "wood", art: "oven", label: "パン窯", work: 1.0, reveal: 49 },
  { id: "forest-1", pos: { x: 2380, y: 360 }, price: 1700, area: 2, item: "log", art: "forest", label: "川辺の林", zone: { x0: 2250, y0: 90, x1: 2500, y1: 320 }, hold: 6, reveal: 41 },
  { id: "split-1", pos: { x: 2320, y: 450 }, price: 1900, area: 2, item: "wood", takes: "log", art: "split", label: "薪割り場", manual: true, work: 0.5, reveal: 42 },

  /* --- area-3 第4区画「牧草地」 ----------------------------------------
   *
   *   牧草地 ─(草)─┬▶ ヤギの囲い（水も要る）─(乳)─▶ 牧場の席
   *                 └▶ 羊の囲い（水も要る）─(毛)─▶ 毛織の市
   *
   * 家畜は草と水を食べる。水路を家畜まで引くかどうかが、この区画の判断になる。
   */
  { id: "graze-1", pos: { x: 2700, y: 380 }, price: 30000, area: 3, item: "grass", art: "pasture", label: "牧草地", manual: true, work: 0.5, hold: 8, reveal: 61 },
  { id: "goat-1", pos: { x: 2960, y: 230 }, price: 60000, area: 3, item: "milk", takes: "grass", fuel: "water", art: "pen", label: "ヤギの囲い", work: 1.2, reveal: 63 },
  { id: "sheep-1", pos: { x: 3140, y: 230 }, price: 90000, area: 3, item: "wool", takes: "grass", fuel: "water", art: "pen", label: "羊の囲い", work: 1.6, reveal: 66 },

  /* --- area-4 第5区画「大河の市場」 ------------------------------------
   *
   * 川の瀬で魚を取り、干して交易品にする。
   * 船着き場と中央市場は建築予定地。材料を運びこむと建ちあがる。
   */
  { id: "fish-1", pos: { x: 3600, y: 380 }, price: 120000, area: 4, item: "fish", art: "fish", label: "川の瀬", manual: true, hold: 6, zone: { x0: 3470, y0: 100, x1: 3760, y1: 340 }, reveal: 81 },
  { id: "dry-1", pos: { x: 3840, y: 230 }, price: 200000, area: 4, item: "dried", takes: "fish", fuel: "wood", art: "smoke", label: "干し場", work: 1.2, reveal: 83 },
  {
    id: "build-dock", pos: { x: 3560, y: 620 }, price: 90000, area: 4,
    art: "raft", label: "船着き場", needs: { log: 8, wood: 6 },
    gives: { note: "船着き場ができた。川から荷が上がるようになった" }, reveal: 84,
  },
  {
    id: "build-market", pos: { x: 3900, y: 620 }, price: 260000, area: 4,
    art: "hall", label: "中央市場", needs: { clay: 10, pot: 6 },
    gives: { note: "中央市場が開いた。よその集落の船が寄りはじめる" },
    unlockAfter: "built-build-dock", reveal: 89,
  },

  /* --- area-5 第6区画「川の町」 ----------------------------------------
   *
   * 生産はもう回っている。ここは「運びこんで建てる」区画。
   * 大型交易船が建つと、さらに下流の大穀倉地帯へ進める。
   */
  // 町の材木。ここが無いと、最後の建築が遠くの林からの丸太待ちになる
  { id: "forest-2", pos: { x: 5100, y: 330 }, price: 300000, area: 5, item: "log", art: "forest", label: "町はずれの林", zone: { x0: 4960, y0: 90, x1: 5200, y1: 300 }, hold: 6, reveal: 100.6 },
  { id: "split-2", pos: { x: 5040, y: 420 }, price: 340000, area: 5, item: "wood", takes: "log", art: "split", label: "町の薪割り場", manual: true, work: 0.5, reveal: 100.8 },
  {
    id: "build-granary", pos: { x: 4420, y: 600 }, price: 400000, area: 5,
    art: "bighut", label: "大型穀物庫", needs: { wood: 10, clay: 12 },
    gives: { note: "大型穀物庫が建った。町の蓄えができた" }, reveal: 101,
  },
  {
    id: "build-well", pos: { x: 4620, y: 600 }, price: 600000, area: 5,
    art: "well", label: "公共井戸", needs: { clay: 8, pot: 6 },
    gives: { note: "公共井戸ができた。町のどこでも水が汲める" },
    unlockAfter: "built-build-granary", reveal: 103,
  },
  {
    id: "build-temple", pos: { x: 4840, y: 600 }, price: 1400000, area: 5,
    art: "hall", label: "記念塔", needs: { pot: 12, clay: 14 },
    gives: { note: "記念塔が立った。遠くの集落からも町が見える" },
    unlockAfter: "built-build-well", reveal: 106,
  },
  {
    id: "build-ship", pos: { x: 5060, y: 600 }, price: 2600000, area: 5,
    art: "bigraft", label: "大型交易船", needs: { log: 14, wood: 12, pot: 10 },
    // ここから先も同じ農耕時代を深掘りする。時代が変わるのは次ステージ
    gives: { note: "大型交易船ができた。下流の大穀倉地帯へ人と荷を運べるようになった" },
    // 記念塔まで建てたら大型交易船へ。人口80人は達成目標として残すが進行は止めない
    unlockAfter: "built-build-temple", reveal: 110,
  },
  /* --- area-6 第7区画「大穀倉地帯」 --- */
  { id: "intake-2", pos: { x: 5360, y: 150 }, price: 6000000, area: 6, item: "water", art: "intake", label: "大取水口", work: 0.45, hold: 12, reveal: 121 },
  { id: "seed-3", pos: { x: 6040, y: 150 }, price: 5000000, area: 6, item: "seed", art: "seedhut", label: "共同種倉", work: 0.75, hold: 12, reveal: 121.5 },
  { id: "field-6", pos: { x: 5520, y: 300 }, price: 8000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "6面目の畑", work: 1.15, reveal: 122 },
  { id: "field-7", pos: { x: 5700, y: 300 }, price: 12000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "7面目の畑", work: 1.15, reveal: 124 },
  { id: "field-8", pos: { x: 5880, y: 300 }, price: 18000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "8面目の畑", work: 1.1, reveal: 126 },
  {
    id: "build-granary-2", pos: { x: 5920, y: 620 }, price: 24000000, area: 6,
    art: "bighut", label: "共同大穀倉", needs: { wood: 18, clay: 16, pot: 8, grain: 20 },
    gives: { note: "共同大穀倉が完成した。収穫期の余りを町じゅうで蓄えられる" },
    reveal: 130,
  },

  /* --- area-7 第8区画「川の三角州」 --- */
  { id: "fish-2", pos: { x: 6260, y: 360 }, price: 40000000, area: 7, item: "fish", art: "fish", label: "三角州の漁場", manual: true, hold: 10, zone: { x0: 6160, y0: 90, x1: 6460, y1: 320 }, reveal: 141 },
  { id: "dry-2", pos: { x: 6460, y: 230 }, price: 52000000, area: 7, item: "dried", takes: "fish", fuel: "wood", art: "smoke", label: "三角州の干し場", work: 1.0, reveal: 143 },
  { id: "intake-3", pos: { x: 6660, y: 150 }, price: 36000000, area: 7, item: "water", art: "intake", label: "分流水門", work: 0.42, hold: 12, reveal: 142 },
  { id: "field-9", pos: { x: 6740, y: 320 }, price: 48000000, area: 7, item: "grain", takes: "water", fuel: "seed", art: "field", label: "三角州の畑", work: 1.1, reveal: 144 },
  { id: "field-10", pos: { x: 6920, y: 320 }, price: 72000000, area: 7, item: "grain", takes: "water", fuel: "seed", art: "field", label: "河口の畑", work: 1.05, reveal: 146 },
  {
    id: "build-delta-hall", pos: { x: 6500, y: 620 }, price: 90000000, area: 7,
    art: "hall", label: "三角州の交易小屋", needs: { wood: 16, pot: 10, wool: 8 },
    gives: { note: "三角州の交易小屋ができた。農民と漁師が同じ市場を使いはじめる" },
    reveal: 149,
  },
  {
    id: "build-delta-dock", pos: { x: 6780, y: 620 }, price: 140000000, area: 7,
    art: "raft", label: "分流の船着き場", needs: { log: 18, wood: 12, clay: 12 },
    gives: { dock: true, note: "分流の船着き場が完成した。治水工事の場所まで船で資材を運べる" },
    unlockAfter: "built-build-delta-hall", reveal: 153,
  },

  /* --- area-8 第9区画「大治水」 --- */
  { id: "clay-2", pos: { x: 7160, y: 240 }, price: 130000000, area: 8, item: "clay", art: "clay", label: "堤防の粘土場", manual: true, work: 0.7, hold: 12, reveal: 161 },
  { id: "forest-3", pos: { x: 7800, y: 330 }, price: 150000000, area: 8, item: "log", art: "forest", label: "治水の森", zone: { x0: 7620, y0: 90, x1: 7900, y1: 300 }, hold: 10, reveal: 161.5 },
  { id: "split-3", pos: { x: 7700, y: 430 }, price: 170000000, area: 8, item: "wood", takes: "log", art: "split", label: "工事の薪割り場", manual: true, work: 0.45, reveal: 162 },
  {
    id: "build-reservoir", pos: { x: 7280, y: 610 }, price: 260000000, area: 8,
    art: "well", label: "大貯水池", needs: { clay: 24, pot: 14, log: 12 },
    gives: { note: "大貯水池ができた。乾季でも川の水をためておける" }, reveal: 165,
  },
  {
    id: "build-great-levee", pos: { x: 7520, y: 610 }, price: 420000000, area: 8,
    art: "bighut", label: "大堤防", needs: { clay: 36, log: 20, wood: 18 },
    gives: { note: "大堤防がつながった。増水しても人と荷が止まりにくくなった" },
    unlockAfter: "built-build-reservoir", reveal: 169,
  },
  {
    id: "build-great-weir", pos: { x: 7780, y: 610 }, price: 760000000, area: 8,
    art: "hall", label: "大河の水門", needs: { log: 32, wood: 24, clay: 28, pot: 16 },
    gives: { sail: true, note: "大河の水門が完成した。農耕と水運の文明がひとつの流れにつながった" },
    unlockAfter: "built-build-great-levee", reveal: 175,
  },

];

const taigaSeats: SeatSpec[] = [
  // 第1区画: 川辺の食事場。穀物を渡すと粒が落ちる
  ...benchRow(0, 424, "grain", 1, "川辺の食事場", [
    { x: 120, price: 0 },
    { x: 248, price: 76, reveal: 4 },
    { x: 376, price: 90, unlockAfter: "seat-0-2", reveal: 7 },
  ]),
  // 第2区画: 水路の村の食事場
  ...benchRow(1, 420, "grain", 1.6, "村の食事場", [
    { x: 790, price: 1400, reveal: 27 },
    { x: 910, price: 3400, reveal: 34 },
    { x: 1030, price: 8000, reveal: 37 },
  ]),
  // 第3区画: 焼きたてのパンと、土器の市
  ...benchRow(2, 420, "bread", 3.4, "パンの席", [
    { x: 1760, price: 24000, reveal: 51 },
    { x: 1900, price: 52000, reveal: 54 },
  ]),
  ...benchRow(2, 420, "pot", 4.2, "土器の市", [
    { x: 2100, price: 60000, reveal: 56 },
    { x: 2240, price: 110000, reveal: 58 },
  ], "t"),
  // 第4区画: 乳と毛織
  ...benchRow(3, 400, "milk", 6, "牧場の席", [
    { x: 2620, price: 150000, reveal: 68 },
    { x: 2760, price: 280000, reveal: 70 },
  ]),
  ...benchRow(3, 400, "wool", 8, "毛織の市", [
    { x: 3240, price: 420000, reveal: 72 },
    { x: 3380, price: 700000, reveal: 74 },
  ], "t"),
  // 第5区画: 干し魚の市と、よその集落との交易
  ...benchRow(4, 400, "dried", 14, "川の市", [
    { x: 3980, price: 900000, reveal: 86 },
    { x: 4120, price: 1500000, reveal: 88 },
  ]),
  ...benchRow(4, 400, "pot", 18, "交易の席", [
    { x: 4200, price: 2600000, unlockAfter: "built-build-market", reveal: 91 },
    { x: 4300, price: 4200000, reveal: 93 },
  ], "t"),
  // 第6区画: 町の食卓
  ...benchRow(5, 400, "bread", 26, "町の食卓", [
    { x: 4420, price: 5000000, reveal: 102 },
    { x: 4560, price: 9000000, reveal: 104 },
  ]),
  ...benchRow(5, 400, "wool", 34, "港の市", [
    { x: 4980, price: 15000000, reveal: 107 },
    { x: 5120, price: 26000000, reveal: 109 },
  ], "t"),
  // 第7区画: 収穫期の大量流通
  ...benchRow(6, 400, "grain", 48, "大穀倉の市", [
    { x: 5360, price: 36000000, reveal: 123 },
    { x: 5500, price: 62000000, reveal: 127 },
  ]),
  ...benchRow(6, 400, "bread", 58, "収穫祭の食事場", [
    { x: 5860, price: 90000000, reveal: 128 },
    { x: 6000, price: 140000000, reveal: 132 },
  ], "t"),
  // 第8区画: 漁と農業が同じ三角州で動く
  ...benchRow(7, 400, "dried", 74, "三角州の魚市", [
    { x: 6280, price: 220000000, reveal: 145 },
    { x: 6420, price: 320000000, reveal: 148 },
  ]),
  ...benchRow(7, 400, "grain", 82, "河口の穀物市", [
    { x: 6800, price: 360000000, reveal: 150 },
    { x: 6940, price: 480000000, reveal: 154 },
  ], "t"),
  // 第9区画: 大工事を支える食事と器
  ...benchRow(8, 400, "bread", 96, "治水工事の食事場", [
    { x: 7160, price: 650000000, reveal: 164 },
    { x: 7300, price: 820000000, reveal: 167 },
  ]),
  ...benchRow(8, 400, "pot", 110, "工事の器市", [
    { x: 7680, price: 980000000, reveal: 171 },
    { x: 7840, price: 1200000000, reveal: 173 },
  ], "t"),

];

/**
 * 雇う順。
 * 5食ぶんを自分の手でやりきってから、水 → 種 → 畑 → 運び …と
 * 「いま覚えた仕事の次の改善」だけを出していく。
 */
const taigaHires: HireSpec[] = [
  /* --- area-0 --- */
  /*
   * 最初に見えている枠は「水がめ・農民・はこび手・2席目・2面目の畑」の5つ。
   * どれも遊びはじめから見えていて、いちばん安いものは3回ぶん運べば買える。
   * 何のために稼ぐのかが、最初の1分で分かるようにするため
   */
  { id: "farmer-1", kind: "cook", pos: { x: 344, y: 366 }, price: 48, label: "農民", stoveId: "field-1", area: 0, reveal: 2 },
  { id: "waiter-1", kind: "waiter", pos: { x: 176, y: 366 }, price: 64, label: "はこび手", area: 0, reveal: 3 },
  { id: "waiter-2", kind: "waiter", pos: { x: 246, y: 366 }, price: 96, label: "はこび手", area: 0, unlockAfter: "seat-0-2", reveal: 6 },
  { id: "farmer-2", kind: "cook", pos: { x: 494, y: 366 }, price: 240, label: "農民", stoveId: "field-2", area: 0, unlockAfter: "field-2", reveal: 8 },
  { id: "collector-1", kind: "collector", pos: { x: 620, y: 366 }, price: 140, label: "拾い手", area: 0, reveal: 9 },
  { id: "robot-1", kind: "robot", pos: { x: 620, y: 430 }, price: 320, label: "荷車", area: 0, unlockAfter: "collector-1", reveal: 11 },

  /* --- area-1 水路の村 --- */
  { id: "gateman-1", kind: "cook", pos: { x: 790, y: 210 }, price: 2800, label: "水門番", stoveId: "intake-1", area: 1, reveal: 26.5 },
  { id: "farmer-3", kind: "cook", pos: { x: 1020, y: 366 }, price: 2000, label: "農民", stoveId: "field-3", area: 1, reveal: 23.5 },
  { id: "sower-2", kind: "cook", pos: { x: 1420, y: 210 }, price: 1800, label: "種まき", stoveId: "seed-2", area: 1, reveal: 24.5 },
  { id: "farmer-4", kind: "cook", pos: { x: 1180, y: 366 }, price: 2400, label: "農民", stoveId: "field-4", area: 1, reveal: 25.5 },
  { id: "waiter-3", kind: "waiter", pos: { x: 800, y: 560 }, price: 3200, label: "はこび手", area: 1, reveal: 29 },
  { id: "farmer-5", kind: "cook", pos: { x: 1340, y: 366 }, price: 3000, label: "農民", stoveId: "field-5", area: 1, reveal: 33.5 },
  { id: "robot-2", kind: "robot", pos: { x: 870, y: 560 }, price: 26000, label: "荷車", area: 1, reveal: 39 },

  /* --- area-2 土と火の工房 --- */
  { id: "logger-1", kind: "logger", pos: { x: 2440, y: 420 }, price: 12000, label: "木こり", stoveId: "forest-1", area: 2, reveal: 41.5 },
  { id: "splitter-1", kind: "splitter", pos: { x: 2390, y: 480 }, price: 14000, label: "薪割り", stoveId: "split-1", area: 2, reveal: 42.5 },
  { id: "digger-1", kind: "splitter", pos: { x: 1700, y: 320 }, price: 16000, label: "粘土掘り", stoveId: "clay-1", area: 2, reveal: 43.5 },
  { id: "potter-1", kind: "cook", pos: { x: 1860, y: 320 }, price: 20000, label: "陶工", stoveId: "kiln-1", area: 2, reveal: 45.5 },
  { id: "miller-1", kind: "splitter", pos: { x: 2020, y: 320 }, price: 18000, label: "製粉係", stoveId: "mill-1", area: 2, reveal: 47.5 },
  { id: "baker-1", kind: "cook", pos: { x: 2180, y: 320 }, price: 24000, label: "パン職人", stoveId: "oven-1", area: 2, reveal: 49.5 },
  { id: "waiter-4", kind: "waiter", pos: { x: 1700, y: 580 }, price: 24000, label: "はこび手", area: 2, reveal: 52 },
  { id: "robot-3", kind: "robot", pos: { x: 1780, y: 580 }, price: 60000, label: "荷車", area: 2, reveal: 57 },

  /* --- area-3 牧草地 --- */
  { id: "mower-1", kind: "splitter", pos: { x: 2700, y: 450 }, price: 40000, label: "草刈り", stoveId: "graze-1", area: 3, reveal: 61.5 },
  { id: "herder-1", kind: "cook", pos: { x: 2960, y: 320 }, price: 70000, label: "牧畜係", stoveId: "goat-1", area: 3, reveal: 63.5 },
  { id: "shearer-1", kind: "cook", pos: { x: 3140, y: 320 }, price: 110000, label: "毛刈り係", stoveId: "sheep-1", area: 3, reveal: 66.5 },
  { id: "waiter-5", kind: "waiter", pos: { x: 2600, y: 580 }, price: 90000, label: "はこび手", area: 3, reveal: 69 },
  { id: "robot-4", kind: "robot", pos: { x: 2680, y: 580 }, price: 220000, label: "荷車", area: 3, reveal: 73 },

  /* --- area-4 大河の市場 --- */
  { id: "fisher-1", kind: "splitter", pos: { x: 3600, y: 450 }, price: 150000, label: "漁師", stoveId: "fish-1", area: 4, reveal: 81.5 },
  { id: "drier-1", kind: "cook", pos: { x: 3840, y: 320 }, price: 200000, label: "干し場番", stoveId: "dry-1", area: 4, reveal: 83.5 },
  { id: "builder-1", kind: "builder", pos: { x: 3480, y: 540 }, price: 260000, label: "建築係", area: 4, reveal: 84.5 },
  { id: "waiter-6", kind: "waiter", pos: { x: 3500, y: 580 }, price: 300000, label: "はこび手", area: 4, reveal: 87 },
  { id: "trader-1", kind: "master", pos: { x: 4020, y: 480 }, price: 900000, label: "商人", area: 4, unlockAfter: "built-build-market", reveal: 90 },
  // 川の物流。船着き場ができてはじめて、船が出せる
  { id: "boat-1", kind: "boat", pos: { x: 3620, y: 540 }, price: 700000, label: "運搬船", area: 4, unlockAfter: "built-build-dock", reveal: 91.5 },
  { id: "robot-5", kind: "robot", pos: { x: 3580, y: 580 }, price: 500000, label: "荷車", area: 4, reveal: 92 },

  /* --- area-5 川の町 --- */
  { id: "builder-2", kind: "builder", pos: { x: 4380, y: 520 }, price: 1200000, label: "建築係", area: 5, reveal: 100.5 },
  { id: "logger-2", kind: "logger", pos: { x: 5160, y: 380 }, price: 400000, label: "木こり", stoveId: "forest-2", area: 5, reveal: 100.7 },
  { id: "splitter-2", kind: "splitter", pos: { x: 4980, y: 470 }, price: 440000, label: "薪割り", stoveId: "split-2", area: 5, reveal: 100.9 },
  { id: "waiter-7", kind: "waiter", pos: { x: 4700, y: 580 }, price: 1500000, label: "はこび手", area: 5, reveal: 105 },
  { id: "robot-6", kind: "robot", pos: { x: 4780, y: 580 }, price: 2400000, label: "荷車", area: 5, reveal: 108 },
  { id: "boat-2", kind: "boat", pos: { x: 4620, y: 420 }, price: 2200000, label: "交易船", area: 5, reveal: 106.5 },
  { id: "elder-1", kind: "master", pos: { x: 4880, y: 480 }, price: 6000000, label: "町長", area: 5, unlockAfter: "built-build-temple", reveal: 111 },
  /* --- area-6 大穀倉地帯 --- */
  { id: "gateman-2", kind: "cook", pos: { x: 5360, y: 215 }, price: 9000000, label: "大取水口番", stoveId: "intake-2", area: 6, reveal: 121.2 },
  { id: "sower-3", kind: "cook", pos: { x: 6040, y: 215 }, price: 8000000, label: "種倉番", stoveId: "seed-3", area: 6, reveal: 121.7 },
  { id: "farmer-6", kind: "cook", pos: { x: 5520, y: 366 }, price: 12000000, label: "農民", stoveId: "field-6", area: 6, reveal: 122.5 },
  { id: "farmer-7", kind: "cook", pos: { x: 5700, y: 366 }, price: 16000000, label: "農民", stoveId: "field-7", area: 6, reveal: 124.5 },
  { id: "farmer-8", kind: "cook", pos: { x: 5880, y: 366 }, price: 22000000, label: "農民", stoveId: "field-8", area: 6, reveal: 126.5 },
  { id: "builder-3", kind: "builder", pos: { x: 5920, y: 540 }, price: 26000000, label: "穀倉の建築係", area: 6, reveal: 129 },
  { id: "waiter-8", kind: "waiter", pos: { x: 5600, y: 570 }, price: 28000000, label: "収穫のはこび手", area: 6, reveal: 125 },
  { id: "robot-7", kind: "robot", pos: { x: 5680, y: 570 }, price: 52000000, label: "収穫荷車", area: 6, reveal: 131 },
  /* --- area-7 川の三角州 --- */
  { id: "fisher-2", kind: "splitter", pos: { x: 6260, y: 440 }, price: 48000000, label: "三角州の漁師", stoveId: "fish-2", area: 7, reveal: 141.5 },
  { id: "drier-2", kind: "cook", pos: { x: 6460, y: 315 }, price: 60000000, label: "干し場番", stoveId: "dry-2", area: 7, reveal: 143.5 },
  { id: "gateman-3", kind: "cook", pos: { x: 6660, y: 215 }, price: 50000000, label: "分流水門番", stoveId: "intake-3", area: 7, reveal: 142.5 },
  { id: "farmer-9", kind: "cook", pos: { x: 6740, y: 386 }, price: 68000000, label: "三角州の農民", stoveId: "field-9", area: 7, reveal: 144.5 },
  { id: "farmer-10", kind: "cook", pos: { x: 6920, y: 386 }, price: 90000000, label: "河口の農民", stoveId: "field-10", area: 7, reveal: 146.5 },
  { id: "builder-4", kind: "builder", pos: { x: 6540, y: 540 }, price: 110000000, label: "三角州の建築係", area: 7, reveal: 149.5 },
  { id: "waiter-9", kind: "waiter", pos: { x: 6640, y: 570 }, price: 120000000, label: "分流のはこび手", area: 7, reveal: 147 },
  { id: "boat-3", kind: "boat", pos: { x: 6840, y: 520 }, price: 180000000, label: "三角州の運搬船", area: 7, unlockAfter: "built-build-delta-dock", reveal: 154.5 },
  /* --- area-8 大治水 --- */
  { id: "digger-2", kind: "splitter", pos: { x: 7160, y: 320 }, price: 150000000, label: "堤防の土掘り", stoveId: "clay-2", area: 8, reveal: 161.2 },
  { id: "logger-3", kind: "logger", pos: { x: 7840, y: 390 }, price: 170000000, label: "治水の木こり", stoveId: "forest-3", area: 8, reveal: 161.7 },
  { id: "splitter-3", kind: "splitter", pos: { x: 7700, y: 490 }, price: 190000000, label: "工事の薪割り", stoveId: "split-3", area: 8, reveal: 162.5 },
  { id: "builder-5", kind: "builder", pos: { x: 7360, y: 540 }, price: 220000000, label: "治水の建築係", area: 8, reveal: 163 },
  { id: "builder-6", kind: "builder", pos: { x: 7440, y: 540 }, price: 360000000, label: "治水の建築係", area: 8, unlockAfter: "built-build-reservoir", reveal: 166 },
  { id: "waiter-10", kind: "waiter", pos: { x: 7560, y: 540 }, price: 260000000, label: "工事のはこび手", area: 8, reveal: 163.5 },
  { id: "robot-8", kind: "robot", pos: { x: 7640, y: 540 }, price: 480000000, label: "工事の荷車", area: 8, reveal: 168 },

];

const taigaEquipment: EquipSpec[] = [
  /* --- 第1区画: 手運びを減らす --- */
  { id: "canal-0", name: "はじまりの用水路", detail: "川の水を、畑へ直接おくる", pos: { x: 232, y: 226 }, price: 6000, area: 0, link: { from: "river-1", to: "field-1" }, unlockAfter: "robot-1", reveal: 12 },
  { id: "seedway-0", name: "種の道", detail: "種を、畑へ直接おくる", pos: { x: 456, y: 226 }, price: 9000, area: 0, link: { from: "seed-1", to: "field-1" }, unlockAfter: "equip-canal-0", reveal: 13 },
  { id: "noodle", name: "石の農具", detail: "すべての作業場が +30%速くなる", pos: { x: 660, y: 300 }, price: 24000, area: 0, unlockAfter: "equip-seedway-0", reveal: 15 },
  { id: "fridge", name: "編みかごの棚", detail: "受け口・出し口に積める数 +4", pos: { x: 660, y: 220 }, price: 45000, area: 0, unlockAfter: "equip-noodle", reveal: 16 },
  { id: "ticket", name: "粒の壺", detail: "粒が自動でサイフに入る・拾い手は運びへ", pos: { x: 250, y: 0 }, price: 30000, area: 0, outside: true, unlockAfter: "equip-noodle", reveal: 17 },
  { id: "flag", name: "川辺ののろし", detail: "遠くの人を呼ぶ。集まりが 1.25倍", pos: { x: 120, y: 0 }, price: 1200, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "collector-1", reveal: 18 },
  { id: "sign", name: "物見やぐら", detail: "人が 1.5倍のはやさで来る", pos: { x: 380, y: 0 }, price: 60000, area: 0, outside: true, unlockAfter: "equip-ticket", reveal: 19 },

  /* --- 第2区画: 水路をのばす。ここがこのステージの本題 --- */
  { id: "canal-1", name: "主水路", detail: "取水口の水を、3面目の畑へ流す", pos: { x: 940, y: 220 }, price: 3000, area: 1, link: { from: "intake-1", to: "field-3" }, priority: "gate-up", unlockAfter: "field-3", reveal: 26 },
  { id: "pond-1", name: "貯水池", detail: "取水口にためられる水 +6", pos: { x: 800, y: 230 }, price: 2400, area: 1, capacity: { stove: "intake-1", plus: 6 }, unlockAfter: "intake-1", reveal: 28 },
  { id: "canal-2", name: "分岐水路", detail: "取水口の水を、4面目の畑へも流す", pos: { x: 1100, y: 220 }, price: 6000, area: 1, link: { from: "intake-1", to: "field-4" }, unlockAfter: "equip-canal-1", reveal: 30 },
  { id: "seedway-1", name: "村の種の道", detail: "種を、3面目の畑へ直接おくる", pos: { x: 1400, y: 300 }, price: 4000, area: 1, link: { from: "seed-2", to: "field-3" }, unlockAfter: "seed-2", reveal: 31 },
  { id: "canal-3", name: "下流の水路", detail: "取水口の水を、5面目の畑へも流す", pos: { x: 1260, y: 220 }, price: 12000, area: 1, link: { from: "intake-1", to: "field-5" }, priority: "gate-down", unlockAfter: "equip-canal-2", reveal: 36 },
  { id: "lantern", name: "たいこ", detail: "音で人を集める。集まりが 1.4倍", pos: { x: 470, y: 0 }, price: 90000, area: 0, outside: true, row: 1, draw: 1.4, unlockAfter: "area-1", reveal: 36.5 },
  { id: "canal-home", name: "川辺への水路", detail: "取水口の水を、はじまりの畑へも流す", pos: { x: 740, y: 220 }, price: 17000, area: 1, link: { from: "intake-1", to: "field-2" }, unlockAfter: "equip-canal-3", reveal: 38 },
  /*
   * 水門と、増水への備え（仕様書 §3.5 / §6.4）。
   * 取水口の水はみんなで分け合うので、水門を据えた水路が先に飲む。
   * 土手は雨季の増水から畑を守り、排水路は水が引くのを早める
   */
  { id: "gate-up", name: "上流の水門", detail: "3面目の畑へ、水を先に流す", pos: { x: 1020, y: 220 }, price: 9000, area: 1, unlockAfter: "equip-canal-1", reveal: 30.5 },
  { id: "levee", name: "土手", detail: "川があふれても、畑と足もとを守る", pos: { x: 880, y: 380 }, price: 14000, area: 1, unlockAfter: "area-1", reveal: 32 },
  { id: "drain", name: "排水路", detail: "あふれた水が、はやく引く", pos: { x: 1480, y: 380 }, price: 26000, area: 1, unlockAfter: "equip-levee", reveal: 35 },
  { id: "gate-down", name: "下流の水門", detail: "5面目の畑へ、水を先に流す", pos: { x: 1340, y: 220 }, price: 30000, area: 1, unlockAfter: "equip-canal-3", reveal: 37.5 },

  /* --- 第3区画: 工房をつなぐ --- */
  { id: "chute-log", name: "丸太ころがし", detail: "丸太を、薪割り場へ直接おくる", pos: { x: 2400, y: 480 }, price: 9000, area: 2, link: { from: "forest-1", to: "split-1" }, unlockAfter: "splitter-1", reveal: 44 },
  { id: "chute-clay", name: "粘土のとい", detail: "粘土を、窯へ直接おくる", pos: { x: 1780, y: 320 }, price: 20000, area: 2, link: { from: "clay-1", to: "kiln-1" }, unlockAfter: "potter-1", reveal: 46 },
  { id: "chute-wood", name: "薪のとい", detail: "薪を、パン窯へ直接おくる", pos: { x: 2260, y: 400 }, price: 14000, area: 2, link: { from: "split-1", to: "oven-1" }, unlockAfter: "baker-1", reveal: 48 },
  { id: "chute-flour", name: "粉のとい", detail: "粉を、パン窯へ直接おくる", pos: { x: 2100, y: 320 }, price: 30000, area: 2, link: { from: "mill-1", to: "oven-1" }, unlockAfter: "equip-chute-wood", reveal: 50 },
  { id: "kiln-rack", name: "土器の乾燥棚", detail: "窯に積める数 +4", pos: { x: 1940, y: 320 }, price: 40000, area: 2, capacity: { stove: "kiln-1", plus: 4 }, unlockAfter: "equip-chute-clay", reveal: 53 },
  { id: "queue", name: "かがり火", detail: "夜通し明るい。集まりが 1.6倍", pos: { x: 590, y: 0 }, price: 240000, area: 0, outside: true, row: 1, draw: 1.6, unlockAfter: "area-2", reveal: 59 },

  /* --- 第4区画: 家畜へ水を引く --- */
  { id: "canal-pen", name: "家畜用水路", detail: "取水口の水を、ヤギの囲いへ流す", pos: { x: 2860, y: 300 }, price: 120000, area: 3, link: { from: "intake-1", to: "goat-1" }, unlockAfter: "goat-1", reveal: 64 },
  { id: "canal-pen2", name: "羊への水路", detail: "取水口の水を、羊の囲いへ流す", pos: { x: 3240, y: 300 }, price: 200000, area: 3, link: { from: "intake-1", to: "sheep-1" }, unlockAfter: "sheep-1", reveal: 67 },
  { id: "grass-way", name: "草の運び道", detail: "草を、ヤギの囲いへ直接おくる", pos: { x: 2800, y: 380 }, price: 260000, area: 3, link: { from: "graze-1", to: "goat-1" }, unlockAfter: "equip-canal-pen", reveal: 71 },
  { id: "lookout", name: "見張り小屋", detail: "遠くの人まで見える。集まりが 1.5倍", pos: { x: 3340, y: 420 }, price: 400000, area: 3, draw: 1.5, reveal: 75 },

  /* --- 第5区画: 川と市場 --- */
  { id: "net-1", name: "網", detail: "川の瀬でとれる魚が増える", pos: { x: 3480, y: 420 }, price: 300000, area: 4, capacity: { stove: "fish-1", plus: 6 }, unlockAfter: "fisher-1", reveal: 85 },
  { id: "road-1", name: "市場の道", detail: "市場じゅうの足が速くなる", pos: { x: 3900, y: 460 }, price: 600000, area: 4, road: { from: { x: 3460, y: 460 }, to: { x: 4300, y: 460 } }, reveal: 94 },

  /* --- 第6区画: 町の道 --- */
  { id: "road-2", name: "町の道", detail: "町と市場がつながる。さらに足が速くなる", pos: { x: 4400, y: 460 }, price: 2000000, area: 5, road: { from: { x: 4300, y: 460 }, to: { x: 5160, y: 460 } }, unlockAfter: "equip-road-1", reveal: 101.5 },
  /* --- 第7区画: 大穀倉地帯 --- */
  { id: "canal-4", name: "大穀倉の主水路", detail: "大取水口の水を、6面目の畑へ流す", pos: { x: 5480, y: 220 }, price: 12000000, area: 6, link: { from: "intake-2", to: "field-6" }, unlockAfter: "field-6", reveal: 123.5 },
  { id: "canal-5", name: "大穀倉の分岐水路", detail: "大取水口の水を、7面目の畑へ流す", pos: { x: 5660, y: 220 }, price: 20000000, area: 6, link: { from: "intake-2", to: "field-7" }, unlockAfter: "equip-canal-4", reveal: 125.5 },
  { id: "canal-6", name: "末端水路", detail: "大取水口の水を、8面目の畑へ流す", pos: { x: 5840, y: 220 }, price: 32000000, area: 6, link: { from: "intake-2", to: "field-8" }, unlockAfter: "equip-canal-5", reveal: 127.5 },
  { id: "seedway-2", name: "共同種の道", detail: "共同種倉から、6面目の畑へ種を送る", pos: { x: 6000, y: 260 }, price: 26000000, area: 6, link: { from: "seed-3", to: "field-6" }, unlockAfter: "sower-3", reveal: 128.5 },
  { id: "harvest-road", name: "収穫の道", detail: "大穀倉地帯を横断する道。収穫の運びが速くなる", pos: { x: 5660, y: 470 }, price: 48000000, area: 6, road: { from: { x: 5260, y: 470 }, to: { x: 6080, y: 470 } }, reveal: 133 },
  /* --- 第8区画: 三角州 --- */
  { id: "canal-delta-1", name: "三角州の水路", detail: "分流水門の水を、三角州の畑へ流す", pos: { x: 6740, y: 230 }, price: 70000000, area: 7, link: { from: "intake-3", to: "field-9" }, unlockAfter: "field-9", reveal: 145.5 },
  { id: "canal-delta-2", name: "河口の水路", detail: "分流水門の水を、河口の畑へ流す", pos: { x: 6900, y: 230 }, price: 110000000, area: 7, link: { from: "intake-3", to: "field-10" }, unlockAfter: "equip-canal-delta-1", reveal: 147.5 },
  { id: "net-2", name: "三角州の大網", detail: "三角州の漁場に積める魚 +8", pos: { x: 6240, y: 470 }, price: 90000000, area: 7, capacity: { stove: "fish-2", plus: 8 }, unlockAfter: "fisher-2", reveal: 148.5 },
  { id: "delta-road", name: "堤上の道", detail: "分流の岸をつなぎ、農と漁の行き来を速くする", pos: { x: 6600, y: 470 }, price: 160000000, area: 7, road: { from: { x: 6160, y: 470 }, to: { x: 6980, y: 470 } }, reveal: 151 },
  /* --- 第9区画: 大治水 --- */
  { id: "clay-plus-2", name: "土運び場", detail: "堤防の粘土場に積める数 +10", pos: { x: 7200, y: 360 }, price: 220000000, area: 8, capacity: { stove: "clay-2", plus: 10 }, unlockAfter: "digger-2", reveal: 164.5 },
  { id: "works-road", name: "治水工事の道", detail: "粘土場・森・工事現場を一直線につなぐ", pos: { x: 7500, y: 470 }, price: 320000000, area: 8, road: { from: { x: 7060, y: 470 }, to: { x: 7880, y: 470 } }, reveal: 166.5 },
  { id: "intake-cap-3", name: "分流水門の貯水壺", detail: "分流水門にためられる水 +10", pos: { x: 6700, y: 90 }, price: 240000000, area: 7, capacity: { stove: "intake-3", plus: 10 }, unlockAfter: "built-build-reservoir", reveal: 170 },

];

const taigaUpgrades: Upgrade[] = [
  // 水がめは、遊びはじめの「いちばん近い目標」。3回ぶん運べば買える
  { id: "carry", name: "水がめ", detail: (n) => `${3 + n}こまで持てる・はこび手も 品種ごとに ${3 + Math.floor(n / 2)}こ`, pos: { x: 60, y: 340 }, basePrice: 24, growth: 1.7, max: 9, reveal: 1 },
  { id: "cook", name: "石の鍬", detail: (n) => `作る速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 60, y: 400 }, basePrice: 150, growth: 1.7, max: 14, unlockAfter: "farmer-1", reveal: 7.5 },
  { id: "speed", name: "わらじ", detail: (n) => `足の速さ +${n * 10}%・みんなも +${n * 5}%`, pos: { x: 60, y: 460 }, basePrice: 110, growth: 1.65, max: 12, unlockAfter: "collector-1", reveal: 10 },
  { id: "price", name: "実りの選別", detail: (n) => `ひとつ ${Math.round(8 * Math.pow(1.4, n))}粒`, pos: { x: 60, y: 520 }, basePrice: 600, growth: 1.75, max: 20, unlockAfter: "robot-1", reveal: 11.5 },
];

/* ==================== 文字のはじまり ==================== */

/*
 * 6区画。川 → 農地 → 倉庫街 → 粘土板工房 → 書記学校 → 商人の広場 →
 * 記録の館 → 行政地区 → 法の広場、と川下へ向かって街が伸びる。
 *
 * 一本道にしないため、区画ごとに縦の使いかたを変える（仕様書 §7）。
 *   後景 y<130   川・神殿・住宅・船
 *   プレイ層     y150〜520（作業場と広場）
 *   前景 y>560   葦・壺・荷・柱（描画側の drawProps）
 * 高低差は川岸→堤防→市街地→行政の高台の順で、区画が進むほど手前が高くなる。
 */
const mojiAreas: AreaSpec[] = [
  {
    id: "area-0",
    label: "あふれる倉",
    price: 0,
    rect: { x0: 0, y0: 0, x1: 760, y1: 560 },
    padPos: { x: 0, y: 0 },
    palette: { floor: "#4a4030", deep: "#2b251b", prop: "none" },
  },
  {
    id: "area-1",
    label: "粘土板の工房をひらく",
    price: 1800,
    rect: { x0: 760, y0: 0, x1: 1660, y1: 800 },
    padPos: { x: 730, y: 300 },
    palette: { floor: "#54432f", deep: "#31261a", prop: "none" },
    // 数え場が回りだして、札だけでは足りなくなったころ
    unlockAfter: "mark-records-30",
    reveal: 20,
  },
  {
    id: "area-2",
    label: "書記の学校をひらく",
    price: 24000,
    rect: { x0: 1660, y0: 0, x1: 2560, y1: 800 },
    padPos: { x: 1630, y: 300 },
    palette: { floor: "#4c4735", deep: "#2b291d", prop: "none" },
    // 書記をひとり置いて、板がさばけないと分かってから
    unlockAfter: "scribe-h1",
    reveal: 45,
  },
  {
    id: "area-3",
    label: "商人の広場へ出る",
    price: 220000,
    rect: { x0: 2560, y0: 0, x1: 3460, y1: 800 },
    padPos: { x: 2530, y: 300 },
    palette: { floor: "#5a4a33", deep: "#342a1d", prop: "market" },
    unlockAfter: "built-build-school",
    reveal: 75,
  },
  {
    id: "area-4",
    label: "記録の館を建てる",
    price: 1600000,
    rect: { x0: 3460, y0: 0, x1: 4360, y1: 800 },
    padPos: { x: 3430, y: 300 },
    palette: { floor: "#45443a", deep: "#282722", prop: "market" },
    unlockAfter: "built-build-bazaar",
    reveal: 105,
  },
  {
    id: "area-5",
    label: "法の広場をひらく",
    price: 14000000,
    rect: { x0: 4360, y0: 0, x1: 5260, y1: 800 },
    padPos: { x: 4330, y: 300 },
    palette: { floor: "#585848", deep: "#2f2f2a", prop: "none" },
    unlockAfter: "built-build-admin",
    reveal: 136,
  },
];

const mojiStoves: StoveSpec[] = [
  /* --- area-0「あふれる倉」-------------------------------------------
   *
   * 生産はもう足りている。足りないのは「いくつあるか分かること」。
   * だから最初の買い物は畑ではなく、数え場（ござ＋粘土）になる。
   *
   *   麦畑 ─(麦)─┬▶ 倉（あふれている）
   *               ├▶ 住民の食卓
   *               └▶ 数え場 ─(数量札)─▶ 倉の帳場
   */
  {
    id: "field-1",
    pos: { x: 300, y: 250 },
    price: 0,
    area: 0,
    item: "wheat",
    art: "wheatfield",
    label: "麦畑",
    work: 1.0,
    hold: 8,
  },
  {
    id: "barn-1",
    pos: { x: 560, y: 170 },
    price: 0,
    area: 0,
    item: "wheat",
    art: "granary",
    label: "あふれる倉",
    /*
     * 倉そのものも麦を出す（前の時代からの蓄え）。
     * ただし積みかたが乱雑なので、出てくるのは遅い ―― 数えられていないから
     */
    work: 1.9,
    hold: 10,
  },
  {
    id: "count-1",
    pos: { x: 430, y: 380 },
    price: 80,
    area: 0,
    item: "tally",
    takes: "wheat",
    art: "countmat",
    label: "数え場",
    // 人の手が要る。倉庫係を雇うまでは、自分がそばに立って数える
    manual: true,
    work: 0.5,
    hold: 8,
    reveal: 4,
  },
  {
    id: "field-2",
    pos: { x: 170, y: 330 },
    price: 150,
    area: 0,
    item: "wheat",
    art: "wheatfield",
    label: "2枚目の麦畑",
    work: 1.0,
    hold: 8,
    reveal: 5,
  },
  {
    id: "reed-1",
    pos: { x: 90, y: 170 },
    price: 900,
    area: 0,
    item: "reed",
    art: "reeds",
    label: "葦の茂み",
    zone: { x0: 30, y0: 90, x1: 250, y1: 230 },
    hold: 8,
    reveal: 12,
  },
  {
    id: "field-3",
    pos: { x: 640, y: 330 },
    price: 2200,
    area: 0,
    item: "wheat",
    art: "wheatfield",
    label: "堤の上の麦畑",
    work: 1.0,
    hold: 8,
    reveal: 16,
  },

  /* --- area-1「粘土板の工房」------------------------------------------
   *
   * 工場ではなく、古代の手工業の区域に見せる（仕様書 §5 AREA2）。
   *
   *   川辺の粘土 ─(粘土)─▶ 練り場 ─(生板)─▶ 乾燥棚 ─(乾板)─▶ 書記小屋
   *   数え場 ────(数量札)──────────────────────────────────┘
   *                                            ↓
   *                                        記録板 ─▶ 記録庫・倉庫係
   */
  { id: "clay-1", pos: { x: 830, y: 300 }, price: 1800, area: 1, item: "clay", art: "claypit", label: "川辺の粘土穴", manual: true, work: 0.8, hold: 8, reveal: 21 },
  { id: "knead-1", pos: { x: 1000, y: 220 }, price: 3000, area: 1, item: "rawtab", takes: "clay", art: "knead", label: "練り場", manual: true, work: 0.7, reveal: 23 },
  { id: "dryrack-1", pos: { x: 1180, y: 300 }, price: 4200, area: 1, item: "drytab", takes: "rawtab", art: "dryrack", label: "乾燥棚", work: 1.0, reveal: 25 },
  {
    id: "scribe-1",
    pos: { x: 1380, y: 220 },
    price: 6000,
    area: 1,
    item: "tablet",
    takes: "drytab",
    fuel: "tally",
    art: "scribehut",
    label: "書記小屋",
    // このステージの主役。板を取り、見て、書いて、運ぶ
    work: 1.1,
    reveal: 27,
  },
  { id: "forest-1", pos: { x: 1560, y: 400 }, price: 2600, area: 1, item: "log", art: "forest", label: "川辺の木立", zone: { x0: 1440, y0: 330, x1: 1640, y1: 520 }, hold: 6, reveal: 22 },
  { id: "split-1", pos: { x: 1440, y: 480 }, price: 3200, area: 1, item: "wood", takes: "log", art: "split", label: "材木場", manual: true, work: 0.5, reveal: 24 },
  {
    id: "build-archive", pos: { x: 920, y: 620 }, price: 9000, area: 1,
    art: "archive", label: "記録庫", needs: { clay: 8, wood: 6 },
    gives: { note: "記録庫ができた。書いた板を積んでおける ―― 覚えておかなくてよくなった" },
    reveal: 31,
  },

  /* --- area-2「書記の学校」--------------------------------------------
   *
   * 書記の数が、そのまま街の処理能力になる（仕様書 §5 AREA3）。
   * 師匠と弟子、机、校舎、中庭と、買うたびに学校の規模が変わる。
   */
  { id: "reed-2", pos: { x: 1740, y: 170 }, price: 20000, area: 2, item: "reed", art: "reeds", label: "筆の葦原", zone: { x0: 1680, y0: 100, x1: 1880, y1: 240 }, hold: 10, reveal: 46 },
  { id: "school-1", pos: { x: 1980, y: 280 }, price: 34000, area: 2, item: "tablet", takes: "drytab", fuel: "reed", art: "school", label: "書記の学校", work: 0.85, hold: 8, reveal: 48 },
  { id: "scribe-2", pos: { x: 2220, y: 200 }, price: 26000, area: 2, item: "tablet", takes: "drytab", fuel: "tally", art: "scribehut", label: "二人目の書記小屋", work: 1.1, reveal: 44 },
  { id: "knead-2", pos: { x: 1780, y: 400 }, price: 30000, area: 2, item: "rawtab", takes: "clay", art: "knead", label: "工房通りの練り場", manual: true, work: 0.65, reveal: 50 },
  { id: "dryrack-2", pos: { x: 1960, y: 460 }, price: 38000, area: 2, item: "drytab", takes: "rawtab", art: "dryrack", label: "大乾燥棚", work: 0.9, reveal: 52 },
  { id: "scribe-3", pos: { x: 2400, y: 300 }, price: 60000, area: 2, item: "tablet", takes: "drytab", fuel: "reed", art: "scribehut", label: "三人目の書記小屋", work: 1.0, reveal: 56 },
  {
    id: "build-school", pos: { x: 2100, y: 640 }, price: 90000, area: 2,
    art: "schoolhouse", label: "屋根付きの校舎", needs: { wood: 10, clay: 8 },
    gives: { note: "校舎が建った。雨の日も弟子が机に向かえる" },
    reveal: 58,
  },
  {
    id: "build-yard", pos: { x: 2340, y: 640 }, price: 260000, area: 2,
    art: "bigschool", label: "中庭の大校舎", needs: { wood: 14, clay: 12, drytab: 10 },
    gives: { note: "中庭の大校舎ができた。壁いちめんに文字が並んでいる" },
    unlockAfter: "built-build-school", reveal: 66,
  },

  /* --- area-3「商人の広場」--------------------------------------------
   *
   * ござの口頭取引 → 屋台 → 秤と商品札 → 契約板、と広場が高度になる。
   *
   *   羊の囲い ─(羊毛)─▶ 織り場 ─(布)─┐
   *   記録板 ───────────────────────┴▶ 市場の記録所 ─(契約板)─▶ 遠方商人
   */
  { id: "pen-1", pos: { x: 2640, y: 200 }, price: 120000, area: 3, item: "wool", takes: "wheat", art: "pen", label: "羊の囲い", work: 1.3, reveal: 76 },
  { id: "loom-1", pos: { x: 2840, y: 300 }, price: 180000, area: 3, item: "cloth", takes: "wool", art: "loom", label: "織り場", manual: true, work: 0.8, reveal: 78 },
  { id: "grove-1", pos: { x: 3340, y: 220 }, price: 150000, area: 3, item: "oil", art: "grove", label: "油の木立", zone: { x0: 3240, y0: 130, x1: 3440, y1: 300 }, hold: 8, reveal: 80 },
  {
    id: "desk-1", pos: { x: 3060, y: 380 }, price: 300000, area: 3,
    item: "deed", takes: "tablet", fuel: "cloth", art: "tradedesk", label: "市場の記録席",
    // 商品・数量・相手を書いて、はじめて遠くの相手と取引できる
    work: 1.2, reveal: 84,
  },
  {
    id: "build-bazaar", pos: { x: 2900, y: 660 }, price: 900000, area: 3,
    art: "bazaar", label: "大型市場", needs: { wood: 16, cloth: 10, tablet: 8 },
    gives: { note: "大型市場が開いた。遠方の商隊が広場まで入ってくる" },
    reveal: 92,
  },

  /* --- area-4「記録の館」----------------------------------------------
   *
   * 情報物流の中継点。ここから先は、街のなかを物資と記録が同時に流れる。
   */
  { id: "survey-1", pos: { x: 3560, y: 250 }, price: 1800000, area: 4, item: "landtab", takes: "tablet", fuel: "deed", art: "survey", label: "測量所", work: 1.2, reveal: 106 },
  { id: "tax-1", pos: { x: 3800, y: 330 }, price: 3000000, area: 4, item: "taxtab", takes: "tablet", fuel: "deed", art: "taxhouse", label: "徴税所", work: 1.3, reveal: 110 },
  { id: "clay-2", pos: { x: 4180, y: 230 }, price: 2200000, area: 4, item: "clay", art: "claypit", label: "館の粘土場", manual: true, work: 0.7, hold: 12, reveal: 108 },
  { id: "scribe-4", pos: { x: 4020, y: 300 }, price: 2600000, area: 4, item: "tablet", takes: "drytab", fuel: "reed", art: "scribehut", label: "館づきの書記", work: 0.95, reveal: 112 },
  { id: "dryrack-3", pos: { x: 4180, y: 400 }, price: 3400000, area: 4, item: "drytab", takes: "rawtab", art: "dryrack", label: "館の乾燥棚", work: 0.85, reveal: 114 },
  { id: "knead-3", pos: { x: 4020, y: 460 }, price: 3000000, area: 4, item: "rawtab", takes: "clay", art: "knead", label: "館の練り場", manual: true, work: 0.6, reveal: 113 },
  {
    id: "build-archive2", pos: { x: 3600, y: 660 }, price: 6000000, area: 4,
    art: "bigarchive", label: "大文書庫", needs: { clay: 20, wood: 18, tablet: 14 },
    gives: { note: "大文書庫が建った。柱の間に棚がならび、街ぜんたいの記録が収まった" },
    reveal: 118,
  },
  {
    id: "build-admin", pos: { x: 3900, y: 660 }, price: 16000000, area: 4,
    art: "adminhall", label: "行政所", needs: { wood: 20, clay: 18, deed: 10 },
    gives: { note: "行政所ができた。土地と税が、人の記憶ではなく板で動きはじめた" },
    unlockAfter: "built-build-archive2", reveal: 126,
  },

  /* --- area-5「法の広場」----------------------------------------------
   *
   * 道を広く、建築を高く。大法典碑だけは、ほかの何倍もの大きさで立てる。
   *
   *   採石場 ─(石)─▶ 石工場 ─(石板)─┐
   *   記録板・契約板・徴税記録 ───────┴▶ 大法典碑
   */
  { id: "quarry-1", pos: { x: 5060, y: 260 }, price: 20000000, area: 5, item: "stone", art: "quarry", label: "巨石の採石場", manual: true, work: 0.9, hold: 12, reveal: 137 },
  { id: "mason-1", pos: { x: 4860, y: 340 }, price: 30000000, area: 5, item: "slab", takes: "stone", art: "masonry", label: "石工の作業場", manual: true, work: 0.8, reveal: 139 },
  { id: "scribe-5", pos: { x: 4600, y: 240 }, price: 36000000, area: 5, item: "tablet", takes: "drytab", fuel: "reed", art: "scribehut", label: "法文をつくる書記", work: 0.9, reveal: 141 },
  { id: "dryrack-4", pos: { x: 4760, y: 190 }, price: 40000000, area: 5, item: "drytab", takes: "rawtab", art: "dryrack", label: "広場の乾燥棚", work: 0.8, reveal: 142 },
  {
    id: "build-court", pos: { x: 4520, y: 620 }, price: 60000000, area: 5,
    art: "court", label: "石畳の広場", needs: { slab: 12, wood: 12 },
    gives: { note: "広場に石畳が敷かれた。道が広く、まっすぐになった" },
    reveal: 146,
  },
  {
    id: "build-code", pos: { x: 4900, y: 640 }, price: 400000000, area: 5,
    art: "lawstone", label: "大法典碑",
    /*
     * 巨石 → 大型運搬 → 石工整形 → 書記が法文をつくる → 彫刻師が刻む → 建立。
     * 石だけでも文字だけでも建たない ―― 両方の物流がそろってはじめて立つ
     */
    needs: { slab: 24, tablet: 20, deed: 12, taxtab: 8 },
    gives: { sail: true, note: "大法典碑が立った。だれが読んでも同じ決まりが、街の真ん中にある" },
    unlockAfter: "built-build-court", reveal: 160,
  },
];

const mojiSeats: SeatSpec[] = [
  /* 第1区画: 住民の食卓（麦）と、倉の帳場（数量札） */
  ...cityRow(0, "wheat", 1, "住民の食卓", "mat", [
    { x: 300, y: 460, price: 0 },
    { x: 420, y: 470, price: 0 },
    { x: 540, y: 460, price: 180, reveal: 3 },
    { x: 200, y: 480, price: 700, reveal: 8 },
  ]),
  // 数えた札を持っていくと、倉庫係がまとめて引き取ってくれる
  ...cityRow(0, "tally", 3.2, "倉の帳場", "tallydesk", [
    { x: 640, y: 250, price: 300, unlockAfter: "count-1", reveal: 6 },
    { x: 700, y: 380, price: 900, reveal: 9 },
  ], "t"),

  /* 第2区画: 板の市（乾板）と、記録を待つ倉庫係（記録板） */
  ...cityRow(1, "drytab", 4.5, "板の市", "mat", [
    { x: 1080, y: 470, price: 6000, reveal: 28 },
    { x: 1200, y: 480, price: 14000, reveal: 32 },
  ]),
  ...cityRow(1, "tablet", 9, "記録を待つ倉庫係", "tallydesk", [
    { x: 1300, y: 380, price: 20000, unlockAfter: "scribe-1", reveal: 29 },
    { x: 1460, y: 300, price: 44000, reveal: 34 },
  ], "t"),

  /* 第3区画: 学びの食事場と、名簿の席 */
  ...cityRow(2, "wheat", 6, "学びの食事場", "mat", [
    { x: 1860, y: 540, price: 60000, reveal: 49 },
    { x: 1980, y: 560, price: 130000, reveal: 53 },
  ]),
  ...cityRow(2, "tablet", 16, "名簿の席", "tallydesk", [
    { x: 2200, y: 460, price: 180000, reveal: 55 },
    { x: 2340, y: 440, price: 340000, reveal: 60 },
  ], "t"),

  /* 第4区画: 布と油の屋台、そして契約の席 */
  ...cityRow(3, "cloth", 26, "布の屋台", "stall", [
    { x: 2700, y: 480, price: 500000, reveal: 79 },
    { x: 2820, y: 500, price: 900000, reveal: 83 },
  ]),
  ...cityRow(3, "oil", 30, "油の屋台", "stall", [
    { x: 3220, y: 400, price: 1300000, reveal: 82 },
    { x: 3340, y: 420, price: 2000000, reveal: 86 },
  ], "t"),
  ...cityRow(3, "deed", 60, "遠方商人の契約席", "deeddesk", [
    { x: 3140, y: 520, price: 3000000, unlockAfter: "desk-1", reveal: 88 },
    { x: 3280, y: 540, price: 5200000, reveal: 94 },
  ], "d"),

  /* 第5区画: 台帳と徴税。記録そのものが街を動かす */
  ...cityRow(4, "landtab", 120, "土地台帳の席", "deeddesk", [
    { x: 3560, y: 440, price: 9000000, reveal: 107 },
    { x: 3700, y: 460, price: 15000000, reveal: 111 },
  ]),
  ...cityRow(4, "taxtab", 150, "徴税の窓口", "deeddesk", [
    { x: 3860, y: 500, price: 24000000, reveal: 115 },
    { x: 4000, y: 520, price: 40000000, reveal: 120 },
  ], "t"),
  ...cityRow(4, "wheat", 40, "館前の食事場", "mat", [
    { x: 4200, y: 560, price: 12000000, reveal: 116 },
  ], "m"),

  /* 第6区画: 石の市と、法の広場に集まる人々 */
  ...cityRow(5, "slab", 260, "石工の市", "stall", [
    { x: 4700, y: 460, price: 70000000, reveal: 143 },
    { x: 4840, y: 480, price: 110000000, reveal: 147 },
  ]),
  ...cityRow(5, "tablet", 300, "法を読みに来た人", "deeddesk", [
    { x: 5040, y: 460, price: 160000000, reveal: 150 },
    { x: 5160, y: 440, price: 260000000, reveal: 155 },
  ], "t"),
  ...cityRow(5, "wheat", 90, "広場の食事場", "mat", [
    { x: 4460, y: 500, price: 90000000, reveal: 148 },
  ], "m"),
];

/**
 * 雇う順。
 * 数える → 運ぶ → こねる → 書く、と、いま覚えた仕事の次だけを出す。
 * 書記は「板を取る → 見る → 書く → 運ぶ → 棚へ置く」を回す、このステージの主役。
 */
const mojiHires: HireSpec[] = [
  /* --- area-0 --- */
  { id: "farmer-1", kind: "cook", pos: { x: 300, y: 316 }, price: 48, label: "農民", stoveId: "field-1", area: 0, reveal: 2 },
  { id: "waiter-1", kind: "waiter", pos: { x: 200, y: 420 }, price: 64, label: "運搬人", area: 0, reveal: 3 },
  { id: "keeper-1", kind: "cook", pos: { x: 430, y: 446 }, price: 180, label: "倉庫係", stoveId: "count-1", area: 0, reveal: 4.5 },
  { id: "collector-1", kind: "collector", pos: { x: 620, y: 440 }, price: 300, label: "拾い手", area: 0, reveal: 7 },
  { id: "waiter-2", kind: "waiter", pos: { x: 260, y: 420 }, price: 480, label: "運搬人", area: 0, unlockAfter: "collector-1", reveal: 10 },
  { id: "farmer-2", kind: "cook", pos: { x: 170, y: 396 }, price: 700, label: "農民", stoveId: "field-2", area: 0, unlockAfter: "field-2", reveal: 11 },
  { id: "robot-1", kind: "robot", pos: { x: 680, y: 440 }, price: 1600, label: "荷車", area: 0, reveal: 15 },
  { id: "farmer-3", kind: "cook", pos: { x: 640, y: 396 }, price: 3000, label: "堤の農民", stoveId: "field-3", area: 0, unlockAfter: "field-3", reveal: 17 },

  /* --- area-1 粘土板の工房 --- */
  { id: "potter-1", kind: "splitter", pos: { x: 830, y: 370 }, price: 3600, label: "粘土職人", stoveId: "clay-1", area: 1, reveal: 21.5 },
  { id: "logger-1", kind: "logger", pos: { x: 1600, y: 460 }, price: 4000, label: "木こり", stoveId: "forest-1", area: 1, reveal: 22.5 },
  { id: "kneader-1", kind: "splitter", pos: { x: 1000, y: 290 }, price: 5000, label: "練り手", stoveId: "knead-1", area: 1, reveal: 23.5 },
  { id: "sawyer-1", kind: "splitter", pos: { x: 1440, y: 540 }, price: 4800, label: "材木の係", stoveId: "split-1", area: 1, reveal: 24.5 },
  { id: "drier-1", kind: "cook", pos: { x: 1180, y: 370 }, price: 6400, label: "乾かし手", stoveId: "dryrack-1", area: 1, reveal: 25.5 },
  // 書記。ここからこのステージの中心になる
  { id: "scribe-h1", kind: "scribe", pos: { x: 1380, y: 290 }, price: 9000, label: "書記", stoveId: "scribe-1", area: 1, reveal: 27.5 },
  { id: "waiter-3", kind: "waiter", pos: { x: 880, y: 520 }, price: 8000, label: "運搬人", area: 1, reveal: 30 },
  { id: "builder-1", kind: "builder", pos: { x: 980, y: 560 }, price: 12000, label: "建築係", area: 1, reveal: 31.5 },
  { id: "robot-2", kind: "robot", pos: { x: 950, y: 520 }, price: 26000, label: "荷車", area: 1, reveal: 36 },

  /* --- area-2 書記の学校 --- */
  { id: "scribe-h2", kind: "scribe", pos: { x: 2220, y: 270 }, price: 34000, label: "二人目の書記", stoveId: "scribe-2", area: 2, reveal: 44.5 },
  { id: "teacher-1", kind: "scribe", pos: { x: 1980, y: 350 }, price: 48000, label: "書記の師匠", stoveId: "school-1", area: 2, reveal: 48.5 },
  { id: "kneader-2", kind: "splitter", pos: { x: 1780, y: 470 }, price: 40000, label: "練り手", stoveId: "knead-2", area: 2, reveal: 50.5 },
  { id: "drier-2", kind: "cook", pos: { x: 1960, y: 530 }, price: 50000, label: "乾かし手", stoveId: "dryrack-2", area: 2, reveal: 52.5 },
  { id: "pupil-1", kind: "scribe", pos: { x: 2060, y: 350 }, price: 70000, label: "弟子", area: 2, unlockAfter: "teacher-1", reveal: 57 },
  { id: "scribe-h3", kind: "scribe", pos: { x: 2400, y: 370 }, price: 90000, label: "三人目の書記", stoveId: "scribe-3", area: 2, reveal: 56.5 },
  { id: "waiter-4", kind: "waiter", pos: { x: 1720, y: 600 }, price: 80000, label: "運搬人", area: 2, reveal: 54 },
  { id: "pupil-2", kind: "scribe", pos: { x: 2140, y: 350 }, price: 160000, label: "弟子", area: 2, unlockAfter: "pupil-1", reveal: 62 },
  { id: "builder-2", kind: "builder", pos: { x: 2180, y: 600 }, price: 140000, label: "建築係", area: 2, reveal: 59 },
  { id: "robot-3", kind: "robot", pos: { x: 1800, y: 600 }, price: 220000, label: "荷車", area: 2, reveal: 64 },
  { id: "pupil-3", kind: "scribe", pos: { x: 2220, y: 350 }, price: 320000, label: "弟子", area: 2, unlockAfter: "pupil-2", reveal: 68 },

  /* --- area-3 商人の広場 --- */
  { id: "herder-1", kind: "cook", pos: { x: 2640, y: 270 }, price: 180000, label: "羊飼い", stoveId: "pen-1", area: 3, reveal: 76.5 },
  { id: "weaver-1", kind: "splitter", pos: { x: 2840, y: 370 }, price: 240000, label: "織り手", stoveId: "loom-1", area: 3, reveal: 78.5 },
  { id: "picker-1", kind: "logger", pos: { x: 3380, y: 290 }, price: 220000, label: "油の摘み手", stoveId: "grove-1", area: 3, reveal: 80.5 },
  // 市場の記録席につく書記。ここで取引が板になる
  { id: "clerk-1", kind: "scribe", pos: { x: 3060, y: 450 }, price: 420000, label: "市場の書記", stoveId: "desk-1", area: 3, reveal: 84.5 },
  { id: "trader-1", kind: "master", pos: { x: 2960, y: 560 }, price: 1400000, label: "商人", area: 3, unlockAfter: "built-build-bazaar", reveal: 93 },
  { id: "waiter-5", kind: "waiter", pos: { x: 2620, y: 600 }, price: 600000, label: "運搬人", area: 3, reveal: 85 },
  { id: "builder-3", kind: "builder", pos: { x: 2980, y: 600 }, price: 900000, label: "建築係", area: 3, reveal: 90 },
  { id: "robot-4", kind: "robot", pos: { x: 2700, y: 600 }, price: 1600000, label: "荷車", area: 3, reveal: 96 },

  /* --- area-4 記録の館 --- */
  { id: "surveyor-1", kind: "officer", pos: { x: 3560, y: 320 }, price: 2600000, label: "測量係", stoveId: "survey-1", area: 4, reveal: 106.5 },
  { id: "potter-2", kind: "splitter", pos: { x: 4180, y: 300 }, price: 3000000, label: "粘土職人", stoveId: "clay-2", area: 4, reveal: 108.5 },
  { id: "officer-1", kind: "officer", pos: { x: 3800, y: 400 }, price: 4200000, label: "役人", stoveId: "tax-1", area: 4, reveal: 110.5 },
  { id: "scribe-h4", kind: "scribe", pos: { x: 4020, y: 370 }, price: 3600000, label: "館づきの書記", stoveId: "scribe-4", area: 4, reveal: 112.5 },
  { id: "kneader-3", kind: "splitter", pos: { x: 4020, y: 530 }, price: 4000000, label: "練り手", stoveId: "knead-3", area: 4, reveal: 113.5 },
  { id: "drier-3", kind: "cook", pos: { x: 4180, y: 470 }, price: 4600000, label: "乾かし手", stoveId: "dryrack-3", area: 4, reveal: 114.5 },
  { id: "builder-4", kind: "builder", pos: { x: 3660, y: 600 }, price: 8000000, label: "館の建築係", area: 4, reveal: 119 },
  { id: "waiter-6", kind: "waiter", pos: { x: 3740, y: 600 }, price: 7000000, label: "運搬人", area: 4, reveal: 117 },
  { id: "guard-1", kind: "officer", pos: { x: 3620, y: 560 }, price: 20000000, label: "文書庫の衛兵", area: 4, unlockAfter: "built-build-archive2", reveal: 124 },
  { id: "robot-5", kind: "robot", pos: { x: 3820, y: 600 }, price: 14000000, label: "荷車", area: 4, reveal: 122 },
  { id: "elder-1", kind: "master", pos: { x: 3960, y: 560 }, price: 60000000, label: "行政長", area: 4, unlockAfter: "built-build-admin", reveal: 130 },

  /* --- area-5 法の広場 --- */
  { id: "mason-h1", kind: "carver", pos: { x: 5060, y: 330 }, price: 30000000, label: "石工", stoveId: "quarry-1", area: 5, reveal: 137.5 },
  { id: "carver-1", kind: "carver", pos: { x: 4860, y: 410 }, price: 44000000, label: "彫刻師", stoveId: "mason-1", area: 5, reveal: 139.5 },
  { id: "scribe-h5", kind: "scribe", pos: { x: 4600, y: 310 }, price: 50000000, label: "法文の書記", stoveId: "scribe-5", area: 5, reveal: 141.5 },
  { id: "drier-4", kind: "cook", pos: { x: 4760, y: 260 }, price: 54000000, label: "乾かし手", stoveId: "dryrack-4", area: 5, reveal: 142.5 },
  { id: "builder-5", kind: "builder", pos: { x: 4580, y: 580 }, price: 80000000, label: "広場の建築係", area: 5, reveal: 144 },
  { id: "waiter-7", kind: "waiter", pos: { x: 4660, y: 580 }, price: 70000000, label: "運搬人", area: 5, reveal: 145 },
  { id: "builder-6", kind: "builder", pos: { x: 4960, y: 580 }, price: 180000000, label: "建立の建築係", area: 5, unlockAfter: "built-build-court", reveal: 152 },
  { id: "robot-6", kind: "robot", pos: { x: 4740, y: 580 }, price: 140000000, label: "荷車", area: 5, reveal: 149 },
];

const mojiEquipment: EquipSpec[] = [
  /* --- 第1区画: 数えることを楽にする --- */
  { id: "tally-way", name: "麦の運び道", detail: "麦を、数え場へ直接おくる", pos: { x: 370, y: 320 }, price: 1400, area: 0, link: { from: "field-1", to: "count-1" }, unlockAfter: "keeper-1", reveal: 13 },
  { id: "fridge", name: "編みかごの棚", detail: "受け口・出し口に積める数 +4", pos: { x: 700, y: 200 }, price: 9000, area: 0, unlockAfter: "count-1", reveal: 18 },
  { id: "noodle", name: "土の作業台", detail: "すべての作業場が +30%速くなる", pos: { x: 720, y: 300 }, price: 16000, area: 0, unlockAfter: "equip-fridge", reveal: 19 },
  { id: "ticket", name: "受け取りの壺", detail: "代金が自動でサイフに入る・拾い手は運びへ", pos: { x: 250, y: 0 }, price: 24000, area: 0, outside: true, unlockAfter: "equip-noodle", reveal: 19.5 },
  { id: "flag", name: "市の立て札", detail: "人が集まる。集まりが 1.25倍", pos: { x: 120, y: 0 }, price: 1200, area: 0, outside: true, row: 1, draw: 1.25, unlockAfter: "collector-1", reveal: 12.5 },

  /* --- 第2区画: 粘土板の流れをつなぐ --- */
  { id: "chute-clay", name: "粘土のとい", detail: "粘土を、練り場へ直接おくる", pos: { x: 920, y: 260 }, price: 6000, area: 1, link: { from: "clay-1", to: "knead-1" }, unlockAfter: "kneader-1", reveal: 26 },
  { id: "board-way", name: "生板の板道", detail: "生の粘土板を、乾燥棚へ直接おくる", pos: { x: 1090, y: 260 }, price: 10000, area: 1, link: { from: "knead-1", to: "dryrack-1" }, unlockAfter: "drier-1", reveal: 26.5 },
  { id: "chute-log", name: "丸太ころがし", detail: "丸太を、材木場へ直接おくる", pos: { x: 1500, y: 460 }, price: 8000, area: 1, link: { from: "forest-1", to: "split-1" }, unlockAfter: "sawyer-1", reveal: 33 },
  { id: "dry-rack-plus", name: "日よけの葦すだれ", detail: "乾燥棚に積める数 +5", pos: { x: 1260, y: 360 }, price: 22000, area: 1, capacity: { stove: "dryrack-1", plus: 5 }, unlockAfter: "equip-board-way", reveal: 35 },
  { id: "tally-way-2", name: "数量札の道", detail: "数量札を、書記小屋へ直接おくる", pos: { x: 1300, y: 200 }, price: 30000, area: 1, link: { from: "count-1", to: "scribe-1" }, unlockAfter: "scribe-h1", reveal: 37 },
  { id: "lantern", name: "広場のかがり火", detail: "夜も市が立つ。集まりが 1.4倍", pos: { x: 380, y: 0 }, price: 60000, area: 0, outside: true, row: 1, draw: 1.4, unlockAfter: "area-1", reveal: 38 },

  /* --- 第3区画: 学校まわり --- */
  { id: "board-way-2", name: "工房通りの板道", detail: "生の粘土板を、大乾燥棚へおくる", pos: { x: 1870, y: 430 }, price: 60000, area: 2, link: { from: "knead-2", to: "dryrack-2" }, unlockAfter: "drier-2", reveal: 51 },
  { id: "reed-way", name: "葦の道", detail: "葦を、書記の学校へ直接おくる", pos: { x: 1860, y: 220 }, price: 80000, area: 2, link: { from: "reed-2", to: "school-1" }, unlockAfter: "teacher-1", reveal: 61 },
  { id: "school-desk", name: "弟子の机", detail: "書記の学校に積める板 +6", pos: { x: 2080, y: 240 }, price: 120000, area: 2, capacity: { stove: "school-1", plus: 6 }, unlockAfter: "equip-reed-way", reveal: 63 },
  { id: "board-way-3", name: "校舎への板道", detail: "大乾燥棚の板を、学校へ直接おくる", pos: { x: 1980, y: 380 }, price: 200000, area: 2, link: { from: "dryrack-2", to: "school-1" }, unlockAfter: "equip-school-desk", reveal: 67 },
  { id: "alley-road", name: "工房通りの石敷き", detail: "工房と学校のあいだの足が速くなる", pos: { x: 2100, y: 520 }, price: 300000, area: 2, road: { from: { x: 1700, y: 520 }, to: { x: 2500, y: 520 } }, reveal: 70 },

  /* --- 第4区画: 広場と市場 --- */
  { id: "wool-way", name: "羊毛の道", detail: "羊毛を、織り場へ直接おくる", pos: { x: 2740, y: 250 }, price: 400000, area: 3, link: { from: "pen-1", to: "loom-1" }, unlockAfter: "weaver-1", reveal: 81 },
  { id: "cloth-way", name: "布の運び道", detail: "布を、市場の記録席へ直接おくる", pos: { x: 2960, y: 340 }, price: 700000, area: 3, link: { from: "loom-1", to: "desk-1" }, unlockAfter: "clerk-1", reveal: 87 },
  { id: "scale", name: "秤と商品札", detail: "広場に品ぞろえの札が並ぶ。集まりが 1.5倍", pos: { x: 3040, y: 300 }, price: 1200000, area: 3, draw: 1.5, unlockAfter: "desk-1", reveal: 89 },
  { id: "market-road", name: "広場の大通り", detail: "広場を横切る道。荷と人の足が速くなる", pos: { x: 3000, y: 460 }, price: 2000000, area: 3, road: { from: { x: 2600, y: 460 }, to: { x: 3420, y: 460 } }, unlockAfter: "equip-alley-road", reveal: 95 },

  /* --- 第5区画: 記録の館 --- */
  { id: "tablet-way", name: "記録板の道", detail: "館づきの書記の板を、測量所へおくる", pos: { x: 3780, y: 260 }, price: 5000000, area: 4, link: { from: "scribe-4", to: "survey-1" }, unlockAfter: "surveyor-1", reveal: 121 },
  { id: "deed-way", name: "契約板の道", detail: "市場の契約板を、徴税所へおくる", pos: { x: 3660, y: 380 }, price: 8000000, area: 4, link: { from: "desk-1", to: "tax-1" }, unlockAfter: "officer-1", reveal: 123 },
  { id: "chute-clay-2", name: "館の粘土とい", detail: "粘土を、館の練り場へ直接おくる", pos: { x: 4100, y: 340 }, price: 9000000, area: 4, link: { from: "clay-2", to: "knead-3" }, unlockAfter: "kneader-3", reveal: 125 },
  { id: "archive-shelf", name: "文書庫の棚", detail: "館の乾燥棚に積める板 +10", pos: { x: 4260, y: 440 }, price: 16000000, area: 4, capacity: { stove: "dryrack-3", plus: 10 }, unlockAfter: "built-build-archive2", reveal: 128 },
  { id: "admin-road", name: "行政地区の広い道", detail: "館と広場をつなぐ。街ぜんたいの足が速くなる", pos: { x: 3900, y: 470 }, price: 30000000, area: 4, road: { from: { x: 3480, y: 470 }, to: { x: 4340, y: 470 } }, unlockAfter: "equip-market-road", reveal: 132 },

  /* --- 第6区画: 法の広場 --- */
  { id: "stone-road", name: "巨石の引き道", detail: "採石場から広場まで、石を引く道", pos: { x: 4900, y: 400 }, price: 60000000, area: 5, road: { from: { x: 4400, y: 400 }, to: { x: 5220, y: 400 } }, reveal: 151 },
  { id: "stone-way", name: "石の落とし道", detail: "石を、石工の作業場へ直接おくる", pos: { x: 4960, y: 300 }, price: 80000000, area: 5, link: { from: "quarry-1", to: "mason-1" }, unlockAfter: "carver-1", reveal: 153 },
  { id: "quarry-cap", name: "石置き場", detail: "採石場に積める石 +12", pos: { x: 5140, y: 330 }, price: 120000000, area: 5, capacity: { stove: "quarry-1", plus: 12 }, unlockAfter: "mason-h1", reveal: 156 },
  { id: "sign", name: "広場の高札", detail: "決まりが遠くまで知れわたる。集まりが 1.6倍", pos: { x: 470, y: 0 }, price: 200000000, area: 0, outside: true, row: 1, draw: 1.6, unlockAfter: "area-5", reveal: 158 },
];

const mojiUpgrades: Upgrade[] = [
  // 編みかごは、遊びはじめの「いちばん近い目標」。3往復ぶんで買える
  { id: "carry", name: "編みかご", detail: (n) => `${3 + n}こまで持てる・運搬人も 品種ごとに ${3 + Math.floor(n / 2)}こ`, pos: { x: 60, y: 300 }, basePrice: 24, growth: 1.7, max: 9, reveal: 1 },
  { id: "cook", name: "石の道具", detail: (n) => `作る速さ +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 60, y: 360 }, basePrice: 150, growth: 1.7, max: 14, unlockAfter: "farmer-1", reveal: 7.5 },
  { id: "speed", name: "革のはきもの", detail: (n) => `足の速さ +${n * 10}%・みんなも +${n * 5}%`, pos: { x: 60, y: 420 }, basePrice: 110, growth: 1.65, max: 12, unlockAfter: "collector-1", reveal: 9.5 },
  { id: "price", name: "品定め", detail: (n) => `ひとつ ${Math.round(7 * Math.pow(1.4, n))}印`, pos: { x: 60, y: 480 }, basePrice: 600, growth: 1.75, max: 20, unlockAfter: "count-1", reveal: 11.5 },
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
    // 2号店は棟が分かれている。壁と戸口の当たり判定を使う
    walls: true,
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
        runner: "仕込み係",
        boat: "運搬船",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
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
        runner: "仕込み係",
        boat: "運搬船",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
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
  onsen: {
    id: "onsen",
    name: "湯けむり温泉街",
    subtitle: "一本の道からはじめる",
    icon: "♨️",
    itemIcon: "🧺",
    // 作業場は建物の中に散らばっているので、帯は持たない
    frontRoom: { top: 0, bottom: 0 },
    areas: onsenAreas,
    stoves: onsenStoves,
    seats: onsenSeats,
    hires: onsenHires,
    equipment: onsenEquipment,
    upgrades: onsenUpgrades,
    baseValue: 60,
    // ドリームパークを最後まで開けた人にだけ、次の町の話が来る
    requiresAreas: 10,
    requiresStage: "park",
    // 建物は一軒ずつ壁と戸口を持つ。道からは戸口だけで出入りする
    walls: true,
    // 町が広いので、少し引いて見せてカメラで追う
    view: 440,
    // 客が歩いてくるのは、いちばん下の入口道路の先
    entranceX: 1150,
    startPos: { x: 900, y: 1540 },
    // 序盤は次の一手だけ、町が広がると5〜8個から選べるようにする
    revealLimit: 4,
    revealLimitBy: {
      "area-2": 6,
      "area-5": 7,
      "area-6": 8,
      "area-10": 8,
      "area-14": 8,
    },
    labels: {
      item: "手ぬぐい",
      producer: "置き場",
      tray: "湯口",
      guest: "お客さん",
      using: "湯に入っている",
      staff: {
        waiter: "手ぬぐい係",
        robot: "巡回ワゴン",
        collector: "集金係",
        cook: "担当の人",
        master: "女将",
        busser: "片づけ係",
        stocker: "品出し係",
        server: "配膳係",
        seller: "受付",
        gatekeeper: "門番",
        hunter: "狩人",
        logger: "木こり",
        splitter: "薪割り",
        butcher: "解体係",
        builder: "建築係",
        keeper: "倉庫番",
        nightman: "夜番",
        explorer: "案内人",
        runner: "仕込み係",
        boat: "運搬船",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
      },
      objective: {
        pickup: "置き場で手ぬぐいを受け取ろう",
        serve: "光っている湯口まで運ぼう",
        coin: "お金を踏んで回収しよう",
        waitItem: "手ぬぐいがそろうまで待とう",
        waitGuest: "お客さんを待っています",
      },
      auto: "自動の湯かご置き",
      outside: "温泉街の入口",
      outsideDetail: "客はこの先から歩いてくる",
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
    // 工程の運搬を、はこび手（仲間）にまかせるのはこのステージだけ
    haulers: true,
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
      "area-5": 8,
      "area-6": 9,
      "area-7": 8,
      "area-8": 8,
      "area-9": 8,
      "area-10": 8,
      "area-11": 9,
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
        runner: "仕込み係",
        boat: "運搬船",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
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
  taiga: {
    id: "taiga",
    name: "大河の文明",
    subtitle: "川辺の畑からはじめる",
    icon: "🌾",
    itemIcon: "🌾",
    frontRoom: { top: 38, bottom: 300 },
    areas: taigaAreas,
    stoves: taigaStoves,
    seats: taigaSeats,
    hires: taigaHires,
    equipment: taigaEquipment,
    upgrades: taigaUpgrades,
    baseValue: 8,
    requiresAreas: 0,
    chain: true,
    queue: true,
    currency: "粒",
    view: 400,
    entranceX: 360,
    startPos: { x: 344, y: 300 },
    // 畑は 4.0秒に1こ。農民が付くと 2.0秒（作物は待つものなので、火より遅くない）
    cookTime: 4.0,
    cookBoost: 2.0,
    /*
     * 工程の運搬を、はこび手・荷車・船・建築係にまかせる。
     * これが無いと、運び手は席へ渡すことしかしなくなり、
     * 畑も石臼も窯も材料待ちのまま、みんな突っ立ってしまう
     */
    haulers: true,
    // 次の自動化に必要な枠が、いつも5つ先まで見えているようにする
    revealLimit: 5,
    // ふたつずつだと、次の目標が出そろうまでが長い
    revealBurst: 3,
    revealLimitBy: {
      "area-1": 6,
      "area-2": 7,
      "area-3": 7,
      "area-4": 7,
      "area-5": 7,
      "area-6": 8,
      "area-7": 8,
      "area-8": 8,
    },
    // 1こ目の収穫は「水を汲んで、畑へ入れる」だけ。種は最初からまいてある
    startFuel: { "field-1": 2 },
    // 川・種置き場・畑・最初の食事場だけ見えている
    start: ["river-1", "seed-1", "field-1", "seat-0-1"],
    labels: {
      item: "しなもの",
      producer: "作業場",
      tray: "食事場",
      guest: "住民",
      using: "食べている",
      staff: {
        waiter: "はこび手",
        robot: "荷車",
        collector: "拾い手",
        cook: "担当の人",
        master: "町長",
        busser: "片づけ手",
        stocker: "並べ手",
        server: "はこび手",
        seller: "受付",
        gatekeeper: "門番",
        hunter: "狩人",
        logger: "木こり",
        splitter: "係の人",
        butcher: "解体係",
        builder: "建築係",
        keeper: "倉庫番",
        nightman: "夜番",
        explorer: "船頭",
        boat: "運搬船",
        runner: "仕込み係",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
      },
      objective: {
        pickup: "出し口でしなものを受け取ろう",
        serve: "次の作業場か、住民まで運ぼう",
        coin: "落ちた粒を拾おう",
        waitItem: "できあがるまで待とう",
        waitGuest: "住民を待っています",
      },
      auto: "自動送り",
      outside: "川原",
      outsideDetail: "のろし・たいこはこの外に置く",
    },
  },
  moji: {
    id: "moji",
    name: "文字のはじまり",
    subtitle: "数えられない倉からはじめる",
    icon: "📖",
    itemIcon: "🪨",
    frontRoom: { top: 38, bottom: 300 },
    areas: mojiAreas,
    stoves: mojiStoves,
    seats: mojiSeats,
    hires: mojiHires,
    equipment: mojiEquipment,
    upgrades: mojiUpgrades,
    baseValue: 7,
    requiresAreas: 0,
    chain: true,
    queue: true,
    currency: "印",
    view: 420,
    entranceX: 340,
    startPos: { x: 380, y: 300 },
    cookTime: 3.4,
    cookBoost: 2.1,
    // 情報も物資と同じように、運搬人・荷車・建築係が運ぶ
    haulers: true,
    revealLimit: 5,
    revealBurst: 3,
    revealLimitBy: {
      "area-1": 7,
      "area-2": 8,
      "area-3": 8,
      "area-4": 9,
      "area-5": 9,
    },
    /*
     * 麦は採れている。倉もある。足りないのは「いくつあるか分かること」。
     * だから開始画面には、畑・倉・食卓しか無い（仕様書 §5 AREA1）
     */
    start: ["field-1", "barn-1", "seat-0-1", "seat-0-2"],
    labels: {
      item: "しなもの",
      producer: "作業場",
      tray: "受け渡し",
      guest: "市民",
      using: "受け取っている",
      staff: {
        waiter: "運搬人",
        robot: "荷車",
        collector: "拾い手",
        cook: "担当の人",
        master: "行政長",
        busser: "片づけ手",
        stocker: "並べ手",
        server: "運搬人",
        seller: "受付",
        gatekeeper: "門番",
        hunter: "狩人",
        logger: "採り手",
        splitter: "職人",
        butcher: "解体係",
        builder: "建築係",
        keeper: "倉庫係",
        nightman: "夜番",
        explorer: "使者",
        boat: "川舟",
        runner: "仕込み係",
        scribe: "書記",
        officer: "役人",
        carver: "石工",
      },
      objective: {
        pickup: "出し口でしなものを受け取ろう",
        serve: "次の作業場か、市民まで運ぼう",
        coin: "落ちた印を拾おう",
        waitItem: "できあがるまで待とう",
        waitGuest: "市民を待っています",
      },
      auto: "自動送り",
      outside: "川岸",
      outsideDetail: "立て札・かがり火はこの外に置く",
    },
  },
};


export const stageList: StageDef[] = [
  stageDefs.ramen,
  stageDefs.park,
  stageDefs.onsen,
];

/** ワーキングプラネットの並び（トップページで別のかたまりに出す） */
export const planetStages: StageDef[] = [
  stageDefs.fire,
  stageDefs.taiga,
  stageDefs.moji,
];
