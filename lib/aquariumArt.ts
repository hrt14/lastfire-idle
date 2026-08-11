import {
  clipTankInterior,
  drawSwimBand,
  drawTankFrame,
  getAquariumDisplay,
} from "./aquariumDisplay";

type Habitat =
  | "satogawa"
  | "mountain"
  | "great-river"
  | "mekong"
  | "flooded-forest"
  | "africa"
  | "amazon"
  | "amazon-giant"
  | "japan-sea"
  | "cold-sea"
  | "okinawa"
  | "kelp"
  | "seasia"
  | "great-reef"
  | "indian"
  | "open-ocean"
  | "deep-sea"
  | "world-ocean";

type Creature =
  | "tiny"
  | "small"
  | "round"
  | "loach"
  | "trout"
  | "carp"
  | "catfish"
  | "knife"
  | "betta"
  | "arowana"
  | "cichlid"
  | "perch"
  | "angel"
  | "discus"
  | "piranha"
  | "ray"
  | "turtle"
  | "bream"
  | "rockfish"
  | "octopus"
  | "eel"
  | "salmon"
  | "crab"
  | "clown"
  | "butterfly"
  | "shark"
  | "lionfish"
  | "puffer"
  | "napoleon"
  | "tuna"
  | "isopod"
  | "angler"
  | "manta"
  | "whale-shark";

type Pattern = "none" | "spots" | "stripes" | "red-belly" | "neon" | "glow";

type ExhibitVisual = {
  name: string;
  habitat: Habitat;
  primary: Creature;
  secondary?: Creature;
  count: number;
  color: string;
  secondaryColor?: string;
  heroScale?: number;
  pattern?: Pattern;
  density?: number;
};

const TAU = Math.PI * 2;

/**
 * 18地域 × 3展示。名前が変われば必ず別設定を使う。
 * 同地域内でも魚のシルエット・色・匹数・主役サイズの最低2点を変える。
 */
