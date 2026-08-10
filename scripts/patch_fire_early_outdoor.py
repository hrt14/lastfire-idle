from pathlib import Path

p = Path('components/Shop.tsx')
s = p.read_text()


def once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'missing anchor: {label}')
    s = s.replace(old, new, 1)

helper = r'''
/**
 * 火のはじまり序盤の「生活圏」。
 * 四角い部屋に設備を並べた見え方を避け、野営地→集落へ自然に育って見えるようにする。
 * ゲーム判定を持たない背景小物だけなので、既存の作業・購入導線は変えない。
 */
const drawFireEarlyLife = (
  ctx: CanvasRenderingContext2D,
  area: {
    id: string;
    rect: { x0: number; y0: number; x1: number; y1: number };
  },
  time: number,
  effects: boolean,
) => {
  if (area.id !== "area-0" && area.id !== "area-1") return;
  const { rect } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const x = (f: number) => rect.x0 + w * f;
  const y = (f: number) => rect.y0 + h * f;

  // 一本道ではなく、焚き火・住居・作業場所の間にできた複数の踏み跡。
  const paths = area.id === "area-0"
    ? [
        [0.04, 0.72, 0.30, 0.49, 0.55, 0.63, 0.94, 0.42],
        [0.18, 0.18, 0.35, 0.42, 0.42, 0.53, 0.56, 0.70],
        [0.47, 0.12, 0.55, 0.32, 0.72, 0.40, 0.88, 0.66],
      ]
    : [
        [0.02, 0.62, 0.22, 0.49, 0.49, 0.57, 0.98, 0.38],
        [0.15, 0.14, 0.29, 0.34, 0.34, 0.57, 0.45, 0.82],
        [0.48, 0.10, 0.57, 0.31, 0.72, 0.54, 0.88, 0.78],
        [0.34, 0.73, 0.52, 0.58, 0.70, 0.42, 0.88, 0.22],
      ];
  ctx.lineCap = "round";
  for (const [a,b,c,d,e,f,g,h2] of paths) {
    ctx.strokeStyle = "rgba(116,88,54,0.18)";
    ctx.lineWidth = area.id === "area-0" ? 28 : 34;
    ctx.beginPath();
    ctx.moveTo(x(a), y(b));
    ctx.bezierCurveTo(x(c), y(d), x(e), y(f), x(g), y(h2));
    ctx.stroke();
    ctx.strokeStyle = "rgba(184,145,88,0.08)";
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  const hideShelter = (px: number, py: number, scale = 1, dark = false) => {
    ctx.strokeStyle = "#60472f";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(px - 25 * scale, py + 12 * scale);
    ctx.lineTo(px, py - 31 * scale);
    ctx.lineTo(px + 27 * scale, py + 12 * scale);
    ctx.moveTo(px, py - 31 * scale);
    ctx.lineTo(px + 3 * scale, py + 16 * scale);
    ctx.stroke();
    ctx.fillStyle = dark ? "rgba(92,72,52,0.92)" : "rgba(143,112,74,0.92)";
    ctx.beginPath();
    ctx.moveTo(px - 23 * scale, py + 8 * scale);
    ctx.lineTo(px + 1 * scale, py - 28 * scale);
    ctx.lineTo(px + 8 * scale, py + 9 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(62,45,31,0.55)";
    ctx.lineWidth = 1.2 * scale;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(px - 17 * scale + i * 6 * scale, py + 5 * scale);
      ctx.lineTo(px - 1 * scale + i * 2 * scale, py - 23 * scale);
      ctx.stroke();
    }
  };

  const pitHut = (px: number, py: number, scale = 1) => {
    // 低い土盛り＋枝と毛皮の屋根。家というより地面から生えた住居に見せる。
    ctx.fillStyle = "rgba(79,61,40,0.38)";
    ctx.beginPath();
    ctx.ellipse(px, py + 11 * scale, 34 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#765b3e";
    ctx.beginPath();
    ctx.ellipse(px, py - 2 * scale, 29 * scale, 20 * scale, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(66,49,32,0.75)";
    ctx.lineWidth = 2 * scale;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(px + i * 8 * scale, py + 8 * scale);
      ctx.quadraticCurveTo(px + i * 4 * scale, py - 18 * scale, px, py - 22 * scale);
      ctx.stroke();
    }
    ctx.fillStyle = "#2a2017";
    ctx.beginPath();
    ctx.ellipse(px, py + 5 * scale, 8 * scale, 9 * scale, 0, Math.PI, 0);
    ctx.fill();
  };

  const dryingRack = (px: number, py: number, scale = 1) => {
    ctx.strokeStyle = "#6a4d31";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(px - 21 * scale, py + 13 * scale);
    ctx.lineTo(px - 16 * scale, py - 24 * scale);
    ctx.moveTo(px + 21 * scale, py + 13 * scale);
    ctx.lineTo(px + 16 * scale, py - 24 * scale);
    ctx.moveTo(px - 19 * scale, py - 19 * scale);
    ctx.lineTo(px + 19 * scale, py - 19 * scale);
    ctx.stroke();
    for (const ox of [-10, 1, 11]) {
      ctx.strokeStyle = "#9a7950";
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(px + ox * scale, py - 19 * scale);
      ctx.lineTo(px + ox * scale, py - 8 * scale);
      ctx.stroke();
      ctx.fillStyle = ox === 1 ? "#874636" : "#9b5440";
      ctx.beginPath();
      ctx.ellipse(px + ox * scale, py - 3 * scale, 5 * scale, 7 * scale, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const knapSite = (px: number, py: number, scale = 1) => {
    ctx.fillStyle = "rgba(92,74,54,0.30)";
    ctx.beginPath();
    ctx.ellipse(px, py, 30 * scale, 14 * scale, -0.2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 11; i += 1) {
      const a = i * 2.31;
      const r = 7 + (i % 4) * 5;
      ctx.fillStyle = i % 3 === 0 ? "#9a9180" : "#676258";
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * r * scale, py + Math.sin(a) * r * 0.45 * scale);
      ctx.lineTo(px + Math.cos(a + 0.8) * (r + 7) * scale, py + Math.sin(a + 0.8) * (r + 7) * 0.45 * scale);
      ctx.lineTo(px + Math.cos(a + 1.7) * (r + 3) * scale, py + Math.sin(a + 1.7) * (r + 3) * 0.45 * scale);
      ctx.closePath();
      ctx.fill();
    }
  };

  const basket = (px: number, py: number, scale = 1) => {
    ctx.strokeStyle = "#9b794a";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(px, py, 9 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py - 2 * scale, 8 * scale, Math.PI, 0);
    ctx.stroke();
  };

  const logPile = (px: number, py: number, scale = 1) => {
    for (let i = 0; i < 4; i += 1) {
      const oy = (i % 2) * 7 * scale;
      const ox = (i - 1.5) * 8 * scale;
      ctx.strokeStyle = i % 2 ? "#755132" : "#65452c";
      ctx.lineWidth = 6 * scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px + ox - 15 * scale, py + oy);
      ctx.lineTo(px + ox + 15 * scale, py + oy - 4 * scale);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  };

  if (area.id === "area-0") {
    // はじまりの野: まだ「村」ではなく、焚き火のまわりに生活がにじみ出した段階。
    hideShelter(x(0.12), y(0.25), 0.95);
    hideShelter(x(0.86), y(0.62), 0.82, true);
    dryingRack(x(0.29), y(0.30), 0.9);
    knapSite(x(0.72), y(0.31), 0.9);
    logPile(x(0.16), y(0.70), 0.85);
    basket(x(0.38), y(0.71), 0.9);
    basket(x(0.41), y(0.73), 0.75);
    // 骨・切り株・枝を端に置き、空き地を「床」に見せない。
    ctx.strokeStyle = "rgba(213,199,165,0.52)";
    ctx.lineWidth = 2.4;
    for (const [fx, fy, rot] of [[0.08,0.48,0.4],[0.91,0.26,-0.5],[0.64,0.82,0.8]] as const) {
      const px = x(fx), py = y(fy);
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(-9, 0, 2.8, 0, Math.PI * 2); ctx.arc(9, 0, 2.8, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  } else {
    // 集落のはじまり: 住居が複数でき、生活の中心が「設備」ではなく人の暮らしに見える。
    pitHut(x(0.10), y(0.24), 0.95);
    pitHut(x(0.82), y(0.25), 0.88);
    pitHut(x(0.18), y(0.70), 0.82);
    hideShelter(x(0.73), y(0.69), 0.78, true);
    dryingRack(x(0.42), y(0.22), 0.95);
    knapSite(x(0.58), y(0.73), 0.9);
    logPile(x(0.31), y(0.77), 0.95);
    basket(x(0.51), y(0.19), 0.85);
    basket(x(0.54), y(0.20), 0.72);
    basket(x(0.88), y(0.53), 0.78);
    // 完成しすぎない短い杭。壁ではなく生活圏の輪郭だけを感じさせる。
    ctx.strokeStyle = "rgba(101,74,45,0.70)";
    ctx.lineWidth = 3;
    for (const [fx, fy, lean] of [[0.04,0.33,-3],[0.05,0.39,2],[0.94,0.45,-2],[0.95,0.52,3],[0.37,0.90,-2]] as const) {
      const px = x(fx), py = y(fy);
      ctx.beginPath();
      ctx.moveTo(px, py + 8);
      ctx.lineTo(px + lean, py - 18);
      ctx.stroke();
    }
  }

  // ON時だけ煙や小さな火の粉。OFFでも生活オブジェクト自体は残る。
  if (effects) {
    const fx = area.id === "area-0" ? x(0.49) : x(0.47);
    const fy = area.id === "area-0" ? y(0.48) : y(0.48);
    for (let i = 0; i < 3; i += 1) {
      const t = (time * 0.18 + i / 3) % 1;
      ctx.fillStyle = `rgba(210,195,170,${0.12 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(fx + Math.sin(time + i) * 4, fy - 28 - t * 42, 5 + t * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

'''

