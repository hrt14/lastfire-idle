import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";

/**
 * 世界水族館 v2 バランス。
 *
 * 目的:
 * - 発券スタッフを序盤から外す（序盤のボトルネックではない）
 * - 5回前後の手動プレイ後に、意味のある自動化を買える
 * - 「Aを買うとBが出る」一本道をやめる
 * - 各地域の3展示は好きな順で投資できる
 * - 現在地域を充実させるか、次地域へ進むかを選べる
 * - 常時5〜7個ほどの投資候補が見える
 * - 序盤の売上を少し増やし、後半も観覧単価が地域価格に追いつく
 * - 展示が増えるほど来館者が館内を回り、1人あたり売上も自然に伸びる
 */

// 各展示横の固定自動端末は水族館では使わない。
aquariumRuntimeDef.autoServer = false;
aquariumCardDef.autoServer = false;

// 世界水族館は地域解放価格が数兆円まで伸びる一方、旧設定では観覧単価強化が
// Lv20で止まり、後半に「稼ぎを伸ばす手段がない」状態になっていた。
// 序盤は1来館あたり約3割だけ稼ぎやすくし、後半は価格強化を継続できるようにする。
const AQUARIUM_BASE_VALUE = 75;
const AQUARIUM_ADMISSION = 30;

aquariumRuntimeDef.baseValue = AQUARIUM_BASE_VALUE;
aquariumCardDef.baseValue = AQUARIUM_BASE_VALUE;
aquariumRuntimeDef.admission = AQUARIUM_ADMISSION;
aquariumCardDef.admission = AQUARIUM_ADMISSION;

// queue=true だと来館者は展示を1つ見たら帰る。
// 水族館では展示が増えるほど館内を回る方が自然で、投資がそのまま客単価の成長になる。
// queue=false の通常パーク動作では、展示数に応じて1人が複数展示を巡る。
aquariumRuntimeDef.queue = false;
aquariumCardDef.queue = false;

// 少し先まで選択肢を見せて「次に何を買うか」を考えられる状態にする。
aquariumRuntimeDef.revealLimit = 7;
aquariumRuntimeDef.revealBurst = 7;
aquariumCardDef.revealLimit = 7;
aquariumCardDef.revealBurst = 7;

const hires = aquariumRuntimeDef.hires;
const hire = (id: string) => hires.find((item) => item.id === id);
const tank = (area: number, index: number) =>
  aquariumRuntimeDef.stoves.find((item) => item.id === `tank-${area}-${index}`);
const area = (index: number) =>
  aquariumRuntimeDef.areas.find((item) => item.id === `area-${index}`);
const upgrade = (id: string) =>
  aquariumRuntimeDef.upgrades.find((item) => item.id === id);

// --- 序盤の仕事と自動化 -------------------------------------------------

// 発券スタッフは、最初の水槽では券生成がボトルネックにならず投資価値が薄い。
// 1号館からは削除し、発券量が増える中盤以降のスタッフだけ残す。
const firstTicketIndex = hires.findIndex((item) => item.id === "cook-1");
if (firstTicketIndex >= 0) hires.splice(firstTicketIndex, 1);

// 5人ほど自分で案内したら、最初の意味ある仕組み化。
const firstGuide = hire("waiter-1");
if (firstGuide) {
  firstGuide.price = 300;
  firstGuide.label = "館内案内スタッフ";
  firstGuide.pos = { x: 300, y: 135 };
  firstGuide.needServed = 5;
  firstGuide.reveal = 5;
  delete firstGuide.unlockAfter;
}

// 案内だけ自動化しても、売上を自分で拾い続けると「仕組み化した」感が弱い。
// 7人ほど接客した段階で自動集金を選べるようにし、序盤で一周の自動化を完成できるようにする。
const earlyCollector = hire("collector-1");
if (earlyCollector) {
  earlyCollector.area = 0;
  earlyCollector.price = 380;
  earlyCollector.label = "自動集金スタッフ";
  earlyCollector.pos = { x: 70, y: 135 };
  earlyCollector.needServed = 7;
  earlyCollector.reveal = 6;
  delete earlyCollector.unlockAfter;
}

