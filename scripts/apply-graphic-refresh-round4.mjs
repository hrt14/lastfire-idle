import fs from "node:fs";

const path = "lib/worldGraphicPass.ts";
let source = fs.readFileSync(path, "utf8");

const replaceOnce = (from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 anchor, got ${count}`);
  source = source.replace(from, to);
};

const fireLateHelpers = String.raw`
const drawFireLateAreaIdentity = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  time: number,
  effects: boolean,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const cx = rect.x0 + w * 0.5;
  const cy = rect.y0 + h * 0.5;
  ctx.save();

  if (area.id === "area-3") {
    // 冬ごもりの丘: 雪の吹きだまり・風筋・寒色の尾根で、暖地と一目で切り替える。
    ctx.fillStyle = "rgba(219,229,232,0.13)";
    for (let i = 0; i < 7; i += 1) {
      const x = rect.x0 + 55 + i * (w - 110) / 6;
      const y = rect.y0 + 90 + (i % 3) * 74;
      ctx.beginPath();
      ctx.ellipse(x, y, 68 + (i % 2) * 24, 18 + (i % 3) * 4, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(39,55,65,0.27)";
    ctx.beginPath();
    ctx.moveTo(rect.x0, rect.y0 + 105);
    for (let i = 0; i <= 9; i += 1) {
      const x = rect.x0 + w * i / 9;
      const y = rect.y0 + 48 + ((i * 31) % 4) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(rect.x1, rect.y0);
    ctx.lineTo(rect.x0, rect.y0);
    ctx.closePath();
    ctx.fill();
    if (effects) {
      ctx.strokeStyle = "rgba(231,240,243,0.18)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i += 1) {
        const drift = (time * 34 + i * 113) % Math.max(180, w);
        const x = rect.x0 + drift;
        const y = rect.y0 + 120 + (i * 67) % Math.max(120, h - 180);
        ctx.beginPath();
        ctx.moveTo(x - 24, y + 3);
        ctx.quadraticCurveTo(x, y - 4, x + 30, y);
        ctx.stroke();
      }
    }
  }

  if (area.id === "area-4") {
    // 村: 野営地より整った広場と道筋。文明化が地面から読めるようにする。
    ctx.fillStyle = "rgba(112,91,58,0.15)";
    ctx.beginPath();
    ctx.ellipse(cx, rect.y0 + h * 0.69, w * 0.28, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    roundPath(ctx, [
      { x: rect.x0 + 40, y: rect.y0 + h * 0.58 },
      { x: cx - 80, y: rect.y0 + h * 0.67 },
      { x: rect.x1 - 48, y: rect.y0 + h * 0.60 },
    ], 24, "rgba(145,116,72,0.12)");
    ctx.strokeStyle = "rgba(123,86,48,0.38)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i += 1) {
      const x = rect.x0 + 42 + i * (w - 84) / 9;
      const y = rect.y1 - 30 - (i % 2) * 6;
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x, y - 16);
      ctx.stroke();
    }
  }

  if (area.id === "area-5") {
    // 川への道: このステージで初めて大きな水面が現れる。岸は直線にしない。
    const top = rect.y0 + 72;
    const bottom = rect.y0 + 235;
    const water = ctx.createLinearGradient(0, top, 0, bottom);
    water.addColorStop(0, "rgba(39,86,94,0.68)");
    water.addColorStop(1, "rgba(24,57,66,0.72)");
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.moveTo(rect.x0, top + 12);
    for (let i = 0; i <= 8; i += 1) {
      const x = rect.x0 + w * i / 8;
      const y = top + Math.sin(i * 1.3) * 18 + (i % 3) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(rect.x1, bottom);
    ctx.lineTo(rect.x0, bottom + 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(155,135,92,0.32)";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 100 + i * 170, top + 82 + (i % 2) * 26, 42 + (i % 3) * 10, 9, i * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 12; i += 1) {
      grassTuft(ctx, rect.x0 + 35 + i * (w - 70) / 11, bottom + 8 + (i % 3) * 4, 0.9, "rgba(73,104,72,0.72)");
    }
  }

  if (area.id === "area-6") {
    // 夜の森: 密な幹、暗い天蓋、細い安全な踏み跡。
    ctx.fillStyle = "rgba(5,14,11,0.22)";
    ctx.fillRect(rect.x0, rect.y0, w, h);
    ctx.fillStyle = "rgba(19,38,29,0.58)";
    for (let i = 0; i < 16; i += 1) {
      const edgeSide = i % 2 === 0;
      const x = edgeSide ? rect.x0 + 34 + (i % 5) * 38 : rect.x1 - 34 - (i % 5) * 42;
      const y = rect.y0 + 110 + ((i * 73) % Math.max(120, h - 180));
      ctx.fillRect(x - 7, y - 76, 14, 92);
      ctx.beginPath();
      ctx.arc(x, y - 85, 34 + (i % 3) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    roundPath(ctx, [
      { x: rect.x0 + w * 0.18, y: rect.y1 - 55 },
      { x: rect.x0 + w * 0.44, y: cy + 25 },
      { x: rect.x0 + w * 0.72, y: rect.y0 + 130 },
    ], 18, "rgba(142,124,80,0.10)");
    if (effects) {
      ctx.fillStyle = "rgba(235,210,116,0.34)";
      for (let i = 0; i < 6; i += 1) {
        const x = rect.x0 + 130 + ((i * 173) % Math.max(160, w - 260));
        const y = rect.y0 + 170 + ((i * 97) % Math.max(130, h - 280));
        ctx.beginPath();
        ctx.arc(x + Math.sin(time + i) * 4, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (area.id === "area-7") {
    // 風の高台: 開けた稜線と風に倒れる草。森とは逆に空白を主役にする。
    ctx.fillStyle = "rgba(111,132,74,0.12)";
    ctx.beginPath();
    ctx.moveTo(rect.x0, rect.y0 + h * 0.34);
    ctx.quadraticCurveTo(cx, rect.y0 + h * 0.18, rect.x1, rect.y0 + h * 0.30);
    ctx.lineTo(rect.x1, rect.y0);
    ctx.lineTo(rect.x0, rect.y0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(193,209,169,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const y = rect.y0 + 160 + i * 58;
      const shift = effects ? Math.sin(time * 1.5 + i) * 18 : 0;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 80 + shift, y);
      ctx.quadraticCurveTo(cx, y - 16, rect.x1 - 80 + shift, y + 5);
      ctx.stroke();
    }
  }

  if (area.id === "area-8") {
    // 月の湿地: 水たまり、葦、淡い反射。地面を「歩ける平面」にしない。
    const pools = [
      [0.24, 0.30, 0.17, 0.08],
      [0.58, 0.52, 0.22, 0.10],
      [0.80, 0.22, 0.14, 0.07],
      [0.34, 0.75, 0.18, 0.07],
    ];
    for (const [px, py, rx, ry] of pools) {
      const x = rect.x0 + w * px;
      const y = rect.y0 + h * py;
      ctx.fillStyle = "rgba(37,76,78,0.56)";
      ctx.beginPath();
      ctx.ellipse(x, y, w * rx, h * ry, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(157,193,186,0.20)";
      ctx.beginPath();
      ctx.ellipse(x - 8, y - 2, w * rx * 0.45, h * ry * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 15; i += 1) {
      grassTuft(ctx, rect.x0 + 35 + ((i * 127) % Math.max(90, w - 70)), rect.y0 + 110 + ((i * 83) % Math.max(120, h - 190)), 0.82, "rgba(78,118,91,0.72)");
    }
  }

  if (area.id === "area-9") {
    // 岩棚の洞窟: 巨大な黒い洞口をランドマークにする。
    const caveY = rect.y0 + h * 0.34;
    ctx.fillStyle = "rgba(77,76,72,0.72)";
    ctx.beginPath();
    ctx.ellipse(cx, caveY, w * 0.28, h * 0.20, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + w * 0.28, caveY + h * 0.10);
    ctx.lineTo(cx - w * 0.28, caveY + h * 0.10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(8,11,12,0.82)";
    ctx.beginPath();
    ctx.ellipse(cx, caveY + 8, w * 0.18, h * 0.13, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + w * 0.18, caveY + h * 0.10);
    ctx.lineTo(cx - w * 0.18, caveY + h * 0.10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(115,111,102,0.42)";
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 70 + i * (w - 140) / 8, rect.y0 + h * 0.70 + (i % 3) * 22, 25 + (i % 2) * 14, 12, i * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (area.id === "area-10") {
    // 星見の丘: 開けた円形の観測地と石輪。夜空を見上げる「空白」を残す。
    ctx.fillStyle = "rgba(83,101,59,0.16)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 80, w * 0.32, h * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(185,177,139,0.34)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 70, w * 0.22, h * 0.13, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i += 1) {
      const a = i / 12 * Math.PI * 2;
      ctx.fillStyle = "rgba(125,119,103,0.64)";
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * w * 0.22, cy + 70 + Math.sin(a) * h * 0.13, 8, 12, a, 0, Math.PI * 2);
      ctx.fill();
    }
    if (effects) {
      ctx.fillStyle = "rgba(235,226,174,0.46)";
      for (let i = 0; i < 16; i += 1) {
        const x = rect.x0 + 55 + ((i * 211) % Math.max(100, w - 110));
        const y = rect.y0 + 70 + ((i * 79) % 240);
        const pulse = 0.8 + Math.sin(time * 2 + i) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, pulse), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (area.id === "area-11") {
    // 上流の滝: 高さ、水、白い飛沫を同時に見せる終端ランドマーク。
    const fallsX = cx + w * 0.08;
    const cliffY = rect.y0 + 125;
    ctx.fillStyle = "rgba(50,72,73,0.52)";
    ctx.beginPath();
    ctx.moveTo(rect.x0, cliffY + 80);
    ctx.lineTo(fallsX - 110, cliffY + 30);
    ctx.lineTo(fallsX - 75, rect.y0 + 20);
    ctx.lineTo(fallsX + 80, rect.y0 + 20);
    ctx.lineTo(fallsX + 105, cliffY + 35);
    ctx.lineTo(rect.x1, cliffY + 95);
    ctx.lineTo(rect.x1, rect.y0);
    ctx.lineTo(rect.x0, rect.y0);
    ctx.closePath();
    ctx.fill();
    const water = ctx.createLinearGradient(0, cliffY, 0, cliffY + 280);
    water.addColorStop(0, "rgba(149,205,211,0.70)");
    water.addColorStop(1, "rgba(84,151,159,0.48)");
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.moveTo(fallsX - 52, cliffY);
    ctx.quadraticCurveTo(fallsX - 32, cliffY + 150, fallsX - 68, cliffY + 282);
    ctx.lineTo(fallsX + 70, cliffY + 282);
    ctx.quadraticCurveTo(fallsX + 36, cliffY + 150, fallsX + 52, cliffY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(199,232,232,0.28)";
    ctx.beginPath();
    ctx.ellipse(fallsX, cliffY + 288, 112, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    if (effects) {
      ctx.fillStyle = "rgba(227,244,242,0.42)";
      for (let i = 0; i < 12; i += 1) {
        const t = (time * 0.34 + i * 0.11) % 1;
        ctx.beginPath();
        ctx.arc(fallsX - 78 + i * 14, cliffY + 275 - t * 45, 3 + t * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
};

const drawFireLateInvestmentGrowth = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const winter = areas.find((area) => area.id === "area-3");
  if (winter) {
    if (unlocked.has("built-build-hearth-2")) bonfireLandmark(ctx, 3120, 570, time + 0.7, effects);
    for (const [id, x] of [["built-build-hut-4", 2960], ["built-build-hut-5", 3440]] as const) {
      if (!unlocked.has(id)) continue;
      ctx.save();
      ctx.fillStyle = "rgba(82,68,52,0.18)";
      ctx.beginPath();
      ctx.ellipse(x, 585, 74, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (effects) smoke(ctx, x + 18, 530, time + x * 0.001, 0.72);
    }
    if (unlocked.has("built-build-lamp")) {
      for (const x of [3200, 3280, 3360]) {
        const glow = ctx.createRadialGradient(x, 560, 4, x, 560, 48);
        glow.addColorStop(0, "rgba(255,197,103,0.28)");
        glow.addColorStop(1, "rgba(255,197,103,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, 560, 48, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const village = areas.find((area) => area.id === "area-4");
  if (village) {
    if (unlocked.has("built-build-well")) {
      ctx.strokeStyle = "rgba(156,124,76,0.22)";
      ctx.lineWidth = 13;
      for (const target of [[4020, 570], [4180, 570], [4340, 570]] as const) {
        ctx.beginPath();
        ctx.moveTo(3860, 570);
        ctx.lineTo(target[0], target[1]);
        ctx.stroke();
      }
    }
    if (unlocked.has("built-build-gate")) {
      ctx.save();
      ctx.strokeStyle = "rgba(111,72,39,0.82)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(3825, 590);
      ctx.lineTo(3825, 490);
      ctx.moveTo(3895, 590);
      ctx.lineTo(3895, 490);
      ctx.lineTo(3825, 490);
      ctx.stroke();
      ctx.restore();
    }
    if (unlocked.has("built-build-watch")) {
      ctx.save();
      ctx.strokeStyle = "rgba(91,64,39,0.68)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(4180, 540);
      ctx.lineTo(4145, 405);
      ctx.moveTo(4180, 540);
      ctx.lineTo(4215, 405);
      ctx.moveTo(4140, 420);
      ctx.lineTo(4220, 420);
      ctx.stroke();
      ctx.fillStyle = "rgba(112,79,45,0.80)";
      ctx.fillRect(4138, 382, 84, 39);
      ctx.restore();
    }
    if (unlocked.has("built-build-hut-6")) {
      hideShelter(ctx, 4290, 705, 1.08);
      if (effects) smoke(ctx, 4305, 650, time + 1.4, 0.62);
    }
    if (unlocked.has("built-build-hut-7")) {
      hideShelter(ctx, 4455, 702, 1.04);
      if (effects) smoke(ctx, 4470, 650, time + 2.1, 0.62);
    }
    if (unlocked.has("built-build-hall2")) {
      ctx.fillStyle = "rgba(136,102,61,0.18)";
      ctx.beginPath();
      ctx.ellipse(4480, 585, 132, 58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(193,151,88,0.26)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(4480, 585, 104, 43, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const river = areas.find((area) => area.id === "area-5");
  if (river) {
    const dockX = 5190;
    if (unlocked.has("built-build-raft-s")) {
      ctx.strokeStyle = "rgba(114,76,43,0.78)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(dockX - 80, 230);
      ctx.lineTo(dockX - 80, 145);
      ctx.moveTo(dockX - 35, 230);
      ctx.lineTo(dockX - 35, 145);
      ctx.moveTo(dockX - 95, 160);
      ctx.lineTo(dockX - 20, 160);
      ctx.stroke();
    }
    if (unlocked.has("built-build-raft-l")) {
      ctx.save();
      ctx.translate(dockX + 85, 165 + Math.sin(time * 0.8) * 3);
      ctx.fillStyle = "rgba(92,61,36,0.92)";
      ctx.fillRect(-62, -12, 124, 24);
      ctx.strokeStyle = "rgba(214,184,126,0.74)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, -70);
      ctx.stroke();
      ctx.fillStyle = "rgba(223,204,157,0.72)";
      ctx.beginPath();
      ctx.moveTo(4, -68);
      ctx.lineTo(48, -42);
      ctx.lineTo(4, -30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
};
`;

replaceOnce(
  "export const drawFireGraphicPass = (",
  `${fireLateHelpers}\nexport const drawFireGraphicPass = (`,
  "insert fire late helpers",
);

replaceOnce(
  '  if (progress >= 4 && area.id !== "area-2") {',
  '  if (progress >= 4 && ["area-0", "area-1", "area-3", "area-4", "area-5"].includes(area.id)) {',
  "limit generic fire fences",
);

replaceOnce(
  `  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);\n  const unlockedSet = new Set(unlocked);\n  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);`,
  `  for (const area of areas) {\n    drawFireAreaLife(ctx, area, progress, time, effects);\n    drawFireLateAreaIdentity(ctx, area, time, effects);\n  }\n  const unlockedSet = new Set(unlocked);\n  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);\n  drawFireLateInvestmentGrowth(ctx, areas, unlockedSet, time, effects);`,
  "wire fire late areas",
);

const taigaLateHelper = String.raw`
const drawTaigaLateDistrict = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  riverLane: number,
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  ctx.save();

  if (area.id === "area-6") {
    // 大穀倉地帯: 視界いっぱいの黄金色の帯と大規模水路で、農業のスケールアップを見せる。
    const fieldTop = Math.max(riverLane + 105, rect.y0 + h * 0.28);
    ctx.fillStyle = "rgba(174,145,52,0.12)";
    ctx.fillRect(rect.x0 + 28, fieldTop, w - 56, h * 0.42);
    for (let r = 0; r < 12; r += 1) {
      const y = fieldTop + r * h * 0.032;
      ctx.strokeStyle = r % 2 === 0 ? "rgba(199,169,68,0.26)" : "rgba(133,116,54,0.20)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 42, y);
      ctx.bezierCurveTo(rect.x0 + w * 0.30, y - 7, rect.x0 + w * 0.66, y + 9, rect.x1 - 42, y - 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(72,127,136,0.34)";
    ctx.lineWidth = 13;
    for (const x of [5480, 5660, 5840]) {
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 40);
      ctx.quadraticCurveTo(x + 18, fieldTop + 75, x - 10, fieldTop + 225);
      ctx.stroke();
    }
    if (unlocked.has("built-build-granary-2")) {
      // 共同大穀倉は、この時代で最も横幅のある建物にする。
      const x = 5920;
      const y = 615;
      ctx.fillStyle = "rgba(139,94,48,0.86)";
      ctx.fillRect(x - 115, y - 85, 230, 90);
      ctx.fillStyle = "rgba(95,62,35,0.95)";
      ctx.beginPath();
      ctx.moveTo(x - 130, y - 85);
      ctx.lineTo(x, y - 145);
      ctx.lineTo(x + 130, y - 85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(218,178,101,0.42)";
      ctx.lineWidth = 4;
      for (const dx of [-76, -25, 25, 76]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y - 78);
        ctx.lineTo(x + dx, y - 8);
        ctx.stroke();
      }
      smoke(ctx, x + 92, y - 80, time + 1.3, 0.60);
      ctx.fillStyle = "rgba(188,150,62,0.42)";
      for (const dx of [-165, 155]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y - 5, 46, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (area.id === "area-7") {
    // 三角州: 一本の川から複数の水路へ。水と陸が入り組む形そのものをランドマークにする。
    const waterY = riverLane + 62;
    ctx.strokeStyle = "rgba(50,111,124,0.50)";
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i += 1) {
      ctx.lineWidth = 24 - i * 3;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 55 + i * 70, waterY);
      ctx.bezierCurveTo(
        rect.x0 + w * (0.25 + i * 0.07),
        rect.y0 + h * 0.35,
        rect.x0 + w * (0.42 + i * 0.11),
        rect.y0 + h * 0.60,
        rect.x0 + w * (0.58 + i * 0.10),
        rect.y1 - 48,
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(177,154,102,0.28)";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 120 + i * 125, rect.y0 + 220 + (i % 3) * 105, 64, 17, i * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i += 1) {
      grassTuft(ctx, rect.x0 + 35 + ((i * 137) % Math.max(100, w - 70)), rect.y0 + 180 + ((i * 79) % Math.max(180, h - 240)), 0.75, "rgba(75,113,72,0.72)");
    }
    if (unlocked.has("built-build-delta-hall")) {
      const x = 6500;
      const y = 605;
      ctx.fillStyle = "rgba(117,79,44,0.82)";
      ctx.fillRect(x - 66, y - 54, 132, 60);
      ctx.fillStyle = "rgba(91,58,35,0.94)";
      ctx.beginPath();
      ctx.moveTo(x - 79, y - 54);
      ctx.lineTo(x, y - 92);
      ctx.lineTo(x + 79, y - 54);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(191,137,69,0.52)";
      for (const dx of [-98, 92]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 26, y - 7);
        ctx.lineTo(x + dx, y - 38);
        ctx.lineTo(x + dx + 26, y - 7);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (unlocked.has("built-build-delta-dock")) {
      const x = 6780;
      const y = riverLane + 58;
      ctx.strokeStyle = "rgba(108,72,41,0.86)";
      ctx.lineWidth = 10;
      for (const dx of [-85, 0, 88]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + 10);
        ctx.lineTo(x + dx, y + 112);
        ctx.stroke();
      }
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(x - 110, y + 84);
      ctx.lineTo(x + 118, y + 84);
      ctx.stroke();
      drawBoat(ctx, x - 105, y + 35 + Math.sin(time) * 2, 0.82, true);
      drawBoat(ctx, x + 112, y + 48 + Math.sin(time + 1) * 2, 0.72, true);
    }
  }

  if (area.id === "area-8") {
    // 大治水: 自然地形より人工土木の線が勝つ、文明の到達点。
    ctx.fillStyle = "rgba(121,92,59,0.14)";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 20, rect.y0 + h * 0.58);
    ctx.lineTo(rect.x1 - 20, rect.y0 + h * 0.46);
    ctx.lineTo(rect.x1 - 20, rect.y0 + h * 0.55);
    ctx.lineTo(rect.x0 + 20, rect.y0 + h * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(153,112,67,0.28)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i += 1) {
      const x = rect.x0 + 90 + i * (w - 180) / 4;
      ctx.beginPath();
      ctx.moveTo(x, rect.y0 + h * 0.50);
      ctx.lineTo(x + 18, rect.y0 + h * 0.63);
      ctx.stroke();
    }
    if (unlocked.has("built-build-reservoir")) {
      const bx = rect.x0 + w * 0.28;
      const by = rect.y0 + h * 0.66;
      ctx.fillStyle = "rgba(48,103,119,0.58)";
      ctx.beginPath();
      ctx.ellipse(bx, by, w * 0.22, h * 0.13, -0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(186,211,211,0.22)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(bx - 100 + i * 45, by - 12 + i * 3);
        ctx.lineTo(bx - 62 + i * 45, by - 10 + i * 3);
        ctx.stroke();
      }
    }
    if (unlocked.has("built-build-great-levee")) {
      ctx.strokeStyle = "rgba(128,89,51,0.90)";
      ctx.lineWidth = 28;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 65, rect.y0 + h * 0.72);
      ctx.quadraticCurveTo(rect.x0 + w * 0.50, rect.y0 + h * 0.55, rect.x1 - 65, rect.y0 + h * 0.68);
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,161,91,0.34)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    if (unlocked.has("built-build-great-weir")) {
      // 水門はこのステージの最終ランドマーク。幅も高さも最大にする。
      const x = 7780;
      const y = riverLane + 88;
      ctx.fillStyle = "rgba(105,76,48,0.92)";
      for (const dx of [-105, -52, 0, 52, 105]) ctx.fillRect(x + dx - 11, y - 82, 22, 120);
      ctx.fillRect(x - 138, y - 88, 276, 24);
      ctx.fillStyle = "rgba(59,121,138,0.58)";
      for (const dx of [-78, -26, 26, 78]) ctx.fillRect(x + dx - 14, y - 60, 28, 92);
      ctx.strokeStyle = "rgba(225,200,132,0.52)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 138, y - 58);
      ctx.lineTo(x + 138, y - 58);
      ctx.stroke();
    }
  }

  ctx.restore();
};
`;

replaceOnce(
  "const drawTaigaAreaLife = (",
  `${taigaLateHelper}\nconst drawTaigaAreaLife = (`,
  "insert taiga late helper",
);

replaceOnce(
  '  if (progress >= 2 && area.id !== "area-0") {',
  '  if (progress >= 2 && ["area-1", "area-2", "area-3", "area-4", "area-5"].includes(area.id)) {',
  "limit generic taiga huts",
);

replaceOnce(
  `  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, unlocked, time);\n  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, unlocked, time);`,
  `  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, unlocked, time);\n  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, unlocked, time);\n  if (["area-6", "area-7", "area-8"].includes(area.id)) {\n    drawTaigaLateDistrict(ctx, area, riverLane, unlocked, time);\n  }`,
  "wire taiga late districts",
);

fs.writeFileSync(path, source);
console.log("Applied graphic refresh round 4");
