from pathlib import Path

world_path = Path("lib/worldGraphicPass.ts")
shop_path = Path("components/Shop.tsx")
world = world_path.read_text(encoding="utf-8")
shop = shop_path.read_text(encoding="utf-8")

helpers_anchor = "const drawFireAreaLife = (\n"
helpers = r'''const bonfireLandmark = (
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

'''
if helpers_anchor not in world:
    raise SystemExit("fire helpers anchor missing")
world = world.replace(helpers_anchor, helpers + helpers_anchor, 1)

old_fire0 = r'''  if (area.id === "area-0") {
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
'''
new_fire0 = r'''  if (area.id === "area-0") {
    // 実データの最初のたき火（x344/y196）に合わせ、背景側から火をランドマーク化する。
    const x = rect.x0 + w * 0.478;
    const y = rect.y0 + h * 0.377;
    bonfireLandmark(ctx, x, y, time, effects);
  }
'''
if old_fire0 not in world:
    raise SystemExit("fire area0 block missing")
world = world.replace(old_fire0, new_fire0, 1)

old_sig = r'''export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
) => {'''
new_sig = r'''export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  beastPos: { x: number; y: number } | null,
) => {'''
if old_sig not in world:
    raise SystemExit("fire pass signature missing")
world = world.replace(old_sig, new_sig, 1)

old_area_loop = "  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);\n\n  // 世界の端をただの矩形で終わらせない。"
new_area_loop = "  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);\n  const valley = areas.find((area) => area.id === \"area-2\");\n  if (valley) drawValleyPresence(ctx, valley, beastPos, time, effects);\n\n  // 世界の端をただの矩形で終わらせない。"
if old_area_loop not in world:
    raise SystemExit("fire area loop missing")
world = world.replace(old_area_loop, new_area_loop, 1)

# Background boats get a simple cloth sail so river traffic reads as trade at a glance.
boat_anchor = r'''  ctx.beginPath();
  ctx.moveTo(0, -6 * scale);
  ctx.lineTo(0, -27 * scale);
  ctx.stroke();
  if (loaded) {'''
boat_replace = r'''  ctx.beginPath();
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
  if (loaded) {'''
if boat_anchor not in world:
    raise SystemExit("boat mast anchor missing")
world = world.replace(boat_anchor, boat_replace, 1)

# Make the river bank genuinely vary in width instead of only wobbling a few pixels.
world = world.replace(
    "const y = edge + Math.sin(i * 1.37) * 8 + Math.sin(i * 0.43) * 5;",
    "const y = edge + Math.sin(i * 1.37) * 14 + Math.sin(i * 0.43) * 9 + (i % 5 === 0 ? -10 : 0);",
    1,
)
world = world.replace(
    "const prevY = edge + Math.sin((i - 1) * 1.37) * 8 + Math.sin((i - 1) * 0.43) * 5;",
    "const prevY = edge + Math.sin((i - 1) * 1.37) * 14 + Math.sin((i - 1) * 0.43) * 9 + ((i - 1) % 5 === 0 ? -10 : 0);",
    1,
)

river_extra_anchor = "  if (effects) {\n    // 水面の短い反射。長い直線を避ける。"
river_extra = r'''  // 中州を2〜3か所だけ大きく置き、川幅が場所によって違って見えるようにする。
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
    // 水面の短い反射。長い直線を避ける。'''
if river_extra_anchor not in world:
    raise SystemExit("river extra anchor missing")
world = world.replace(river_extra_anchor, river_extra, 1)

# Taiga landmark helpers.
taiga_anchor = "const drawTaigaAreaLife = (\n"
taiga_helpers = r'''const drawMarketDistrict = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  riverLane: number,
  progress: number,
  time: number,
) => {
  const w = rect.x1 - rect.x0;
  const px = rect.x0 + w * 0.18; // 実データの船着き場 x3560 付近
  const py = riverLane + 34;
  ctx.save();
  // 川へ伸びる桟橋を複数本にし、物流拠点らしい密度を作る。
  ctx.strokeStyle = "rgba(117,77,43,0.86)";
  ctx.lineWidth = 6;
  for (const ox of [0, 90, 180]) {
    ctx.beginPath();
    ctx.moveTo(px + ox, py + 8);
    ctx.lineTo(px + ox, py + 86 + (ox === 90 ? 18 : 0));
    ctx.stroke();
    for (let j = 0; j < 4; j += 1) {
      ctx.beginPath();
      ctx.moveTo(px + ox - 14, py + 24 + j * 18);
      ctx.lineTo(px + ox + 14, py + 24 + j * 18);
      ctx.stroke();
    }
  }
  // 市場の天幕。中央市場が開く段階ほど数が増える。
  const stalls = progress >= 6 ? 6 : 4;
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
  // 岸に係留された小舟。動く背景船とは役割を分ける。
  drawBoat(ctx, px + 20, py + 66 + Math.sin(time * 1.2) * 2, 0.72, true);
  drawBoat(ctx, px + 150, py + 82 + Math.sin(time * 1.1 + 1) * 2, 0.62, progress >= 6);
  ctx.restore();
};

const drawRiverTownLandmark = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  progress: number,
  time: number,
) => {
  if (progress < 6) return;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const x = rect.x0 + w * 0.52;
  const y = rect.y0 + h * 0.68;
  ctx.save();
  // 記念塔の遠景。町へ入った瞬間に「村より大きい」と分かる高さを作る。
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
  for (const wy of [y - 70, y - 42]) {
    ctx.fillRect(x - 10, wy, 20, 10);
  }
  smoke(ctx, x + 64, y - 22, time + 2.8, 0.48);
  // 大型穀倉のシルエットを塔の左右へ。
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
  ctx.restore();
};

'''
if taiga_anchor not in world:
    raise SystemExit("taiga helper anchor missing")
world = world.replace(taiga_anchor, taiga_helpers + taiga_anchor, 1)

old_market = r'''  // 大河の市場は、完成前から「水辺の物流拠点になる場所」と読める桟橋の骨格を置く。
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
'''
new_market = r'''  // 大河の市場は「桟橋+船+天幕」が一体になった水辺の物流拠点として見せる。
  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, progress, time);
  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, progress, time);
'''
if old_market not in world:
    raise SystemExit("old market block missing")
world = world.replace(old_market, new_market, 1)

shop_old = r'''        drawFireGraphicPass(
          ctx,
          box,
          openAreas(state),
          effectsRef.current ? time : 0,
          effectsRef.current,
        );'''
shop_new = r'''        drawFireGraphicPass(
          ctx,
          box,
          openAreas(state),
          effectsRef.current ? time : 0,
          effectsRef.current,
          state.fire.beast?.pos ?? null,
        );'''
if shop_old not in shop:
    raise SystemExit("Shop fire pass call missing")
shop = shop.replace(shop_old, shop_new, 1)

world_path.write_text(world, encoding="utf-8")
shop_path.write_text(shop, encoding="utf-8")
