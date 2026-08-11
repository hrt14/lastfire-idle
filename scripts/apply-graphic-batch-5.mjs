import fs from 'node:fs';

const path = 'lib/worldGraphicPass.ts';
let s = fs.readFileSync(path, 'utf8');

const fireMarker = 'export const drawFireGraphicPass = (\n';
const fireHelper = String.raw`
const drawFireCivilizationSpread = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  const camp = areas.find((area) => area.id === "area-1");
  if (camp) {
    const hutCount =
      (unlocked.has("built-build-hut-1") ? 1 : 0) +
      (unlocked.has("built-build-hut-2") ? 1 : 0) +
      (unlocked.has("built-build-hut-3") ? 1 : 0) +
      (unlocked.has("built-build-hall") ? 2 : 0);
    // 発展すると手前の設備だけでなく、奥にも小さな住居が増える。
    for (let i = 0; i < hutCount; i += 1) {
      const x = camp.rect.x0 + 180 + i * 104;
      const y = camp.rect.y0 + 155 + (i % 2) * 38;
      hideShelter(ctx, x, y, 0.48 + (i % 2) * 0.05);
      if (effects && i % 2 === 0) smoke(ctx, x + 8, y - 34, time + i, 0.34);
    }
    if (unlocked.has("built-build-hall")) {
      roundPath(
        ctx,
        [
          { x: camp.rect.x0 + 90, y: camp.rect.y0 + 440 },
          { x: camp.rect.x0 + 330, y: camp.rect.y0 + 365 },
          { x: camp.rect.x0 + 650, y: camp.rect.y0 + 395 },
        ],
        11,
        "rgba(107,78,48,0.14)",
      );
    }
  }

  const valley = areas.find((area) => area.id === "area-2");
  const village = areas.find((area) => area.id === "area-4");
  if (valley && village && unlocked.has("built-build-feast")) {
    // 狩り場から生活圏へ続く、何度も踏まれた運搬路。
    roundPath(
      ctx,
      [
        { x: valley.rect.x0 + valley.rect.x1 - valley.rect.x0 - 120, y: valley.rect.y0 + 520 },
        { x: valley.rect.x1 + 170, y: 590 },
        { x: village.rect.x0 + 170, y: 610 },
      ],
      18,
      "rgba(92,65,43,0.12)",
    );
    roundPath(
      ctx,
      [
        { x: valley.rect.x1 - 120, y: valley.rect.y0 + 520 },
        { x: valley.rect.x1 + 170, y: 590 },
        { x: village.rect.x0 + 170, y: 610 },
      ],
      4,
      "rgba(176,132,79,0.08)",
    );
  }

  if (village) {
    const level =
      (unlocked.has("built-build-hut-6") ? 1 : 0) +
      (unlocked.has("built-build-hut-7") ? 1 : 0) +
      (unlocked.has("built-build-watch") ? 1 : 0) +
      (unlocked.has("built-build-hall2") ? 2 : 0);
    for (let i = 0; i < level; i += 1) {
      const x = village.rect.x0 + 180 + i * 110;
      const y = village.rect.y0 + 155 + (i % 3) * 34;
      hideShelter(ctx, x, y, 0.44 + (i % 2) * 0.04);
      if (effects && i % 3 === 0) smoke(ctx, x + 10, y - 30, time + 2 + i, 0.32);
    }
    if (unlocked.has("built-build-watch")) {
      // 見張り台の存在を、遠景の柵列でも補強。
      ctx.strokeStyle = "rgba(79,57,38,0.32)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i += 1) {
        const x = village.rect.x0 + 110 + i * 78;
        const y = village.rect.y0 + 250 + Math.sin(i * 0.9) * 16;
        ctx.beginPath();
        ctx.moveTo(x, y + 17);
        ctx.lineTo(x, y - 17);
        ctx.stroke();
      }
    }
  }

  const river = areas.find((area) => area.id === "area-5");
  if (village && river && unlocked.has("built-build-raft-s")) {
    // 村から川へ向かう道を視覚的に太くする。
    roundPath(
      ctx,
      [
        { x: village.rect.x1 - 120, y: 590 },
        { x: river.rect.x0 + 120, y: 470 },
        { x: river.rect.x0 + 360, y: 300 },
      ],
      unlocked.has("built-build-raft-l") ? 22 : 13,
      "rgba(100,74,48,0.13)",
    );
  }
  if (river && unlocked.has("built-build-raft-l")) {
    // 大型いかだ完成後は、対岸にも小さな活動拠点が見え始める。
    for (let i = 0; i < 3; i += 1) {
      const x = river.rect.x0 + 360 + i * 170;
      const y = river.rect.y0 + 118 + (i % 2) * 22;
      hideShelter(ctx, x, y, 0.34);
      if (effects && i === 1) smoke(ctx, x + 6, y - 25, time + 5.2, 0.25);
    }
  }

  ctx.restore();
};

`;

