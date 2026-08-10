from pathlib import Path

p = Path("components/Shop.tsx")
s = p.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f"patch target not found: {label}")
    s = s.replace(old, new, 1)


replace_once(
    '      const isPark = stage().id === "park";\n      const isFire = stage().id === "fire";',
    '      const isPark = stage().id === "park";\n      const isAquarium = stage().visualTheme === "aquarium";\n      const isFire = stage().id === "fire";',
    "isAquarium flag",
)

replace_once(
    '          ctx.fillStyle = isPark ? "#414f6b" : isFire ? "rgba(83,62,39,0.20)" : "#2b241d";\n          ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);\n          ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : isFire ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.03)";',
    '''          ctx.fillStyle = isAquarium
            ? "#102a34"
            : isPark
              ? "#414f6b"
              : isFire
                ? "rgba(83,62,39,0.20)"
                : "#2b241d";
          ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);
          ctx.fillStyle = isAquarium
            ? "rgba(86,220,232,0.045)"
            : isPark
              ? "rgba(255,255,255,0.055)"
              : isFire
                ? "rgba(255,255,255,0)"
                : "rgba(255,255,255,0.03)";''',
    "first room aquarium floor",
)

replace_once(
    '        if (isPark) {\n          // 入園ゲート: 二本の塔と電飾つきのアーチ',
    '''        if (isAquarium) {
          // 水族館のエントランス。遊園地の門・万国旗は描かない。
          const header = area.price === 0 ? "WORLD AQUARIUM" : areaTitle(area.label);
          const panel = ctx.createLinearGradient(x0 + 20, 0, x1 - 20, 0);
          panel.addColorStop(0, "#071922");
          panel.addColorStop(0.5, "#103748");
          panel.addColorStop(1, "#071922");
          ctx.fillStyle = panel;
          roundRect(ctx, x0 + 18, 12, x1 - x0 - 36, 42, 14);
          ctx.fill();
          ctx.strokeStyle = "rgba(103,231,238,0.75)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, x0 + 18, 12, x1 - x0 - 36, 42, 14);
          ctx.stroke();
          ctx.fillStyle = "#9ff4f4";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(header, mid, 30);
          ctx.font = SMALL;
          ctx.fillStyle = "rgba(184,241,246,0.75)";
          ctx.fillText(area.price === 0 ? "FRESH WATER · JAPAN" : "AQUARIUM GALLERY", mid, 45);
          ctx.font = FONT;
          ctx.strokeStyle = "rgba(78,211,226,0.5)";
          ctx.lineWidth = 3;
          for (let i = 0; i < 3; i += 1) {
            const yy = 78 + i * 16;
            ctx.beginPath();
            for (let xx = x0 + 14; xx <= x1 - 14; xx += 10) {
              const waveY = yy + Math.sin(xx * 0.05 + time * 1.8 + i) * 2;
              if (xx === x0 + 14) ctx.moveTo(xx, waveY);
              else ctx.lineTo(xx, waveY);
            }
            ctx.stroke();
          }
        } else if (isPark) {
          // 入園ゲート: 二本の塔と電飾つきのアーチ''',
    "aquarium entrance",
)

replace_once(
    '      if (isPark) {\n        // 園内の遊歩道（区画をつなぐ石畳）',
    '''      if (isAquarium) {
        // 水槽沿いの館内順路。遊園地の石畳ではなく青い誘導ライン。
        for (const area of openAreas(state)) {
          const { rect } = area;
          ctx.fillStyle = "rgba(5,16,24,0.34)";
          ctx.fillRect(rect.x0, rect.y1 - 38, rect.x1 - rect.x0, 30);
          ctx.strokeStyle = "rgba(82,220,231,0.48)";
          ctx.lineWidth = 3;
          ctx.setLineDash([18, 10]);
          ctx.beginPath();
          ctx.moveTo(rect.x0 + 10, rect.y1 - 23);
          ctx.lineTo(rect.x1 - 10, rect.y1 - 23);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (isPark) {
        // 園内の遊歩道（区画をつなぐ石畳）''',
    "aquarium walkway",
)

