import { aquariumDoorways, type AquariumSide } from "./aquariumLayout";

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
  /** 大窓の奥（水と景色）の色 */
  waterTop: string;
  waterBottom: string;
  /** 通路の床 */
  floorTop: string;
  floorBottom: string;
  accent: string;
  light: string;
  /** 淡水館は明るい昼の照明、海水館は暗い青の照明 */
  warm?: boolean;
};

/*
 * 18地域。淡水館は明るく緑がかった昼の館内、
 * 海水館は暗くして水槽の青を主役にする。
 * 隣り合う地域どうしで色が必ずずれるように選んである。
 */
const THEMES: Theme[] = [
  { name: "日本の淡水・里川", chapter: "FRESH WATER · JAPAN", mood: "satoyama", waterTop: "#eaf3e2", waterBottom: "#8fc7a6", floorTop: "#d3c6ad", floorBottom: "#8b8874", accent: "#4f9179", light: "#effff7", warm: true },
  { name: "日本の清流", chapter: "FRESH WATER · JAPAN", mood: "mountain", waterTop: "#e4f2f2", waterBottom: "#6fb3ba", floorTop: "#c2cdc7", floorBottom: "#71898a", accent: "#5daea6", light: "#eaffff", warm: true },
  { name: "東アジアの大河", chapter: "FRESH WATER · EAST ASIA", mood: "great-river", waterTop: "#eee5c6", waterBottom: "#8a9673", floorTop: "#c8bd9d", floorBottom: "#726f5c", accent: "#a3ad72", light: "#fff4d5", warm: true },
  { name: "メコン川", chapter: "FRESH WATER · MEKONG", mood: "mekong", waterTop: "#dcd8a6", waterBottom: "#5f7449", floorTop: "#ab9c74", floorBottom: "#5c5741", accent: "#a8bc6b", light: "#f3f8ca", warm: true },
  { name: "東南アジア 水没森林", chapter: "FRESH WATER · FLOODED FOREST", mood: "flooded", waterTop: "#4c8267", waterBottom: "#123128", floorTop: "#5b6c58", floorBottom: "#243830", accent: "#7ad089", light: "#dcf8d4" },
  { name: "アフリカの湖と川", chapter: "FRESH WATER · AFRICA", mood: "africa", waterTop: "#f0dda3", waterBottom: "#8a7245", floorTop: "#c0a374", floorBottom: "#6a5a3e", accent: "#f0c25f", light: "#fff1bd", warm: true },
  { name: "アマゾン熱帯雨林", chapter: "FRESH WATER · AMAZON", mood: "amazon", waterTop: "#3c8a63", waterBottom: "#0d3227", floorTop: "#4e6b57", floorBottom: "#1d332a", accent: "#63d489", light: "#c4ffda" },
  { name: "アマゾン大河", chapter: "FRESH WATER · GRAND FINALE", mood: "amazon-giant", waterTop: "#2b6f60", waterBottom: "#07231f", floorTop: "#3d5d51", floorBottom: "#152825", accent: "#5fd8b0", light: "#caffef" },
  { name: "日本の海", chapter: "OCEAN · JAPAN", mood: "japan-sea", waterTop: "#2b8fbe", waterBottom: "#062a44", floorTop: "#33555f", floorBottom: "#0f2630", accent: "#67d0ea", light: "#d9faff" },
  { name: "北の海", chapter: "OCEAN · COLD WATER", mood: "cold-sea", waterTop: "#8fc4d9", waterBottom: "#1d3d55", floorTop: "#4a6673", floorBottom: "#1d313c", accent: "#b6e8f8", light: "#effcff" },
  { name: "沖縄 サンゴ礁", chapter: "OCEAN · OKINAWA", mood: "reef", waterTop: "#5fe4de", waterBottom: "#0a6a80", floorTop: "#63968f", floorBottom: "#1f4c53", accent: "#a7fff0", light: "#edfff8" },
  { name: "カリフォルニア ケルプの森", chapter: "OCEAN · KELP FOREST", mood: "kelp", waterTop: "#3f8e75", waterBottom: "#0f3a3a", floorTop: "#436b60", floorBottom: "#1b3b39", accent: "#8fdc9a", light: "#e9fbd8" },
  { name: "東南アジアの海", chapter: "OCEAN · SOUTH EAST ASIA", mood: "tropical-sea", waterTop: "#2fb6c4", waterBottom: "#07515f", floorTop: "#3d6f75", floorBottom: "#153a41", accent: "#8ff0f7", light: "#e7ffff" },
  { name: "グレートリーフ", chapter: "OCEAN · AUSTRALIA", mood: "great-reef", waterTop: "#4fd7d0", waterBottom: "#065f6e", floorTop: "#4d8481", floorBottom: "#17444a", accent: "#a2fff0", light: "#f3fff9" },
  { name: "インド洋", chapter: "OCEAN · INDIAN OCEAN", mood: "indian", waterTop: "#2f7fbe", waterBottom: "#062843", floorTop: "#365a6d", floorBottom: "#122733", accent: "#7fc4ff", light: "#e6faff" },
  { name: "外洋", chapter: "OCEAN · OPEN OCEAN", mood: "open-ocean", waterTop: "#1c6ba8", waterBottom: "#031c33", floorTop: "#274b5e", floorBottom: "#0b1d2a", accent: "#67c8ff", light: "#e4f9ff" },
  { name: "深海", chapter: "OCEAN · DEEP SEA", mood: "deep-sea", waterTop: "#101c3c", waterBottom: "#02040f", floorTop: "#151d33", floorBottom: "#05070f", accent: "#8f8cff", light: "#d5dbff" },
  { name: "世界の大海", chapter: "WORLD OCEAN · GRAND FINALE", mood: "world-ocean", waterTop: "#31b5da", waterBottom: "#032b46", floorTop: "#2d5d70", floorBottom: "#0b2531", accent: "#8df2ff", light: "#edffff" },
];

const REGION_NOTES = [
  "小川・田んぼ・里川",
  "岩・瀬・山の水",
  "広い川と砂州",
  "濁流と水辺の森",
  "木々の下を泳ぐ",
  "岩湖と葦の岸辺",
  "密林と水中の根",
  "大河の巨大魚",
  "岩礁と銀色の群れ",
  "流氷の下の海",
  "白砂と光るサンゴ",
  "海藻の塔を抜ける",
  "マングローブから礁へ",
  "巨大なサンゴの庭",
  "環礁と青い落ち込み",
  "水平線のない青",
  "暗闇・熱水・発光",
  "世界の海がひとつになる",
];

/** 大窓の上下。ここが「巨大水槽をのぞいている」帯になる */
const WINDOW_TOP = 26;
const WINDOW_BOTTOM = 205;
/** 通路の床が始まる高さ */
const FLOOR_TOP = 205;

const areaIndex = (id: string) => {
  const match = id.match(/area-(\d+)/);
  return match ? Number(match[1]) : 0;
};

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const leaf = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** 大窓の奥をゆっくり横切る魚影。館内をのぞくたびに何かが動いている状態にする */
const fishShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
  facing = 1,
  color = "#d8f9ff",
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12 * scale, 4.6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10 * scale, 0);
  ctx.lineTo(-18 * scale, -6 * scale);
  ctx.lineTo(-18 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();
  // 背びれ。小さくても「魚」と読めるようにする
  ctx.beginPath();
  ctx.moveTo(-1 * scale, -4 * scale);
  ctx.lineTo(2 * scale, -9 * scale);
  ctx.lineTo(6 * scale, -3.4 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/**
 * 帯のなかを端から端へ回遊する影。time で位置が動くので、
 * 立ち止まっていても館内が生きて見える。
 */
const cruisingShadow = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  time: number,
  speed: number,
  scale: number,
  alpha: number,
  color: string,
  phase = 0,
) => {
  const span = x1 - x0 + 120;
  const t = ((time * speed + phase) % 1 + 1) % 1;
  const dir = speed >= 0 ? 1 : -1;
  const x = dir > 0 ? x0 - 60 + span * t : x1 + 60 - span * t;
  fishShadow(ctx, x, y + Math.sin(time * 0.9 + phase * 6) * 5, scale, alpha, dir, color);
};

const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rot = 0) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
};

const drawCoral = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - scale, y - 12 * scale);
  ctx.lineTo(x - 7 * scale, y - 19 * scale);
  ctx.moveTo(x - scale, y - 12 * scale);
  ctx.lineTo(x + 7 * scale, y - 21 * scale);
  ctx.moveTo(x + 2 * scale, y - 8 * scale);
  ctx.lineTo(x + 10 * scale, y - 13 * scale);
  ctx.stroke();
};

/**
 * 水面ごしの光の網。水族館の「らしさ」はこれが一番効くので、
 * 大窓の奥にも、通路の床にも同じ模様を落とす。
 */