once(
    '/** 火のはじまりの服は、職業色より毛皮・革・土の色を優先する。 */',
    helper + '/** 火のはじまりの服は、職業色より毛皮・革・土の色を優先する。 */',
    'early life helper',
)

once(
    '        if (isFire) drawFireGroundTexture(ctx, area, time, effectsRef.current);',
    '        if (isFire) {\n          drawFireGroundTexture(ctx, area, time, effectsRef.current);\n          drawFireEarlyLife(ctx, area, time, effectsRef.current);\n        }',
    'ground hook',
)

old_work = '''        ctx.fillStyle = isPark ? "#414f6b" : isFire ? "rgba(83,62,39,0.20)" : "#2b241d";
        ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);
        ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : isFire ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.03)";
        for (let y = KITCHEN.top; y < KITCHEN.bottom; y += 22) {
          for (let x = x0; x < x1; x += 22) {
            if (!isFire && ((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);
          }
        }'''
new_work = '''        const earlyFire = isFire && (area.id === "area-0" || area.id === "area-1");
        if (earlyFire) {
          // 序盤だけは「作業場」という長方形そのものを描かない。
          // 踏み固められた土の斑点を重ね、下の自然地面へ溶け込ませる。
          for (let i = 0; i < 13; i += 1) {
            const px = x0 + 24 + ((i * 89 + area.id.charCodeAt(area.id.length - 1) * 17) % Math.max(60, x1 - x0 - 48));
            const py = 46 + ((i * 53) % Math.max(60, KITCHEN.bottom - 66));
            ctx.fillStyle = i % 3 === 0 ? "rgba(106,80,49,0.12)" : "rgba(70,58,39,0.09)";
            ctx.beginPath();
            ctx.ellipse(px, py, 28 + (i % 4) * 10, 11 + (i % 3) * 5, i * 0.31, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = isPark ? "#414f6b" : isFire ? "rgba(83,62,39,0.20)" : "#2b241d";
          ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);
          ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : isFire ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.03)";
          for (let y = KITCHEN.top; y < KITCHEN.bottom; y += 22) {
            for (let x = x0; x < x1; x += 22) {
              if (!isFire && ((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);
            }
          }
        }'''
