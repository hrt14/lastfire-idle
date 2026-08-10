type AquariumArea = {
  id: string;
  label?: string;
  rect: { x0: number; y0: number; x1: number; y1: number };
  palette: { floor: string; deep: string; prop: string };
};

const REGION_NAMES = [
  "日本の里川",
  "日本の渓流",
  "東アジアの大河",
  "メコン川",
  "東南アジア 水没森林",
  "アフリカの湖と川",
  "アマゾン熱帯雨林",
  "AMAZON GREAT RIVER",
  "日本の海",
  "北の海",
  "沖縄 サンゴ礁",
  "CALIFORNIA KELP FOREST",
  "東南アジアの海",
  "GREAT REEF",
  "INDIAN OCEAN",
  "OPEN OCEAN",
  "DEEP SEA",
  "WORLD OCEAN",
];

const CHAPTER_NAMES = [
  "FRESH WATER · JAPAN",
  "FRESH WATER · JAPAN",
  "FRESH WATER · EAST ASIA",
  "FRESH WATER · MEKONG",
  "FRESH WATER · FLOODED FOREST",
  "FRESH WATER · AFRICA",
  "FRESH WATER · AMAZON",
  "FRESH WATER · GRAND FINALE",
  "OCEAN · JAPAN",
  "OCEAN · COLD WATER",
  "OCEAN · OKINAWA",
  "OCEAN · KELP FOREST",
  "OCEAN · SOUTH EAST ASIA",
  "OCEAN · AUSTRALIA",
  "OCEAN · INDIAN OCEAN",
  "OCEAN · OPEN OCEAN",
  "OCEAN · DEEP SEA",
  "WORLD OCEAN · GRAND FINALE",
];

const areaIndex = (id: string) => {
  const m = id.match(/area-(\d+)/);
  return m ? Number(m[1]) : 0;
};

const rounded = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fishSilhouette = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  facing = 1,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#8ce8ff";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11 * scale, 0);
  ctx.lineTo(-20 * scale, -7 * scale);
  ctx.lineTo(-20 * scale, 7 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
};

