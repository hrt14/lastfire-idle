export type TankProfile =
  | "freshSmall"
  | "stream"
  | "panorama"
  | "cylinder"
  | "reefDome"
  | "jungleRiver"
  | "kelpTall"
  | "tunnel"
  | "megaWall"
  | "deepSeaLab"
  /* --- 施設棟 --- */
  /** ショップの商品ケース。棚板が入り、木と真鍮の枠 */
  | "shopCase"
  /** レストランの窓。上がアーチで、席側から見上げる形 */
  | "diningWindow"
  /** 両生類・爬虫類のケージ。水と陸が半分ずつ */
  | "terrarium"
  /* --- 古代棟 --- */
  /** 石の額で囲った古代大水槽。本館の megaWall と一目で違う */
  | "ancientWall"
  /** 真鍮のリングをはめた丸窓。時代をのぞきこむ形 */
  | "deepTime"
  /** 上に氷が張った窓。氷河期の海 */
  | "iceTank"
  /** 横に長く浅い水盤。まだ体の小さい時代の海 */
  | "shallowPan"
  /** 熱水噴出孔の縦長カラム。生命誕生の海 */
  | "ventColumn";

export type AquariumDisplay = {
  profile: TankProfile;
  hero: boolean;
  tankScale: number;
  fishScaleBoost: number;
  contrastBoost: number;
  outlineMode: "dark" | "light";
  /** 群れを泳がせる帯の上下ずらし。窓の形で見える範囲が変わるので合わせる */
  bandShift: number;
};

const PROFILES: TankProfile[][] = [
  ["freshSmall", "freshSmall", "panorama"],
  ["stream", "stream", "panorama"],
  ["panorama", "panorama", "jungleRiver"],
  ["jungleRiver", "jungleRiver", "jungleRiver"],
  ["jungleRiver", "jungleRiver", "jungleRiver"],
  ["panorama", "panorama", "megaWall"],
  ["jungleRiver", "jungleRiver", "jungleRiver"],
  ["jungleRiver", "panorama", "megaWall"],
  ["panorama", "panorama", "megaWall"],
  ["kelpTall", "kelpTall", "megaWall"],
  ["reefDome", "reefDome", "reefDome"],
  ["kelpTall", "kelpTall", "kelpTall"],
  ["panorama", "reefDome", "megaWall"],
  ["reefDome", "reefDome", "reefDome"],
  ["panorama", "megaWall", "megaWall"],
  ["megaWall", "megaWall", "tunnel"],
  ["deepSeaLab", "deepSeaLab", "deepSeaLab"],
  // WORLD OCEAN は2つの強化展示から、最後に壁一面の中央大水槽へ収束する。
  ["panorama", "reefDome", "megaWall"],

  /* ---- 施設棟（18〜21）。水槽ではないので枠から変える ---- */
  ["shopCase", "shopCase", "shopCase"],
  ["diningWindow", "diningWindow", "megaWall"],
  ["terrarium", "terrarium", "terrarium"],
  ["terrarium", "terrarium", "ancientWall"],

  /* ---- 古代棟（22〜53）。時代が古いほど、丸窓と浅い水盤が増える ---- */
  ["panorama", "freshSmall", "ancientWall"],
  ["shallowPan", "panorama", "panorama"],
  ["iceTank", "iceTank", "ancientWall"],
  ["deepTime", "panorama", "megaWall"],
  ["panorama", "panorama", "ancientWall"],
  ["shallowPan", "panorama", "panorama"],
  ["iceTank", "panorama", "ancientWall"],
  ["panorama", "panorama", "megaWall"],
  ["shallowPan", "shallowPan", "ancientWall"],
  ["jungleRiver", "jungleRiver", "megaWall"],
  ["deepTime", "panorama", "megaWall"],
  ["panorama", "panorama", "ancientWall"],
  ["shallowPan", "panorama", "megaWall"],
  ["jungleRiver", "jungleRiver", "ancientWall"],
  ["panorama", "panorama", "megaWall"],
  ["deepTime", "deepTime", "ancientWall"],
  ["shallowPan", "panorama", "panorama"],
  ["panorama", "deepTime", "megaWall"],
  ["reefDome", "shallowPan", "ancientWall"],
  ["deepTime", "deepTime", "megaWall"],
  ["deepTime", "shallowPan", "ancientWall"],
  ["jungleRiver", "jungleRiver", "megaWall"],
  ["kelpTall", "panorama", "ancientWall"],
  ["panorama", "panorama", "megaWall"],
  ["shallowPan", "shallowPan", "ancientWall"],
  ["shallowPan", "reefDome", "ancientWall"],
  ["deepTime", "panorama", "megaWall"],
  ["deepTime", "deepTime", "ancientWall"],
  ["deepTime", "deepTime", "deepTime"],
  ["shallowPan", "shallowPan", "shallowPan"],
  ["shallowPan", "shallowPan", "ancientWall"],
  // 生命誕生の海。熱水の煙突 → 最初の膜 → 壁一面の最終大水槽。
  ["ventColumn", "deepTime", "megaWall"],
];

