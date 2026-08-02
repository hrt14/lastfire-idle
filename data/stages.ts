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
): SeatSpec[] =>
  xs.map((x, i) => ({
    id: `seat-${area}-${i + 1}`,
    pos: { x, y: baseY + 64 },
    serve: { x, y: baseY },
    tray: { x, y: baseY + 24 },
    price: prices[i],
    area,
    label,
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
];

const ramenSeats: SeatSpec[] = [
  ...seatRow(0, [60, 140, 220, 300], 294, [0, 0, 100, 300], "カウンター席"),
  ...seatRow(1, [80, 180, 280], 552, [400, 900, 2000], "テーブル席"),
  ...seatRow(3, [432, 516, 600, 684], 552, [9000, 18000, 34000, 60000], "座敷席"),
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
];

const parkStoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 72, y: 176 }, price: 0, area: 0 },
  { id: "stove-2", pos: { x: 180, y: 176 }, price: 200, area: 0 },
  { id: "stove-3", pos: { x: 288, y: 176 }, price: 900, area: 0 },
  { id: "stove-4", pos: { x: 180, y: 656 }, price: 34000, area: 2 },
  { id: "stove-5", pos: { x: 540, y: 1136 }, price: 900000, area: 5 },
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
  }));

const parkSeats: SeatSpec[] = [
  ...rideRow(0, 294, [
    { x: 60, price: 0, label: "コーヒーカップ", art: "teacup", detail: "くるくる回るカップ" },
    { x: 140, price: 0, label: "パンダライド", art: "panda", detail: "小さな子に人気の乗り物" },
    { x: 220, price: 140, label: "射的コーナー", art: "shooting", detail: "的を撃ち抜く縁日ゲーム" },
    { x: 300, price: 420, label: "ミニ観覧車", art: "wheel", detail: "広場を見下ろす小さな観覧車" },
  ]),
  ...rideRow(1, 294, [
    { x: 432, price: 1200, label: "メリーゴーラウンド", art: "carousel", detail: "白馬がゆっくり上下する" },
    { x: 540, price: 3000, label: "ゆめの気球", art: "balloonride", detail: "気球のゴンドラで空へ" },
    { x: 648, price: 7000, label: "おとぎの城ツアー", art: "castleride", detail: "城の中をトロッコで巡る" },
  ]),
  ...rideRow(2, 774, [
    { x: 72, price: 12000, label: "そりコースター", art: "sled", detail: "雪山を一気に滑り降りる" },
    { x: 180, price: 26000, label: "スケートリンク", art: "rink", detail: "氷の上をくるくる滑る" },
    { x: 288, price: 52000, label: "ペンギンボート", art: "penguin", detail: "氷の水路をボートで進む" },
  ]),
  ...rideRow(3, 774, [
    { x: 432, price: 70000, label: "ガンマンショー", art: "showdown", detail: "早撃ち対決の生ショー" },
    { x: 540, price: 140000, label: "幌馬車ライド", art: "wagon", detail: "馬車に揺られて町を一周" },
    { x: 648, price: 260000, label: "鉱山トロッコ", art: "minecart", detail: "坑道を走る暴走トロッコ" },
  ]),
  ...rideRow(4, 1254, [
    { x: 72, price: 300000, label: "バイキング船", art: "viking", detail: "大きく揺れる海賊船" },
    { x: 180, price: 560000, label: "大砲チャレンジ", art: "cannon", detail: "的をねらって大砲を撃つ" },
    { x: 288, price: 980000, label: "急流いかだ下り", art: "raft", detail: "水しぶきを浴びて川を下る" },
  ]),
  ...rideRow(5, 1254, [
    { x: 432, price: 1400000, label: "ロケット発射", art: "rocket", detail: "打ち上げの瞬間を体験" },
    { x: 540, price: 2600000, label: "無重力スピナー", art: "spinner", detail: "回って浮かぶ無重力体験" },
    { x: 648, price: 4800000, label: "宇宙シアター", art: "theater", detail: "ドーム映像で宇宙を旅する" },
  ]),
  ...rideRow(6, 294, [
    { x: 792, price: 6000000, label: "恐竜ライド", art: "dino", detail: "首長竜の背中に乗る" },
    { x: 900, price: 11000000, label: "化石発掘場", art: "dig", detail: "砂を掘って化石を探す" },
    { x: 1008, price: 20000000, label: "翼竜フライト", art: "ptera", detail: "翼竜にぶら下がって旋回" },
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
