import fs from "node:fs";

const path = "lib/worldGraphicPass.ts";
let src = fs.readFileSync(path, "utf8");

const fireFn = `
const drawFireDensityLadder = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  const woodStack = (x: number, y: number, count: number, scale = 1) => {
    ctx.strokeStyle = "rgba(92,61,37,0.72)";
    ctx.lineWidth = 5 * scale;
    ctx.lineCap = "round";
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      ctx.beginPath();
      ctx.moveTo(x + col * 12 * scale, y - row * 8 * scale);
      ctx.lineTo(x + (col * 12 + 22) * scale, y - row * 8 * scale);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  };

  const dryingRack = (x: number, y: number, scale = 1) => {
    ctx.strokeStyle = "rgba(93,63,39,0.70)";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 26 * scale, y + 20 * scale);
    ctx.lineTo(x - 18 * scale, y - 24 * scale);
    ctx.moveTo(x + 26 * scale, y + 20 * scale);
    ctx.lineTo(x + 18 * scale, y - 24 * scale);
    ctx.moveTo(x - 22 * scale, y - 14 * scale);
    ctx.lineTo(x + 22 * scale, y - 14 * scale);
    ctx.stroke();
    ctx.strokeStyle = "rgba(155,100,60,0.58)";
    ctx.lineWidth = 5 * scale;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 13 * scale + i * 13 * scale, y - 12 * scale);
      ctx.lineTo(x - 11 * scale + i * 13 * scale, y + 5 * scale);
      ctx.stroke();
    }
  };

  // 最初の火：定住が始まると、火の周囲に「暮らしの物量」が生まれる。
  if (areas.some((area) => area.id === "area-0")) {
    if (unlocked.has("built-build-hut-1")) {
      woodStack(190, 290, 7, 0.78);
      dryingRack(515, 300, 0.72);
    }
    if (unlocked.has("built-build-fire-1b")) {
      woodStack(470, 235, 10, 0.82);
      ctx.fillStyle = "rgba(57,43,31,0.18)";
      ctx.beginPath();
      ctx.ellipse(470, 242, 66, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 集落：宴・共同生活が進むほど、背景の煙と保存設備も増える。
  if (areas.some((area) => area.id === "area-1")) {
    const hall = unlocked.has("built-build-hall");
    const feast = unlocked.has("built-build-feast");
    if (hall) {
      woodStack(1600, 650, 12, 0.90);
      dryingRack(1810, 640, 0.86);
      if (effects) smoke(ctx, 1700, 500, time + 2.7, 0.68);
    }
    if (feast) {
      dryingRack(1945, 635, 0.92);
      woodStack(2010, 664, 14, 0.94);
      ctx.fillStyle = "rgba(184,116,54,0.14)";
      ctx.beginPath();
      ctx.ellipse(1880, 630, 142, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 冬ごもり：完成後は薪備蓄と複数の煙突で「生き延びている」密度を見せる。
  if (areas.some((area) => area.id === "area-3")) {
    if (unlocked.has("built-build-hut-4")) woodStack(2980, 648, 10, 0.86);
    if (unlocked.has("built-build-hut-5")) woodStack(3380, 652, 12, 0.90);
    if (unlocked.has("built-build-lamp") && effects) {
      for (const [x, phase] of [[3060, 0.2], [3300, 1.0], [3490, 1.8]] as const) {
        const glow = ctx.createRadialGradient(x, 610, 2, x, 610, 48);
        glow.addColorStop(0, "rgba(255,192,98,0.22)");
        glow.addColorStop(1, "rgba(255,192,98,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, 610 + Math.sin(time + phase), 48, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 村：門・見張り台・集会所が揃うと、広場周囲に備蓄・旗・生活設備が一気に増える。
  if (areas.some((area) => area.id === "area-4")) {
    if (unlocked.has("built-build-gate")) {
      woodStack(3920, 690, 9, 0.72);
      dryingRack(4040, 680, 0.70);
    }
    if (unlocked.has("built-build-hall2")) {
      woodStack(4370, 690, 16, 0.94);
      dryingRack(4580, 680, 0.90);
      ctx.strokeStyle = "rgba(91,61,38,0.74)";
      ctx.lineWidth = 4;
      for (const x of [4380, 4460, 4540]) {
        ctx.beginPath();
        ctx.moveTo(x, 642);
        ctx.lineTo(x, 590);
        ctx.stroke();
        ctx.fillStyle = "rgba(173,105,58,0.52)";
        ctx.beginPath();
        ctx.moveTo(x + 2, 592);
        ctx.lineTo(x + 28, 603);
        ctx.lineTo(x + 2, 612);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 川：大型いかだ完成後は、桟橋の周囲が「物流拠点」になる。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-raft-l")) {
    cargoPile(ctx, 5085, 274, 16, 0.86);
    cargoPile(ctx, 5270, 278, 12, 0.72);
    ctx.strokeStyle = "rgba(206,175,119,0.36)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(5100, 216);
    ctx.quadraticCurveTo(5180, 192, 5295, 218);
    ctx.stroke();
  }

  ctx.restore();
};

`;