/** 館ぜんたいの終着点。ここだけ通常展示の約5倍で描く */
export const GRAND_TANKS: ReadonlyArray<[number, number]> = [
  [17, 3],
  [53, 3],
];

/*
 * 古代棟でも、水の明るい時代がある。
 * 浅い内湾・湿地・潟・浅瀬は昼の光が届くので、暗い輪郭のまま描く。
 */
const BRIGHT_ANCIENT = new Set([23, 27, 30, 31, 35, 38, 40, 43, 44, 46, 47, 51, 52]);

export const getAquariumDisplay = (area: number, index: number): AquariumDisplay => {
  const profile = PROFILES[area]?.[index - 1] ?? "panorama";
  const hero = index === 3;
  const centralGrandTank = GRAND_TANKS.some(([a, i]) => a === area && i === index);
  const facility = area >= 18 && area <= 21;
  const ancient = area >= 22;
  const darkWater =
    profile === "deepSeaLab" ||
    profile === "tunnel" ||
    profile === "ventColumn" ||
    (!facility && !ancient && area >= 15) ||
    (ancient && !BRIGHT_ANCIENT.has(area));
  const tinyFishArea = [0, 3, 6, 8, 10, 12, 13, 15, 17, 37, 48, 49, 50, 51].includes(area);

  /*
   * トンネルは真ん中が通路でくり抜かれているので、
   * 中層に置いた魚がまるごと見えなくなる。上のアーチへ寄せる。
   * 浅い水盤と陸のあるケージは、逆に下へ寄せて「底にいる」ことを見せる。
   */
  const bandShift =
    profile === "tunnel"
      ? -6
      : profile === "reefDome"
        ? -4
        : profile === "shallowPan"
          ? 5
          : profile === "terrarium"
            ? 6
            : profile === "ventColumn"
              ? 3
              : 0;

  return {
    profile,
    hero,
    // WORLD OCEAN の最終水槽だけは通常展示の約5倍の面積。
    // sqrt(5) ≒ 2.24 なので、縦横を2.25倍にして「少し大きい」ではなく別格にする。
    tankScale: centralGrandTank ? 2.25 : hero ? 1.15 : index === 2 ? 1.035 : 0.98,
    fishScaleBoost: centralGrandTank
      ? 1.08
      : (tinyFishArea ? 1.13 : 1.08) + (hero ? 0.025 : 0),
    contrastBoost: centralGrandTank ? 1.34 : darkWater ? 1.24 : hero ? 1.18 : 1.1,
    outlineMode: darkWater ? "light" : "dark",
    bandShift,
  };
};

const rr = (
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

const domePath = (ctx: CanvasRenderingContext2D, wide = 37, tall = 21) => {
  ctx.beginPath();
  ctx.moveTo(-wide, 18);
  ctx.lineTo(-wide, 2);
  ctx.bezierCurveTo(-wide, -13, -20, -tall, 0, -tall);
  ctx.bezierCurveTo(20, -tall, wide, -13, wide, 2);
  ctx.lineTo(wide, 18);
  ctx.closePath();
};

const tunnelPath = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(-39, 20);
  ctx.lineTo(-39, 1);
  ctx.bezierCurveTo(-39, -20, -17, -25, 0, -25);
  ctx.bezierCurveTo(17, -25, 39, -20, 39, 1);
  ctx.lineTo(39, 20);
  ctx.closePath();
};

