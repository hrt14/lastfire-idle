/**
 * 文字のはじまりの到達点検。
 *
 * お金の心配をなくした状態で通しで動かし、
 *  - どの作業場もちゃんと物を出すか（材料待ちで永久に止まらないか）
 *  - 建物がぜんぶ建つか
 *  - 大法典碑まで行けるか
 * を見る。値段の詰めではなく、工程がつながっているかの点検。
 */
import {
  applyStage,
  availablePads,
  createState,
  currentObjective,
  openStoves,
  padPosOf,
  padPrice,
  update,
  type Pad,
  type ShopState,
} from "@/lib/shop";
import { stageDefs } from "@/data/stages";
import { TECHS } from "@/lib/moji";

const STAGE = (process.env.STAGE ?? "moji") as "moji" | "taiga";
applyStage(STAGE);
const state: ShopState = createState();
state.stageId = STAGE;

// 工程がつながっているかを見るだけの点検なので、刻みは粗くてよい
const DT = 1 / 10;
const MINUTES = Number(process.argv[2] ?? 60);
const STEPS = Math.round((MINUTES * 60) / DT);

/** どの作業場が、いちどでも物を出したか */
const produced = new Set<string>();
const firstAt = new Map<string, number>();
const log: string[] = [];
const seenArea = new Set<string>();
const seenTech = new Set<number>([0]);
let lastReady: Record<string, number> = {};

const nextPad = (now: ShopState): Pad | null => {
  const list = availablePads(now).filter((pad) =>
    Number.isFinite(padPrice(now, pad)),
  );
  if (list.length === 0) return null;
  // 区画が最優先。あとは近いものから
  const areaPad = list.filter((pad) => pad.id.startsWith("area-"));
  const pool = areaPad.length > 0 ? areaPad : list;
  return pool.reduce((best, pad) => {
    const at = padPosOf(now, pad);
    const bt = padPosOf(now, best);
    const d1 = Math.hypot(at.x - now.player.pos.x, at.y - now.player.pos.y);
    const d2 = Math.hypot(bt.x - now.player.pos.x, bt.y - now.player.pos.y);
    return d1 < d2 ? pad : best;
  });
};

const toward = (now: ShopState, t: { x: number; y: number }) => {
  const dx = t.x - now.player.pos.x;
  const dy = t.y - now.player.pos.y;
  const len = Math.hypot(dx, dy);
  return len < 2 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
};

for (let step = 0; step < STEPS; step += 1) {
  const minute = (step * DT) / 60;
  // お金は気にしない点検なので、常に潤沢にしておく
  state.money = Math.max(state.money, 2_000_000_000);

  const pad = nextPad(state);
  let input = { x: 0, y: 0 };
  if (pad) input = toward(state, padPosOf(state, pad));
  else {
    const goal = currentObjective(state);
    if (goal.pos) input = toward(state, goal.pos);
  }
  update(state, input, DT);

  // 出し口の数が増えた作業場は「作れた」とみなす
  for (const stove of openStoves(state)) {
    const now = state.ready[stove.id] ?? 0;
    if (now > (lastReady[stove.id] ?? 0) && !produced.has(stove.id)) {
      produced.add(stove.id);
      firstAt.set(stove.id, minute);
    }
  }
  lastReady = { ...state.ready };

  if (STAGE === "moji" && !seenTech.has(state.moji.tech)) {
    seenTech.add(state.moji.tech);
    log.push(`${minute.toFixed(1)}分  📖 ${TECHS[state.moji.tech].name}`);
  }
  for (const id of state.unlocked) {
    if (!id.startsWith("area-") || seenArea.has(id)) continue;
    seenArea.add(id);
    if (id !== "area-0") log.push(`${minute.toFixed(1)}分  🏙 ${id}`);
  }
}

const def = stageDefs[STAGE];
const works = def.stoves.filter((s) => !s.needs);
const builds = def.stoves.filter((s) => s.needs);
const openIds = new Set(openStoves(state).map((s) => s.id));

console.log(log.join("\n"));
console.log("―".repeat(34));
console.log(`買えた作業場    ${openIds.size} / ${def.stoves.length}`);
console.log(`物を出した      ${produced.size} / ${works.length}`);
console.log(`建った建物      ${state.built.length} / ${builds.length}`);
console.log(`開いた区画      ${seenArea.size + 1} / ${def.areas.length}`);
if (STAGE === "moji") {
  console.log(`記録            ${state.moji.records}`);
  console.log(`文字            ${TECHS[state.moji.tech].name}`);
}

const silent = works.filter((s) => openIds.has(s.id) && !produced.has(s.id));
if (silent.length > 0) {
  console.log("\n⚠️ 買ったのに何も出さなかった作業場:");
  for (const s of silent) {
    console.log(`  - ${s.id} ${s.label ?? ""}（takes=${s.takes ?? "-"} fuel=${s.fuel ?? "-"}）`);
  }
}
const unbuilt = builds.filter((s) => openIds.has(s.id) && !state.built.includes(s.id));
if (unbuilt.length > 0) {
  console.log("\n⚠️ 買ったのに建たなかった建物:");
  for (const s of unbuilt) {
    const parts = state.parts[s.id] ?? {};
    const need = Object.entries(s.needs ?? {})
      .map(([k, v]) => `${k} ${parts[k] ?? 0}/${v}`)
      .join(" / ");
    console.log(`  - ${s.id} ${s.label ?? ""}: ${need}`);
  }
}
const never = def.stoves.filter((s) => !openIds.has(s.id));
if (never.length > 0) {
  console.log(`\nまだ買えていない作業場 ${never.length}件: ${never.map((s) => s.id).join(", ")}`);
}