const taigaFn = `
const drawTaigaDensityLadder = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  ctx.save();

  const banner = (x: number, y: number, phase: number, scale = 1) => {
    ctx.strokeStyle = "rgba(87,60,38,0.74)";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y + 34 * scale);
    ctx.lineTo(x, y - 34 * scale);
    ctx.stroke();
    const wave = Math.sin(time * 1.8 + phase) * 5 * scale;
    ctx.fillStyle = phase % 2 > 1 ? "rgba(186,123,66,0.62)" : "rgba(202,158,75,0.62)";
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 30 * scale);
    ctx.lineTo(x + 34 * scale + wave, y - 17 * scale);
    ctx.lineTo(x + 2, y - 5 * scale);
    ctx.closePath();
    ctx.fill();
  };

  // 市場：完成時は建物だけでなく、荷・旗・係留船の密度が上がる。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-market")) {
    cargoPile(ctx, 3770, 642, 16, 0.84);
    cargoPile(ctx, 4090, 650, 18, 0.92);
    for (const [x, p] of [[3745, 0.2], [3920, 1.6], [4105, 2.8]] as const) banner(x, 562, p, 0.76);
    drawBoat(ctx, 3680, riverLane + 72 + Math.sin(time * 1.1) * 2, 0.70, true);
    drawBoat(ctx, 4050, riverLane + 96 + Math.sin(time * 0.9 + 1) * 2, 0.62, true);
  }

  // 川の町：大型建築と交易船が揃うと、家並みと煙が奥へ増える。
  if (areas.some((area) => area.id === "area-5")) {
    const temple = unlocked.has("built-build-temple");
    const ship = unlocked.has("built-build-ship");
    if (temple) {
      for (const [x, y, s] of [[4660, 520, 0.64], [4930, 536, 0.72], [5035, 555, 0.58]] as const) {
        ctx.fillStyle = "rgba(121,82,47,0.58)";
        ctx.fillRect(x - 20 * s, y - 22 * s, 40 * s, 24 * s);
        ctx.fillStyle = "rgba(88,59,37,0.68)";
        ctx.beginPath();
        ctx.moveTo(x - 26 * s, y - 22 * s);
        ctx.lineTo(x, y - 42 * s);
        ctx.lineTo(x + 26 * s, y - 22 * s);
        ctx.closePath();
        ctx.fill();
      }
      smoke(ctx, 4928, 498, time + 2.5, 0.44);
    }
    if (ship) {
      cargoPile(ctx, 4550, 642, 14, 0.82);
      cargoPile(ctx, 4750, 650, 18, 0.92);
      banner(4620, 585, 1.2, 0.72);
    }
  }

  // 大穀倉：完成時は穀物の量が主役。建物の周囲にも集積を広げる。
  if (areas.some((area) => area.id === "area-6") && unlocked.has("built-build-granary-2")) {
    for (const [x, y, n, s] of [[5580, 654, 13, 0.72], [5700, 662, 18, 0.86], [6060, 658, 16, 0.82]] as const) {
      cargoPile(ctx, x, y, n, s);
    }
    for (const [x, p] of [[5620, 0.4], [6020, 2.0]] as const) banner(x, 584, p, 0.68);
    ctx.fillStyle = "rgba(196,164,70,0.10)";
    ctx.beginPath();
    ctx.ellipse(5840, 642, 310, 58, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 三角州：港ができると係留船・荷・旗で「交通の結節点」になる。
  if (areas.some((area) => area.id === "area-7") && unlocked.has("built-build-delta-dock")) {
    cargoPile(ctx, 6500, 648, 14, 0.80);
    cargoPile(ctx, 6720, 648, 10, 0.70);
    banner(6560, 575, 0.9, 0.68);
    drawBoat(ctx, 6640, riverLane + 84 + Math.sin(time + 0.5) * 2, 0.72, true);
    drawBoat(ctx, 6860, riverLane + 108 + Math.sin(time * 0.8 + 2) * 2, 0.60, true);
  }

  // 大治水：堤防・水門完成後は測量杭・資材・作業旗が周囲まで連続する。
  if (areas.some((area) => area.id === "area-8")) {
    if (unlocked.has("built-build-great-levee")) {
      for (const x of [7240, 7380, 7520, 7660]) {
        ctx.strokeStyle = "rgba(98,70,46,0.58)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 654);
        ctx.lineTo(x, 612);
        ctx.stroke();
      }
      cargoPile(ctx, 7340, 660, 11, 0.68);
    }
    if (unlocked.has("built-build-great-weir")) {
      cargoPile(ctx, 7610, 658, 16, 0.78);
      banner(7480, 596, 1.3, 0.72);
      banner(7820, 590, 2.7, 0.76);
    }
  }

  ctx.restore();
};

`;

if (!src.includes("const drawFireDensityLadder =")) {
  const marker = "export const drawFireGraphicPass = (";
  if (!src.includes(marker)) throw new Error("fire export marker missing");
  src = src.replace(marker, fireFn + marker);
}
if (!src.includes("drawFireDensityLadder(ctx, areas, unlockedSet")) {
  const marker = "  drawFireProgressWayfinding(ctx, areas, unlockedSet, time, effects);";
  if (!src.includes(marker)) throw new Error("fire density call marker missing");
  src = src.replace(marker, marker + "\n  drawFireDensityLadder(ctx, areas, unlockedSet, time, effects);");
}

if (!src.includes("const drawTaigaDensityLadder =")) {
  const marker = "export const drawTaigaGraphicPass = (";
  if (!src.includes(marker)) throw new Error("taiga export marker missing");
  src = src.replace(marker, taigaFn + marker);
}
if (!src.includes("drawTaigaDensityLadder(ctx, areas, unlockedSet")) {
  const marker = "  drawTaigaProgressWayfinding(ctx, areas, unlockedSet, riverLane, time);";
  if (!src.includes(marker)) throw new Error("taiga density call marker missing");
  src = src.replace(marker, marker + "\n  drawTaigaDensityLadder(ctx, areas, unlockedSet, time, riverLane);");
}

fs.writeFileSync(path, src);