/** トンネルの中の通路。水槽の手前に立つ影として描く */
const tunnelWalkway = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(-21, 21);
  ctx.lineTo(-21, 4);
  ctx.bezierCurveTo(-21, -8, -10, -11, 0, -11);
  ctx.bezierCurveTo(10, -11, 21, -8, 21, 4);
  ctx.lineTo(21, 21);
  ctx.closePath();
};

/** レストランの窓。上だけアーチにして、食事の席から見上げる形にする */
const archPath = (ctx: CanvasRenderingContext2D, wide = 41, tall = 22) => {
  ctx.beginPath();
  ctx.moveTo(-wide, 20);
  ctx.lineTo(-wide, -6);
  ctx.quadraticCurveTo(-wide, -tall, 0, -tall);
  ctx.quadraticCurveTo(wide, -tall, wide, -6);
  ctx.lineTo(wide, 20);
  ctx.closePath();
};

/** 熱水噴出孔のカラム。上へ細く伸びる縦長 */
const ventPath = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(-17, 24);
  ctx.lineTo(-24, 24);
  ctx.lineTo(-24, -2);
  ctx.quadraticCurveTo(-22, -25, 0, -25);
  ctx.quadraticCurveTo(22, -25, 24, -2);
  ctx.lineTo(24, 24);
  ctx.lineTo(17, 24);
  ctx.closePath();
};

export const clipTankInterior = (
  ctx: CanvasRenderingContext2D,
  profile: TankProfile,
) => {
  switch (profile) {
    case "freshSmall":
      rr(ctx, -34, -17, 68, 35, 6);
      return;
    case "stream":
      rr(ctx, -38, -20, 76, 40, 11);
      return;
    case "panorama":
      rr(ctx, -40, -20, 80, 41, 14);
      return;
    case "cylinder":
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 22, 0, 0, Math.PI * 2);
      return;
    case "reefDome":
      domePath(ctx, 38, 23);
      return;
    case "jungleRiver":
      rr(ctx, -34, -23, 68, 45, 9);
      return;
    case "kelpTall":
      rr(ctx, -29, -24, 58, 48, 8);
      return;
    case "tunnel":
      tunnelPath(ctx);
      return;
    case "megaWall":
      rr(ctx, -42, -23, 84, 46, 16);
      return;
    case "deepSeaLab":
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 22, 0, 0, Math.PI * 2);
      return;
    case "shopCase":
      rr(ctx, -37, -21, 74, 43, 4);
      return;
    case "diningWindow":
      archPath(ctx, 41, 24);
      return;
    case "terrarium":
      rr(ctx, -33, -24, 66, 47, 5);
      return;
    case "ancientWall":
      rr(ctx, -42, -22, 84, 45, 3);
      return;
    case "deepTime":
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      return;
    case "iceTank":
      rr(ctx, -40, -19, 80, 40, 6);
      return;
    case "shallowPan":
      rr(ctx, -41, -11, 82, 30, 5);
      return;
    case "ventColumn":
      ventPath(ctx);
      return;
  }
};

export const drawSwimBand = (
  ctx: CanvasRenderingContext2D,
  profile: TankProfile,
  outlineMode: "dark" | "light",
) => {
  const g = ctx.createLinearGradient(0, -13, 0, 14);
  if (outlineMode === "light") {
    g.addColorStop(0, "rgba(0,7,18,0.02)");
    g.addColorStop(0.5, "rgba(0,4,13,0.28)");
    g.addColorStop(1, "rgba(0,7,18,0.04)");
  } else {
    g.addColorStop(0, "rgba(5,25,28,0.01)");
    g.addColorStop(0.5, "rgba(3,22,26,0.16)");
    g.addColorStop(1, "rgba(5,25,28,0.02)");
  }
  ctx.fillStyle = g;
  if (profile === "kelpTall" || profile === "jungleRiver" || profile === "terrarium") {
    ctx.fillRect(-43, -13, 86, 27);
  } else if (profile === "ventColumn") {
    ctx.fillRect(-25, -22, 50, 46);
  } else {
    rr(ctx, -43, -12, 86, 25, 10);
    ctx.fill();
  }
};

