from pathlib import Path

shop = Path("components/Shop.tsx")
src = shop.read_text()

old = '          const exhibitLabel = (stove.label ?? "AQUARIUM").replace(/水槽$/, "");'
new = '          const exhibitLabel = stove.label ?? "AQUARIUM";'
if old not in src:
    raise SystemExit("exhibit label transform anchor not found")
src = src.replace(old, new, 1)

old = '''        ctx.font = SMALL;
        ctx.fillStyle = "rgba(246,231,207,0.4)";
        ctx.fillText(
          areaTitle(area.label),
          (area.rect.x0 + area.rect.x1) / 2,
          area.rect.y0 + 14,
        );
        ctx.font = FONT;
'''
new = '''        // 水族館はテーマ側に大きな地域ヘッダーがあるため、旧式の小さな区画名は重ねない。
        if (!isAquarium) {
          ctx.font = SMALL;
          ctx.fillStyle = "rgba(246,231,207,0.4)";
          ctx.fillText(
            areaTitle(area.label),
            (area.rect.x0 + area.rect.x1) / 2,
            area.rect.y0 + 14,
          );
          ctx.font = FONT;
        }
'''
if old not in src:
    raise SystemExit("area divider label anchor not found")
src = src.replace(old, new, 1)
shop.write_text(src)
