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
    // 「火が文明の中心」に見える広い暖色の空気。実際の炉は後の描画が上に乗る。
    const x = rect.x0 + w * 0.43;
    const y = rect.y0 + h * 0.58;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, Math.min(170, w * 0.28));
    glow.addColorStop(0, "rgba(255,142,63,0.16)");
    glow.addColorStop(0.45, "rgba(235,112,47,0.07)");
    glow.addColorStop(1, "rgba(235,112,47,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, Math.min(170, w * 0.28), 0, Math.PI * 2);
    ctx.fill();
    if (effects) smoke(ctx, x, y - 18, time, 1.15);
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
    const y = edge + Math.sin(i * 1.37) * 8 + Math.sin(i * 0.43) * 5;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const prevX = x - step;
      const prevY = edge + Math.sin((i - 1) * 1.37) * 8 + Math.sin((i - 1) * 0.43) * 5;
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

  // 大河の市場は、完成前から「水辺の物流拠点になる場所」と読める桟橋の骨格を置く。
  if (area.id === "area-4") {
    const px = rect.x0 + w * 0.56;
    const py = riverLane + 36;
    ctx.strokeStyle = "rgba(111,74,42,0.75)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i += 1) {
      const x = px - 48 + i * 24;
      ctx.beginPath();
      ctx.moveTo(x, py - 52);
      ctx.lineTo(x, py + 16);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(151,104,60,0.86)";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(px - 60, py - 22);
    ctx.lineTo(px + 60, py - 22);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(px, py - 22);
    ctx.lineTo(px, py + 40);
    ctx.stroke();
    ctx.fillStyle = "rgba(210,180,118,0.72)";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(px - 50 + i * 28, py - 42 - (i % 2) * 6, 18, 15);
    }
  }

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