if (!s.includes('const drawFireCivilizationSpread = (')) {
  s = s.replace(fireMarker, fireHelper + fireMarker);
}
const fireCall = '  drawFireEnvironmentalMotion(ctx, areas, time, effects);\n';
if (!s.includes('drawFireCivilizationSpread(ctx, areas, unlockedSet, time, effects);')) {
  s = s.replace(
    fireCall,
    fireCall + '  drawFireCivilizationSpread(ctx, areas, unlockedSet, time, effects);\n',
  );
}

const taigaMarker = 'export const drawTaigaGraphicPass = (\n';
const taigaHelper = String.raw`
const drawTaigaCivilizationSpread = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
  riverLane: number,
) => {
  ctx.save();

  const farmAreas = areas.filter((area) => ["area-0", "area-1", "area-2"].includes(area.id));
  if (unlocked.has("built-build-canal")) {
    // 初期農地が点ではなく帯として広がり、灌漑文明の面積感を出す。
    for (const area of farmAreas) {
      const w = area.rect.x1 - area.rect.x0;
      for (let i = 0; i < 5; i += 1) {
        const x = area.rect.x0 + 90 + i * Math.max(70, (w - 180) / 4);
        const y = area.rect.y0 + 165 + (i % 2) * 32;
        ctx.fillStyle = "rgba(169,143,65,0.18)";
        ctx.beginPath();
        ctx.ellipse(x, y, 42, 16, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const market = areas.find((area) => area.id === "area-4");
  if (market && unlocked.has("built-build-market")) {
    // 市場完成後は、奥にも小さな天幕列を増やし、商業地区として面で見せる。
    for (let i = 0; i < 5; i += 1) {
      const x = market.rect.x0 + 190 + i * 92;
      const y = market.rect.y0 + 190 + (i % 2) * 34;
      ctx.fillStyle = i % 2 ? "rgba(176,111,62,0.34)" : "rgba(204,159,78,0.34)";
      ctx.beginPath();
      ctx.moveTo(x - 24, y);
      ctx.lineTo(x, y - 24);
      ctx.lineTo(x + 24, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  const town = areas.find((area) => area.id === "area-5");
  if (town) {
    const skyline =
      (unlocked.has("built-build-granary") ? 2 : 0) +
      (unlocked.has("built-build-well") ? 1 : 0) +
      (unlocked.has("built-build-temple") ? 2 : 0) +
      (unlocked.has("built-build-ship") ? 1 : 0);
    // 投資が進むほど、町の奥行きに家並みが増える。
    for (let i = 0; i < skyline; i += 1) {
      const x = town.rect.x0 + 150 + i * 108;
      const y = town.rect.y0 + 195 + (i % 3) * 24;
      ctx.fillStyle = "rgba(93,67,44,0.34)";
      ctx.fillRect(x - 18, y - 20, 36, 24);
      ctx.fillStyle = "rgba(72,52,36,0.40)";
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 20);
      ctx.lineTo(x, y - 38);
      ctx.lineTo(x + 24, y - 20);
      ctx.closePath();
      ctx.fill();
      if (effects && i % 2 === 0) smoke(ctx, x + 8, y - 31, time + i * 0.7, 0.24);
    }
  }

  const granary = areas.find((area) => area.id === "area-6");
  if (granary && unlocked.has("built-build-granary-2")) {
    // 巨大穀倉の背後にも小型倉を並べ、地域全体が穀物集積地に見えるようにする。
    for (let i = 0; i < 5; i += 1) {
      const x = granary.rect.x0 + 160 + i * 130;
      const y = granary.rect.y0 + 170 + (i % 2) * 28;
      ctx.fillStyle = "rgba(119,84,48,0.36)";
      ctx.fillRect(x - 24, y - 26, 48, 30);
      ctx.fillStyle = "rgba(88,61,39,0.42)";
      ctx.beginPath();
      ctx.moveTo(x - 31, y - 26);
      ctx.lineTo(x, y - 49);
      ctx.lineTo(x + 31, y - 26);
      ctx.closePath();
      ctx.fill();
    }
  }

  const delta = areas.find((area) => area.id === "area-7");
  if (delta && unlocked.has("built-build-delta-dock")) {
    // 三角州は遠景の小舟を増やして「水上交通網」にする。
    for (let i = 0; i < 4; i += 1) {
      const x = delta.rect.x0 + 180 + i * 180 + Math.sin(time * 0.22 + i) * 20;
      const y = riverLane - 8 + (i % 3) * 34;
      drawBoat(ctx, x, y, 0.34 + (i % 2) * 0.05, i % 2 === 0);
    }
  }

  const flood = areas.find((area) => area.id === "area-8");
  if (flood && unlocked.has("built-build-great-levee")) {
    // 最終区画は堤防が画面奥まで反復して見え、土木規模を感じる構図へ。
    ctx.strokeStyle = "rgba(119,86,52,0.24)";
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      ctx.lineWidth = 13 - i * 2;
      const y = flood.rect.y0 + 160 + i * 56;
      ctx.beginPath();
      ctx.moveTo(flood.rect.x0 + 70, y);
      ctx.quadraticCurveTo(
        (flood.rect.x0 + flood.rect.x1) / 2,
        y - 45,
        flood.rect.x1 - 70,
        y + 12,
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // 生産地→市場→町→穀倉→三角州へ、投資に応じて物流路が伸びる。
  const route: { x: number; y: number }[] = [];
  if (farmAreas.length) route.push({ x: 920, y: 545 });
  if (unlocked.has("built-build-market")) route.push({ x: 3920, y: 555 });
  if (unlocked.has("built-build-granary")) route.push({ x: 4820, y: 570 });
  if (unlocked.has("built-build-granary-2")) route.push({ x: 5920, y: 575 });
  if (unlocked.has("built-build-delta-dock")) route.push({ x: 6720, y: 545 });
  if (route.length >= 2) {
    roundPath(ctx, route, 21, "rgba(118,86,52,0.10)");
    roundPath(ctx, route, 4, "rgba(202,160,88,0.08)");
  }

  ctx.restore();
};

`;

if (!s.includes('const drawTaigaCivilizationSpread = (')) {
  s = s.replace(taigaMarker, taigaHelper + taigaMarker);
}
const taigaCall = '  drawTaigaEnvironmentalMotion(ctx, areas, unlockedSet, time, effects, riverLane);\n';
if (!s.includes('drawTaigaCivilizationSpread(ctx, areas, unlockedSet, time, effects, riverLane);')) {
  s = s.replace(
    taigaCall,
    taigaCall +
      '  drawTaigaCivilizationSpread(ctx, areas, unlockedSet, time, effects, riverLane);\n',
  );
}

fs.writeFileSync(path, s);
