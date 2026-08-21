import type { EquipSpec, HireSpec, StoveSpec } from "@/lib/shop";
import { formatYen } from "@/lib/format";
import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";
import {
  AQUARIUM_ANCIENT_START,
  AQUARIUM_FACILITY_START,
} from "@/lib/aquariumLayout";

/**
 * 世界水族館 v6: 施設棟と古代棟。
 *
 * 18区画の「世界の海」だけだった館を、54区画（3倍）へ広げる。
 *
 * - 施設棟（18〜21）: ミュージアムショップ / オーシャンレストラン /
 *   両生類館 / 爬虫類館。ここだけ展示以外の遊び（棚と席）が動く。
 * - 古代棟（22〜53）: 1区画ごとに時代がひとつ古くなる。
 *   最後は40億年前 ―― 生命誕生の海。
 *
 * このファイルは座標を「区画ローカル（x 0〜360 / y = area*420 + 中の位置）」で置く。
 * 9×6グリッドへの平行移動は、あとから走る data/aquarium-square-v4.ts がやる。
 */

const AREA_H = 420;
const runtime = aquariumRuntimeDef;

type ExpansionRuntime = typeof aquariumRuntimeDef & { __expansionV6?: boolean };
const flagged = runtime as ExpansionRuntime;

const SHOP_AREA = AQUARIUM_FACILITY_START; // 18
const RESTAURANT_AREA = AQUARIUM_FACILITY_START + 1; // 19
const AMPHIBIAN_AREA = AQUARIUM_FACILITY_START + 2; // 20
const REPTILE_AREA = AQUARIUM_FACILITY_START + 3; // 21

const at = (area: number, x: number, y: number) => ({ x, y: area * AREA_H + y });

const tank = (area: number, index: number) =>
  runtime.stoves.find((item) => item.id === `tank-${area}-${index}`);
const seat = (area: number, index: number) =>
  runtime.seats.find((item) => item.id === `seat-${area}-${index}`);
const areaOf = (index: number) =>
  runtime.areas.find((item) => item.id === `area-${index}`);
const upgrade = (id: string) =>
  runtime.upgrades.find((item) => item.id === id);

const addStove = (spec: StoveSpec) => {
  if (!runtime.stoves.some((item) => item.id === spec.id)) runtime.stoves.push(spec);
};
const addHire = (spec: HireSpec) => {
  if (!runtime.hires.some((item) => item.id === spec.id)) runtime.hires.push(spec);
};
const addEquip = (spec: EquipSpec) => {
  if (!runtime.equipment.some((item) => item.id === spec.id)) runtime.equipment.push(spec);
};

