from pathlib import Path

world_path = Path('lib/worldGraphicPass.ts')
shop_path = Path('components/Shop.tsx')
world = world_path.read_text(encoding='utf-8')
shop = shop_path.read_text(encoding='utf-8')

# 1) Fire pass receives actual purchase/build state.
old = '''export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  beastPos: { x: number; y: number } | null,
) => {'''
new = '''export const drawFireGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  beastPos: { x: number; y: number } | null,
  unlocked: readonly string[],
) => {'''
if old not in world:
    raise SystemExit('fire pass signature not found')
world = world.replace(old, new, 1)

# Fire investment growth helper before pass.
anchor = '''export const drawFireGraphicPass = (
'''
helper = r'''const drawFireInvestmentGrowth = (
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

'''
if anchor not in world:
    raise SystemExit('fire pass anchor missing')
world = world.replace(anchor, helper + anchor, 1)

# Invoke exact growth after generic area life.
old = '''  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);
  const valley = areas.find((area) => area.id === "area-2");'''
new = '''  for (const area of areas) drawFireAreaLife(ctx, area, progress, time, effects);
  const unlockedSet = new Set(unlocked);
  drawFireInvestmentGrowth(ctx, areas, unlockedSet, time, effects);
  const valley = areas.find((area) => area.id === "area-2");'''
if old not in world:
    raise SystemExit('fire loop anchor missing')
world = world.replace(old, new, 1)

# 2) Taiga pass gets actual purchases.
old = '''export const drawTaigaGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  riverLane: number,
  rise: number,
) => {'''
new = '''export const drawTaigaGraphicPass = (
  ctx: CanvasRenderingContext2D,
  box: Rect,
  areas: AreaView[],
  time: number,
  effects: boolean,
  riverLane: number,
  rise: number,
  unlocked: readonly string[],
) => {'''
if old not in world:
    raise SystemExit('taiga pass signature missing')
world = world.replace(old, new, 1)

# Market + town functions become investment-driven.
world = world.replace(
'''const drawMarketDistrict = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  riverLane: number,
  progress: number,
  time: number,
) => {''',
'''const drawMarketDistrict = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  riverLane: number,
  unlocked: ReadonlySet<string>,
  time: number,
) => {''', 1)

old_market_body = '''  // 川へ伸びる桟橋を複数本にし、物流拠点らしい密度を作る。
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
  for (let i = 0; i < stalls; i += 1) {'''
new_market_body = '''  // 未完成時は杭だけ。船着き場を完成させると一気に桟橋が伸びる。
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
  for (let i = 0; i < stalls; i += 1) {'''
if old_market_body not in world:
    raise SystemExit('market body missing')
world = world.replace(old_market_body, new_market_body, 1)
world = world.replace(
'''  // 岸に係留された小舟。動く背景船とは役割を分ける。
  drawBoat(ctx, px + 20, py + 66 + Math.sin(time * 1.2) * 2, 0.72, true);
  drawBoat(ctx, px + 150, py + 82 + Math.sin(time * 1.1 + 1) * 2, 0.62, progress >= 6);''',
'''  // 岸に係留された小舟も投資後に出現する。
  if (dockBuilt) drawBoat(ctx, px + 20, py + 66 + Math.sin(time * 1.2) * 2, 0.72, true);
  if (marketBuilt) drawBoat(ctx, px + 150, py + 82 + Math.sin(time * 1.1 + 1) * 2, 0.62, true);''', 1)

world = world.replace(
'''const drawRiverTownLandmark = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  progress: number,
  time: number,
) => {
  if (progress < 6) return;''',
'''const drawRiverTownLandmark = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  unlocked: ReadonlySet<string>,
  time: number,
) => {
  const granaryBuilt = unlocked.has("built-build-granary");
  const wellBuilt = unlocked.has("built-build-well");
  const templeBuilt = unlocked.has("built-build-temple");
  const shipBuilt = unlocked.has("built-build-ship");
  if (!granaryBuilt && !wellBuilt && !templeBuilt && !shipBuilt) return;''', 1)

