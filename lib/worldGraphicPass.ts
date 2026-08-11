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

  if (progress >= 4 && ["area-0", "area-1", "area-3", "area-4", "area-5"].includes(area.id)) {
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

const drawFireInvestmentGrowth = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const first = areas.find((area) => area.id === "area-0");
  if (first && unlocked.has("fire-1b")) {
    // 2つ目のたき火を買うと、実座標 x190/y196 にも生活の中心が増える。
    bonfireLandmark(ctx, 190, 196, time + 1.8, effects);
  }

  const settlement = areas.find((area) => area.id === "area-1");
  if (settlement) {
    const { rect } = settlement;
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;
    const homes = [
      ["built-build-hut-1", 0.13, 0.74, 1.00],
      ["built-build-hut-2", 0.34, 0.82, 0.88],
      ["built-build-hut-3", 0.80, 0.76, 0.98],
    ] as const;
    for (const [id, px, py, scale] of homes) {
      if (!unlocked.has(id)) continue;
      hideShelter(ctx, rect.x0 + w * px, rect.y0 + h * py, scale);
      if (effects) smoke(ctx, rect.x0 + w * px, rect.y0 + h * py - 34 * scale, time + px * 7, 0.58 * scale);
    }

    if (unlocked.has("built-build-hearth")) {
      // 共同たき火が完成すると広場そのものができる。
      const x = 1120;
      const y = 590;
      ctx.save();
      ctx.fillStyle = "rgba(92,68,43,0.22)";
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 92, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(189,151,93,0.30)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 70, 32, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        grassTuft(ctx, x + Math.cos(a) * 94, y + 8 + Math.sin(a) * 46, 0.62, "rgba(87,105,57,0.48)");
      }
      ctx.restore();
    }

    if (unlocked.has("built-build-hall")) {
      // 集会所完成後は、各住居から集会所へ踏み跡が集まり「集落」になる。
      roundPath(ctx, [
        { x: rect.x0 + w * 0.15, y: rect.y0 + h * 0.72 },
        { x: rect.x0 + w * 0.48, y: rect.y0 + h * 0.66 },
        { x: 1420, y: 590 },
      ], 15, "rgba(128,99,61,0.14)");
    }
  }

  const valley = areas.find((area) => area.id === "area-2");
  if (valley && unlocked.has("mark-kills-1")) {
    // 初討伐後は、谷の端に運び出した骨が増え、攻略した歴史が景色に残る。
    ctx.save();
    ctx.strokeStyle = "rgba(226,214,184,0.46)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const x = valley.rect.x0 + 120 + i * 75;
      const y = valley.rect.y1 - 72 + (i % 2) * 16;
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 6);
      ctx.lineTo(x + 18, y - 5);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (valley && unlocked.has("built-build-feast")) {
    // 大宴会場完成後は谷の出口が祭りの広場へ変わる。
    const x = 2760;
    const y = 600;
    ctx.save();
    ctx.fillStyle = "rgba(112,75,41,0.16)";
    ctx.beginPath();
    ctx.ellipse(x - 60, y + 22, 118, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(199,146,70,0.48)";
    ctx.lineWidth = 4;
    for (const ox of [-135, 20]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 26);
      ctx.lineTo(x + ox, y - 46);
      ctx.stroke();
    }
    ctx.restore();
  }
};


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

export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  beastPos: { x: number; y: number } | null,
  unlocked: readonly string[],
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

  for (const area of areas) {
    drawFireAreaLife(ctx, area, progress, time, effects);
    drawFireLateAreaIdentity(ctx, area, time, effects);
  }
  const unlockedSet = new Set(unlocked);
  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);
  drawFireLateInvestmentGrowth(ctx, areas, unlockedSet, time, effects);
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
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const w = rect.x1 - rect.x0;
  const px = rect.x0 + w * 0.18; // 実データの船着き場 x3560 付近
  const py = riverLane + 34;
  ctx.save();
  // 未完成時は杭だけ。船着き場を完成させると一気に桟橋が伸びる。
  const dockBuilt = unlocked.has("built-build-dock");
  const marketBuilt = unlocked.has("built-build-market");
  ctx.strokeStyle = "rgba(117,77,43,0.86)";
  ctx.lineWidth = dockBuilt ? 6 : 3;
  const piers = dockBuilt ? [0, 90, 180] : [0];
  for (const ox of piers) {
    ctx.beginPath();
    ctx.moveTo(px + ox, py + 8);
    ctx.lineTo(px + ox, py + (dockBuilt ? 86 + (ox === 90 ? 18 : 0) : 34));
    ctx.stroke();
    if (dockBuilt) {
      for (let j = 0; j < 4; j += 1) {
        ctx.beginPath();
        ctx.moveTo(px + ox - 14, py + 24 + j * 18);
        ctx.lineTo(px + ox + 14, py + 24 + j * 18);
        ctx.stroke();
      }
    }
  }
  // 中央市場完成で天幕が増える。完成前は資材だけ。
  const stalls = marketBuilt ? 6 : 0;
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
  // 岸に係留された小舟も投資後に出現する。
  if (dockBuilt) drawBoat(ctx, px + 20, py + 66 + Math.sin(time * 1.2) * 2, 0.72, true);
  if (marketBuilt) drawBoat(ctx, px + 150, py + 82 + Math.sin(time * 1.1 + 1) * 2, 0.62, true);
  ctx.restore();
};

