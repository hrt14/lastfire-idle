/**
 * 文字のはじまりの通し素振り。
 *
 * 案内（currentObjective）どおりに動き、買えるものがあれば枠へ寄る
 * 自動プレイヤーで、第1区画から大法典碑まで詰まらずに行けるかを見る。
 * 大河の文明でやったのと同じ点検（docs/taiga-civilization.md §0）。
 */
import {
  applyStage,
  availablePads,
  createState,
  currentObjective,
  padPosOf,
  padPrice,
  update,
  type Pad,
  type ShopState,
} from "@/lib/shop";
import { TECHS } from "@/lib/moji";

const STAGE = (process.env.STAGE ?? "moji") as "moji" | "taiga";
applyStage(STAGE);
const state: ShopState = createState();
state.stageId = STAGE;

const DT = 1 / 20;
const MINUTES = Number(process.argv[2] ?? 90);
const STEPS = Math.round((MINUTES * 60) / DT);

/** 手が空いた（30秒なにもしていない）人を数えるための記録 */
const idleSince = new Map<number, number>();
const lastPos = new Map<number, { x: number; y: number }>();
let idleSamples = 0;
let idleStuck = 0;

/**
 * いま払える枠のうち、次に買うもの。
 *
 * 強化ばかり買い続けると、それだけで手もとが空になってしまうので、
 * まず設備・人・区画のいちばん安いものを買い、
 * どれも買えないときだけ強化に回す（人が遊ぶときの順に近づける）
 */
const affordable = (now: ShopState): Pad | null => {
  const canPay = availablePads(now).filter((pad) => {
    const price = padPrice(now, pad);
    return Number.isFinite(price) && price <= now.money;
  });
  const cheapest = (list: Pad[]) =>
    list.length === 0
      ? null
      : list.reduce((best, pad) =>
          padPrice(now, pad) < padPrice(now, best) ? pad : best,
        );
  // 次の区画がいちばんの目当て。次に設備と人、余ったら強化
  const areaPad = canPay.filter((pad) => pad.id.startsWith("area-"));
  const gear = canPay.filter(
    (pad) => pad.kind !== "upgrade" && !pad.id.startsWith("area-"),
  );
  const ups = canPay.filter((pad) => pad.kind === "upgrade");
  /*
   * 強化は「次に買いたい設備の半値まで」に抑える。
   * これが無いと、強化だけを買い続けて設備がいつまでも買えなくなる
   */
  const goal = cheapest(gear);
  const budget = goal ? padPrice(now, goal) / 2 : Infinity;
  return (
    cheapest(areaPad) ??
    goal ??
    cheapest(ups.filter((pad) => padPrice(now, pad) <= budget))
  );
};

const toward = (now: ShopState, target: { x: number; y: number }) => {
  const dx = target.x - now.player.pos.x;
  const dy = target.y - now.player.pos.y;
  const len = Math.hypot(dx, dy);
  if (len < 2) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
};

const log: string[] = [];
const buyLog: string[] = [];
const bought = new Set<string>();
const seenTech = new Set<number>([0]);
const seenArea = new Set<string>();
let lastMoney = 0;
let stalled = 0;

for (let step = 0; step < STEPS; step += 1) {
  const minute = (step * DT) / 60;

  // 買えるものがあればそこへ。なければ案内の示す仕事へ
  const pad = affordable(state);
  let input = { x: 0, y: 0 };
  for (const id of state.unlocked) {
    if (bought.has(id)) continue;
    bought.add(id);
    if (step > 0) buyLog.push(`${minute.toFixed(1)}分 ${id}`);
  }
  if (pad) {
    input = toward(state, padPosOf(state, pad));
  } else {
    const goal = currentObjective(state);
    if (goal.pos) input = toward(state, goal.pos);
  }
  update(state, input, DT);

  // 手が空いている人の割合
  if (step % 20 === 0) {
    for (const worker of state.staff) {
      const key = worker.id;
      const was = lastPos.get(key);
      const moving = was
        ? Math.hypot(worker.pos.x - was.x, worker.pos.y - was.y)
        : 99;
      if (moving > 0.5) idleSince.delete(key);
      else if (!idleSince.has(key)) idleSince.set(key, minute);
      lastPos.set(key, { x: worker.pos.x, y: worker.pos.y });
    }
    idleSamples += state.staff.length;
    for (const [, since] of idleSince) {
      if (minute - since > 0.5) idleStuck += 1;
    }
  }

  // 節目を記録
  if (STAGE === "moji" && !seenTech.has(state.moji.tech)) {
    seenTech.add(state.moji.tech);
    log.push(
      `${minute.toFixed(1)}分  📖 ${TECHS[state.moji.tech].name} ― ${TECHS[state.moji.tech].means}`,
    );
  }
  for (const id of state.unlocked) {
    if (!id.startsWith("area-") || seenArea.has(id)) continue;
    seenArea.add(id);
    if (id !== "area-0") log.push(`${minute.toFixed(1)}分  🏙 ${id} をひらいた`);
  }
  if (state.built.includes("build-code") && !log.some((l) => l.includes("大法典碑"))) {
    log.push(`${minute.toFixed(1)}分  🗿 大法典碑が建った`);
  }

  // 進まなくなっていないか（お金も記録も増えない時間が続く）
  if (step % 1200 === 0) {
    if (state.money <= lastMoney && state.moji.records === 0) stalled += 1;
    lastMoney = state.money;
  }
}

console.log(log.join("\n"));
console.log("―".repeat(30));
console.log(`遊んだ時間      ${MINUTES}分`);
console.log(`お金            ${Math.round(state.money).toLocaleString("ja-JP")}印`);
console.log(`提供            ${state.served}人`);
console.log(`記録            ${state.moji.records}`);
console.log(`文字の段階      ${TECHS[state.moji.tech].name}`);
console.log(`開いた区画      ${seenArea.size} / 6`);
console.log(`建てた建物      ${state.built.length}`);
console.log(`雇った人        ${state.staff.length}`);
console.log(
  `手が空いた割合  ${idleSamples ? Math.round((idleStuck / idleSamples) * 100) : 0}%`,
);
console.log(`大法典碑        ${state.built.includes("build-code") ? "建った" : "まだ"}`);
if (process.env.BUYS) console.log("\n買った順:\n" + buyLog.join("\n"));
if (stalled > 0) console.log(`⚠️ 進まない時間が ${stalled}回`);
