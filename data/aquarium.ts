import type {
  AreaSpec,
  EquipSpec,
  HireSpec,
  SeatSpec,
  StaffKind,
  StoveSpec,
  Upgrade,
} from "@/lib/shop";
import {
  stageDefs,
  stageList,
  type StageDef,
  type StageId,
  type StageLabels,
} from "@/data/stages";

/**
 * はんじょうダッシュ「世界水族館」
 *
 * 専用エンジンは作らず、既存のドリームパークの仕組みを再利用する。
 * - 券売所 = 既存の producer
 * - 水槽 = 「魚が泳ぐ」既存の fish art を持つ作業場
 * - 観覧スポット = 既存の ride seat
 * - 地域追加 = 既存の area unlock
 * - 案内員 / 発券スタッフ / 自動化 = 既存 staff / equipment
 *
 * 水槽を買うと価格0の観覧スポットが同時に開くため、
 * 「新しい生き物を入れる → すぐ客が見に来る」が既存ロジックだけで成立する。
 */

const AQUARIUM_ID = "aquarium";
const AREA_H = 420;

const regionPrices = [
  0,
  2_800,
  18_000,
  85_000,
  360_000,
  1_400_000,
  6_000_000,
  24_000_000,
  90_000_000,
  360_000_000,
  1_400_000_000,
  5_000_000_000,
  18_000_000_000,
  65_000_000_000,
  220_000_000_000,
  700_000_000_000,
  2_000_000_000_000,
  6_000_000_000_000,
];

