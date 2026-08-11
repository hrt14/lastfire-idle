type AquariumArea = {
  id: string;
  label?: string;
  rect: { x0: number; y0: number; x1: number; y1: number };
  palette: { floor: string; deep: string; prop: string };
};

type Mood =
  | "satoyama"
  | "mountain"
  | "great-river"
  | "mekong"
  | "flooded"
  | "africa"
  | "amazon"
  | "amazon-giant"
  | "japan-sea"
  | "cold-sea"
  | "reef"
  | "kelp"
  | "tropical-sea"
  | "great-reef"
  | "indian"
  | "open-ocean"
  | "deep-sea"
  | "world-ocean";

type Theme = {
  name: string;
  chapter: string;
  mood: Mood;
  wallTop: string;
  wallBottom: string;
  floorTop: string;
  floorBottom: string;
  accent: string;
  light: string;
  warm?: boolean;
};

const THEMES: Theme[] = [
  { name: "日本の淡水・里川", chapter: "FRESH WATER · JAPAN", mood: "satoyama", wallTop: "#dfe8df", wallBottom: "#9fc6b2", floorTop: "#b9afa0", floorBottom: "#6f7167", accent: "#4f9179", light: "#effff7", warm: true },
  { name: "日本の清流", chapter: "FRESH WATER · JAPAN", mood: "mountain", wallTop: "#dce9e5", wallBottom: "#83b8b0", floorTop: "#aab8b2", floorBottom: "#667d79", accent: "#5daea6", light: "#eaffff", warm: true },
  { name: "東アジアの大河", chapter: "FRESH WATER · EAST ASIA", mood: "great-river", wallTop: "#d8d9ca", wallBottom: "#86927b", floorTop: "#aca890", floorBottom: "#65665a", accent: "#7f9276", light: "#f7f1d9", warm: true },
  { name: "メコン川", chapter: "FRESH WATER · MEKONG", mood: "mekong", wallTop: "#cbd5ba", wallBottom: "#657957", floorTop: "#938b71", floorBottom: "#514f42", accent: "#8aa46c", light: "#edf5c7", warm: true },
  { name: "東南アジア 水没森林", chapter: "FRESH WATER · FLOODED FOREST", mood: "flooded", wallTop: "#31584b", wallBottom: "#173a32", floorTop: "#4e5c4d", floorBottom: "#24342e", accent: "#68a275", light: "#d6f3cf" },
  { name: "アフリカの湖と川", chapter: "FRESH WATER · AFRICA", mood: "africa", wallTop: "#b9ae86", wallBottom: "#74664b", floorTop: "#8d7c5d", floorBottom: "#4c4334", accent: "#c7a65e", light: "#fff0bd", warm: true },
  { name: "アマゾン熱帯雨林", chapter: "FRESH WATER · AMAZON", mood: "amazon", wallTop: "#265245", wallBottom: "#12392f", floorTop: "#4b6254", floorBottom: "#23382f", accent: "#4ca36f", light: "#bcffd4" },
  { name: "AMAZON GREAT RIVER", chapter: "FRESH WATER · GRAND FINALE", mood: "amazon-giant", wallTop: "#1d4c43", wallBottom: "#0d2f2a", floorTop: "#405e54", floorBottom: "#1b312b", accent: "#55b193", light: "#c8ffed" },
  { name: "日本の海", chapter: "OCEAN · JAPAN", mood: "japan-sea", wallTop: "#144d67", wallBottom: "#082f45", floorTop: "#31505b", floorBottom: "#142b33", accent: "#64cce8", light: "#d5f8ff" },
  { name: "北の海", chapter: "OCEAN · COLD WATER", mood: "cold-sea", wallTop: "#315b70", wallBottom: "#18384b", floorTop: "#486570", floorBottom: "#233844", accent: "#9ed7ee", light: "#ebfbff" },
  { name: "沖縄 サンゴ礁", chapter: "OCEAN · OKINAWA", mood: "reef", wallTop: "#138995", wallBottom: "#056173", floorTop: "#4c7c7c", floorBottom: "#1f4b50", accent: "#78f0e4", light: "#eafff6" },
  { name: "CALIFORNIA KELP FOREST", chapter: "OCEAN · KELP FOREST", mood: "kelp", wallTop: "#2f655d", wallBottom: "#163d3a", floorTop: "#496a62", floorBottom: "#263e3a", accent: "#74b487", light: "#e5f8d4" },
  { name: "東南アジアの海", chapter: "OCEAN · SOUTH EAST ASIA", mood: "tropical-sea", wallTop: "#167786", wallBottom: "#0a4c59", floorTop: "#3b6870", floorBottom: "#1a3c43", accent: "#79d8e6", light: "#e0ffff" },
  { name: "GREAT REEF", chapter: "OCEAN · AUSTRALIA", mood: "great-reef", wallTop: "#128695", wallBottom: "#075a69", floorTop: "#467b7e", floorBottom: "#1c4449", accent: "#7ce7dc", light: "#effff9" },
  { name: "INDIAN OCEAN", chapter: "OCEAN · INDIAN OCEAN", mood: "indian", wallTop: "#165f73", wallBottom: "#0a3d4f", floorTop: "#3b5e69", floorBottom: "#182f38", accent: "#72c7e2", light: "#e2f8ff" },
  { name: "OPEN OCEAN", chapter: "OCEAN · OPEN OCEAN", mood: "open-ocean", wallTop: "#0d5a78", wallBottom: "#062f47", floorTop: "#2f5060", floorBottom: "#122934", accent: "#68c8ef", light: "#e0f8ff" },
  { name: "DEEP SEA", chapter: "OCEAN · DEEP SEA", mood: "deep-sea", wallTop: "#151f3d", wallBottom: "#070d22", floorTop: "#1c243b", floorBottom: "#080c18", accent: "#787fe0", light: "#cdd4ff" },
  { name: "WORLD OCEAN", chapter: "WORLD OCEAN · GRAND FINALE", mood: "world-ocean", wallTop: "#0d5270", wallBottom: "#05283e", floorTop: "#304f5c", floorBottom: "#112833", accent: "#7eddf2", light: "#eaffff" },
];

