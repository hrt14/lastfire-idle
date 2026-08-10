from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    text = p.read_text()
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"anchor not found: {label}")
    p.write_text(text.replace(old, new, 1))
    print(f"{label}: patched")


# 1) 夜の森そのものを、ランドマークと小物で埋める。
shop = Path("components/Shop.tsx")
src = shop.read_text()
start = src.find('  if (palette.prop === "nightforest") {')
end = src.find('  if (palette.prop === "horror") {', start)
if start < 0 or end < 0:
    raise SystemExit("nightforest draw block not found")
new_block = r'''  if (palette.prop === "nightforest") {
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;

    // 地面の濃淡。森の奥ほど下草が濃く、平らな一枚床に見えないようにする。
    ctx.fillStyle = "rgba(6,16,11,0.34)";
    for (let i = 0; i < 24; i += 1) {
      const px = rect.x0 + 46 + ((i * 173) % Math.max(120, w - 92));
      const py = rect.y0 + 46 + ((i * 97) % Math.max(120, h - 92));
      ctx.beginPath();
      ctx.ellipse(px, py, 38 + (i % 4) * 15, 16 + (i % 3) * 7, i * 0.31, 0, Math.PI * 2);
      ctx.fill();
    }

    // 獣道。入口から最奥の古木・巣穴へ曲がって続く。
    ctx.strokeStyle = "rgba(154,132,88,0.24)";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 620, rect.y1 - 10);
    ctx.bezierCurveTo(rect.x0 + 520, rect.y0 + 620, rect.x0 + 800, rect.y0 + 410, rect.x0 + 850, rect.y0 + 168);
    ctx.stroke();
    ctx.strokeStyle = "rgba(154,132,88,0.13)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 650, rect.y0 + 555);
    ctx.quadraticCurveTo(rect.x0 + 280, rect.y0 + 490, rect.x0 + 245, rect.y0 + 275);
    ctx.moveTo(rect.x0 + 770, rect.y0 + 405);
    ctx.quadraticCurveTo(rect.x0 + 1050, rect.y0 + 350, rect.x0 + 1110, rect.y0 + 180);
    ctx.stroke();
    ctx.lineCap = "butt";

    // 小さな池。鹿やオオカミが寄る場所として、森の左奥に水面を置く。
    const pondX = rect.x0 + 255;
    const pondY = rect.y0 + 265;
    ctx.fillStyle = "rgba(24,62,61,0.86)";
    ctx.beginPath();
    ctx.ellipse(pondX, pondY, 104, 58, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,180,165,0.22)";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.ellipse(pondX - 22 + i * 15, pondY + i * 4, 28 + i * 9, 8 + i * 2, -0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 葦と水草
    ctx.strokeStyle = "#405b3c";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const rx = pondX - 92 + i * 17;
      const ry = pondY + 20 + Math.sin(i * 1.7) * 18;
      ctx.beginPath();
      ctx.moveTo(rx, ry + 13);
      ctx.lineTo(rx + Math.sin(i) * 4, ry - 15 - (i % 3) * 5);
      ctx.stroke();
    }

    // 最奥の洞穴。入り口だけ真っ黒にして、何かがいる感じを残す。
    const caveX = rect.x1 - 125;
    const caveY = rect.y0 + 142;
    ctx.fillStyle = "#4a4740";
    for (const [ox, oy, rx, ry] of [
      [-44, 5, 42, 35], [42, 8, 44, 38], [-12, -26, 52, 35], [18, -28, 42, 31],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(caveX + ox, caveY + oy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#080b09";
    ctx.beginPath();
    ctx.ellipse(caveX, caveY + 17, 52, 40, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // 巣の前の骨
    ctx.strokeStyle = "#bcb59f";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const bx = caveX - 60 + i * 42;
      const by = caveY + 62 + (i % 2) * 12;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by - 5);
      ctx.lineTo(bx + 11, by + 6);
      ctx.moveTo(bx + 9, by - 6);
      ctx.lineTo(bx - 10, by + 7);
      ctx.stroke();
      ctx.fillStyle = "#c9c1aa";
      for (const ex of [-11, 11]) {
        ctx.beginPath();
        ctx.arc(bx + ex, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 森の象徴になる巨大古木。根元のうろがランドマーク。
    const oldX = rect.x0 + 820;
    const oldY = rect.y0 + 175;
    ctx.strokeStyle = "#3f2d1f";
    ctx.lineCap = "round";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(oldX, oldY + 78);
    ctx.lineTo(oldX - 3, oldY - 24);
    ctx.stroke();
    ctx.lineWidth = 12;
    for (const [dx, dy] of [[-62, -80], [-36, -104], [42, -96], [70, -72], [5, -120]] as const) {
      ctx.beginPath();
      ctx.moveTo(oldX, oldY - 18);
      ctx.lineTo(oldX + dx, oldY + dy);
      ctx.stroke();
    }
    ctx.strokeStyle = "#4c3827";
    ctx.lineWidth = 7;
    for (const dx of [-62, -34, 38, 70]) {
      ctx.beginPath();
      ctx.moveTo(oldX, oldY + 64);
      ctx.quadraticCurveTo(oldX + dx * 0.45, oldY + 84, oldX + dx, oldY + 78);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.fillStyle = "#14140f";
    ctx.beginPath();
    ctx.ellipse(oldX + 4, oldY + 34, 12, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d3d28";
    for (let i = 0; i < 15; i += 1) {
      const a = (i / 15) * Math.PI * 2;
      const rx = 38 + (i % 4) * 8;
      ctx.beginPath();
      ctx.arc(oldX + Math.cos(a) * rx, oldY - 74 + Math.sin(a) * 42, 15 + (i % 3) * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 通路の両側に木を高密度で置く。太さや高さをばらして人工的な等間隔感を消す。
    for (let i = 0; i < 34; i += 1) {
      const left = i % 2 === 0;
      const lane = left ? 65 + (i % 6) * 74 : w - 70 - (i % 6) * 76;
      const tx = rect.x0 + lane + Math.sin(i * 2.2) * 25;
      const ty = rect.y0 + 45 + ((i * 109) % Math.max(120, h - 90));
      const tall = 1 + (i % 4) * 0.08;
      ctx.fillStyle = i % 5 === 0 ? "#473224" : "#3a2b1d";
      ctx.fillRect(tx - 3.5, ty - 10, 7, 30 * tall);
      ctx.fillStyle = i % 3 === 0 ? "#203c2a" : "#183225";
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.moveTo(tx, ty - (40 + k * 14) * tall);
        ctx.lineTo(tx - 20 + k * 2, ty - (7 + k * 12) * tall);
        ctx.lineTo(tx + 20 - k * 2, ty - (7 + k * 12) * tall);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 倒木。空間に横方向の障害物を入れて、ただの床に見えないようにする。
    for (const [lx, ly, angle, len] of [
      [350, 610, -0.22, 86], [720, 548, 0.28, 72], [1030, 430, -0.3, 92], [460, 145, 0.16, 70],
    ] as const) {
      ctx.save();
      ctx.translate(rect.x0 + lx, rect.y0 + ly);
      ctx.rotate(angle);
      ctx.fillStyle = "#4d3826";
      roundRect(ctx, -len / 2, -7, len, 14, 7);
      ctx.fill();
      ctx.fillStyle = "#6b5136";
      ctx.beginPath();
      ctx.arc(-len / 2 + 2, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2e4a30";
      ctx.lineWidth = 2;
      for (let j = -2; j <= 2; j += 1) {
        ctx.beginPath();
        ctx.moveTo(j * 15, -5);
        ctx.lineTo(j * 15 + 7, -15 - Math.abs(j) * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 大岩と小石。
    for (let i = 0; i < 9; i += 1) {
      const rx = rect.x0 + 105 + ((i * 283) % Math.max(140, w - 210));
      const ry = rect.y0 + 110 + ((i * 187) % Math.max(140, h - 190));
      ctx.fillStyle = i % 2 ? "#54554e" : "#484b46";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 18 + (i % 3) * 7, 11 + (i % 2) * 7, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(130,145,120,0.22)";
      ctx.beginPath();
      ctx.ellipse(rx - 5, ry - 4, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 茂み。いくつかは赤い木の実つき。
    for (let i = 0; i < 22; i += 1) {
      const bx = rect.x0 + 60 + ((i * 241) % Math.max(100, w - 120));
      const by = rect.y0 + 70 + ((i * 149) % Math.max(100, h - 130));
      ctx.fillStyle = i % 4 === 0 ? "#294b2f" : "#244229";
      for (const ox of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.arc(bx + ox, by - Math.abs(ox) * 0.25, 9 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      if (i % 5 === 0) {
        ctx.fillStyle = "#a74236";
        for (let k = 0; k < 4; k += 1) {
          ctx.beginPath();
          ctx.arc(bx - 9 + k * 6, by - 6 - (k % 2) * 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // キノコと薬草。拾えそうなものが点在している見た目を作る。
    for (let i = 0; i < 12; i += 1) {
      const mx = rect.x0 + 120 + ((i * 313) % Math.max(120, w - 240));
      const my = rect.y0 + 120 + ((i * 211) % Math.max(120, h - 200));
      ctx.strokeStyle = "#d4c6a5";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(mx, my + 5);
      ctx.lineTo(mx, my - 5);
      ctx.stroke();
      ctx.fillStyle = i % 3 === 0 ? "#a65b4d" : "#c6b071";
      ctx.beginPath();
      ctx.ellipse(mx, my - 7, 6, 3.5, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      if (i % 2 === 0) {
        ctx.strokeStyle = "#557547";
        ctx.beginPath();
        ctx.moveTo(mx + 10, my + 5);
        ctx.lineTo(mx + 11, my - 10);
        ctx.moveTo(mx + 11, my - 3);
        ctx.lineTo(mx + 17, my - 8);
        ctx.stroke();
      }
    }

    // 骨・角。危険地帯へ近づいていることを文字なしで伝える。
    for (let i = 0; i < 5; i += 1) {
      const bx = rect.x0 + 690 + ((i * 127) % 440);
      const by = rect.y0 + 210 + ((i * 139) % 370);
      ctx.strokeStyle = "#b8b19c";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - 9, by - 3);
      ctx.lineTo(bx + 10, by + 5);
      ctx.stroke();
      ctx.fillStyle = "#c6bea7";
      ctx.beginPath();
      ctx.arc(bx - 10, by - 3, 3, 0, Math.PI * 2);
      ctx.arc(bx + 11, by + 5, 3, 0, Math.PI * 2);
      ctx.fill();
      if (i % 2 === 0) {
        ctx.strokeStyle = "#b8b19c";
        ctx.beginPath();
        ctx.moveTo(bx + 18, by + 4);
        ctx.quadraticCurveTo(bx + 28, by - 10, bx + 35, by - 7);
        ctx.stroke();
      }
    }

    // 足跡。入口から池、池から巣穴へ続く二種類のトレイル。
    ctx.fillStyle = "rgba(20,18,14,0.38)";
    for (let i = 0; i < 13; i += 1) {
      const t = i / 12;
      const fx = rect.x0 + 610 - t * 330;
      const fy = rect.y1 - 90 - t * 420;
      const side = i % 2 ? 7 : -7;
      ctx.beginPath();
      ctx.ellipse(fx + side, fy, 5, 8, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 11; i += 1) {
      const t = i / 10;
      const fx = pondX + 80 + t * (caveX - pondX - 135);
      const fy = pondY - 20 - t * 120;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 4, 6, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 石積みの道標。
    for (const [cx, cy] of [[575, 690], [520, 390], [905, 330]] as const) {
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = i % 2 ? "#6a675d" : "#595950";
        ctx.beginPath();
        ctx.ellipse(rect.x0 + cx, rect.y0 + cy - i * 8, 10 - i * 1.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 誰かが昔使った焚き火跡。今は消えている。
    const ashX = rect.x0 + 440;
    const ashY = rect.y0 + 560;
    ctx.fillStyle = "rgba(20,18,16,0.7)";
    ctx.beginPath();
    ctx.ellipse(ashX, ashY, 23, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b4531";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ashX - 18, ashY - 7);
    ctx.lineTo(ashX + 18, ashY + 7);
    ctx.moveTo(ashX + 16, ashY - 8);
    ctx.lineTo(ashX - 16, ashY + 8);
    ctx.stroke();

    // 鳥の群れ。空にも動きを置く。
    ctx.strokeStyle = "rgba(7,10,8,0.72)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i += 1) {
      const flight = (time * (18 + i * 1.3) + i * 141) % (w + 180);
      const fx = rect.x0 - 90 + flight;
      const fy = rect.y0 + 72 + ((i * 61) % 180) + Math.sin(time * 3 + i) * 8;
      const flap = Math.sin(time * 8 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(fx - 9, fy + flap);
      ctx.quadraticCurveTo(fx - 4, fy - 5, fx, fy);
      ctx.quadraticCurveTo(fx + 4, fy - 5, fx + 9, fy - flap);
      ctx.stroke();
    }

    // 蛍。以前より数を増やし、池・古木・獣道にまとまりを作る。
    for (let i = 0; i < 24; i += 1) {
      const drift = (time * (8 + (i % 6)) + i * 91) % Math.max(160, w - 80);
      const fx = rect.x0 + 40 + drift;
      const fy = rect.y0 + 90 + ((i * 131) % Math.max(120, h - 160)) + Math.sin(time * 1.7 + i) * 7;
      const glow = 0.16 + Math.abs(Math.sin(time * 2.4 + i)) * 0.62;
      ctx.fillStyle = `rgba(210,225,120,${glow})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5 + (i % 3) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
'''
src = src[:start] + new_block + src[end:]
shop.write_text(src)
print("components/Shop.tsx: enriched night forest scenery")

