/**
 * 解放枠に手が届くかを確かめる。
 *
 *   npx tsx tools/check-aquarium-pads.ts
 *
 * 区画を買う枠は「一つ前の区画の中」に置くが、プレイヤーが動ける範囲は
 * 開いている区画の外周までしかない。枠がその外側にあると、
 * 見えているのに一生買えない ―― 進行不能になる。
 * 54区画ぶん、枠と可動範囲の距離を計算して PAD_RADIUS 以内か確かめる。
 */
import "@/data/aquarium-balance-v2";
import "@/data/aquarium-visual-v3";
import "@/data/aquarium-expansion-v6";
import "@/data/aquarium-square-v4";
import { aquariumRuntimeDef as def } from "@/data/aquarium";
import { OUTSIDE_DEPTH, PAD_RADIUS } from "@/lib/shop";

const areas = def.areas;

/** updatePlayer の clamp と同じ式。開いている区画の外周から内側へ寄せた矩形 */
const reachable = (openCount: number) => {
  const open = areas.slice(0, openCount);
  const x0 = Math.min(...open.map((a) => a.rect.x0));
  const x1 = Math.max(...open.map((a) => a.rect.x1));
  const y0 = Math.min(...open.map((a) => a.rect.y0));
  const bottom = Math.max(480, ...open.map((a) => a.rect.y1)) + OUTSIDE_DEPTH;
  return { x0: x0 + 18, x1: x1 - 18, y0: y0 + 54, y1: bottom - 26 };
};

const gap = (box: ReturnType<typeof reachable>, p: { x: number; y: number }) => {
  const dx = Math.max(box.x0 - p.x, 0, p.x - box.x1);
  const dy = Math.max(box.y0 - p.y, 0, p.y - box.y1);
  return Math.hypot(dx, dy);
};

let ng = 0;
for (let i = 1; i < areas.length; i += 1) {
  // その区画を買う直前の状態 = 0〜i-1 が開いている
  const box = reachable(i);
  const away = gap(box, areas[i].padPos);
  const ok = away <= PAD_RADIUS;
  if (!ok) {
    ng += 1;
    console.log(
      `★ area-${String(i).padStart(2)} ${areas[i].label} … 枠 (${areas[i].padPos.x}, ${areas[i].padPos.y}) へ ${away.toFixed(1)} 足りない（届く距離は ${PAD_RADIUS}）`,
    );
  }
}

/*
 * 解放枠がほかの購入枠と重なっていないか。
 * 重なっていると、区画を買うつもりで別のものを買ってしまう。
 */
const others: { id: string; pos: { x: number; y: number } }[] = [
  ...def.stoves.filter((s) => s.price > 0).map((s) => ({ id: s.id, pos: s.pos })),
  ...def.seats.filter((s) => s.price > 0).map((s) => ({ id: s.id, pos: s.serve })),
  ...def.hires.filter((h) => !h.outside).map((h) => ({ id: h.id, pos: h.pos })),
  ...def.equipment.filter((e) => !e.outside).map((e) => ({ id: `equip-${e.id}`, pos: e.pos })),
];

/*
 * 近すぎる枠は、当たり判定が重なる前に「名前と値段の札」が重なって読めなくなる。
 * 札はおよそ100px幅なので、中心どうしは 50 は離しておく。
 */
const LABEL_GAP = 50;

let overlap = 0;
const spots: { id: string; pos: { x: number; y: number } }[] = [
  ...others,
  ...areas.filter((a) => a.price > 0).map((a) => ({ id: a.id, pos: a.padPos })),
  ...def.upgrades.filter((u) => !u.outside).map((u) => ({ id: `up-${u.id}`, pos: u.pos })),
];
for (let i = 0; i < spots.length; i += 1) {
  for (let k = i + 1; k < spots.length; k += 1) {
    const away = Math.hypot(spots[i].pos.x - spots[k].pos.x, spots[i].pos.y - spots[k].pos.y);
    if (away < LABEL_GAP) {
      overlap += 1;
      console.log(`★ ${spots[i].id} と ${spots[k].id} が ${away.toFixed(1)} しか離れていない（${LABEL_GAP}未満）`);
    }
  }
}

if (ng === 0 && overlap === 0) {
  console.log(`54区画すべて、解放枠に手が届いて、枠どうしも ${LABEL_GAP} 以上 離れている`);
} else {
  if (ng > 0) console.log(`\n${ng}区画で解放枠に手が届かない`);
  if (overlap > 0) console.log(`${overlap}件、枠どうしが近すぎる`);
}
process.exit(ng === 0 && overlap === 0 ? 0 : 1);