const drawCaustics = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  time: number,
  alpha: number,
  color: string,
  rows = 5,
) => {
  const h = y1 - y0;
  if (h <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass += 1) {
    const skew = pass === 0 ? 26 : -22;
    ctx.lineWidth = pass === 0 ? 3.2 : 2.2;
    for (let i = 0; i < rows; i += 1) {
      const base = y0 + ((i + 0.5) / rows) * h;
      const drift = Math.sin(time * 0.5 + i * 1.7 + pass * 2.1) * 9;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 22) {
        const t = (x - x0) / Math.max(1, x1 - x0);
        const y =
          base +
          drift +
          skew * (t - 0.5) +
          Math.sin(x * 0.052 + time * 0.9 + i * 2.3 + pass) * 7;
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
};

const drawWaterRays = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  time: number,
  count = 6,
  alpha = 0.1,
) => {
  ctx.strokeStyle = `rgba(219,250,255,${alpha})`;
  for (let i = 0; i < count; i += 1) {
    ctx.lineWidth = 7 + (i % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x0 + 14 + i * ((x1 - x0 - 28) / Math.max(1, count - 1)), y0 - 5);
    ctx.lineTo(x0 - 10 + i * ((x1 - x0 + 12) / Math.max(1, count - 1)) + Math.sin(time * 0.32 + i) * 5, y1 + 7);
    ctx.stroke();
  }
};

/**
 * 天井。館内の照明そのものなので、地域が進むほど暗く落として
 * 水槽の光が主役になるようにする。
 */
const drawCeiling = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const w = rect.x1 - rect.x0;
  const bright = theme.warm === true;
  const slab = ctx.createLinearGradient(0, rect.y0, 0, rect.y0 + WINDOW_TOP);
  if (bright) {
    slab.addColorStop(0, "#3a4438");
    slab.addColorStop(1, "#54604b");
  } else if (index >= 16) {
    slab.addColorStop(0, "#04060f");
    slab.addColorStop(1, "#0b1122");
  } else {
    slab.addColorStop(0, "#04101a");
    slab.addColorStop(1, "#0b2331");
  }
  ctx.fillStyle = slab;
  ctx.fillRect(rect.x0, rect.y0, w, WINDOW_TOP);

  // 天井のレール。館内が一本につながっている感じを出す
  ctx.strokeStyle = bright ? "rgba(148,132,101,0.5)" : "rgba(73,116,132,0.4)";
  ctx.lineWidth = 2;
  for (const y of [rect.y0 + 8, rect.y0 + 19]) {
    ctx.beginPath();
    ctx.moveTo(rect.x0, y);
    ctx.lineTo(rect.x1, y);
    ctx.stroke();
  }

  // 照明が落とす光の三角。ここまでは動かないので焼き込んでおく
  for (let i = 0; i < 5; i += 1) {
    const x = rect.x0 + 36 + i * ((w - 72) / 4);
    const beam = ctx.createLinearGradient(0, rect.y0 + 20, 0, rect.y0 + 110);
    beam.addColorStop(0, bright ? "rgba(255,248,216,0.20)" : "rgba(150,235,255,0.17)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 14, rect.y0 + 20);
    ctx.lineTo(x + 14, rect.y0 + 20);
    ctx.lineTo(x + 40, rect.y0 + 116);
    ctx.lineTo(x - 40, rect.y0 + 116);
    ctx.closePath();
    ctx.fill();
  }
};

/** 照明そのもののまたたき。毎フレーム側 */
const drawCeilingLights = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, time: number) => {
  const w = rect.x1 - rect.x0;
  const bright = theme.warm === true;
  for (let i = 0; i < 5; i += 1) {
    const x = rect.x0 + 36 + i * ((w - 72) / 4);
    const glow = 0.5 + Math.abs(Math.sin(time * 0.7 + i)) * 0.22;
    ctx.fillStyle = bright ? `rgba(255,247,214,${glow})` : `rgba(126,226,255,${glow})`;
    rounded(ctx, x - 15, rect.y0 + 15, 30, 5, 2.5);
    ctx.fill();
  }
};

/** 天井から吊った地域サイン */
const drawHeader = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const w = rect.x1 - rect.x0;
  const plateW = Math.min(w - 54, 268);
  const plateY = rect.y0 + 21;
  ctx.save();
  // 吊り下げワイヤー
  ctx.strokeStyle = theme.warm ? "rgba(60,58,44,0.7)" : "rgba(126,190,206,0.45)";
  ctx.lineWidth = 1.2;
  for (const x of [cx - plateW / 2 + 22, cx + plateW / 2 - 22]) {
    ctx.beginPath();
    ctx.moveTo(x, rect.y0 + 12);
    ctx.lineTo(x, plateY + 4);
    ctx.stroke();
  }
  const plate = ctx.createLinearGradient(cx - plateW / 2, 0, cx + plateW / 2, 0);
  plate.addColorStop(0, theme.warm ? "rgba(29,45,36,0.94)" : "rgba(2,15,24,0.94)");
  plate.addColorStop(0.5, theme.warm ? "rgba(44,72,57,0.96)" : "rgba(7,40,54,0.97)");
  plate.addColorStop(1, theme.warm ? "rgba(29,45,36,0.94)" : "rgba(2,15,24,0.94)");
  ctx.fillStyle = plate;
  rounded(ctx, cx - plateW / 2, plateY, plateW, 40, 12);
  ctx.fill();
  ctx.strokeStyle = `${theme.accent}c0`;
  ctx.lineWidth = 1.5;
  rounded(ctx, cx - plateW / 2, plateY, plateW, 40, 12);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.warm ? "rgba(220,245,228,0.86)" : "rgba(179,241,247,0.88)";
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(theme.chapter, cx, plateY + 11);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,8,12,0.72)";
  ctx.lineWidth = 3;
  ctx.font = '900 16px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.strokeText(theme.name, cx, plateY + 27);
  ctx.fillStyle = "#f7ffff";
  ctx.fillText(theme.name, cx, plateY + 27);
  ctx.fillStyle = theme.warm ? "rgba(228,245,229,0.7)" : "rgba(222,250,255,0.7)";
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(REGION_NOTES[index] ?? "世界の水辺", cx, plateY + 36);
  ctx.restore();
};

/**
 * 開けた海の中層。サンゴや岩が下にしか無い地域は、
 * これを足さないと窓の真ん中がただの塗りになってしまう。
 */
