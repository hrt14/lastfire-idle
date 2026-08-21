/**
 * 54区画ぜんぶ、順に開けていけるかを確かめる。
 *
 *   npx tsx tools/check-aquarium-progress.ts
 *
 * 「0〜N-1 が開いていて、お金も来館数も足りている」状態を作り、
 * 区画 N の枠がちゃんと売り場に出るかを見る。出なければそこで進行が止まる。
 */
import "@/data/aquarium-balance-v2";
import "@/data/aquarium-visual-v3";
import "@/data/aquarium-expansion-v6";
import "@/data/aquarium-square-v4";
import { aquariumRuntimeDef as def } from "@/data/aquarium";
import { applyStage, availablePads, createState } from "@/lib/shop";

applyStage("aquarium" as Parameters<typeof applyStage>[0]);

const areas = def.areas;
let ng = 0;

for (let i = 1; i < areas.length; i += 1) {
  const state = createState();
  state.money = 1e30;
  state.served = 1e9;
  state.playTime = 1e6;
  // 0〜i-1 の区画と、その中のものを全部開けた状態
  const ids = new Set(state.unlocked);
  for (let k = 1; k < i; k += 1) ids.add(`area-${k}`);
  for (const s of def.stoves) if (s.area < i) ids.add(s.id);
  for (const s of def.seats) if (s.area < i) ids.add(s.id);
  for (const h of def.hires) if (h.area < i) ids.add(h.id);
  for (const e of def.equipment) if (e.area < i) ids.add(`equip-${e.id}`);
  state.unlocked = [...ids];

  const open = availablePads(state).some((pad) => pad.id === `area-${i}`);
  if (!open) {
    ng += 1;
    const spec = areas[i];
    console.log(
      `★ area-${String(i).padStart(2)} ${spec.label} … 枠が出ない` +
        `（値段 ${spec.price} / 必要来館 ${spec.needServed ?? "-"} / unlockAfter ${spec.unlockAfter ?? "-"}）`,
    );
  }
}

console.log(ng === 0 ? "54区画すべて、順に枠が出る" : `\n${ng}区画で枠が出ない`);
process.exit(ng === 0 ? 0 : 1);
