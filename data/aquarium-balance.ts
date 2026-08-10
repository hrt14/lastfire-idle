import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";

/**
 * 世界水族館の序盤バランス調整。
 *
 * パーク由来の「各展示の横に固定自動端末を置く」方式は、
 * 水族館では動線上に購入枠が重なりやすく、しかも最低価格 2,500円が
 * 序盤収益に対して重すぎる。そこで水族館だけ固定端末方式を使わず、
 * 数回の手動案内を経験したあとにスタッフを雇って仕事を仕組み化する。
 */
aquariumRuntimeDef.autoServer = false;
aquariumCardDef.autoServer = false;

const hire = (id: string) => aquariumRuntimeDef.hires.find((item) => item.id === id);

// まず5人は自分で「券を取る → 案内する → 回収する」を体験する。
// その後、5回ぶん程度の売上で最初の運搬を自動化できる。
const firstGuide = hire("waiter-1");
if (firstGuide) {
  firstGuide.price = 300;
  firstGuide.label = "館内案内スタッフ";
  firstGuide.pos = { x: 300, y: 135 };
  firstGuide.needServed = 5;
  delete firstGuide.unlockAfter;
}

// 最初の仕組み化を買った直後に、次の改善が見える価格帯へ。
const firstTicketStaff = hire("cook-1");
if (firstTicketStaff) {
  firstTicketStaff.price = 480;
  firstTicketStaff.unlockAfter = "waiter-1";
}

// 入場まわりも「何十回も作業してから」ではなく、数回の追加稼働で順に自動化する。
const seller = hire("seller-1");
if (seller) {
  seller.price = 650;
  seller.unlockAfter = "cook-1";
}

const gatekeeper = hire("gatekeeper-1");
if (gatekeeper) {
  gatekeeper.price = 900;
  gatekeeper.unlockAfter = "seller-1";
}

// 2区画目の高速化も、序盤の延長で届く価格に落とす。
const firstRobot = hire("robot-1");
if (firstRobot) {
  firstRobot.price = 2_400;
}