replace_once(
    '      for (const stove of openStoves(state)) {\n        const { x, y } = stove.pos;\n        const made = stoveItem(stove);\n        if (wild) {',
    '''      for (const stove of openStoves(state)) {
        const { x, y } = stove.pos;
        const made = stoveItem(stove);
        const aquariumTank =
          isAquarium &&
          typeof stove.art === "string" &&
          stove.art.startsWith("aquarium-");

        if (aquariumTank) {
          // 展示名だけではなく、実際の魚が見えるガラス水槽として描く。
          shadow(ctx, x, y + 22, 42);
          const frame = ctx.createLinearGradient(0, y - 46, 0, y + 28);
          frame.addColorStop(0, "#162c3a");
          frame.addColorStop(1, "#07131a");
          ctx.fillStyle = frame;
          roundRect(ctx, x - 50, y - 46, 100, 74, 10);
          ctx.fill();
          ctx.strokeStyle = "rgba(111,225,235,0.55)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, x - 49, y - 45, 98, 72, 9);
          ctx.stroke();

          // 54展示それぞれ固有の魚・群れ・背景。
          ctx.save();
          ctx.translate(x, y - 12);
          ctx.scale(1.22, 1.22);
          drawAquariumExhibit(ctx, stove.art ?? "", Math.round(x * 31 + y * 17));
          ctx.restore();

          // ガラスの反射と展示名。
          ctx.strokeStyle = "rgba(220,250,255,0.22)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 38, y - 38);
          ctx.lineTo(x - 18, y + 6);
          ctx.stroke();
          ctx.fillStyle = "rgba(5,16,22,0.88)";
          roundRect(ctx, x - 46, y + 12, 92, 14, 6);
          ctx.fill();
          ctx.fillStyle = "#d6fbff";
          ctx.font = SMALL;
          ctx.fillText(stove.label ?? "AQUARIUM", x, y + 19);
          ctx.font = FONT;
          continue;
        }

        if (wild) {''',
    "real aquarium tanks",
)

replace_once(
    '          if (isOnsen) {\n            drawOnsenSeat(ctx, seat.art ?? "ashiyu", x, y, time);\n          } else {\n            drawRide(ctx, seat.art ?? "bench", x, y, time);\n          }',
    '''          if (isAquarium) {
            // 水槽前は遊園地の乗り物やベンチではなく、立って眺めるスペース。
            ctx.fillStyle = "rgba(4,14,20,0.42)";
            roundRect(ctx, x - 34, y - 16, 68, 24, 8);
            ctx.fill();
            ctx.strokeStyle = "rgba(112,226,235,0.58)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 30, y - 8);
            ctx.lineTo(x + 30, y - 8);
            ctx.stroke();
            for (const px of [x - 30, x, x + 30]) {
              ctx.fillStyle = "rgba(180,235,240,0.7)";
              roundRect(ctx, px - 1.5, y - 8, 3, 17, 1.5);
              ctx.fill();
            }
            ctx.fillStyle = "rgba(91,216,226,0.16)";
            roundRect(ctx, x - 28, y - 2, 56, 8, 4);
            ctx.fill();
          } else if (isOnsen) {
            drawOnsenSeat(ctx, seat.art ?? "ashiyu", x, y, time);
          } else {
            drawRide(ctx, seat.art ?? "bench", x, y, time);
          }''',
    "aquarium viewing spot",
)

# Keep park mechanics but remove park-looking outside/lobby visuals for aquarium.
s = s.replace(
    '      if (isPark) {\n        // 芝生の並木道',
    '      if (isPark && !isAquarium) {\n        // 芝生の並木道',
    1,
)
s = s.replace(
    '      ctx.fillStyle = isPark ? "#4a5568" : "#332e28";',
    '      ctx.fillStyle = isAquarium ? "#18313a" : isPark ? "#4a5568" : "#332e28";',
    1,
)
s = s.replace(
    '      ctx.fillStyle = isPark ? "#2c4433" : "#1c1b1d";',
    '      ctx.fillStyle = isAquarium ? "#0c1d25" : isPark ? "#2c4433" : "#1c1b1d";',
    1,
)
s = s.replace(
    '      ctx.fillStyle = isPark ? "#2f3a52" : "#241d18";',
    '      ctx.fillStyle = isAquarium ? "#0a202b" : isPark ? "#2f3a52" : "#241d18";',
    1,
)
s = s.replace(
    '      ctx.fillText(isPark ? "入園口" : "入口", entrance.x, top - 5);',
    '      ctx.fillText(isAquarium ? "水族館入口" : isPark ? "入園口" : "入口", entrance.x, top - 5);',
    1,
)

p.write_text(s)
print("aquarium real-tank patch applied")