const bubbleColumn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  h: number,
  time: number,
  phase: number,
) => {
  for (let i = 0; i < 7; i += 1) {
    const t = (time * 0.12 + phase + i / 7) % 1;
    const y = y0 + h - t * h;
    const drift = Math.sin(time * 1.2 + i * 1.7 + phase * 7) * 5;
    ctx.strokeStyle = `rgba(149,232,255,${0.12 + (1 - t) * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + drift, y, 1.5 + (i % 3) * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }
};

/**
 * 世界水族館の館内テーマ。
 * ドリームパークの万国旗・風船・遊園地ポールを完全に切り離し、
 * 暗い展示壁、青い案内灯、ガラス面、床の反射、地域サインで水族館に見せる。
 */
export const drawAquariumHall = (
  ctx: CanvasRenderingContext2D,
  area: AquariumArea,
  time: number,
) => {
  const { rect } = area;
  const index = areaIndex(area.id);
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const cx = (rect.x0 + rect.x1) / 2;
  const ocean = index >= 8;
  const deepSea = index >= 16;

  // 展示壁。上半分は水槽が埋め込まれた暗い壁面にする。
  const wallGrad = ctx.createLinearGradient(0, rect.y0, 0, rect.y0 + 215);
  wallGrad.addColorStop(0, deepSea ? "#050915" : ocean ? "#061827" : "#0a2027");
  wallGrad.addColorStop(1, deepSea ? "#0a1023" : ocean ? "#0a2b3b" : "#12363b");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(rect.x0, rect.y0, w, 215);

  // 天井と埋め込み照明。
  ctx.fillStyle = deepSea ? "#030611" : "#07131c";
  ctx.fillRect(rect.x0, rect.y0, w, 24);
  for (let i = 0; i < 4; i += 1) {
    const lx = rect.x0 + 38 + i * ((w - 76) / 3);
    const pulse = 0.35 + Math.abs(Math.sin(time * 0.7 + i + index)) * 0.2;
    ctx.fillStyle = `rgba(${deepSea ? "110,120,255" : "94,221,255"},${pulse})`;
    rounded(ctx, lx - 22, rect.y0 + 8, 44, 4, 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(lx, rect.y0 + 12, 2, lx, rect.y0 + 38, 48);
    glow.addColorStop(0, `rgba(${deepSea ? "100,105,255" : "80,220,255"},0.10)`);
    glow.addColorStop(1, "rgba(50,180,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 50, rect.y0 + 8, 100, 80);
  }

  // 地域サイン。
  ctx.textAlign = "center";
  ctx.fillStyle = deepSea ? "#aab5ff" : "#8eeaff";
  ctx.font = '800 8px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(CHAPTER_NAMES[index] ?? "WORLD AQUARIUM", cx, rect.y0 + 42);
  ctx.fillStyle = "#effcff";
  ctx.font = '900 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(REGION_NAMES[index] ?? area.label ?? "AQUARIUM", cx, rect.y0 + 63);

  // 水槽がはまる3つのガラス壁。実際の生き物描画はこの上に重なる。
  for (let i = 0; i < 3; i += 1) {
    const x = rect.x0 + 12 + i * 120;
    const glassY = rect.y0 + 145;
    const glassH = 165;
    ctx.fillStyle = deepSea ? "rgba(6,15,45,0.88)" : ocean ? "rgba(4,49,71,0.72)" : "rgba(13,67,73,0.70)";
    rounded(ctx, x, glassY, 96, glassH, 9);
    ctx.fill();

    const glass = ctx.createLinearGradient(x, glassY, x + 96, glassY + glassH);
    glass.addColorStop(0, "rgba(190,245,255,0.10)");
    glass.addColorStop(0.45, "rgba(100,220,245,0.02)");
    glass.addColorStop(1, "rgba(30,140,185,0.10)");
    ctx.fillStyle = glass;
    rounded(ctx, x + 4, glassY + 4, 88, glassH - 8, 7);
    ctx.fill();

    ctx.strokeStyle = deepSea ? "rgba(120,130,255,0.35)" : "rgba(115,226,255,0.34)";
    ctx.lineWidth = 2.2;
    rounded(ctx, x, glassY, 96, glassH, 9);
    ctx.stroke();

    ctx.fillStyle = "rgba(235,251,255,0.12)";
    ctx.fillRect(x + 8, glassY + 8, 2, glassH - 24);
    bubbleColumn(ctx, x + 78, glassY + 14, glassH - 28, time, i * 0.2 + index * 0.03);
  }

  // 観覧通路。遊園地の屋外床ではなく、暗い磨き床＋青い導線。
  const floorY = rect.y0 + 310;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, rect.y1);
  floorGrad.addColorStop(0, deepSea ? "#11172c" : "#172c35");
  floorGrad.addColorStop(1, deepSea ? "#080c18" : "#0b171d");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(rect.x0, floorY, w, rect.y1 - floorY);

  // 大判タイルの継ぎ目。
  ctx.strokeStyle = "rgba(155,225,235,0.07)";
  ctx.lineWidth = 1;
  for (let x = rect.x0; x <= rect.x1; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, rect.y1);
    ctx.stroke();
  }
  for (let y = floorY + 30; y < rect.y1; y += 30) {
    ctx.beginPath();
    ctx.moveTo(rect.x0, y);
    ctx.lineTo(rect.x1, y);
    ctx.stroke();
  }

  // 館内順路の発光ライン。
  const guideY = rect.y1 - 26;
  ctx.strokeStyle = deepSea ? "rgba(130,135,255,0.62)" : "rgba(84,225,255,0.58)";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.moveTo(rect.x0 + 18, guideY);
  ctx.lineTo(rect.x1 - 18, guideY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 反射。展示の光が床へ落ちる。
  for (let i = 0; i < 3; i += 1) {
    const gx = rect.x0 + 60 + i * 120;
    const floorGlow = ctx.createRadialGradient(gx, floorY + 4, 2, gx, floorY + 28, 48);
    floorGlow.addColorStop(0, deepSea ? "rgba(110,120,255,0.16)" : "rgba(70,210,235,0.16)");
    floorGlow.addColorStop(1, "rgba(70,210,235,0)");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(gx - 52, floorY - 3, 104, 58);
  }

  // 壁面に薄い魚影を投影。地域が進むほど大きくする。
  const silhouetteScale = 0.55 + Math.min(0.7, index * 0.035);
  fishSilhouette(ctx, rect.x0 + 44, rect.y0 + 98, silhouetteScale, 0.08, 1);
  fishSilhouette(ctx, rect.x1 - 38, rect.y0 + 104, silhouetteScale * 0.8, 0.06, -1);

  // 淡水→海水の切替を館内表示で明確にする。
  if (index === 8) {
    ctx.fillStyle = "rgba(4,18,28,0.88)";
    rounded(ctx, cx - 82, rect.y0 + 78, 164, 34, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(105,231,255,0.38)";
    ctx.lineWidth = 1.5;
    rounded(ctx, cx - 82, rect.y0 + 78, 164, 34, 12);
    ctx.stroke();
    ctx.fillStyle = "#d9faff";
    ctx.font = '800 10px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("川の水は、やがて海へ。", cx, rect.y0 + 99);
  }

  // 最初の区画は水族館エントランスを強く出す。
  if (index === 0) {
    ctx.fillStyle = "rgba(3,15,22,0.90)";
    rounded(ctx, rect.x0 + 24, rect.y0 + 76, w - 48, 52, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(104,229,255,0.48)";
    ctx.lineWidth = 2;
    rounded(ctx, rect.x0 + 24, rect.y0 + 76, w - 48, 52, 16);
    ctx.stroke();
    ctx.fillStyle = "#f2fdff";
    ctx.font = '900 18px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("WORLD AQUARIUM", cx, rect.y0 + 103);
    ctx.fillStyle = "#7bdff3";
    ctx.font = '800 8px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("日本の小さな川から、世界の大海へ", cx, rect.y0 + 117);
  }

  ctx.textAlign = "center";
};
