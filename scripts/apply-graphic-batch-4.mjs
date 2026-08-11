import fs from 'node:fs';

const path = 'lib/worldGraphicPass.ts';
let s = fs.readFileSync(path, 'utf8');

const fireMarker = 'export const drawFireGraphicPass = (\n';
const fireHelper = String.raw`
const drawFireBoundaryLandmarks = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  const valley = areas.find((area) => area.id === "area-2");
  if (valley) {
    const x = valley.rect.x0 + 74;
    const y = valley.rect.y0 + 360;
    // マンモス谷への入口は、巨大な牙と踏み跡でスケールを予告する。
    ctx.strokeStyle = "rgba(219,205,173,0.52)";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 34, y + 42);
    ctx.quadraticCurveTo(x - 12, y - 68, x + 18, y - 112);
    ctx.moveTo(x + 56, y + 42);
    ctx.quadraticCurveTo(x + 34, y - 66, x + 12, y - 108);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(57,44,33,0.23)";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x + 85 + i * 45, y + 20 + (i % 2) * 22, 18, 28, -0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const winter = areas.find((area) => area.id === "area-3");
  if (winter) {
    // 暖地から冬への境界は、雪を被った石積みで一目で切り替わる。
    const x = winter.rect.x0 + 42;
    const y = winter.rect.y0 + 430;
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = "rgba(93,96,94,0.68)";
      ctx.beginPath();
      ctx.ellipse(x + i * 32, y - i * 7, 24 - i * 3, 13, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(228,237,238,0.78)";
      ctx.beginPath();
      ctx.ellipse(x + i * 32, y - i * 7 - 7, 19 - i * 3, 6, -0.08, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    if (unlocked.has("built-build-lamp")) {
      const gx = x + 140;
      const gy = y - 26;
      const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 58);
      glow.addColorStop(0, "rgba(255,196,100,0.32)");
      glow.addColorStop(1, "rgba(255,196,100,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gx, gy, 58, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const village = areas.find((area) => area.id === "area-4");
  if (village && unlocked.has("built-build-gate")) {
    // 門だけ孤立させず、左右の柵が奥へ続くことで村の境界を作る。
    ctx.strokeStyle = "rgba(102,67,38,0.50)";
    ctx.lineWidth = 6;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(3860 + dir * 42, 565);
      ctx.quadraticCurveTo(3860 + dir * 125, 545, 3860 + dir * 220, 575);
      ctx.stroke();
      for (let i = 1; i <= 4; i += 1) {
        const px = 3860 + dir * (42 + i * 42);
        const py = 558 + (i % 2) * 10;
        ctx.beginPath();
        ctx.moveTo(px, py + 18);
        ctx.lineTo(px, py - 28);
        ctx.stroke();
      }
    }
  }

  const river = areas.find((area) => area.id === "area-5");
  if (river) {
    // 川への入口は、葦の壁が割れて水面へ抜ける構図にする。
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i += 1) {
        grassTuft(
          ctx,
          river.rect.x0 + 52 + side * (52 + i * 23),
          river.rect.y0 + 254 + (i % 2) * 7,
          1.30 + i * 0.06,
          "rgba(66,102,70,0.72)",
        );
      }
    }
  }

  if (effects && areas.some((area) => area.id === "area-10")) {
    // 星見の丘へ向かう石輪の入口に、ごく弱い瞬きを置く。
    ctx.fillStyle = "rgba(242,226,170,0.32)";
    for (let i = 0; i < 5; i += 1) {
      const t = 0.6 + Math.sin(time * 1.7 + i * 1.4) * 0.4;
      ctx.beginPath();
      ctx.arc(9000 + i * 26, 620 - (i % 2) * 18, 1.2 + t, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

const drawFireEnvironmentalMotion = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  time: number,
  effects: boolean,
) => {
  if (!effects) return;
  ctx.save();

  for (const area of areas) {
    const { rect } = area;
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;

    if (area.id === "area-3") {
      // 冬: 大小の雪筋を前後に分け、横風を感じさせる。
      ctx.strokeStyle = "rgba(238,245,246,0.26)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 18; i += 1) {
        const raw = (time * (42 + (i % 4) * 7) + i * 97) % (w + 120);
        const x = rect.x0 - 60 + raw;
        const y = rect.y0 + 90 + ((i * 53) % Math.max(120, h - 150));
        ctx.beginPath();
        ctx.moveTo(x - 17, y - 3);
        ctx.lineTo(x + 12, y + 2);
        ctx.stroke();
      }
    }

    if (area.id === "area-6") {
      // 夜の森: 木漏れ日が静かに揺れ、暗い平面を避ける。
      for (let i = 0; i < 4; i += 1) {
        const x = rect.x0 + w * (0.22 + i * 0.18) + Math.sin(time * 0.35 + i) * 14;
        const g = ctx.createLinearGradient(x, rect.y0 + 20, x + 60, rect.y0 + h * 0.72);
        g.addColorStop(0, "rgba(182,204,160,0.08)");
        g.addColorStop(1, "rgba(182,204,160,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 22, rect.y0 + 18);
        ctx.lineTo(x + 22, rect.y0 + 18);
        ctx.lineTo(x + 92, rect.y0 + h * 0.72);
        ctx.lineTo(x + 22, rect.y0 + h * 0.72);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (area.id === "area-7") {
      // 風の高台: 種や細い草片が一定方向へ流れる。
      ctx.strokeStyle = "rgba(211,222,189,0.20)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i += 1) {
        const raw = (time * (55 + i % 3 * 9) + i * 121) % (w + 100);
        const x = rect.x0 - 50 + raw;
        const y = rect.y0 + 120 + ((i * 61) % Math.max(100, h - 180));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 8, y - 5, x + 20, y - 1);
        ctx.stroke();
      }
    }

    if (area.id === "area-8") {
      // 湿地: 地面近くの薄い霧を横へ流す。
      for (let i = 0; i < 5; i += 1) {
        const x = rect.x0 + ((time * (12 + i * 2) + i * 173) % Math.max(140, w));
        const y = rect.y0 + h * (0.42 + (i % 3) * 0.16);
        ctx.fillStyle = "rgba(191,216,207,0.08)";
        ctx.beginPath();
        ctx.ellipse(x, y, 92 + i * 9, 15 + (i % 2) * 5, -0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (area.id === "area-11") {
      // 滝: 飛沫が下流側へ流れ、終端エリアの動きを強くする。
      ctx.fillStyle = "rgba(222,242,240,0.18)";
      for (let i = 0; i < 16; i += 1) {
        const t = (time * 0.30 + i * 0.09) % 1;
        const x = rect.x0 + w * 0.55 + (i - 8) * 18 + t * 55;
        const y = rect.y0 + h * 0.55 - t * 48 + Math.sin(i) * 8;
        ctx.beginPath();
        ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
};

`;

