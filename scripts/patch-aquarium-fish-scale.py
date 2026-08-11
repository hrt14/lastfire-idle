from pathlib import Path

root = Path(__file__).resolve().parents[1]
art_path = root / "lib" / "aquariumArt.ts"
workflow_path = root / ".github" / "workflows" / "aquarium-fish-scale-safety.yml"
script_path = Path(__file__)

s = art_path.read_text(encoding="utf-8")

old = '''const drawSchool = (ctx: CanvasRenderingContext2D, visual: ExhibitVisual, seed: number) => {'''
new = '''const drawSchool = (
  ctx: CanvasRenderingContext2D,
  visual: ExhibitVisual,
  seed: number,
  sizeBoost = 1,
) => {'''
if old not in s:
    raise SystemExit("drawSchool signature not found")
s = s.replace(old, new, 1)

old = '''    const s = (isHero ? hero : 0.78 + seeded(seed, i + 4) * 0.32) * (count > 20 ? 0.72 : count > 14 ? 0.82 : 1);'''
new = '''    const s = (isHero ? hero : 0.78 + seeded(seed, i + 4) * 0.32)
      * (count > 20 ? 0.72 : count > 14 ? 0.82 : 1)
      * sizeBoost;'''
if old not in s:
    raise SystemExit("primary scale line not found")
s = s.replace(old, new, 1)

old = '''      const s = (0.9 + seeded(seed, i + 180) * 0.25) * (visual.heroScale && visual.heroScale > 1.4 ? 1.15 : 1);'''
new = '''      const s = (0.9 + seeded(seed, i + 180) * 0.25)
        * (visual.heroScale && visual.heroScale > 1.4 ? 1.15 : 1)
        * sizeBoost;'''
if old not in s:
    raise SystemExit("secondary scale line not found")
s = s.replace(old, new, 1)

old = '''  ctx.save();
  ctx.scale(display.fishScaleBoost, display.fishScaleBoost);
  ctx.shadowColor = display.outlineMode === "light"
    ? `rgba(218,248,255,${0.48 * display.contrastBoost})`
    : `rgba(1,16,20,${0.58 * display.contrastBoost})`;
  ctx.shadowBlur = display.hero ? 3.6 : 2.4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  drawSchool(ctx, visual, seed + area * 101 + index * 17);
  ctx.restore();'''
new = '''  ctx.save();
  ctx.shadowColor = display.outlineMode === "light"
    ? `rgba(218,248,255,${0.48 * display.contrastBoost})`
    : `rgba(1,16,20,${0.58 * display.contrastBoost})`;
  ctx.shadowBlur = display.hero ? 3.6 : 2.4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  // 魚の座標は動かさず、魚体サイズだけ補正する。
  // 群れを座標ごと拡大すると水槽端で切れやすいため。
  drawSchool(
    ctx,
    visual,
    seed + area * 101 + index * 17,
    display.fishScaleBoost,
  );
  ctx.restore();'''
if old not in s:
    raise SystemExit("fish scale block not found")
s = s.replace(old, new, 1)

art_path.write_text(s, encoding="utf-8")

# one-shot cleanup
if workflow_path.exists():
    workflow_path.unlink()
if script_path.exists():
    script_path.unlink()
