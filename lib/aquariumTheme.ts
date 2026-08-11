type AquariumArea = {
  id: string;
  label?: string;
  rect: { x0: number; y0: number; x1: number; y1: number };
  palette: { floor: string; deep: string; prop: string };
};

const REGION_NAMES = [
  "日本の淡水・里川",
  "日本の清流",
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

const layoutForArea = (
  index: number,
  y0: number,
): Array<{ x: number; y: number; hero?: boolean }> => {
  const mirrored = index % 2 === 1;
  if (mirrored) {
    return [
      { x: 278, y: y0 + 286 },
      { x: 190, y: y0 + 330 },
      { x: 82, y: y0 + 258, hero: true },
    ];
  }
  return [
    { x: 82, y: y0 + 286 },
    { x: 176, y: y0 + 330 },
    { x: 278, y: y0 + 258, hero: true },
  ];
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
  ctx.fillStyle = "#9aeaff";
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

const leaf = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot: number,
  color: string,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const plantCluster = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  ocean: boolean,
  index: number,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = ocean ? "#263b3f" : "#29443a";
  ctx.beginPath();
  ctx.ellipse(0, 3, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (ocean) {
    ctx.strokeStyle = index >= 16 ? "#33415d" : "#39776f";
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 5, 0);
      ctx.bezierCurveTo(i * 5 + 8, -15, i * 5 - 7, -28, i * 5 + 3, -42);
      ctx.stroke();
    }
  } else {
    const greens = index >= 6 ? ["#346a4e", "#49875e", "#285741"] : ["#4b7651", "#659065", "#355e46"];
    for (let i = 0; i < 8; i += 1) {
      const a = -1.35 + i * 0.38;
      leaf(ctx, Math.sin(a) * 12, -7 - Math.abs(Math.cos(a)) * 17, 4, 15, a, greens[i % greens.length]);
    }
  }
  ctx.restore();
};

const bubbleColumn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  h: number,
  time: number,
  phase: number,
) => {
  for (let i = 0; i < 6; i += 1) {
    const t = (time * 0.1 + phase + i / 6) % 1;
    const y = y0 + h - t * h;
    const drift = Math.sin(time * 1.1 + i * 1.7 + phase * 9) * 4;
    ctx.strokeStyle = `rgba(164,236,255,${0.1 + (1 - t) * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + drift, y, 1.3 + (i % 3) * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const drawRiverMural = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  index: number,
  ocean: boolean,
  deepSea: boolean,
  time: number,
) => {
  const w = rect.x1 - rect.x0;
  const top = rect.y0 + 58;

  const mural = ctx.createLinearGradient(0, top, 0, rect.y0 + 188);
  if (deepSea) {
    mural.addColorStop(0, "#081126");
    mural.addColorStop(1, "#071835");
  } else if (ocean) {
    mural.addColorStop(0, "#0a3954");
    mural.addColorStop(1, "#0c6980");
  } else {
    mural.addColorStop(0, index >= 6 ? "#173f35" : "#2b594f");
    mural.addColorStop(1, index >= 6 ? "#1a6052" : "#478476");
  }
  ctx.fillStyle = mural;
  rounded(ctx, rect.x0 + 18, top, w - 36, 122, 22);
  ctx.fill();

  if (deepSea) {
    for (let i = 0; i < 18; i += 1) {
      const px = rect.x0 + 28 + ((i * 47 + index * 13) % Math.max(1, w - 56));
      const py = top + 14 + ((i * 31) % 88);
      const pulse = 0.2 + Math.abs(Math.sin(time * 0.8 + i)) * 0.35;
      ctx.fillStyle = `rgba(104,225,225,${pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ocean) {
    // 水面から差し込む光。水平線ではなく斜めの筋で奥行きを出す。
    ctx.strokeStyle = "rgba(190,245,255,0.11)";
    for (let i = 0; i < 6; i += 1) {
      const x = rect.x0 + 30 + i * 58;
      ctx.lineWidth = 8 + (i % 2) * 5;
      ctx.beginPath();
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x - 28 + Math.sin(time * 0.35 + i) * 5, top + 118);
      ctx.stroke();
    }
    fishSilhouette(ctx, rect.x0 + 62, top + 58, 0.7, 0.12, 1);
    fishSilhouette(ctx, rect.x1 - 64, top + 78, 0.95, 0.09, -1);
  } else {
    // 川岸と木立。直線の壁ではなく、曲面の景色として見せる。
    ctx.fillStyle = index >= 6 ? "rgba(22,65,49,0.9)" : "rgba(44,83,60,0.86)";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 18, top + 70);
    ctx.bezierCurveTo(rect.x0 + 80, top + 34, rect.x0 + 115, top + 80, rect.x0 + 176, top + 52);
    ctx.bezierCurveTo(rect.x0 + 238, top + 22, rect.x0 + 300, top + 72, rect.x1 - 18, top + 42);
    ctx.lineTo(rect.x1 - 18, top + 122);
    ctx.lineTo(rect.x0 + 18, top + 122);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(111,187,180,0.62)";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 18, top + 86);
    ctx.bezierCurveTo(rect.x0 + 88, top + 66, rect.x0 + 130, top + 108, rect.x0 + 196, top + 83);
    ctx.bezierCurveTo(rect.x0 + 258, top + 61, rect.x0 + 298, top + 101, rect.x1 - 18, top + 82);
    ctx.lineTo(rect.x1 - 18, top + 122);
    ctx.lineTo(rect.x0 + 18, top + 122);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 8; i += 1) {
      const x = rect.x0 + 26 + i * 43;
      ctx.strokeStyle = "rgba(71,94,66,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, top + 72);
      ctx.lineTo(x + (i % 2 ? 4 : -4), top + 32 - (i % 3) * 6);
      ctx.stroke();
      leaf(ctx, x - 4, top + 34, 12, 5, -0.35, "rgba(74,122,73,0.76)");
      leaf(ctx, x + 7, top + 29, 11, 5, 0.32, "rgba(91,142,82,0.7)");
    }
  }

  ctx.strokeStyle = deepSea ? "rgba(130,143,255,0.22)" : "rgba(128,231,244,0.22)";
  ctx.lineWidth = 2;
  rounded(ctx, rect.x0 + 18, top, w - 36, 122, 22);
  ctx.stroke();
};