const EXHIBITS: ExhibitVisual[][] = [
  [
    { name: "メダカの群れ", habitat: "satogawa", primary: "tiny", count: 9, color: "#e9d982", pattern: "none" },
    { name: "ドジョウとフナ", habitat: "satogawa", primary: "loach", secondary: "round", count: 5, color: "#8b7048", secondaryColor: "#c7a66b" },
    { name: "オイカワ・タナゴ・ナマズ", habitat: "satogawa", primary: "small", secondary: "catfish", count: 7, color: "#72c2d1", secondaryColor: "#506b69", heroScale: 1.45, pattern: "neon" },
  ],
  [
    { name: "アユ", habitat: "mountain", primary: "trout", count: 5, color: "#c6d9c2" },
    { name: "ヤマメ", habitat: "mountain", primary: "trout", count: 4, color: "#aab6a1", pattern: "spots", heroScale: 1.08 },
    { name: "イワナ", habitat: "mountain", primary: "trout", count: 3, color: "#596f67", pattern: "spots", heroScale: 1.32 },
  ],
  [
    { name: "コイの群れ", habitat: "great-river", primary: "carp", count: 6, color: "#d4a56b", heroScale: 1.08 },
    { name: "フナ・ドジョウ", habitat: "great-river", primary: "round", secondary: "loach", count: 6, color: "#9d9275", secondaryColor: "#6f6248" },
    { name: "大型ナマズ", habitat: "great-river", primary: "catfish", count: 2, color: "#526e72", heroScale: 1.85 },
  ],
  [
    { name: "ラスボラ", habitat: "mekong", primary: "tiny", count: 12, color: "#d1a65e", pattern: "stripes" },
    { name: "グラミー・ナイフフィッシュ", habitat: "mekong", primary: "round", secondary: "knife", count: 5, color: "#7db6ac", secondaryColor: "#8d9ba6", heroScale: 1.25 },
    { name: "メコンの巨大ナマズ", habitat: "mekong", primary: "catfish", count: 1, color: "#b7c1b4", heroScale: 2.25 },
  ],
  [
    { name: "ベタと小型魚", habitat: "flooded-forest", primary: "betta", secondary: "tiny", count: 6, color: "#dc6488", secondaryColor: "#88c6a9", heroScale: 1.25 },
    { name: "クラウンローチ", habitat: "flooded-forest", primary: "loach", count: 6, color: "#e6a341", pattern: "stripes" },
    { name: "アジアアロワナ", habitat: "flooded-forest", primary: "arowana", count: 2, color: "#c96842", heroScale: 1.85 },
  ],
  [
    { name: "コンゴテトラ", habitat: "africa", primary: "small", count: 9, color: "#b7d7d4", pattern: "neon" },
    { name: "カラフルシクリッド", habitat: "africa", primary: "cichlid", count: 10, color: "#f2c84b", secondaryColor: "#5da7d6", pattern: "stripes" },
    { name: "ナイルパーチ級大型魚", habitat: "africa", primary: "perch", count: 2, color: "#9aa48d", heroScale: 1.95 },
  ],
  [
    { name: "ネオンテトラの大群", habitat: "amazon", primary: "tiny", count: 18, color: "#42c4ed", secondaryColor: "#e85a68", pattern: "neon", density: 1.35 },
    { name: "コリドラス・エンゼルフィッシュ", habitat: "amazon", primary: "small", secondary: "angel", count: 7, color: "#a8a58d", secondaryColor: "#d8d6c8", heroScale: 1.28, pattern: "stripes" },
    { name: "ディスカス", habitat: "amazon", primary: "discus", count: 5, color: "#e7764e", secondaryColor: "#5aa8c0", pattern: "stripes", heroScale: 1.18 },
  ],
  [
    { name: "ピラニア", habitat: "amazon-giant", primary: "piranha", count: 8, color: "#7b8580", secondaryColor: "#d55748", pattern: "red-belly" },
    { name: "淡水エイ・アロワナ", habitat: "amazon-giant", primary: "ray", secondary: "arowana", count: 3, color: "#8c7762", secondaryColor: "#b86f45", heroScale: 1.45, pattern: "spots" },
    { name: "ピラルク", habitat: "amazon-giant", primary: "arowana", count: 1, color: "#4e5c55", secondaryColor: "#bc4b46", heroScale: 2.55, pattern: "red-belly" },
  ],
  [
    { name: "イワシ・アジの群れ", habitat: "japan-sea", primary: "small", count: 17, color: "#c8dce1", pattern: "neon", density: 1.25 },
    { name: "タイ・カサゴ", habitat: "japan-sea", primary: "bream", secondary: "rockfish", count: 6, color: "#e58e82", secondaryColor: "#b85a42", heroScale: 1.3 },
    { name: "タコ・ウツボ", habitat: "japan-sea", primary: "octopus", secondary: "eel", count: 3, color: "#ad685f", secondaryColor: "#8b8b55", heroScale: 1.45, pattern: "spots" },
  ],
  [
    { name: "サケ", habitat: "cold-sea", primary: "salmon", count: 5, color: "#b8c7ca", secondaryColor: "#d56f62", heroScale: 1.18 },
    { name: "ホッケと冷水魚", habitat: "cold-sea", primary: "small", secondary: "rockfish", count: 8, color: "#9fb1b6", secondaryColor: "#7b8790" },
    { name: "北海のカニ", habitat: "cold-sea", primary: "crab", count: 4, color: "#c86b51", heroScale: 1.45 },
  ],
  [
    { name: "クマノミ・スズメダイ", habitat: "okinawa", primary: "clown", secondary: "tiny", count: 11, color: "#f28c42", secondaryColor: "#4aa8df", pattern: "stripes" },
    { name: "チョウチョウウオ・ツノダシ", habitat: "okinawa", primary: "butterfly", count: 8, color: "#f3d247", secondaryColor: "#252f3a", pattern: "stripes", heroScale: 1.12 },
    { name: "ウミガメ", habitat: "okinawa", primary: "turtle", secondary: "tiny", count: 5, color: "#5d8a67", secondaryColor: "#7bd3da", heroScale: 1.85 },
  ],
  [
    { name: "ケルプの小魚群", habitat: "kelp", primary: "small", count: 13, color: "#c7d6b4", density: 1.1 },
    { name: "ロックフィッシュ", habitat: "kelp", primary: "rockfish", count: 6, color: "#d87750", heroScale: 1.22 },
    { name: "小型サメ", habitat: "kelp", primary: "shark", secondary: "small", count: 4, color: "#7798a4", secondaryColor: "#c5d4c0", heroScale: 1.5 },
  ],
  [
    { name: "ハナダイの大群", habitat: "seasia", primary: "tiny", count: 19, color: "#ed7e87", secondaryColor: "#f4ae63", density: 1.4 },
    { name: "ミノカサゴ・フグ", habitat: "seasia", primary: "lionfish", secondary: "puffer", count: 4, color: "#c76d56", secondaryColor: "#e2c873", heroScale: 1.35, pattern: "stripes" },
    { name: "小型エイ", habitat: "seasia", primary: "ray", secondary: "tiny", count: 5, color: "#7c8e8b", secondaryColor: "#e0a56d", heroScale: 1.55, pattern: "spots" },
  ],
  [
    { name: "巨大サンゴ礁の魚群", habitat: "great-reef", primary: "tiny", secondary: "butterfly", count: 22, color: "#63b8e5", secondaryColor: "#f2d158", density: 1.55 },
    { name: "ウミガメ・大型エイ", habitat: "great-reef", primary: "turtle", secondary: "ray", count: 4, color: "#668d6d", secondaryColor: "#889598", heroScale: 1.7 },
    { name: "リーフシャーク", habitat: "great-reef", primary: "shark", secondary: "tiny", count: 5, color: "#829ea7", secondaryColor: "#f2be64", heroScale: 1.72 },
  ],
  [
    { name: "ナポレオンフィッシュ", habitat: "indian", primary: "napoleon", count: 2, color: "#4f9c91", heroScale: 1.8 },
    { name: "大型エイ", habitat: "indian", primary: "ray", count: 2, color: "#75878c", heroScale: 2.05, pattern: "spots" },
    { name: "大型サメ", habitat: "indian", primary: "shark", count: 2, color: "#718b99", heroScale: 2.15 },
  ],
  [
    { name: "イワシ200匹級の大群", habitat: "open-ocean", primary: "tiny", count: 28, color: "#d4e5ea", pattern: "neon", density: 1.9 },
    { name: "マグロ・カツオ", habitat: "open-ocean", primary: "tuna", count: 7, color: "#5f8da8", secondaryColor: "#d5dfe0", heroScale: 1.38 },
    { name: "サメ・大型エイ", habitat: "open-ocean", primary: "shark", secondary: "ray", count: 4, color: "#718b9d", secondaryColor: "#7c8e96", heroScale: 1.95 },
  ],
  [
    { name: "オオグソクムシ", habitat: "deep-sea", primary: "isopod", count: 4, color: "#8891a0", heroScale: 1.38 },
    { name: "タカアシガニ", habitat: "deep-sea", primary: "crab", count: 2, color: "#b45f54", heroScale: 2.05 },
    { name: "発光深海魚", habitat: "deep-sea", primary: "angler", secondary: "tiny", count: 8, color: "#28364c", secondaryColor: "#6de7e0", heroScale: 1.55, pattern: "glow" },
  ],
  [
    { name: "世界の魚群", habitat: "world-ocean", primary: "small", secondary: "butterfly", count: 26, color: "#b8dbe8", secondaryColor: "#edc65e", density: 1.7 },
    { name: "マンタ・大型サメ", habitat: "world-ocean", primary: "manta", secondary: "shark", count: 4, color: "#596f7c", secondaryColor: "#7c939f", heroScale: 2.0 },
    { name: "ジンベエザメ級の巨大魚", habitat: "world-ocean", primary: "whale-shark", secondary: "tiny", count: 8, color: "#557b91", secondaryColor: "#d4e9ec", heroScale: 2.65, pattern: "spots" },
  ],
];

