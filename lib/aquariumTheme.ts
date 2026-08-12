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
  { name: "日本の淡水・里川", chapter: "FRESH WATER · JAPAN", mood: "satoyama", wallTop: "#e4ece3", wallBottom: "#9cc7b3", floorTop: "#bdb2a3", floorBottom: "#6c7066", accent: "#4f9179", light: "#effff7", warm: true },
  { name: "日本の清流", chapter: "FRESH WATER · JAPAN", mood: "mountain", wallTop: "#e2efec", wallBottom: "#82b9b0", floorTop: "#adbab5", floorBottom: "#637d78", accent: "#5daea6", light: "#eaffff", warm: true },
  { name: "東アジアの大河", chapter: "FRESH WATER · EAST ASIA", mood: "great-river", wallTop: "#dddccc", wallBottom: "#85937c", floorTop: "#afa992", floorBottom: "#62665a", accent: "#819779", light: "#fff4d5", warm: true },
  { name: "メコン川", chapter: "FRESH WATER · MEKONG", mood: "mekong", wallTop: "#d1d8bb", wallBottom: "#697b57", floorTop: "#988c70", floorBottom: "#514f41", accent: "#91aa6b", light: "#f3f8ca", warm: true },
  { name: "東南アジア 水没森林", chapter: "FRESH WATER · FLOODED FOREST", mood: "flooded", wallTop: "#335e50", wallBottom: "#153b32", floorTop: "#506050", floorBottom: "#22362f", accent: "#69aa78", light: "#dcf8d4" },
  { name: "アフリカの湖と川", chapter: "FRESH WATER · AFRICA", mood: "africa", wallTop: "#c2b58b", wallBottom: "#78684b", floorTop: "#917d5c", floorBottom: "#4d4334", accent: "#d0ad61", light: "#fff1bd", warm: true },
  { name: "アマゾン熱帯雨林", chapter: "FRESH WATER · AMAZON", mood: "amazon", wallTop: "#285748", wallBottom: "#11392f", floorTop: "#4c6556", floorBottom: "#22382f", accent: "#4daf70", light: "#c4ffda" },
  { name: "アマゾン大河", chapter: "FRESH WATER · GRAND FINALE", mood: "amazon-giant", wallTop: "#1c5045", wallBottom: "#0b302a", floorTop: "#405f54", floorBottom: "#1a312b", accent: "#5cb99a", light: "#caffef" },
  { name: "日本の海", chapter: "OCEAN · JAPAN", mood: "japan-sea", wallTop: "#15536e", wallBottom: "#073048", floorTop: "#31535f", floorBottom: "#132c35", accent: "#67d0ea", light: "#d9faff" },
  { name: "北の海", chapter: "OCEAN · COLD WATER", mood: "cold-sea", wallTop: "#365f73", wallBottom: "#17394d", floorTop: "#496974", floorBottom: "#223944", accent: "#a5def3", light: "#effcff" },
  { name: "沖縄 サンゴ礁", chapter: "OCEAN · OKINAWA", mood: "reef", wallTop: "#15919c", wallBottom: "#046275", floorTop: "#4f807f", floorBottom: "#1e4d51", accent: "#7ff4e7", light: "#edfff8" },
  { name: "カリフォルニア ケルプの森", chapter: "OCEAN · KELP FOREST", mood: "kelp", wallTop: "#326a60", wallBottom: "#153f3b", floorTop: "#4b6d64", floorBottom: "#253f3a", accent: "#7aba8d", light: "#e9fbd8" },
  { name: "東南アジアの海", chapter: "OCEAN · SOUTH EAST ASIA", mood: "tropical-sea", wallTop: "#177f8e", wallBottom: "#094d5a", floorTop: "#3d6b72", floorBottom: "#193d43", accent: "#7ee0ea", light: "#e7ffff" },
  { name: "グレートリーフ", chapter: "OCEAN · AUSTRALIA", mood: "great-reef", wallTop: "#13909c", wallBottom: "#075c6b", floorTop: "#497f81", floorBottom: "#1c454a", accent: "#83ede0", light: "#f3fff9" },
  { name: "インド洋", chapter: "OCEAN · INDIAN OCEAN", mood: "indian", wallTop: "#17687a", wallBottom: "#093f51", floorTop: "#3d626d", floorBottom: "#172f39", accent: "#77cfe7", light: "#e6faff" },
  { name: "外洋", chapter: "OCEAN · OPEN OCEAN", mood: "open-ocean", wallTop: "#0e607f", wallBottom: "#053047", floorTop: "#315461", floorBottom: "#112a35", accent: "#70cef1", light: "#e4f9ff" },
  { name: "深海", chapter: "OCEAN · DEEP SEA", mood: "deep-sea", wallTop: "#17213f", wallBottom: "#060c21", floorTop: "#1c253d", floorBottom: "#070b18", accent: "#7f87e9", light: "#d5dbff" },
  { name: "世界の大海", chapter: "WORLD OCEAN · GRAND FINALE", mood: "world-ocean", wallTop: "#0e5975", wallBottom: "#042a40", floorTop: "#31535f", floorBottom: "#102a34", accent: "#84e2f5", light: "#edffff" },
];

