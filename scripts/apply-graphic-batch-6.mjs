import fs from "node:fs";

const path = "lib/worldGraphicPass.ts";
let src = fs.readFileSync(path, "utf8");

const fireFn = `
const drawFireProgressWayfinding = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const main = areas
    .filter((area) => ["area-0", "area-1", "area-2", "area-3", "area-4", "area-5"].includes(area.id))
    .sort((a, b) => a.rect.x0 - b.rect.x0);
  if (!main.length) return;
  ctx.save();

  // 主要区画の境目に、時代に合った小さな道標を置く。UI矢印ではなく景色そのものが次を指す。
  for (let i = 0; i < main.length - 1; i += 1) {
    const a = main[i];
    const b = main[i + 1];
    const ay = a.rect.y0 + (a.rect.y1 - a.rect.y0) * 0.60;
    const by = b.rect.y0 + (b.rect.y1 - b.rect.y0) * 0.60;
    const x0 = a.rect.x1 - 88;
    const x1 = b.rect.x0 + 88;

    ctx.strokeStyle = i >= 3 ? "rgba(143,104,61,0.30)" : "rgba(116,94,63,0.24)";
    ctx.lineWidth = i >= 3 ? 5 : 3;
    ctx.setLineDash(i >= 4 ? [] : [10, 14]);
    ctx.beginPath();
    ctx.moveTo(x0, ay);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(ay, by) - 34, x1, by);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = (x0 + x1) / 2;
    const my = (ay + by) / 2 - 18;
    if (i <= 1) {
      // 獣道・マンモス谷までは石積みと足跡。
      ctx.fillStyle = "rgba(91,78,61,0.56)";
      for (let s = 0; s < 3; s += 1) {
        ctx.beginPath();
        ctx.ellipse(mx + s * 7 - 7, my - s * 5, 10 - s * 1.8, 5.5, -0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(70,58,45,0.25)";
      for (let f = 0; f < 4; f += 1) {
        ctx.beginPath();
        ctx.ellipse(mx - 42 + f * 21, my + 26 + (f % 2) * 6, 7, 11, -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (i <= 3) {
      // 冬〜村は松明・門標。文明化で道標そのものも人工物へ変わる。
      ctx.strokeStyle = "rgba(94,62,35,0.82)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mx, my + 30);
      ctx.lineTo(mx, my - 18);
      ctx.stroke();
      if (effects) {
        const glow = ctx.createRadialGradient(mx, my - 24, 2, mx, my - 24, 38);
        glow.addColorStop(0, "rgba(255,188,86,0.34)");
        glow.addColorStop(1, "rgba(255,188,86,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my - 24, 38, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(238,151,57,0.88)";
      ctx.beginPath();
      ctx.ellipse(mx, my - 25, 7, 12 + Math.sin(time * 3 + i) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 川へ向かう最後の境界は、船着き場へ視線を送る高い杭。
      ctx.strokeStyle = "rgba(96,61,34,0.82)";
      ctx.lineWidth = 7;
      for (const dx of [-18, 18]) {
        ctx.beginPath();
        ctx.moveTo(mx + dx, my + 38);
        ctx.lineTo(mx + dx, my - 36);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(214,176,103,0.48)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx - 22, my - 20);
      ctx.lineTo(mx + 22, my - 20);
      ctx.stroke();
    }
  }

  // 一番先まで到達した区画には「前線」の気配を置き、次の発展余地を画面から読ませる。
  const frontier = main[main.length - 1];
  if (frontier && frontier.id !== "area-5") {
    const fx = frontier.rect.x1 - 70;
    const fy = frontier.rect.y0 + (frontier.rect.y1 - frontier.rect.y0) * 0.72;
    ctx.strokeStyle = "rgba(92,68,43,0.42)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k += 1) {
      const x = fx + (k % 2) * 26;
      const y = fy + Math.floor(k / 2) * 24;
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x, y - 12);
      ctx.stroke();
    }
    if (unlocked.has("built-build-gate") || unlocked.has("built-build-hall2")) {
      ctx.fillStyle = "rgba(183,137,75,0.20)";
      ctx.fillRect(fx - 18, fy - 4, 82, 16);
    }
  }

  ctx.restore();
};

`;

