from pathlib import Path
import re

shop_path = Path("components/Shop.tsx")
theme_path = Path("lib/aquariumTheme.ts")
shop = shop_path.read_text()
theme = theme_path.read_text()

# 1) 水族館では水槽名を観覧位置にもう一度出さない。券数だけ小さく出す。
pattern = re.compile(r'''          // 乗り物の名前を出す小さな看板\n          ctx\.fillStyle = "rgba\(0,0,0,0\.45\)";\n          roundRect\(ctx, x - 34, y \+ 18, 68, 14, 7\);\n          ctx\.fill\(\);\n          ctx\.strokeStyle = "rgba\(255,209,102,0\.5\)";\n          ctx\.lineWidth = 1;\n          roundRect\(ctx, x - 34, y \+ 18, 68, 14, 7\);\n          ctx\.stroke\(\);\n          ctx\.font = SMALL;\n          ctx\.fillStyle = "#ffe6a8";\n          const cost = seatCost\(seat\);\n          ctx\.fillText\(cost > 1 \? `\$\{seat\.label\}（\$\{cost\}枚）` : seat\.label, x, y \+ 25\);\n          ctx\.font = FONT;\n''')
replacement = '''          const cost = seatCost(seat);\n          if (isAquarium) {\n            // 展示名は水槽本体に一度だけ。観覧位置は必要券数だけ小さく表示する。\n            ctx.fillStyle = "rgba(3,17,24,0.84)";\n            roundRect(ctx, x - 18, y + 18, 36, 14, 7);\n            ctx.fill();\n            ctx.strokeStyle = "rgba(112,226,235,0.46)";\n            ctx.lineWidth = 1;\n            roundRect(ctx, x - 18, y + 18, 36, 14, 7);\n            ctx.stroke();\n            ctx.font = `800 8px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;\n            ctx.fillStyle = "#d9fbff";\n            ctx.fillText(`券×${cost}`, x, y + 25);\n            ctx.font = FONT;\n          } else {\n            // 乗り物の名前を出す小さな看板\n            ctx.fillStyle = "rgba(0,0,0,0.45)";\n            roundRect(ctx, x - 34, y + 18, 68, 14, 7);\n            ctx.fill();\n            ctx.strokeStyle = "rgba(255,209,102,0.5)";\n            ctx.lineWidth = 1;\n            roundRect(ctx, x - 34, y + 18, 68, 14, 7);\n            ctx.stroke();\n            ctx.font = SMALL;\n            ctx.fillStyle = "#ffe6a8";\n            ctx.fillText(cost > 1 ? `${seat.label}（${cost}枚）` : seat.label, x, y + 25);\n            ctx.font = FONT;\n          }\n'''
shop2, n = pattern.subn(replacement, shop, count=1)
if n != 1:
    raise SystemExit(f"seat label block replacement failed: {n}")
shop = shop2

# 2) ランドマーク枠は展示名を重複させず、短い役割タグだけにする。
old_landmark = '''  ctx.strokeText(LANDMARK_LABELS[index] ?? "LANDMARK", heroX, heroY - 78);\n  ctx.fillText(LANDMARK_LABELS[index] ?? "LANDMARK", heroX, heroY - 78);\n'''
new_landmark = '''  const landmarkTag = index === 17 ? "★ GRAND LANDMARK" : "★ LANDMARK";\n  ctx.strokeText(landmarkTag, heroX, heroY - 78);\n  ctx.fillText(landmarkTag, heroX, heroY - 78);\n'''
if old_landmark not in theme:
    raise SystemExit("landmark label block not found")
theme = theme.replace(old_landmark, new_landmark, 1)

# 3) 正方形セルの下半分まで地域性を伸ばす床・側景レイヤー。
marker = 'const drawAmenities = (ctx: CanvasRenderingContext2D, rect: AquariumArea["rect"], theme: Theme, index: number) => {'
if marker not in theme:
    raise SystemExit("amenities marker not found")

floor_identity = r'''
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

'''
theme = theme.replace(marker, floor_identity + marker, 1)

# 4) 背景を必ず自分のセル内にクリップし、隣セルの文字・装飾へ侵入させない。
start_old = '''  const { rect } = area;\n  const w = rect.x1 - rect.x0;\n'''
start_new = '''  const { rect } = area;\n  ctx.save();\n  ctx.beginPath();\n  ctx.rect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);\n  ctx.clip();\n  const w = rect.x1 - rect.x0;\n'''
if start_old not in theme:
    raise SystemExit("drawAquariumHall start not found")
theme = theme.replace(start_old, start_new, 1)

call_old = '''  drawDistantHabitat(ctx, rect, theme, time, index);\n  drawPerspectiveFloor(ctx, rect, theme, index);\n  drawAmenities(ctx, rect, theme, index);\n'''
call_new = '''  drawDistantHabitat(ctx, rect, theme, time, index);\n  drawPerspectiveFloor(ctx, rect, theme, index);\n  drawGalleryFloorIdentity(ctx, rect, theme, index, time);\n  drawAmenities(ctx, rect, theme, index);\n'''
if call_old not in theme:
    raise SystemExit("drawAquariumHall calls not found")
theme = theme.replace(call_old, call_new, 1)

end_old = '''  ctx.textAlign = "center";\n};\n'''
pos = theme.rfind(end_old)
if pos < 0:
    raise SystemExit("drawAquariumHall end not found")
theme = theme[:pos] + '''  ctx.textAlign = "center";\n  ctx.restore();\n};\n''' + theme[pos + len(end_old):]

shop_path.write_text(shop)
theme_path.write_text(theme)
print("patched Shop.tsx and aquariumTheme.ts")
