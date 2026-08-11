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



const tinyPerson = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  phase: number,
  coat = "rgba(151,111,69,0.82)",
  carrying = false,
  scale = 1,
) => {
  const bob = Math.sin(time * 2.2 + phase) * 1.4 * scale;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5 * scale, 7 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(61,46,34,0.72)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y - 1 * scale + bob);
  ctx.lineTo(x - 4 * scale, y + 6 * scale);
  ctx.moveTo(x + 3 * scale, y - 1 * scale + bob);
  ctx.lineTo(x + 4 * scale, y + 6 * scale);
  ctx.stroke();
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * scale + bob, 6 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(205,164,118,0.88)";
  ctx.beginPath();
  ctx.arc(x, y - 17 * scale + bob, 4.3 * scale, 0, Math.PI * 2);
  ctx.fill();
  if (carrying) {
    ctx.fillStyle = "rgba(164,112,57,0.92)";
    ctx.fillRect(x + 5 * scale, y - 11 * scale + bob, 10 * scale, 9 * scale);
    ctx.strokeStyle = "rgba(103,70,40,0.72)";
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(x + 5 * scale, y - 11 * scale + bob, 10 * scale, 9 * scale);
  }
  ctx.restore();
};

const cargoPile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  scale = 1,
) => {
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const px = x + (col - 1.5) * 12 * scale + row * 4 * scale;
    const py = y - row * 10 * scale;
    ctx.fillStyle = i % 3 === 0 ? "rgba(181,128,66,0.88)" : "rgba(145,96,50,0.88)";
    ctx.fillRect(px - 5 * scale, py - 8 * scale, 10 * scale, 8 * scale);
    ctx.strokeStyle = "rgba(88,58,35,0.55)";
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(px - 5 * scale, py - 8 * scale, 10 * scale, 8 * scale);
  }
  ctx.restore();
};

const movingTinyPerson = (
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  time: number,
  phase: number,
  coat: string,
  carrying = true,
) => {
  const p = (Math.sin(time * 0.75 + phase) + 1) / 2;
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;
  tinyPerson(ctx, x, y, time, phase, coat, carrying, 0.86);
};

const drawFireAmbientLife = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const first = areas.find((area) => area.id === "area-0");
  if (first) {
    // 最初から「火のまわりに人がいる」。火そのものが生活の中心だと分かる。
    tinyPerson(ctx, 307, 236, time, 0.2, "rgba(137,93,57,0.84)", false, 0.92);
    tinyPerson(ctx, 382, 238, time, 1.8, "rgba(116,82,57,0.84)", false, 0.92);
  }

  const settlement = areas.find((area) => area.id === "area-1");
  if (settlement) {
    const homeMilestones = ["built-build-hut-1", "built-build-hut-2", "built-build-hut-3"];
    const homes = homeMilestones.filter((id) => unlocked.has(id)).length;
    const hall = unlocked.has("built-build-hall");
    const count = Math.min(8, homes * 2 + (hall ? 2 : 0));
    const spots = [
      [835, 535], [920, 560], [1030, 515], [1120, 535],
      [1215, 565], [1310, 525], [1390, 550], [1000, 620],
    ];
    for (let i = 0; i < count; i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.8, i % 2 ? "rgba(151,105,61,0.78)" : "rgba(112,91,65,0.78)", i % 4 === 0, 0.82);
    }
    if (hall && count >= 4) {
      movingTinyPerson(ctx, { x: 900, y: 615 }, { x: 1370, y: 590 }, time, 0.6, "rgba(142,96,56,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-3")) {
    const winterPeople =
      (unlocked.has("built-build-hut-4") ? 2 : 0) +
      (unlocked.has("built-build-hut-5") ? 2 : 0) +
      (unlocked.has("built-build-hearth-2") ? 2 : 0);
    const spots = [[3010, 525], [3070, 545], [3160, 525], [3240, 548], [3380, 528], [3470, 548]];
    for (let i = 0; i < Math.min(winterPeople, spots.length); i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, 1 + i * 0.7, "rgba(116,106,99,0.82)", false, 0.84);
    }
  }

  if (areas.some((area) => area.id === "area-4")) {
    const villageSteps = ["built-build-well", "built-build-gate", "built-build-watch", "built-build-hut-6", "built-build-hut-7", "built-build-hall2"];
    const growth = villageSteps.filter((id) => unlocked.has(id)).length;
    const count = Math.min(10, 2 + growth);
    const spots = [
      [3890, 510], [3980, 535], [4070, 505], [4170, 535], [4260, 505],
      [4370, 535], [4470, 505], [4560, 535], [4100, 635], [4410, 635],
    ];
    for (let i = 0; i < count; i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.63, i % 3 === 0 ? "rgba(153,104,58,0.80)" : "rgba(120,94,65,0.80)", i % 5 === 0, 0.82);
    }
    if (growth >= 4) cargoPile(ctx, 4530, 650, 6, 0.82);
  }

  if (areas.some((area) => area.id === "area-5")) {
    const small = unlocked.has("built-build-raft-s");
    const large = unlocked.has("built-build-raft-l");
    if (small) {
      cargoPile(ctx, 5070, 245, large ? 8 : 4, 0.9);
      tinyPerson(ctx, 5115, 245, time, 0.5, "rgba(112,85,60,0.82)", true, 0.88);
      tinyPerson(ctx, 5205, 250, time, 1.5, "rgba(132,91,55,0.82)", false, 0.88);
    }
    if (large) {
      movingTinyPerson(ctx, { x: 4960, y: 340 }, { x: 5185, y: 250 }, time, 2.2, "rgba(137,94,55,0.82)", true);
      movingTinyPerson(ctx, { x: 5350, y: 330 }, { x: 5230, y: 250 }, time, 3.4, "rgba(116,89,60,0.82)", true);
    }
  }
};

