/**
 * 文字のはじまりのデータ点検。
 * 大河の文明で見つかった種類の穴（unlockAfter の指す先・作れない材料・
 * 行き止まりの品）を、遊ぶ前にここで潰す。
 */
import { stageDefs } from "@/data/stages";

const def = stageDefs.moji;
const problems: string[] = [];
const note = (text: string) => problems.push(text);

/* ---- id が重なっていないか ---- */
const ids = new Set<string>();
const seen = (id: string, where: string) => {
  if (ids.has(id)) note(`id が重複: ${id}（${where}）`);
  ids.add(id);
};
def.stoves.forEach((s) => seen(s.id, "stove"));
def.seats.forEach((s) => seen(s.id, "seat"));
def.hires.forEach((h) => seen(h.id, "hire"));
def.areas.forEach((a) => seen(a.id, "area"));
def.equipment.forEach((e) => seen(`equip-${e.id}`, "equip"));

/* ---- unlockAfter の指す先が実在するか ---- */
const marks = new Set([
  "mark-first-tablet",
  "mark-records-30",
  "mark-records-200",
  "mark-records-800",
  "mark-scribes-4",
  "mark-calm",
  "tech-none",
  "tech-tally",
  "tech-sign",
  "tech-name",
  "tech-land",
  "tech-trade",
  "tech-deed",
  "tech-law",
]);
const known = new Set<string>([
  ...ids,
  ...marks,
  ...def.stoves.filter((s) => s.needs).map((s) => `built-${s.id}`),
]);
const checkAfter = (after: string | undefined, who: string) => {
  if (!after) return;
  if (!known.has(after)) note(`unlockAfter の指す先がない: ${who} → ${after}`);
};
def.stoves.forEach((s) => checkAfter(s.unlockAfter, `stove ${s.id}`));
def.seats.forEach((s) => checkAfter(s.unlockAfter, `seat ${s.id}`));
def.hires.forEach((h) => checkAfter(h.unlockAfter, `hire ${h.id}`));
def.areas.forEach((a) => checkAfter(a.unlockAfter, `area ${a.id}`));
def.equipment.forEach((e) => checkAfter(e.unlockAfter, `equip ${e.id}`));
def.upgrades.forEach((u) => checkAfter(u.unlockAfter, `upgrade ${u.id}`));

/* ---- unlockAfter が「あとの区画のもの」を指していないか ----
 *
 * これを指すと、その区画を開くために、その区画の中のものを買う必要が出て
 * 永久に開かなくなる（area-1 と area-2 で実際にこれを踏んだ）
 */
const areaOf = new Map<string, number>();
def.stoves.forEach((x) => areaOf.set(x.id, x.area));
def.stoves.filter((x) => x.needs).forEach((x) => areaOf.set(`built-${x.id}`, x.area));
def.seats.forEach((x) => areaOf.set(x.id, x.area));
def.hires.forEach((x) => areaOf.set(x.id, x.area));
def.equipment.forEach((x) => areaOf.set(`equip-${x.id}`, x.area));
for (const area of def.areas) {
  const index = Number(area.id.replace("area-", ""));
  const after = area.unlockAfter;
  if (!after) continue;
  const at = areaOf.get(after);
  if (at !== undefined && at >= index) {
    note(
      `区画が開けなくなる: ${area.id} の条件 ${after} は area-${at} の中にある`,
    );
  }
}
// 作業場・席・雇用・設備も、自分より後の区画のものを条件にしてはいけない
const checkOrder = (id: string, area: number, after: string | undefined) => {
  if (!after) return;
  const at = areaOf.get(after);
  if (at !== undefined && at > area) {
    note(`${id}（area-${area}）の条件 ${after} が、あとの area-${at} にある`);
  }
};
def.stoves.forEach((x) => checkOrder(`stove ${x.id}`, x.area, x.unlockAfter));
def.seats.forEach((x) => checkOrder(`seat ${x.id}`, x.area, x.unlockAfter));
def.hires.forEach((x) => checkOrder(`hire ${x.id}`, x.area, x.unlockAfter));
def.equipment
  .filter((x) => !x.outside)
  .forEach((x) => checkOrder(`equip ${x.id}`, x.area, x.unlockAfter));

/* ---- 直結の設備が、あとの区画の作業場をつないでいないか ---- */
for (const item of def.equipment) {
  if (!item.link) continue;
  const from = areaOf.get(item.link.from);
  const to = areaOf.get(item.link.to);
  if (from !== undefined && from > item.area) {
    note(`equip ${item.id}（area-${item.area}）が、あとの area-${from} の ${item.link.from} から引いている`);
  }
  if (to !== undefined && to > item.area) {
    note(`equip ${item.id}（area-${item.area}）が、あとの area-${to} の ${item.link.to} へつないでいる`);
  }
}