const drawCurvedFloor = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  index: number,
  deepSea: boolean,
) => {
  const w = rect.x1 - rect.x0;
  const cx = (rect.x0 + rect.x1) / 2;
  const floorTop = rect.y0 + 188;

  const floorGrad = ctx.createLinearGradient(0, floorTop, 0, rect.y1);
  floorGrad.addColorStop(0, deepSea ? "#141a2d" : "#20343a");
  floorGrad.addColorStop(1, deepSea ? "#080c18" : "#0e1c21");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(rect.x0, floorTop, w, rect.y1 - floorTop);

  // 通路を一本の帯として描く。左右に振れながら奥へ進むため、
  // 「床に設備を横並び」の見え方を崩せる。
  const mirrored = index % 2 === 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = deepSea ? "rgba(47,57,86,0.96)" : "rgba(66,82,82,0.96)";
  ctx.lineWidth = 118;
  ctx.beginPath();
  ctx.moveTo(cx + (mirrored ? -22 : 22), rect.y1 + 26);
  ctx.bezierCurveTo(
    cx + (mirrored ? 74 : -74),
    rect.y0 + 352,
    cx + (mirrored ? -64 : 64),
    rect.y0 + 272,
    cx + (mirrored ? 28 : -28),
    rect.y0 + 198,
  );
  ctx.stroke();

  ctx.strokeStyle = deepSea ? "rgba(174,181,218,0.09)" : "rgba(203,228,224,0.10)";
  ctx.lineWidth = 86;
  ctx.beginPath();
  ctx.moveTo(cx + (mirrored ? -22 : 22), rect.y1 + 26);
  ctx.bezierCurveTo(
    cx + (mirrored ? 74 : -74),
    rect.y0 + 352,
    cx + (mirrored ? -64 : 64),
    rect.y0 + 272,
    cx + (mirrored ? 28 : -28),
    rect.y0 + 198,
  );
  ctx.stroke();

  // タイルは放射状にしてパース感を出す。
  ctx.strokeStyle = "rgba(195,230,230,0.055)";
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i += 1) {
    const bx = cx + i * 62;
    ctx.beginPath();
    ctx.moveTo(bx, rect.y1);
    ctx.lineTo(cx + i * 22, floorTop + 6);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const y = floorTop + 40 + i * 46;
    const inset = Math.max(8, 34 - i * 5);
    ctx.beginPath();
    ctx.moveTo(rect.x0 + inset, y);
    ctx.quadraticCurveTo(cx, y + (mirrored ? -4 : 5), rect.x1 - inset, y);
    ctx.stroke();
  }
};