const LANDMARK_LABELS = [
  "里川大水槽",
  "清流大水槽",
  "東アジア大河水槽",
  "巨大ナマズ",
  "水没森林アロワナ大水槽",
  "アフリカ湖大水槽",
  "アマゾン雨林大水槽",
  "ピラルク大河水槽",
  "日本海大水槽",
  "北海大水槽",
  "沖縄サンゴ礁大水槽",
  "ケルプの森大水槽",
  "南海大水槽",
  "グレートリーフ大水槽",
  "インド洋大水槽",
  "外洋回遊大水槽",
  "深海発光大水槽",
  "WORLD OCEAN 巨大水槽",
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

const areaIndex = (id: string) => {
  const match = id.match(/area-(\d+)/);
  return match ? Number(match[1]) : 0;
};

const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
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

const fishShadow = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number, facing = 1) => {
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

const drawCeiling = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, time: number, index: number) => {
  const w = rect.x1 - rect.x0;
  const bright = theme.warm === true;
  ctx.fillStyle = bright ? "rgba(61,70,62,0.9)" : index >= 16 ? "#050713" : "#07141d";
  ctx.fillRect(rect.x0, rect.y0, w, 29);
  ctx.strokeStyle = bright ? "rgba(117,100,75,0.62)" : "rgba(73,116,132,0.46)";
  ctx.lineWidth = bright ? 4 : 3;
  for (let i = 0; i < 6; i += 1) {
    const x = rect.x0 + i * (w / 5);
    ctx.beginPath();
    ctx.moveTo(x, rect.y0 + 28);
    ctx.quadraticCurveTo((rect.x0 + rect.x1) / 2, rect.y0 + 8, rect.x1 - (x - rect.x0), rect.y0 + 28);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const x = rect.x0 + 34 + i * ((w - 68) / 4);
    const glow = 0.44 + Math.abs(Math.sin(time * 0.7 + i)) * 0.2;
    ctx.fillStyle = bright ? `rgba(255,244,205,${glow})` : `rgba(126,226,255,${glow})`;
    rounded(ctx, x - 18, rect.y0 + 10, 36, 4, 2);
    ctx.fill();
  }
};

const drawHeader = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const w = rect.x1 - rect.x0;
  const plateW = Math.min(w - 36, 300);
  const plateY = rect.y0 + 33;
  ctx.save();
  const plate = ctx.createLinearGradient(cx - plateW / 2, 0, cx + plateW / 2, 0);
  plate.addColorStop(0, theme.warm ? "rgba(31,52,43,0.90)" : "rgba(2,15,24,0.92)");
  plate.addColorStop(0.5, theme.warm ? "rgba(45,76,61,0.94)" : "rgba(7,37,50,0.96)");
  plate.addColorStop(1, theme.warm ? "rgba(31,52,43,0.90)" : "rgba(2,15,24,0.92)");
  ctx.fillStyle = plate;
  rounded(ctx, cx - plateW / 2, plateY, plateW, 46, 14);
  ctx.fill();
  ctx.strokeStyle = theme.warm ? "rgba(210,235,214,0.70)" : `${theme.accent}bb`;
  ctx.lineWidth = 1.5;
  rounded(ctx, cx - plateW / 2, plateY, plateW, 46, 14);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.warm ? "rgba(220,245,228,0.84)" : "rgba(179,241,247,0.86)";
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(theme.chapter, cx, plateY + 11);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,8,12,0.72)";
  ctx.lineWidth = 3;
  ctx.font = '900 17px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.strokeText(theme.name, cx, plateY + 29);
  ctx.fillStyle = "#f7ffff";
  ctx.fillText(theme.name, cx, plateY + 29);
  ctx.fillStyle = theme.warm ? "rgba(228,245,229,0.72)" : "rgba(222,250,255,0.72)";
  ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(REGION_NOTES[index] ?? "世界の水辺", cx, plateY + 40);
  ctx.restore();
};

const drawWaterRays = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, time: number, count = 6, alpha = 0.1) => {
  ctx.strokeStyle = `rgba(219,250,255,${alpha})`;
  for (let i = 0; i < count; i += 1) {
    ctx.lineWidth = 7 + (i % 3) * 4;
    ctx.beginPath();
    ctx.moveTo(x0 + 14 + i * ((x1 - x0 - 28) / Math.max(1, count - 1)), y0 - 5);
    ctx.lineTo(x0 - 10 + i * ((x1 - x0 + 12) / Math.max(1, count - 1)) + Math.sin(time * 0.32 + i) * 5, y1 + 7);
    ctx.stroke();
  }
};

