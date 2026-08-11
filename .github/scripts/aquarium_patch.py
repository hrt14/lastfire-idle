from pathlib import Path
import re

shop = Path("components/Shop.tsx")
src = shop.read_text()

old = '''      for (const area of openAreas(state)) {
        const { rect, palette } = area;
        const grad = ctx.createLinearGradient(0, rect.y0, 0, rect.y1);
        grad.addColorStop(0, palette.floor);
        grad.addColorStop(1, palette.deep);
        ctx.fillStyle = grad;
        ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
        drawProps(ctx, area, effectsRef.current ? time : 0);
        if (isFire) {
          drawFireGroundTexture(ctx, area, time, effectsRef.current);
          drawFireEarlyLife(ctx, area, time, effectsRef.current);
        }
      }
'''
new = '''      // 水族館は「次の地域」が視界に入るレイアウトなので、未開放区画も館内背景だけ先に描く。
      // 後段の半透明ゲートで閉鎖中と分かるようにし、水槽だけ暗闇に浮く状態を防ぐ。
      const openedAreasForBackground = openAreas(state);
      const openedAreaIdsForBackground = isAquarium
        ? new Set(openedAreasForBackground.map((area) => area.id))
        : null;
      const backgroundAreas = isAquarium
        ? areas.filter(
            (area) =>
              area.rect.x1 > box.x0 &&
              area.rect.x0 < box.x1 &&
              area.rect.y1 > box.y0 &&
              area.rect.y0 < box.y1,
          )
        : openedAreasForBackground;
      for (const area of backgroundAreas) {
        const { rect, palette } = area;
        const grad = ctx.createLinearGradient(0, rect.y0, 0, rect.y1);
        grad.addColorStop(0, palette.floor);
        grad.addColorStop(1, palette.deep);
        ctx.fillStyle = grad;
        ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
        if (isAquarium && !openedAreaIdsForBackground?.has(area.id)) {
          ctx.save();
          ctx.globalAlpha = 0.72;
          drawProps(ctx, area, effectsRef.current ? time : 0);
          ctx.restore();
        } else {
          drawProps(ctx, area, effectsRef.current ? time : 0);
        }
        if (isFire) {
          drawFireGroundTexture(ctx, area, time, effectsRef.current);
          drawFireEarlyLife(ctx, area, time, effectsRef.current);
        }
      }
'''
if old not in src:
    raise SystemExit("background loop anchor not found")
src = src.replace(old, new, 1)

old = '''        if (ix1 > ix0 && iy1 > iy0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ix0, iy0, ix1 - ix0, iy1 - iy0);
          ctx.clip();
          ctx.fillStyle = "#150f0c";
          ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
          ctx.fillStyle = "rgba(255,209,102,0.07)";
          for (let x = ix0 - 40; x < ix1 + 40; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, iy0);
            ctx.lineTo(x + 15, iy0);
            ctx.lineTo(x + 15 - (iy1 - iy0), iy1);
            ctx.lineTo(x - (iy1 - iy0), iy1);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          ctx.fillStyle = "rgba(246,231,207,0.5)";
          ctx.font = SMALL;
          ctx.fillText("工事中", (ix0 + ix1) / 2, (iy0 + iy1) / 2);
          ctx.font = FONT;
          continue;
        }
'''
new = '''        if (ix1 > ix0 && iy1 > iy0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ix0, iy0, ix1 - ix0, iy1 - iy0);
          ctx.clip();
          if (isAquarium) {
            // 次の展示室は真っ黒に潰さず、背景を残したままガラスゲート越しに予告する。
            ctx.fillStyle = "rgba(2,13,20,0.48)";
            ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
            ctx.strokeStyle = "rgba(127,226,238,0.18)";
            ctx.lineWidth = 2;
            for (let x = ix0 + 18; x < ix1; x += 34) {
              ctx.beginPath();
              ctx.moveTo(x, iy0);
              ctx.lineTo(x, iy1);
              ctx.stroke();
            }
            ctx.fillStyle = "rgba(110,226,238,0.06)";
            for (let y = iy0 + 22; y < iy1; y += 38) {
              ctx.fillRect(ix0, y, ix1 - ix0, 1);
            }
          } else {
            ctx.fillStyle = "#150f0c";
            ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
            ctx.fillStyle = "rgba(255,209,102,0.07)";
            for (let x = ix0 - 40; x < ix1 + 40; x += 30) {
              ctx.beginPath();
              ctx.moveTo(x, iy0);
              ctx.lineTo(x + 15, iy0);
              ctx.lineTo(x + 15 - (iy1 - iy0), iy1);
              ctx.lineTo(x - (iy1 - iy0), iy1);
              ctx.closePath();
              ctx.fill();
            }
          }
          ctx.restore();
          const gateX = (ix0 + ix1) / 2;
          const gateY = (iy0 + iy1) / 2;
          if (isAquarium) {
            const nextTitle = areaTitle(area.label);
            const plateW = Math.min(ix1 - ix0 - 24, 190);
            ctx.fillStyle = "rgba(3,17,25,0.88)";
            roundRect(ctx, gateX - plateW / 2, gateY - 23, plateW, 46, 14);
            ctx.fill();
            ctx.strokeStyle = "rgba(118,233,242,0.66)";
            ctx.lineWidth = 1.5;
            roundRect(ctx, gateX - plateW / 2, gateY - 23, plateW, 46, 14);
            ctx.stroke();
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(162,239,245,0.82)";
            ctx.font = `800 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
            ctx.fillText("NEXT GALLERY", gateX, gateY - 8);
            ctx.fillStyle = "#f2fdff";
            ctx.font = `900 12px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
            ctx.fillText(nextTitle, gateX, gateY + 9);
          } else {
            ctx.fillStyle = "rgba(246,231,207,0.5)";
            ctx.font = SMALL;
            ctx.fillText("工事中", gateX, gateY);
          }
          ctx.font = FONT;
          continue;
        }
'''
if old not in src:
    raise SystemExit("construction overlay anchor not found")