const drawExhibitBay = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hero: boolean,
  ocean: boolean,
  deepSea: boolean,
  time: number,
  phase: number,
) => {
  const w = hero ? 116 : 92;
  const h = hero ? 86 : 67;
  const top = y - (hero ? 82 : 64);

  // 建築的なフレーム。主役展示だけ明確に大きくする。
  ctx.fillStyle = deepSea ? "rgba(5,10,30,0.86)" : ocean ? "rgba(5,32,45,0.84)" : "rgba(12,45,44,0.86)";
  rounded(ctx, x - w / 2 - 7, top - 10, w + 14, h + 20, hero ? 20 : 15);
  ctx.fill();

  const glass = ctx.createLinearGradient(x - w / 2, top, x + w / 2, top + h);
  glass.addColorStop(0, deepSea ? "rgba(40,58,110,0.72)" : ocean ? "rgba(12,92,120,0.72)" : "rgba(47,116,104,0.74)");
  glass.addColorStop(0.55, deepSea ? "rgba(10,21,58,0.76)" : ocean ? "rgba(7,60,86,0.76)" : "rgba(24,82,76,0.78)");
  glass.addColorStop(1, "rgba(4,28,42,0.86)");
  ctx.fillStyle = glass;
  rounded(ctx, x - w / 2, top, w, h, hero ? 16 : 12);
  ctx.fill();

  ctx.strokeStyle = deepSea ? "rgba(145,156,255,0.42)" : "rgba(145,235,250,0.42)";
  ctx.lineWidth = hero ? 2.5 : 1.7;
  rounded(ctx, x - w / 2, top, w, h, hero ? 16 : 12);
  ctx.stroke();

  // ガラス反射は斜線にして立体感を出す。
  ctx.strokeStyle = "rgba(235,252,255,0.13)";
  ctx.lineWidth = hero ? 4 : 2.6;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.34, top + 8);
  ctx.lineTo(x - w * 0.1, top + h - 8);
  ctx.stroke();
  bubbleColumn(ctx, x + w * 0.28, top + 8, h - 14, time, phase);

  // 足元の台座。主役展示は観覧スペースごと広くする。
  ctx.fillStyle = deepSea ? "#11172a" : "#17282c";
  rounded(ctx, x - w * 0.54, y + 4, w * 1.08, hero ? 20 : 16, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(170,220,224,0.12)";
  rounded(ctx, x - w * 0.54, y + 4, w * 1.08, hero ? 20 : 16, 7);
  ctx.stroke();

  // 水槽の光が床へ落ちる。
  const glow = ctx.createRadialGradient(x, y + 16, 2, x, y + 24, hero ? 72 : 52);
  glow.addColorStop(0, deepSea ? "rgba(120,130,255,0.16)" : "rgba(75,220,235,0.18)");
  glow.addColorStop(1, "rgba(75,220,235,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - (hero ? 80 : 58), y, hero ? 160 : 116, hero ? 58 : 46);
};

const drawAreaSign = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  index: number,
  deepSea: boolean,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(5,15,20,0.78)";
  rounded(ctx, cx - 104, rect.y0 + 28, 208, 48, 16);
  ctx.fill();
  ctx.strokeStyle = deepSea ? "rgba(143,153,255,0.32)" : "rgba(128,230,241,0.3)";
  ctx.lineWidth = 1.5;
  rounded(ctx, cx - 104, rect.y0 + 28, 208, 48, 16);
  ctx.stroke();

  ctx.fillStyle = deepSea ? "#b7c0ff" : "#8eeaff";
  ctx.font = '800 7.5px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(CHAPTER_NAMES[index] ?? "WORLD AQUARIUM", cx, rect.y0 + 45);
  ctx.fillStyle = "#f3fcff";
  ctx.font = '900 14px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(REGION_NAMES[index] ?? "AQUARIUM", cx, rect.y0 + 63);
};