const taigaFn = `
const drawTaigaProgressWayfinding = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  riverLane: number,
  time: number,
) => {
  const main = areas
    .filter((area) => /^area-[0-8]$/.test(area.id))
    .sort((a, b) => a.rect.x0 - b.rect.x0);
  if (!main.length) return;
  ctx.save();

  // 文明が進むほど「人が使っている道」の情報量を増やす。農地→市場→町→治水へ自然に視線を運ぶ。
  for (let i = 0; i < main.length - 1; i += 1) {
    const a = main[i];
    const b = main[i + 1];
    const x0 = a.rect.x1 - 76;
    const x1 = b.rect.x0 + 76;
    const y0 = Math.max(riverLane + 126, a.rect.y0 + (a.rect.y1 - a.rect.y0) * 0.66);
    const y1 = Math.max(riverLane + 126, b.rect.y0 + (b.rect.y1 - b.rect.y0) * 0.66);
    ctx.strokeStyle = i < 3 ? "rgba(127,101,63,0.20)" : "rgba(145,104,57,0.28)";
    ctx.lineWidth = i < 3 ? 4 : 7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + 48, y0 - 28, x1 - 48, y1 + 18, x1, y1);
    ctx.stroke();

    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 - 12;
    if (i < 3) {
      // 初期農村は水瓶・籠・杭。
      ctx.fillStyle = "rgba(145,105,58,0.66)";
      ctx.beginPath();
      ctx.ellipse(mx - 10, my + 8, 12, 8, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(100,73,44,0.60)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx + 12, my + 20);
      ctx.lineTo(mx + 12, my - 18);
      ctx.stroke();
    } else if (i < 6) {
      // 市場〜大穀倉では道標旗と荷物が増える。
      ctx.strokeStyle = "rgba(93,61,36,0.78)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx, my + 28);
      ctx.lineTo(mx, my - 28);
      ctx.stroke();
      ctx.fillStyle = i % 2 ? "rgba(172,101,58,0.62)" : "rgba(196,151,71,0.62)";
      ctx.beginPath();
      ctx.moveTo(mx + 2, my - 26);
      ctx.lineTo(mx + 34, my - 14);
      ctx.lineTo(mx + 2, my - 5);
      ctx.closePath();
      ctx.fill();
      cargoPile(ctx, mx - 36, my + 23, 5 + (i - 3) * 2, 0.52);
    } else {
      // 三角州〜大治水は高い測量杭・水位標で、土木文明の到達感を出す。
      ctx.strokeStyle = "rgba(91,67,45,0.78)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mx, my + 36);
      ctx.lineTo(mx, my - 42);
      ctx.stroke();
      ctx.strokeStyle = "rgba(219,187,117,0.48)";
      ctx.lineWidth = 2;
      for (let m = 0; m < 4; m += 1) {
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 28 + m * 14);
        ctx.lineTo(mx + 8, my - 28 + m * 14);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(208,228,222,0.14)";
      ctx.beginPath();
      ctx.ellipse(mx + 26, riverLane + 58 + Math.sin(time * 1.3 + i) * 2, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 投資が進むと、主要な物流拠点へ向かう横断方向の轍が増える。
  const routes: Array<[boolean, number, number, number, number]> = [
    [unlocked.has("built-build-market"), 3500, 610, 3970, 520],
    [unlocked.has("built-build-temple") || unlocked.has("built-build-ship"), 3970, 520, 4820, 585],
    [unlocked.has("built-build-granary-2"), 5000, 590, 5900, 610],
    [unlocked.has("built-build-delta-dock"), 6100, 600, 6750, riverLane + 142],
  ];
  for (const [show, x0, y0, x1, y1] of routes) {
    if (!show) continue;
    ctx.strokeStyle = "rgba(113,82,49,0.18)";
    ctx.lineWidth = 2;
    for (const off of [-6, 6]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + off);
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 24 + off, x1, y1 + off);
      ctx.stroke();
    }
  }

  ctx.restore();
};

`;

if (!src.includes("const drawFireProgressWayfinding =")) {
  const marker = "export const drawFireGraphicPass = (";
  if (!src.includes(marker)) throw new Error("fire export marker missing");
  src = src.replace(marker, fireFn + marker);
}
if (!src.includes("drawFireProgressWayfinding(ctx, areas, unlockedSet")) {
  const marker = "  drawFireCompletionContrast(ctx, areas, unlockedSet, time, effects);";
  if (!src.includes(marker)) throw new Error("fire call marker missing");
  src = src.replace(marker, marker + "\n  drawFireProgressWayfinding(ctx, areas, unlockedSet, time, effects);");
}

if (!src.includes("const drawTaigaProgressWayfinding =")) {
  const marker = "export const drawTaigaGraphicPass = (";
  if (!src.includes(marker)) throw new Error("taiga export marker missing");
  src = src.replace(marker, taigaFn + marker);
}
if (!src.includes("drawTaigaProgressWayfinding(ctx, areas, unlockedSet")) {
  const marker = "  drawTaigaCompletionContrast(ctx, areas, unlockedSet, time, riverLane);";
  if (!src.includes(marker)) throw new Error("taiga call marker missing");
  src = src.replace(marker, marker + "\n  drawTaigaProgressWayfinding(ctx, areas, unlockedSet, riverLane, time);");
}

fs.writeFileSync(path, src);
