/**
 * 世界水族館を、最初から最後まで自動で遊びきってみる。
 *
 *   npx tsx tools/simulate-aquarium.ts
 *   HOURS=8 STEP=0.1 npx tsx tools/simulate-aquarium.ts
 *
 * ゲーム本体の update() をそのまま回し、プレイヤーは
 *   1. 買える枠があれば、その枠へ歩いて買う
 *   2. なければ、ゲーム自身が出している「いまやる仕事」（currentObjective）へ歩く
 * だけを繰り返す。うまい人が休まず遊んだときの上限に近い進みかたになる。
 *
 * どの区画が何分めに開いたかを並べて出すので、
 * 「ここから急に進まなくなる」が数字で見える。
 */
import "@/data/aquarium-balance-v2";
import "@/data/aquarium-visual-v3";
import "@/data/aquarium-expansion-v6";
import "@/data/aquarium-square-v4";
import { aquariumRuntimeDef as def } from "@/data/aquarium";
import {
  applyStage,
  availablePads,
  createState,
  currentObjective,
  isBlocked,
  isUnlocked,
  nearestPadTarget,
  playerSpeed,
  update,
  wallBlocked,
  worldBounds,
  type ShopState,
} from "@/lib/shop";

const HOURS = Number(process.env.HOURS ?? 12);
const STEP = Number(process.env.STEP ?? 0.25);
const LIMIT = HOURS * 3600;
/** 何歩ごとに行き先を選び直すか（毎歩選ぶと枠と席を全部なめるので重い） */
const RETHINK = Number(process.env.RETHINK ?? 4);
/** 次の区画へ向かうのは、値段の何倍たまってから（残りは稼ぎを育てるほうへ回す） */
const HEADROOM = Number(process.env.HEADROOM ?? 3);
const DEBUG = process.env.DEBUG === "1";
const TRACE = Number(process.env.TRACE ?? 0);
const WALL_LIMIT = Number(process.env.WALL_SECONDS ?? 420) * 1000;

/*
 * 観覧単価の強化は「1段で収入1.4倍」なので、買えるあいだは収入を跳ね上げつづける。
 * PRICE_MAX で上限を差し替えると、その増幅を切った状態 ―― つまり
 * 区画の単価の伸びと値段の伸びだけで決まるテンポ ―― を単体で測れる。
 */
const PRICE_MAX = Number(process.env.PRICE_MAX ?? 0);
if (PRICE_MAX > 0) {
  const priceUpgrade = def.upgrades.find((item) => item.id === "price");
  if (priceUpgrade) priceUpgrade.max = PRICE_MAX;
}

applyStage("aquarium" as Parameters<typeof applyStage>[0]);
const state: ShopState = createState();

