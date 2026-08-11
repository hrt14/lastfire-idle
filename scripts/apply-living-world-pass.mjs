import fs from "node:fs";

const path = "lib/worldGraphicPass.ts";
let source = fs.readFileSync(path, "utf8");

const replaceOnce = (from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 anchor, got ${count}`);
  source = source.replace(from, to);
};

const livingHelpers = String.raw`
const tinyPerson = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  phase: number,
  coat = "rgba(151,111,69,0.82)",
  carrying = false,
  scale = 1,
) => {
  const bob = Math.sin(time * 2.2 + phase) * 1.4 * scale;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5 * scale, 7 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(61,46,34,0.72)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y - 1 * scale + bob);
  ctx.lineTo(x - 4 * scale, y + 6 * scale);
  ctx.moveTo(x + 3 * scale, y - 1 * scale + bob);
  ctx.lineTo(x + 4 * scale, y + 6 * scale);
  ctx.stroke();
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * scale + bob, 6 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(205,164,118,0.88)";
  ctx.beginPath();
  ctx.arc(x, y - 17 * scale + bob, 4.3 * scale, 0, Math.PI * 2);
  ctx.fill();
  if (carrying) {
    ctx.fillStyle = "rgba(164,112,57,0.92)";
    ctx.fillRect(x + 5 * scale, y - 11 * scale + bob, 10 * scale, 9 * scale);
    ctx.strokeStyle = "rgba(103,70,40,0.72)";
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(x + 5 * scale, y - 11 * scale + bob, 10 * scale, 9 * scale);
  }
  ctx.restore();
};

const cargoPile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  scale = 1,
) => {
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const px = x + (col - 1.5) * 12 * scale + row * 4 * scale;
    const py = y - row * 10 * scale;
    ctx.fillStyle = i % 3 === 0 ? "rgba(181,128,66,0.88)" : "rgba(145,96,50,0.88)";
    ctx.fillRect(px - 5 * scale, py - 8 * scale, 10 * scale, 8 * scale);
    ctx.strokeStyle = "rgba(88,58,35,0.55)";
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(px - 5 * scale, py - 8 * scale, 10 * scale, 8 * scale);
  }
  ctx.restore();
};

const movingTinyPerson = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  time: number,
  phase: number,
  coat: string,
  carrying = true,
) => {
  const p = (Math.sin(time * 0.75 + phase) + 1) / 2;
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  tinyPerson(ctx, x, y, time, phase, coat, carrying, 0.86);
};