const regions = [
  {
    name: "日本の里川",
    chapter: "FRESH WATER · JAPAN",
    floor: "#274f57",
    deep: "#18363d",
    species: [
      ["メダカの群れ", "小さなメダカが泳ぎ始める。世界水族館の最初の命。"],
      ["ドジョウとフナ", "川底をドジョウが進み、その上をフナが泳ぐ。"],
      ["オイカワ・タナゴ・ナマズ", "色のある小魚が増え、最後にナマズが加わって里川が完成。"],
    ],
  },
  {
    name: "日本の渓流",
    chapter: "FRESH WATER · JAPAN",
    floor: "#315f69",
    deep: "#1c4149",
    species: [
      ["アユ", "澄んだ流れをアユが泳ぐ渓流水槽。"],
      ["ヤマメ", "岩陰と速い流れを好むヤマメが加わる。"],
      ["イワナ", "冷たい山の水を象徴するイワナで日本の渓流が完成。"],
    ],
  },
  {
    name: "東アジアの大河",
    chapter: "FRESH WATER · EAST ASIA",
    floor: "#526455",
    deep: "#334238",
    species: [
      ["コイの群れ", "川幅が広がり、力強いコイの群れが現れる。"],
      ["フナ・ドジョウ", "底生魚も増え、大河の層が厚くなる。"],
      ["大型ナマズ", "小魚の水槽から一段大きな淡水魚の世界へ。"],
    ],
  },
  {
    name: "メコン川",
    chapter: "FRESH WATER · MEKONG",
    floor: "#52634a",
    deep: "#33402d",
    species: [
      ["ラスボラ", "熱帯の小型魚が群れ、展示の色が一気に変わる。"],
      ["グラミー・ナイフフィッシュ", "姿の違う魚が増え、東南アジアらしい水槽になる。"],
      ["メコンの巨大ナマズ", "初めて明確な巨大魚が登場する淡水の見せ場。"],
    ],
  },
  {
    name: "東南アジア 水没森林",
    chapter: "FRESH WATER · FLOODED FOREST",
    floor: "#254b3f",
    deep: "#16332b",
    species: [
      ["ベタと小型魚", "木の根の間を小型魚が泳ぐ水没森林。"],
      ["クラウンローチ", "底を動く鮮やかな魚が追加される。"],
      ["アジアアロワナ", "水面近くを大型魚が悠々と泳ぎ、森林展示が完成。"],
    ],
  },
  {
    name: "アフリカの湖と川",
    chapter: "FRESH WATER · AFRICA",
    floor: "#5b5840",
    deep: "#3a3827",
    species: [
      ["コンゴテトラ", "銀色の群泳魚がきらめくアフリカ河川水槽。"],
      ["カラフルシクリッド", "色とりどりの魚が岩場を埋める湖沼展示。"],
      ["ナイルパーチ級大型魚", "アフリカ淡水エリアの主役となる大型魚。"],
    ],
  },
  {
    name: "アマゾン熱帯雨林",
    chapter: "FRESH WATER · AMAZON",
    floor: "#214c43",
    deep: "#13342e",
    species: [
      ["ネオンテトラの大群", "小さな光のような魚が群れ、水中の森を満たす。"],
      ["コリドラス・エンゼルフィッシュ", "水底と中層の生き物が増えて密度が上がる。"],
      ["ディスカス", "鮮やかな円盤形の魚が加わり、熱帯雨林水槽が完成。"],
    ],
  },
  {
    name: "AMAZON GREAT RIVER",
    chapter: "FRESH WATER · GRAND FINALE",
    floor: "#183f3a",
    deep: "#0e2a27",
    species: [
      ["ピラニア", "群れで泳ぐピラニアの専用展示。"],
      ["淡水エイ・アロワナ", "水底のエイと水面のアロワナで巨大水槽が立体的になる。"],
      ["ピラルク", "淡水編の主役。巨大なピラルクが入って川の旅が完成する。"],
    ],
  },
  {
    name: "日本の海",
    chapter: "OCEAN · JAPAN",
    floor: "#174e68",
    deep: "#0d3448",
    species: [
      ["イワシ・アジの群れ", "川から海へ。初めて大きな群泳が館内に現れる。"],
      ["タイ・カサゴ", "岩礁の魚が増えて日本沿岸の景色になる。"],
      ["タコ・ウツボ", "形も動きも違う生き物が加わり、海水編らしさが強くなる。"],
    ],
  },
  {
    name: "北の海",
    chapter: "OCEAN · COLD WATER",
    floor: "#315c73",
    deep: "#1c3d50",
    species: [
      ["サケ", "冷たい青の水槽をサケが力強く泳ぐ。"],
      ["ホッケと冷水魚", "温かい海とは違う落ち着いた魚群展示。"],
      ["北海のカニ", "海底にも生き物が増え、北の海が完成する。"],
    ],
  },
  {
    name: "沖縄 サンゴ礁",
    chapter: "OCEAN · OKINAWA",
    floor: "#147b83",
    deep: "#075463",
    species: [
      ["クマノミ・スズメダイ", "一気にカラフルになるサンゴ礁の入口。"],
      ["チョウチョウウオ・ツノダシ", "サンゴの上を鮮やかな魚が埋めていく。"],
      ["ウミガメ", "小魚の群れの上をウミガメが泳ぐ沖縄エリアの主役。"],
    ],
  },
  {
    name: "CALIFORNIA KELP FOREST",
    chapter: "OCEAN · KELP FOREST",
    floor: "#285a52",
    deep: "#163b37",
    species: [
      ["ケルプの小魚群", "巨大海藻の森を小魚が行き交う。"],
      ["ロックフィッシュ", "サンゴ礁とは違う魚種で海藻の森が濃くなる。"],
      ["小型サメ", "ケルプの間をサメが横切り、展示の迫力が上がる。"],
    ],
  },
  {
    name: "東南アジアの海",
    chapter: "OCEAN · SOUTH EAST ASIA",
    floor: "#176b76",
    deep: "#0b4754",
    species: [
      ["ハナダイの大群", "高密度の熱帯魚で水槽が埋まり始める。"],
      ["ミノカサゴ・フグ", "特徴的な姿の魚が次々と追加される。"],
      ["小型エイ", "水底を滑るエイが加わり、生き物の動きが多彩になる。"],
    ],
  },
  {
    name: "GREAT REEF",
    chapter: "OCEAN · AUSTRALIA",
    floor: "#167784",
    deep: "#09515d",
    species: [
      ["巨大サンゴ礁の魚群", "多数の小型魚がサンゴ礁を覆う大展示。"],
      ["ウミガメ・大型エイ", "大型生物が同じ水槽に入り、スケールが一段上がる。"],
      ["リーフシャーク", "サンゴ礁をサメが巡回し、グレートリーフが完成。"],
    ],
  },
  {
    name: "INDIAN OCEAN",
    chapter: "OCEAN · INDIAN OCEAN",
    floor: "#165f73",
    deep: "#0b4050",
    species: [
      ["ナポレオンフィッシュ", "一匹の存在感が大きい大型魚展示へ移る。"],
      ["大型エイ", "翼のように泳ぐ大型エイが水槽を横切る。"],
      ["大型サメ", "魚の数だけでなくサイズでも圧倒する海域が完成。"],
    ],
  },
  {
    name: "OPEN OCEAN",
    chapter: "OCEAN · OPEN OCEAN",
    floor: "#0f506c",
    deep: "#082f45",
    species: [
      ["イワシ200匹級の大群", "画面を埋める大群泳。外洋巨大水槽の始まり。"],
      ["マグロ・カツオ", "高速で泳ぐ大型回遊魚が群れの中へ入る。"],
      ["サメ・大型エイ", "大群の上を巨大魚が横切る外洋のクライマックス。"],
    ],
  },
  {
    name: "DEEP SEA",
    chapter: "OCEAN · DEEP SEA",
    floor: "#18243d",
    deep: "#090f22",
    species: [
      ["オオグソクムシ", "暗い海底に奇妙な深海生物が現れる。"],
      ["タカアシガニ", "脚の長い巨大なカニが深海展示の主役になる。"],
      ["発光深海魚", "暗闇に光る生き物が増え、館内の雰囲気が完全に変わる。"],
    ],
  },
  {
    name: "WORLD OCEAN",
    chapter: "WORLD OCEAN · GRAND FINALE",
    floor: "#0b4664",
    deep: "#05283e",
    species: [
      ["世界の魚群", "これまでの旅を象徴する巨大な魚群が中央水槽を満たす。"],
      ["マンタ・大型サメ", "巨大なシルエットが何枚も水槽を横切る。"],
      ["ジンベエザメ級の巨大魚", "最後の主役。メダカ数匹から始まった水族館が完成する。"],
    ],
  },
] as const;