const drawDistantHabitat = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, time: number, index: number) => {
  const x0 = rect.x0 + 18;
  const x1 = rect.x1 - 18;
  const y0 = rect.y0 + 82;
  const y1 = rect.y0 + 191;
  const w = x1 - x0;
  const mural = ctx.createLinearGradient(0, y0, 0, y1);
  mural.addColorStop(0, theme.wallTop);
  mural.addColorStop(1, theme.wallBottom);
  ctx.fillStyle = mural;
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.fill();
  ctx.save();
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.clip();

  switch (theme.mood) {
    case "satoyama": {
      ctx.fillStyle = "rgba(97,137,90,0.76)";
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 + 70);
      ctx.bezierCurveTo(x0 + 65, y0 + 30, x0 + 118, y0 + 77, x0 + 176, y0 + 46);
      ctx.bezierCurveTo(x0 + 245, y0 + 18, x0 + 310, y0 + 76, x1 + 8, y0 + 48);
      ctx.lineTo(x1 + 8, y1 + 8);
      ctx.lineTo(x0 - 8, y1 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(166,217,207,0.78)";
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 + 87);
      ctx.bezierCurveTo(x0 + 80, y0 + 64, x0 + 140, y0 + 104, x0 + 200, y0 + 82);
      ctx.bezierCurveTo(x0 + 270, y0 + 62, x0 + 312, y0 + 100, x1 + 8, y0 + 82);
      ctx.lineTo(x1 + 8, y1 + 8);
      ctx.lineTo(x0 - 8, y1 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(94,86,63,0.58)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 18 + i * 51;
        ctx.beginPath();
        ctx.moveTo(x, y0 + 88);
        ctx.lineTo(x + (i % 2 ? 5 : -3), y0 + 54);
        ctx.stroke();
        leaf(ctx, x - 4, y0 + 55, 11, 4.5, -0.25, "#648d59");
        leaf(ctx, x + 7, y0 + 48, 11, 4.5, 0.3, "#78a464");
      }
      ctx.fillStyle = "rgba(231,221,184,0.72)";
      for (let i = 0; i < 6; i += 1) ctx.fillRect(x0 + 16 + i * 62, y0 + 87 + (i % 2) * 4, 42, 2);
      break;
    }
    case "mountain": {
      ctx.fillStyle = "rgba(76,110,106,0.86)";
      ctx.beginPath();
      ctx.moveTo(x0 - 10, y0 + 78);
      ctx.lineTo(x0 + 58, y0 + 26);
      ctx.lineTo(x0 + 112, y0 + 70);
      ctx.lineTo(x0 + 188, y0 + 12);
      ctx.lineTo(x0 + 252, y0 + 66);
      ctx.lineTo(x0 + 322, y0 + 24);
      ctx.lineTo(x1 + 10, y0 + 74);
      ctx.lineTo(x1 + 10, y1 + 8);
      ctx.lineTo(x0 - 10, y1 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(224,250,246,0.78)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(x0 + 20, y0 + 86);
      ctx.bezierCurveTo(x0 + 104, y0 + 62, x0 + 160, y0 + 110, x0 + 240, y0 + 78);
      ctx.bezierCurveTo(x0 + 300, y0 + 55, x0 + 340, y0 + 92, x1 + 12, y0 + 73);
      ctx.stroke();
      ctx.fillStyle = "rgba(218,232,229,0.56)";
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 24 + i * 52, y0 + 101, 22, 7, i * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "great-river": {
      ctx.fillStyle = "rgba(94,116,82,0.7)";
      ctx.beginPath();
      ctx.moveTo(x0, y0 + 50);
      ctx.bezierCurveTo(x0 + 90, y0 + 30, x0 + 150, y0 + 62, x0 + 220, y0 + 40);
      ctx.bezierCurveTo(x0 + 290, y0 + 23, x0 + 340, y0 + 55, x1, y0 + 38);
      ctx.lineTo(x1, y0 + 70);
      ctx.lineTo(x0, y0 + 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(151,194,177,0.74)";
      ctx.fillRect(x0, y0 + 63, w, 48);
      ctx.fillStyle = "rgba(211,196,142,0.62)";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 68 + i * 88, y0 + 88 - (i % 2) * 8, 34, 7, -0.08 + i * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(78,83,57,0.7)";
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 6; i += 1) {
        const x = x0 + 24 + i * 68;
        ctx.beginPath();
        ctx.moveTo(x, y0 + 68);
        ctx.quadraticCurveTo(x - 4, y0 + 47, x + 3, y0 + 38);
        ctx.stroke();
        leaf(ctx, x - 7, y0 + 42, 14, 3.6, -0.5, "rgba(92,124,70,0.8)");
      }
      break;
    }
    case "mekong": {
      ctx.fillStyle = "rgba(142,126,78,0.32)";
      ctx.fillRect(x0, y0 + 60, w, 54);
      for (let i = 0; i < 9; i += 1) {
        const x = x0 + 12 + i * (w / 8);
        ctx.strokeStyle = "rgba(74,86,53,0.84)";
        ctx.lineWidth = 4 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y0 - 4);
        ctx.bezierCurveTo(x + 15, y0 + 28, x - 12, y0 + 66, x + 3, y1 + 6);
        ctx.stroke();
      }
      for (let i = 0; i < 13; i += 1) leaf(ctx, x0 + 8 + (i * 37) % w, y0 + 18 + (i * 23) % 69, 12, 4.5, (i % 5) * 0.32, "#7a9562");
      ctx.fillStyle = "rgba(74,65,43,0.6)";
      ctx.fillRect(x0 + 280, y0 + 34, 52, 4);
      ctx.fillRect(x0 + 286, y0 + 38, 3, 24);
      ctx.fillRect(x0 + 325, y0 + 38, 3, 24);
      fishShadow(ctx, x0 + 86, y0 + 81, 0.82, 0.17, 1);
      break;
    }
    case "flooded": {
      ctx.fillStyle = "rgba(11,45,35,0.22)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      for (let i = 0; i < 10; i += 1) {
        const x = x0 + 8 + i * (w / 9);
        ctx.strokeStyle = i % 2 ? "rgba(54,63,43,0.94)" : "rgba(70,74,48,0.86)";
        ctx.lineWidth = 6 + (i % 3) * 2;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 8);
        ctx.bezierCurveTo(x + 18, y0 + 40, x - 16, y0 + 76, x + 4, y1 + 12);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i += 1) {
        const x = x0 + 22 + i * 46;
        ctx.strokeStyle = "rgba(63,54,37,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 4);
        ctx.quadraticCurveTo(x + 18, y1 - 22, x + 30, y1 - 37);
        ctx.stroke();
      }
      drawWaterRays(ctx, x0, x1, y0, y1, time, 5, 0.07);
      fishShadow(ctx, x1 - 78, y0 + 55, 1.2, 0.13, -1);
      break;
    }
    case "africa": {
      ctx.fillStyle = "rgba(196,173,111,0.28)";
      ctx.fillRect(x0, y0 + 70, w, 44);
      for (let i = 0; i < 8; i += 1) drawRock(ctx, x0 + 18 + i * 53, y0 + 94 - (i % 3) * 4, 31, 11, i % 2 ? "rgba(93,75,54,0.74)" : "rgba(119,92,61,0.72)", i * 0.05);
      ctx.strokeStyle = "rgba(82,102,66,0.72)";
      ctx.lineWidth = 2.3;
      for (let i = 0; i < 14; i += 1) {
        const x = x0 + 8 + i * 29;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 4);
        ctx.quadraticCurveTo(x + (i % 2 ? 4 : -4), y1 - 18, x + 2, y1 - 34 - (i % 4) * 3);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(76,77,54,0.5)";
      ctx.beginPath();
      ctx.moveTo(x0 + 248, y0 + 55);
      ctx.lineTo(x0 + 266, y0 + 29);
      ctx.lineTo(x0 + 284, y0 + 55);
      ctx.closePath();
      ctx.fill();
      fishShadow(ctx, x0 + 102, y0 + 54, 0.84, 0.13, 1);
      break;
    }
    case "amazon": {
      ctx.fillStyle = "rgba(19,60,43,0.28)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      for (let i = 0; i < 12; i += 1) {
        const x = x0 + 6 + i * (w / 11);
        ctx.strokeStyle = i % 2 ? "rgba(51,77,48,0.96)" : "rgba(67,91,51,0.9)";
        ctx.lineWidth = 5 + (i % 3) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 9);
        ctx.bezierCurveTo(x + 17, y0 + 28, x - 16, y0 + 71, x + 3, y1 + 10);
        ctx.stroke();
      }
      for (let i = 0; i < 20; i += 1) leaf(ctx, x0 + 7 + (i * 31) % w, y0 + 13 + (i * 19) % 76, 12.5, 5, (i % 6) * 0.28, i % 2 ? "#4a8b5f" : "#36784f");
      fishShadow(ctx, x0 + 86, y0 + 79, 1.0, 0.14, 1);
      fishShadow(ctx, x1 - 67, y0 + 54, 1.34, 0.12, -1);
      break;
    }
    case "amazon-giant": {
      ctx.fillStyle = "rgba(9,43,35,0.3)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      ctx.strokeStyle = "rgba(50,62,39,0.94)";
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(x0 + 26, y0 - 8);
      ctx.bezierCurveTo(x0 + 95, y0 + 35, x0 + 102, y0 + 81, x0 + 72, y1 + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 - 28, y0 - 7);
      ctx.bezierCurveTo(x1 - 96, y0 + 30, x1 - 106, y0 + 72, x1 - 75, y1 + 8);
      ctx.stroke();
      for (let i = 0; i < 15; i += 1) leaf(ctx, x0 + 18 + (i * 41) % w, y0 + 15 + (i * 27) % 68, 15, 5.5, (i % 5) * 0.3, "#4d8f63");
      fishShadow(ctx, (x0 + x1) / 2, y0 + 61, 2.05, 0.16, 1);
      fishShadow(ctx, x0 + 88, y0 + 86, 0.72, 0.11, -1);
      fishShadow(ctx, x1 - 74, y0 + 37, 0.9, 0.1, 1);
      break;
    }
    case "japan-sea": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 6, 0.1);
      for (let i = 0; i < 9; i += 1) drawRock(ctx, x0 + 12 + i * 48, y1 - 8 - (i % 3) * 5, 27, 12, i % 2 ? "rgba(64,81,82,0.82)" : "rgba(87,100,93,0.76)", -0.2 + i * 0.04);
      ctx.strokeStyle = "rgba(66,106,89,0.65)";
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 32 + i * 52;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.bezierCurveTo(x + 8, y1 - 20, x - 6, y1 - 37, x + 4, y1 - 50);
        ctx.stroke();
      }
      for (let i = 0; i < 9; i += 1) fishShadow(ctx, x0 + 40 + i * 36, y0 + 37 + (i % 3) * 16, 0.42 + (i % 2) * 0.1, 0.14, i % 3 ? 1 : -1);
      break;
    }
    case "cold-sea": {
      ctx.fillStyle = "rgba(221,245,250,0.2)";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 88, y0);
      ctx.lineTo(x0 + 115, y0 + 19);
      ctx.lineTo(x0 + 188, y0 + 7);
      ctx.lineTo(x0 + 246, y0 + 22);
      ctx.lineTo(x0 + 318, y0 + 4);
      ctx.lineTo(x1, y0 + 12);
      ctx.lineTo(x1, y0);
      ctx.closePath();
      ctx.fill();
      drawWaterRays(ctx, x0, x1, y0, y1, time, 5, 0.08);
      for (let i = 0; i < 8; i += 1) drawRock(ctx, x0 + 17 + i * 55, y1 - 7 - (i % 3) * 4, 30, 13, i % 2 ? "rgba(66,83,91,0.82)" : "rgba(91,105,108,0.72)", i * 0.04);
      ctx.fillStyle = "rgba(226,247,252,0.52)";
      for (let i = 0; i < 11; i += 1) {
        ctx.beginPath();
        ctx.arc(x0 + 20 + (i * 37) % w, y0 + 30 + (i * 17) % 62, 1 + (i % 3) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      fishShadow(ctx, x0 + 92, y0 + 58, 0.75, 0.13, 1);
      fishShadow(ctx, x1 - 75, y0 + 75, 1.0, 0.12, -1);
      break;
    }
    case "reef": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 7, 0.13);
      ctx.fillStyle = "rgba(239,229,185,0.55)";
      ctx.fillRect(x0, y1 - 19, w, 22);
      const colors = ["#ef897c", "#ebcb66", "#a782db", "#61c7ad"];
      for (let i = 0; i < 15; i += 1) drawCoral(ctx, x0 + 10 + i * 27, y1 + 4, 0.78 + (i % 3) * 0.14, colors[i % colors.length]);
      for (let i = 0; i < 8; i += 1) fishShadow(ctx, x0 + 28 + i * 44, y0 + 32 + (i % 3) * 19, 0.42 + (i % 2) * 0.14, 0.17, i % 3 ? 1 : -1);
      break;
    }
    case "kelp": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 5, 0.07);
      for (let i = 0; i < 12; i += 1) {
        const x = x0 + 9 + i * 34;
        ctx.strokeStyle = i % 2 ? "rgba(61,121,75,0.86)" : "rgba(78,145,83,0.79)";
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(x, y1 + 5);
        ctx.bezierCurveTo(x + 17, y0 + 82, x - 13, y0 + 42, x + 4, y0 - 4);
        ctx.stroke();
        for (let j = 0; j < 3; j += 1) leaf(ctx, x + (j % 2 ? 5 : -4), y0 + 26 + j * 25, 6, 16, j % 2 ? 0.35 : -0.35, "rgba(80,137,78,0.82)");
      }
      fishShadow(ctx, x0 + 78, y0 + 55, 0.68, 0.16, 1);
      fishShadow(ctx, x1 - 72, y0 + 86, 1.0, 0.13, -1);
      break;
    }
    case "tropical-sea": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 6, 0.1);
      ctx.strokeStyle = "rgba(71,84,58,0.78)";
      ctx.lineWidth = 5;
      for (let i = 0; i < 7; i += 1) {
        const x = x0 + 28 + i * 56;
        ctx.beginPath();
        ctx.moveTo(x, y0 - 5);
        ctx.bezierCurveTo(x + 15, y0 + 30, x - 11, y0 + 66, x + 3, y0 + 89);
        ctx.stroke();
      }
      const colors = ["#df8379", "#e6c56b", "#9f80cf"];
      for (let i = 0; i < 10; i += 1) drawCoral(ctx, x0 + 18 + i * 39, y1 + 3, 0.78 + (i % 2) * 0.16, colors[i % colors.length]);
      for (let i = 0; i < 7; i += 1) fishShadow(ctx, x0 + 34 + i * 48, y0 + 38 + (i % 3) * 18, 0.42 + (i % 2) * 0.13, 0.14, i % 2 ? 1 : -1);
      break;
    }
    case "great-reef": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 8, 0.12);
      ctx.fillStyle = "rgba(239,230,190,0.42)";
      ctx.fillRect(x0, y1 - 18, w, 21);
      const colors = ["#ee7b74", "#e9c756", "#9b77d6", "#61c9b1", "#df91bd"];
      for (let i = 0; i < 18; i += 1) drawCoral(ctx, x0 + 6 + i * 23, y1 + 5, 0.92 + (i % 4) * 0.14, colors[i % colors.length]);
      ctx.fillStyle = "rgba(88,181,169,0.28)";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x0 + 52 + i * 76, y1 - 36 - (i % 2) * 8, 28, 7, -0.08 + i * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 10; i += 1) fishShadow(ctx, x0 + 28 + i * 37, y0 + 28 + (i % 4) * 17, 0.4 + (i % 3) * 0.12, 0.15, i % 2 ? 1 : -1);
      break;
    }
    case "indian": {
      drawWaterRays(ctx, x0, x1, y0, y1, time, 7, 0.09);
      ctx.fillStyle = "rgba(80,147,143,0.36)";
      ctx.beginPath();
      ctx.moveTo(x0, y1 - 32);
      ctx.bezierCurveTo(x0 + 85, y1 - 49, x0 + 135, y1 - 14, x0 + 212, y1 - 36);
      ctx.bezierCurveTo(x0 + 285, y1 - 54, x0 + 335, y1 - 21, x1, y1 - 42);
      ctx.lineTo(x1, y1 + 4);
      ctx.lineTo(x0, y1 + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(4,47,65,0.28)";
      ctx.beginPath();
      ctx.moveTo(x0 + 255, y0 + 50);
      ctx.lineTo(x1 + 5, y0 + 34);
      ctx.lineTo(x1 + 5, y1 + 5);
      ctx.lineTo(x0 + 288, y1 + 5);
      ctx.closePath();
      ctx.fill();
      fishShadow(ctx, x0 + 105, y0 + 55, 1.25, 0.12, 1);
      fishShadow(ctx, x1 - 90, y0 + 76, 1.6, 0.13, -1);
      break;
    }
    case "open-ocean": {
      const deep = ctx.createLinearGradient(0, y0, 0, y1);
      deep.addColorStop(0, "rgba(32,128,159,0.18)");
      deep.addColorStop(1, "rgba(2,27,50,0.5)");
      ctx.fillStyle = deep;
      ctx.fillRect(x0, y0, w, y1 - y0);
      drawWaterRays(ctx, x0, x1, y0, y1, time, 8, 0.09);
      for (let i = 0; i < 14; i += 1) {
        const a = i * 0.55;
        fishShadow(ctx, (x0 + x1) / 2 + Math.cos(a) * (52 + i * 4), y0 + 60 + Math.sin(a) * 24, 0.36 + (i % 3) * 0.09, 0.11, i % 2 ? 1 : -1);
      }
      fishShadow(ctx, x1 - 90, y0 + 45, 1.48, 0.09, -1);
      fishShadow(ctx, x0 + 86, y0 + 83, 1.0, 0.08, 1);
      break;
    }
    case "deep-sea": {
      ctx.fillStyle = "rgba(1,5,17,0.36)";
      ctx.fillRect(x0, y0, w, y1 - y0);
      ctx.fillStyle = "rgba(37,39,66,0.78)";
      ctx.beginPath();
      ctx.moveTo(x0, y1 - 5);
      ctx.lineTo(x0 + 48, y1 - 32);
      ctx.lineTo(x0 + 102, y1 - 11);
      ctx.lineTo(x0 + 148, y1 - 45);
      ctx.lineTo(x0 + 212, y1 - 18);
      ctx.lineTo(x0 + 280, y1 - 41);
      ctx.lineTo(x1, y1 - 13);
      ctx.lineTo(x1, y1 + 4);
      ctx.lineTo(x0, y1 + 4);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 3; i += 1) {
        const vx = x0 + 95 + i * 88;
        ctx.strokeStyle = "rgba(61,71,84,0.9)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(vx, y1 - 8);
        ctx.lineTo(vx + (i - 1) * 7, y1 - 42 - i * 4);
        ctx.stroke();
        const plume = 0.12 + Math.abs(Math.sin(time * 0.6 + i)) * 0.12;
        ctx.fillStyle = `rgba(183,218,220,${plume})`;
        for (let j = 0; j < 4; j += 1) {
          ctx.beginPath();
          ctx.arc(vx + Math.sin(time + j) * 5, y1 - 49 - j * 11, 5 + j * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = 0; i < 25; i += 1) {
        const pulse = 0.18 + Math.abs(Math.sin(time * 0.8 + i)) * 0.46;
        ctx.fillStyle = `rgba(102,229,221,${pulse})`;
        ctx.beginPath();
        ctx.arc(x0 + 12 + (i * 47) % (w - 24), y0 + 11 + (i * 31) % 78, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "world-ocean": {
      const grand = ctx.createLinearGradient(0, y0, 0, y1);
      grand.addColorStop(0, "rgba(61,166,190,0.2)");
      grand.addColorStop(1, "rgba(2,31,49,0.5)");
      ctx.fillStyle = grand;
      ctx.fillRect(x0, y0, w, y1 - y0);
      drawWaterRays(ctx, x0, x1, y0, y1, time, 9, 0.11);
      ctx.strokeStyle = "rgba(157,233,243,0.24)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc((x0 + x1) / 2, y0 + 62, 118, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      fishShadow(ctx, (x0 + x1) / 2, y0 + 62, 2.2, 0.14, 1);
      fishShadow(ctx, x0 + 92, y0 + 42, 1.1, 0.11, 1);
      fishShadow(ctx, x1 - 92, y0 + 84, 1.35, 0.1, -1);
      for (let i = 0; i < 9; i += 1) fishShadow(ctx, x0 + 40 + i * 40, y0 + 29 + (i % 3) * 22, 0.34 + (i % 2) * 0.09, 0.09, i % 2 ? 1 : -1);
      break;
    }
  }

  ctx.restore();
  ctx.strokeStyle = theme.warm ? "rgba(83,103,87,0.34)" : "rgba(158,235,250,0.27)";
  ctx.lineWidth = 2;
  rounded(ctx, x0, y0, w, y1 - y0, 30);
  ctx.stroke();
  ctx.fillStyle = theme.warm ? "rgba(92,83,66,0.42)" : "rgba(11,31,42,0.64)";
  rounded(ctx, x0 - 6, y0 + 17, 9, y1 - y0 - 30, 4);
  ctx.fill();
  rounded(ctx, x1 - 3, y0 + 17, 9, y1 - y0 - 30, 4);
  ctx.fill();
};

const drawPerspectiveFloor = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
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
  ctx.strokeStyle = theme.warm ? "rgba(220,210,192,0.67)" : "rgba(170,207,211,0.13)";
  ctx.lineWidth = 122;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 201);
  ctx.stroke();
  ctx.strokeStyle = theme.warm ? "rgba(252,244,225,0.44)" : "rgba(211,239,241,0.085)";
  ctx.lineWidth = 90;
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 + 24);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 201);
  ctx.stroke();
  ctx.strokeStyle = theme.warm ? "rgba(70,76,68,0.11)" : "rgba(190,225,230,0.06)";
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
  ctx.save();
  ctx.globalAlpha = theme.warm ? 0.22 : 0.2;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  if (index <= 7) {
    ctx.beginPath();
    ctx.arc(cx, rect.y0 + 350, 34 + (index % 3) * 6, 0.1, Math.PI - 0.1);
    ctx.stroke();
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 15, rect.y0 + 346);
      ctx.lineTo(cx + i * 10, rect.y0 + 366);
      ctx.stroke();
    }
  } else if (index === 16) {
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, rect.y0 + 350, 9 + i * 8, i * 0.5, i * 0.5 + 2.6);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, rect.y0 + 352, 44, 19, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 42, rect.y0 + 352);
    ctx.quadraticCurveTo(cx, rect.y0 + 337, cx + 42, rect.y0 + 352);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 42, rect.y0 + 352);
    ctx.quadraticCurveTo(cx, rect.y0 + 367, cx + 42, rect.y0 + 352);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = theme.warm ? "rgba(73,136,116,0.54)" : `${theme.accent}99`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(startX, rect.y1 - 10);
  ctx.bezierCurveTo(midX, rect.y0 + 354, -midX + cx * 2, rect.y0 + 280, endX, rect.y0 + 210);
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawLandmarkFrame = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number, time: number) => {
  const mirrored = index % 2 === 1;
  const heroX = rect.x0 + (mirrored ? 82 : 278);
  const heroY = rect.y0 + 258;
  const halo = ctx.createRadialGradient(heroX, heroY - 20, 8, heroX, heroY - 20, 84);
  halo.addColorStop(0, theme.warm ? "rgba(255,248,214,0.28)" : `${theme.accent}2e`);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(heroX - 92, heroY - 110, 184, 154);
  ctx.strokeStyle = theme.warm ? "rgba(91,89,66,0.42)" : `${theme.accent}70`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(heroX, heroY - 12, index === 17 ? 68 : 61, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  ctx.fillStyle = theme.warm ? "rgba(44,54,42,0.94)" : "rgba(3,18,27,0.94)";
  rounded(ctx, heroX - 65, heroY - 96, 130, 28, 10);
  ctx.fill();
  ctx.strokeStyle = theme.warm ? "rgba(229,239,205,0.66)" : `${theme.accent}aa`;
  ctx.lineWidth = 1.2;
  rounded(ctx, heroX - 65, heroY - 96, 130, 28, 10);
  ctx.stroke();
  ctx.fillStyle = "#f8ffff";
  ctx.font = '900 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,8,12,0.8)";
  ctx.lineWidth = 2.5;
  const landmarkTag = index === 17 ? "★ GRAND LANDMARK" : "★ LANDMARK";
  ctx.strokeText(landmarkTag, heroX, heroY - 78);
  ctx.fillText(landmarkTag, heroX, heroY - 78);
  const pulse = 0.45 + Math.abs(Math.sin(time * 1.5)) * 0.25;
  ctx.fillStyle = theme.warm ? `rgba(255,233,162,${pulse})` : `rgba(150,235,255,${pulse})`;
  ctx.beginPath();
  ctx.arc(heroX + 56, heroY - 84, 3.4, 0, Math.PI * 2);
  ctx.fill();
};

const drawBench = (ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme, scale = 1) => {
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

const drawForeground = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
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
  if (index === 0 || index === 1) {
    ctx.fillStyle = "#7a6247";
    rounded(ctx, rect.x0 + 12, rect.y1 - 90, 58, 38, 6);
    ctx.fill();
    ctx.fillStyle = "#f4ead2";
    ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(index === 0 ? "日本の淡水" : "山から海へ", rect.x0 + 41, rect.y1 - 69);
    for (let i = 0; i < 8; i += 1) drawRock(ctx, rect.x0 + 14 + i * 9, rect.y1 - 14 - (i % 2) * 3, 6, 3, "rgba(114,105,86,0.68)", i * 0.2);
  }
  if (index === 9) {
    ctx.fillStyle = "rgba(220,246,250,0.28)";
    rounded(ctx, rect.x0 + 18, rect.y1 - 76, 42, 18, 8);
    ctx.fill();
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
 * 正方形レイアウト用の「館内そのもの」の地域差。
 * 旧レイアウトは壁面展示が中心で、rect.y0+190 より下が広い無地床に見えやすかった。
 * ここではセル全体に床インレイ・側景・光・植栽を伸ばし、スクショだけで地域が分かる密度にする。
 */
const drawGalleryFloorIdentity = (
  ctx: CanvasRenderingContext2D,
  rect: AquariumArea["rect"],
  theme: Theme,
  index: number,
  time: number,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const floorTop = rect.y0 + 194;
  const bottom = rect.y1 - 8;

  // セルの輪郭。隣の地域とつながっても「展示室が変わった」ことが分かる。
  ctx.strokeStyle = theme.warm ? "rgba(255,245,213,0.12)" : `${theme.accent}28`;
  ctx.lineWidth = 2;
  rounded(ctx, rect.x0 + 7, rect.y0 + 7, rect.x1 - rect.x0 - 14, rect.y1 - rect.y0 - 14, 18);
  ctx.stroke();

  // 奥から手前へ広がる床インレイ。単色床を避ける。
  ctx.save();
  ctx.globalAlpha = theme.warm ? 0.18 : 0.22;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 34, floorTop);
  ctx.quadraticCurveTo(cx - 92, rect.y0 + 288, cx - 122, bottom);
  ctx.lineTo(cx - 84, bottom);
  ctx.quadraticCurveTo(cx - 48, rect.y0 + 286, cx - 12, floorTop);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 34, floorTop);
  ctx.quadraticCurveTo(cx + 92, rect.y0 + 288, cx + 122, bottom);
  ctx.lineTo(cx + 84, bottom);
  ctx.quadraticCurveTo(cx + 48, rect.y0 + 286, cx + 12, floorTop);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 中央の小さな「広場」。空白ではなく回遊の余白として見せる。
  ctx.strokeStyle = theme.warm ? "rgba(255,244,207,0.20)" : `${theme.accent}45`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, rect.y0 + 326, 67, 34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, rect.y0 + 326, 48, 23, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 地域別の床・側景。薄いが面積を大きく取り、遠目でも色と形が変わる。
  switch (theme.mood) {
    case "satoyama": {
      ctx.strokeStyle = "rgba(114,177,145,0.34)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 18, rect.y0 + 238);
      ctx.bezierCurveTo(rect.x0 + 92, rect.y0 + 262, rect.x0 + 112, rect.y0 + 352, rect.x0 + 46, bottom);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) drawRock(ctx, rect.x1 - 26 - i * 12, bottom - 8 - (i % 2) * 5, 7, 3.5, "rgba(116,106,84,0.55)", i * 0.18);
      break;
    }
    case "mountain": {
      ctx.strokeStyle = "rgba(206,240,236,0.26)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 18, rect.y0 + 234 + i * 37);
        ctx.quadraticCurveTo(cx, rect.y0 + 210 + i * 45, rect.x1 - 18, rect.y0 + 245 + i * 34);
        ctx.stroke();
      }
      break;
    }
    case "great-river":
    case "mekong": {
      ctx.fillStyle = theme.mood === "mekong" ? "rgba(130,155,91,0.18)" : "rgba(160,169,131,0.17)";
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 34, floorTop + 12);
      ctx.bezierCurveTo(rect.x0 + 124, rect.y0 + 270, rect.x1 - 104, rect.y0 + 315, rect.x1 - 32, bottom);
      ctx.lineTo(rect.x1 - 74, bottom);
      ctx.bezierCurveTo(rect.x1 - 128, rect.y0 + 318, rect.x0 + 116, rect.y0 + 282, rect.x0 + 66, floorTop + 14);
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
        ctx.ellipse(x, rect.y0 + 310, 36, 68, 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(91,151,94,0.44)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 6; i += 1) {
        const sx = rect.x0 + 18 + i * 18;
        ctx.beginPath();
        ctx.moveTo(sx, bottom);
        ctx.quadraticCurveTo(sx + 18, rect.y0 + 340, sx + 4, rect.y0 + 286);
        ctx.stroke();
      }
      break;
    }
    case "africa": {
      ctx.fillStyle = "rgba(211,178,93,0.12)";
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(rect.x0 + 46 + i * 68, rect.y0 + 330 + (i % 2) * 20, 28, 13, 0.1 * i, 0, Math.PI * 2);
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
      ctx.strokeStyle = theme.mood === "cold-sea" ? "rgba(210,244,252,0.32)" : "rgba(125,213,231,0.28)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 20, rect.y0 + 248 + i * 34);
        ctx.quadraticCurveTo(cx, rect.y0 + 232 + i * 39, rect.x1 - 20, rect.y0 + 250 + i * 34);
        ctx.stroke();
      }
      if (theme.mood === "cold-sea") {
        ctx.fillStyle = "rgba(224,248,252,0.20)";
        for (const x of [rect.x0 + 48, rect.x1 - 54]) {
          ctx.beginPath();
          ctx.moveTo(x - 30, rect.y0 + 230);
          ctx.lineTo(x - 12, rect.y0 + 209);
          ctx.lineTo(x + 28, rect.y0 + 216);
          ctx.lineTo(x + 36, rect.y0 + 238);
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
        ctx.quadraticCurveTo(x + Math.sin(time + i) * 12, bottom - h * 0.5, x + Math.cos(time * 0.7 + i) * 9, bottom - h);
        ctx.stroke();
      }
      break;
    }
    case "indian":
    case "open-ocean": {
      ctx.strokeStyle = "rgba(132,218,242,0.24)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const y = rect.y0 + 230 + i * 28;
        ctx.beginPath();
        ctx.moveTo(rect.x0 + 18, y);
        ctx.quadraticCurveTo(cx + Math.sin(i) * 40, y - 9, rect.x1 - 18, y + 3);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i += 1) fishShadow(ctx, rect.x0 + 54 + i * 48, rect.y0 + 278 + (i % 3) * 24, 0.38 + (i % 2) * 0.12, 0.18, i % 2 ? -1 : 1);
      break;
    }
    case "deep-sea": {
      for (let i = 0; i < 18; i += 1) {
        const px = rect.x0 + 20 + ((i * 47) % 320);
        const py = rect.y0 + 220 + ((i * 71) % 178);
        const pulse = 0.25 + Math.abs(Math.sin(time * 1.2 + i)) * 0.3;
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
        ctx.ellipse(cx, rect.y0 + 322, 56 + i * 29, 24 + i * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i += 1) fishShadow(ctx, rect.x0 + 42 + i * 38, rect.y0 + 255 + (i % 4) * 25, 0.42 + (i % 3) * 0.1, 0.2, i % 2 ? -1 : 1);
      break;
    }
  }

  // サイン灯。セル下半分にも縦要素を置いて、ただの平面に見えないようにする。
  for (const x of [rect.x0 + 18, rect.x1 - 18]) {
    ctx.fillStyle = theme.warm ? "rgba(80,72,53,0.72)" : "rgba(8,27,36,0.72)";
    rounded(ctx, x - 4, rect.y0 + 238, 8, 72, 4);
    ctx.fill();
    const glow = 0.4 + Math.abs(Math.sin(time * 1.4 + x * 0.01)) * 0.2;
    ctx.fillStyle = theme.warm ? `rgba(255,233,174,${glow})` : `rgba(128,232,244,${glow})`;
    ctx.beginPath();
    ctx.arc(x, rect.y0 + 234, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawAmenities = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
  const tier = index < 2 ? 1 : index < 6 ? 2 : index < 10 ? 3 : index < 14 ? 4 : 5;
  if (tier >= 2) drawBench(ctx, rect.x0 + 52, rect.y0 + 352, theme, 0.9);
  if (tier >= 3) drawBench(ctx, rect.x1 - 52, rect.y0 + 374, theme, 0.95);
  if (tier >= 4) drawInfoTotem(ctx, rect.x0 + 64, rect.y0 + 236, theme, index);
  if (tier >= 2) {
    ctx.fillStyle = theme.warm ? "rgba(86,74,54,0.8)" : "rgba(9,27,36,0.8)";
    rounded(ctx, rect.x1 - 96, rect.y0 + 204, 70, 24, 9);
    ctx.fill();
    ctx.fillStyle = theme.light;
    ctx.font = '800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("次の展示 →", rect.x1 - 61, rect.y0 + 220);
  }
  if (tier >= 4) {
    const glow = ctx.createRadialGradient(rect.x0 + 64, rect.y0 + 226, 2, rect.x0 + 64, rect.y0 + 226, 40);
    glow.addColorStop(0, `${theme.accent}40`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x0 + 18, rect.y0 + 182, 92, 92);
  }
  if (index >= 14) {
    ctx.strokeStyle = `${theme.accent}3d`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 22, rect.y0 + 310);
    ctx.quadraticCurveTo((rect.x0 + rect.x1) / 2, rect.y0 + 285, rect.x1 - 22, rect.y0 + 310);
    ctx.stroke();
  }
};