const HABITAT_COLORS: Record<Habitat, [string, string, string]> = {
  satogawa: ["#bfe9e3", "#65b9b2", "#c9b988"],
  mountain: ["#bce9f1", "#4a9fb6", "#788c88"],
  "great-river": ["#9fc7aa", "#5d8a72", "#8b7b58"],
  mekong: ["#9fb28b", "#60785b", "#7d6746"],
  "flooded-forest": ["#73a78e", "#345f50", "#493c2c"],
  africa: ["#a6b881", "#697b54", "#a58a55"],
  amazon: ["#66a98d", "#2c6e5b", "#4b3d2a"],
  "amazon-giant": ["#4b8b76", "#205548", "#443629"],
  "japan-sea": ["#8bd1dd", "#3d90a6", "#777b70"],
  "cold-sea": ["#a5cbd8", "#496f87", "#6d7781"],
  okinawa: ["#7ee4eb", "#168eaa", "#f2d0a0"],
  kelp: ["#79aa8f", "#2f6c59", "#485744"],
  seasia: ["#70d7dc", "#1b91a2", "#dfb47d"],
  "great-reef": ["#79e2e2", "#1d9caf", "#e8bd84"],
  indian: ["#68b5d3", "#276c8e", "#526979"],
  "open-ocean": ["#4c9dcc", "#12527c", "#163e5c"],
  "deep-sea": ["#1b365d", "#07152e", "#101a31"],
  "world-ocean": ["#66c5e5", "#176f9e", "#2a657d"],
};

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const seeded = (seed: number, n: number) => {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const fishBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
  color: string,
  dir = 1,
) => {
  // 魚が背景に埋もれないよう、全魚共通で濃い輪郭と小さなハイライトを持たせる。
  // リアルさより「スマホで一目で魚だと読める」ことを優先する。
  const outline = "rgba(5,22,28,0.84)";
  const line = Math.max(0.85, Math.min(1.8, sy * 0.42));

  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.ellipse(x, y, sx, sy, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - dir * sx * 0.85, y);
  ctx.lineTo(x - dir * sx * 1.55, y - sy * 1.05);
  ctx.lineTo(x - dir * sx * 1.55, y + sy * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 上面の反射を一筋だけ入れ、小さい魚でも立体に見せる。
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.beginPath();
  ctx.ellipse(
    x + dir * sx * 0.12,
    y - sy * 0.34,
    Math.max(0.8, sx * 0.34),
    Math.max(0.35, sy * 0.16),
    -0.08 * dir,
    0,
    TAU,
  );
  ctx.fill();

  ctx.fillStyle = "#102b31";
  ctx.beginPath();
  ctx.arc(x + dir * sx * 0.62, y - sy * 0.18, Math.max(0.55, sy * 0.18), 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x + dir * sx * 0.66, y - sy * 0.23, Math.max(0.22, sy * 0.07), 0, TAU);
  ctx.fill();
};

const applyPattern = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sx: number,
  sy: number,
  pattern: Pattern,
  dir: number,
  accent: string,
) => {
  if (pattern === "none") return;
  if (pattern === "spots") {
    ctx.fillStyle = accent;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(x - sx * 0.45 + i * sx * 0.3, y + (i % 2 ? 0.3 : -0.4) * sy, Math.max(0.4, sy * 0.18), 0, TAU);
      ctx.fill();
    }
  } else if (pattern === "stripes") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(0.7, sx * 0.12);
    for (let i = -1; i <= 1; i += 1) {
      const xx = x + i * sx * 0.34 * dir;
      ctx.beginPath();
      ctx.moveTo(xx, y - sy * 0.75);
      ctx.lineTo(xx - dir * sx * 0.1, y + sy * 0.75);
      ctx.stroke();
    }
  } else if (pattern === "red-belly") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x + dir * sx * 0.08, y + sy * 0.48, sx * 0.58, sy * 0.38, 0, 0, TAU);
    ctx.fill();
  } else if (pattern === "neon") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - sx * 0.7, y - sy * 0.1);
    ctx.lineTo(x + sx * 0.7, y - sy * 0.1);
    ctx.stroke();
  } else if (pattern === "glow") {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x + dir * sx * 0.68, y - sy * 0.35, Math.max(1.2, sy * 0.55), 0, TAU);
    ctx.fill();
  }
};