const tankId = (area: number, index: number) => `tank-${area}-${index}`;
const seatId = (area: number, index: number) => `seat-${area}-${index}`;

const aquariumAreas: AreaSpec[] = regions.map((region, area) => {
  const y0 = area * AREA_H;
  return {
    id: `area-${area}`,
    label: area === 0 ? region.name : `${region.name}をひらく`,
    price: regionPrices[area],
    rect: { x0: 0, y0, x1: 360, y1: y0 + AREA_H },
    // 次の展示室の直前、いま開いている展示室側に解放枠を置く。
    padPos: area === 0 ? { x: 0, y: 0 } : { x: 180, y: y0 - 24 },
    palette: { floor: region.floor, deep: region.deep, prop: "none" },
    unlockAfter: area === 0 ? undefined : tankId(area - 1, 3),
  };
});

const aquariumTanks: StoveSpec[] = [];
const aquariumSeats: SeatSpec[] = [];

for (let area = 0; area < regions.length; area += 1) {
  const region = regions[area];
  const y0 = area * AREA_H;
  const areaBase = Math.max(100, regionPrices[area]);
  const tankPrices =
    area === 0
      ? [0, 80, 220]
      : [
          Math.max(100, Math.round(areaBase * 0.1)),
          Math.max(180, Math.round(areaBase * 0.18)),
          Math.max(300, Math.round(areaBase * 0.32)),
        ];

  region.species.forEach(([label, detail], rawIndex) => {
    const index = rawIndex + 1;
    const x = 60 + rawIndex * 120;
    const tank = tankId(area, index);
    const seat = seatId(area, index);
    const previous = index === 1 ? undefined : tankId(area, index - 1);
    const ticketCost = Math.min(7, 1 + Math.floor(area / 3));

    aquariumTanks.push({
      id: tank,
      pos: { x, y: y0 + 320 },
      price: tankPrices[rawIndex],
      area,
      label,
      art: `aquarium-${area}-${index}`,
      // display用。通常の券供給源にならないよう、完成を事実上止める。
      work: 999_999,
      hold: 1,
      unlockAfter: previous,
      zone: { x0: x - 50, y0: y0 + 168, x1: x + 50, y1: y0 + 306 },
    });

    aquariumSeats.push({
      id: seat,
      pos: { x, y: y0 + 385 },
      serve: { x, y: y0 + 344 },
      tray: { x, y: y0 + 360 },
      price: 0,
      area,
      label,
      detail: `${region.chapter}｜${detail}`,
      cost: ticketCost,
      value: ticketCost * (1.25 + area * 0.08 + rawIndex * 0.05),
      unlockAfter: tank,
    });
  });
}

/** 観覧券を作る場所。エリアが伸びると館内にも増えて客数に追いつく。 */
const aquariumTicketStoves: StoveSpec[] = [
  { id: "stove-1", pos: { x: 180, y: 112 }, price: 0, area: 0, label: "総合発券カウンター" },
  { id: "stove-2", pos: { x: 180, y: 4 * AREA_H + 112 }, price: 120_000, area: 4, label: "淡水館 発券端末" },
  { id: "stove-3", pos: { x: 180, y: 8 * AREA_H + 112 }, price: 42_000_000, area: 8, label: "海水館 発券端末" },
  { id: "stove-4", pos: { x: 180, y: 12 * AREA_H + 112 }, price: 12_000_000_000, area: 12, label: "世界の海 発券端末" },
  { id: "stove-5", pos: { x: 180, y: 16 * AREA_H + 112 }, price: 1_200_000_000_000, area: 16, label: "深海館 発券端末" },
];

