type Rect = { x0: number; y0: number; x1: number; y1: number };

type AreaView = {
  id: string;
  label?: string;
  rect: Rect;
  palette?: { floor?: string; deep?: string; prop?: string };
};

type ClassicStageId = "ramen" | "park" | "onsen";

const TAU = Math.PI * 2;

const center = (rect: Rect) => ({
  x: (rect.x0 + rect.x1) / 2,
  y: (rect.y0 + rect.y1) / 2,
});

const areaIndex = (area: AreaView) => Number(area.id.replace("area-", "")) || 0;

const rr = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const seedOf = (text: string) => {
  let n = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    n ^= text.charCodeAt(i);
    n = Math.imul(n, 16777619);
  }
  return Math.abs(n | 0);
};

const tinyPerson = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  body: string,
  time: number,
  phase = 0,
) => {
  const bob = Math.sin(time * 1.7 + phase) * 1.2 * scale;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.17)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5 * scale, 6 * scale, 2.4 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = body;
  rr(ctx, x - 4 * scale, y - 10 * scale + bob, 8 * scale, 11 * scale, 3 * scale);
  ctx.fill();
  ctx.fillStyle = "#e7c3a0";
  ctx.beginPath();
  ctx.arc(x, y - 13 * scale + bob, 3.5 * scale, 0, TAU);
  ctx.fill();
  ctx.restore();
};

const smokePuff = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale = 1,
  warm = false,
) => {
  ctx.save();
  for (let i = 0; i < 4; i += 1) {
    const t = (time * 0.085 + i * 0.23) % 1;
    const px = x + Math.sin(time * 0.8 + i * 1.4) * 7 * scale + t * 8 * scale;
    const py = y - t * 48 * scale;
    ctx.fillStyle = warm
      ? `rgba(255,228,195,${0.16 * (1 - t)})`
      : `rgba(224,229,229,${0.15 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(px, py, (6 + t * 10) * scale, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const lantern = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale = 1,
  color = "#d94a38",
) => {
  const glow = 0.72 + Math.sin(time * 2.2 + x * 0.03) * 0.13;
  ctx.save();
  ctx.strokeStyle = "rgba(70,50,35,0.72)";
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y - 13 * scale);
  ctx.lineTo(x, y - 3 * scale);
  ctx.stroke();
  ctx.fillStyle = color;
  rr(ctx, x - 6 * scale, y - 4 * scale, 12 * scale, 16 * scale, 5 * scale);
  ctx.fill();
  ctx.fillStyle = `rgba(255,230,150,${0.12 * glow})`;
  ctx.beginPath();
  ctx.arc(x, y + 4 * scale, 22 * scale, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(255,235,170,${0.7 * glow})`;
  rr(ctx, x - 2 * scale, y, 4 * scale, 8 * scale, 2 * scale);
  ctx.fill();
  ctx.restore();
};

const roof = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
  roofColor: string,
) => {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.47, w * 0.48, h * 0.15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = body;
  rr(ctx, x - w / 2, y - h / 2 + 12, w, h - 12, 4);
  ctx.fill();
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.58, y - h / 2 + 18);
  ctx.lineTo(x, y - h / 2 - 8);
  ctx.lineTo(x + w * 0.58, y - h / 2 + 18);
  ctx.lineTo(x + w * 0.48, y - h / 2 + 25);
  ctx.lineTo(x - w * 0.48, y - h / 2 + 25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const curvedPath = (
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
    const prev = points[i - 1];
    const next = points[i];
    const mx = (prev.x + next.x) / 2;
    const my = (prev.y + next.y) / 2;
    ctx.quadraticCurveTo(mx + (i % 2 ? 18 : -18), my + (i % 2 ? -10 : 12), next.x, next.y);
  }
  ctx.stroke();
  ctx.restore();
};