const drawTaigaAmbientLife = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  // 農耕のはじまり。実働スタッフより小さく薄くし、背景人口として読む。
  if (areas.some((area) => area.id === "area-0")) {
    for (let i = 0; i < 3; i += 1) {
      tinyPerson(ctx, 300 + i * 90, 355 + (i % 2) * 18, time, i * 0.8, "rgba(137,111,62,0.72)", i === 2, 0.76);
    }
  }
  if (areas.some((area) => area.id === "area-1")) {
    const canals = ["equip-canal-1", "equip-canal-2", "equip-canal-3"].filter((id) => unlocked.has(id)).length;
    for (let i = 0; i < 2 + canals; i += 1) {
      tinyPerson(ctx, 930 + i * 110, 370 + (i % 2) * 24, time, 1 + i * 0.6, "rgba(126,105,64,0.70)", i % 3 === 0, 0.76);
    }
  }

  if (areas.some((area) => area.id === "area-4")) {
    const dock = unlocked.has("built-build-dock");
    const market = unlocked.has("built-build-market");
    if (dock) {
      cargoPile(ctx, 3650, riverLane + 118, market ? 10 : 5, 0.9);
      movingTinyPerson(ctx, { x: 3520, y: 420 }, { x: 3660, y: riverLane + 122 }, time, 0.4, "rgba(131,91,55,0.80)", true);
      tinyPerson(ctx, 3715, riverLane + 124, time, 1.4, "rgba(107,82,61,0.80)", false, 0.86);
    }
    if (market) {
      for (let i = 0; i < 4; i += 1) {
        tinyPerson(ctx, 3850 + i * 85, 535 + (i % 2) * 22, time, 2 + i * 0.5, i % 2 ? "rgba(154,102,54,0.78)" : "rgba(104,103,67,0.78)", i === 3, 0.82);
      }
    }
  }

  if (areas.some((area) => area.id === "area-5")) {
    const townSteps = ["built-build-granary", "built-build-well", "built-build-temple", "built-build-ship"];
    const level = townSteps.filter((id) => unlocked.has(id)).length;
    const spots = [[4430, 530], [4530, 560], [4650, 525], [4760, 560], [4870, 525], [4990, 560], [5100, 525]];
    for (let i = 0; i < Math.min(2 + level, spots.length); i += 1) {
      const [x, y] = spots[i];
      tinyPerson(ctx, x, y, time, i * 0.73, i % 2 ? "rgba(131,94,58,0.78)" : "rgba(111,105,69,0.78)", i % 4 === 0, 0.82);
    }
    if (level >= 3) {
      cargoPile(ctx, 4990, 640, 8 + level * 2, 0.78);
      movingTinyPerson(ctx, { x: 4450, y: 430 }, { x: 5010, y: 610 }, time, 1.7, "rgba(132,91,53,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-6")) {
    const granary = unlocked.has("built-build-granary-2");
    const count = granary ? 8 : 4;
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 5420 + i * 82, 455 + (i % 3) * 28, time, 0.5 + i * 0.55, "rgba(147,119,55,0.76)", i % 3 === 0, 0.78);
    }
    if (granary) {
      cargoPile(ctx, 5780, 640, 14, 0.9);
      movingTinyPerson(ctx, { x: 5480, y: 430 }, { x: 5860, y: 605 }, time, 2.5, "rgba(132,94,51,0.78)", true);
      movingTinyPerson(ctx, { x: 6030, y: 430 }, { x: 5960, y: 605 }, time, 3.7, "rgba(112,101,60,0.78)", true);
    }
  }

  if (areas.some((area) => area.id === "area-7")) {
    const hall = unlocked.has("built-build-delta-hall");
    const dock = unlocked.has("built-build-delta-dock");
    const count = 3 + (hall ? 2 : 0) + (dock ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 6250 + i * 95, 500 + (i % 3) * 24, time, 1.1 + i * 0.5, i % 2 ? "rgba(104,103,70,0.76)" : "rgba(132,91,54,0.76)", i % 3 === 0, 0.78);
    }
    if (hall) cargoPile(ctx, 6530, 645, dock ? 12 : 7, 0.82);
    if (dock) movingTinyPerson(ctx, { x: 6500, y: 575 }, { x: 6780, y: riverLane + 142 }, time, 2.8, "rgba(139,92,51,0.80)", true);
  }

  if (areas.some((area) => area.id === "area-8")) {
    const reservoir = unlocked.has("built-build-reservoir");
    const levee = unlocked.has("built-build-great-levee");
    const weir = unlocked.has("built-build-great-weir");
    const count = 3 + (reservoir ? 2 : 0) + (levee ? 2 : 0) + (weir ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      tinyPerson(ctx, 7130 + i * 78, 520 + (i % 3) * 30, time, 0.3 + i * 0.48, "rgba(126,91,60,0.78)", i % 2 === 0, 0.80);
    }
    if (reservoir) cargoPile(ctx, 7300, 650, levee ? 12 : 7, 0.88);
    if (levee) movingTinyPerson(ctx, { x: 7200, y: 450 }, { x: 7560, y: 580 }, time, 1.9, "rgba(142,99,54,0.80)", true);
    if (weir) movingTinyPerson(ctx, { x: 7530, y: 570 }, { x: 7780, y: riverLane + 150 }, time, 3.1, "rgba(111,102,68,0.80)", true);
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

const drawFireHeroScalePolish = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  // 火は「設備」ではなく、この時代の象徴。遠目でも場所が分かる高さと広がりを足す。
  if (areas.some((area) => area.id === "area-0")) {
    const x = 344;
    const y = 196;
    ctx.strokeStyle = "rgba(77,50,29,0.52)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const a = -0.9 + i * 0.45;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 48, y + 28 + Math.sin(a) * 18);
      ctx.lineTo(x + Math.cos(a) * 104, y + 43 + Math.sin(a) * 28);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (effects) {
      for (let i = 0; i < 6; i += 1) {
        const t = (time * 0.055 + i * 0.15) % 1;
        const px = x + Math.sin(time * 0.45 + i * 1.4) * (9 + t * 24);
        const py = y - 34 - t * 138;
        ctx.fillStyle = "rgba(187,177,158," + 0.13 * (1 - t) + ")";
        ctx.beginPath();
        ctx.arc(px, py, 13 + t * 24, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 村はテントの集合ではなく、中心建築が視線を取る完成形へ。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-hall2")) {
    const x = 4480;
    const y = 584;
    ctx.fillStyle = "rgba(84,55,33,0.95)";
    ctx.fillRect(x - 88, y - 60, 176, 72);
    ctx.fillStyle = "rgba(119,76,40,0.96)";
    ctx.beginPath();
    ctx.moveTo(x - 108, y - 60);
    ctx.lineTo(x, y - 116);
    ctx.lineTo(x + 108, y - 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(215,171,96,0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 62, y - 22);
    ctx.lineTo(x + 62, y - 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(38,28,21,0.76)";
    ctx.fillRect(x - 13, y - 30, 26, 42);
    if (effects) smoke(ctx, x + 62, y - 104, time + 4.2, 0.92);
  }

  // 川へ到達した瞬間は、水辺の物流施設が画面を取る。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-raft-l")) {
    const x = 5190;
    const y = 188;
    ctx.strokeStyle = "rgba(100,63,34,0.88)";
    ctx.lineWidth = 12;
    for (const dx of [-118, -54, 18, 92]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 24);
      ctx.lineTo(x + dx, y + 86);
      ctx.stroke();
    }
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(x - 145, y + 56);
    ctx.lineTo(x + 122, y + 56);
    ctx.stroke();
    cargoPile(ctx, x - 70, y + 42, 10, 0.82);
  }

  ctx.restore();
};

const drawFireCompletionContrast = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  // 最初の集落は、完成するほど中央へ視線が集まる。
  if (areas.some((area) => area.id === "area-1")) {
    if (unlocked.has("built-build-hearth")) {
      const glow = ctx.createRadialGradient(1120, 590, 8, 1120, 590, 175);
      glow.addColorStop(0, "rgba(242,160,77,0.16)");
      glow.addColorStop(1, "rgba(242,160,77,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(1120, 590, 175, 0, Math.PI * 2);
      ctx.fill();
    }
    if (unlocked.has("built-build-hall")) {
      ctx.strokeStyle = "rgba(156,118,67,0.22)";
      ctx.lineWidth = 17;
      for (const p of [[800, 610], [950, 650], [1120, 590], [1270, 650]] as const) {
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.quadraticCurveTo((p[0] + 1420) / 2, p[1] - 24, 1420, 590);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(102,68,39,0.82)";
      ctx.lineWidth = 8;
      for (const dx of [-96, 96]) {
        ctx.beginPath();
        ctx.moveTo(1420 + dx, 606);
        ctx.lineTo(1420 + dx, 488);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(189,126,57,0.70)";
      ctx.beginPath();
      ctx.moveTo(1324, 488);
      ctx.lineTo(1420, 448);
      ctx.lineTo(1516, 488);
      ctx.closePath();
      ctx.fill();
    }
  }

  // マンモス討伐後は、巨大な牙と宴の旗が歴史として残る。
  if (areas.some((area) => area.id === "area-2") && unlocked.has("mark-kills-1")) {
    ctx.strokeStyle = "rgba(226,214,184,0.58)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2590, 610);
    ctx.quadraticCurveTo(2645, 488, 2705, 610);
    ctx.moveTo(2630, 610);
    ctx.quadraticCurveTo(2670, 520, 2720, 612);
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  if (areas.some((area) => area.id === "area-2") && unlocked.has("built-build-feast")) {
    ctx.strokeStyle = "rgba(112,70,36,0.90)";
    ctx.lineWidth = 7;
    for (const x of [2680, 2760, 2840]) {
      ctx.beginPath();
      ctx.moveTo(x, 630);
      ctx.lineTo(x, 492);
      ctx.stroke();
      ctx.fillStyle = x === 2760 ? "rgba(202,117,55,0.82)" : "rgba(198,159,79,0.72)";
      ctx.beginPath();
      ctx.moveTo(x + 4, 500);
      ctx.lineTo(x + 58, 520);
      ctx.lineTo(x + 4, 545);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 冬の投資は、寒い空間に暖色の生活軸を出す。
  if (areas.some((area) => area.id === "area-3")) {
    if (unlocked.has("built-build-hearth-2")) {
      const warm = ctx.createRadialGradient(3120, 570, 12, 3120, 570, 230);
      warm.addColorStop(0, "rgba(255,176,91,0.19)");
      warm.addColorStop(0.45, "rgba(246,137,67,0.07)");
      warm.addColorStop(1, "rgba(246,137,67,0)");
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.arc(3120, 570, 230, 0, Math.PI * 2);
      ctx.fill();
    }
    if (unlocked.has("built-build-lamp")) {
      for (let i = 0; i < 7; i += 1) {
        const x = 3020 + i * 74;
        const y = 575 + (i % 2) * 18;
        ctx.strokeStyle = "rgba(86,64,45,0.80)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y + 18);
        ctx.lineTo(x, y - 28);
        ctx.stroke();
        const g = ctx.createRadialGradient(x, y - 32, 2, x, y - 32, 42);
        g.addColorStop(0, "rgba(255,205,119,0.40)");
        g.addColorStop(1, "rgba(255,205,119,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y - 32, 42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 村完成後は、門・柵・旗・中心建築がひとつの輪郭になる。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-hall2")) {
    ctx.strokeStyle = "rgba(92,61,35,0.66)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(3890, 665);
    ctx.quadraticCurveTo(4160, 735, 4485, 665);
    ctx.stroke();
    for (let x = 3940; x <= 4430; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 682);
      ctx.lineTo(x, 636 - ((x / 70) % 2) * 8);
      ctx.stroke();
    }
    for (const x of [4388, 4472]) {
      ctx.strokeStyle = "rgba(100,64,35,0.88)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, 586);
      ctx.lineTo(x, 468);
      ctx.stroke();
      ctx.fillStyle = x < 4440 ? "rgba(173,91,49,0.76)" : "rgba(196,151,69,0.76)";
      ctx.fillRect(x + 4, 474, 46, 24);
    }
  }

  // 川辺は大型いかだ完成で、岸のシルエットそのものを物流拠点へ変える。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-raft-l")) {
    ctx.fillStyle = "rgba(86,58,36,0.92)";
    ctx.fillRect(5220, 198, 190, 28);
    ctx.strokeStyle = "rgba(219,186,126,0.62)";
    ctx.lineWidth = 4;
    for (let x = 5240; x < 5400; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 198);
      ctx.lineTo(x + 12, 225);
      ctx.stroke();
    }
    cargoPile(ctx, 5305, 192, 13, 0.92);
  }

  // 寄り道区画も、遠目で場所が判別できる一本の強いシルエットを持たせる。
  const forest = areas.find((area) => area.id === "area-6");
  if (forest) {
    const r = forest.rect;
    const x = r.x0 + (r.x1 - r.x0) * 0.22;
    const y = r.y0 + (r.y1 - r.y0) * 0.60;
    ctx.fillStyle = "rgba(13,30,23,0.82)";
    ctx.fillRect(x - 18, y - 185, 36, 205);
    ctx.beginPath();
    ctx.arc(x, y - 198, 88, 0, Math.PI * 2);
    ctx.arc(x - 58, y - 166, 56, 0, Math.PI * 2);
    ctx.arc(x + 58, y - 168, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  const windy = areas.find((area) => area.id === "area-7");
  if (windy) {
    const r = windy.rect;
    const x = r.x0 + (r.x1 - r.x0) * 0.64;
    const y = r.y0 + (r.y1 - r.y0) * 0.42;
    ctx.strokeStyle = "rgba(55,69,42,0.76)";
    ctx.lineWidth = 17;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 84);
    ctx.quadraticCurveTo(x - 26, y + 18, x + 44, y - 36);
    ctx.stroke();
    ctx.lineWidth = 8;
    for (const dy of [-34, -4, 28]) {
      ctx.beginPath();
      ctx.moveTo(x + 22, y + dy);
      ctx.lineTo(x + 88, y + dy - 28);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  const marsh = areas.find((area) => area.id === "area-8");
  if (marsh) {
    const r = marsh.rect;
    const x = r.x0 + (r.x1 - r.x0) * 0.76;
    const y = r.y0 + (r.y1 - r.y0) * 0.48;
    ctx.strokeStyle = "rgba(39,61,52,0.76)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x, y + 112);
    ctx.lineTo(x - 8, y - 64);
    ctx.moveTo(x - 4, y - 12);
    ctx.lineTo(x - 62, y - 68);
    ctx.moveTo(x - 2, y - 28);
    ctx.lineTo(x + 62, y - 86);
    ctx.stroke();
  }

  const cave = areas.find((area) => area.id === "area-9");
  if (cave) {
    const r = cave.rect;
    const x = (r.x0 + r.x1) / 2;
    const y = r.y0 + (r.y1 - r.y0) * 0.35;
    ctx.strokeStyle = "rgba(124,116,102,0.52)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(x, y + 20, (r.x1 - r.x0) * 0.23, Math.PI, Math.PI * 2);
    ctx.stroke();
    if (effects) {
      for (const dx of [-118, 118]) {
        const g = ctx.createRadialGradient(x + dx, y + 70, 2, x + dx, y + 70, 48);
        g.addColorStop(0, "rgba(255,181,84,0.28)");
        g.addColorStop(1, "rgba(255,181,84,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + dx, y + 70, 48, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const stars = areas.find((area) => area.id === "area-10");
  if (stars) {
    const r = stars.rect;
    const x = (r.x0 + r.x1) / 2;
    const y = r.y0 + (r.y1 - r.y0) * 0.56;
    ctx.fillStyle = "rgba(121,113,96,0.80)";
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 80);
    ctx.lineTo(x - 12, y - 115);
    ctx.lineTo(x + 18, y - 115);
    ctx.lineTo(x + 28, y + 80);
    ctx.closePath();
    ctx.fill();
  }

  const falls = areas.find((area) => area.id === "area-11");
  if (falls && effects) {
    const r = falls.rect;
    const x = (r.x0 + r.x1) / 2 + (r.x1 - r.x0) * 0.08;
    const y = r.y0 + 415;
    for (let i = 0; i < 7; i += 1) {
      const t = (time * 0.12 + i * 0.16) % 1;
      ctx.fillStyle = "rgba(222,241,239," + (0.16 * (1 - t)) + ")";
      ctx.beginPath();
      ctx.ellipse(x - 150 + i * 50, y - t * 40, 58 + t * 22, 20 + t * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

const drawFireAreaAtmosphere = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
) => {
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const colors: Record<string, [string, string]> = {
    "area-0": ["rgba(205,108,45,0.055)", "rgba(82,49,28,0)"],
    "area-1": ["rgba(151,107,58,0.040)", "rgba(74,54,35,0)"],
    "area-2": ["rgba(126,88,50,0.065)", "rgba(71,52,37,0)"],
    "area-3": ["rgba(164,198,207,0.070)", "rgba(68,88,96,0)"],
    "area-4": ["rgba(158,111,54,0.045)", "rgba(80,58,36,0)"],
    "area-5": ["rgba(60,122,130,0.060)", "rgba(32,70,76,0)"],
    "area-6": ["rgba(13,46,32,0.095)", "rgba(8,24,18,0)"],
    "area-7": ["rgba(114,145,88,0.050)", "rgba(71,92,58,0)"],
    "area-8": ["rgba(63,119,111,0.070)", "rgba(38,72,68,0)"],
    "area-9": ["rgba(85,88,87,0.075)", "rgba(45,48,49,0)"],
    "area-10": ["rgba(54,61,91,0.090)", "rgba(24,29,49,0)"],
    "area-11": ["rgba(99,162,166,0.065)", "rgba(45,89,94,0)"],
  };
  const pair = colors[area.id];
  if (!pair) return;
  ctx.save();
  const g = ctx.createLinearGradient(rect.x0, rect.y0, rect.x1, rect.y1);
  g.addColorStop(0, pair[0]);
  g.addColorStop(1, pair[1]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x0, rect.y0, w, h);
  ctx.restore();
};

const drawFireConstructionForeshadowing = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
) => {
  ctx.save();

  // 集落: 共同たき火ができたら、次の集会所の骨組みが見え始める。
  if (areas.some((area) => area.id === "area-1") && unlocked.has("built-build-hearth") && !unlocked.has("built-build-hall")) {
    const x = 1420;
    const y = 590;
    ctx.strokeStyle = "rgba(118,83,49,0.46)";
    ctx.lineWidth = 6;
    for (const dx of [-62, 0, 62]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 18);
      ctx.lineTo(x + dx, y - 72);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 76, y - 70);
    ctx.lineTo(x, y - 108);
    ctx.lineTo(x + 76, y - 70);
    ctx.stroke();
    ctx.fillStyle = "rgba(137,94,52,0.30)";
    ctx.fillRect(x - 96, y + 14, 192, 12);
  }

  // マンモス谷: 討伐後は宴会場の予定地に旗竿と資材が先に出る。
  if (areas.some((area) => area.id === "area-2") && unlocked.has("mark-kills-1") && !unlocked.has("built-build-feast")) {
    for (const x of [2690, 2770, 2850]) {
      ctx.strokeStyle = "rgba(112,76,43,0.50)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 628);
      ctx.lineTo(x, 535);
      ctx.stroke();
    }
    cargoPile(ctx, 2780, 630, 8, 0.72);
  }

  // 冬: 住居と共同火がそろうと、灯りの柱だけが先に並び、次の投資先を示す。
  const winterReady = unlocked.has("built-build-hearth-2") && unlocked.has("built-build-hut-4") && unlocked.has("built-build-hut-5");
  if (areas.some((area) => area.id === "area-3") && winterReady && !unlocked.has("built-build-lamp")) {
    ctx.strokeStyle = "rgba(93,76,61,0.44)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i += 1) {
      const x = 3040 + i * 82;
      const y = 580 + (i % 2) * 12;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x, y - 34);
      ctx.stroke();
      ctx.fillStyle = "rgba(121,99,75,0.38)";
      ctx.fillRect(x - 7, y - 38, 14, 10);
    }
  }

  // 村: 基本施設がそろうと、中央の大集会所が建築途中で立ち上がる。
  const villageReady = unlocked.has("built-build-gate") && unlocked.has("built-build-watch") && unlocked.has("built-build-hut-6") && unlocked.has("built-build-hut-7");
  if (areas.some((area) => area.id === "area-4") && villageReady && !unlocked.has("built-build-hall2")) {
    const x = 4480;
    const y = 585;
    ctx.strokeStyle = "rgba(104,70,40,0.58)";
    ctx.lineWidth = 7;
    for (const dx of [-82, -27, 27, 82]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 20);
      ctx.lineTo(x + dx, y - 82);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 104, y - 78);
    ctx.lineTo(x, y - 132);
    ctx.lineTo(x + 104, y - 78);
    ctx.stroke();
    ctx.strokeStyle = "rgba(181,137,75,0.30)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 90, y - 55 + i * 22);
      ctx.lineTo(x + 90, y - 55 + i * 22);
      ctx.stroke();
    }
  }

  // 川辺: 小いかだ完成後は大型いかだの長い船台が先に見える。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-raft-s") && !unlocked.has("built-build-raft-l")) {
    ctx.strokeStyle = "rgba(108,73,43,0.52)";
    ctx.lineWidth = 6;
    for (let i = 0; i < 6; i += 1) {
      const x = 5225 + i * 34;
      ctx.beginPath();
      ctx.moveTo(x, 214);
      ctx.lineTo(x + 18, 178);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(5205, 214);
    ctx.lineTo(5415, 214);
    ctx.stroke();
  }

  ctx.restore();
};


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
    drawFireAreaAtmosphere(ctx, area);
  }
  const unlockedSet = new Set(unlocked);
  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);
  drawFireLateInvestmentGrowth(ctx, areas, unlockedSet, time, effects);
  drawFireConstructionForeshadowing(ctx, areas, unlockedSet);
  drawFireAmbientLife(ctx, areas, unlockedSet, time);
  drawFireHeroScalePolish(ctx, areas, unlockedSet, time, effects);
  drawFireCompletionContrast(ctx, areas, unlockedSet, time, effects);
  drawFireBoundaryLandmarks(ctx, areas, unlockedSet, time, effects);
  drawFireEnvironmentalMotion(ctx, areas, time, effects);
  drawFireCivilizationSpread(ctx, areas, unlockedSet, time, effects);
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

const drawTaigaHeroScalePolish = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  ctx.save();

  // 市場を小屋の集合ではなく、一つの「大市場」として読ませる。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-market")) {
    const x = 3920;
    const y = 505;
    ctx.fillStyle = "rgba(106,67,39,0.86)";
    ctx.fillRect(x - 118, y - 22, 236, 58);
    ctx.fillStyle = "rgba(195,139,65,0.78)";
    ctx.beginPath();
    ctx.moveTo(x - 148, y - 22);
    ctx.lineTo(x, y - 88);
    ctx.lineTo(x + 148, y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(233,197,120,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 118, y + 2);
    ctx.lineTo(x + 118, y + 2);
    ctx.stroke();
    cargoPile(ctx, x + 132, y + 42, 14, 0.88);
  }

  // 川の町は塔と家並みの高さ差を強くし、遠景でも町だと分かる輪郭にする。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-temple")) {
    const x = 4820;
    const y = 585;
    ctx.fillStyle = "rgba(85,58,36,0.88)";
    ctx.fillRect(x - 26, y - 154, 52, 158);
    ctx.fillStyle = "rgba(119,78,43,0.92)";
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 154);
    ctx.lineTo(x, y - 205);
    ctx.lineTo(x + 42, y - 154);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(232,190,101,0.40)";
    for (const wy of [y - 124, y - 90, y - 56]) ctx.fillRect(x - 13, wy, 26, 12);
  }

  // 大穀倉地帯は建物一棟で終わらせず、穀物の集積量を横方向に見せる。
  if (areas.some((area) => area.id === "area-6") && unlocked.has("built-build-granary-2")) {
    cargoPile(ctx, 5920, 652, 24, 1.05);
    cargoPile(ctx, 5750, 648, 15, 0.88);
  }

  // 最終治水は水門だけでなく、堤防が奥へ連続することで巨大さを出す。
  if (areas.some((area) => area.id === "area-8") && unlocked.has("built-build-great-weir")) {
    const x = 7780;
    const y = riverLane + 90;
    ctx.strokeStyle = "rgba(119,82,49,0.48)";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 420, y + 145);
    ctx.quadraticCurveTo(x - 250, y + 54, x - 138, y + 30);
    ctx.moveTo(x + 420, y + 145);
    ctx.quadraticCurveTo(x + 250, y + 54, x + 138, y + 30);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(222,240,238,0.16)";
    for (let i = 0; i < 8; i += 1) {
      const px = x - 108 + i * 31;
      ctx.beginPath();
      ctx.ellipse(px, y + 48 + Math.sin(time * 1.2 + i) * 3, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

const drawTaigaCompletionContrast = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  ctx.save();

  // 初期農耕は水路が増えるほど、川と畑が視覚的につながる。
  const farm = areas.find((area) => area.id === "area-1");
  if (farm) {
    const canals = ["equip-canal-1", "equip-canal-2", "equip-canal-3"].filter((id) => unlocked.has(id)).length;
    for (let i = 0; i < canals; i += 1) {
      const x = farm.rect.x0 + 150 + i * 190;
      ctx.strokeStyle = "rgba(54,119,134,0.44)";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 26);
      ctx.bezierCurveTo(x + 22, riverLane + 130, x - 28, 470, x + 18, 660);
      ctx.stroke();
      ctx.strokeStyle = "rgba(201,231,226,0.16)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 船着き場完成で荷揚げ用の大きな門型クレーンが現れる。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-dock")) {
    const x = 3650;
    const y = riverLane + 120;
    ctx.strokeStyle = "rgba(95,63,38,0.86)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x - 70, y + 30);
    ctx.lineTo(x - 70, y - 112);
    ctx.lineTo(x + 70, y - 112);
    ctx.lineTo(x + 70, y + 30);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 108);
    ctx.lineTo(x, y - 24);
    ctx.stroke();
    ctx.fillStyle = "rgba(129,86,46,0.88)";
    ctx.fillRect(x - 13, y - 28, 26, 24);
  }
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-market")) {
    ctx.strokeStyle = "rgba(112,75,43,0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(3760, 405);
    ctx.quadraticCurveTo(3920, 360, 4080, 405);
    ctx.stroke();
    for (let i = 0; i < 7; i += 1) {
      const x = 3780 + i * 48;
      ctx.fillStyle = i % 2 ? "rgba(196,139,67,0.74)" : "rgba(152,86,52,0.72)";
      ctx.beginPath();
      ctx.moveTo(x, 390);
      ctx.lineTo(x + 28, 402);
      ctx.lineTo(x, 416);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 川の町は大型交易船完成でマスト群が町の輪郭に加わる。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-ship")) {
    for (const [x, h] of [[5000, 150], [5070, 190], [5145, 138]] as const) {
      ctx.strokeStyle = "rgba(76,53,35,0.82)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 86);
      ctx.lineTo(x, riverLane + 86 - h);
      ctx.stroke();
      ctx.fillStyle = "rgba(225,203,154,0.66)";
      ctx.beginPath();
      ctx.moveTo(x + 5, riverLane + 92 - h);
      ctx.lineTo(x + 62, riverLane + 126 - h);
      ctx.lineTo(x + 5, riverLane + 150 - h);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 大穀倉完成後は、収穫物の列と運搬路で横方向に密度が増す。
  if (areas.some((area) => area.id === "area-6") && unlocked.has("built-build-granary-2")) {
    ctx.strokeStyle = "rgba(135,102,56,0.28)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(5480, 610);
    ctx.quadraticCurveTo(5750, 560, 6030, 615);
    ctx.stroke();
    for (const x of [5540, 5660, 6070, 6180]) cargoPile(ctx, x, 630, 8, 0.74);
  }

  // 三角州は交易小屋と船着き場がそろうと、水路の上に交易拠点の輪郭が立つ。
  if (areas.some((area) => area.id === "area-7") && unlocked.has("built-build-delta-hall")) {
    const x = 6510;
    const y = 580;
    ctx.fillStyle = "rgba(102,71,43,0.90)";
    ctx.fillRect(x - 78, y - 55, 156, 66);
    ctx.fillStyle = "rgba(164,110,55,0.86)";
    ctx.beginPath();
    ctx.moveTo(x - 98, y - 55);
    ctx.lineTo(x, y - 108);
    ctx.lineTo(x + 98, y - 55);
    ctx.closePath();
    ctx.fill();
  }
  if (areas.some((area) => area.id === "area-7") && unlocked.has("built-build-delta-dock")) {
    for (const x of [6710, 6780, 6850]) {
      ctx.strokeStyle = "rgba(77,54,35,0.74)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 104);
      ctx.lineTo(x, riverLane - 22);
      ctx.stroke();
    }
  }

  // 大治水は3投資が進むたび、人工物の高さと工事密度が段階的に上がる。
  if (areas.some((area) => area.id === "area-8")) {
    if (unlocked.has("built-build-reservoir")) {
      for (const x of [7200, 7300, 7400]) {
        ctx.strokeStyle = "rgba(114,78,47,0.55)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x - 34, 616);
        ctx.lineTo(x, 535);
        ctx.lineTo(x + 34, 616);
        ctx.stroke();
      }
    }
    if (unlocked.has("built-build-great-levee")) {
      for (const x of [7460, 7580, 7700]) {
        ctx.fillStyle = "rgba(124,88,53,0.72)";
        ctx.fillRect(x - 12, 505, 24, 116);
        ctx.fillRect(x - 38, 505, 76, 14);
      }
    }
    if (unlocked.has("built-build-great-weir")) {
      ctx.strokeStyle = "rgba(93,63,39,0.82)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(7640, riverLane - 14);
      ctx.quadraticCurveTo(7780, riverLane - 92, 7920, riverLane - 14);
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) {
        const x = 7665 + i * 56;
        ctx.fillStyle = i % 2 ? "rgba(202,151,72,0.70)" : "rgba(162,91,49,0.72)";
        ctx.fillRect(x, riverLane - 64, 38, 18);
      }
    }
  }

  // 水面の活動は、発展後だけ局所的に濃くする。
  if (unlocked.has("built-build-market") || unlocked.has("built-build-ship")) {
    ctx.strokeStyle = "rgba(226,241,239,0.14)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const x = 3500 + ((i * 283 + time * 24) % 1900);
      const y = riverLane - 42 + (i % 4) * 18;
      ctx.beginPath();
      ctx.moveTo(x - 18, y);
      ctx.lineTo(x + 18, y);
      ctx.stroke();
    }
  }

  ctx.restore();
};

const drawTaigaAreaAtmosphere = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
) => {
  const { rect } = area;
  const pairs: Record<string, [string, string]> = {
    "area-0": ["rgba(128,141,71,0.040)", "rgba(82,91,50,0)"],
    "area-1": ["rgba(144,133,69,0.045)", "rgba(82,76,47,0)"],
    "area-2": ["rgba(159,137,69,0.045)", "rgba(94,80,47,0)"],
    "area-3": ["rgba(124,110,70,0.040)", "rgba(75,66,45,0)"],
    "area-4": ["rgba(169,116,59,0.055)", "rgba(88,65,43,0)"],
    "area-5": ["rgba(147,100,61,0.055)", "rgba(73,60,47,0)"],
    "area-6": ["rgba(188,157,57,0.060)", "rgba(112,98,47,0)"],
    "area-7": ["rgba(61,129,126,0.055)", "rgba(40,77,78,0)"],
    "area-8": ["rgba(120,88,58,0.060)", "rgba(55,85,91,0)"],
  };
  const pair = pairs[area.id];
  if (!pair) return;
  ctx.save();
  const g = ctx.createLinearGradient(rect.x0, rect.y0, rect.x1, rect.y1);
  g.addColorStop(0, pair[0]);
  g.addColorStop(1, pair[1]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
  ctx.restore();
};

const drawTaigaConstructionForeshadowing = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  riverLane: number,
) => {
  ctx.save();

  // 船着き場ができたら、市場予定地に屋台骨組みが並ぶ。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-dock") && !unlocked.has("built-build-market")) {
    for (let i = 0; i < 5; i += 1) {
      const x = 3780 + i * 72;
      const y = 545 + (i % 2) * 22;
      ctx.strokeStyle = "rgba(105,72,45,0.48)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 24, y + 14);
      ctx.lineTo(x - 24, y - 36);
      ctx.lineTo(x, y - 54);
      ctx.lineTo(x + 24, y - 36);
      ctx.lineTo(x + 24, y + 14);
      ctx.stroke();
    }
    cargoPile(ctx, 3980, 625, 8, 0.70);
  }

  // 川の町では、穀倉と井戸ができると記念塔の足場が先に立つ。
  const townReady = unlocked.has("built-build-granary") && unlocked.has("built-build-well");
  if (areas.some((area) => area.id === "area-5") && townReady && !unlocked.has("built-build-temple")) {
    const x = 4820;
    const y = 585;
    ctx.strokeStyle = "rgba(101,73,48,0.52)";
    ctx.lineWidth = 5;
    for (const dx of [-34, 34]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 8);
      ctx.lineTo(x + dx, y - 160);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i += 1) {
      const yy = y - 18 - i * 31;
      ctx.beginPath();
      ctx.moveTo(x - 48, yy);
      ctx.lineTo(x + 48, yy);
      ctx.stroke();
    }
  }

  // 大穀倉地帯は、大穀倉完成前から巨大な基礎だけが土地に現れる。
  if (areas.some((area) => area.id === "area-6") && !unlocked.has("built-build-granary-2")) {
    ctx.fillStyle = "rgba(126,96,54,0.22)";
    ctx.fillRect(5750, 620, 340, 24);
    ctx.strokeStyle = "rgba(113,82,47,0.38)";
    ctx.lineWidth = 5;
    for (let x = 5780; x <= 6060; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 620);
      ctx.lineTo(x, 560);
      ctx.stroke();
    }
  }

  // 三角州: 交易小屋完成後、次の船着き場の杭が川へ伸びる。
  if (areas.some((area) => area.id === "area-7") && unlocked.has("built-build-delta-hall") && !unlocked.has("built-build-delta-dock")) {
    ctx.strokeStyle = "rgba(91,65,43,0.48)";
    ctx.lineWidth = 5;
    for (const x of [6710, 6770, 6830]) {
      ctx.beginPath();
      ctx.moveTo(x, riverLane + 84);
      ctx.lineTo(x, riverLane + 18);
      ctx.stroke();
    }
  }

  // 大治水: 貯水池→堤防→水門と、未完成の巨大骨組みが次の到達点を示す。
  if (areas.some((area) => area.id === "area-8")) {
    if (unlocked.has("built-build-reservoir") && !unlocked.has("built-build-great-levee")) {
      ctx.strokeStyle = "rgba(111,78,49,0.40)";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(7350, 640);
      ctx.quadraticCurveTo(7550, 568, 7740, 630);
      ctx.stroke();
      for (let x = 7400; x <= 7700; x += 75) cargoPile(ctx, x, 642, 4, 0.62);
    }
    if (unlocked.has("built-build-great-levee") && !unlocked.has("built-build-great-weir")) {
      const x = 7780;
      const y = riverLane + 86;
      ctx.strokeStyle = "rgba(90,64,43,0.56)";
      ctx.lineWidth = 7;
      for (const dx of [-105, -52, 0, 52, 105]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + 38);
        ctx.lineTo(x + dx, y - 86);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - 145, y - 86);
      ctx.lineTo(x + 145, y - 86);
      ctx.stroke();
      ctx.strokeStyle = "rgba(154,113,67,0.32)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        const yy = y - 58 + i * 27;
        ctx.beginPath();
        ctx.moveTo(x - 130, yy);
        ctx.lineTo(x + 130, yy);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
};


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
  for (const area of areas) drawTaigaAreaAtmosphere(ctx, area);
  drawTaigaAmbientLife(ctx, areas, unlockedSet, time, riverLane);
  drawTaigaHeroScalePolish(ctx, areas, unlockedSet, time, riverLane);
  drawTaigaConstructionForeshadowing(ctx, areas, unlockedSet, riverLane);
  drawTaigaCompletionContrast(ctx, areas, unlockedSet, time, riverLane);
  drawTaigaBoundaryLandmarks(ctx, areas, unlockedSet, riverLane);
  drawTaigaEnvironmentalMotion(ctx, areas, unlockedSet, time, effects, riverLane);
  drawTaigaCivilizationSpread(ctx, areas, unlockedSet, time, effects, riverLane);

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
    if (area.id === "area-6") {
      ctx.fillStyle = "rgba(10,25,19,0.90)";
      ctx.fillRect(rect.x0 - 10, rect.y1 - 150, 42, 170);
      ctx.fillRect(rect.x1 - 30, rect.y1 - 132, 46, 152);
    } else if (area.id === "area-7") {
      for (let r = 0; r < 7; r += 1) grassTuft(ctx, rect.x0 + 20 + r * 42, rect.y1 - 3, 2.0, "rgba(75,104,57,0.88)");
    } else if (area.id === "area-8") {
      for (let r = 0; r < 6; r += 1) grassTuft(ctx, rect.x1 - 250 + r * 40, rect.y1 - 2, 2.05, "rgba(56,94,73,0.88)");
    } else if (area.id === "area-9") {
      ctx.fillStyle = "rgba(58,57,53,0.92)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 62, rect.y1 - 8, 84, 42, -0.12, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 74, rect.y1 - 5, 98, 48, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (area.id === "area-10") {
      ctx.fillStyle = "rgba(102,98,87,0.86)";
      for (const x of [rect.x0 + 72, rect.x1 - 90]) ctx.fillRect(x - 13, rect.y1 - 76, 26, 80);
    } else if (area.id === "area-11") {
      ctx.fillStyle = "rgba(42,70,71,0.86)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 90, rect.y1 - 4, 120, 42, -0.08, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 110, rect.y1 - 2, 145, 48, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    if (area.id === "area-2") {
      ctx.fillStyle = "rgba(48,40,34,0.88)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 38, rect.y1 - 15, 48, 27, -0.18, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 42, rect.y1 - 10, 58, 31, 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (area.id === "area-3") {
      ctx.fillStyle = "rgba(223,233,234,0.78)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 80, rect.y1 - 4, 104, 28, -0.04, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 110, rect.y1 - 3, 132, 34, 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (area.id === "area-5") {
      for (let r = 0; r < 5; r += 1) {
        grassTuft(ctx, rect.x0 + 28 + r * 38, rect.y1 - 4, 1.85 + r * 0.08, "rgba(55,91,63,0.88)");
      }
    }
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
    if (area.id === "area-4") {
      cargoPile(ctx, rect.x1 - 82, rect.y1 - 5, 12, 1.0);
    }
    if (area.id === "area-6") {
      for (let r = 0; r < 6; r += 1) {
        grassTuft(ctx, rect.x0 + 35 + r * 42, rect.y1 - 4, 1.95, "rgba(183,148,52,0.90)");
      }
    }
    if (area.id === "area-8") {
      ctx.fillStyle = "rgba(113,82,52,0.72)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 85, rect.y1 + 2, 120, 32, -0.06, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 105, rect.y1 + 4, 145, 38, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    if (area.id === "area-7") {
      for (let r = 0; r < 7; r += 1) grassTuft(ctx, rect.x0 + 28 + r * 45, rect.y1 - 2, 1.9, "rgba(61,99,70,0.88)");
    }
    if (area.id === "area-8") {
      ctx.fillStyle = "rgba(103,76,50,0.84)";
      for (const x of [rect.x0 + 82, rect.x1 - 96]) {
        ctx.beginPath();
        ctx.ellipse(x, rect.y1 - 5, 86, 33, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