const aquariumHires: HireSpec[] = [
  { id: "cook-1", kind: "cook", pos: { x: 245, y: 112 }, price: 420, label: "発券スタッフ", stoveId: "stove-1", area: 0, unlockAfter: "tank-0-2" },
  { id: "waiter-1", kind: "waiter", pos: { x: 70, y: 135 }, price: 700, label: "館内案内員", area: 0, unlockAfter: "tank-0-3" },
  { id: "seller-1", kind: "seller", pos: { x: 222, y: 0 }, price: 1_400, label: "入場券係", area: 0, outside: true, unlockAfter: "waiter-1" },
  { id: "gatekeeper-1", kind: "gatekeeper", pos: { x: 340, y: 0 }, price: 3_400, label: "入場ゲート係", area: 0, outside: true, unlockAfter: "seller-1" },
  { id: "robot-1", kind: "robot", pos: { x: 290, y: AREA_H + 120 }, price: 12_000, label: "案内ロボ", area: 1 },
  { id: "cook-2", kind: "cook", pos: { x: 245, y: 4 * AREA_H + 112 }, price: 180_000, label: "淡水館 発券スタッフ", stoveId: "stove-2", area: 4 },
  { id: "collector-1", kind: "collector", pos: { x: 70, y: 5 * AREA_H + 120 }, price: 2_800_000, label: "自動集金担当", area: 5 },
  { id: "cook-3", kind: "cook", pos: { x: 245, y: 8 * AREA_H + 112 }, price: 58_000_000, label: "海水館 発券スタッフ", stoveId: "stove-3", area: 8 },
  { id: "waiter-2", kind: "waiter", pos: { x: 70, y: 10 * AREA_H + 120 }, price: 1_800_000_000, label: "海水館 案内員", area: 10 },
  { id: "robot-2", kind: "robot", pos: { x: 290, y: 11 * AREA_H + 120 }, price: 8_000_000_000, label: "海水館 案内ロボ", area: 11 },
  { id: "cook-4", kind: "cook", pos: { x: 245, y: 12 * AREA_H + 112 }, price: 24_000_000_000, label: "世界の海 発券スタッフ", stoveId: "stove-4", area: 12 },
  { id: "waiter-3", kind: "waiter", pos: { x: 70, y: 14 * AREA_H + 120 }, price: 300_000_000_000, label: "大型水槽 案内員", area: 14 },
  { id: "robot-3", kind: "robot", pos: { x: 290, y: 15 * AREA_H + 120 }, price: 900_000_000_000, label: "外洋案内ロボ", area: 15 },
  { id: "cook-5", kind: "cook", pos: { x: 245, y: 16 * AREA_H + 112 }, price: 2_400_000_000_000, label: "深海館 発券スタッフ", stoveId: "stove-5", area: 16 },
  { id: "master-1", kind: "master", pos: { x: 180, y: 17 * AREA_H + 120 }, price: 8_000_000_000_000, label: "世界水族館 館長", area: 17 },
];

const aquariumEquipment: EquipSpec[] = [
  { id: "gate", name: "自動入場ゲート", detail: "入場処理を自動化する", pos: { x: 112, y: 0 }, price: 18_000, area: 0, outside: true, unlockAfter: "gatekeeper-1" },
  { id: "announce", name: "館内アナウンス", detail: "展示の魅力を知らせて集客 1.35倍", pos: { x: 280, y: 0 }, price: 75_000, area: 0, outside: true, row: 1, draw: 1.35, unlockAfter: "area-2" },
  { id: "jelly-light", name: "水槽ライティング", detail: "幻想的な照明で集客 1.45倍", pos: { x: 90, y: 6 * AREA_H + 120 }, price: 12_000_000, area: 6, draw: 1.45 },
  { id: "ocean-sign", name: "海水館 巨大サイネージ", detail: "海水館オープンを告知。集客 1.6倍", pos: { x: 270, y: 8 * AREA_H + 120 }, price: 180_000_000, area: 8, draw: 1.6 },
  { id: "night", name: "ナイトアクアリウム", detail: "夜の水族館を開催。集客 1.8倍", pos: { x: 90, y: 12 * AREA_H + 120 }, price: 45_000_000_000, area: 12, draw: 1.8 },
  { id: "world-pr", name: "WORLD OCEAN CAMPAIGN", detail: "世界水族館として話題になる。集客 2.2倍", pos: { x: 270, y: 15 * AREA_H + 120 }, price: 1_200_000_000_000, area: 15, draw: 2.2 },
];