const tinyFlag = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  color: string,
  scale = 1,
) => {
  ctx.save();
  ctx.strokeStyle = "rgba(70,65,55,0.75)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 34 * scale);
  ctx.stroke();
  const sway = Math.sin(time * 2 + x * 0.04) * 4 * scale;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 33 * scale);
  ctx.lineTo(x + 18 * scale + sway, y - 28 * scale);
  ctx.lineTo(x, y - 21 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const getArea = (areas: AreaView[], index: number) =>
  areas.find((area) => areaIndex(area) === index);

const boundsOf = (areas: AreaView[]) => {
  if (!areas.length) return null;
  return areas.reduce<Rect>(
    (acc, area) => ({
      x0: Math.min(acc.x0, area.rect.x0),
      y0: Math.min(acc.y0, area.rect.y0),
      x1: Math.max(acc.x1, area.rect.x1),
      y1: Math.max(acc.y1, area.rect.y1),
    }),
    { ...areas[0].rect },
  );
};

/* ========================================================================== */
/* ラーメン一直線：10回のグラフィック改善                               */
/* ========================================================================== */

const drawRamenPasses = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const progress = areas.length;
  const bounds = boundsOf(areas);
  if (!bounds) return;

  ctx.save();

  // 1/10 主役を「厨房」と分かるようにする：各棟の奥に巨大な湯気と赤い厨房灯。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const w = area.rect.x1 - area.rect.x0;
    const kitchenX = area.rect.x0 + w * (idx % 2 === 0 ? 0.18 : 0.82);
    ctx.fillStyle = "rgba(205,58,39,0.09)";
    ctx.beginPath();
    ctx.arc(kitchenX, area.rect.y0 + 82, 70, 0, TAU);
    ctx.fill();
    if (effects) smokePuff(ctx, kitchenX, area.rect.y0 + 86, time + idx * 0.2, 1.15, true);
  }

  // 2/10 名前が違えば見た目も違う：区画ごとに建築シルエットを変える。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const w = area.rect.x1 - area.rect.x0;
    const top = area.rect.y0 + 48;
    if (idx === 0) {
      // 屋台：布屋根・赤提灯・低い間口。
      ctx.fillStyle = "rgba(92,48,28,0.72)";
      rr(ctx, c.x - 78, top + 12, 156, 50, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(185,50,36,0.88)";
      ctx.beginPath();
      ctx.moveTo(c.x - 88, top + 18);
      ctx.lineTo(c.x - 58, top - 2);
      ctx.lineTo(c.x + 62, top - 2);
      ctx.lineTo(c.x + 88, top + 18);
      ctx.closePath();
      ctx.fill();
      lantern(ctx, c.x - 58, top + 38, time, 0.82);
      lantern(ctx, c.x + 58, top + 38, time, 0.82);
    } else if (idx === 1) {
      // テーブル席：開けた客席と格子。
      roof(ctx, c.x, top + 38, Math.min(190, w * 0.62), 70, "rgba(112,75,47,0.68)", "rgba(63,45,36,0.88)");
      ctx.strokeStyle = "rgba(235,207,160,0.38)";
      ctx.lineWidth = 2;
      for (let x = c.x - 68; x <= c.x + 68; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, top + 30);
        ctx.lineTo(x, top + 70);
        ctx.stroke();
      }
    } else if (idx === 2) {
      // 製麺所：高窓と麺干し竿。
      roof(ctx, c.x, top + 45, Math.min(210, w * 0.65), 86, "rgba(126,102,72,0.72)", "rgba(65,58,48,0.9)");
      ctx.strokeStyle = "rgba(232,210,154,0.74)";
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i += 1) {
        const x = c.x + i * 18;
        ctx.beginPath();
        ctx.moveTo(x, top + 20);
        ctx.lineTo(x + Math.sin(time + i) * 2, top + 58);
        ctx.stroke();
      }
    } else if (idx === 3) {
      // 宴会場：横長の大屋根と暖簾。
      roof(ctx, c.x, top + 50, Math.min(255, w * 0.76), 92, "rgba(103,66,47,0.78)", "rgba(53,40,38,0.94)");
      ctx.fillStyle = "rgba(174,44,35,0.82)";
      rr(ctx, c.x - 78, top + 43, 156, 28, 4);
      ctx.fill();
    } else if (idx === 4) {
      // 幻の総本店：周囲より明確に大きい二層屋根。
      roof(ctx, c.x, top + 86, Math.min(300, w * 0.82), 142, "rgba(83,53,45,0.88)", "rgba(38,30,32,0.98)");
      roof(ctx, c.x, top + 35, Math.min(225, w * 0.62), 82, "rgba(96,57,47,0.9)", "rgba(45,32,34,0.98)");
      ctx.fillStyle = "rgba(205,50,39,0.9)";
      rr(ctx, c.x - 55, top + 75, 110, 32, 5);
      ctx.fill();
    } else {
      // 2号店：棟ごとに屋根高さをずらし、ひとつの巨大敷地に見せる。
      const tall = idx % 2 === 0 ? 102 : 78;
      roof(ctx, c.x, top + 54, Math.min(230, w * 0.7), tall, "rgba(100,72,54,0.74)", idx === 6 ? "rgba(110,52,34,0.95)" : "rgba(48,42,39,0.94)");
    }
  }

  // 3/10 成長＝画面変化：開いた区画数に比例して街路の提灯が増える。
  const lanternCount = Math.min(28, 4 + progress * 3);
  for (let i = 0; i < lanternCount; i += 1) {
    const t = lanternCount <= 1 ? 0 : i / (lanternCount - 1);
    const x = bounds.x0 + 30 + t * Math.max(40, bounds.x1 - bounds.x0 - 60);
    const y = bounds.y0 + 26 + Math.sin(t * Math.PI * 3) * 9;
    lantern(ctx, x, y, time + i * 0.13, 0.55);
  }

  // 4/10 厨房工程を見せる：麺、寸胴、食材箱が背景から読める。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const bottom = area.rect.y1 - 34;
    const seed = seedOf(area.id);
    if (idx === 0 || idx === 4 || idx >= 5) {
      // 巨大寸胴のシルエット。
      ctx.fillStyle = "rgba(185,181,168,0.35)";
      rr(ctx, c.x - 32, bottom - 38, 64, 34, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(230,225,210,0.42)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(c.x, bottom - 38, 31, 7, 0, 0, TAU);
      ctx.stroke();
      if (effects) smokePuff(ctx, c.x, bottom - 44, time + idx, 0.9, true);
    }
    for (let i = 0; i < Math.min(5, 1 + Math.floor(progress / 2)); i += 1) {
      const x = area.rect.x0 + 28 + ((seed + i * 53) % Math.max(42, area.rect.x1 - area.rect.x0 - 56));
      const y = bottom - (i % 2) * 14;
      ctx.fillStyle = i % 2 ? "rgba(171,112,58,0.38)" : "rgba(115,73,43,0.38)";
      rr(ctx, x - 11, y - 8, 22, 16, 3);
      ctx.fill();
    }
  }

  // 5/10 人の気配：繁盛に応じて背景客を増やし、行列と食事の熱気を作る。
  const peoplePerArea = Math.min(6, 1 + Math.floor(progress / 2));
  for (const area of areas) {
    const idx = areaIndex(area);
    const w = area.rect.x1 - area.rect.x0;
    for (let i = 0; i < peoplePerArea; i += 1) {
      const x = area.rect.x0 + 42 + ((i * 61 + idx * 37) % Math.max(80, w - 84));
      const y = area.rect.y1 - 74 - (i % 2) * 22;
      tinyPerson(ctx, x, y, 0.72, i % 3 === 0 ? "#7e3940" : i % 3 === 1 ? "#334f70" : "#846238", time, i + idx);
    }
  }

  // 6/10 動き：湯気、暖簾の揺れ、厨房の火色で静止画感を消す。
  if (effects) {
    for (const area of areas) {
      const c = center(area.rect);
      const pulse = 0.055 + Math.sin(time * 2.4 + areaIndex(area)) * 0.018;
      const glow = ctx.createRadialGradient(c.x, area.rect.y1 - 90, 4, c.x, area.rect.y1 - 90, 100);
      glow.addColorStop(0, `rgba(255,102,50,${pulse})`);
      glow.addColorStop(1, "rgba(255,102,50,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(c.x, area.rect.y1 - 90, 100, 0, TAU);
      ctx.fill();
    }
  }

  // 7/10 空間にリズム：棟同士を一直線ではなく、蛇行する暖色の客導線で結ぶ。
  const ordered = [...areas].sort((a, b) => areaIndex(a) - areaIndex(b));
  if (ordered.length > 1) {
    curvedPath(
      ctx,
      ordered.map((area, i) => {
        const c = center(area.rect);
        return { x: c.x + (i % 2 ? 24 : -24), y: area.rect.y1 - 42 };
      }),
      9,
      "rgba(210,151,82,0.16)",
    );
  }

  // 8/10 次に何が起きるか：最後に開いた区画の端に建設資材を置く。
  const last = ordered[ordered.length - 1];
  if (last && progress < 10) {
    const x = last.rect.x1 - 46;
    const y = last.rect.y0 + 118;
    ctx.strokeStyle = "rgba(184,145,92,0.48)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 15, y + 36);
      ctx.lineTo(x + i * 15, y - 10 - i * 7);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(230,201,150,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 10);
    ctx.lineTo(x + 42, y - 8);
    ctx.stroke();
  }

  // 9/10 遠景：発展すると煙突・看板・屋根が画面奥まで連なる。
  const horizonY = bounds.y0 + 18;
  for (let i = 0; i < Math.min(18, progress * 2); i += 1) {
    const x = bounds.x0 + 34 + ((i * 89) % Math.max(100, bounds.x1 - bounds.x0 - 68));
    const h = 22 + (i % 4) * 9;
    ctx.fillStyle = "rgba(56,42,37,0.22)";
    rr(ctx, x - 15, horizonY - h, 30, h, 2);
    ctx.fill();
    if (i % 3 === 0 && effects) smokePuff(ctx, x + 7, horizonY - h, time + i, 0.38, false);
  }

  // 10/10 最終ランドマーク：総本店・2号店まで進むと巨大看板と提灯門が街の象徴になる。
  if (progress >= 5) {
    const target = getArea(areas, progress >= 6 ? 5 : 4) ?? getArea(areas, 4);
    if (target) {
      const c = center(target.rect);
      const y = target.rect.y0 + 28;
      ctx.fillStyle = "rgba(33,24,24,0.84)";
      rr(ctx, c.x - 82, y - 20, 164, 42, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(214,64,44,0.9)";
      rr(ctx, c.x - 64, y - 13, 128, 27, 5);
      ctx.fill();
      lantern(ctx, c.x - 97, y, time, 0.95);
      lantern(ctx, c.x + 97, y, time, 0.95);
    }
  }

  // unlocked を使い、購入密度が高いほど厨房周辺に小さな灯りを足す。
  const densityLights = Math.min(22, Math.floor(unlocked.size / 4));
  for (let i = 0; i < densityLights; i += 1) {
    const x = bounds.x0 + 26 + ((i * 71) % Math.max(80, bounds.x1 - bounds.x0 - 52));
    const y = bounds.y1 - 22 - (i % 3) * 10;
    ctx.fillStyle = "rgba(255,188,96,0.22)";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
};

/* ========================================================================== */
/* ドリームパーク：10回のグラフィック改善                               */
/* ========================================================================== */

const parkZoneColor = (idx: number) => {
  const colors = [
    "rgba(255,205,96,0.10)",
    "rgba(216,137,255,0.10)",
    "rgba(155,220,255,0.11)",
    "rgba(225,163,91,0.11)",
    "rgba(94,201,191,0.10)",
    "rgba(111,135,255,0.10)",
    "rgba(104,194,111,0.10)",
    "rgba(211,119,194,0.10)",
    "rgba(141,108,77,0.10)",
    "rgba(255,76,48,0.12)",
  ];
  return colors[idx % colors.length];
};

const drawWheelSilhouette = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
  alpha = 0.25,
) => {
  ctx.save();
  ctx.strokeStyle = `rgba(225,238,255,${alpha})`;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = time * 0.06 + (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,211,94,${alpha + 0.08})`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(2.5, r * 0.08), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const drawCastle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha = 0.28,
) => {
  ctx.save();
  ctx.fillStyle = `rgba(78,65,116,${alpha})`;
  rr(ctx, x - 45 * scale, y - 42 * scale, 90 * scale, 42 * scale, 4 * scale);
  ctx.fill();
  for (const dx of [-34, 0, 34]) {
    rr(ctx, x + dx * scale - 13 * scale, y - 68 * scale, 26 * scale, 68 * scale, 3 * scale);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + (dx - 18) * scale, y - 68 * scale);
    ctx.lineTo(x + dx * scale, y - 92 * scale);
    ctx.lineTo(x + (dx + 18) * scale, y - 68 * scale);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const drawParkPasses = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const progress = areas.length;
  const bounds = boundsOf(areas);
  if (!bounds) return;
  ctx.save();

  // 1/10 地域変更を床色だけで終わらせない：各区画に大きな空気色と縁取りを持たせる。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const w = area.rect.x1 - area.rect.x0;
    const h = area.rect.y1 - area.rect.y0;
    const g = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, Math.max(w, h) * 0.58);
    g.addColorStop(0, parkZoneColor(idx));
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(area.rect.x0, area.rect.y0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 3;
    rr(ctx, area.rect.x0 + 9, area.rect.y0 + 9, w - 18, h - 18, 18);
    ctx.stroke();
  }

  // 2/10 主役を大きく：入口広場に巨大アーチ、各エリア奥にランドマーク。
  const entrance = getArea(areas, 0);
  if (entrance) {
    const c = center(entrance.rect);
    const y = entrance.rect.y0 + 70;
    ctx.strokeStyle = "rgba(255,221,110,0.54)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(c.x, y + 44, 92, Math.PI, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,88,118,0.52)";
    rr(ctx, c.x - 102, y + 38, 20, 82, 8);
    ctx.fill();
    rr(ctx, c.x + 82, y + 38, 20, 82, 8);
    ctx.fill();
    for (let i = -3; i <= 3; i += 1) lantern(ctx, c.x + i * 28, y + 13 + Math.abs(i) * 4, time + i, 0.45, i % 2 ? "#ff687f" : "#ffd45f");
  }

  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const top = area.rect.y0 + 118;
    if (idx === 0) drawWheelSilhouette(ctx, area.rect.x1 - 68, top, 48, time, 0.2);
    else if (idx === 1) drawCastle(ctx, c.x, top + 22, 0.72, 0.24);
    else if (idx === 2) {
      // 雪山の三角シルエット。
      ctx.fillStyle = "rgba(214,235,245,0.20)";
      ctx.beginPath();
      ctx.moveTo(area.rect.x0 + 18, top + 55);
      ctx.lineTo(c.x - 36, top - 54);
      ctx.lineTo(c.x + 6, top + 55);
      ctx.lineTo(c.x + 62, top - 18);
      ctx.lineTo(area.rect.x1 - 18, top + 55);
      ctx.closePath();
      ctx.fill();
    } else if (idx === 3) {
      // 西部劇の街並み。
      for (let i = 0; i < 4; i += 1) {
        const x = area.rect.x0 + 54 + i * 72;
        ctx.fillStyle = "rgba(123,78,44,0.24)";
        rr(ctx, x - 27, top - 28 - (i % 2) * 15, 54, 76 + (i % 2) * 15, 2);
        ctx.fill();
      }
    } else if (idx === 9) {
      // 火山は画面を支配する大きさにする。
      ctx.fillStyle = "rgba(74,38,34,0.34)";
      ctx.beginPath();
      ctx.moveTo(area.rect.x0 + 12, top + 82);
      ctx.lineTo(c.x - 48, top - 18);
      ctx.lineTo(c.x, top - 74);
      ctx.lineTo(c.x + 58, top - 12);
      ctx.lineTo(area.rect.x1 - 12, top + 82);
      ctx.closePath();
      ctx.fill();
      if (effects) smokePuff(ctx, c.x, top - 70, time, 1.65, false);
    } else {
      drawWheelSilhouette(ctx, c.x, top, 30 + (idx % 3) * 8, time + idx, 0.12);
    }
  }

  // 3/10 空間にリズム：直線一本ではなく、広場をつなぐ太い曲線遊歩道。
  const ordered = [...areas].sort((a, b) => areaIndex(a) - areaIndex(b));
  if (ordered.length > 1) {
    curvedPath(
      ctx,
      ordered.map((area, i) => {
        const c = center(area.rect);
        return { x: c.x + (i % 2 ? 32 : -32), y: area.rect.y1 - 38 - (i % 3) * 10 };
      }),
      15,
      "rgba(255,236,188,0.14)",
    );
  }

  // 4/10 動きを大きく：観覧車、光、旗、風船が常に動いて見える。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    if (effects && idx % 2 === 0) {
      drawWheelSilhouette(ctx, c.x + 78, area.rect.y0 + 84, 18 + (idx % 3) * 5, time * 1.4 + idx, 0.16);
    }
    tinyFlag(ctx, area.rect.x0 + 30, area.rect.y0 + 88, time + idx, idx % 2 ? "#7c64e8" : "#f05267", 0.75);
    tinyFlag(ctx, area.rect.x1 - 30, area.rect.y0 + 94, time + idx + 1, idx % 2 ? "#50b9de" : "#ffd157", 0.75);
  }

  // 5/10 繁盛は人で見せる：背景客と行列を発展段階に応じて増やす。
  const crowd = Math.min(7, 1 + Math.floor(progress / 2));
  for (const area of areas) {
    const idx = areaIndex(area);
    const w = area.rect.x1 - area.rect.x0;
    for (let i = 0; i < crowd; i += 1) {
      const x = area.rect.x0 + 36 + ((i * 47 + idx * 29) % Math.max(72, w - 72));
      const y = area.rect.y1 - 62 - Math.floor(i / 4) * 20;
      const colors = ["#d95369", "#4472a3", "#5e8f5b", "#8b62a6", "#c9893e"];
      tinyPerson(ctx, x, y, 0.66, colors[(i + idx) % colors.length], time, i + idx * 0.4);
    }
  }

  // 6/10 「見て楽しい」光量：買った物が増えるほど電飾密度も上げる。
  const bulbs = Math.min(80, 14 + unlocked.size);
  for (let i = 0; i < bulbs; i += 1) {
    const t = i / Math.max(1, bulbs - 1);
    const x = bounds.x0 + 20 + t * Math.max(40, bounds.x1 - bounds.x0 - 40);
    const y = bounds.y0 + 17 + Math.sin(t * Math.PI * 5) * 8;
    const pulse = effects ? 0.25 + Math.sin(time * 4 + i * 0.8) * 0.11 : 0.23;
    ctx.fillStyle = i % 3 === 0 ? `rgba(255,98,120,${pulse})` : i % 3 === 1 ? `rgba(255,218,92,${pulse})` : `rgba(100,211,255,${pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, TAU);
    ctx.fill();
  }

  // 7/10 遠景にもアトラクション：世界が画面外まで続いている感覚を作る。
  const horizonY = bounds.y0 + 16;
  for (let i = 0; i < Math.min(12, progress + 3); i += 1) {
    const x = bounds.x0 + 58 + ((i * 107) % Math.max(120, bounds.x1 - bounds.x0 - 116));
    if (i % 3 === 0) drawWheelSilhouette(ctx, x, horizonY - 20, 18 + (i % 2) * 5, time + i, 0.09);
    else if (i % 3 === 1) drawCastle(ctx, x, horizonY + 6, 0.23, 0.09);
    else {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 28, horizonY + 4);
      ctx.quadraticCurveTo(x, horizonY - 34, x + 30, horizonY + 4);
      ctx.stroke();
    }
  }

  // 8/10 次のエリアを予告：最後の開放区画の出口にゲート骨組みと旗。
  const last = ordered[ordered.length - 1];
  if (last && progress < 10) {
    const x = last.rect.x1 - 52;
    const y = last.rect.y1 - 116;
    ctx.strokeStyle = "rgba(255,238,184,0.32)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 28, y + 60);
    ctx.lineTo(x - 28, y + 8);
    ctx.quadraticCurveTo(x, y - 18, x + 28, y + 8);
    ctx.lineTo(x + 28, y + 60);
    ctx.stroke();
    tinyFlag(ctx, x - 28, y + 12, time, "#ff6d7e", 0.72);
    tinyFlag(ctx, x + 28, y + 12, time + 1, "#6dcff4", 0.72);
  }

  // 9/10 人気エリアは周辺も豪華に：進行後半ほど植栽・屋台・休憩灯を追加。
  for (const area of areas) {
    const idx = areaIndex(area);
    if (idx < 3) continue;
    const count = Math.min(4, 1 + Math.floor(idx / 3));
    for (let i = 0; i < count; i += 1) {
      const x = area.rect.x0 + 34 + i * 46;
      const y = area.rect.y1 - 25;
      ctx.fillStyle = "rgba(45,108,63,0.28)";
      ctx.beginPath();
      ctx.arc(x, y - 10, 11 + (i % 2) * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(106,73,44,0.34)";
      ctx.fillRect(x - 2, y - 2, 4, 15);
    }
  }

  // 10/10 最終ランドマーク：火山エリア到達後は全園から見える噴火と祝祭光。
  if (progress >= 10) {
    const volcano = getArea(areas, 9) ?? ordered[ordered.length - 1];
    const c = center(volcano.rect);
    const top = volcano.rect.y0 + 52;
    const pulse = effects ? 0.18 + Math.sin(time * 3.4) * 0.06 : 0.16;
    const g = ctx.createRadialGradient(c.x, top, 10, c.x, top, 190);
    g.addColorStop(0, `rgba(255,98,42,${pulse})`);
    g.addColorStop(1, "rgba(255,98,42,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, top, 190, 0, TAU);
    ctx.fill();
    if (effects) {
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * TAU + time * 0.08;
        const r = 62 + (i % 4) * 16;
        ctx.fillStyle = i % 2 ? "rgba(255,218,100,0.32)" : "rgba(255,103,100,0.26)";
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * r, top - 40 + Math.sin(a) * r * 0.45, 2.6, 0, TAU);
        ctx.fill();
      }
    }
  }

  ctx.restore();
};

