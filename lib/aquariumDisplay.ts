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
  | "deepSeaLab";

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
];

export const getAquariumDisplay = (area: number, index: number): AquariumDisplay => {
  const profile = PROFILES[area]?.[index - 1] ?? "panorama";
  const hero = index === 3;
  const centralGrandTank = area === 17 && index === 3;
  const darkWater = area >= 15 || profile === "deepSeaLab" || profile === "tunnel";
  const tinyFishArea = [0, 3, 6, 8, 10, 12, 13, 15, 17].includes(area);

  /*
   * トンネルは真ん中が通路でくり抜かれているので、
   * 中層に置いた魚がまるごと見えなくなる。上のアーチへ寄せる。
   */
  const bandShift = profile === "tunnel" ? -6 : profile === "reefDome" ? -4 : 0;

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
  if (profile === "kelpTall" || profile === "jungleRiver") {
    ctx.fillRect(-43, -13, 86, 27);
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
  const glass = area >= 15 ? "rgba(193,241,255,0.72)" : "rgba(225,251,255,0.68)";
  const frame = area <= 1
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
  }

  if (area === 17 && hero) {
    // 巨大水槽だけは建築物としての土台も大きく見せる。
    ctx.fillStyle = "rgba(8,30,42,0.9)";
    rr(ctx, -46, 23, 92, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = "rgba(141,242,255,0.28)";
    ctx.fillRect(-38, 24, 76, 1.1);
  }

  if (hero) {
    // ランドマーク展示は照明まで別物にする。
    const glow = ctx.createRadialGradient(0, -8, 2, 0, -8, 48);
    glow.addColorStop(0, "rgba(171,244,255,0.16)");
    glow.addColorStop(1, "rgba(171,244,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, -2, 48, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};