const areaIndex = (id: string) => {
  const match = id.match(/area-(\d+)/);
  return match ? Number(match[1]) : 0;
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

const fishShadow = (
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
  ctx.fillStyle = "#d8f9ff";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12 * scale, 4.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10 * scale, 0);
  ctx.lineTo(-18 * scale, -6 * scale);
  ctx.lineTo(-18 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
};

const drawCeiling = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  time: number,
  index: number,
) => {
  const w = rect.x1 - rect.x0;
  const bright = theme.warm === true;
  ctx.fillStyle = bright ? "rgba(62,72,64,0.88)" : index >= 16 ? "#050814" : "#07141d";
  ctx.fillRect(rect.x0, rect.y0, w, 28);

  for (let i = 0; i < 5; i += 1) {
    const x = rect.x0 + 34 + i * ((w - 68) / 4);
    const glow = 0.42 + Math.abs(Math.sin(time * 0.7 + i)) * 0.2;
    ctx.fillStyle = bright
      ? `rgba(255,244,205,${glow})`
      : `rgba(126,226,255,${glow})`;
    rounded(ctx, x - 18, rect.y0 + 10, 36, 4, 2);
    ctx.fill();
  }
};

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const darkText = theme.warm === true;

  ctx.textAlign = "center";
  ctx.fillStyle = darkText ? "rgba(42,63,56,0.78)" : theme.accent;
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(theme.chapter, cx, rect.y0 + 45);

  ctx.fillStyle = darkText ? "#263b34" : "#f2fdff";
  ctx.font = '900 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(theme.name, cx, rect.y0 + 64);

  if (index === 0) {
    ctx.fillStyle = "rgba(80,69,51,0.86)";
    rounded(ctx, rect.x0 + 30, rect.y0 + 77, rect.x1 - rect.x0 - 60, 34, 12);
    ctx.fill();
    ctx.fillStyle = "#fff7df";
    ctx.font = '900 12px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("日本の小さな川から、世界の大海へ", cx, rect.y0 + 98);
  }
};