const drawFireAmbientLife = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const first = areas.find((area) => area.id === "area-0");
  if (first) {
    // 最初から「火のまわりに人がいる」。火そのものが生活の中心だと分かる。
    tinyPerson(ctx, 307, 236, time, 0.2, "rgba(137,93,57,0.84)", false, 0.92);
    tinyPerson(ctx, 382, 238, time, 1.8, "rgba(116,82,57,0.84)", false, 0.92);
  }

  const settlement = areas.find((area) => area.id === "area-1");
  if (settlement) {
    const homeMilestones = ["built-build-hut-1", "built-build-hut-2", "built-build-hut-3"];
    const homes = homeMilestones.filter((id) => unlocked.has(id)).length;
    const hall = unlocked.has("built-build-hall");
    const count = Math.min(8, homes * 2 + (hall ? 2 : 0));
    const spots = [
      [835, 535], [920, 560], [1030, 515], [1120, 535],
      [1215, 565], [1310, 525], [1390, 550], [1000, 620],
    ];
    for (let i = 0; i < count; i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.8, i % 2 ? "rgba(151,105,61,0.78)" : "rgba(112,91,65,0.78)", i % 4 === 0, 0.82);
    }
    if (hall && count >= 4) {
      movingTinyPerson(ctx, { x: 900, y: 615 }, { x: 1370, y: 590 }, time, 0.6, "rgba(142,96,56,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-3")) {
    const winterPeople =
      (unlocked.has("built-build-hut-4") ? 2 : 0) +
      (unlocked.has("built-build-hut-5") ? 2 : 0) +
      (unlocked.has("built-build-hearth-2") ? 2 : 0);
    const spots = [[3010, 525], [3070, 545], [3160, 525], [3240, 548], [3380, 528], [3470, 548]];
    for (let i = 0; i < Math.min(winterPeople, spots.length); i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, 1 + i * 0.7, "rgba(116,106,99,0.82)", false, 0.84);
    }
  }

  if (areas.some((area) => area.id === "area-4")) {
    const villageSteps = ["built-build-well", "built-build-gate", "built-build-watch", "built-build-hut-6", "built-build-hut-7", "built-build-hall2"];
    const growth = villageSteps.filter((id) => unlocked.has(id)).length;
    const count = Math.min(10, 2 + growth);
    const spots = [
      [3890, 510], [3980, 535], [4070, 505], [4170, 535], [4260, 505],
      [4370, 535], [4470, 505], [4560, 535], [4100, 635], [4410, 635],
    ];
    for (let i = 0; i < count; i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.63, i % 3 === 0 ? "rgba(153,104,58,0.80)" : "rgba(120,94,65,0.80)", i % 5 === 0, 0.82);
    }
    if (growth >= 4) cargoPile(ctx, 4530, 650, 6, 0.82);
  }

  if (areas.some((area) => area.id === "area-5")) {
    const small = unlocked.has("built-build-raft-s");
    const large = unlocked.has("built-build-raft-l");
    if (small) {
      cargoPile(ctx, 5070, 245, large ? 8 : 4, 0.9);
      tinyPerson(ctx, 5115, 245, time, 0.5, "rgba(112,85,60,0.82)", true, 0.88);
      tinyPerson(ctx, 5205, 250, time, 1.5, "rgba(132,91,55,0.82)", false, 0.88);
    }
    if (large) {
      movingTinyPerson(ctx, { x: 4960, y: 340 }, { x: 5185, y: 250 }, time, 2.2, "rgba(137,94,55,0.82)", true);
      movingTinyPerson(ctx, { x: 5350, y: 330 }, { x: 5230, y: 250 }, time, 3.4, "rgba(116,89,60,0.82)", true);
    }
  }
};