const strokeWindow = (
  ctx: CanvasRenderingContext2D,
  profile: TankProfile,
  stroke: string,
  width: number,
) => {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  clipTankInterior(ctx, profile);
  ctx.stroke();
};

/** WORLD OCEAN中央大水槽だけに重ねる、過去2強化の集大成シルエット。 */
const drawWorldOceanResidents = (
  ctx: CanvasRenderingContext2D,
  profile: TankProfile,
) => {
  ctx.save();
  clipTankInterior(ctx, profile);
  ctx.clip();

  // 小魚の群泳。主役の巨大魚より奥に薄く置く。
  ctx.fillStyle = "rgba(222,248,255,0.6)";
  for (let i = 0; i < 9; i += 1) {
    const x = -31 + (i % 5) * 13 + Math.floor(i / 5) * 5;
    const y = -13 + (i % 3) * 5;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.3, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x - 4.8, y - 1.8);
    ctx.lineTo(x - 4.8, y + 1.8);
    ctx.closePath();
    ctx.fill();
  }

  // マンタ。翼のような輪郭で、一目で普通の魚と違うと分かる。
  ctx.fillStyle = "rgba(91,122,139,0.74)";
  ctx.strokeStyle = "rgba(219,249,255,0.5)";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-15, 1);
  ctx.bezierCurveTo(-29, -8, -32, 3, -19, 8);
  ctx.quadraticCurveTo(-13, 11, -8, 5);
  ctx.quadraticCurveTo(-3, 11, 3, 8);
  ctx.bezierCurveTo(15, 3, 11, -8, -3, 1);
  ctx.quadraticCurveTo(-9, -3, -15, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 7);
  ctx.quadraticCurveTo(-5, 15, -2, 18);
  ctx.stroke();

  // 大型サメ。右奥に置いてマンタと役割を分ける。
  ctx.fillStyle = "rgba(104,137,151,0.78)";
  ctx.beginPath();
  ctx.ellipse(20, 8, 11, 3.6, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 8);
  ctx.lineTo(4, 2);
  ctx.lineTo(5, 13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 5);
  ctx.lineTo(21, -1);
  ctx.lineTo(24, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

export const drawTankFrame = (
  ctx: CanvasRenderingContext2D,
  profile: TankProfile,
  hero: boolean,
  area: number,
) => {
  const warmCase = profile === "shopCase" || profile === "diningWindow";
  const glass = warmCase
    ? "rgba(255,240,210,0.7)"
    : area >= 15
      ? "rgba(193,241,255,0.72)"
      : "rgba(225,251,255,0.68)";
  /*
   * 枠の色でウイングを分ける。
   * 本館は濃紺、施設棟は木と真鍮、古代棟は石と錆びた鉄。
   * 名前を読まなくても、いまどの棟にいるかが枠だけで分かるようにする。
   */
  const frame =
    profile === "shopCase"
      ? "#8a6a3f"
      : profile === "diningWindow"
        ? "#7d5230"
        : profile === "terrarium"
          ? "#5d6b3c"
          : profile === "ancientWall"
            ? "#5a4f3f"
            : profile === "deepTime"
              ? "#8a7346"
              : profile === "iceTank"
                ? "#8fb6c6"
                : profile === "shallowPan"
                  ? "#6d6350"
                  : profile === "ventColumn"
                    ? "#4a3a3c"
                    : area <= 1
                      ? "#78684d"
                      : profile === "deepSeaLab"
                        ? "#687284"
                        : profile === "reefDome"
                          ? "#d8e8e1"
                          : "#243d45";

  // 背面にわずかな影を置き、床の上の絵ではなく「厚みのある設備」にする。
  ctx.save();
  ctx.translate(2.5, 4);
  strokeWindow(ctx, profile, "rgba(0,0,0,0.34)", hero ? 6 : 4.6);
  ctx.restore();

  // 中央大水槽には、1番・2番強化で得た魚群とマンタ・大型サメも同居させる。
  if (area === 17 && hero && profile === "megaWall") {
    drawWorldOceanResidents(ctx, profile);
  }

  strokeWindow(ctx, profile, frame, hero ? 5.4 : 4.1);
  strokeWindow(ctx, profile, glass, hero ? 1.5 : 1.15);

  // タイプ固有のシルエット。遠目でも水槽の種類を判別できるようにする。
  if (profile === "freshSmall") {
    ctx.fillStyle = "#8e7958";
    ctx.fillRect(-37, 18, 74, 4);
    ctx.fillRect(-34, 22, 4, 5);
    ctx.fillRect(30, 22, 4, 5);
  } else if (profile === "stream") {
    ctx.strokeStyle = "rgba(225,249,255,0.5)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-31 + i * 20, -15);
      ctx.quadraticCurveTo(-20 + i * 20, -11, -9 + i * 20, -15);
      ctx.stroke();
    }
    ctx.fillStyle = "#66716b";
    ctx.beginPath(); ctx.ellipse(-24, 20, 15, 5, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, 20, 20, 6, 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (profile === "panorama" || profile === "megaWall") {
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-30, -16);
    ctx.quadraticCurveTo(0, -23, 28, -16);
    ctx.stroke();
    if (hero) {
      ctx.fillStyle = "rgba(118,221,236,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 2, profile === "megaWall" ? 52 : 46, 29, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (profile === "cylinder") {
    ctx.strokeStyle = "rgba(222,249,255,0.75)";
    ctx.beginPath(); ctx.ellipse(0, -20, 20, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 20, 20, 5, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (profile === "reefDome") {
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 1, 29, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.fillStyle = "rgba(242,235,207,0.7)";
    ctx.fillRect(-34, 18, 68, 3);
  } else if (profile === "jungleRiver") {
    ctx.strokeStyle = "#675943";
    ctx.lineWidth = 3;
    for (const x of [-25, 21]) {
      ctx.beginPath();
      ctx.moveTo(x, -25);
      ctx.bezierCurveTo(x + 10, -12, x - 8, 3, x + 4, 18);
      ctx.stroke();
    }
  } else if (profile === "kelpTall") {
    ctx.strokeStyle = "rgba(80,149,112,0.65)";
    ctx.lineWidth = 2.2;
    for (const x of [-20, 0, 18]) {
      ctx.beginPath();
      ctx.moveTo(x, 23);
      ctx.bezierCurveTo(x + 8, 8, x - 7, -8, x + 2, -23);
      ctx.stroke();
    }
  } else if (profile === "tunnel") {
    /*
     * 通路をくり抜くと、水槽の面積の大半が通路になって魚が見えなくなる。
     * 水は窓いっぱいに見せ、通路は手前に立つ影として重ねる。
     */
    ctx.fillStyle = "rgba(6,22,31,0.92)";
    tunnelWalkway(ctx);
    ctx.fill();
    ctx.strokeStyle = "rgba(177,236,248,0.5)";
    ctx.lineWidth = 2;
    tunnelWalkway(ctx);
    ctx.stroke();
    // 通路の床と足元の光
    ctx.fillStyle = "rgba(126,226,255,0.3)";
    ctx.fillRect(-20, 16, 40, 2);
    ctx.strokeStyle = "rgba(177,236,248,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 4, 15, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (profile === "deepSeaLab") {
    ctx.strokeStyle = "#8c96aa";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * 38;
      const y = Math.sin(a) * 24;
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (profile === "shopCase") {
    // 棚板。ガラスケースの中が段になっていると分かるようにする。
    ctx.fillStyle = "rgba(150,116,70,0.9)";
    for (const y of [-6, 8]) ctx.fillRect(-36, y, 72, 2);
    ctx.fillStyle = "rgba(255,232,186,0.16)";
    ctx.fillRect(-36, -20, 72, 6);
    // 値札。読めない大きさでも「売り物」と分かる白い小片。
    ctx.fillStyle = "rgba(250,246,236,0.86)";
    for (const x of [-24, 2, 24]) ctx.fillRect(x, 9, 7, 4);
  } else if (profile === "diningWindow") {
    // テーブルクロスの帯と、席側のあかり。
    ctx.fillStyle = "rgba(246,232,206,0.9)";
    rr(ctx, -40, 15, 80, 6, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,206,128,0.5)";
    for (const x of [-26, 0, 26]) {
      ctx.beginPath();
      ctx.arc(x, 12, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,240,214,0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.quadraticCurveTo(0, -21, 30, -14);
    ctx.stroke();
  } else if (profile === "terrarium") {
    // 陸と水を半分ずつ。枝が1本かかっていると「ケージ」と読める。
    ctx.fillStyle = "rgba(96,112,68,0.92)";
    ctx.beginPath();
    ctx.moveTo(-33, 6);
    ctx.quadraticCurveTo(-14, -1, 4, 5);
    ctx.lineTo(4, 23);
    ctx.lineTo(-33, 23);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6d5b3c";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-28, -8);
    ctx.quadraticCurveTo(-4, -16, 26, -4);
    ctx.stroke();
    // 通気の網。上辺だけに入れて、水槽ではないことを示す。
    ctx.strokeStyle = "rgba(215,226,196,0.5)";
    ctx.lineWidth = 0.8;
    for (let i = -30; i <= 30; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -24);
      ctx.lineTo(i, -19);
      ctx.stroke();
    }
  } else if (profile === "ancientWall") {
    // 石の額。角に石留めを打って、本館のガラス壁と手ざわりを変える。
    ctx.fillStyle = "rgba(126,110,86,0.85)";
    for (const [x, y] of [[-40, -20], [38, -20], [-40, 18], [38, 18]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(226,215,186,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-32, -15);
    ctx.quadraticCurveTo(0, -21, 30, -15);
    ctx.stroke();
  } else if (profile === "deepTime") {
    // 真鍮のリングとリベット。時代をのぞきこむ丸窓。
    ctx.strokeStyle = "rgba(226,196,124,0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(226,196,124,0.75)";
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 25, Math.sin(a) * 25, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (profile === "iceTank") {
    // 水面に張った氷。割れ目から光が差す。
    ctx.fillStyle = "rgba(232,248,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(-40, -19);
    ctx.lineTo(40, -19);
    ctx.lineTo(40, -12);
    ctx.lineTo(18, -9);
    ctx.lineTo(2, -13);
    ctx.lineTo(-16, -9);
    ctx.lineTo(-40, -13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150,198,222,0.8)";
    ctx.lineWidth = 0.9;
    for (const x of [-22, 6, 26]) {
      ctx.beginPath();
      ctx.moveTo(x, -19);
      ctx.lineTo(x + 3, -10);
      ctx.stroke();
    }
  } else if (profile === "shallowPan") {
    // 上から見おろす浅い水盤。ふちが厚く、水位が低い。
    ctx.fillStyle = "rgba(196,182,152,0.9)";
    ctx.fillRect(-41, 16, 82, 4);
    ctx.strokeStyle = "rgba(238,250,255,0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-36, -6);
    ctx.quadraticCurveTo(0, -11, 36, -6);
    ctx.stroke();
  } else if (profile === "ventColumn") {
    // 煙突と、そこから立ちのぼる黒い煙。
    ctx.fillStyle = "rgba(38,26,30,0.95)";
    ctx.beginPath();
    ctx.moveTo(-9, 24);
    ctx.lineTo(-5, -6);
    ctx.lineTo(5, -6);
    ctx.lineTo(9, 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,142,90,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 5.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,14,18,0.5)";
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc((i % 2 ? 4 : -3) + i, -12 - i * 4, 4 + i * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const grand = GRAND_TANKS.some(([a]) => a === area) && hero;
  if (grand) {
    // 巨大水槽だけは建築物としての土台も大きく見せる。
    const origin = area === 53;
    ctx.fillStyle = origin ? "rgba(42,20,26,0.92)" : "rgba(8,30,42,0.9)";
    rr(ctx, -46, 23, 92, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = origin ? "rgba(255,166,110,0.34)" : "rgba(141,242,255,0.28)";
    ctx.fillRect(-38, 24, 76, 1.1);
  }

  if (hero) {
    // ランドマーク展示は照明まで別物にする。
    // 生命誕生の海だけは、青ではなく熱水の橙で光らせる。
    const ember = area === 53;
    const glow = ctx.createRadialGradient(0, -8, 2, 0, -8, 48);
    glow.addColorStop(0, ember ? "rgba(255,158,96,0.2)" : "rgba(171,244,255,0.16)");
    glow.addColorStop(1, ember ? "rgba(255,158,96,0)" : "rgba(171,244,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, -2, 48, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};