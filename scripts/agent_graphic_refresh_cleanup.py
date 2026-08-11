from pathlib import Path

path = Path('lib/worldGraphicPass.ts')
source = path.read_text(encoding='utf-8')
old = r'''  if (area.id === "area-1" && progress >= 2) {
    // 野営地から「住んでいる集落」へ。設備ではない住居を画面に増やす。
    hideShelter(ctx, rect.x0 + w * 0.16, rect.y0 + h * 0.70, 0.95);
    hideShelter(ctx, rect.x0 + w * 0.84, rect.y0 + h * 0.72, 0.78);
    if (progress >= 4) hideShelter(ctx, rect.x0 + w * 0.72, rect.y0 + h * 0.22, 0.66);
    if (effects) {
      smoke(ctx, rect.x0 + w * 0.16, rect.y0 + h * 0.66, time + 1.2, 0.75);
      if (progress >= 4) smoke(ctx, rect.x0 + w * 0.72, rect.y0 + h * 0.18, time + 2.3, 0.6);
    }
  }

'''
if old not in source:
    raise SystemExit('legacy settlement growth block not found')
source = source.replace(old, '', 1)
path.write_text(source, encoding='utf-8')