/* ========================================================================== */
/* 湯けむり温泉街：10回のグラフィック改善                               */
/* ========================================================================== */

const stone = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha = 0.25,
) => {
  ctx.fillStyle = `rgba(94,91,84,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 11 * scale, 7 * scale, 0.28, 0, TAU);
  ctx.fill();
};

const maple = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  warm: boolean,
) => {
  ctx.save();
  ctx.fillStyle = "rgba(83,63,45,0.58)";
  ctx.fillRect(x - 2.5 * scale, y - 34 * scale, 5 * scale, 34 * scale);
  const leaf = warm ? "rgba(186,79,48,0.38)" : "rgba(74,123,69,0.34)";
  ctx.fillStyle = leaf;
  for (const [dx, dy, r] of [[-12, -32, 13], [4, -39, 15], [16, -29, 11], [-1, -23, 12]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const drawOnsenPasses = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  const progress = areas.length;
  const bounds = boundsOf(areas);
  if (!bounds) return;
  const ordered = [...areas].sort((a, b) => areaIndex(a) - areaIndex(b));
  ctx.save();

  // 1/10 一本道をやめる：石畳の主道に広場・脇道・曲がりを視覚的に作る。
  if (ordered.length > 1) {
    curvedPath(
      ctx,
      ordered.map((area, i) => {
        const c = center(area.rect);
        return { x: c.x + (i % 2 ? -46 : 46), y: c.y + (i % 3 - 1) * 18 };
      }),
      22,
      "rgba(126,112,94,0.20)",
    );
  }
  for (const area of areas) {
    const idx = areaIndex(area);
    const w = area.rect.x1 - area.rect.x0;
    const seed = seedOf(area.id);
    for (let i = 0; i < 14; i += 1) {
      const edge = i % 2 === 0;
      const x = edge
        ? area.rect.x0 + 18 + ((seed + i * 33) % Math.max(28, Math.min(80, w * 0.14)))
        : area.rect.x1 - 18 - ((seed + i * 41) % Math.max(28, Math.min(80, w * 0.14)));
      const y = area.rect.y0 + 36 + ((seed + i * 57) % Math.max(70, area.rect.y1 - area.rect.y0 - 72));
      stone(ctx, x, y, 0.55 + (i % 3) * 0.12, 0.16 + idx * 0.005);
    }
  }

  // 2/10 主役は湯けむり：発展するほど町全体から湯気が立つ。
  const steamPerArea = Math.min(5, 1 + Math.floor(progress / 2));
  if (effects) {
    for (const area of areas) {
      const c = center(area.rect);
      const w = area.rect.x1 - area.rect.x0;
      for (let i = 0; i < steamPerArea; i += 1) {
        const x = c.x + (i - (steamPerArea - 1) / 2) * Math.min(65, w / 7);
        const y = area.rect.y0 + 85 + (i % 2) * 35;
        smokePuff(ctx, x, y, time + i * 0.6 + areaIndex(area), 0.85, false);
      }
    }
  }

  // 3/10 店舗ごとの外観を変える：入口、広場、旅館、奥座敷をシルエットで分ける。
  for (const area of areas) {
    const idx = areaIndex(area);
    const c = center(area.rect);
    const w = area.rect.x1 - area.rect.x0;
    const top = area.rect.y0 + 52;
    if (idx === 0 || idx === 1) {
      // 入口街路：低い商家。
      for (let i = -1; i <= 1; i += 1) {
        roof(ctx, c.x + i * Math.min(105, w * 0.26), top + 44 + Math.abs(i) * 8, 82, 66, "rgba(111,83,58,0.54)", "rgba(68,57,53,0.72)");
      }
    } else if (idx === 2) {
      // 到着広場：中央を空け、左右に待合棟。
      roof(ctx, area.rect.x0 + w * 0.22, top + 45, 110, 74, "rgba(119,91,64,0.58)", "rgba(65,56,52,0.76)");
      roof(ctx, area.rect.x1 - w * 0.22, top + 45, 110, 74, "rgba(119,91,64,0.58)", "rgba(65,56,52,0.76)");
    } else if (idx >= 6) {
      // 山側：大旅館の高さを出す。
      roof(ctx, c.x, top + 76, Math.min(260, w * 0.6), 132, "rgba(93,70,57,0.64)", "rgba(48,47,47,0.84)");
      roof(ctx, c.x, top + 22, Math.min(190, w * 0.46), 76, "rgba(104,74,60,0.64)", "rgba(48,47,47,0.88)");
    } else {
      roof(ctx, c.x, top + 50, Math.min(200, w * 0.54), 88, "rgba(111,82,59,0.58)", "rgba(61,53,50,0.8)");
    }
  }

  // 4/10 温泉街のランドマーク：到着広場に大きな木組みの湯樋と湯だまり。
  const plaza = getArea(areas, 2) ?? getArea(areas, 0);
  if (plaza) {
    const c = center(plaza.rect);
    const y = plaza.rect.y0 + 155;
    ctx.fillStyle = "rgba(82,67,52,0.48)";
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillRect(c.x + i * 32 - 3, y - 34 - Math.abs(i) * 4, 6, 52);
      ctx.fillStyle = "rgba(157,118,68,0.48)";
      rr(ctx, c.x + i * 32 - 18, y - 28 - Math.abs(i) * 4, 36, 8, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(82,67,52,0.48)";
    }
    ctx.fillStyle = "rgba(61,144,139,0.32)";
    ctx.beginPath();
    ctx.ellipse(c.x, y + 17, 94, 26, 0, 0, TAU);
    ctx.fill();
    if (effects) {
      for (let i = -2; i <= 2; i += 1) smokePuff(ctx, c.x + i * 30, y - 18, time + i, 0.65, false);
    }
  }

  // 5/10 提灯・暖簾・灯り：夜でなくても温泉街らしい暖色の連続を作る。
  const lanterns = Math.min(36, 6 + progress * 3 + Math.floor(unlocked.size / 10));
  for (let i = 0; i < lanterns; i += 1) {
    const t = i / Math.max(1, lanterns - 1);
    const x = bounds.x0 + 28 + t * Math.max(50, bounds.x1 - bounds.x0 - 56);
    const y = bounds.y0 + 34 + Math.sin(t * Math.PI * 4) * 12;
    lantern(ctx, x, y, time + i * 0.15, 0.52, i % 4 === 0 ? "#e8b349" : "#c8503c");
  }

  // 6/10 繁盛は人で見せる：浴衣客、写真客、散歩客を背景に増やす。
  const guests = Math.min(7, 1 + Math.floor(progress / 2));
  const yukata = ["#6c718d", "#a25b64", "#527a69", "#8e6b3d", "#785f8f"];
  for (const area of areas) {
    const idx = areaIndex(area);
    const w = area.rect.x1 - area.rect.x0;
    for (let i = 0; i < guests; i += 1) {
      const x = area.rect.x0 + 46 + ((i * 71 + idx * 43) % Math.max(90, w - 92));
      const y = area.rect.y1 - 54 - (i % 3) * 18;
      tinyPerson(ctx, x, y, 0.65, yukata[(i + idx) % yukata.length], time, i * 0.7 + idx);
    }
  }

  // 7/10 奥行き：山側に遠景の旅館と稜線を足し、画面外にも街が続くようにする。
  const mountainY = bounds.y0 + 44;
  ctx.fillStyle = "rgba(61,81,70,0.14)";
  ctx.beginPath();
  ctx.moveTo(bounds.x0, mountainY + 42);
  const span = Math.max(100, bounds.x1 - bounds.x0);
  for (let i = 0; i <= 12; i += 1) {
    const x = bounds.x0 + (span * i) / 12;
    const y = mountainY - 18 - ((i * 37) % 5) * 11;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(bounds.x1, mountainY + 52);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < Math.min(14, progress * 2); i += 1) {
    const x = bounds.x0 + 45 + ((i * 113) % Math.max(100, bounds.x1 - bounds.x0 - 90));
    const y = mountainY + 22 - (i % 3) * 13;
    roof(ctx, x, y, 48 + (i % 2) * 14, 34 + (i % 3) * 7, "rgba(82,64,54,0.18)", "rgba(52,49,47,0.22)");
  }

  // 8/10 前後の成長差：進行後半ほど植栽・石垣・暖色窓を増やす。
  for (const area of areas) {
    const idx = areaIndex(area);
    if (idx < 2) continue;
    const count = Math.min(5, 1 + Math.floor(idx / 2));
    for (let i = 0; i < count; i += 1) {
      const left = i % 2 === 0;
      const x = left ? area.rect.x0 + 24 + i * 11 : area.rect.x1 - 24 - i * 11;
      const y = area.rect.y1 - 34 - i * 19;
      maple(ctx, x, y, 0.55 + (i % 2) * 0.08, idx % 3 === 0);
      ctx.fillStyle = "rgba(255,196,105,0.14)";
      rr(ctx, x - 8, y - 28, 16, 12, 2);
      ctx.fill();
    }
  }

  // 9/10 次に行きたくなる予告：最後の区画の山側に未完成の門と湯けむりを見せる。
  const last = ordered[ordered.length - 1];
  if (last && progress < 10) {
    const c = center(last.rect);
    const y = last.rect.y0 + 72;
    ctx.strokeStyle = "rgba(177,142,96,0.36)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(c.x - 42, y + 58);
    ctx.lineTo(c.x - 42, y + 8);
    ctx.lineTo(c.x + 42, y + 8);
    ctx.lineTo(c.x + 42, y + 58);
    ctx.stroke();
    ctx.strokeStyle = "rgba(87,69,55,0.36)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(c.x - 50, y + 10);
    ctx.lineTo(c.x, y - 13);
    ctx.lineTo(c.x + 50, y + 10);
    ctx.stroke();
    if (effects) smokePuff(ctx, c.x, y + 5, time, 1.1, false);
  }

  // 10/10 最終ランドマーク：発展後は山側に大旅館群＋大きな湯けむり柱を作る。
  if (progress >= 7) {
    const target = ordered[ordered.length - 1];
    const c = center(target.rect);
    const w = target.rect.x1 - target.rect.x0;
    const y = target.rect.y0 + 98;
    roof(ctx, c.x, y + 42, Math.min(310, w * 0.64), 142, "rgba(91,66,55,0.72)", "rgba(43,42,42,0.9)");
    roof(ctx, c.x, y - 10, Math.min(230, w * 0.48), 86, "rgba(105,72,59,0.72)", "rgba(48,45,45,0.92)");
    lantern(ctx, c.x - 102, y + 47, time, 0.9);
    lantern(ctx, c.x + 102, y + 47, time, 0.9);
    if (effects) {
      smokePuff(ctx, c.x - 44, y - 10, time + 0.2, 1.1, false);
      smokePuff(ctx, c.x + 40, y - 18, time + 0.9, 1.2, false);
    }
  }

  ctx.restore();
};

export const drawClassicStageGraphicPass = (
  ctx: CanvasRenderingContext2D,
  stageId: string,
  openAreas: AreaView[],
  unlocked: string[],
  time: number,
  effects: boolean,
) => {
  const unlockedSet = new Set(unlocked);
  if (stageId === "ramen") drawRamenPasses(ctx, openAreas, unlockedSet, time, effects);
  else if (stageId === "park") drawParkPasses(ctx, openAreas, unlockedSet, time, effects);
  else if (stageId === "onsen") drawOnsenPasses(ctx, openAreas, unlockedSet, time, effects);
};

/* 前景はキャラクターよりあとに描く。大きな物を少数だけ置き、奥行きを作る。 */
export const drawClassicStageForegroundPass = (
  ctx: CanvasRenderingContext2D,
  stageId: string,
  openAreas: AreaView[],
  time: number,
  effects: boolean,
) => {
  if (!openAreas.length) return;
  ctx.save();
  for (const area of openAreas) {
    const idx = areaIndex(area);
    const w = area.rect.x1 - area.rect.x0;
    const h = area.rect.y1 - area.rect.y0;

    if (stageId === "ramen") {
      // 手前の軒・提灯・湯気で店の中にいる感覚。
      ctx.fillStyle = "rgba(43,31,28,0.22)";
      ctx.beginPath();
      ctx.moveTo(area.rect.x0, area.rect.y1 - 18);
      ctx.lineTo(area.rect.x0 + Math.min(110, w * 0.28), area.rect.y1 - 32);
      ctx.lineTo(area.rect.x0 + Math.min(126, w * 0.32), area.rect.y1);
      ctx.lineTo(area.rect.x0, area.rect.y1);
      ctx.closePath();
      ctx.fill();
      lantern(ctx, area.rect.x0 + 24, area.rect.y1 - 56, time + idx, 0.76);
      if (effects && idx % 2 === 0) smokePuff(ctx, area.rect.x1 - 34, area.rect.y1 - 30, time + idx, 0.7, true);
    } else if (stageId === "park") {
      // 風船・植栽・ゲート柱がキャラクターの一部を隠す。
      const x = idx % 2 === 0 ? area.rect.x0 + 24 : area.rect.x1 - 24;
      ctx.fillStyle = "rgba(45,106,63,0.34)";
      ctx.beginPath();
      ctx.arc(x, area.rect.y1 - 24, 24, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(84,63,44,0.44)";
      ctx.fillRect(x - 3, area.rect.y1 - 28, 6, 28);
      if (effects) {
        for (let i = 0; i < 3; i += 1) {
          const bx = x + (i - 1) * 13 + Math.sin(time * 1.8 + i + idx) * 2;
          const by = area.rect.y1 - 72 - i * 8 + Math.sin(time * 1.4 + i) * 3;
          ctx.strokeStyle = "rgba(255,255,255,0.32)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, area.rect.y1 - 45);
          ctx.lineTo(bx, by + 8);
          ctx.stroke();
          ctx.fillStyle = i === 0 ? "rgba(255,94,117,0.72)" : i === 1 ? "rgba(255,210,82,0.72)" : "rgba(98,199,235,0.72)";
          ctx.beginPath();
          ctx.ellipse(bx, by, 7, 9, 0, 0, TAU);
          ctx.fill();
        }
      }
    } else if (stageId === "onsen") {
      // 軒・紅葉・濃い湯けむり。ステージ固有の前景を必ず作る。
      const left = idx % 2 === 0;
      const x = left ? area.rect.x0 + 22 : area.rect.x1 - 22;
      maple(ctx, x, area.rect.y1 - 2, 1.0, idx % 3 === 0);
      ctx.fillStyle = "rgba(54,45,40,0.20)";
      ctx.beginPath();
      if (left) {
        ctx.moveTo(area.rect.x0, area.rect.y0 + h * 0.24);
        ctx.lineTo(area.rect.x0 + Math.min(100, w * 0.22), area.rect.y0 + h * 0.28);
        ctx.lineTo(area.rect.x0 + Math.min(82, w * 0.18), area.rect.y0 + h * 0.36);
        ctx.lineTo(area.rect.x0, area.rect.y0 + h * 0.34);
      } else {
        ctx.moveTo(area.rect.x1, area.rect.y0 + h * 0.24);
        ctx.lineTo(area.rect.x1 - Math.min(100, w * 0.22), area.rect.y0 + h * 0.28);
        ctx.lineTo(area.rect.x1 - Math.min(82, w * 0.18), area.rect.y0 + h * 0.36);
        ctx.lineTo(area.rect.x1, area.rect.y0 + h * 0.34);
      }
      ctx.closePath();
      ctx.fill();
      if (effects) smokePuff(ctx, x + (left ? 24 : -24), area.rect.y1 - 34, time + idx, 0.82, false);
    }
  }
  ctx.restore();
};