if (!s.includes('const drawFireBoundaryLandmarks = (')) {
  s = s.replace(fireMarker, fireHelper + fireMarker);
}
const fireCall = '  drawFireCompletionContrast(ctx, areas, unlockedSet, time, effects);\n';
if (!s.includes('drawFireBoundaryLandmarks(ctx, areas, unlockedSet, time, effects);')) {
  s = s.replace(
    fireCall,
    fireCall +
      '  drawFireBoundaryLandmarks(ctx, areas, unlockedSet, time, effects);\n' +
      '  drawFireEnvironmentalMotion(ctx, areas, time, effects);\n',
  );
}

const taigaMarker = 'export const drawTaigaGraphicPass = (\n';
const taigaHelper = String.raw`
const drawTaigaBoundaryLandmarks = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  riverLane: number,
) => {
  ctx.save();

  // 灌漑が始まると、区画境界に小さな木橋が現れ「水路のある文明」へ切り替わる。
  if (unlocked.has("built-build-canal")) {
    for (const x of [1820, 2520]) {
      ctx.fillStyle = "rgba(104,70,41,0.78)";
      ctx.fillRect(x - 52, riverLane + 92, 104, 12);
      ctx.strokeStyle = "rgba(75,52,34,0.72)";
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 20, riverLane + 92);
        ctx.lineTo(x + i * 20, riverLane + 110);
        ctx.stroke();
      }
    }
  }

  const market = areas.find((area) => area.id === "area-4");
  if (market && unlocked.has("built-build-dock")) {
    // 市場区画へ入る手前に係留杭を連続させ、物流地帯の境界を作る。
    ctx.strokeStyle = "rgba(94,62,37,0.66)";
    ctx.lineWidth = 6;
    for (let i = 0; i < 5; i += 1) {
      const x = market.rect.x0 + 42 + i * 34;
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 45);
      ctx.lineTo(x, riverLane + 104 - (i % 2) * 12);
      ctx.stroke();
    }
  }

  const town = areas.find((area) => area.id === "area-5");
  if (town && unlocked.has("built-build-temple")) {
    // 町の入口に小さな記念石を置き、遠景の塔と視線をつなぐ。
    const x = town.rect.x0 + 58;
    const y = town.rect.y0 + 585;
    ctx.fillStyle = "rgba(101,85,65,0.72)";
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 18);
    ctx.lineTo(x - 12, y - 38);
    ctx.lineTo(x + 9, y - 58);
    ctx.lineTo(x + 20, y + 18);
    ctx.closePath();
    ctx.fill();
  }

  const granary = areas.find((area) => area.id === "area-6");
  if (granary && unlocked.has("built-build-granary-2")) {
    // 大穀倉地帯は入口から収穫物の列が続く。
    for (let i = 0; i < 5; i += 1) {
      const x = granary.rect.x0 + 70 + i * 70;
      const y = granary.rect.y1 - 55 - (i % 2) * 12;
      ctx.fillStyle = "rgba(178,142,57,0.44)";
      ctx.beginPath();
      ctx.ellipse(x, y, 30, 17, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const delta = areas.find((area) => area.id === "area-7");
  if (delta && unlocked.has("built-build-delta-dock")) {
    // 三角州の入口は複数の細い桟橋で、水路が枝分かれする印象を補強。
    ctx.strokeStyle = "rgba(98,66,39,0.64)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i += 1) {
      const x = delta.rect.x0 + 70 + i * 86;
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 54);
      ctx.lineTo(x + 28, riverLane + 118 + i * 8);
      ctx.stroke();
    }
  }

  ctx.restore();
};

const drawTaigaEnvironmentalMotion = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
  riverLane: number,
) => {
  if (!effects) return;
  ctx.save();

  // 水面の反射は区画ごとに位相をずらし、川全体が一枚の青い帯に見えないようにする。
  for (const area of areas) {
    const { rect } = area;
    const w = rect.x1 - rect.x0;
    ctx.strokeStyle = "rgba(213,238,236,0.15)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i += 1) {
      const raw = (time * (16 + i * 2) + seedOf(area.id) + i * 83) % Math.max(120, w);
      const x = rect.x0 + raw;
      const y = riverLane - 18 + (i % 4) * 19;
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.quadraticCurveTo(x, y + Math.sin(time + i) * 2, x + 16, y);
      ctx.stroke();
    }
  }

  if (unlocked.has("built-build-market")) {
    // 市場周辺は人と荷物の動きで乾いた土埃が薄く立つ。
    ctx.fillStyle = "rgba(184,146,89,0.08)";
    for (let i = 0; i < 6; i += 1) {
      const t = (time * 0.15 + i * 0.17) % 1;
      ctx.beginPath();
      ctx.arc(3820 + i * 62 + Math.sin(time + i) * 10, 590 - t * 35, 13 + t * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (unlocked.has("built-build-granary-2")) {
    // 大穀倉地帯では籾殻・穂先が風に舞う。
    ctx.strokeStyle = "rgba(221,185,83,0.24)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i += 1) {
      const x = 5480 + ((time * (32 + i % 4 * 5) + i * 109) % 760);
      const y = 410 + ((i * 47) % 220);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + (i % 3) * 3, y - 3);
      ctx.stroke();
    }
  }

  if (unlocked.has("built-build-delta-dock")) {
    // 三角州は浅瀬の波紋を複数方向に出す。
    ctx.strokeStyle = "rgba(204,232,229,0.14)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i += 1) {
      const x = 6400 + ((i * 137) % 780);
      const y = riverLane + 18 + (i % 4) * 24;
      const r = 10 + ((time * 9 + i * 5) % 18);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (unlocked.has("built-build-great-weir")) {
    // 最終水門は白波を強くし、文明の到達点に常時動きを置く。
    ctx.fillStyle = "rgba(224,243,241,0.24)";
    for (let i = 0; i < 18; i += 1) {
      const t = (time * 0.45 + i * 0.08) % 1;
      const x = 7660 + i * 15 + Math.sin(time * 1.7 + i) * 6;
      const y = riverLane + 122 + t * 48;
      ctx.beginPath();
      ctx.ellipse(x, y, 7 + (i % 3) * 3, 3 + t * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

`;

if (!s.includes('const drawTaigaBoundaryLandmarks = (')) {
  s = s.replace(taigaMarker, taigaHelper + taigaMarker);
}
const taigaCall = '  drawTaigaCompletionContrast(ctx, areas, unlockedSet, time, riverLane);\n';
if (!s.includes('drawTaigaBoundaryLandmarks(ctx, areas, unlockedSet, riverLane);')) {
  s = s.replace(
    taigaCall,
    taigaCall +
      '  drawTaigaBoundaryLandmarks(ctx, areas, unlockedSet, riverLane);\n' +
      '  drawTaigaEnvironmentalMotion(ctx, areas, unlockedSet, time, effects, riverLane);\n',
  );
}

fs.writeFileSync(path, s);