# 2) 動く鹿・ウサギ。オオカミ以外にも常に何かが動いている森にする。
shop = Path("components/Shop.tsx")
src = shop.read_text()
helper_anchor = '''/** 夜の森のオオカミ。犬ぞりの犬より低く、細く、灰色で目だけが光る。 */'''
helpers = r'''/** 夜の森の鹿。池と古木のあいだをゆっくり横切る。 */
const nightDeer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  moving: boolean,
  time: number,
  buck = false,
) => {
  const gait = moving ? Math.sin(time * 8 + x * 0.01) * 2.8 : 0;
  shadow(ctx, x, y + 7, 16);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.strokeStyle = "#72563b";
  ctx.lineWidth = 2.4;
  for (const [i, lx] of [-8, 5].entries()) {
    ctx.beginPath();
    ctx.moveTo(lx, -3);
    ctx.lineTo(lx + (i === 0 ? gait : -gait), 9);
    ctx.stroke();
  }
  ctx.fillStyle = "#876649";
  ctx.beginPath();
  ctx.ellipse(-2, -10, 15, 8, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#876649";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(8, -13);
  ctx.lineTo(14, -28);
  ctx.stroke();
  ctx.fillStyle = "#956f4e";
  ctx.beginPath();
  ctx.ellipse(16, -31, 6.5, 5.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -35);
  ctx.lineTo(12, -43);
  ctx.lineTo(17, -36);
  ctx.moveTo(18, -35);
  ctx.lineTo(22, -42);
  ctx.lineTo(21, -34);
  ctx.fill();
  ctx.fillStyle = "#181512";
  ctx.beginPath();
  ctx.arc(18, -32, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d7c5a2";
  ctx.beginPath();
  ctx.arc(-15, -12, 3, 0, Math.PI * 2);
  ctx.fill();
  if (buck) {
    ctx.strokeStyle = "#b8a98d";
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(15 + side * 2, -36);
      ctx.lineTo(13 + side * 7, -48);
      ctx.moveTo(14 + side * 5, -44);
      ctx.lineTo(10 + side * 10, -49);
      ctx.stroke();
    }
  }
  ctx.restore();
};

/** 夜の森のウサギ。下草から飛び出して小刻みに走る。 */
const nightRabbit = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  time: number,
) => {
  const hop = Math.abs(Math.sin(time * 6 + x * 0.02)) * 4;
  shadow(ctx, x, y + 4, 7);
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale(face, 1);
  ctx.fillStyle = "#7b756a";
  ctx.beginPath();
  ctx.ellipse(-1, -5, 7, 4.8, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -9, 4, 0, Math.PI * 2);
  ctx.fill();
  for (const ox of [4, 8]) {
    ctx.beginPath();
    ctx.ellipse(ox, -16, 2.1, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ddd8cb";
  ctx.beginPath();
  ctx.arc(-7, -5, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#151515";
  ctx.beginPath();
  ctx.arc(8, -10, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

'''
if helpers not in src:
    if helper_anchor not in src:
        raise SystemExit("night wolf helper anchor not found")
    src = src.replace(helper_anchor, helpers + helper_anchor, 1)
    shop.write_text(src)
    print("components/Shop.tsx: added ambient animal drawings")