const clock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}時間${String(m).padStart(2, "0")}分` : `${m}分${String(Math.floor(sec % 60)).padStart(2, "0")}秒`;
};

const money = (v: number) => {
  const units: [number, string][] = [[1e20, "垓"], [1e16, "京"], [1e12, "兆"], [1e8, "億"], [1e4, "万"]];
  for (const [unit, name] of units) if (Math.abs(v) >= unit) return `${(v / unit).toFixed(2)}${name}`;
  return Math.round(v).toLocaleString("ja-JP");
};

/*
 * 館内の道を探す。
 *
 * 世界水族館の順路はひと筆書きで、まだ買っていない区画には入れない（isBlocked）し、
 * 棟のあいだには壁がある（wallBlocked）。目標へまっすぐ歩くだけだと、
 * 角で壁に押しつけられたまま動けなくなる ―― 実際、古代棟の奥では
 * プレイヤーが70分以上おなじ場所で止まったままになっていた。
 * それはゲームの進行不能ではなく、この道具の歩きかたの問題なので、
 * 通れるところだけを幅優先でたどって、曲がり角の並びを作る。
 */
const GRID = 24;

const findPath = (state: ShopState, goal: { x: number; y: number }) => {
  const box = worldBounds(state);
  const lo = { x: box.x0 + 18, y: box.y0 + 54 };
  const hi = { x: box.x1 - 18, y: box.y1 - 26 };
  const start = state.player.pos;
  const key = (x: number, y: number) => `${Math.round(x / GRID)},${Math.round(y / GRID)}`;
  const cameFrom = new Map<string, { x: number; y: number } | null>();
  cameFrom.set(key(start.x, start.y), null);
  const spots = new Map<string, { x: number; y: number }>();
  spots.set(key(start.x, start.y), { x: start.x, y: start.y });
  const queue: { x: number; y: number }[] = [{ x: start.x, y: start.y }];
  let hit: { x: number; y: number } | null = null;

  while (queue.length) {
    const here = queue.shift()!;
    if (Math.hypot(here.x - goal.x, here.y - goal.y) <= GRID) {
      hit = here;
      break;
    }
    for (const [dx, dy] of [[GRID, 0], [-GRID, 0], [0, GRID], [0, -GRID]]) {
      const nx = Math.min(hi.x, Math.max(lo.x, here.x + dx));
      const ny = Math.min(hi.y, Math.max(lo.y, here.y + dy));
      const k = key(nx, ny);
      if (cameFrom.has(k)) continue;
      const next2 = { x: nx, y: ny };
      if (isBlocked(state, next2) || wallBlocked(state, here, next2)) continue;
      cameFrom.set(k, here);
      spots.set(k, next2);
      queue.push(next2);
    }
  }
  if (!hit) return null;

  const route: { x: number; y: number }[] = [goal];
  let cursor: { x: number; y: number } | null = hit;
  while (cursor) {
    route.push(cursor);
    cursor = cameFrom.get(key(cursor.x, cursor.y)) ?? null;
  }
  route.reverse();
  return route;
};

const openedAt = new Map<number, number>();
/** 収入の総額。区画ごとの「1分あたりいくら稼いでいるか」を見るため */
let earned = 0;
let earnedMark = 0;
let timeMark = 0;
let lastOpen = 0;
let target: { x: number; y: number } | null = null;
let route: { x: number; y: number }[] | null = null;
let legIndex = 0;
let wasAt = { x: 0, y: 0 };
let next = 1;
const started = Date.now();
let stoppedBy = "";

for (let step = 0; step * STEP < LIMIT; step += 1) {
  // 買える枠があればそこへ、なければ「いまやる仕事」へ歩く
  if (step % RETHINK === 0) {
    /*
     * 次の区画に余裕をもって手が届いたら、それを買いに行く。
     *
     * 「いちばん近い枠」だけで選ぶと、入場料の強化のように
     * 手もとにあって何度でも買えるものの前から動かなくなり、
     * 遠くの区画へは一生歩かない。かといって「買えたら即」にすると、
     * 稼ぎをぜんぶ区画につぎこんで観覧単価の強化がまったく伸びず、
     * 収入が寝たまま値段だけ上がる ―― どちらも人の遊びかたではない。
     * 値段の HEADROOM 倍たまったら区画へ、それまでは近くのものを買って稼ぎを育てる。
     */
    const nextArea = def.areas[next];
    const nextReady =
      nextArea &&
      state.money >= nextArea.price * HEADROOM &&
      availablePads(state).some((item) => item.id === nextArea.id);
    const pad = nearestPadTarget(state);
    const want = nextReady
      ? nextArea.padPos
      : pad?.ready
        ? pad.pos
        : (currentObjective(state).pos ?? pad?.pos ?? null);
    if (want && (!target || want.x !== target.x || want.y !== target.y)) {
      target = want;
      route = findPath(state, want);
      legIndex = 0;
    } else if (!want) {
      target = null;
      route = null;
    }
  }
  let input = { x: 0, y: 0 };
  // いまの曲がり角に着いたら、次の曲がり角へ
  while (route && legIndex < route.length - 1) {
    const leg = route[legIndex];
    if (Math.hypot(leg.x - state.player.pos.x, leg.y - state.player.pos.y) > GRID * 0.75) break;
    legIndex += 1;
  }
  const aim = route ? route[Math.min(legIndex, route.length - 1)] : target;
  if (aim) {
    const dx = aim.x - state.player.pos.x;
    const dy = aim.y - state.player.pos.y;
    const len = Math.hypot(dx, dy);
    /*
     * 1歩が大きいと目標を飛び越して往復し、枠の上で止まれない。
     * 実機は毎秒60歩なので起きないが、シミュレータは歩幅が広いので、
     * 残りの距離より大きくは踏み出さないように入力の強さを弱める。
     */
    if (len > 1) {
      const reach = Math.max(1e-6, playerSpeed(state) * STEP);
      const mag = Math.min(1, len / reach);
      input = { x: (dx / len) * mag, y: (dy / len) * mag };
    }
  }
  /*
   * それでも動けていないなら、道を引き直す。
   * 区画をひとつ買うと通れる場所が増えるので、古い道はすぐ古びる。
   */
  if (step % 240 === 0) {
    if (Math.hypot(state.player.pos.x - wasAt.x, state.player.pos.y - wasAt.y) < 4 && target) {
      route = findPath(state, target);
      legIndex = 0;
    }
    wasAt = { x: state.player.pos.x, y: state.player.pos.y };
  }
  const before = state.money;
  update(state, input, STEP);
  // 収入だけを積む。買い物で減った分は入れない（同じ歩で両方起きた分だけ甘い）
  if (state.money > before) earned += state.money - before;

  if (TRACE && state.playTime > TRACE && state.playTime < TRACE + 6) {
    const o = currentObjective(state);
    const t2 = nearestPadTarget(state);
    console.error(
      `t=${state.playTime.toFixed(2)} 自分=(${state.player.pos.x.toFixed(1)},${state.player.pos.y.toFixed(1)})` +
        ` 入力=(${input.x.toFixed(2)},${input.y.toFixed(2)}) 歩き先=${target ? `(${target.x.toFixed(0)},${target.y.toFixed(0)})` : "なし"}` +
        ` 仕事=${o.kind}:${o.pos ? `(${o.pos.x.toFixed(0)},${o.pos.y.toFixed(0)})` : "なし"}:${o.label}` +
        ` 枠=${t2 ? `${t2.pad.id}:${t2.ready}` : "なし"}`,
    );
  }
  if (DEBUG && step % Math.round(60 / STEP) === 0) {
    const t = nearestPadTarget(state);
    console.error(
      `[${clock(state.playTime)}] 所持金${money(state.money)} 目標=${t ? `${t.pad.id}(残${money(t.remain)}/${t.ready ? "買える" : "足りない"})` : "なし"}` +
        ` 自分=(${state.player.pos.x.toFixed(0)},${state.player.pos.y.toFixed(0)})` +
        (t ? ` 枠=(${t.pos.x.toFixed(0)},${t.pos.y.toFixed(0)}) 距離=${Math.hypot(t.pos.x - state.player.pos.x, t.pos.y - state.player.pos.y).toFixed(1)}` : "") +
        ` 歩き先=${target ? `(${target.x.toFixed(0)},${target.y.toFixed(0)})` : "なし"}` +
        ` 立っている枠=${state.activePad ?? "-"}`,
    );
  }

  // 次に開くはずの区画だけを見る（54区画を毎歩なめない）
  while (next < def.areas.length && isUnlocked(state, `area-${next}`)) {
    openedAt.set(next, state.playTime);
    lastOpen = state.playTime;
    const span = Math.max(1e-6, state.playTime - timeMark);
    const rate = ((earned - earnedMark) / span) * 60;
    const owned = def.seats.filter((seat) => isUnlocked(state, seat.id)).length;
    console.error(
      `  area-${String(next).padStart(2)} ${clock(state.playTime)}　のべ${Math.floor(state.served)}人　所持金${money(state.money)}円　単価Lv${state.levels.price}` +
        `　収入${money(rate)}円/分　展示${owned}`,
    );
    earnedMark = earned;
    timeMark = state.playTime;
    next += 1;
  }
  if (next >= def.areas.length) break;
  if (step % 4000 === 0 && Date.now() - started > WALL_LIMIT) {
    stoppedBy = `計算時間の上限（${Math.round(WALL_LIMIT / 1000)}秒）`;
    break;
  }
}

console.log(`区画 | 開いた時刻 | 前の区画からの間 | 値段 | のべ来館`);
let prev = 0;
for (let i = 1; i < def.areas.length; i += 1) {
  const at = openedAt.get(i);
  const label = def.areas[i].label.replace("をひらく", "");
  if (at === undefined) {
    console.log(`${String(i).padStart(2)} | ―（${clock(LIMIT)}まで開かず） | | ${money(def.areas[i].price)}円 | 必要${def.areas[i].needServed ?? 0}人`);
    continue;
  }
  console.log(
    `${String(i).padStart(2)} ${label.padEnd(14)} | ${clock(at).padStart(10)} | ${clock(at - prev).padStart(9)} | ${money(def.areas[i].price)}円`,
  );
  prev = at;
}

console.log(`\n開いた区画: ${openedAt.size} / ${def.areas.length - 1}`);
if (stoppedBy) console.log(`途中で止めた理由: ${stoppedBy}`);
console.log(`最後に開いた時刻: ${clock(lastOpen)}　遊んだ時間: ${clock(state.playTime)}`);
console.log(`のべ来館: ${Math.floor(state.served)}人　所持金: ${money(state.money)}円`);
console.log(`強化Lv: ${JSON.stringify(state.levels)}`);