export const drawAquariumHall = (ctx: CanvasRenderingContext2D, area: AquariumArea, time: number) => {
  const index = areaIndex(area.id);
  const theme = THEMES[index] ?? THEMES[0];
  const { rect } = area;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
  ctx.clip();
  const w = rect.x1 - rect.x0;
  const wall = ctx.createLinearGradient(0, rect.y0, 0, rect.y0 + 205);
  wall.addColorStop(0, theme.wallTop);
  wall.addColorStop(1, theme.wallBottom);
  ctx.fillStyle = wall;
  ctx.fillRect(rect.x0, rect.y0, w, 205);
  drawCeiling(ctx, rect, theme, time, index);
  drawHeader(ctx, rect, theme, index);
  drawDistantHabitat(ctx, rect, theme, time, index);
  drawPerspectiveFloor(ctx, rect, theme, index);
  drawGalleryFloorIdentity(ctx, rect, theme, index, time);
  drawAmenities(ctx, rect, theme, index);
  drawLandmarkFrame(ctx, rect, theme, index, time);
  drawForeground(ctx, rect, theme, index);
  const mirrored = index % 2 === 1;
  const points = mirrored
    ? [{ x: rect.x0 + 278, y: rect.y0 + 286 }, { x: rect.x0 + 190, y: rect.y0 + 330 }, { x: rect.x0 + 82, y: rect.y0 + 258 }]
    : [{ x: rect.x0 + 82, y: rect.y0 + 286 }, { x: rect.x0 + 176, y: rect.y0 + 330 }, { x: rect.x0 + 278, y: rect.y0 + 258 }];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const radius = i === 2 ? 56 : 40;
    const glow = ctx.createRadialGradient(p.x, p.y + 18, 2, p.x, p.y + 18, radius);
    glow.addColorStop(0, theme.warm ? "rgba(255,248,208,0.2)" : `${theme.accent}2c`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - radius, p.y - 5, radius * 2, 68);
  }
  ctx.textAlign = "center";
  ctx.restore();
};
