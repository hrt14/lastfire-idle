type Rect = { x0: number; y0: number; x1: number; y1: number };

type AreaView = {
  id: string;
  rect: Rect;
  palette?: { floor?: string; deep?: string; prop?: string };
};

const seedOf = (text: string) => {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n = (n * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(n);
};

const center = (rect: Rect) => ({
  x: (rect.x0 + rect.x1) / 2,
  y: (rect.y0 + rect.y1) / 2,
});

const roundPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  width: number,
  color: string,
) => {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    const bend = (i % 2 === 0 ? 1 : -1) * Math.min(70, Math.abs(b.x - a.x) * 0.12);
    ctx.quadraticCurveTo(mx + bend, a.y + (i % 2 ? -18 : 24), b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
};

const grassTuft = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  color = "rgba(104,126,72,0.72)",
) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6 * scale;
  ctx.lineCap = "round";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + 4 * scale);
    ctx.quadraticCurveTo(
      x + i * 2.2 * scale,
      y - 4 * scale,
      x + i * 4.2 * scale,
      y - (8 + Math.abs(i) * 2) * scale,
    );
    ctx.stroke();
  }
  ctx.restore();
};

const smoke = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale = 1,
) => {
  ctx.save();
  for (let i = 0; i < 4; i += 1) {
    const t = (time * 0.09 + i * 0.22) % 1;
    const px = x + Math.sin(time * 0.8 + i * 1.7) * 7 * scale + t * 8 * scale;
    const py = y - t * 58 * scale;
    ctx.fillStyle = `rgba(205,198,181,${0.16 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(px, py, (7 + t * 10) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const hideShelter = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) => {
  ctx.save();
  ctx.fillStyle = "rgba(87,59,36,0.88)";
  ctx.beginPath();
  ctx.moveTo(x - 26 * scale, y + 12 * scale);
  ctx.lineTo(x, y - 28 * scale);
  ctx.lineTo(x + 26 * scale, y + 12 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(145,102,59,0.72)";
  ctx.beginPath();
  ctx.moveTo(x - 20 * scale, y + 10 * scale);
  ctx.lineTo(x, y - 21 * scale);
  ctx.lineTo(x + 1 * scale, y + 10 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(212,184,135,0.5)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y - 31 * scale);
  ctx.lineTo(x, y + 13 * scale);
  ctx.stroke();
  ctx.restore();
};

const bonfireLandmark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  effects: boolean,
) => {
  ctx.save();
  // 灰・踏み固められた土・石の輪。実際のたき火本体は後段でこの中央に重なる。
  ctx.fillStyle = "rgba(34,24,17,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 86, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(194,157,104,0.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 58, 28, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 13; i += 1) {
    const a = (i / 13) * Math.PI * 2;
    const rx = 55 + (i % 2) * 4;
    const ry = 27 + (i % 3) * 2;
    const sx = x + Math.cos(a) * rx;
    const sy = y + 8 + Math.sin(a) * ry;
    ctx.fillStyle = i % 3 === 0 ? "#8b7963" : "#685948";
    ctx.beginPath();
    ctx.ellipse(sx, sy, 6 + (i % 2) * 2, 4.5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // 火の中心へ視線が集まる、低い暖色の光だまり。
  const glow = ctx.createRadialGradient(x, y - 4, 6, x, y, 150);
  glow.addColorStop(0, "rgba(255,162,72,0.24)");
  glow.addColorStop(0.42, "rgba(232,112,47,0.10)");
  glow.addColorStop(1, "rgba(232,112,47,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 150, 0, Math.PI * 2);
  ctx.fill();
  if (effects) {
    smoke(ctx, x + 2, y - 26, time, 1.45);
    // 火の粉は本体より上へ漂わせ、遠くからでも火の場所が分かる。
    for (let i = 0; i < 9; i += 1) {
      const t = (time * 0.28 + i * 0.137) % 1;
      const px = x + Math.sin(time * 2.1 + i * 1.3) * (8 + t * 16);
      const py = y - 22 - t * 82;
      ctx.fillStyle = `rgba(255,190,86,${0.65 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.4 + (i % 2) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

const distantMammoth = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(39,32,25,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 30 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-25 * scale, -9 * scale, 13 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(39,32,25,0.32)";
  ctx.lineWidth = 8 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-32 * scale, -5 * scale);
  ctx.quadraticCurveTo(-44 * scale, 5 * scale, -39 * scale, 19 * scale);
  ctx.stroke();
  ctx.lineWidth = 5 * scale;
  for (const lx of [-18, -3, 13, 24]) {
    ctx.beginPath();
    ctx.moveTo(lx * scale, 10 * scale);
    ctx.lineTo((lx - 2) * scale, 27 * scale);
    ctx.stroke();
  }
  ctx.restore();
};

const drawValleyPresence = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  beastPos: { x: number; y: number } | null,
  time: number,
  effects: boolean,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  ctx.save();
  // 谷の奥の岩壁。地面だけの広場に見えないよう高さを作る。
  ctx.fillStyle = "rgba(62,52,43,0.34)";
  ctx.beginPath();
  ctx.moveTo(rect.x0, rect.y0 + 82);
  for (let i = 0; i <= 12; i += 1) {
    const x = rect.x0 + (w * i) / 12;
    const y = rect.y0 + 56 + ((i * 47) % 5) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(rect.x1, rect.y0);
  ctx.lineTo(rect.x0, rect.y0);
  ctx.closePath();
  ctx.fill();

  // 遠景の群れを小さく置き、目の前の一頭が巨大に感じられる比較対象にする。
  distantMammoth(ctx, rect.x0 + w * 0.72, rect.y0 + h * 0.20, 0.50);
  distantMammoth(ctx, rect.x0 + w * 0.82, rect.y0 + h * 0.25, 0.36);
  distantMammoth(ctx, rect.x0 + w * 0.64, rect.y0 + h * 0.27, 0.30);

  // 大きな骨と牙を谷の端に置く。
  ctx.strokeStyle = "rgba(224,211,180,0.42)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rect.x0 + w * 0.08, rect.y0 + h * 0.55);
  ctx.quadraticCurveTo(rect.x0 + w * 0.14, rect.y0 + h * 0.49, rect.x0 + w * 0.19, rect.y0 + h * 0.58);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(rect.x1 - w * 0.10, rect.y0 + h * 0.60);
  ctx.quadraticCurveTo(rect.x1 - w * 0.06, rect.y0 + h * 0.49, rect.x1 - w * 0.02, rect.y0 + h * 0.54);
  ctx.stroke();
  ctx.lineCap = "butt";

  if (beastPos) {
    // 実際に動くマンモスの真下・後ろだけに砂煙を置く。マンモス本体は後段で上に描かれる。
    ctx.fillStyle = "rgba(55,43,31,0.30)";
    ctx.beginPath();
    ctx.ellipse(beastPos.x, beastPos.y + 16, 72, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    if (effects) {
      for (let i = 0; i < 7; i += 1) {
        const t = (time * 0.22 + i * 0.16) % 1;
        const side = i % 2 === 0 ? -1 : 1;
        const px = beastPos.x + side * (28 + t * 46) + Math.sin(time + i) * 5;
        const py = beastPos.y + 10 - t * 28;
        ctx.fillStyle = `rgba(151,128,93,${0.20 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(px, py, 10 + t * 17, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
};

const drawFireAreaLife = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  progress: number,
  time: number,
  effects: boolean,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const seed = seedOf(area.id);

  // 大きな地面のまだらを、設備とは独立した「土地の表情」として足す。
  ctx.save();
  for (let i = 0; i < 12; i += 1) {
    const x = rect.x0 + 44 + ((seed + i * 137) % Math.max(90, w - 88));
    const y = rect.y0 + 72 + ((seed * 3 + i * 91) % Math.max(110, h - 122));
    ctx.fillStyle = i % 3 === 0 ? "rgba(74,58,39,0.12)" : "rgba(112,97,58,0.09)";
    ctx.beginPath();
    ctx.ellipse(x, y, 34 + (i % 4) * 12, 13 + (i % 3) * 6, i * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }

  // 草・岩は縁に寄せ、中央の作業導線を潰さない。
  for (let i = 0; i < 18; i += 1) {
    const leftSide = i % 2 === 0;
    const x = leftSide
      ? rect.x0 + 20 + ((seed + i * 43) % Math.max(30, Math.min(95, w * 0.16)))
      : rect.x1 - 20 - ((seed + i * 37) % Math.max(30, Math.min(95, w * 0.16)));
    const y = rect.y0 + 80 + ((seed + i * 71) % Math.max(80, h - 130));
    grassTuft(ctx, x, y, 0.8 + (i % 3) * 0.15);
  }

  if (area.id === "area-0") {
    // 実データの最初のたき火（x344/y196）に合わせ、背景側から火をランドマーク化する。
    const x = rect.x0 + w * 0.478;
    const y = rect.y0 + h * 0.377;
    bonfireLandmark(ctx, x, y, time, effects);
  }

  if (area.id === "area-1" && progress >= 2) {
    // 野営地から「住んでいる集落」へ。設備ではない住居を画面に増やす。
    hideShelter(ctx, rect.x0 + w * 0.16, rect.y0 + h * 0.70, 0.95);
    hideShelter(ctx, rect.x0 + w * 0.84, rect.y0 + h * 0.72, 0.78);
    if (progress >= 4) hideShelter(ctx, rect.x0 + w * 0.72, rect.y0 + h * 0.22, 0.66);
    if (effects) {
      smoke(ctx, rect.x0 + w * 0.16, rect.y0 + h * 0.66, time + 1.2, 0.75);
      if (progress >= 4) smoke(ctx, rect.x0 + w * 0.72, rect.y0 + h * 0.18, time + 2.3, 0.6);
    }
  }

  if (area.id === "area-2") {
    // マンモスの谷は、入った瞬間に別の場所と分かる大きな足跡と踏み荒らし。
    ctx.fillStyle = "rgba(42,33,24,0.28)";
    for (let i = 0; i < 8; i += 1) {
      const x = rect.x0 + w * (0.16 + i * 0.095);
      const y = rect.y0 + h * (0.30 + ((i * 37) % 5) * 0.08);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((i % 2 ? -1 : 1) * 0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(-10, -20, 5, 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(0, -24, 5, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(10, -20, 5, 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(111,87,55,0.34)";
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 16]);
    ctx.beginPath();
    ctx.moveTo(rect.x0 + w * 0.10, rect.y0 + h * 0.72);
    ctx.quadraticCurveTo(rect.x0 + w * 0.46, rect.y0 + h * 0.52, rect.x0 + w * 0.88, rect.y0 + h * 0.78);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (progress >= 4 && area.id !== "area-2") {
    // 発展後は柵・薪・生活煙が増え、景色そのものが人口増を語る。
    ctx.strokeStyle = "rgba(128,92,53,0.46)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      const x = rect.x0 + 30 + i * Math.max(42, (w - 60) / 5);
      const y = rect.y1 - 34 - (i % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x, y - 14);
      ctx.stroke();
    }
  }

  ctx.restore();
};

export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  beastPos: { x: number; y: number } | null,
) => {
  if (!areas.length) return;
  const progress = areas.length;

  // 区画の中心を直線で結ばず、踏み固められた獣道のように曲げる。
  const ordered = [...areas].sort((a, b) => a.rect.x0 - b.rect.x0 || a.rect.y0 - b.rect.y0);
  const points = ordered
    .filter((area) => area.rect.y0 === 0)
    .map((area, i) => {
      const c = center(area.rect);
      return {
        x: c.x,
        y: Math.min(area.rect.y1 - 70, area.rect.y0 + 330 + (i % 3 - 1) * 52),
      };
    });
  roundPath(ctx, points, 34, "rgba(96,72,45,0.18)");
  roundPath(ctx, points, 8, "rgba(157,126,82,0.10)");

  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);
  const valley = areas.find((area) => area.id === "area-2");
  if (valley) drawValleyPresence(ctx, valley, beastPos, time, effects);

  // 世界の端をただの矩形で終わらせない。大きな前景の草・岩を低密度で置く。
  ctx.save();
  for (let i = 0; i < 14; i += 1) {
    const x = box.x0 + 40 + ((i * 257) % Math.max(100, box.x1 - box.x0 - 80));
    const y = i % 2 === 0 ? box.y0 + 68 + (i % 3) * 15 : box.y1 - 24 - (i % 4) * 8;
    grassTuft(ctx, x, y, 1.1 + (i % 3) * 0.25, "rgba(83,105,59,0.55)");
  }
  ctx.restore();
};

const drawBoat = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  loaded: boolean,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(72,48,31,0.92)";
  ctx.beginPath();
  ctx.moveTo(-22 * scale, -4 * scale);
  ctx.lineTo(22 * scale, -4 * scale);
  ctx.lineTo(13 * scale, 8 * scale);
  ctx.lineTo(-15 * scale, 8 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(220,190,132,0.62)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, -6 * scale);
  ctx.lineTo(0, -27 * scale);
  ctx.stroke();
  ctx.fillStyle = "rgba(225,207,158,0.72)";
  ctx.beginPath();
  ctx.moveTo(2 * scale, -25 * scale);
  ctx.lineTo(18 * scale, -13 * scale);
  ctx.lineTo(2 * scale, -10 * scale);
  ctx.closePath();
  ctx.fill();
  if (loaded) {
    ctx.fillStyle = "rgba(179,127,67,0.86)";
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect((-12 + i * 9) * scale, -11 * scale, 7 * scale, 7 * scale);
    }
  }
  ctx.restore();
};

const drawRiverBank = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  riverLane: number,
  rise: number,
  time: number,
  effects: boolean,
) => {
  const edge = riverLane + 24 + rise * 12;
  const top = box.y0 + 26 - rise * 14;
  const step = 220;

  // 直線の岸を、ゆるい湾曲の連続で覆う。
  ctx.save();
  ctx.fillStyle = "rgba(91,75,50,0.96)";
  ctx.beginPath();
  ctx.moveTo(box.x0, edge + 4);
  let i = 0;
  for (let x = box.x0; x <= box.x1 + step; x += step) {
    const y = edge + Math.sin(i * 1.37) * 14 + Math.sin(i * 0.43) * 9 + (i % 5 === 0 ? -10 : 0);
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = x - step;
      const prevY = edge + Math.sin((i - 1) * 1.37) * 14 + Math.sin((i - 1) * 0.43) * 9 + ((i - 1) % 5 === 0 ? -10 : 0);
      ctx.quadraticCurveTo((prevX + x) / 2, prevY + (i % 2 ? 10 : -8), x, y);
    }
    i += 1;
  }
  ctx.lineTo(box.x1 + step, edge + 34);
  ctx.lineTo(box.x0, edge + 34);
  ctx.closePath();
  ctx.fill();

  // 乾季ほど砂州が目立つ。
  const sandAlpha = Math.max(0.12, Math.min(0.46, 0.26 - rise * 0.18));
  ctx.fillStyle = `rgba(166,143,98,${sandAlpha})`;
  const span = Math.max(300, box.x1 - box.x0);
  for (let k = 0; k < 7; k += 1) {
    const x = box.x0 + ((k * 641 + 230) % span);
    const y = top + 28 + (k % 3) * 18;
    ctx.beginPath();
    ctx.ellipse(x, y, 36 + (k % 3) * 13, 7 + (k % 2) * 4, -0.12 + k * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }

  // 葦。等間隔にしすぎず、かたまりで置く。
  for (let k = 0; k < Math.max(10, Math.floor(span / 170)); k += 1) {
    const x = box.x0 + 40 + ((k * 173 + (k % 4) * 29) % Math.max(80, span - 80));
    const y = edge + 7 + Math.sin(k * 1.17) * 8;
    ctx.strokeStyle = k % 3 === 0 ? "rgba(116,132,72,0.82)" : "rgba(91,119,66,0.76)";
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 4; r += 1) {
      ctx.beginPath();
      ctx.moveTo(x + r * 3, y + 7);
      ctx.quadraticCurveTo(x + r * 3 - 2, y - 5, x + r * 3 + (r % 2 ? 3 : -2), y - 18 - r * 2);
      ctx.stroke();
    }
  }

  // 中州を2〜3か所だけ大きく置き、川幅が場所によって違って見えるようにする。
  ctx.fillStyle = `rgba(139,119,78,${Math.max(0.10, 0.22 - rise * 0.08)})`;
  for (let k = 0; k < 3; k += 1) {
    const x = box.x0 + ((k + 0.7) / 3.4) * span;
    const y = top + 30 + k * 17;
    ctx.beginPath();
    ctx.ellipse(x, y, 72 + k * 18, 11 + k * 3, k % 2 ? 0.08 : -0.12, 0, Math.PI * 2);
    ctx.fill();
    for (let r = 0; r < 5; r += 1) {
      grassTuft(ctx, x - 32 + r * 16, y - 4 + (r % 2) * 4, 0.55, "rgba(92,116,63,0.58)");
    }
  }

  if (effects) {
    // 水面の短い反射。長い直線を避ける。
    ctx.strokeStyle = "rgba(219,246,248,0.18)";
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 18; k += 1) {
      const x = box.x0 + ((k * 311 + time * (14 + (k % 3) * 5)) % span);
      const y = top + 16 + ((k * 37) % Math.max(22, edge - top - 28));
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.quadraticCurveTo(x, y + Math.sin(time + k) * 2, x + 12, y);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const drawMarketDistrict = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  riverLane: number,
  progress: number,
  time: number,
) => {
  const w = rect.x1 - rect.x0;
  const px = rect.x0 + w * 0.18; // 実データの船着き場 x3560 付近
  const py = riverLane + 34;
  ctx.save();
  // 川へ伸びる桟橋を複数本にし、物流拠点らしい密度を作る。
  ctx.strokeStyle = "rgba(117,77,43,0.86)";
  ctx.lineWidth = 6;
  for (const ox of [0, 90, 180]) {
    ctx.beginPath();
    ctx.moveTo(px + ox, py + 8);
    ctx.lineTo(px + ox, py + 86 + (ox === 90 ? 18 : 0));
    ctx.stroke();
    for (let j = 0; j < 4; j += 1) {
      ctx.beginPath();
      ctx.moveTo(px + ox - 14, py + 24 + j * 18);
      ctx.lineTo(px + ox + 14, py + 24 + j * 18);
      ctx.stroke();
    }
  }
  // 市場の天幕。中央市場が開く段階ほど数が増える。
  const stalls = progress >= 6 ? 6 : 4;
  for (let i = 0; i < stalls; i += 1) {
    const sx = rect.x0 + w * 0.45 + (i % 3) * 74;
    const sy = rect.y1 - 110 - Math.floor(i / 3) * 78;
    ctx.fillStyle = i % 2 ? "rgba(170,105,63,0.72)" : "rgba(207,169,91,0.72)";
    ctx.beginPath();
    ctx.moveTo(sx - 28, sy - 20);
    ctx.lineTo(sx, sy - 38);
    ctx.lineTo(sx + 28, sy - 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(87,61,38,0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 22, sy - 20);
    ctx.lineTo(sx - 22, sy + 12);
    ctx.moveTo(sx + 22, sy - 20);
    ctx.lineTo(sx + 22, sy + 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(204,176,117,0.70)";
    ctx.fillRect(sx - 18, sy - 4, 36, 10);
  }
  // 岸に係留された小舟。動く背景船とは役割を分ける。
  drawBoat(ctx, px + 20, py + 66 + Math.sin(time * 1.2) * 2, 0.72, true);
  drawBoat(ctx, px + 150, py + 82 + Math.sin(time * 1.1 + 1) * 2, 0.62, progress >= 6);
  ctx.restore();
};

const drawRiverTownLandmark = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  progress: number,
  time: number,
) => {
  if (progress < 6) return;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const x = rect.x0 + w * 0.52;
  const y = rect.y0 + h * 0.68;
  ctx.save();
  // 記念塔の遠景。町へ入った瞬間に「村より大きい」と分かる高さを作る。
  ctx.fillStyle = "rgba(113,79,48,0.82)";
  ctx.fillRect(x - 19, y - 92, 38, 96);
  ctx.fillStyle = "rgba(84,59,38,0.92)";
  ctx.beginPath();
  ctx.moveTo(x - 29, y - 92);
  ctx.lineTo(x, y - 126);
  ctx.lineTo(x + 29, y - 92);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(232,188,98,0.42)";
  for (const wy of [y - 70, y - 42]) {
    ctx.fillRect(x - 10, wy, 20, 10);
  }
  smoke(ctx, x + 64, y - 22, time + 2.8, 0.48);
  // 大型穀倉のシルエットを塔の左右へ。
  for (const ox of [-92, 96]) {
    ctx.fillStyle = "rgba(137,95,52,0.78)";
    ctx.fillRect(x + ox - 28, y - 48, 56, 50);
    ctx.fillStyle = "rgba(97,65,39,0.90)";
    ctx.beginPath();
    ctx.moveTo(x + ox - 34, y - 48);
    ctx.lineTo(x + ox, y - 70);
    ctx.lineTo(x + ox + 34, y - 48);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const drawTaigaAreaLife = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  progress: number,
  time: number,
  riverLane: number,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;

  ctx.save();

  // 畑は「緑の四角」ではなく、不揃いの畝が見える土地にする。
  if (["area-0", "area-1", "area-2"].includes(area.id)) {
    const left = rect.x0 + w * 0.15;
    const right = rect.x1 - w * 0.10;
    const y0 = Math.max(riverLane + 72, rect.y0 + h * 0.46);
    const y1 = rect.y1 - 48;
    ctx.strokeStyle = "rgba(180,147,86,0.22)";
    ctx.lineWidth = 3;
    for (let r = 0; r < 7; r += 1) {
      const y = y0 + ((y1 - y0) * r) / 7;
      ctx.beginPath();
      ctx.moveTo(left, y + Math.sin(r) * 5);
      ctx.bezierCurveTo(
        left + w * 0.22,
        y - 8 + (r % 2) * 6,
        right - w * 0.18,
        y + 10 - (r % 3) * 5,
        right,
        y + Math.sin(r * 1.7) * 4,
      );
      ctx.stroke();
    }
    const crop = progress >= 3 ? "rgba(194,166,71,0.30)" : "rgba(104,147,70,0.30)";
    for (let i = 0; i < 16; i += 1) {
      const x = left + ((i * 83) % Math.max(50, right - left));
      const y = y0 + 12 + ((i * 47) % Math.max(40, y1 - y0 - 20));
      grassTuft(ctx, x, y, 0.55 + (i % 3) * 0.08, crop);
    }
  }

  // 集落の建物を端に置き、中央の生産導線を空ける。
  if (progress >= 2 && area.id !== "area-0") {
    const baseY = Math.max(riverLane + 78, rect.y0 + h * 0.68);
    const hut = (x: number, y: number, scale: number) => {
      ctx.fillStyle = "rgba(118,82,48,0.86)";
      ctx.fillRect(x - 18 * scale, y - 18 * scale, 36 * scale, 24 * scale);
      ctx.fillStyle = "rgba(92,59,34,0.95)";
      ctx.beginPath();
      ctx.moveTo(x - 23 * scale, y - 18 * scale);
      ctx.lineTo(x, y - 36 * scale);
      ctx.lineTo(x + 23 * scale, y - 18 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(35,28,22,0.78)";
      ctx.fillRect(x - 4 * scale, y - 7 * scale, 8 * scale, 13 * scale);
    };
    hut(rect.x0 + w * 0.10, baseY, 0.72);
    if (progress >= 4) hut(rect.x1 - w * 0.10, baseY - 18, 0.86);
    if (progress >= 6) {
      hut(rect.x0 + w * 0.18, baseY - 88, 0.58);
      smoke(ctx, rect.x0 + w * 0.18, baseY - 118, time + seedOf(area.id), 0.55);
    }
  }

  // 大河の市場は「桟橋+船+天幕」が一体になった水辺の物流拠点として見せる。
  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, progress, time);
  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, progress, time);

  ctx.restore();
};

export const drawTaigaGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  riverLane: number,
  rise: number,
) => {
  if (!areas.length) return;
  const progress = areas.length;
  drawRiverBank(ctx, box, riverLane, rise, time, effects);

  // 集落側の道もゆるく曲げ、区画が横一列に見える印象を弱める。
  const points = [...areas]
    .filter((area) => area.rect.y0 === 0)
    .sort((a, b) => a.rect.x0 - b.rect.x0)
    .map((area, i) => ({
      x: center(area.rect).x,
      y: Math.max(riverLane + 118, area.rect.y0 + 360 + (i % 3 - 1) * 46),
    }));
  roundPath(ctx, points, 30, "rgba(119,93,57,0.16)");
  roundPath(ctx, points, 7, "rgba(190,155,91,0.11)");

  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane);

  // 船は人口・交易の成長を背景側で見せる。実働の船とは別の遠景なので当たり判定を持たない。
  const top = box.y0 + 26 - rise * 14;
  const edge = riverLane + 24 + rise * 12;
  const width = Math.max(320, box.x1 - box.x0);
  const boats = Math.min(5, Math.max(1, Math.floor(progress / 2)));
  for (let i = 0; i < boats; i += 1) {
    const dir = i % 2 === 0 ? 1 : -1;
    const raw = (time * (24 + i * 5) + i * 467) % (width + 180);
    const x = dir > 0 ? box.x0 - 90 + raw : box.x1 + 90 - raw;
    const y = top + 22 + (i % 3) * Math.max(18, (edge - top - 24) / 4);
    drawBoat(ctx, x, y, 0.58 + (i % 2) * 0.1, progress >= 5);
  }
};
