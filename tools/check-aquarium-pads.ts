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

let overlap = 0;
for (let i = 1; i < areas.length; i += 1) {
  const pad = areas[i].padPos;
  for (const other of others) {
    const away = Math.hypot(other.pos.x - pad.x, other.pos.y - pad.y);
    if (away < PAD_RADIUS) {
      overlap += 1;
      console.log(`★ area-${i} の枠に ${other.id} が ${away.toFixed(1)} まで近い（${PAD_RADIUS}未満）`);
    }
  }
}

if (ng === 0 && overlap === 0) {
  console.log(`54区画すべて、解放枠に手が届いて、ほかの枠とも重ならない（PAD_RADIUS=${PAD_RADIUS}）`);
} else {
  if (ng > 0) console.log(`\n${ng}区画で解放枠に手が届かない`);
  if (overlap > 0) console.log(`${overlap}件、解放枠がほかの枠と重なっている`);
}
process.exit(ng === 0 && overlap === 0 ? 0 : 1);