if (!flagged.__expansionV6) {
  flagged.__expansionV6 = true;

  const price = (area: number) => areaOf(area)?.price ?? 1;

  /* ============ 施設棟 1: ミュージアムショップ ============
   * 棚に商品を並べておくと、来館者が自分で取ってレジで払う。
   * 倉庫がないと棚は開かないので、「並べるものが無いのに棚だけある」状態は作らない。
   */
  const shopStoreId = "shop-store-1";
  addStove({
    id: shopStoreId,
    pos: at(SHOP_AREA, 180, 112),
    price: Math.round(price(SHOP_AREA) * 0.12),
    area: SHOP_AREA,
    item: "goods",
    art: "stock",
    label: "ショップ倉庫",
    reveal: 1,
  });

  const till = at(SHOP_AREA, 306, 372);
  for (let index = 1; index <= 3; index += 1) {
    const shelfTank = tank(SHOP_AREA, index);
    if (shelfTank) {
      shelfTank.unlockAfter = shopStoreId;
      shelfTank.reveal = index + 1;
    }
    const shelf = seat(SHOP_AREA, index);
    if (!shelf) continue;
    shelf.mode = "shelf";
    shelf.needs = "goods";
    shelf.pay = till;
    // 観覧券ではなく商品。1つずつ取っていくので cost は 1。
    shelf.cost = 1;
    // 売り物は観覧より単価が高い。展示3つぶんの観覧料に釣り合わせる。
    shelf.value = (shelf.value ?? 1) * 2.6;
  }

  addHire({
    id: "stocker-1",
    kind: "stocker",
    pos: at(SHOP_AREA, 66, 150),
    price: Math.round(price(SHOP_AREA) * 0.5),
    label: "ショップ品出しスタッフ",
    area: SHOP_AREA,
    reveal: 4,
  });
  addHire({
    id: "stocker-2",
    kind: "stocker",
    pos: at(SHOP_AREA, 292, 150),
    price: Math.round(price(SHOP_AREA) * 1.6),
    label: "ショップ品出しスタッフ",
    area: SHOP_AREA,
    reveal: 5,
  });

  /* ============ 施設棟 2: オーシャンレストラン ============
   * 大水槽がそのまま壁になっている席。食べ終わると皿が残るので、
   * 片づけないと次の客が座れない ―― 展示とは別のリズムがここで生まれる。
   */
  const kitchenId = "restaurant-kitchen-1";
  addStove({
    id: kitchenId,
    pos: at(RESTAURANT_AREA, 180, 112),
    price: Math.round(price(RESTAURANT_AREA) * 0.12),
    area: RESTAURANT_AREA,
    item: "food",
    art: "kitchen",
    label: "レストラン厨房",
    reveal: 1,
  });
  addStove({
    id: "restaurant-kitchen-2",
    pos: at(RESTAURANT_AREA, 262, 112),
    price: Math.round(price(RESTAURANT_AREA) * 0.9),
    area: RESTAURANT_AREA,
    item: "food",
    art: "kitchen",
    label: "レストラン第2厨房",
    reveal: 5,
  });

  for (let index = 1; index <= 3; index += 1) {
    const tableTank = tank(RESTAURANT_AREA, index);
    if (tableTank) {
      tableTank.unlockAfter = kitchenId;
      tableTank.reveal = index + 1;
    }
    const table = seat(RESTAURANT_AREA, index);
    if (!table) continue;
    table.mode = "table";
    table.needs = "food";
    table.cost = 1;
    // 食事は館内でいちばん単価が高い。そのぶん皿の片づけが要る。
    table.value = (table.value ?? 1) * 4.2;
  }

  addHire({
    id: "server-1",
    kind: "server",
    pos: at(RESTAURANT_AREA, 60, 150),
    price: Math.round(price(RESTAURANT_AREA) * 0.5),
    label: "レストラン配膳係",
    area: RESTAURANT_AREA,
    reveal: 4,
  });
  addHire({
    id: "busser-1",
    kind: "busser",
    pos: at(RESTAURANT_AREA, 300, 150),
    price: Math.round(price(RESTAURANT_AREA) * 0.7),
    label: "レストラン片づけ係",
    area: RESTAURANT_AREA,
    reveal: 4,
  });
  addHire({
    id: "server-2",
    kind: "server",
    pos: at(RESTAURANT_AREA, 120, 172),
    price: Math.round(price(RESTAURANT_AREA) * 1.8),
    label: "レストラン配膳係",
    area: RESTAURANT_AREA,
    reveal: 6,
  });
  addHire({
    id: "busser-2",
    kind: "busser",
    pos: at(RESTAURANT_AREA, 240, 172),
    price: Math.round(price(RESTAURANT_AREA) * 2.2),
    label: "レストラン片づけ係",
    area: RESTAURANT_AREA,
    reveal: 6,
  });

  /* ============ 施設棟 3・4: 両生類館 / 爬虫類館 ============
   * 水槽ではなく陸のあるケージ。ここで生きものが水から出る。
   * 遊びかたは展示と同じ（観覧券を渡す）ままにして、操作を増やさない。
   */
  addEquip({
    id: "terrarium-heat",
    name: "ケージ温調システム",
    detail: "両生類・爬虫類を通年で展示できる。集客 1.9倍",
    pos: at(AMPHIBIAN_AREA, 294, 150),
    price: Math.round(price(AMPHIBIAN_AREA) * 1.2),
    area: AMPHIBIAN_AREA,
    draw: 1.9,
    reveal: 5,
  });
  addEquip({
    id: "night-terrarium",
    name: "夜行性ゾーン",
    detail: "昼夜を反転したケージ。夜の生きものが動きだす。集客 2.0倍",
    pos: at(REPTILE_AREA, 66, 150),
    price: Math.round(price(REPTILE_AREA) * 1.4),
    area: REPTILE_AREA,
    draw: 2.0,
    reveal: 5,
  });

  addHire({
    id: "waiter-4",
    kind: "waiter",
    pos: at(AMPHIBIAN_AREA, 66, 150),
    price: Math.round(price(AMPHIBIAN_AREA) * 0.4),
    label: "両生類館 案内員",
    area: AMPHIBIAN_AREA,
    reveal: 4,
  });
  addHire({
    id: "robot-4",
    kind: "robot",
    pos: at(REPTILE_AREA, 292, 150),
    price: Math.round(price(REPTILE_AREA) * 0.8),
    label: "爬虫類館 巡回ロボ",
    area: REPTILE_AREA,
    reveal: 4,
  });

  /* ============ 古代棟の運営 ============
   * 32区画ぶんの来館をさばく発券・案内・集金。
   * 8区画ごとに発券端末を1台足して、券が切れて進めない状態を作らない。
   */
  const wingTickets: { area: number; label: string }[] = [
    { area: AQUARIUM_ANCIENT_START, label: "古代棟 発券端末" },
    { area: AQUARIUM_ANCIENT_START + 8, label: "中生代ゾーン 発券端末" },
    { area: AQUARIUM_ANCIENT_START + 16, label: "古生代ゾーン 発券端末" },
    { area: AQUARIUM_ANCIENT_START + 24, label: "先カンブリア 発券端末" },
  ];

  wingTickets.forEach(({ area, label }, i) => {
    const stoveId = `stove-${6 + i}`;
    addStove({
      id: stoveId,
      pos: at(area, 180, 112),
      price: Math.round(price(area) * 0.45),
      area,
      label,
      reveal: 3,
    });
    addHire({
      id: `cook-${6 + i}`,
      kind: "cook",
      pos: at(area, 252, 112),
      price: Math.round(price(area) * 1.1),
      label: `${label.replace("発券端末", "発券スタッフ")}`,
      stoveId,
      area,
      reveal: 4,
    });
  });

  const ancientCrew: { area: number; kind: HireSpec["kind"]; label: string; mul: number }[] = [
    { area: AQUARIUM_ANCIENT_START + 2, kind: "waiter", label: "古代棟 案内員", mul: 0.6 },
    { area: AQUARIUM_ANCIENT_START + 5, kind: "robot", label: "古代棟 巡回ロボ", mul: 0.9 },
    { area: AQUARIUM_ANCIENT_START + 9, kind: "collector", label: "古代棟 集金担当", mul: 0.7 },
    { area: AQUARIUM_ANCIENT_START + 13, kind: "waiter", label: "中生代ゾーン 案内員", mul: 0.6 },
    { area: AQUARIUM_ANCIENT_START + 17, kind: "robot", label: "古生代ゾーン 巡回ロボ", mul: 0.9 },
    { area: AQUARIUM_ANCIENT_START + 21, kind: "collector", label: "古生代ゾーン 集金担当", mul: 0.7 },
    { area: AQUARIUM_ANCIENT_START + 25, kind: "waiter", label: "先カンブリア 案内員", mul: 0.6 },
    { area: AQUARIUM_ANCIENT_START + 29, kind: "robot", label: "原生代ゾーン 巡回ロボ", mul: 0.9 },
  ];

  ancientCrew.forEach(({ area, kind, label, mul }, i) => {
    addHire({
      id: `ancient-crew-${i + 1}`,
      kind,
      pos: at(area, i % 2 ? 292 : 66, 150),
      price: Math.round(price(area) * mul),
      label,
      area,
      reveal: 4,
    });
  });

  /* 集客設備。時代をさかのぼるほど「ここでしか見られない」ものになる */
  const ancientDraw: { area: number; id: string; name: string; detail: string; draw: number }[] = [
    {
      area: AQUARIUM_ANCIENT_START + 3,
      id: "time-tunnel",
      name: "タイムトンネル入口",
      detail: "古代棟の入口に時代表示のトンネルを作る。集客 2.2倍",
      draw: 2.2,
    },
    {
      area: AQUARIUM_ANCIENT_START + 11,
      id: "fossil-lab",
      name: "化石クリーニング室",
      detail: "来館者の前で化石を掘り出して見せる。集客 2.4倍",
      draw: 2.4,
    },
    {
      area: AQUARIUM_ANCIENT_START + 19,
      id: "paleo-dome",
      name: "古生代ドームシアター",
      detail: "天井いっぱいに古い海を映す。集客 2.6倍",
      draw: 2.6,
    },
    {
      area: AQUARIUM_ANCIENT_START + 27,
      id: "origin-hall",
      name: "生命誕生ホール",
      detail: "40億年を9分で歩く展示。世界中から人が来る。集客 3.0倍",
      draw: 3.0,
    },
  ];

  for (const item of ancientDraw) {
    addEquip({
      id: item.id,
      name: item.name,
      detail: item.detail,
      pos: at(item.area, item.id === "fossil-lab" || item.id === "origin-hall" ? 270 : 90, 150),
      price: Math.round(price(item.area) * 1.6),
      area: item.area,
      draw: item.draw,
      reveal: 5,
    });
  }

  /* ============ 強化枠の上限 ============
   * 区画が3倍になったので、券をまとめて持てる量と館内の足も伸ばす。
   * 1回の往復で2展示ぶん配れると、広い館でも歩かされている感じが減る。
   */
  /*
   * 入場料の強化。
   *
   * 観覧料の収入は、館が大きくなるほど薄まる ―― 来館者は開いている162展示から
   * 行き先をランダムに選ぶので、古くて安い展示に当たる確率が上がっていく。
   * 入場料は入口で1人につき1回だけ取るので、この薄まりを受けない。
   * 終盤の「どこへ投資するか」を、展示だけの一本道にしないための2本目の柱。
   *
   * 上限を Lv72 まで伸ばしてあるのは、観覧単価の強化がとびとびだから。
   * あちらは1段 1.6倍ずつ高くなるので、終盤は1段買うのに何十分もかかる ――
   * そのあいだ、ほかに買えるものが何もないと、区画が開かない時間がただ続く。
   * 入場料はそれより一桁安いところを刻んでいくので、
   * 高い1段を貯めているあいだの「いま買えるもの」になる。
   * 費用の伸び（1.7）は入場料の伸び（1.45）より速いので、
   * こちらも際限なくは買えず、どこで打ち切るかは投資判断のまま残る。
   */
  if (!runtime.upgrades.some((item) => item.id === "gate")) {
    runtime.upgrades.push({
      id: "gate",
      name: "入場料",
      detail: (n) => `入場料 1人 ${formatYen((runtime.admission ?? 30) * Math.pow(1.45, n))}`,
      // 発券カウンターの下。外に出すとファサードの看板に重なる。
      pos: at(0, 128, 172),
      basePrice: 1_400,
      growth: 1.7,
      max: 72,
      needServed: 60,
      reveal: 5,
    });
    aquariumCardDef.upgrades = runtime.upgrades;
  }

  const carry = upgrade("carry");
  if (carry) carry.max = 16;
  const speed = upgrade("speed");
  if (speed) speed.max = 18;
  const cook = upgrade("cook");
  if (cook) cook.max = 20;

  /* 最終区画は、館の順路の終わり。入口のとなりの扉が40億年前へ続く */
  const originArea = areaOf(runtime.areas.length - 1);
  if (originArea) originArea.reveal = 5;

  aquariumCardDef.stoves = runtime.stoves;
  aquariumCardDef.seats = runtime.seats;
  aquariumCardDef.hires = runtime.hires;
  aquariumCardDef.equipment = runtime.equipment;
}