const drawTaigaAmbientLife = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  // 農耕のはじまり。実働スタッフより小さく薄くし、背景人口として読む。
  if (areas.some((area) => area.id === "area-0")) {
    for (let i = 0; i < 3; i += 1) {
      tinyPerson(ctx, 300 + i * 90, 355 + (i % 2) * 18, time, i * 0.8, "rgba(137,111,62,0.72)", i === 2, 0.76);
    }
  }
  if (areas.some((area) => area.id === "area-1")) {
    const canals = ["equip-canal-1", "equip-canal-2", "equip-canal-3"].filter((id) => unlocked.has(id)).length;
    for (let i = 0; i < 2 + canals; i += 1) {
      tinyPerson(ctx, 930 + i * 110, 370 + (i % 2) * 24, time, 1 + i * 0.6, "rgba(126,105,64,0.70)", i % 3 === 0, 0.76);
    }
  }

  if (areas.some((area) => area.id === "area-4")) {
    const dock = unlocked.has("built-build-dock");
    const market = unlocked.has("built-build-market");
    if (dock) {
      cargoPile(ctx, 3650, riverLane + 118, market ? 10 : 5, 0.9);
      movingTinyPerson(ctx, { x: 3520, y: 420 }, { x: 3660, y: riverLane + 122 }, time, 0.4, "rgba(131,91,55,0.80)", true);
      tinyPerson(ctx, 3715, riverLane + 124, time, 1.4, "rgba(107,82,61,0.80)", false, 0.86);
    }
    if (market) {
      for (let i = 0; i < 4; i += 1) {
        tinyPerson(ctx, 3850 + i * 85, 535 + (i % 2) * 22, time, 2 + i * 0.5, i % 2 ? "rgba(154,102,54,0.78)" : "rgba(104,103,67,0.78)", i === 3, 0.82);
      }
    }
  }

  if (areas.some((area) => area.id === "area-5")) {
    const townSteps = ["built-build-granary", "built-build-well", "built-build-temple", "built-build-ship"];
    const level = townSteps.filter((id) => unlocked.has(id)).length;
    const spots = [[4430, 530], [4530, 560], [4650, 525], [4760, 560], [4870, 525], [4990, 560], [5100, 525]];
    for (let i = 0; i < Math.min(2 + level, spots.length); i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.73, i % 2 ? "rgba(131,94,58,0.78)" : "rgba(111,105,69,0.78)", i % 4 === 0, 0.82);
    }
    if (level >= 3) {
      cargoPile(ctx, 4990, 640, 8 + level * 2, 0.78);
      movingTinyPerson(ctx, { x: 4450, y: 430 }, { x: 5010, y: 610 }, time, 1.7, "rgba(132,91,53,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-6")) {
    const granary = unlocked.has("built-build-granary-2");
    const count = granary ? 8 : 4;
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 5420 + i * 82, 455 + (i % 3) * 28, time, 0.5 + i * 0.55, "rgba(147,119,55,0.76)", i % 3 === 0, 0.78);
    }
    if (granary) {
      cargoPile(ctx, 5780, 640, 14, 0.9);
      movingTinyPerson(ctx, { x: 5480, y: 430 }, { x: 5860, y: 605 }, time, 2.5, "rgba(132,94,51,0.78)", true);
      movingTinyPerson(ctx, { x: 6030, y: 430 }, { x: 5960, y: 605 }, time, 3.7, "rgba(112,101,60,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-7")) {
    const hall = unlocked.has("built-build-delta-hall");
    const dock = unlocked.has("built-build-delta-dock");
    const count = 3 + (hall ? 2 : 0) + (dock ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 6250 + i * 95, 500 + (i % 3) * 24, time, 1.1 + i * 0.5, i % 2 ? "rgba(104,103,70,0.76)" : "rgba(132,91,54,0.76)", i % 3 === 0, 0.78);
    }
    if (hall) cargoPile(ctx, 6530, 645, dock ? 12 : 7, 0.82);
    if (dock) movingTinyPerson(ctx, { x: 6500, y: 575 }, { x: 6780, y: riverLane + 142 }, time, 2.8, "rgba(139,92,51,0.80)", true);
  }

  if (areas.some((area) => area.id === "area-8")) {
    const reservoir = unlocked.has("built-build-reservoir");
    const levee = unlocked.has("built-build-great-levee");
    const weir = unlocked.has("built-build-great-weir");
    const count = 3 + (reservoir ? 2 : 0) + (levee ? 2 : 0) + (weir ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 7130 + i * 78, 520 + (i % 3) * 30, time, 0.3 + i * 0.48, "rgba(126,91,60,0.78)", i % 2 === 0, 0.80);
    }
    if (reservoir) cargoPile(ctx, 7300, 650, levee ? 12 : 7, 0.88);
    if (levee) movingTinyPerson(ctx, { x: 7200, y: 450 }, { x: 7560, y: 580 }, time, 1.9, "rgba(142,99,54,0.80)", true);
    if (weir) movingTinyPerson(ctx, { x: 7530, y: 570 }, { x: 7780, y: riverLane + 150 }, time, 3.1, "rgba(111,102,68,0.80)", true);
  }
};
`;

replaceOnce(
  "const drawFireLateAreaIdentity = (",
  `${livingHelpers}\nconst drawFireLateAreaIdentity = (`,
  "insert living world helpers",
);

replaceOnce(
  `  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);\n  drawFireLateInvestmentGrowth(ctx, areas, unlockedSet, time, effects);\n  const valley = areas.find((area) => area.id === "area-2");`,
  `  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);\n  drawFireLateInvestmentGrowth(ctx, areas, unlockedSet, time, effects);\n  drawFireAmbientLife(ctx, areas, unlockedSet, time);\n  const valley = areas.find((area) => area.id === "area-2");`,
  "wire fire ambient life",
);

replaceOnce(
  `  const unlockedSet = new Set(unlocked);\n  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane, unlockedSet);\n\n  // 船は人口・交易の成長を背景側で見せる。実働の船とは別の遠景なので当たり判定を持たない。`,
  `  const unlockedSet = new Set(unlocked);\n  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane, unlockedSet);\n  drawTaigaAmbientLife(ctx, areas, unlockedSet, time, riverLane);\n\n  // 船は人口・交易の成長を背景側で見せる。実働の船とは別の遠景なので当たり判定を持たない。`,
  "wire taiga ambient life",
);

fs.writeFileSync(path, source);
console.log("Applied living-world graphics pass");