const drawRiverTownLandmark = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const granaryBuilt = unlocked.has("built-build-granary");
  const wellBuilt = unlocked.has("built-build-well");
  const templeBuilt = unlocked.has("built-build-temple");
  const shipBuilt = unlocked.has("built-build-ship");
  if (!granaryBuilt && !wellBuilt && !templeBuilt && !shipBuilt) return;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const x = rect.x0 + w * 0.52;
  const y = rect.y0 + h * 0.68;
  ctx.save();
  if (granaryBuilt) {
    // 大型穀倉が完成した瞬間から、町のシルエットが横に太くなる。
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
    smoke(ctx, x + 64, y - 22, time + 2.8, 0.48);
  }
  if (wellBuilt) {
    ctx.fillStyle = "rgba(88,66,47,0.78)";
    ctx.beginPath();
    ctx.ellipse(x - 8, y + 8, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(191,157,103,0.56)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 4);
    ctx.lineTo(x - 18, y - 28);
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + 4, y - 28);
    ctx.lineTo(x - 18, y - 28);
    ctx.stroke();
  }
  if (templeBuilt) {
    // 記念塔は町の最も高いランドマーク。
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
    for (const wy of [y - 70, y - 42]) ctx.fillRect(x - 10, wy, 20, 10);
  }
  if (shipBuilt) {
    // 大型交易船完成で水辺のシルエットも変わる。
    drawBoat(ctx, rect.x0 + w * 0.22, rect.y0 + h * 0.24 + Math.sin(time) * 2, 1.35, true);
  }
  ctx.restore();
};


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

const drawTaigaAreaLife = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  progress: number,
  time: number,
  riverLane: number,
  unlocked: ReadonlySet<string>,
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
  if (progress >= 2 && ["area-1", "area-2", "area-3", "area-4", "area-5"].includes(area.id)) {
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
  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, unlocked, time);
  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, unlocked, time);
  if (["area-6", "area-7", "area-8"].includes(area.id)) {
    drawTaigaLateDistrict(ctx, area, riverLane, unlocked, time);
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
  unlocked: readonly string[],
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

  const unlockedSet = new Set(unlocked);
  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane, unlockedSet);

  // 船は人口・交易の成長を背景側で見せる。実働の船とは別の遠景なので当たり判定を持たない。
  const top = box.y0 + 26 - rise * 14;
  const edge = riverLane + 24 + rise * 12;
  const width = Math.max(320, box.x1 - box.x0);
  const boats = Math.min(
    6,
    1 +
      (unlockedSet.has("built-build-dock") ? 1 : 0) +
      (unlockedSet.has("built-build-market") ? 2 : 0) +
      (unlockedSet.has("built-build-ship") ? 2 : 0),
  );
  for (let i = 0; i < boats; i += 1) {
    const dir = i % 2 === 0 ? 1 : -1;
    const raw = (time * (24 + i * 5) + i * 467) % (width + 180);
    const x = dir > 0 ? box.x0 - 90 + raw : box.x1 + 90 - raw;
    const y = top + 22 + (i % 3) * Math.max(18, (edge - top - 24) / 4);
    drawBoat(ctx, x, y, 0.58 + (i % 2) * 0.1, progress >= 5);
  }
};


export const drawFireForegroundPass = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
) => {
  ctx.save();
  for (const area of areas) {
    const { rect } = area;
    const w = rect.x1 - rect.x0;
    const isSnow = area.palette?.prop === "snow";
    const count = area.id === "area-2" ? 8 : 5;
    for (let i = 0; i < count; i += 1) {
      const x = rect.x0 + 24 + ((i * 173 + seedOf(area.id)) % Math.max(70, w - 48));
      const y = rect.y1 - 10 - (i % 3) * 8;
      if (area.id === "area-2" && i % 3 === 0) {
        ctx.fillStyle = "rgba(57,48,40,0.82)";
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 18 + (i % 2) * 7, 11, -0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        grassTuft(
          ctx,
          x,
          y,
          1.45 + (i % 3) * 0.20,
          isSnow ? "rgba(211,224,222,0.68)" : "rgba(65,91,48,0.80)",
        );
      }
    }
  }
  ctx.restore();
};

export const drawTaigaForegroundPass = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  riverLane: number,
) => {
  ctx.save();
  for (const area of areas) {
    const { rect } = area;
    const w = rect.x1 - rect.x0;
    // 川辺は葦を手前に被せる。畑側は背の高い作物でプレイ層を挟む。
    for (let i = 0; i < 6; i += 1) {
      const x = rect.x0 + 30 + ((i * 149 + seedOf(area.id)) % Math.max(70, w - 60));
      if (i % 2 === 0) {
        grassTuft(ctx, x, riverLane + 54 + (i % 3) * 6, 1.35, "rgba(72,105,64,0.78)");
      } else if (["area-0", "area-1", "area-6"].includes(area.id)) {
        grassTuft(ctx, x, rect.y1 - 9, 1.55, "rgba(174,145,57,0.76)");
      }
    }
  }
  ctx.restore();
};
