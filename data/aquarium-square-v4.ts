import type { HireSpec, Rect, Vec } from "@/lib/shop";
import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";
import {
  AQUARIUM_AREA_PATH as AREA_PATH,
  AQUARIUM_CELL_H as CELL_H,
  AQUARIUM_CELL_W as CELL_W,
} from "@/lib/aquariumLayout";

/**
 * 世界水族館 v4: square hub layout.
 *
 * 縦に18区画を積む構成をやめ、5×4グリッドを回りながら中央へ収束する。
 * 既存エンジン・既存セーブ形式は変えず、座標とスタッフ密度だけを上書きする。
 */

type AquariumRuntimeV4 = typeof aquariumRuntimeDef & {
  __squareHubV4?: boolean;
};

const runtime = aquariumRuntimeDef as AquariumRuntimeV4;

const originFor = (area: number): Vec => {
  const cell = AREA_PATH[area] ?? AREA_PATH[0];
  return { x: cell[0] * CELL_W, y: cell[1] * CELL_H };
};

const rectFor = (area: number): Rect => {
  const o = originFor(area);
  return { x0: o.x, y0: o.y, x1: o.x + CELL_W, y1: o.y + CELL_H };
};

const moveVec = (value: Vec, area: number): Vec => {
  const o = originFor(area);
  return {
    x: value.x + o.x,
    y: value.y - area * CELL_H + o.y,
  };
};

const moveRect = (value: Rect, area: number): Rect => {
  const a = moveVec({ x: value.x0, y: value.y0 }, area);
  const b = moveVec({ x: value.x1, y: value.y1 }, area);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
};

const localPos = (area: number, x: number, y: number): Vec => {
  const o = originFor(area);
  return { x: o.x + x, y: o.y + y };
};

const padInPreviousArea = (previous: Rect, next: Rect): Vec => {
  // 横移動は展示のない中段、縦移動は水槽列から離れた角に置く。
  if (next.x0 === previous.x1) {
    return { x: previous.x1 - 26, y: previous.y0 + 210 };
  }
  if (next.x1 === previous.x0) {
    return { x: previous.x0 + 26, y: previous.y0 + 210 };
  }
  if (next.y1 === previous.y0) {
    return { x: previous.x0 + 32, y: previous.y0 + 26 };
  }
  if (next.y0 === previous.y1) {
    return { x: previous.x1 - 32, y: previous.y1 - 26 };
  }
  return {
    x: (previous.x0 + previous.x1) / 2,
    y: (previous.y0 + previous.y1) / 2,
  };
};

const findHire = (id: string) => runtime.hires.find((item) => item.id === id);
const findTank = (area: number, index: number) =>
  runtime.stoves.find((item) => item.id === `tank-${area}-${index}`);
const findSeat = (area: number, index: number) =>
  runtime.seats.find((item) => item.id === `seat-${area}-${index}`);