const aquariumUpgrades: Upgrade[] = [
  { id: "carry", name: "チケットホルダー", detail: (n) => `${3 + n}枚まで持てる・案内員も ${3 + Math.floor(n / 2)}枚`, pos: { x: 46, y: 66 }, basePrice: 70, growth: 1.7, max: 10, unlockAfter: "tank-0-2" },
  { id: "speed", name: "館内シューズ", detail: (n) => `移動速度 +${n * 10}%・スタッフも +${n * 5}%`, pos: { x: 138, y: 66 }, basePrice: 60, growth: 1.65, max: 12, unlockAfter: "waiter-1" },
  { id: "cook", name: "高速発券端末", detail: (n) => `発券速度 +${Math.round((Math.pow(1 / 0.92, n) - 1) * 100)}%`, pos: { x: 230, y: 66 }, basePrice: 100, growth: 1.7, max: 14, unlockAfter: "stove-2" },
  { id: "price", name: "プレミアム観覧券", detail: (n) => `観覧単価 ${Math.round(60 * Math.pow(1.4, n))}円`, pos: { x: 314, y: 66 }, basePrice: 140, growth: 1.75, max: 20, unlockAfter: "tank-1-3" },
];

const staffLabels: Record<StaffKind, string> = {
  waiter: "館内案内員",
  robot: "案内ロボ",
  collector: "集金係",
  cook: "発券スタッフ",
  master: "館長",
  busser: "清掃スタッフ",
  stocker: "ショップ品出し",
  server: "カフェスタッフ",
  seller: "入場券係",
  gatekeeper: "入場ゲート係",
  hunter: "飼育員",
  logger: "飼育員",
  splitter: "飼育員",
  butcher: "飼育員",
  builder: "施工スタッフ",
  keeper: "飼育員",
  nightman: "ナイト担当",
  explorer: "調査員",
  runner: "飼育員",
  boat: "運搬ボート",
};

const aquariumLabels: StageLabels = {
  item: "観覧券",
  producer: "発券端末",
  tray: "展示入口",
  guest: "来館者",
  using: "観覧中",
  staff: staffLabels,
  objective: {
    pickup: "発券端末から観覧券を取ろう",
    serve: "展示を待っている来館者へ観覧券を渡そう",
    coin: "観覧を終えた来館者の売上を回収しよう",
    waitItem: "観覧券ができるのを待とう",
    waitGuest: "次の来館者を待とう",
  },
  outside: "水族館エントランス",
  outsideDetail: "入場ゲートと集客設備を置くエントランス",
  auto: "自動案内端末",
};

/**
 * Runtime側は id を park にして、既存のパーク専用描画（観覧券・来場客）を使う。
 * 保存キーとトップカードは下の aquarium id を使うので、ドリームパークの進行とは分離される。
 */
const aquariumRuntimeDef: StageDef = {
  id: "park",
  visualTheme: "aquarium",
  name: "世界水族館",
  subtitle: "メダカから世界の大海へ",
  icon: "🐠",
  itemIcon: "🎟️",
  frontRoom: { top: 38, bottom: 210 },
  areas: aquariumAreas,
  stoves: [...aquariumTicketStoves, ...aquariumTanks],
  seats: aquariumSeats,
  hires: aquariumHires,
  equipment: aquariumEquipment,
  upgrades: aquariumUpgrades,
  labels: aquariumLabels,
  baseValue: 60,
  admission: 20,
  autoServer: true,
  requiresAreas: 0,
  start: ["stove-1", "tank-0-1", "seat-0-1"],
  queue: true,
  view: 380,
  startPos: { x: 180, y: 245 },
};

const aquariumStageId = AQUARIUM_ID as unknown as StageId;
const aquariumCardDef: StageDef = {
  ...aquariumRuntimeDef,
  id: aquariumStageId,
};

// stageDefs / stageList は既存データを壊さず、起動時に水族館だけ追加する。
const runtimeDefs = stageDefs as unknown as Record<string, StageDef>;
runtimeDefs[AQUARIUM_ID] = aquariumRuntimeDef;

if (!stageList.some((item) => String(item.id) === AQUARIUM_ID)) {
  stageList.push(aquariumCardDef);
}

export { aquariumCardDef, aquariumRuntimeDef };