// 入場まわりの自動化も、案内スタッフの購入を強制条件にしない。
// 「魚に投資」「案内を自動化」「集金を自動化」「入口を自動化」から選べる。
const seller = hire("seller-1");
if (seller) {
  seller.price = 450;
  seller.needServed = 8;
  seller.reveal = 7;
  delete seller.unlockAfter;
}

const gatekeeper = hire("gatekeeper-1");
if (gatekeeper) {
  gatekeeper.price = 700;
  gatekeeper.needServed = 10;
  gatekeeper.reveal = 8;
  delete gatekeeper.unlockAfter;
}

const firstRobot = hire("robot-1");
if (firstRobot) {
  firstRobot.price = 2_400;
  firstRobot.reveal = 4;
}

// --- 最初の地域は5〜7択を早期に作る -----------------------------------

const firstAreaTank2 = tank(0, 2);
if (firstAreaTank2) {
  firstAreaTank2.price = 90;
  firstAreaTank2.needServed = 2;
  firstAreaTank2.reveal = 1;
  delete firstAreaTank2.unlockAfter;
}

const firstAreaTank3 = tank(0, 3);
if (firstAreaTank3) {
  firstAreaTank3.price = 160;
  firstAreaTank3.needServed = 3;
  firstAreaTank3.reveal = 2;
  delete firstAreaTank3.unlockAfter;
}

const carry = upgrade("carry");
if (carry) {
  carry.basePrice = 70;
  carry.needServed = 2;
  carry.reveal = 2;
  delete carry.unlockAfter;
}

const speed = upgrade("speed");
if (speed) {
  speed.basePrice = 80;
  speed.needServed = 3;
  speed.reveal = 3;
  delete speed.unlockAfter;
}

const price = upgrade("price");
if (price) {
  price.basePrice = 140;
  // 旧Lv20上限では中盤以降に収益の伸びしろが消える。
  // Lv40以降も「次地域を開く / 単価を上げる」が同程度の投資判断になるよう、
  // 強化費の伸びを1.6倍に抑えて継続できるようにする。
  // 54区画（本館18＋施設棟4＋古代棟32）まで伸びたので上限も Lv64 へ。
  price.growth = 1.6;
  price.max = 64;
  price.detail = (n) =>
    `観覧単価 ${Math.round(AQUARIUM_BASE_VALUE * Math.pow(1.4, n)).toLocaleString("ja-JP")}円`;
  price.needServed = 5;
  price.reveal = 4;
  delete price.unlockAfter;
}

// 次地域は「最後の水槽を買ったら開く」ではなく来館実績で候補に出す。
// 最初の地域を完成させてもよいし、先に渓流へ進んでもよい。
const secondArea = area(1);
if (secondArea) {
  secondArea.price = 1_200;
  secondArea.needServed = 10;
  secondArea.reveal = 9;
  delete secondArea.unlockAfter;
}

// --- 全地域を一本道から「地域内3択」に変更 -----------------------------

// 3つの展示を 1→2→3 の順で買わせない。
// 地域を開いた瞬間、その地域の3展示がすべて投資候補になる。
for (let region = 1; region < aquariumRuntimeDef.areas.length; region += 1) {
  for (let index = 1; index <= 3; index += 1) {
    const exhibit = tank(region, index);
    if (!exhibit) continue;
    delete exhibit.unlockAfter;
    exhibit.reveal = index;
  }
}

// 地域解放も「3番水槽購入」依存を外して来館実績で出す。
// 進行するほど必要な来館数は増えるが、展示を全部買うことは強制しない。
/*
 * 次の区画が候補に出るまでの、のべ来館数。
 *
 * 旧データ（0,10,24,42,…,714）は「1区画ごとに必要数が 4人ずつ増える」列
 * ―― つまり 2n²+8n ―― だった。54区画になっても同じ手ざわりで伸びるよう、
 * 式のまま延長する（n=17 で 714、n=53 で 6042）。
 */
const servedForRegion = Array.from(
  { length: aquariumRuntimeDef.areas.length },
  (_, n) => 2 * n * n + 8 * n,
);

for (let region = 2; region < aquariumRuntimeDef.areas.length; region += 1) {
  const next = area(region);
  if (!next) continue;
  delete next.unlockAfter;
  next.needServed = servedForRegion[region];
  next.reveal = 6;
}