if (!runtime.__squareHubV4) {
  runtime.__squareHubV4 = true;

  // まず、現在の縦長座標をそのまま各グリッドセルへ平行移動する。
  for (const stove of runtime.stoves) {
    stove.pos = moveVec(stove.pos, stove.area);
    if (stove.zone) stove.zone = moveRect(stove.zone, stove.area);
  }

  for (const seat of runtime.seats) {
    seat.pos = moveVec(seat.pos, seat.area);
    seat.serve = moveVec(seat.serve, seat.area);
    seat.tray = moveVec(seat.tray, seat.area);
    if (seat.pay) seat.pay = moveVec(seat.pay, seat.area);
  }

  for (const hire of runtime.hires) {
    if (!hire.outside) hire.pos = moveVec(hire.pos, hire.area);
  }

  for (const equip of runtime.equipment) {
    if (!equip.outside) equip.pos = moveVec(equip.pos, equip.area);
  }

  // アップグレード枠は入口区画に固定されている。
  for (const upgrade of runtime.upgrades) {
    upgrade.pos = moveVec(upgrade.pos, 0);
  }

  // 区画本体を5×4へ。解放枠は必ずひとつ前の区画の中に置く。
  for (let i = 0; i < runtime.areas.length; i += 1) {
    const target = runtime.areas[i];
    target.rect = rectFor(i);
    if (i === 0) {
      target.padPos = localPos(0, 180, 390);
      continue;
    }
    const previous = rectFor(i - 1);
    const next = rectFor(i);
    target.padPos = padInPreviousArea(previous, next);
    // 地域内の3展示は自由選択のまま、地域そのものは隣接区画から順に開く。
    target.unlockAfter = `area-${i - 1}`;
  }

  const entrance = localPos(0, 180, 0);
  runtime.entranceX = entrance.x;
  aquariumCardDef.entranceX = entrance.x;

  runtime.frontRoom = {
    top: originFor(0).y + 38,
    bottom: originFor(0).y + 210,
  };
  aquariumCardDef.frontRoom = runtime.frontRoom;

  runtime.startPos = localPos(0, 180, 274);
  aquariumCardDef.startPos = runtime.startPos;
  runtime.view = 440;
  aquariumCardDef.view = 440;

  // 入口まわりの購入枠は、広がったワールドの入口位置へ寄せる。
  const seller = findHire("seller-1");
  if (seller) seller.pos = { x: entrance.x - 82, y: originFor(0).y + CELL_H + 34 };
  const gatekeeper = findHire("gatekeeper-1");
  if (gatekeeper) gatekeeper.pos = { x: entrance.x + 54, y: originFor(0).y + CELL_H + 18 };

  const gate = runtime.equipment.find((item) => item.id === "gate");
  if (gate) gate.pos = { x: entrance.x - 130, y: originFor(0).y + CELL_H + 62 };
  const announce = runtime.equipment.find((item) => item.id === "announce");
  if (announce) announce.pos = { x: entrance.x + 132, y: originFor(0).y + CELL_H + 62 };

  // 中盤以降の既存スタッフは「地域を開いた直後に買える」価格へ寄せる。
  const staffPrices: Record<string, number> = {
    "cook-4": 9_000_000_000,
    "waiter-2": 650_000_000,
    "robot-2": 2_400_000_000,
    "waiter-3": 95_000_000_000,
    "robot-3": 320_000_000_000,
    "cook-5": 900_000_000_000,
  };
  for (const [id, price] of Object.entries(staffPrices)) {
    const hire = findHire(id);
    if (hire) hire.price = price;
  }

  // 「人手不足で止まる」を防ぐため、各ウイングに補助スタッフを追加する。
  const extraHires: HireSpec[] = [
    {
      id: "aquarium-relief-guide-1",
      kind: "waiter",
      pos: localPos(2, 66, 132),
      price: 2_800,
      label: "淡水館 サブ案内員",
      area: 2,
      needServed: 18,
      reveal: 3,
    },
    {
      id: "aquarium-relief-collector-1",
      kind: "collector",
      pos: localPos(3, 294, 132),
      price: 12_000,
      label: "淡水館 集金担当",
      area: 3,
      needServed: 34,
      reveal: 4,
    },
    {
      id: "aquarium-relief-guide-2",
      kind: "waiter",
      pos: localPos(6, 66, 132),
      price: 1_200_000,
      label: "熱帯淡水 案内員",
      area: 6,
      needServed: 100,
      reveal: 4,
    },
    {
      id: "aquarium-relief-robot-2",
      kind: "robot",
      pos: localPos(8, 294, 132),
      price: 28_000_000,
      label: "海水館 巡回ロボ",
      area: 8,
      needServed: 150,
      reveal: 4,
    },
    {
      id: "aquarium-relief-collector-2",
      kind: "collector",
      pos: localPos(10, 66, 132),
      price: 650_000_000,
      label: "海水館 集金担当",
      area: 10,
      needServed: 230,
      reveal: 4,
    },
    {
      id: "aquarium-relief-guide-3",
      kind: "waiter",
      pos: localPos(12, 294, 132),
      price: 9_000_000_000,
      label: "世界海域 サブ案内員",
      area: 12,
      needServed: 330,
      reveal: 4,
    },
    {
      id: "aquarium-relief-robot-3",
      kind: "robot",
      pos: localPos(14, 66, 132),
      price: 120_000_000_000,
      label: "大型水槽 巡回ロボ",
      area: 14,
      needServed: 450,
      reveal: 4,
    },
    {
      id: "aquarium-relief-collector-3",
      kind: "collector",
      pos: localPos(16, 294, 132),
      price: 900_000_000_000,
      label: "中央館 集金担当",
      area: 16,
      needServed: 590,
      reveal: 4,
    },
  ];

  for (const hire of extraHires) {
    if (!runtime.hires.some((item) => item.id === hire.id)) runtime.hires.push(hire);
  }

  // 最終区画は、施設中央の「世界の大海」。3つの小展示ではなく中央大水槽へ収束する。
  const centralArea = runtime.areas[17];
  if (centralArea) centralArea.label = "世界の大海をひらく";

  const centralNames = [
    [
      "世界魚群パノラマ",
      "WORLD OCEAN｜小型魚の群泳密度を高め、中央大水槽を世界の魚群で満たす強化展示。",
    ],
    [
      "マンタ回遊ステージ",
      "WORLD OCEAN｜マンタと大型エイを加え、中央大水槽に大きな回遊の動きを生む強化展示。",
    ],
    [
      "WORLD OCEAN 中央大水槽",
      "WORLD OCEAN · GRAND FINALE｜通常展示の約5倍。世界の魚群、マンタ、大型サメ、ジンベエザメ級の巨大魚が同じ水槽を回遊する最終ランドマーク。",
    ],
  ] as const;

  for (let index = 1; index <= 3; index += 1) {
    const tank = findTank(17, index);
    const seat = findSeat(17, index);
    const name = centralNames[index - 1];
    if (!name) continue;
    if (tank) tank.label = name[0];
    if (seat) {
      seat.label = name[0];
      seat.detail = name[1];
    }
  }

  // 中央区画は最終目標なので、購入候補にも早めに「存在だけ」見えるようにする。
  if (centralArea) centralArea.reveal = 5;
}