const drawOpenWater = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  time: number,
  tint: string,
) => {
  const w = x1 - x0;
  const h = y1 - y0;
  // 奥ほど青が濃くなる霞
  const haze = ctx.createLinearGradient(0, y0, 0, y1);
  haze.addColorStop(0, "rgba(255,255,255,0.09)");
  haze.addColorStop(0.55, "rgba(255,255,255,0)");
  haze.addColorStop(1, "rgba(2,20,36,0.34)");
  ctx.fillStyle = haze;
  ctx.fillRect(x0, y0, w, h);
  // 漂うプランクトン。止まって見える水面をなくす
  for (let i = 0; i < 26; i += 1) {
    const px = x0 + ((i * 53) % w);
    const drift = ((time * (6 + (i % 4) * 3) + i * 17) % (h + 20)) - 10;
    const py = y1 - drift;
    ctx.fillStyle = `rgba(238,252,255,${0.1 + (i % 3) * 0.06})`;
    ctx.beginPath();
    ctx.arc(px + Math.sin(time * 0.6 + i) * 4, py, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  void tint;
};

/** サンゴ礁の塔。中層まで立ち上がって、礁の立体感を出す */
const drawCoralTower = (
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  height: number,
  colors: string[],
) => {
  ctx.fillStyle = "rgba(46,92,96,0.5)";
  ctx.beginPath();
  ctx.moveTo(x - 17, base);
  ctx.quadraticCurveTo(x - 11, base - height * 0.7, x - 4, base - height);
  ctx.lineTo(x + 6, base - height * 0.94);
  ctx.quadraticCurveTo(x + 13, base - height * 0.5, x + 18, base);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    drawCoral(ctx, x - 12 + i * 6, base - height * (0.18 + i * 0.16), 0.6 + (i % 3) * 0.12, colors[i % colors.length]);
  }
};

/** 地域ごとの奥景色。大窓の内側にだけ描く */
const drawHabitatScene = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  theme: Theme,
  time: number,
) => {
  const w = x1 - x0;
  switch (theme.mood) {
    case "satoyama": {
      ctx.fillStyle = "rgba(97,137,90,0.76)";
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 + 74);
      ctx.bezierCurveTo(x0 + 65, y0 + 34, x0 + 118, y0 + 81, x0 + 176, y0 + 50);
      ctx.bezierCurveTo(x0 + 245, y0 + 22, x0 + 310, y0 + 80, x1 + 8, y0 + 52);
      ctx.lineTo(x1 + 8, y1 + 8);
      ctx.lineTo(x0 - 8, y1 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(166,217,207,0.78)";
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 + 100);
      ctx.bezierCurveTo(x0 + 80, y0 + 77, x0 + 140, y0 + 117, x0 + 200, y0 + 95);
      ctx.bezierCurveTo(x0 + 270, y0 + 75, x0 + 312, y0 + 113, x1 + 8, y0 + 95);
      ctx.lineTo(x1 + 8, y1 + 8);
      ctx.lineTo(x0 - 8, y1 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(94,86,63,0.58)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 18 + i * 51;
        ctx.beginPath();
        ctx.moveTo(x, y0 + 100);
        ctx.lineTo(x + (i % 2 ? 5 : -3), y0 + 60);
        ctx.stroke();
        leaf(ctx, x - 4, y0 + 61, 12, 5, -0.25, "#648d59");
        leaf(ctx, x + 7, y0 + 53, 12, 5, 0.3, "#78a464");
      }
      // 田んぼの水面
      ctx.fillStyle = "rgba(231,221,184,0.6)";
      for (let i = 0; i < 6; i += 1) ctx.fillRect(x0 + 16 + i * 62, y0 + 104 + (i % 2) * 4, 44, 2.5);
      break;
    }
    case "mountain": {
      ctx.fillStyle = "rgba(76,110,106,0.86)";
      ctx.beginPath();
      ctx.moveTo(x0 - 10, y0 + 86);
      ctx.lineTo(x0 + 58, y0 + 26);
      ctx.lineTo(x0 + 112, y0 + 76);
      ctx.lineTo(x0 + 188, y0 + 10);
      ctx.lineTo(x0 + 252, y0 + 72);
      ctx.lineTo(x0 + 322, y0 + 24);
      ctx.lineTo(x1 + 10, y0 + 82);
      ctx.lineTo(x1 + 10, y1 + 8);
      ctx.lineTo(x0 - 10, y1 + 8);
      ctx.closePath();
      ctx.fill();
      // 雪の峰
      ctx.fillStyle = "rgba(238,250,250,0.7)";
      for (const [px, py] of [[58, 26], [188, 10], [322, 24]] as const) {
        ctx.beginPath();
        ctx.moveTo(x0 + px - 15, y0 + py + 15);
        ctx.lineTo(x0 + px, y0 + py);
        ctx.lineTo(x0 + px + 15, y0 + py + 15);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(224,250,246,0.78)";
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(x0 + 20, y0 + 100);
      ctx.bezierCurveTo(x0 + 104, y0 + 74, x0 + 160, y0 + 124, x0 + 240, y0 + 90);
      ctx.bezierCurveTo(x0 + 300, y0 + 66, x0 + 340, y0 + 104, x1 + 12, y0 + 85);
      ctx.stroke();
      ctx.fillStyle = "rgba(218,232,229,0.56)";
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 24 + i * 52, y0 + 118, 22, 7, i * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "great-river": {
      ctx.fillStyle = "rgba(94,116,82,0.7)";
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 54);
      ctx.bezierCurveTo(x0 + 90, y0 + 32, x0 + 150, y0 + 68, x0 + 220, y0 + 44);
      ctx.bezierCurveTo(x0 + 290, y0 + 24, x0 + 340, y0 + 60, x1, y0 + 42);
      ctx.lineTo(x1, y0 + 78);
      ctx.lineTo(x0, y0 + 78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(151,194,177,0.74)";
      ctx.fillRect(x0, y0 + 70, w, 66);
      ctx.fillStyle = "rgba(211,196,142,0.62)";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 68 + i * 88, y0 + 100 - (i % 2) * 9, 36, 8, -0.08 + i * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(78,83,57,0.7)";
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 6; i += 1) {
        const x = x0 + 24 + i * 68;
        ctx.beginPath();
        ctx.moveTo(x, y0 + 76);
        ctx.quadraticCurveTo(x - 4, y0 + 52, x + 3, y0 + 42);
        ctx.stroke();
        leaf(ctx, x - 7, y0 + 46, 15, 4, -0.5, "rgba(92,124,70,0.8)");
      }
      break;
    }
    case "mekong": {
      ctx.fillStyle = "rgba(142,126,78,0.3)";
      ctx.fillRect(x0, y0 + 66, w, 74);
      for (let i = 0; i < 9; i += 1) {
        const x = x0 + 12 + i * (w / 8);
        ctx.strokeStyle = "rgba(74,86,53,0.84)";
        ctx.lineWidth = 4 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y0 - 4);
        ctx.bezierCurveTo(x + 15, y0 + 34, x - 12, y0 + 80, x + 3, y1 + 6);
        ctx.stroke();
      }
      for (let i = 0; i < 14; i += 1) leaf(ctx, x0 + 8 + (i * 37) % w, y0 + 18 + (i * 23) % 100, 13, 5, (i % 5) * 0.32, "#7a9562");
      // 川の上の桟橋
      ctx.fillStyle = "rgba(74,65,43,0.6)";
      ctx.fillRect(x0 + 272, y0 + 40, 60, 4.5);
      ctx.fillRect(x0 + 280, y0 + 44, 3, 30);
      ctx.fillRect(x0 + 322, y0 + 44, 3, 30);
      break;
    }
    case "flooded": {
      ctx.fillStyle = "rgba(11,45,35,0.24)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      for (let i = 0; i < 10; i += 1) {
        const x = x0 + 8 + i * (w / 9);
        ctx.strokeStyle = i % 2 ? "rgba(54,63,43,0.94)" : "rgba(70,74,48,0.86)";
        ctx.lineWidth = 7 + (i % 3) * 2;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 8);
        ctx.bezierCurveTo(x + 18, y0 + 48, x - 16, y0 + 92, x + 4, y1 + 12);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i += 1) {
        const x = x0 + 22 + i * 46;
        ctx.strokeStyle = "rgba(63,54,37,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 4);
        ctx.quadraticCurveTo(x + 18, y1 - 26, x + 30, y1 - 44);
        ctx.stroke();
      }
      break;
    }
    case "africa": {
      ctx.fillStyle = "rgba(196,173,111,0.3)";
      ctx.fillRect(x0, y0 + 78, w, 62);
      for (let i = 0; i < 8; i += 1) drawRock(ctx, x0 + 18 + i * 53, y0 + 108 - (i % 3) * 5, 33, 12, i % 2 ? "rgba(93,75,54,0.74)" : "rgba(119,92,61,0.72)", i * 0.05);
      ctx.strokeStyle = "rgba(82,102,66,0.72)";
      ctx.lineWidth = 2.3;
      for (let i = 0; i < 14; i += 1) {
        const x = x0 + 8 + i * 29;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 4);
        ctx.quadraticCurveTo(x + (i % 2 ? 4 : -4), y1 - 22, x + 2, y1 - 40 - (i % 4) * 3);
        ctx.stroke();
      }
      // 遠くの丘
      ctx.fillStyle = "rgba(76,77,54,0.5)";
      ctx.beginPath();
      ctx.moveTo(x0 + 236, y0 + 62);
      ctx.lineTo(x0 + 266, y0 + 24);
      ctx.lineTo(x0 + 296, y0 + 62);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "amazon": {
      ctx.fillStyle = "rgba(19,60,43,0.3)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      for (let i = 0; i < 12; i += 1) {
        const x = x0 + 6 + i * (w / 11);
        ctx.strokeStyle = i % 2 ? "rgba(51,77,48,0.96)" : "rgba(67,91,51,0.9)";
        ctx.lineWidth = 5 + (i % 3) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 9);
        ctx.bezierCurveTo(x + 17, y0 + 34, x - 16, y0 + 86, x + 3, y1 + 10);
        ctx.stroke();
      }
      for (let i = 0; i < 22; i += 1) leaf(ctx, x0 + 7 + (i * 31) % w, y0 + 13 + (i * 19) % 100, 13, 5.5, (i % 6) * 0.28, i % 2 ? "#4a8b5f" : "#36784f");
      break;
    }
    case "amazon-giant": {
      ctx.fillStyle = "rgba(9,43,35,0.32)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      ctx.strokeStyle = "rgba(50,62,39,0.94)";
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(x0 + 26, y0 - 8);
      ctx.bezierCurveTo(x0 + 95, y0 + 42, x0 + 102, y0 + 96, x0 + 72, y1 + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 - 28, y0 - 7);
      ctx.bezierCurveTo(x1 - 96, y0 + 36, x1 - 106, y0 + 86, x1 - 75, y1 + 8);
      ctx.stroke();
      for (let i = 0; i < 16; i += 1) leaf(ctx, x0 + 18 + (i * 41) % w, y0 + 15 + (i * 27) % 96, 16, 6, (i % 5) * 0.3, "#4d8f63");
      break;
    }
    case "japan-sea": {
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      // 岩礁の柱
      ctx.fillStyle = "rgba(52,72,76,0.62)";
      for (const [px, top] of [[62, 44], [212, 62], [316, 34]] as const) {
        ctx.beginPath();
        ctx.moveTo(x0 + px - 26, y1);
        ctx.quadraticCurveTo(x0 + px - 14, y0 + top + 30, x0 + px - 4, y0 + top);
        ctx.lineTo(x0 + px + 10, y0 + top + 8);
        ctx.quadraticCurveTo(x0 + px + 20, y0 + top + 46, x0 + px + 28, y1);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 9; i += 1) drawRock(ctx, x0 + 12 + i * 48, y1 - 6 - (i % 3) * 6, 29, 14, i % 2 ? "rgba(64,81,82,0.82)" : "rgba(87,100,93,0.76)", -0.2 + i * 0.04);
      ctx.strokeStyle = "rgba(66,106,89,0.65)";
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 32 + i * 52;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.bezierCurveTo(x + 8, y1 - 24, x - 6, y1 - 44, x + 4, y1 - 62);
        ctx.stroke();
      }
      break;
    }
    case "cold-sea": {
      // 流氷
      ctx.fillStyle = "rgba(221,245,250,0.24)";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 88, y0);
      ctx.lineTo(x0 + 115, y0 + 21);
      ctx.lineTo(x0 + 188, y0 + 8);
      ctx.lineTo(x0 + 246, y0 + 24);
      ctx.lineTo(x0 + 318, y0 + 5);
      ctx.lineTo(x1, y0 + 14);
      ctx.lineTo(x1, y0);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 8; i += 1) drawRock(ctx, x0 + 17 + i * 55, y1 - 5 - (i % 3) * 5, 32, 15, i % 2 ? "rgba(66,83,91,0.82)" : "rgba(91,105,108,0.72)", i * 0.04);
      ctx.fillStyle = "rgba(226,247,252,0.52)";
      for (let i = 0; i < 13; i += 1) {
        ctx.beginPath();
        ctx.arc(x0 + 20 + (i * 37) % w, y0 + 30 + (i * 17) % 96, 1 + (i % 3) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "reef": {
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      const colors = ["#ef897c", "#ebcb66", "#a782db", "#61c7ad"];
      drawCoralTower(ctx, x0 + 58, y1, 96, colors);
      drawCoralTower(ctx, x0 + 246, y1, 74, colors);
      ctx.fillStyle = "rgba(243,234,196,0.6)";
      ctx.fillRect(x0, y1 - 22, w, 26);
      for (let i = 0; i < 16; i += 1) drawCoral(ctx, x0 + 10 + i * 25, y1 + 2, 0.95 + (i % 3) * 0.18, colors[i % colors.length]);
      // 白砂の起伏
      ctx.fillStyle = "rgba(255,250,226,0.24)";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 54 + i * 88, y1 - 30, 40, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "kelp": {
      for (let i = 0; i < 12; i += 1) {
        const x = x0 + 9 + i * 34;
        ctx.strokeStyle = i % 2 ? "rgba(61,121,75,0.88)" : "rgba(78,145,83,0.8)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 5);
        ctx.bezierCurveTo(x + 17 + Math.sin(time * 0.5 + i) * 5, y0 + 96, x - 13, y0 + 48, x + 4, y0 - 4);
        ctx.stroke();
        for (let j = 0; j < 4; j += 1) leaf(ctx, x + (j % 2 ? 6 : -5), y0 + 26 + j * 30, 6, 17, j % 2 ? 0.35 : -0.35, "rgba(80,137,78,0.82)");
      }
      break;
    }
    case "tropical-sea": {
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      ctx.strokeStyle = "rgba(71,84,58,0.78)";
      ctx.lineWidth = 5;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 28 + i * 56;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 5);
        ctx.bezierCurveTo(x + 15, y0 + 36, x - 11, y0 + 80, x + 3, y0 + 106);
        ctx.stroke();
      }
      const colors = ["#df8379", "#e6c56b", "#9f80cf"];
      for (let i = 0; i < 11; i += 1) drawCoral(ctx, x0 + 18 + i * 36, y1 + 3, 0.9 + (i % 2) * 0.2, colors[i % colors.length]);
      break;
    }
    case "great-reef": {
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      const colors = ["#ee7b74", "#e9c756", "#9b77d6", "#61c9b1", "#df91bd"];
      // サンゴの塔を三本立てて、礁の庭を中層まで持ち上げる
      drawCoralTower(ctx, x0 + 46, y1, 118, colors);
      drawCoralTower(ctx, x0 + 168, y1, 82, colors);
      drawCoralTower(ctx, x0 + 292, y1, 104, colors);
      ctx.fillStyle = "rgba(243,236,200,0.46)";
      ctx.fillRect(x0, y1 - 20, w, 24);
      for (let i = 0; i < 19; i += 1) drawCoral(ctx, x0 + 6 + i * 22, y1 + 4, 1.05 + (i % 4) * 0.16, colors[i % colors.length]);
      // テーブルサンゴ
      ctx.fillStyle = "rgba(88,181,169,0.34)";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 52 + i * 76, y1 - 44 - (i % 2) * 10, 30, 8, -0.08 + i * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "indian": {
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      // 環礁のドロップオフ
      ctx.fillStyle = "rgba(80,147,143,0.36)";
      ctx.beginPath();
      ctx.moveTo(x0, y1 - 38);
      ctx.bezierCurveTo(x0 + 85, y1 - 56, x0 + 135, y1 - 16, x0 + 212, y1 - 42);
      ctx.bezierCurveTo(x0 + 285, y1 - 62, x0 + 335, y1 - 24, x1, y1 - 48);
      ctx.lineTo(x1, y1 + 4);
      ctx.lineTo(x0, y1 + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(4,47,65,0.34)";
      ctx.beginPath();
      ctx.moveTo(x0 + 255, y0 + 54);
      ctx.lineTo(x1 + 5, y0 + 34);
      ctx.lineTo(x1 + 5, y1 + 5);
      ctx.lineTo(x0 + 288, y1 + 5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "open-ocean": {
      const deep = ctx.createLinearGradient(0, y0, 0, y1);
      deep.addColorStop(0, "rgba(32,128,159,0.2)");
      deep.addColorStop(1, "rgba(2,20,40,0.55)");
      ctx.fillStyle = deep;
      ctx.fillRect(x0, y0, w, y1 - y0);
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      // 外洋は「渦を巻く大群」そのものが景色になる
      for (let ring = 0; ring < 3; ring += 1) {
        const rx = 58 + ring * 34;
        const ry = 22 + ring * 13;
        const cxr = (x0 + x1) / 2;
        const cyr = y0 + (y1 - y0) * 0.5;
        for (let i = 0; i < 10 + ring * 4; i += 1) {
          const a = (i / (10 + ring * 4)) * Math.PI * 2 + time * (0.16 - ring * 0.03);
          fishShadow(
            ctx,
            cxr + Math.cos(a) * rx,
            cyr + Math.sin(a) * ry,
            0.3 + ring * 0.05,
            0.13,
            Math.cos(a) >= 0 ? -1 : 1,
            "#dff8ff",
          );
        }
      }
      break;
    }
    case "deep-sea": {
      ctx.fillStyle = "rgba(1,5,17,0.42)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      ctx.fillStyle = "rgba(37,39,66,0.82)";
      ctx.beginPath();
      ctx.moveTo(x0, y1 - 5);
      ctx.lineTo(x0 + 48, y1 - 40);
      ctx.lineTo(x0 + 102, y1 - 12);
      ctx.lineTo(x0 + 148, y1 - 54);
      ctx.lineTo(x0 + 212, y1 - 20);
      ctx.lineTo(x0 + 280, y1 - 48);
      ctx.lineTo(x1, y1 - 14);
      ctx.lineTo(x1, y1 + 4);
      ctx.lineTo(x0, y1 + 4);
      ctx.closePath();
      ctx.fill();
      // 熱水噴出孔
      for (let i = 0; i < 3; i += 1) {
        const vx = x0 + 95 + i * 88;
        ctx.strokeStyle = "rgba(61,71,84,0.9)";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(vx, y1 - 8);
        ctx.lineTo(vx + (i - 1) * 7, y1 - 48 - i * 5);
        ctx.stroke();
        const plume = 0.12 + Math.abs(Math.sin(time * 0.6 + i)) * 0.14;
        ctx.fillStyle = `rgba(183,218,220,${plume})`;
        for (let j = 0; j < 5; j += 1) {
          ctx.beginPath();
          ctx.arc(vx + Math.sin(time + j) * 6, y1 - 56 - j * 13, 5 + j * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 発光する粒
      for (let i = 0; i < 30; i += 1) {
        const pulse = 0.18 + Math.abs(Math.sin(time * 0.8 + i)) * 0.5;
        ctx.fillStyle = `rgba(102,229,221,${pulse})`;
        ctx.beginPath();
        ctx.arc(x0 + 12 + (i * 47) % (w - 24), y0 + 11 + (i * 31) % 108, 0.8 + (i % 3) * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "world-ocean": {
      const grand = ctx.createLinearGradient(0, y0, 0, y1);
      grand.addColorStop(0, "rgba(61,180,205,0.24)");
      grand.addColorStop(1, "rgba(2,28,46,0.55)");
      ctx.fillStyle = grand;
      ctx.fillRect(x0, y0, w, y1 - y0);
      drawOpenWater(ctx, x0, x1, y0, y1, time, theme.light);
      // 中央アリーナのドーム
      ctx.strokeStyle = "rgba(157,233,243,0.26)";
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc((x0 + x1) / 2, y1 + 10, 92 + i * 36, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
      }
      // これまでの旅を象徴する、大小さまざまな影
      for (let i = 0; i < 12; i += 1) {
        const a = i * 0.53 + time * 0.1;
        fishShadow(
          ctx,
          (x0 + x1) / 2 + Math.cos(a) * (60 + i * 8),
          y0 + (y1 - y0) * 0.48 + Math.sin(a) * 42,
          0.3 + (i % 4) * 0.12,
          0.14,
          Math.cos(a) >= 0 ? -1 : 1,
          "#e6fbff",
        );
      }
      break;
    }
  }
};

/** 大窓の内側の座標 */
const windowRect = (rect: AquariumArea["rect"]) => ({
  x0: rect.x0 + 12,
  x1: rect.x1 - 12,
  y0: rect.y0 + WINDOW_TOP + 4,
  y1: rect.y0 + WINDOW_BOTTOM,
});

/**
 * 展示室の主役になる大窓のうち、動かない部分。
 * 奥景色と枠だけを描き、光の網と回遊する影は毎フレーム側で重ねる。
 */
const drawGreatWindow = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
) => {
  const { x0, x1, y0, y1 } = windowRect(rect);
  const w = x1 - x0;

  const water = ctx.createLinearGradient(0, y0, 0, y1);
  water.addColorStop(0, theme.waterTop);
  water.addColorStop(1, theme.waterBottom);
  ctx.fillStyle = water;
  rounded(ctx, x0, y0, w, y1 - y0, 22);
  ctx.fill();

  ctx.save();
  rounded(ctx, x0, y0, w, y1 - y0, 22);
  ctx.clip();
  drawHabitatScene(ctx, x0, x1, y0, y1, theme, 0);
  // 水面から差す光。淡水館は白っぽく、海水館は青く。
  drawWaterRays(ctx, x0, x1, y0, y1, 0, theme.warm ? 5 : 7, theme.warm ? 0.09 : 0.13);
  ctx.restore();

  // ガラスと枠。厚みのある設備として見せる。
  // 縦の方立てを入れると、ただの塗りではなく「大水槽の壁」に見える。
  ctx.strokeStyle = theme.warm ? "rgba(74,86,70,0.5)" : "rgba(14,42,55,0.62)";
  ctx.lineWidth = 6;
  for (let i = 1; i < 3; i += 1) {
    const mx = x0 + (w / 3) * i;
    ctx.beginPath();
    ctx.moveTo(mx, y0 + 2);
    ctx.lineTo(mx, y1 - 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1.4;
  for (let i = 1; i < 3; i += 1) {
    const mx = x0 + (w / 3) * i - 2.4;
    ctx.beginPath();
    ctx.moveTo(mx, y0 + 2);
    ctx.lineTo(mx, y1 - 2);
    ctx.stroke();
  }
  ctx.strokeStyle = theme.warm ? "rgba(90,104,86,0.6)" : "rgba(20,52,66,0.75)";
  ctx.lineWidth = 5;
  rounded(ctx, x0, y0, w, y1 - y0, 22);
  ctx.stroke();
  ctx.strokeStyle = `${theme.accent}88`;
  ctx.lineWidth = 1.4;
  rounded(ctx, x0 + 1, y0 + 1, w - 2, y1 - y0 - 2, 21);
  ctx.stroke();
};

/** ガラスの反射。魚より手前に来る一筋 */
const drawGlassSheen = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"]) => {
  const { x0, y0, y1 } = windowRect(rect);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x0 + 34, y0 + 12);
  ctx.lineTo(x0 + 12, y1 - 26);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 56, y0 + 12);
  ctx.lineTo(x0 + 34, y1 - 26);
  ctx.stroke();
};

/**
 * 大窓のなかで動くもの。光の網と、奥を横切る生きもの。
 * 止まって見える水槽にしないための層なので、毎フレーム描く。
 */
const drawWindowMotion = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
  time: number,
) => {
  const { x0, x1, y0, y1 } = windowRect(rect);
  ctx.save();
  // 角の丸みは枠の線が隠すので、切り抜きは矩形で足りる（丸角クリップより軽い）
  ctx.beginPath();
  ctx.rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
  ctx.clip();
  drawCaustics(ctx, x0 - 10, y0, x1 + 10, y0 + (y1 - y0) * 0.55, time, theme.warm ? 0.13 : 0.17, theme.light, 3);

  /*
   * 奥を横切る生きもの。地域が進むほど大きく、数を減らす。
   * 「大きい魚がいる = 進んでいる」がひと目で分かるようにする。
   */
  const shade = theme.warm ? "#2c4b45" : "#dff8ff";
  const alpha = theme.warm ? 0.16 : 0.15;
  const bigness = 0.5 + index * 0.1;
  const school = index < 8 ? 6 : 5;
  for (let i = 0; i < school; i += 1) {
    cruisingShadow(
      ctx,
      x0,
      x1,
      y0 + 24 + ((i * 29) % Math.max(30, y1 - y0 - 60)),
      time,
      (i % 2 ? 0.045 : -0.036) * (1 + (i % 3) * 0.2),
      0.34 + (i % 3) * 0.1,
      alpha,
      shade,
      i * 0.17,
    );
  }
  // 主役級の一匹
  cruisingShadow(ctx, x0, x1, y0 + (y1 - y0) * 0.44, time, index % 2 ? 0.022 : -0.019, 0.85 + bigness, alpha * 1.1, shade, 0.4);
  if (index >= 10) {
    cruisingShadow(ctx, x0, x1, y0 + (y1 - y0) * 0.7, time, index % 2 ? -0.014 : 0.016, 1.1 + bigness, alpha, shade, 0.75);
  }
  ctx.restore();
  drawGlassSheen(ctx, rect);
};

/** 大窓の下の手すり。ここに来館者が並ぶと「見ている」画になる */
const drawHandrail = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme) => {
  const y = rect.y0 + WINDOW_BOTTOM + 3;
  ctx.fillStyle = theme.warm ? "rgba(86,78,58,0.75)" : "rgba(12,38,50,0.8)";
  rounded(ctx, rect.x0 + 16, y, rect.x1 - rect.x0 - 32, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = theme.warm ? "rgba(255,247,220,0.22)" : `${theme.accent}55`;
  rounded(ctx, rect.x0 + 16, y, rect.x1 - rect.x0 - 32, 1.6, 0.8);
  ctx.fill();
  ctx.strokeStyle = theme.warm ? "rgba(86,78,58,0.55)" : "rgba(12,38,50,0.6)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const x = rect.x0 + 34 + i * ((rect.x1 - rect.x0 - 68) / 5);
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 13);
    ctx.stroke();
  }
};

/** 来館者のシルエット。展示を見ている姿だけを描く（ゲームの客とは別） */
const visitor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  body: string,
  head: string,
  phase: number,
) => {
  // 立ち位置だけ少しずらす。焼き込む層なので動かさない
  ctx.save();
  ctx.translate(x, y + Math.sin(phase) * 0.9 * scale);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 1.5 * scale, 5 * scale, 1.9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-3.6 * scale, 0);
  ctx.quadraticCurveTo(-4.2 * scale, -9 * scale, 0, -9 * scale);
  ctx.quadraticCurveTo(4.2 * scale, -9 * scale, 3.6 * scale, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, -11.6 * scale, 3.1 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const VISITOR_BODIES = ["#3f6f9e", "#8c4f6b", "#4d7a5c", "#8a6a3d", "#5a5480", "#a4614a"];
const VISITOR_HEADS = ["#f0d4b6", "#e6c39e", "#d8ab84", "#f4dcc4"];

/**
 * 展示を見ている人だかり。地域が進むほど混み、
 * スクリーンショット一枚で「繁盛している水族館」に見えるようにする。
 */
const drawGalleryVisitors = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  index: number,
) => {
  const w = rect.x1 - rect.x0;
  const railY = rect.y0 + WINDOW_BOTTOM + 16;
  const crowd = 4 + Math.min(6, Math.floor(index / 2));
  for (let i = 0; i < crowd; i += 1) {
    const seed = index * 13 + i * 7;
    const x = rect.x0 + 26 + ((seed * 37) % Math.max(40, w - 52));
    const y = railY + ((seed * 11) % 9);
    visitor(
      ctx,
      x,
      y,
      0.82 + ((seed * 3) % 5) * 0.06,
      VISITOR_BODIES[seed % VISITOR_BODIES.length],
      VISITOR_HEADS[seed % VISITOR_HEADS.length],
      seed,
    );
  }
  // 通路の奥にも数人。床が空き地に見えないようにする
  const strollers = 2 + Math.min(4, Math.floor(index / 4));
  for (let i = 0; i < strollers; i += 1) {
    const seed = index * 29 + i * 17;
    const x = rect.x0 + 30 + ((seed * 53) % Math.max(40, w - 60));
    const y = rect.y0 + 240 + ((seed * 19) % 26);
    visitor(
      ctx,
      x,
      y,
      0.66 + ((seed * 5) % 4) * 0.05,
      VISITOR_BODIES[(seed + 2) % VISITOR_BODIES.length],
      VISITOR_HEADS[(seed + 1) % VISITOR_HEADS.length],
      seed * 0.7,
    );
  }
};

/** 通路の床。奥から手前へ抜ける順路と、水面の照り返しを敷く */
const drawGalleryFloor = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  const w = rect.x1 - rect.x0;
  const cx = (rect.x0 + rect.x1) / 2;
  const floorTop = rect.y0 + FLOOR_TOP;
  const floor = ctx.createLinearGradient(0, floorTop, 0, rect.y1);
  floor.addColorStop(0, theme.floorTop);
  floor.addColorStop(1, theme.floorBottom);
  ctx.fillStyle = floor;
  ctx.fillRect(rect.x0, floorTop, w, rect.y1 - floorTop);

  // 大窓の光が床に落ちる。水族館の床はいつも青く濡れて見える
  const spill = ctx.createLinearGradient(0, floorTop, 0, floorTop + 96);
  spill.addColorStop(0, theme.warm ? "rgba(255,250,222,0.34)" : `${theme.accent}3a`);
  spill.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spill;
  ctx.fillRect(rect.x0, floorTop, w, 96);
  // 順路。まっすぐの線ではなく、ゆるく蛇行させて奥行きを出す
  const mirrored = index % 2 === 1;
  const startX = cx + (mirrored ? -30 : 30);
  const midX = cx + (mirrored ? 74 : -74);
  const endX = cx + (mirrored ? -30 : 30);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme.warm ? "rgba(238,230,208,0.28)" : "rgba(178,216,222,0.12)";
  ctx.lineWidth = 116;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 366, -midX + cx * 2, rect.y0 + 296, endX, rect.y0 + 222);
  ctx.stroke();
  ctx.strokeStyle = theme.warm ? "rgba(255,250,236,0.2)" : "rgba(214,242,244,0.08)";
  ctx.lineWidth = 82;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 366, -midX + cx * 2, rect.y0 + 296, endX, rect.y0 + 222);
  ctx.stroke();

  // 床のタイル目地
  ctx.strokeStyle = theme.warm ? "rgba(70,76,68,0.1)" : "rgba(190,225,230,0.055)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 49, rect.y1);
    ctx.lineTo(cx + i * 15, floorTop + 10);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const t = i / 5;
    const y = floorTop + 40 + (rect.y1 - floorTop - 40) * t * t;
    const half = 52 + 125 * t;
    ctx.beginPath();
    ctx.moveTo(cx - half, y);
    ctx.quadraticCurveTo(cx, y + 9, cx + half, y);
    ctx.stroke();
  }

  // 順路の誘導ライン
  ctx.strokeStyle = theme.warm ? "rgba(73,136,116,0.5)" : `${theme.accent}88`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 - 10);
  ctx.bezierCurveTo(midX, rect.y0 + 366, -midX + cx * 2, rect.y0 + 296, endX, rect.y0 + 230);
  ctx.stroke();
  ctx.setLineDash([]);
};