const drawCreature = (
  ctx: CanvasRenderingContext2D,
  kind: Creature,
  x: number,
  y: number,
  scale: number,
  color: string,
  pattern: Pattern = "none",
  accent = "rgba(255,255,255,0.72)",
  dir = 1,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const d = 1;
  switch (kind) {
    case "tiny":
      fishBody(ctx, 0, 0, 3.1 * scale, 1.35 * scale, color, d);
      applyPattern(ctx, 0, 0, 3.1 * scale, 1.35 * scale, pattern, d, accent);
      break;
    case "small":
      fishBody(ctx, 0, 0, 4.6 * scale, 2 * scale, color, d);
      applyPattern(ctx, 0, 0, 4.6 * scale, 2 * scale, pattern, d, accent);
      break;
    case "round":
    case "carp":
    case "cichlid":
    case "discus":
    case "bream": {
      const tall = kind === "discus" ? 4.5 : kind === "cichlid" || kind === "bream" ? 3.5 : 3;
      const wide = kind === "carp" ? 6.2 : kind === "discus" ? 4.6 : 5.2;
      fishBody(ctx, 0, 0, wide * scale, tall * scale, color, d);
      if (kind === "carp") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(5 * scale, 1.2 * scale); ctx.lineTo(8 * scale, 2.4 * scale); ctx.stroke();
      }
      applyPattern(ctx, 0, 0, wide * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "loach":
    case "knife":
    case "eel":
    case "arowana": {
      const long = kind === "eel" ? 9.8 : kind === "arowana" ? 8.2 : kind === "knife" ? 7.6 : 6.6;
      const tall = kind === "eel" ? 1.4 : kind === "knife" ? 1.7 : 2.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, long * scale, tall * scale, 0, 0, TAU);
      ctx.fill();
      if (kind !== "eel") {
        ctx.beginPath();
        ctx.moveTo(-long * scale * 0.85, 0);
        ctx.lineTo(-long * scale * 1.18, -2.4 * scale);
        ctx.lineTo(-long * scale * 1.18, 2.4 * scale);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#243b45";
      ctx.beginPath(); ctx.arc(long * scale * 0.62, -0.5 * scale, 0.7 * scale, 0, TAU); ctx.fill();
      applyPattern(ctx, 0, 0, long * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "trout":
    case "salmon":
    case "perch":
    case "napoleon":
    case "tuna": {
      const sx = kind === "tuna" ? 8.2 : kind === "napoleon" ? 7.6 : kind === "perch" ? 7.2 : 6.8;
      const sy = kind === "napoleon" ? 4.1 : kind === "perch" ? 3.2 : 2.7;
      fishBody(ctx, 0, 0, sx * scale, sy * scale, color, d);
      if (kind === "salmon") {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(0.8 * scale, 1.3 * scale, 3.6 * scale, 0.8 * scale, 0, 0, TAU); ctx.fill();
      }
      if (kind === "napoleon") {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(4.4 * scale, -3 * scale, 2.4 * scale, Math.PI, TAU); ctx.fill();
      }
      applyPattern(ctx, 0, 0, sx * scale, sy * scale, pattern, d, accent);
      break;
    }
    case "catfish":
      fishBody(ctx, 0, 0, 7.6 * scale, 2.8 * scale, color, d);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.8;
      for (const dy of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(5.5 * scale, dy * 1.1 * scale); ctx.quadraticCurveTo(10 * scale, dy * 2.2 * scale, 12 * scale, dy * 4 * scale); ctx.stroke();
      }
      break;
    case "betta":
      fishBody(ctx, 1 * scale, 0, 4.5 * scale, 2.3 * scale, color, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-5 * scale, 0, 4.2 * scale, 4.4 * scale, 0, 0, TAU); ctx.fill();
      break;
    case "angel":
    case "butterfly":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-5 * scale, 0); ctx.quadraticCurveTo(0, -7 * scale, 5 * scale, 0); ctx.quadraticCurveTo(0, 7 * scale, -5 * scale, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4 * scale, 0); ctx.lineTo(-8 * scale, -4 * scale); ctx.lineTo(-8 * scale, 4 * scale); ctx.closePath(); ctx.fill();
      applyPattern(ctx, 0, 0, 5 * scale, 6 * scale, pattern, d, accent);
      break;
    case "piranha":
      fishBody(ctx, 0, 0, 5.8 * scale, 3.3 * scale, color, d);
      applyPattern(ctx, 0, 0, 5.8 * scale, 3.3 * scale, pattern, d, accent);
      ctx.fillStyle = "#f4eee2";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(4.3 * scale + i * 0.7, 1 * scale); ctx.lineTo(4.7 * scale + i * 0.7, 2 * scale); ctx.lineTo(5.1 * scale + i * 0.7, 1 * scale); ctx.fill();
      }
      break;
    case "ray":
    case "manta": {
      const wide = kind === "manta" ? 11 : 8.4;
      const tall = kind === "manta" ? 5 : 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-wide * scale, 0); ctx.quadraticCurveTo(-3 * scale, -tall * scale, 0, -2 * scale); ctx.quadraticCurveTo(3 * scale, -tall * scale, wide * scale, 0); ctx.quadraticCurveTo(2 * scale, tall * scale, 0, 2 * scale); ctx.quadraticCurveTo(-2 * scale, tall * scale, -wide * scale, 0); ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath(); ctx.moveTo(0, 2 * scale); ctx.quadraticCurveTo(2 * scale, 8 * scale, 1 * scale, 12 * scale); ctx.stroke();
      applyPattern(ctx, 0, 0, wide * scale, tall * scale, pattern, d, accent);
      break;
    }
    case "turtle":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 * scale, 4.5 * scale, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(6.8 * scale, -0.2 * scale, 2.1 * scale, 0, TAU); ctx.fill();
      for (const [px, py, rx, ry] of [[-4, -4, 3, 1.2], [3, -4, 3, 1.2], [-4, 4, 3, 1.2], [3, 4, 3, 1.2]] as const) {
        ctx.beginPath(); ctx.ellipse(px * scale, py * scale, rx * scale, ry * scale, 0, 0, TAU); ctx.fill();
      }
      break;
    case "rockfish":
      fishBody(ctx, 0, 0, 5.4 * scale, 3.5 * scale, color, d);
      ctx.strokeStyle = accent; ctx.lineWidth = 0.9;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(i * 1.5 * scale, -2.6 * scale); ctx.lineTo(i * 1.6 * scale, -5.3 * scale); ctx.stroke(); }
      break;
    case "octopus":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, -2 * scale, 5.4 * scale, 5 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5 * scale;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * 1.2 * scale, 1 * scale); ctx.quadraticCurveTo(i * 2 * scale, 6 * scale, (i + (i % 2 ? 1 : -1)) * 2.4 * scale, 8 * scale); ctx.stroke();
      }
      break;
    case "crab":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 5.2 * scale, 3.2 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.2 * scale;
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(side * 3.5 * scale, (i - 1) * 1.2 * scale); ctx.lineTo(side * (7 + i) * scale, (i - 1.2) * 3 * scale); ctx.stroke();
      }
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(side * 7 * scale, -3.2 * scale, 2.1 * scale, 0, TAU); ctx.fill();
      }
      break;
    case "clown":
      fishBody(ctx, 0, 0, 4.8 * scale, 2.5 * scale, color, d);
      applyPattern(ctx, 0, 0, 4.8 * scale, 2.5 * scale, "stripes", d, "#f7f4df");
      break;
    case "shark":
    case "whale-shark": {
      const sx = kind === "whale-shark" ? 11.5 : 8.5;
      const sy = kind === "whale-shark" ? 3.7 : 3.1;
      fishBody(ctx, 0, 0, sx * scale, sy * scale, color, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-1 * scale, -2 * scale); ctx.lineTo(1 * scale, -7 * scale); ctx.lineTo(3 * scale, -2 * scale); ctx.closePath(); ctx.fill();
      if (kind === "whale-shark" || pattern === "spots") applyPattern(ctx, 0, 0, sx * scale, sy * scale, "spots", d, "rgba(230,245,245,0.9)");
      break;
    }
    case "lionfish":
      fishBody(ctx, 0, 0, 5 * scale, 2.8 * scale, color, d);
      ctx.strokeStyle = accent; ctx.lineWidth = 0.8;
      for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(i * scale, -2 * scale); ctx.lineTo(i * 1.8 * scale, -7 * scale); ctx.stroke(); }
      applyPattern(ctx, 0, 0, 5 * scale, 2.8 * scale, "stripes", d, accent);
      break;
    case "puffer":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, 4.2 * scale, 0, TAU); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.7;
      for (let i = 0; i < 10; i += 1) { const a = (i / 10) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3.5 * scale, Math.sin(a) * 3.5 * scale); ctx.lineTo(Math.cos(a) * 6 * scale, Math.sin(a) * 6 * scale); ctx.stroke(); }
      break;
    case "isopod":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, 6.5 * scale, 3.6 * scale, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 0.65;
      for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(i * 1.4 * scale, -3 * scale); ctx.lineTo(i * 1.4 * scale, 3 * scale); ctx.stroke(); }
      break;
    case "angler":
      fishBody(ctx, 0, 0, 6.4 * scale, 4.1 * scale, color, d);
      ctx.strokeStyle = accent; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(3 * scale, -3 * scale); ctx.quadraticCurveTo(6 * scale, -9 * scale, 8 * scale, -6 * scale); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(8 * scale, -6 * scale, 1.8 * scale, 0, TAU); ctx.fill();
      break;
  }
  ctx.restore();
};