const drawDistantHabitat = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  time: number,
  index: number,
) => {
  const x0 = rect.x0 + 18;
  const x1 = rect.x1 - 18;
  const y0 = rect.y0 + 76;
  const y1 = rect.y0 + 190;
  const w = x1 - x0;

  // 奥の景色は四角い壁ではなく、大きなアーチ窓として見せる。
  const mural = ctx.createLinearGradient(0, y0, 0, y1);
  mural.addColorStop(0, theme.wallTop);
  mural.addColorStop(1, theme.wallBottom);
  ctx.fillStyle = mural;
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.fill();

  ctx.save();
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.clip();

  const mood = theme.mood;
  if (mood === "satoyama" || mood === "mountain" || mood === "great-river") {
    ctx.fillStyle = mood === "mountain" ? "rgba(75,111,103,0.82)" : "rgba(73,111,75,0.74)";
    ctx.beginPath();
    ctx.moveTo(x0 - 10, y0 + 74);
    ctx.bezierCurveTo(x0 + 62, y0 + 26, x0 + 123, y0 + 84, x0 + 183, y0 + 48);
    ctx.bezierCurveTo(x0 + 246, y0 + 15, x0 + 306, y0 + 76, x1 + 10, y0 + 42);
    ctx.lineTo(x1 + 10, y1 + 8);
    ctx.lineTo(x0 - 10, y1 + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(154,211,204,0.74)";
    ctx.beginPath();
    ctx.moveTo(x0 - 10, y0 + 88);
    ctx.bezierCurveTo(x0 + 80, y0 + 62, x0 + 125, y0 + 108, x0 + 198, y0 + 82);
    ctx.bezierCurveTo(x0 + 260, y0 + 60, x0 + 306, y0 + 102, x1 + 10, y0 + 79);
    ctx.lineTo(x1 + 10, y1 + 8);
    ctx.lineTo(x0 - 10, y1 + 8);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 9; i += 1) {
      const x = x0 + 12 + i * 42;
      const height = 26 + (i % 3) * 7;
      ctx.strokeStyle = "rgba(71,81,58,0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y0 + 76);
      ctx.lineTo(x + (i % 2 ? 4 : -4), y0 + 76 - height);
      ctx.stroke();
      leaf(ctx, x - 5, y0 + 46 - (i % 2) * 3, 12, 5, -0.3, "rgba(85,132,79,0.8)");
      leaf(ctx, x + 8, y0 + 39 + (i % 3), 12, 5, 0.28, "rgba(104,150,87,0.76)");
    }

    if (mood === "mountain") {
      ctx.fillStyle = "rgba(201,219,215,0.62)";
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 18 + i * 52, y0 + 102, 20, 7, i * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (mood === "mekong" || mood === "flooded" || mood === "amazon" || mood === "amazon-giant") {
    const dense = mood === "amazon" || mood === "amazon-giant";
    for (let i = 0; i < (dense ? 12 : 9); i += 1) {
      const x = x0 + 10 + i * (w / (dense ? 11 : 8));
      ctx.strokeStyle = dense ? "rgba(62,88,55,0.9)" : "rgba(80,92,58,0.84)";
      ctx.lineWidth = 4 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(x, y0 - 8);
      ctx.bezierCurveTo(x + 18, y0 + 32, x - 15, y0 + 67, x + 4, y1 + 10);
      ctx.stroke();
    }
    ctx.fillStyle = dense ? "rgba(48,112,79,0.32)" : "rgba(82,130,82,0.3)";
    for (let i = 0; i < 16; i += 1) {
      leaf(ctx, x0 + 10 + (i * 37) % w, y0 + 20 + (i * 23) % 74, 13, 5, (i % 5) * 0.35, dense ? "#4d8d62" : "#789163");
    }
    fishShadow(ctx, x0 + 86, y0 + 80, dense ? 1.05 : 0.78, 0.16, 1);
    fishShadow(ctx, x1 - 70, y0 + 56, dense ? 1.35 : 0.95, 0.12, -1);
  } else if (mood === "africa") {
    ctx.fillStyle = "rgba(89,74,52,0.7)";
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x0 + 12 + i * 44, y0 + 96 - (i % 3) * 4, 28, 12, i * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(195,173,112,0.32)";
    ctx.fillRect(x0, y0 + 75, w, 42);
  } else if (mood === "kelp") {
    for (let i = 0; i < 11; i += 1) {
      const x = x0 + 10 + i * 34;
      ctx.strokeStyle = i % 2 ? "rgba(63,119,75,0.82)" : "rgba(80,143,82,0.75)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y1 + 6);
      ctx.bezierCurveTo(x + 17, y0 + 84, x - 14, y0 + 45, x + 4, y0 - 4);
      ctx.stroke();
    }
    fishShadow(ctx, x0 + 85, y0 + 54, 0.7, 0.16, 1);
    fishShadow(ctx, x1 - 72, y0 + 87, 1.0, 0.13, -1);
  } else if (mood === "reef" || mood === "great-reef" || mood === "tropical-sea") {
    const coralColors = mood === "great-reef" ? ["#ed7f77", "#e7c55e", "#a27bd2", "#66c7af"] : ["#de8876", "#e6c268", "#9c83c7"];
    for (let i = 0; i < 16; i += 1) {
      const x = x0 + 5 + i * 24;
      const c = coralColors[i % coralColors.length];
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y1 + 8);
      ctx.lineTo(x + (i % 2 ? 5 : -4), y1 - 19 - (i % 3) * 5);
      ctx.lineTo(x + (i % 3 - 1) * 8, y1 - 31 - (i % 2) * 7);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      fishShadow(ctx, x0 + 30 + i * 42, y0 + 32 + (i % 3) * 22, 0.45 + (i % 2) * 0.15, 0.16, i % 3 ? 1 : -1);
    }
  } else if (mood === "deep-sea") {
    for (let i = 0; i < 22; i += 1) {
      const px = x0 + 16 + ((i * 47) % Math.max(1, w - 32));
      const py = y0 + 12 + ((i * 31) % 88);
      const pulse = 0.18 + Math.abs(Math.sin(time * 0.8 + i)) * 0.42;
      ctx.fillStyle = `rgba(102,229,221,${pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.8 + (i % 3) * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 海中の奥行き。斜めの光柱と大小の魚影で距離を作る。
    ctx.strokeStyle = "rgba(210,250,255,0.12)";
    for (let i = 0; i < 7; i += 1) {
      ctx.lineWidth = 8 + (i % 3) * 4;
      ctx.beginPath();
      ctx.moveTo(x0 + 18 + i * 55, y0 - 4);
      ctx.lineTo(x0 - 12 + i * 55 + Math.sin(time * 0.3 + i) * 6, y1 + 6);
      ctx.stroke();
    }
    fishShadow(ctx, x0 + 58, y0 + 54, 0.6, 0.12, 1);
    fishShadow(ctx, x1 - 72, y0 + 82, 1.05, 0.11, -1);
    if (mood === "open-ocean" || mood === "world-ocean") {
      fishShadow(ctx, (x0 + x1) / 2, y0 + 60, 1.65, 0.13, 1);
    }
  }

  ctx.restore();
  ctx.strokeStyle = theme.warm ? "rgba(83,103,87,0.32)" : "rgba(158,235,250,0.24)";
  ctx.lineWidth = 2;
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.stroke();
};

const drawPerspectiveFloor = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  const w = rect.x1 - rect.x0;
  const cx = (rect.x0 + rect.x1) / 2;
  const floorTop = rect.y0 + 184;
  const floor = ctx.createLinearGradient(0, floorTop, 0, rect.y1);
  floor.addColorStop(0, theme.floorTop);
  floor.addColorStop(1, theme.floorBottom);
  ctx.fillStyle = floor;
  ctx.fillRect(rect.x0, floorTop, w, rect.y1 - floorTop);

  const mirrored = index % 2 === 1;
  const startX = cx + (mirrored ? -28 : 28);
  const midX = cx + (mirrored ? 70 : -70);
  const endX = cx + (mirrored ? -28 : 28);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme.warm ? "rgba(218,208,190,0.64)" : "rgba(165,200,205,0.12)";
  ctx.lineWidth = 122;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 201);
  ctx.stroke();

  ctx.strokeStyle = theme.warm ? "rgba(251,242,222,0.42)" : "rgba(208,235,237,0.08)";
  ctx.lineWidth = 90;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 201);
  ctx.stroke();

  // 奥へ収束する目地。真横のグリッドよりパースが伝わる。
  ctx.strokeStyle = theme.warm ? "rgba(70,76,68,0.10)" : "rgba(190,225,230,0.055)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 49, rect.y1);
    ctx.lineTo(cx + i * 13, floorTop + 8);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const t = i / 5;
    const y = floorTop + 36 + (rect.y1 - floorTop - 36) * t * t;
    const half = 52 + 125 * t;
    ctx.beginPath();
    ctx.moveTo(cx - half, y);
    ctx.quadraticCurveTo(cx, y + 9, cx + half, y);
    ctx.stroke();
  }

  // 順路ラインも直線ではなく通路のカーブに沿わせる。
  ctx.strokeStyle = theme.warm ? "rgba(73,136,116,0.52)" : `${theme.accent}99`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 - 10);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 210);
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawLandmarkFrame = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
  time: number,
) => {
  const mirrored = index % 2 === 1;
  const heroX = rect.x0 + (mirrored ? 82 : 278);
  const heroY = rect.y0 + 258;

  // 3番展示のまわりだけ空間を大きく使い、ランドマークとして読めるようにする。
  const halo = ctx.createRadialGradient(heroX, heroY - 20, 8, heroX, heroY - 20, 82);
  halo.addColorStop(0, theme.warm ? "rgba(255,248,214,0.26)" : `${theme.accent}28`);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(heroX - 90, heroY - 108, 180, 150);

  ctx.strokeStyle = theme.warm ? "rgba(91,89,66,0.38)" : `${theme.accent}66`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(heroX, heroY - 12, 61, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();

  ctx.fillStyle = theme.warm ? "rgba(75,70,50,0.86)" : "rgba(4,17,27,0.84)";
  rounded(ctx, heroX - 54, heroY - 91, 108, 22, 9);
  ctx.fill();
  ctx.fillStyle = theme.warm ? "#fff6d9" : theme.light;
  ctx.font = '900 8px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(index === 0 ? "里川の見せ場" : index === 1 ? "清流の見せ場" : "AREA LANDMARK", heroX, heroY - 77);

  const pulse = 0.45 + Math.abs(Math.sin(time * 1.5)) * 0.25;
  ctx.fillStyle = theme.warm ? `rgba(255,233,162,${pulse})` : `rgba(150,235,255,${pulse})`;
  ctx.beginPath();
  ctx.arc(heroX + 50, heroY - 83, 3.4, 0, Math.PI * 2);
  ctx.fill();
};

const drawBench = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: Theme,
  scale = 1,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = theme.warm ? "#735f45" : "#354952";
  rounded(ctx, -20, -5, 40, 8, 3);
  ctx.fill();
  ctx.fillRect(-17, 3, 4, 8);
  ctx.fillRect(13, 3, 4, 8);
  ctx.fillStyle = theme.warm ? "rgba(255,245,218,0.2)" : "rgba(210,247,255,0.12)";
  ctx.fillRect(-16, -3, 32, 1.4);
  ctx.restore();
};

const drawForeground = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  const ocean = index >= 8;
  const lush = [0, 1, 3, 4, 6, 7, 10, 11, 13].includes(index);

  // 前景を画面端に被せる。プレイ層より手前に物があるだけで平面感が大きく減る。
  if (lush) {
    const spots = [
      { x: rect.x0 + 8, y: rect.y1 - 18, s: 1.3 },
      { x: rect.x1 - 8, y: rect.y1 - 26, s: 1.45 },
    ];
    for (const spot of spots) {
      ctx.fillStyle = ocean ? "#2b4b45" : "#3f6547";
      ctx.beginPath();
      ctx.ellipse(spot.x, spot.y + 7, 24 * spot.s, 8 * spot.s, 0, 0, Math.PI * 2);
      ctx.fill();
      const colors = ocean ? ["#477c68", "#5e9173", "#356758"] : ["#4f7d50", "#6e9a62", "#3d6948"];
      for (let i = 0; i < 8; i += 1) {
        const a = -1.4 + i * 0.4;
        leaf(ctx, spot.x + Math.sin(a) * 14 * spot.s, spot.y - 6 - Math.abs(Math.cos(a)) * 22 * spot.s, 4.5 * spot.s, 15 * spot.s, a, colors[i % colors.length]);
      }
    }
  }

  if (index === 0 || index === 1) {
    // 日本淡水は木製サインと小石で、暗い水族館ではなく里山の展示空間にする。
    ctx.fillStyle = "#7a6247";
    rounded(ctx, rect.x0 + 12, rect.y1 - 90, 58, 38, 6);
    ctx.fill();
    ctx.fillStyle = "#f4ead2";
    ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(index === 0 ? "日本の淡水" : "山から海へ", rect.x0 + 41, rect.y1 - 69);
    ctx.fillStyle = "rgba(114,105,86,0.68)";
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 14 + i * 9, rect.y1 - 14 - (i % 2) * 3, 6, 3, i * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const drawAmenities = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  // エリアが進むほど館内そのものが豊かになる。数値ではなく背景密度でも進行を感じさせる。
  const tier = index < 2 ? 1 : index < 6 ? 2 : index < 10 ? 3 : index < 14 ? 4 : 5;
  if (tier >= 2) drawBench(ctx, rect.x0 + 52, rect.y0 + 352, theme, 0.9);
  if (tier >= 3) drawBench(ctx, rect.x1 - 52, rect.y0 + 374, theme, 0.95);

  if (tier >= 2) {
    ctx.fillStyle = theme.warm ? "rgba(86,74,54,0.78)" : "rgba(9,27,36,0.78)";
    rounded(ctx, rect.x1 - 92, rect.y0 + 204, 66, 24, 9);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("NEXT EXHIBIT →", rect.x1 - 59, rect.y0 + 220);
  }

  if (tier >= 4) {
    const glow = ctx.createRadialGradient(rect.x0 + 64, rect.y0 + 226, 2, rect.x0 + 64, rect.y0 + 226, 38);
    glow.addColorStop(0, `${theme.accent}40`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x0 + 20, rect.y0 + 184, 88, 88);
  }
};

export const drawAquariumHall = (
  ctx: CanvasRenderingContext2D,
  area: AquariumArea,
  time: number,
) => {
  const index = areaIndex(area.id);
  const theme = THEMES[index] ?? THEMES[0];
  const { rect } = area;
  const w = rect.x1 - rect.x0;

  // 背景ベース。エリアごとのテーマ色でまず世界を切り替える。
  const wall = ctx.createLinearGradient(0, rect.y0, 0, rect.y0 + 205);
  wall.addColorStop(0, theme.wallTop);
  wall.addColorStop(1, theme.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(rect.x0, rect.y0, w, 205);

  drawCeiling(ctx, rect, theme, time, index);
  drawHeader(ctx, rect, theme, index);
  drawDistantHabitat(ctx, rect, theme, time, index);
  drawPerspectiveFloor(ctx, rect, theme, index);
  drawAmenities(ctx, rect, theme, index);
  drawLandmarkFrame(ctx, rect, theme, index, time);
  drawForeground(ctx, rect, theme, index);

  // 展示の光が床へ落ちる。3つを等間隔にはせず、実際の曲線配置に合わせる。
  const mirrored = index % 2 === 1;
  const points = mirrored
    ? [
        { x: rect.x0 + 278, y: rect.y0 + 286 },
        { x: rect.x0 + 190, y: rect.y0 + 330 },
        { x: rect.x0 + 82, y: rect.y0 + 258 },
      ]
    : [
        { x: rect.x0 + 82, y: rect.y0 + 286 },
        { x: rect.x0 + 176, y: rect.y0 + 330 },
        { x: rect.x0 + 278, y: rect.y0 + 258 },
      ];

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const radius = i === 2 ? 55 : 40;
    const glow = ctx.createRadialGradient(p.x, p.y + 18, 2, p.x, p.y + 18, radius);
    glow.addColorStop(0, theme.warm ? "rgba(255,248,208,0.18)" : `${theme.accent}27`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - radius, p.y - 5, radius * 2, 68);
  }

  ctx.textAlign = "center";
};