const drawForeground = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  index: number,
  ocean: boolean,
) => {
  // 手前の物がプレイヤー層へ少しかぶることで、画面を3層にする。
  plantCluster(ctx, rect.x0 + 18, rect.y1 - 9, 1.05, ocean, index);
  plantCluster(ctx, rect.x1 - 18, rect.y1 - 4, 1.22, ocean, index);

  ctx.fillStyle = "rgba(9,18,20,0.82)";
  rounded(ctx, rect.x0 + 9, rect.y1 - 61, 48, 31, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(154,223,226,0.22)";
  rounded(ctx, rect.x0 + 9, rect.y1 - 61, 48, 31, 7);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#d9f6f5";
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(index < 8 ? "順路 →" : "OCEAN →", rect.x0 + 33, rect.y1 - 42);
};

/**
 * 世界水族館 visual v3 の館内テーマ。
 *
 * 「直線の壁 + 3つの同じ四角水槽 + 直線床」をやめ、
 * - 遠景の生息地
 * - 曲がる観覧通路
 * - 高さと大きさの違う展示
 * - 主役ランドマーク
 * - 前景の植栽/サイン
 * の5層で、2Dのまま奥行きを作る。
 */
export const drawAquariumHall = (
  ctx: CanvasRenderingContext2D,
  area: AquariumArea,
  time: number,
) => {
  const { rect } = area;
  const index = areaIndex(area.id);
  const w = rect.x1 - rect.x0;
  const cx = (rect.x0 + rect.x1) / 2;
  const ocean = index >= 8;
  const deepSea = index >= 16;

  // 1. 後景：館内の奥にさらに世界が続くようにする。
  const wallGrad = ctx.createLinearGradient(0, rect.y0, 0, rect.y0 + 210);
  wallGrad.addColorStop(0, deepSea ? "#040713" : ocean ? "#06151f" : "#0a1b1d");
  wallGrad.addColorStop(1, deepSea ? "#0a1128" : ocean ? "#0b2d39" : "#153836");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(rect.x0, rect.y0, w, 210);

  // 天井は中央を少し高く見せるアーチ状。
  ctx.fillStyle = deepSea ? "#02040d" : "#061016";
  ctx.beginPath();
  ctx.moveTo(rect.x0, rect.y0);
  ctx.lineTo(rect.x1, rect.y0);
  ctx.lineTo(rect.x1, rect.y0 + 24);
  ctx.quadraticCurveTo(cx, rect.y0 + 4, rect.x0, rect.y0 + 24);
  ctx.closePath();
  ctx.fill();

  // スポットライトを斜めに落として、平面の天井を崩す。
  for (let i = 0; i < 4; i += 1) {
    const lx = rect.x0 + 42 + i * ((w - 84) / 3);
    const pulse = 0.28 + Math.abs(Math.sin(time * 0.55 + i + index)) * 0.18;
    ctx.fillStyle = `rgba(${deepSea ? "128,135,255" : "103,224,237"},${pulse})`;
    rounded(ctx, lx - 17, rect.y0 + 10, 34, 3, 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(lx, rect.y0 + 15, 2, lx - 8, rect.y0 + 68, 64);
    glow.addColorStop(0, `rgba(${deepSea ? "115,120,255" : "93,220,235"},0.09)`);
    glow.addColorStop(1, "rgba(60,190,220,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 64, rect.y0 + 10, 120, 104);
  }

  drawRiverMural(ctx, rect, index, ocean, deepSea, time);
  drawAreaSign(ctx, rect, index, deepSea);

  // 2. 中景：まっすぐな床をやめ、曲線で奥へ誘導する。
  drawCurvedFloor(ctx, rect, index, deepSea);

  // 3. 展示層：同じサイズ・同じ高さの3連水槽をやめる。
  const layout = layoutForArea(index, rect.y0);
  layout.forEach((p, i) => {
    drawExhibitBay(ctx, p.x, p.y, Boolean(p.hero), ocean, deepSea, time, i * 0.22 + index * 0.04);
  });

  // ランドマーク方向に視線を集める床の半円マーク。
  const hero = layout[2];
  if (hero) {
    ctx.strokeStyle = deepSea ? "rgba(147,152,255,0.28)" : "rgba(108,226,236,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hero.x, hero.y + 58, 54, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hero.x, hero.y + 58, 67, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  // 4. 章の切り替えは背景そのものをイベント化。
  if (index === 8) {
    ctx.fillStyle = "rgba(4,17,27,0.9)";
    rounded(ctx, cx - 91, rect.y0 + 90, 182, 29, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(112,233,247,0.34)";
    rounded(ctx, cx - 91, rect.y0 + 90, 182, 29, 12);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#e1fbff";
    ctx.font = '800 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("川の水は、やがて世界の海へ。", cx, rect.y0 + 108);
  }

  if (index === 0) {
    // 最初の3秒で「日本の淡水水族館」と理解できる入口。
    ctx.fillStyle = "rgba(31,39,31,0.9)";
    rounded(ctx, rect.x0 + 20, rect.y0 + 86, 112, 40, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(193,174,121,0.46)";
    ctx.lineWidth = 2;
    rounded(ctx, rect.x0 + 20, rect.y0 + 86, 112, 40, 10);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3ead3";
    ctx.font = '900 11px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("日本の淡水", rect.x0 + 76, rect.y0 + 103);
    ctx.fillStyle = "#b8d7bd";
    ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("里川から清流へ", rect.x0 + 76, rect.y0 + 116);
  }

  // 5. 前景：キャラクターより手前の植栽とサイン。
  drawForeground(ctx, rect, index, ocean);
  ctx.textAlign = "center";
};