/* ---- 作れる品 ---- */
// 建築予定地は何も作らないので、作れる品からは外す
const made = new Set(
  def.stoves.filter((s) => !s.needs).map((s) => s.item ?? "main"),
);
const needKind = (kind: string, who: string) => {
  if (!made.has(kind)) note(`だれも作れない材料を要求: ${who} が ${kind}`);
};
for (const stove of def.stoves) {
  if (stove.takes) needKind(stove.takes, `stove ${stove.id}.takes`);
  if (stove.fuel) needKind(stove.fuel, `stove ${stove.id}.fuel`);
  for (const kind of Object.keys(stove.needs ?? {})) {
    needKind(kind, `build ${stove.id}.needs`);
  }
}
for (const seat of def.seats) needKind(seat.needs ?? "main", `seat ${seat.id}`);

/* ---- 行き止まりの品（作れるが、だれも使わない） ---- */
const used = new Set<string>();
for (const stove of def.stoves) {
  if (stove.takes) used.add(stove.takes);
  if (stove.fuel) used.add(stove.fuel);
  for (const kind of Object.keys(stove.needs ?? {})) used.add(kind);
}
for (const seat of def.seats) used.add(seat.needs ?? "main");
for (const kind of made) {
  if (!used.has(kind)) note(`行き止まりの品（作れるが使い道がない）: ${kind}`);
}

/* ---- 設備の指す作業場 ---- */
const stoveIds = new Set(def.stoves.map((s) => s.id));
for (const item of def.equipment) {
  if (item.link) {
    if (!stoveIds.has(item.link.from)) note(`equip ${item.id}.link.from がない: ${item.link.from}`);
    if (!stoveIds.has(item.link.to)) note(`equip ${item.id}.link.to がない: ${item.link.to}`);
  }
  if (item.capacity && !stoveIds.has(item.capacity.stove)) {
    note(`equip ${item.id}.capacity.stove がない: ${item.capacity.stove}`);
  }
}
for (const hire of def.hires) {
  if (hire.stoveId && !stoveIds.has(hire.stoveId)) {
    note(`hire ${hire.id}.stoveId がない: ${hire.stoveId}`);
  }
}

/* ---- 区画の中に収まっているか ---- */
const areaRect = new Map(def.areas.map((a) => [Number(a.id.replace("area-", "")), a.rect]));
const inside = (
  where: string,
  area: number,
  pos: { x: number; y: number },
) => {
  const rect = areaRect.get(area);
  if (!rect) {
    note(`${where}: area ${area} が無い`);
    return;
  }
  if (pos.x < rect.x0 || pos.x > rect.x1 || pos.y < rect.y0 || pos.y > rect.y1) {
    note(
      `${where}: 区画の外にある (${pos.x},${pos.y}) ⊄ [${rect.x0}..${rect.x1}]×[${rect.y0}..${rect.y1}]`,
    );
  }
};
def.stoves.forEach((s) => inside(`stove ${s.id}`, s.area, s.pos));
def.seats.forEach((s) => inside(`seat ${s.id}`, s.area, s.pos));
def.hires
  .filter((h) => !h.outside)
  .forEach((h) => inside(`hire ${h.id}`, h.area, h.pos));
def.equipment
  .filter((e) => !e.outside)
  .forEach((e) => inside(`equip ${e.id}`, e.area, e.pos));

/* ---- 最初に見えている枠が5つあるか ---- */
const start = new Set(def.start ?? []);
const revealed = [
  ...def.stoves.map((s) => ({ id: s.id, reveal: s.reveal, after: s.unlockAfter })),
  ...def.seats.map((s) => ({ id: s.id, reveal: s.reveal, after: s.unlockAfter })),
  ...def.hires.map((h) => ({ id: h.id, reveal: h.reveal, after: h.unlockAfter })),
  ...def.upgrades.map((u) => ({ id: u.id, reveal: u.reveal, after: u.unlockAfter })),
  ...def.equipment.map((e) => ({ id: e.id, reveal: e.reveal, after: e.unlockAfter })),
]
  .filter((row) => !start.has(row.id) && !row.after && row.reveal !== undefined)
  .sort((a, b) => (a.reveal ?? 0) - (b.reveal ?? 0))
  .slice(0, 6);
console.log(
  "最初に出る枠:",
  revealed.map((r) => `${r.id}(${r.reveal})`).join(" / "),
);

console.log(`区画 ${def.areas.length} / 作業場 ${def.stoves.length} / 席 ${def.seats.length} / 雇用 ${def.hires.length} / 設備 ${def.equipment.length}`);
if (problems.length === 0) {
  console.log("✅ 問題なし");
} else {
  console.log(`❌ ${problems.length}件`);
  for (const line of problems) console.log("  -", line);
  process.exit(1);
}