once(old_work, new_work, 'early work ground')

old_line = '''        ctx.strokeStyle = "rgba(246,231,207,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, KITCHEN.bottom);
        ctx.lineTo(x1, KITCHEN.bottom);
        ctx.stroke();'''
new_line = '''        if (!earlyFire) {
          ctx.strokeStyle = "rgba(246,231,207,0.16)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0, KITCHEN.bottom);
          ctx.lineTo(x1, KITCHEN.bottom);
          ctx.stroke();
        } else {
          // 真っ直ぐな床境界の代わりに、ところどころ草が残る不規則な縁だけを置く。
          ctx.strokeStyle = "rgba(75,91,52,0.34)";
          ctx.lineWidth = 1.3;
          for (let i = 0; i < 18; i += 1) {
            const gx = x0 + 12 + ((i * 67) % Math.max(40, x1 - x0 - 24));
            const gy = KITCHEN.bottom - 5 + ((i * 11) % 13);
            ctx.beginPath();
            ctx.moveTo(gx, gy + 6);
            ctx.lineTo(gx - 3, gy - 5 - (i % 3) * 2);
            ctx.moveTo(gx, gy + 6);
            ctx.lineTo(gx + 4, gy - 3 - (i % 2) * 3);
            ctx.stroke();
          }
        }'''
once(old_line, new_line, 'remove straight early boundary')

old_sign = '''        } else if (wild) {
          ctx.fillStyle = area.price === 0 ? "#7a3b1f" : "#4a3524";
          roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, 6);
          ctx.fill();
          ctx.fillStyle = "#f6d9a8";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(
            area.price === 0
              ? stage().name.split("").join(" ")
              : areaTitle(area.label),
            mid,
            20,
          );
          ctx.font = FONT;'''
new_sign = '''        } else if (wild) {
          if (earlyFire) {
            // 序盤は「店の看板」ではなく、杭に結んだ毛皮へ地名を書いた程度にする。
            ctx.strokeStyle = "#65482e";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x0 + 22, 38);
            ctx.lineTo(x0 + 24, 4);
            ctx.moveTo(x1 - 22, 38);
            ctx.lineTo(x1 - 24, 4);
            ctx.stroke();
            ctx.fillStyle = area.price === 0 ? "rgba(108,75,46,0.86)" : "rgba(94,76,54,0.80)";
            ctx.beginPath();
            ctx.moveTo(x0 + 28, 8);
            ctx.quadraticCurveTo(mid, 4, x1 - 30, 10);
            ctx.lineTo(x1 - 35, 31);
            ctx.quadraticCurveTo(mid, 27, x0 + 33, 32);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = area.price === 0 ? "#7a3b1f" : "#4a3524";
            roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, 6);
            ctx.fill();
          }
          ctx.fillStyle = "#f6d9a8";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(
            area.price === 0
              ? stage().name.split("").join(" ")
              : areaTitle(area.label),
            mid,
            20,
          );
          ctx.font = FONT;'''
once(old_sign, new_sign, 'primitive early sign')

p.write_text(s)
print('patched Fire early areas into outdoor living spaces')