else:
    print("components/Shop.tsx: ambient animal drawings already present")

shop = Path("components/Shop.tsx")
src = shop.read_text()
actor_anchor = '''      // 夜の森のオオカミ。HP敵ではなく、光から逃げる生きもの。
      for (const wolf of state.fire.nightWolves) {'''
actor_code = r'''      // 鹿とウサギは倒す対象ではない。森そのものが生きているように常に動かす。
      if (isFire && state.unlocked.includes("area-6")) {
        for (let i = 0; i < 3; i += 1) {
          const span = 860;
          const raw = (time * (10 + i * 1.7) + i * 281) % (span * 2);
          const forward = raw < span;
          const px = 1745 + (forward ? raw : span * 2 - raw);
          const py = -650 + i * 175 + Math.sin(time * 0.8 + i * 2.3) * 22;
          actors.push({
            y: py,
            render: () => nightDeer(ctx, px, py, forward ? 1 : -1, true, time + i * 0.7, i === 0),
          });
        }
        for (let i = 0; i < 6; i += 1) {
          const span = 720;
          const raw = (time * (18 + (i % 3) * 3) + i * 173) % (span * 2);
          const forward = raw < span;
          const px = 1810 + (forward ? raw : span * 2 - raw);
          const py = -145 - (i % 4) * 145 + Math.sin(time * 2 + i) * 13;
          actors.push({
            y: py,
            render: () => nightRabbit(ctx, px, py, forward ? 1 : -1, time + i * 0.4),
          });
        }
      }

      // 夜の森のオオカミ。HP敵ではなく、光から逃げる生きもの。
      for (const wolf of state.fire.nightWolves) {'''