/** 地域ごとの床の作り込み。単色の床にせず、スクショだけで地域が分かる密度にする */
const drawFloorIdentity = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const floorTop = rect.y0 + FLOOR_TOP;
  const bottom = rect.y1 - 8;

  // 奥から手前へ広がる床インレイ
  ctx.save();
  ctx.globalAlpha = theme.warm ? 0.16 : 0.2;
  ctx.fillStyle = theme.accent;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 34, floorTop + 8);
    ctx.quadraticCurveTo(cx + side * 92, rect.y0 + 300, cx + side * 122, bottom);
    ctx.lineTo(cx + side * 84, bottom);
    ctx.quadraticCurveTo(cx + side * 48, rect.y0 + 298, cx + side * 12, floorTop + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  switch (theme.mood) {
    case "satoyama": {
      ctx.strokeStyle = "rgba(114,177,145,0.34)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 18, rect.y0 + 250);
      ctx.bezierCurveTo(rect.x0 + 92, rect.y0 + 274, rect.x0 + 112, rect.y0 + 360, rect.x0 + 46, bottom);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) drawRock(ctx, rect.x1 - 26 - i * 12, bottom - 8 - (i % 2) * 5, 7, 3.5, "rgba(116,106,84,0.55)", i * 0.18);
      break;
    }
    case "mountain": {
      ctx.strokeStyle = "rgba(206,240,236,0.26)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 18, rect.y0 + 248 + i * 37);
        ctx.quadraticCurveTo(cx, rect.y0 + 224 + i * 45, rect.x1 - 18, rect.y0 + 259 + i * 34);
        ctx.stroke();
      }
      break;
    }
    case "great-river":
    case "mekong": {
      ctx.fillStyle = theme.mood === "mekong" ? "rgba(130,155,91,0.18)" : "rgba(160,169,131,0.17)";
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 34, floorTop + 18);
      ctx.bezierCurveTo(rect.x0 + 124, rect.y0 + 284, rect.x1 - 104, rect.y0 + 326, rect.x1 - 32, bottom);
      ctx.lineTo(rect.x1 - 74, bottom);
      ctx.bezierCurveTo(rect.x1 - 128, rect.y0 + 330, rect.x0 + 116, rect.y0 + 294, rect.x0 + 66, floorTop + 20);
      ctx.closePath();
      ctx.fill();
      for (const x of [rect.x0 + 28, rect.x1 - 28]) {
        ctx.strokeStyle = "rgba(92,111,67,0.52)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x + i * (x < cx ? 4 : -4), bottom);
          ctx.lineTo(x + (i - 2) * (x < cx ? 7 : -7), bottom - 34 - (i % 3) * 8);
          ctx.stroke();
        }
      }
      break;
    }
    case "flooded":
    case "amazon":
    case "amazon-giant": {
      ctx.fillStyle = "rgba(27,84,61,0.22)";
      for (const x of [rect.x0 + 28, rect.x1 - 34]) {
        ctx.beginPath();
        ctx.ellipse(x, rect.y0 + 322, 36, 66, 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(91,151,94,0.44)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        const sx = rect.x0 + 18 + i * 18;
        ctx.beginPath();
        ctx.moveTo(sx, bottom);
        ctx.quadraticCurveTo(sx + 18, rect.y0 + 350, sx + 4, rect.y0 + 300);
        ctx.stroke();
      }
      break;
    }
    case "africa": {
      ctx.fillStyle = "rgba(211,178,93,0.12)";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(rect.x0 + 46 + i * 68, rect.y0 + 340 + (i % 2) * 20, 28, 13, 0.1 * i, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const x of [rect.x0 + 22, rect.x1 - 22]) {
        ctx.strokeStyle = "rgba(164,139,74,0.52)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x, bottom);
          ctx.lineTo(x + (i - 3) * 4, bottom - 32 - (i % 2) * 11);
          ctx.stroke();
        }
      }
      break;
    }
    case "japan-sea":
    case "cold-sea": {
      ctx.strokeStyle = theme.mood === "cold-sea" ? "rgba(210,244,252,0.3)" : "rgba(125,213,231,0.26)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 20, rect.y0 + 262 + i * 34);
        ctx.quadraticCurveTo(cx, rect.y0 + 246 + i * 39, rect.x1 - 20, rect.y0 + 264 + i * 34);
        ctx.stroke();
      }
      if (theme.mood === "cold-sea") {
        ctx.fillStyle = "rgba(224,248,252,0.2)";
        for (const x of [rect.x0 + 48, rect.x1 - 54]) {
          ctx.beginPath();
          ctx.moveTo(x - 30, rect.y0 + 244);
          ctx.lineTo(x - 12, rect.y0 + 223);
          ctx.lineTo(x + 28, rect.y0 + 230);
          ctx.lineTo(x + 36, rect.y0 + 252);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    case "reef":
    case "tropical-sea":
    case "great-reef": {
      const coralColors = theme.mood === "great-reef" ? ["#ff9d76", "#f4d46d", "#9ce6d8"] : ["#ee8f79", "#d8bf72", "#82d9c9"];
      for (let i = 0; i < 7; i += 1) {
        drawCoral(ctx, rect.x0 + 20 + i * 16, bottom - 4, 0.55 + (i % 3) * 0.12, coralColors[i % coralColors.length]);
        drawCoral(ctx, rect.x1 - 20 - i * 15, bottom - 8, 0.5 + (i % 2) * 0.13, coralColors[(i + 1) % coralColors.length]);
      }
      break;
    }
    case "kelp": {
      for (let i = 0; i < 9; i += 1) {
        const x = i < 5 ? rect.x0 + 18 + i * 12 : rect.x1 - 18 - (i - 5) * 13;
        const h = 54 + (i % 4) * 18;
        ctx.strokeStyle = i % 2 ? "rgba(74,132,92,0.58)" : "rgba(101,154,96,0.52)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.quadraticCurveTo(x + Math.sin(i) * 12, bottom - h * 0.5, x + Math.cos(i) * 9, bottom - h);
        ctx.stroke();
      }
      break;
    }
    case "indian":
    case "open-ocean": {
      ctx.strokeStyle = "rgba(132,218,242,0.22)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const y = rect.y0 + 244 + i * 28;
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 18, y);
        ctx.quadraticCurveTo(cx + Math.sin(i) * 40, y - 9, rect.x1 - 18, y + 3);
        ctx.stroke();
      }
      break;
    }
    case "deep-sea": {
      for (let i = 0; i < 18; i += 1) {
        const px = rect.x0 + 20 + ((i * 47) % 320);
        const py = rect.y0 + 234 + ((i * 71) % 164);
        const pulse = 0.25 + Math.abs(Math.sin(i)) * 0.3;
        ctx.fillStyle = `rgba(137,151,255,${pulse})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(100,112,179,0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 18, bottom - 14);
      ctx.lineTo(rect.x0 + 92, bottom - 55);
      ctx.lineTo(rect.x0 + 150, bottom - 34);
      ctx.lineTo(rect.x0 + 222, bottom - 72);
      ctx.lineTo(rect.x1 - 18, bottom - 22);
      ctx.stroke();
      break;
    }
    case "world-ocean": {
      ctx.strokeStyle = "rgba(132,226,245,0.34)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(cx, rect.y0 + 336, 56 + i * 29, 24 + i * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
  }
};

/**
 * 隣の展示室へつながる通路。ここを開けておかないと、
 * 18個の箱が並んでいるだけに見えてしまう。
 */
const drawDoorways = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  const sides: AquariumSide[] = aquariumDoorways(index);
  const glowColor = theme.warm ? "rgba(255,247,214," : `${theme.accent.slice(0, 7)}`;
  const pulse = 0.36;
  for (const side of sides) {
    if (side === "left" || side === "right") {
      const x = side === "left" ? rect.x0 : rect.x1;
      const dir = side === "left" ? 1 : -1;
      const y0 = rect.y0 + 250;
      const y1 = rect.y1 - 16;
      const light = ctx.createLinearGradient(x, 0, x + dir * 54, 0);
      light.addColorStop(0, theme.warm ? `rgba(255,250,226,0.4)` : `rgba(150,235,255,0.26)`);
      light.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = light;
      ctx.fillRect(Math.min(x, x + dir * 54), y0, 54, y1 - y0);
      ctx.strokeStyle = theme.warm ? "rgba(120,112,86,0.55)" : `${theme.accent}66`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + dir * 26, y0 - 10);
      ctx.stroke();
      continue;
    }
    // 上下は角の通路。順路の目印として矢印を置く
    const x = side === "top" ? rect.x0 + 64 : rect.x1 - 64;
    const y = side === "top" ? rect.y0 : rect.y1;
    const dir = side === "top" ? 1 : -1;
    const arch = ctx.createRadialGradient(x, y, 4, x, y, 74);
    arch.addColorStop(0, theme.warm ? `rgba(255,250,226,${pulse})` : `rgba(150,235,255,${pulse * 0.8})`);
    arch.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = arch;
    ctx.fillRect(x - 74, y - (dir > 0 ? 0 : 74), 148, 74);
    ctx.strokeStyle = theme.warm ? "rgba(120,112,86,0.6)" : `${theme.accent}70`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + dir * 34, 42, dir > 0 ? Math.PI : 0, dir > 0 ? Math.PI * 2 : Math.PI);
    ctx.stroke();
  }
  void glowColor;
};

const drawBench = (ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme, scale = 1) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = theme.warm ? "#735f45" : "#2f4650";
  rounded(ctx, -20, -5, 40, 8, 3);
  ctx.fill();
  ctx.fillRect(-17, 3, 4, 8);
  ctx.fillRect(13, 3, 4, 8);
  ctx.fillStyle = theme.warm ? "rgba(255,245,218,0.2)" : "rgba(210,247,255,0.12)";
  ctx.fillRect(-16, -3, 32, 1.4);
  ctx.restore();
};

const drawInfoTotem = (ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme, index: number) => {
  ctx.fillStyle = theme.warm ? "rgba(100,83,57,0.9)" : "rgba(8,27,37,0.9)";
  rounded(ctx, x - 22, y - 27, 44, 34, 7);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.font = '800 6px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(`AREA ${String(index + 1).padStart(2, "0")}`, x, y - 15);
  ctx.fillStyle = theme.warm ? "rgba(255,246,219,0.78)" : "rgba(221,250,255,0.78)";
  ctx.font = '700 5px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(REGION_NOTES[index] ?? "AQUARIUM", x, y - 5);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(x - 14, y + 2, 28, 2);
};

/** 館内設備。地域が進むほど増え、育っている実感を出す */
const drawAmenities = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const tier = index < 2 ? 1 : index < 6 ? 2 : index < 10 ? 3 : index < 14 ? 4 : 5;
  if (tier >= 2) drawBench(ctx, rect.x0 + 48, rect.y0 + 372, theme, 0.9);
  if (tier >= 3) drawBench(ctx, rect.x1 - 48, rect.y0 + 390, theme, 0.95);

  // サイン灯の柱。床にも縦の要素を置いて、平面に見えないようにする
  for (const x of [rect.x0 + 16, rect.x1 - 16]) {
    ctx.fillStyle = theme.warm ? "rgba(80,72,53,0.72)" : "rgba(8,27,36,0.72)";
    rounded(ctx, x - 4, rect.y0 + 250, 8, 68, 4);
    ctx.fill();
  }
};

/** サイン灯のあかりと、拡大しても読める案内板。毎フレーム側 */
const drawAmenityLights = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
  time: number,
) => {
  const tier = index < 2 ? 1 : index < 6 ? 2 : index < 10 ? 3 : index < 14 ? 4 : 5;
  if (tier >= 4) drawInfoTotem(ctx, rect.x0 + 56, rect.y0 + 250, theme, index);
  for (const x of [rect.x0 + 16, rect.x1 - 16]) {
    const glow = 0.4 + Math.abs(Math.sin(time * 1.4 + x * 0.01)) * 0.24;
    ctx.fillStyle = theme.warm ? `rgba(255,233,174,${glow})` : `rgba(128,232,244,${glow})`;
    ctx.beginPath();
    ctx.arc(x, rect.y0 + 246, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

const heroSpot = (rect: AquariumArea["rect"], index: number) => ({
  x: rect.x0 + (index % 2 === 1 ? 82 : 278),
  y: rect.y0 + 258,
});

/** 各地域の3番展示を照らすランドマーク灯（光だけ。焼き込み側） */
const drawLandmarkHalo = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const { x: heroX, y: heroY } = heroSpot(rect, index);
  const halo = ctx.createRadialGradient(heroX, heroY - 20, 8, heroX, heroY - 20, 84);
  halo.addColorStop(0, theme.warm ? "rgba(255,248,214,0.3)" : `${theme.accent}34`);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(heroX - 92, heroY - 110, 184, 154);
};

/** ランドマークの札。文字がぼやけないよう毎フレーム側で描く */
const drawLandmarkPlate = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number, time: number) => {
  const { x: heroX, y: heroY } = heroSpot(rect, index);
  ctx.fillStyle = theme.warm ? "rgba(44,54,42,0.94)" : "rgba(3,18,27,0.94)";
  rounded(ctx, heroX - 62, heroY - 92, 124, 24, 9);
  ctx.fill();
  ctx.strokeStyle = theme.warm ? "rgba(229,239,205,0.66)" : `${theme.accent}aa`;
  ctx.lineWidth = 1.2;
  rounded(ctx, heroX - 62, heroY - 92, 124, 24, 9);
  ctx.stroke();
  ctx.fillStyle = "#f8ffff";
  ctx.font = '900 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,8,12,0.8)";
  ctx.lineWidth = 2.5;
  const landmarkTag = index === 17 ? "★ GRAND LANDMARK" : "★ LANDMARK";
  ctx.strokeText(landmarkTag, heroX, heroY - 76);
  ctx.fillText(landmarkTag, heroX, heroY - 76);
  const pulse = 0.45 + Math.abs(Math.sin(time * 1.5)) * 0.25;
  ctx.fillStyle = theme.warm ? `rgba(255,233,162,${pulse})` : `rgba(150,235,255,${pulse})`;
  ctx.beginPath();
  ctx.arc(heroX + 53, heroY - 80, 3.4, 0, Math.PI * 2);
  ctx.fill();
};

/** 手前の植栽・岩。キャラクターの足元に奥行きを足す */
const drawForeground = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], index: number) => {
  const ocean = index >= 8;
  const lush = [0, 1, 3, 4, 6, 7, 10, 11, 12, 13].includes(index);
  if (lush) {
    const spots = [{ x: rect.x0 + 8, y: rect.y1 - 18, s: 1.25 }, { x: rect.x1 - 8, y: rect.y1 - 26, s: 1.4 }];
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
  if ([2, 5, 8, 9, 14, 15, 16, 17].includes(index)) {
    const rockColor = index === 16 ? "rgba(44,48,71,0.94)" : ocean ? "rgba(41,61,68,0.92)" : "rgba(105,91,67,0.86)";
    drawRock(ctx, rect.x0 + 10, rect.y1 - 11, 28, 11, rockColor, -0.15);
    drawRock(ctx, rect.x1 - 8, rect.y1 - 15, 34, 12, rockColor, 0.12);
  }
  if (index === 16) {
    ctx.strokeStyle = "rgba(123,132,185,0.7)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 18 + i * 12, rect.y1);
      ctx.lineTo(rect.x0 + 26 + i * 12, rect.y1 - 26 - i * 4);
      ctx.stroke();
    }
  }
  if (index === 17) {
    ctx.strokeStyle = "rgba(126,226,245,0.38)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc((rect.x0 + rect.x1) / 2, rect.y1 + 19, 112, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
};

/**
 * 入口区画のエントランスホール。
 * ここだけは地域の奥景色ではなく、「水族館に入った」と分かる玄関にする。
 */
const drawEntranceLobby = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
) => {
  const { x0, x1, y0, y1 } = windowRect(rect);

  // ロビーの壁。海の色のグラデーションに波の帯を重ねる
  const wall = ctx.createLinearGradient(0, y0, 0, y1);
  wall.addColorStop(0, "#0d3d52");
  wall.addColorStop(1, "#08222f");
  ctx.fillStyle = wall;
  rounded(ctx, x0, y0, x1 - x0, y1 - y0, 22);
  ctx.fill();

  ctx.strokeStyle = "rgba(20,52,66,0.75)";
  ctx.lineWidth = 5;
  rounded(ctx, x0, y0, x1 - x0, y1 - y0, 22);
  ctx.stroke();
  ctx.strokeStyle = "rgba(103,231,238,0.6)";
  ctx.lineWidth = 1.4;
  rounded(ctx, x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, 21);
  ctx.stroke();
};

/**
 * ロビーで動くもの。
 * ロビーの壁は購入枠（強化）と発券カウンターが重なる場所なので、
 * 大きな看板は置かない。館名は外のファサードに出す。
 */
const drawEntranceLobbyMotion = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  time: number,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const { x0, x1, y0, y1 } = windowRect(rect);
  ctx.save();
  rounded(ctx, x0, y0, x1 - x0, y1 - y0, 22);
  ctx.clip();

  // 壁いっぱいの波のライン
  ctx.strokeStyle = "rgba(94,214,228,0.32)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i += 1) {
    const base = y0 + 88 + i * 15;
    ctx.beginPath();
    for (let x = x0 - 4; x <= x1 + 4; x += 10) {
      const y = base + Math.sin(x * 0.045 + time * 1.4 + i * 0.8) * 4;
      if (x === x0 - 4) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  drawCaustics(ctx, x0 - 10, y0, x1 + 10, y1, time, 0.14, "#bdf3ff", 3);

  for (let i = 0; i < 6; i += 1) {
    cruisingShadow(ctx, x0, x1, y0 + 20 + (i % 4) * 38, time, i % 2 ? 0.05 : -0.04, 0.4 + (i % 3) * 0.2, 0.2, "#c9f4ff", i * 0.19);
  }
  // 順路の矢印。奥の展示室へ視線を送る
  ctx.strokeStyle = "rgba(126,235,242,0.5)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i += 1) {
    const ax = cx - 30 + i * 30;
    const ay = y1 - 26 + Math.sin(time * 2 + i * 0.7) * 1.5;
    ctx.globalAlpha = 0.35 + i * 0.22;
    ctx.beginPath();
    ctx.moveTo(ax - 7, ay - 7);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax - 7, ay + 7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

/**
 * 展示室のうち、動かない層をまとめて描く。
 * これをオフスクリーンへ焼いておき、毎フレームは貼るだけにする。
 */
const paintHallStatic = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
) => {
  // 1. 展示室の空気そのもの。床より先に一枚敷いて、隣の区画と色を分ける
  const room = ctx.createLinearGradient(0, rect.y0, 0, rect.y1);
  room.addColorStop(0, theme.warm ? "#20281f" : "#061119");
  room.addColorStop(1, theme.warm ? "#39412f" : "#0a1c26");
  ctx.fillStyle = room;
  ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);

  // 2. 通路の床 → 地域の作り込み → 隣室への通路
  drawGalleryFloor(ctx, rect, theme, index);
  drawFloorIdentity(ctx, rect, theme);
  drawDoorways(ctx, rect, theme, index);

  // 3. 天井と大窓。館内の主役
  drawCeiling(ctx, rect, theme, index);
  if (index === 0) drawEntranceLobby(ctx, rect);
  else {
    drawGreatWindow(ctx, rect, theme);
    drawGlassSheen(ctx, rect);
  }
  drawHandrail(ctx, rect, theme);
  // 演出を切っていても設備そのものは見えるよう、消灯しない状態を焼いておく
  drawCeilingLights(ctx, rect, theme, 0);
  drawAmenityLights(ctx, rect, theme, index, 0);

  // 4. 人と設備
  drawGalleryVisitors(ctx, rect, index);
  drawAmenities(ctx, rect, theme, index);
  drawLandmarkHalo(ctx, rect, theme, index);
  drawForeground(ctx, rect, index);

  // 5. 展示位置の照明。水槽が床から浮かず、照らされて見えるようにする
  const mirrored = index % 2 === 1;
  const points = mirrored
    ? [{ x: rect.x0 + 278, y: rect.y0 + 286 }, { x: rect.x0 + 190, y: rect.y0 + 330 }, { x: rect.x0 + 82, y: rect.y0 + 258 }]
    : [{ x: rect.x0 + 82, y: rect.y0 + 286 }, { x: rect.x0 + 176, y: rect.y0 + 330 }, { x: rect.x0 + 278, y: rect.y0 + 258 }];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const radius = i === 2 ? 56 : 40;
    const glow = ctx.createRadialGradient(p.x, p.y + 18, 2, p.x, p.y + 18, radius);
    glow.addColorStop(0, theme.warm ? "rgba(255,248,208,0.22)" : `${theme.accent}30`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - radius, p.y - 5, radius * 2, 68);
  }
};

/*
 * 焼き込んだ展示室。1区画360×420を、拡大しても粗くならない倍率で持つ。
 * 画面に出るのはせいぜい6区画なので、少数だけ残して使い回す。
 */
const HALL_BAKE_SCALE = 1.6;
const HALL_CACHE_LIMIT = 8;
const hallCache = new Map<number, HTMLCanvasElement>();

const bakedHall = (index: number, theme: Theme, w: number, h: number) => {
  const cached = hallCache.get(index);
  if (cached) {
    // 使ったものを最後尾へ回す（古いものから捨てるため）
    hallCache.delete(index);
    hallCache.set(index, cached);
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * HALL_BAKE_SCALE);
  canvas.height = Math.ceil(h * HALL_BAKE_SCALE);
  const bake = canvas.getContext("2d");
  if (!bake) return null;
  bake.scale(HALL_BAKE_SCALE, HALL_BAKE_SCALE);
  bake.textAlign = "center";
  bake.textBaseline = "alphabetic";
  paintHallStatic(bake, { x0: 0, y0: 0, x1: w, y1: h }, theme, index);
  hallCache.set(index, canvas);
  while (hallCache.size > HALL_CACHE_LIMIT) {
    const oldest = hallCache.keys().next();
    if (oldest.done) break;
    hallCache.delete(oldest.value);
  }
  return canvas;
};

/**
 * ナイトアクアリウム。館内の照明を落として、水槽だけを光らせる。
 *
 * 焼き込んだ昼の絵の上に暗幕を1枚かけ、そのあと大窓と展示位置の光を
 * 戻す順で描く。夜ぶんの絵を別に焼かずに済み、夕暮れの途中も同じ式で出せる。
 */
const drawNightFall = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
  night: number,
  time: number,
) => {
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const { x0, x1, y0, y1 } = windowRect(rect);

  /*
   * 1. 天井を落とし、大窓のまわりに光をため、床を落とす ―― を一枚で塗る。
   * 暗くする色と明るくする色を同じグラデーションの止め位置に置けるので、
   * 大きな塗りを何枚も重ねずに済む（塗る面積がそのまま重さになる）。
   * 淡水館は昼の床が明るいので、下側だけ幕を濃くする。
   */
  const veil = theme.warm ? 1.16 : 1;
  const fall = ctx.createLinearGradient(0, rect.y0, 0, rect.y1);
  fall.addColorStop(0, `rgba(2,8,20,${0.88 * night})`);
  fall.addColorStop(0.06, `rgba(4,14,32,${0.5 * night})`);
  fall.addColorStop(0.11, `rgba(24,74,104,${0.3 * night})`);
  fall.addColorStop(0.46, `rgba(44,126,166,${0.24 * night})`);
  fall.addColorStop(0.53, `rgba(96,196,232,${0.26 * night})`);
  fall.addColorStop(0.72, `rgba(4,12,28,${Math.min(0.94, 0.68 * veil) * night})`);
  fall.addColorStop(1, `rgba(2,6,18,${Math.min(0.94, 0.86 * veil) * night})`);
  ctx.fillStyle = fall;
  ctx.fillRect(rect.x0, rect.y0, w, h);

  /*
   * 2. 大窓そのものは光源。角の丸みは枠の線が隠すので矩形で塗る。
   * 光の網は drawWindowMotion がすでに描いているので、ここでは重ねない。
   */
  const lit = ctx.createLinearGradient(0, y0, 0, y1);
  lit.addColorStop(0, `rgba(150,236,255,${0.26 * night})`);
  lit.addColorStop(1, `rgba(46,150,205,${0.18 * night})`);
  ctx.fillStyle = lit;
  ctx.fillRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6);

  /*
   * 3. 展示水槽の位置の光だまり。水槽が暗い床から浮かないようにする。
   * 円形グラデーションは面積ぶん重いので、ランドマーク展示だけ大きく取る。
   */
  const mirrored = index % 2 === 1;
  const spots = mirrored
    ? [{ x: rect.x0 + 278, y: rect.y0 + 286 }, { x: rect.x0 + 190, y: rect.y0 + 330 }, { x: rect.x0 + 82, y: rect.y0 + 258 }]
    : [{ x: rect.x0 + 82, y: rect.y0 + 286 }, { x: rect.x0 + 176, y: rect.y0 + 330 }, { x: rect.x0 + 278, y: rect.y0 + 258 }];
  for (let i = 0; i < spots.length; i += 1) {
    const p = spots[i];
    const radius = i === 2 ? 68 : 48;
    const glow = ctx.createRadialGradient(p.x, p.y - 4, 2, p.x, p.y - 4, radius);
    glow.addColorStop(0, `rgba(146,238,255,${0.32 * night})`);
    glow.addColorStop(1, "rgba(146,238,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
  }

  // 4. 足元の誘導灯。暗い床に点々と明かりが続く
  const cx = (rect.x0 + rect.x1) / 2;
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const py = rect.y0 + FLOOR_TOP + 30 + t * (h - FLOOR_TOP - 50);
    const px = cx + Math.sin(t * 3 + (mirrored ? 1.6 : 0)) * 76;
    const blink = 0.45 + Math.abs(Math.sin(time * 1.1 + i * 0.9)) * 0.3;
    ctx.fillStyle = `rgba(122,226,246,${blink * night})`;
    ctx.beginPath();
    ctx.ellipse(px, py, 3.4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. 天井は消灯し、非常灯だけが残る
  for (let i = 0; i < 5; i += 1) {
    const lx = rect.x0 + 36 + i * ((w - 72) / 4);
    ctx.fillStyle = `rgba(96,190,230,${0.34 * night})`;
    rounded(ctx, lx - 12, rect.y0 + 16, 24, 3, 1.5);
    ctx.fill();
  }
};

export const drawAquariumHall = (
  ctx: CanvasRenderingContext2D,
  area: AquariumArea,
  time: number,
  night = 0,
) => {
  const index = areaIndex(area.id);
  const theme = THEMES[index] ?? THEMES[0];
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x0, rect.y0, w, h);
  ctx.clip();

  const baked = bakedHall(index, theme, w, h);
  if (baked) ctx.drawImage(baked, rect.x0, rect.y0, w, h);
  else paintHallStatic(ctx, rect, theme, index);

  /*
   * 動く層と、拡大してもぼやけては困る文字を毎フレーム重ねる。
   * 「演出 OFF」のときは time=0 で渡ってくるので、動く層はまるごと省く。
   */
  const effects = time !== 0;
  if (effects) {
    drawCeilingLights(ctx, rect, theme, time);
    if (index === 0) drawEntranceLobbyMotion(ctx, rect, time);
    else drawWindowMotion(ctx, rect, theme, index, time);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x0, rect.y0 + FLOOR_TOP, w, 104);
    ctx.clip();
    drawCaustics(ctx, rect.x0 - 10, rect.y0 + FLOOR_TOP, rect.x1 + 10, rect.y0 + FLOOR_TOP + 104, time * 0.7, theme.warm ? 0.1 : 0.14, theme.light, 3);
    ctx.restore();
    drawAmenityLights(ctx, rect, theme, index, time);
  }
  if (night > 0.002) drawNightFall(ctx, rect, theme, index, night, time);
  if (index !== 0) drawHeader(ctx, rect, theme, index);
  drawLandmarkPlate(ctx, rect, theme, index, time);

  ctx.textAlign = "center";
  ctx.restore();
};