const drawHabitat = (ctx: CanvasRenderingContext2D, habitat: Habitat, seed: number) => {
  const [top, bottom, floor] = HABITAT_COLORS[habitat];
  const water = ctx.createLinearGradient(0, -18, 0, 20);
  water.addColorStop(0, top);
  water.addColorStop(1, bottom);
  ctx.fillStyle = water;
  rr(ctx, -38, -19, 76, 40, 12);
  ctx.fill();

  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(-38, 12); ctx.quadraticCurveTo(-10, 6 + seeded(seed, 1) * 6, 8, 13); ctx.quadraticCurveTo(26, 18, 38, 10); ctx.lineTo(38, 21); ctx.lineTo(-38, 21); ctx.closePath();
  ctx.fill();

  const roots = habitat === "mekong" || habitat === "flooded-forest" || habitat === "amazon" || habitat === "amazon-giant";
  const rocky = habitat === "mountain" || habitat === "africa" || habitat === "japan-sea" || habitat === "cold-sea";
  const coral = habitat === "okinawa" || habitat === "seasia" || habitat === "great-reef";
  if (roots) {
    ctx.strokeStyle = habitat === "flooded-forest" ? "#382d22" : "#57452f";
    ctx.lineWidth = 3.4;
    for (let i = 0; i < 4; i += 1) {
      const x = -31 + i * 20 + seeded(seed, i + 7) * 5;
      ctx.beginPath(); ctx.moveTo(x, -18); ctx.bezierCurveTo(x + 8, -5, x - 9, 5, x + 2, 17); ctx.stroke();
    }
  }
  if (rocky) {
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(75,92,92,0.72)" : "rgba(115,125,116,0.75)";
      ctx.beginPath(); ctx.ellipse(-30 + i * 15, 13 - (i % 2) * 3, 7 + (i % 3), 4 + (i % 2), -0.2 + i * 0.1, 0, TAU); ctx.fill();
    }
  }
  if (coral) {
    const colors = habitat === "great-reef" ? ["#ee7f75", "#e8c652", "#a779d8", "#62c6b4"] : ["#e48a77", "#e9c76e", "#a689cf"];
    for (let i = 0; i < (habitat === "great-reef" ? 8 : 5); i += 1) {
      const x = -31 + i * (habitat === "great-reef" ? 9 : 15);
      ctx.strokeStyle = colors[i % colors.length]; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x + (i % 2 ? 2 : -2), 7); ctx.lineTo(x + (i % 3 - 1) * 4, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x + 5, 5); ctx.stroke();
    }
  }
  if (habitat === "kelp") {
    for (let i = 0; i < 6; i += 1) {
      const x = -32 + i * 13;
      ctx.strokeStyle = i % 2 ? "#356b47" : "#4a8254"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.bezierCurveTo(x + 7, 6, x - 6, -5, x + 3, -18); ctx.stroke();
      ctx.fillStyle = "rgba(76,132,82,0.8)";
      for (let y = 8; y > -14; y -= 8) { ctx.beginPath(); ctx.ellipse(x + (y % 16 ? 4 : -3), y, 5, 1.8, 0.4, 0, TAU); ctx.fill(); }
    }
  }
  if (habitat === "satogawa") {
    for (let i = 0; i < 9; i += 1) { ctx.fillStyle = i % 2 ? "#d8c79e" : "#aa9c78"; ctx.beginPath(); ctx.ellipse(-32 + i * 8, 15, 3.5, 2, i * 0.2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "#5d9270"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i += 1) { const x = -28 + i * 17; ctx.beginPath(); ctx.moveTo(x, 15); ctx.quadraticCurveTo(x + 2, 5, x - 1, 1); ctx.stroke(); }
  }
  if (habitat === "open-ocean" || habitat === "indian" || habitat === "world-ocean") {
    ctx.strokeStyle = "rgba(220,248,255,0.2)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(-31 + i * 24, -18); ctx.lineTo(-18 + i * 24, 18); ctx.stroke(); }
  }
  if (habitat === "deep-sea") {
    ctx.fillStyle = "rgba(6,12,28,0.55)"; rr(ctx, -38, -19, 76, 40, 12); ctx.fill();
    for (let i = 0; i < 7; i += 1) { ctx.fillStyle = `rgba(89,226,220,${0.25 + seeded(seed, i) * 0.5})`; ctx.beginPath(); ctx.arc(-32 + seeded(seed, i + 20) * 64, -14 + seeded(seed, i + 30) * 28, 0.7 + seeded(seed, i + 40), 0, TAU); ctx.fill(); }
  }
};