if actor_code not in src:
    if actor_anchor not in src:
        raise SystemExit("night forest actor anchor not found")
    src = src.replace(actor_anchor, actor_code, 1)
    shop.write_text(src)
    print("components/Shop.tsx: added ambient animal actors")
else:
    print("components/Shop.tsx: ambient animal actors already present")

# 3) 前に話した UI 文言も同時に直す。「なつき」だと一瞬読み違えるので明示する。
for filename in ["components/Shop.tsx", "lib/fire.ts"]:
    p = Path(filename)
    text = p.read_text()
    text2 = text.replace("なつき ${", "懐き度 ${")
    if text2 != text:
        p.write_text(text2)
        print(f"{filename}: renamed trust label to 懐き度")

# 4) 仕様メモ。
docs = Path("docs/fire-zones.md")
text = docs.read_text()
marker = "### 夜の森・密度アップ"
if marker not in text:
    text += r'''

### 夜の森・密度アップ

夜の森は空白を作らず、たいまつの光で「見つかるもの」が増える密度にする。
常設ランドマークは池、洞穴、巨大古木、倒木、岩、茂み、木の実、キノコ・薬草、骨、足跡、石積み、消えた焚き火跡。
背景では鳥と蛍が動き、地上では鹿とウサギが常に横切る。オオカミだけが動く森にはしない。
暗闇の描画は既存システムを使うため、たいまつを増やすほどこれらのオブジェクトが光の中に浮かび、開拓の手応えになる。
'''
    docs.write_text(text)
    print("docs/fire-zones.md: documented density pass")