# Replace always-on tower/granary section with conditional landmarks.
old_town = '''  // 記念塔の遠景。町へ入った瞬間に「村より大きい」と分かる高さを作る。
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
  }'''
new_town = '''  if (granaryBuilt) {
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
  }'''
if old_town not in world:
    raise SystemExit('town landmark block missing')
world = world.replace(old_town, new_town, 1)

# Taiga area life now receives unlock set.
world = world.replace(
'''const drawTaigaAreaLife = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  progress: number,
  time: number,
  riverLane: number,
) => {''',
'''const drawTaigaAreaLife = (
  ctx: CanvasRenderingContext2D,
  area: AreaView,
  progress: number,
  time: number,
  riverLane: number,
  unlocked: ReadonlySet<string>,
) => {''', 1)
world = world.replace(
'''  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, progress, time);
  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, progress, time);''',
'''  if (area.id === "area-4") drawMarketDistrict(ctx, rect, riverLane, unlocked, time);
  if (area.id === "area-5") drawRiverTownLandmark(ctx, rect, unlocked, time);''', 1)
world = world.replace(
'''  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane);

  // 船は人口・交易の成長を背景側で見せる。''',
'''  const unlockedSet = new Set(unlocked);
  for (const area of areas) drawTaigaAreaLife(ctx, area, progress, time, riverLane, unlockedSet);

  // 船は人口・交易の成長を背景側で見せる。''', 1)

# Background boat count is tied to market/ship investment, not only area count.
world = world.replace(
'''  const boats = Math.min(5, Math.max(1, Math.floor(progress / 2)));''',
'''  const boats = Math.min(
    6,
    1 +
      (unlockedSet.has("built-build-dock") ? 1 : 0) +
      (unlockedSet.has("built-build-market") ? 2 : 0) +
      (unlockedSet.has("built-build-ship") ? 2 : 0),
  );''', 1)

# 3) True foreground pass (after actors): 3-layer composition.
world += r'''

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
'''

# Shop imports foreground passes.
shop = shop.replace(
'import { drawFireGraphicPass, drawTaigaGraphicPass } from "@/lib/worldGraphicPass";',
'''import {
  drawFireForegroundPass,
  drawFireGraphicPass,
  drawTaigaForegroundPass,
  drawTaigaGraphicPass,
} from "@/lib/worldGraphicPass";''', 1)

# Pass unlock state to background passes.
shop = shop.replace(
'''          effectsRef.current,
          state.fire.beast?.pos ?? null,
        );''',
'''          effectsRef.current,
          state.fire.beast?.pos ?? null,
          state.unlocked,
        );''', 1)
shop = shop.replace(
'''          RIVER_LANE,
          riverRise(state),
        );''',
'''          RIVER_LANE,
          riverRise(state),
          state.unlocked,
        );''', 1)

# Make actual mammoth visually larger without touching collisions/logic.
if '  ctx.scale(face, 1);' not in shop:
    raise SystemExit('mammoth scale anchor missing')
shop = shop.replace('  ctx.scale(face, 1);', '  ctx.scale(face * 1.18, 1.18);', 1)

# Add foreground after actors, before pop text/effects.
actor_anchor = '''      actors.sort((a, b) => a.y - b.y);
      for (const actor of actors) actor.render();

      /* --- 演出 --- */'''
actor_replace = '''      actors.sort((a, b) => a.y - b.y);
      for (const actor of actors) actor.render();

      // 前景をキャラクターより手前に被せ、背景→プレイ層→前景の3層にする。
      if (isFire) drawFireForegroundPass(ctx, openAreas(state));
      if (isTaiga) drawTaigaForegroundPass(ctx, openAreas(state), RIVER_LANE);

      /* --- 演出 --- */'''
if actor_anchor not in shop:
    raise SystemExit('actor foreground anchor missing')
shop = shop.replace(actor_anchor, actor_replace, 1)

world_path.write_text(world, encoding='utf-8')
shop_path.write_text(shop, encoding='utf-8')
