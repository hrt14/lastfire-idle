import { stageDefs } from "@/data/stages";

/**
 * ドリームパーク後半の進行テンポ補正。
 *
 * おみやげ通り（2.5億）の次に火山（50億）が来ていたため、
 * ここから「買える物がなく、待つだけ」になっていた。
 * ID / unlockAfter は変えず、既存セーブをそのまま使える状態で、
 * 火山を後半経済の加速地点、ナイトメアをその加速を使う終盤にする。
 */
const park = stageDefs.park;

const area = (id: string) => park.areas.find((item) => item.id === id);
const stove = (id: string) => park.stoves.find((item) => item.id === id);
const seat = (id: string) => park.seats.find((item) => item.id === id);
const hire = (id: string) => park.hires.find((item) => item.id === id);
const equipment = (id: string) => park.equipment.find((item) => item.id === id);
const upgrade = (id: string) => park.upgrades.find((item) => item.id === id);

const setPrice = (item: { price: number } | undefined, price: number) => {
  if (item) item.price = price;
};
const setSeat = (id: string, price: number, value: number) => {
  const item = seat(id);
  if (!item) return;
  item.price = price;
  item.value = value;
};

/* ---------- 1. 収益の天井を外す ---------- */
// Lv20で止まると火山以降の価格帯に届かない。終盤まで投資先を残す。
const ticketPrice = upgrade("price");
if (ticketPrice) ticketPrice.max = 32;
const gatePrice = upgrade("gate");
if (gatePrice) gatePrice.max = 28;

/* ---------- 2. 火山を「壁」ではなく「加速地点」にする ---------- */
setPrice(area("area-9"), 1_500_000_000);
setPrice(stove("crater-1"), 1_500_000_000);
setPrice(stove("crater-2"), 4_500_000_000);
setPrice(stove("crater-3"), 9_000_000_000);

setSeat("seat-9-1", 2_500_000_000, 15);
setSeat("seat-9-2", 6_000_000_000, 22);
setSeat("seat-9-3", 12_000_000_000, 30);

// 火山下層は、買った瞬間に「稼ぐ速度が変わった」と分かる主力施設にする。
setSeat("volcano-lower-1", 3_000_000_000, 45);
setSeat("volcano-lower-2", 7_500_000_000, 60);
setSeat("volcano-lower-3", 8_000_000_000, 72);
setSeat("volcano-lower-4", 14_000_000_000, 95);

setPrice(hire("cook-12"), 1_800_000_000);
setPrice(hire("cook-13"), 4_500_000_000);
setPrice(hire("cook-14"), 7_000_000_000);
setPrice(hire("waiter-6"), 2_000_000_000);
setPrice(hire("robot-6"), 6_500_000_000);
setPrice(hire("robot-volcano-lower"), 8_000_000_000);
setPrice(hire("collector-4"), 9_000_000_000);
setPrice(equipment("crater"), 8_000_000_000);

/* ---------- 3. ナイトメアは段階的に伸ばす ---------- */
setPrice(area("area-10"), 20_000_000_000);
setPrice(area("area-11"), 50_000_000_000);
setPrice(area("area-12"), 140_000_000_000);

setPrice(stove("nightmare-ticket-1"), 12_000_000_000);
setPrice(stove("nightmare-ticket-2"), 38_000_000_000);
setPrice(stove("nightmare-ticket-3"), 110_000_000_000);

setSeat("seat-10-1", 24_000_000_000, 40);
setSeat("seat-10-2", 32_000_000_000, 55);
setSeat("seat-10-3", 42_000_000_000, 70);

setSeat("seat-11-1", 60_000_000_000, 85);
setSeat("seat-11-2", 80_000_000_000, 110);
setSeat("seat-11-3", 105_000_000_000, 145);

setSeat("seat-12-1", 170_000_000_000, 180);
setSeat("seat-12-2", 220_000_000_000, 230);
setSeat("seat-12-3", 280_000_000_000, 300);

setPrice(hire("cook-horror-1"), 16_000_000_000);
setPrice(hire("waiter-horror-1"), 20_000_000_000);
setPrice(hire("cook-horror-2"), 48_000_000_000);
setPrice(hire("robot-horror-1"), 65_000_000_000);
setPrice(hire("cook-horror-3"), 130_000_000_000);
setPrice(hire("waiter-horror-2"), 160_000_000_000);
setPrice(hire("collector-horror-1"), 190_000_000_000);