const drawSchool = (ctx: CanvasRenderingContext2D, visual: ExhibitVisual, seed: number) => {
  const hero = Math.max(1, visual.heroScale ?? 1);
  const count = Math.max(1, visual.count);
  const density = visual.density ?? 1;
  const primaryCount = visual.secondary ? Math.max(1, Math.round(count * 0.72)) : count;
  const accent = visual.secondaryColor ?? "rgba(244,248,237,0.8)";

  for (let i = 0; i < primaryCount; i += 1) {
    const isHero = i === 0 && hero > 1.35;
    const s = (isHero ? hero : 0.78 + seeded(seed, i + 4) * 0.32) * (count > 20 ? 0.72 : count > 14 ? 0.82 : 1);
    const x = isHero ? 2 : -29 + seeded(seed, i + 50) * 58;
    const y = isHero ? -1 : -11 + seeded(seed, i + 90) * (22 / density);
    const dir = seeded(seed, i + 120) > 0.22 ? 1 : -1;
    drawCreature(ctx, visual.primary, x, y, s, visual.color, visual.pattern ?? "none", accent, dir);
  }

  if (visual.secondary) {
    const secondaryCount = Math.max(1, count - primaryCount);
    for (let i = 0; i < secondaryCount; i += 1) {
      const s = (0.9 + seeded(seed, i + 180) * 0.25) * (visual.heroScale && visual.heroScale > 1.4 ? 1.15 : 1);
      const x = -24 + seeded(seed, i + 210) * 50;
      const y = -9 + seeded(seed, i + 240) * 18;
      drawCreature(ctx, visual.secondary, x, y, s, visual.secondaryColor ?? accent, "none", visual.color, seeded(seed, i + 270) > 0.35 ? 1 : -1);
    }
  }
};