src = src.replace(old, new, 1)

old = '''          ctx.fillStyle = "rgba(5,16,22,0.88)";
          roundRect(ctx, x - 46, y + 12, 92, 14, 6);
          ctx.fill();
          ctx.fillStyle = "#d6fbff";
          ctx.font = SMALL;
          ctx.fillText(stove.label ?? "AQUARIUM", x, y + 19);
          ctx.font = FONT;
          continue;
'''
new = '''          // 展示名は水槽の絵に埋もれない独立プレートにする。
          // 長い名前は自動でフォントを縮めるが、最低8pxを確保してスマホでも読めるようにする。
          const exhibitLabel = (stove.label ?? "AQUARIUM").replace(/水槽$/, "");
          ctx.save();
          const labelGrad = ctx.createLinearGradient(x - 49, 0, x + 49, 0);
          labelGrad.addColorStop(0, "rgba(2,14,20,0.94)");
          labelGrad.addColorStop(0.5, "rgba(8,35,45,0.96)");
          labelGrad.addColorStop(1, "rgba(2,14,20,0.94)");
          ctx.fillStyle = labelGrad;
          roundRect(ctx, x - 49, y + 7, 98, 22, 8);
          ctx.fill();
          ctx.strokeStyle = "rgba(126,235,242,0.76)";
          ctx.lineWidth = 1.2;
          roundRect(ctx, x - 49, y + 7, 98, 22, 8);
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          let labelSize = 10.5;
          do {
            ctx.font = `900 ${labelSize}px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
            if (ctx.measureText(exhibitLabel).width <= 86 || labelSize <= 8) break;
            labelSize -= 0.5;
          } while (labelSize > 8);
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(0,8,12,0.96)";
          ctx.lineWidth = 3;
          ctx.strokeText(exhibitLabel, x, y + 18.5);
          ctx.fillStyle = "#f2fdff";
          ctx.fillText(exhibitLabel, x, y + 18.5);
          ctx.restore();
          ctx.font = FONT;
          continue;
'''
if old not in src:
    raise SystemExit("aquarium tank label anchor not found")
src = src.replace(old, new, 1)
shop.write_text(src)

theme = Path("lib/aquariumTheme.ts")
src = theme.read_text()
pattern = re.compile(r'''const drawHeader = \(ctx: CanvasRenderingContext2D, rect: AquariumArea\["rect"\], theme: Theme, index: number\) => \{.*?\n\};\n\nconst drawWaterRays''', re.S)
replacement = '''const drawHeader = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {
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

const drawWaterRays'''
src, n = pattern.subn(replacement, src, count=1)
if n != 1:
    raise SystemExit(f"drawHeader patch count={n}")

old = '''  ctx.fillStyle = theme.warm ? "rgba(75,70,50,0.9)" : "rgba(4,17,27,0.88)";
  rounded(ctx, heroX - 61, heroY - 92, 122, 23, 9);
  ctx.fill();
  ctx.fillStyle = theme.warm ? "#fff6d9" : theme.light;
  ctx.font = '900 7px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(LANDMARK_LABELS[index] ?? "LANDMARK", heroX, heroY - 77);
'''
new = '''  ctx.fillStyle = theme.warm ? "rgba(44,54,42,0.94)" : "rgba(3,18,27,0.94)";
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
  ctx.strokeText(LANDMARK_LABELS[index] ?? "LANDMARK", heroX, heroY - 78);
  ctx.fillText(LANDMARK_LABELS[index] ?? "LANDMARK", heroX, heroY - 78);
'''
if old not in src:
    raise SystemExit("landmark label anchor not found")
src = src.replace(old, new, 1)
src = src.replace('"メコン巨大魚水槽",', '"巨大ナマズ",', 1)
theme.write_text(src)

visual = Path("data/aquarium-visual-v3.ts")
src = visual.read_text()
if 'label: "メコン巨大魚水槽"' not in src:
    raise SystemExit("mekong landmark anchor not found")
src = src.replace('label: "メコン巨大魚水槽"', 'label: "巨大ナマズ"', 1)
visual.write_text(src)