/**
 * `aquarium-{area}-{index}` を描く。54展示すべて別設定。
 * Shop.tsx側から generic fish より前に呼ぶ。
 */
export const drawAquariumExhibit = (
  ctx: CanvasRenderingContext2D,
  art: string,
  seed: number,
) => {
  const match = /^aquarium-(\d+)-(\d+)$/.exec(art);
  if (!match) return false;
  const area = Number(match[1]);
  const index = Number(match[2]) - 1;
  const visual = EXHIBITS[area]?.[index];
  if (!visual) return false;

  const display = getAquariumDisplay(area, index + 1);

  ctx.save();
  ctx.scale(display.tankScale, display.tankScale);

  // 水槽タイプごとに窓形状を変え、その中だけに生息環境と魚を描く。
  ctx.save();
  clipTankInterior(ctx, display.profile);
  ctx.clip();

  drawHabitat(ctx, visual.habitat, seed + area * 31 + index * 7);
  drawSwimBand(ctx, display.profile, display.outlineMode);

  // 魚は少し大きくし、背景色に応じたリム光を付ける。
  // 特に小魚の群れが「模様」にならず、一匹ずつ読めることを狙う。
  ctx.save();
  ctx.scale(display.fishScaleBoost, display.fishScaleBoost);
  ctx.shadowColor = display.outlineMode === "light"
    ? `rgba(218,248,255,${0.48 * display.contrastBoost})`
    : `rgba(1,16,20,${0.58 * display.contrastBoost})`;
  ctx.shadowBlur = display.hero ? 3.6 : 2.4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  drawSchool(ctx, visual, seed + area * 101 + index * 17);
  ctx.restore();

  ctx.restore();
  drawTankFrame(ctx, display.profile, display.hero, area);
  ctx.restore();

  return true;
};
