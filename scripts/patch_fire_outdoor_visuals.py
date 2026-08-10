from pathlib import Path
import re

shop_path = Path("components/Shop.tsx")
css_path = Path("app/globals.css")
shop = shop_path.read_text()
css = css_path.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing anchor: {label}")
    return text.replace(old, new, 1)

shop = replace_once(
    shop,
    'import { useCallback, useEffect, useRef } from "react";',
    'import { useCallback, useEffect, useRef, useState } from "react";',
    "react import",
)

helper = r'''
/**
 * 「火のはじまり」専用の屋外地面。
 * 区画を一枚の床として見せず、土・草・石・枝・泥・雪がまたがって見えるようにする。
 * 座標から決まる配置だけを使うので、毎フレームちらつかない。
 */
const drawFireGroundTexture = (
  ctx: CanvasRenderingContext2D,
  area: {
    id: string;
    rect: { x0: number; y0: number; x1: number; y1: number };
    palette: { prop: string };
  },
  time: number,
  effects: boolean,
) => {
  const { rect, palette } = area;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const seed = [...area.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const snow = palette.prop === "snow";
  const wet = palette.prop === "moonmarsh" || palette.prop === "headwater" || area.id === "area-5";
  const rocky = palette.prop === "rockcave" || area.id === "area-2";
  const village = area.id === "area-1" || area.id === "area-4";

  // 大きなまだら。四角い床面の印象を先に壊す。
  for (let i = 0; i < 24; i += 1) {
    const x = rect.x0 + 28 + ((i * 137 + seed * 17) % Math.max(70, w - 56));
    const y = rect.y0 + 28 + ((i * 83 + seed * 29) % Math.max(70, h - 56));
    const rx = 24 + (i % 5) * 11;
    const ry = 10 + (i % 4) * 6;
    ctx.fillStyle = snow
      ? i % 3 === 0
        ? "rgba(238,244,242,0.14)"
        : "rgba(78,88,84,0.08)"
      : wet
        ? i % 4 === 0
          ? "rgba(30,67,61,0.20)"
          : "rgba(80,68,42,0.10)"
        : rocky
          ? i % 3 === 0
            ? "rgba(86,78,67,0.18)"
            : "rgba(53,43,31,0.10)"
          : village
            ? "rgba(93,72,43,0.12)"
            : i % 3 === 0
              ? "rgba(83,93,50,0.11)"
              : "rgba(90,66,38,0.11)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, i * 0.37, 0, Math.PI * 2);
    ctx.fill();
  }

  // 小石。岩場は多く、雪原では少なめ。
  const stoneCount = snow ? 12 : rocky ? 34 : 22;
  for (let i = 0; i < stoneCount; i += 1) {
    const x = rect.x0 + 18 + ((i * 97 + seed * 11) % Math.max(50, w - 36));
    const y = rect.y0 + 22 + ((i * 151 + seed * 7) % Math.max(50, h - 44));
    const r = 1.5 + (i % 4) * 0.9;
    ctx.fillStyle = snow
      ? "rgba(88,92,88,0.22)"
      : i % 3 === 0
        ? "rgba(126,112,86,0.24)"
        : "rgba(63,56,45,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.7, r, i * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 草・枯れ草。湿地は葦、冬はほぼ出さない。
  if (!snow) {
    const grassCount = wet ? 34 : 25;
    for (let i = 0; i < grassCount; i += 1) {
      const x = rect.x0 + 20 + ((i * 71 + seed * 19) % Math.max(50, w - 40));
      const y = rect.y0 + 24 + ((i * 113 + seed * 13) % Math.max(50, h - 48));
      const tall = wet ? 8 + (i % 4) * 3 : 5 + (i % 3) * 2;
      ctx.strokeStyle = wet
        ? "rgba(66,91,61,0.50)"
        : i % 4 === 0
          ? "rgba(118,101,61,0.42)"
          : "rgba(68,89,53,0.44)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x - 3, y - tall);
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + 3.5, y - tall + 2);
      ctx.stroke();
    }
  }

  // 枝・骨片のような横線。人工的な床目と違い、向きも長さもばらす。
  if (!wet) {
    for (let i = 0; i < 10; i += 1) {
      const x = rect.x0 + 35 + ((i * 179 + seed * 23) % Math.max(80, w - 70));
      const y = rect.y0 + 35 + ((i * 127 + seed * 5) % Math.max(80, h - 70));
      const a = ((i * 43 + seed) % 90) * (Math.PI / 180) - Math.PI / 4;
      const len = 8 + (i % 5) * 4;
      ctx.strokeStyle = snow ? "rgba(78,67,53,0.24)" : "rgba(63,43,27,0.34)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2);
      ctx.lineTo(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2);
      ctx.stroke();
    }
  }

  // 村・集落は板張りではなく、人が踏み固めた獣道でつなぐ。
  if (village) {
    ctx.strokeStyle = "rgba(132,105,67,0.16)";
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 45, rect.y0 + h * 0.62);
    ctx.bezierCurveTo(
      rect.x0 + w * 0.32,
      rect.y0 + h * 0.48,
      rect.x0 + w * 0.62,
      rect.y0 + h * 0.72,
      rect.x1 - 40,
      rect.y0 + h * 0.56,
    );
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // 演出ONのときだけ、風で動く葉・粉雪を少量。ゲーム情報には関係しない。
  if (effects) {
    ctx.fillStyle = snow ? "rgba(245,250,250,0.44)" : "rgba(184,157,89,0.28)";
    for (let i = 0; i < 7; i += 1) {
      const span = Math.max(100, w + 90);
      const x = rect.x0 - 30 + ((time * (11 + i * 1.7) + i * 137 + seed) % span);
      const y = rect.y0 + 40 + ((i * 97 + seed * 3) % Math.max(80, h - 80));
      ctx.beginPath();
      if (snow) ctx.arc(x, y + Math.sin(time * 1.7 + i) * 7, 1.2 + (i % 2), 0, Math.PI * 2);
      else ctx.ellipse(x, y + Math.sin(time * 1.4 + i) * 5, 2.8, 1.2, time + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

/** 火のはじまりの服は、職業色より毛皮・革・土の色を優先する。 */
const FIRE_ROLE_COATS: Partial<Record<StaffKind, string>> = {
  waiter: "#765d40",
  robot: "#665845",
  collector: "#685542",
  cook: "#8a785d",
  master: "#514638",
  busser: "#6d604d",
  stocker: "#71583d",
  server: "#796043",
  seller: "#6b5842",
  gatekeeper: "#5d5140",
  hunter: "#5b4633",
  logger: "#5d5940",
  splitter: "#755843",
  butcher: "#67483d",
  builder: "#7b6545",
  keeper: "#59604b",
  nightman: "#504c47",
  explorer: "#5b6257",
  runner: "#705842",
  boat: "#625849",
};

const fireRoleCoat = (kind: StaffKind, id: number) =>
  FIRE_ROLE_COATS[kind] ?? ["#6b5742", "#7b6246", "#5d4b3a", "#6c614d"][id % 4];

/** 色ではなく、持ち物と毛皮の形で職業を見分ける。 */
const drawFireRoleMark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: StaffKind,
  id: number,
) => {
  // 毛皮の肩。全員に共通するので、現代的な制服感を消す。
  ctx.strokeStyle = id % 2 ? "rgba(214,189,147,0.52)" : "rgba(87,67,48,0.62)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y - 11, 8.5, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  ctx.strokeStyle = "rgba(62,43,28,0.78)";
  ctx.fillStyle = "rgba(183,158,113,0.86)";
  ctx.lineWidth = 2;
  if (kind === "hunter") {
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 26);
    ctx.lineTo(x + 10, y + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 25);
    ctx.lineTo(x + 10, y - 31);
    ctx.lineTo(x + 12, y - 23);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "builder" || kind === "splitter") {
    ctx.beginPath();
    ctx.moveTo(x + 7, y - 19);
    ctx.lineTo(x + 11, y + 4);
    ctx.stroke();
    ctx.fillRect(x + 4, y - 20, 11, 4);
  } else if (kind === "logger") {
    ctx.beginPath();
    ctx.moveTo(x + 7, y - 20);
    ctx.lineTo(x + 10, y + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 6, y - 20, 6, -0.8, 0.8);
    ctx.stroke();
  } else if (kind === "keeper" || kind === "waiter" || kind === "runner") {
    ctx.strokeStyle = "rgba(101,77,49,0.85)";
    ctx.beginPath();
    ctx.ellipse(x + 9, y - 2, 6, 8, 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(x + 5, y - 7, 8, 8);
  } else if (kind === "nightman") {
    ctx.fillStyle = "rgba(242,156,70,0.82)";
    ctx.beginPath();
    ctx.arc(x + 10, y - 24, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(93,62,34,0.88)";
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 20);
    ctx.lineTo(x + 10, y + 4);
    ctx.stroke();
  } else if (kind === "explorer") {
    ctx.fillStyle = "rgba(196,181,139,0.82)";
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 7);
    ctx.lineTo(x + 14, y - 11);
    ctx.lineTo(x + 12, y - 1);
    ctx.closePath();
    ctx.fill();
  }
};

'''
shop = replace_once(
    shop,
    "/** 区画ごとの飾り（テーマの見分け） */\nconst drawProps = (",
    helper + "/** 区画ごとの飾り（テーマの見分け） */\nconst drawProps = (",
    "visual helpers",
)

shop = replace_once(
    shop,
    "        drawProps(ctx, area, time);",
    "        drawProps(ctx, area, effectsRef.current ? time : 0);\n        if (isFire) drawFireGroundTexture(ctx, area, time, effectsRef.current);",
    "ground texture hook",
)

shop = replace_once(
    shop,
    '        ctx.fillStyle = isPark ? "#414f6b" : "#2b241d";',
    '        ctx.fillStyle = isPark ? "#414f6b" : isFire ? "rgba(83,62,39,0.20)" : "#2b241d";',
    "work floor base",
)
shop = replace_once(
    shop,
    '        ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)";',
    '        ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : isFire ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.03)";',
    "work floor checks color",
)
shop = replace_once(
    shop,
    "            if (((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);",
    "            if (!isFire && ((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);",
    "remove fire checker floor",
)

old_boundary = '''        ctx.strokeStyle = "rgba(246,231,207,0.14)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(
          area.rect.x0 + 1,
          area.rect.y0 + 1,
          area.rect.x1 - area.rect.x0 - 2,
          area.rect.y1 - area.rect.y0 - 2,
        );
        ctx.setLineDash([]);'''
new_boundary = '''        if (!isFire) {
          ctx.strokeStyle = "rgba(246,231,207,0.14)";
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 8]);
          ctx.strokeRect(
            area.rect.x0 + 1,
            area.rect.y0 + 1,
            area.rect.x1 - area.rect.x0 - 2,
            area.rect.y1 - area.rect.y0 - 2,
          );
          ctx.setLineDash([]);
        }'''
shop = replace_once(shop, old_boundary, new_boundary, "remove fire room borders")

shop = replace_once(
    shop,
    '                coats[worker.kind],\n                "#f0cfae",',
    '                isFire ? fireRoleCoat(worker.kind, worker.id) : coats[worker.kind],\n                isFire ? "#caa47d" : "#f0cfae",',
    "staff primitive palette",
)

# Add role silhouettes immediately after the standard person body is drawn.
pattern = re.compile(
    r'(performance\.now\(\) / gait \+ worker\.id,\n\s+\);)(\n\s+const wx = worker\.pos\.x;)'
)
match = pattern.search(shop)
if not match:
    raise SystemExit("missing anchor: staff person end")
shop = shop[:match.start()] + match.group(1) + '\n              if (isFire) drawFireRoleMark(ctx, worker.pos.x, worker.pos.y, worker.kind, worker.id);' + match.group(2) + shop[match.end():]

shop = replace_once(
    shop,
    '              person0.helper ? "#8a6a4a" : "#6f5f8a",\n              "#f0cfae",',
    '              person0.helper ? "#70583f" : "#594b3b",\n              "#caa47d",',
    "resident primitive palette",
)

# Effects toggle state. Ref is read from the RAF loop without rebuilding the draw callback.
shop = replace_once(
    shop,
    "  const canvasRef = useRef<HTMLCanvasElement | null>(null);\n  const input = useRef<Input>({ x: 0, y: 0 });",
    '''  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [effectsOn, setEffectsOn] = useState(true);
  const effectsRef = useRef(true);
  const input = useRef<Input>({ x: 0, y: 0 });''',
    "effects state",
)

# Insert persistence after refs are declared and before the main canvas effect.
anchor = "  const keys = useRef(new Set<string>());"
if anchor not in shop:
    raise SystemExit("missing anchor: keys ref")
insert = '''  const keys = useRef(new Set<string>());

  useEffect(() => {
    const on = localStorage.getItem("working-planet-effects") !== "off";
    effectsRef.current = on;
    setEffectsOn(on);
  }, []);

  const toggleEffects = () => {
    setEffectsOn((current) => {
      const next = !current;
      effectsRef.current = next;
      localStorage.setItem("working-planet-effects", next ? "on" : "off");
      return next;
    });
  };'''
shop = shop.replace(anchor, insert, 1)

# Expensive/cosmetic player glows obey the same switch.
shop = replace_once(
    shop,
    "          if (stars > 0) drawShine(ctx, player.pos.x, player.pos.y, stars, time);",
    "          if (effectsRef.current && stars > 0) drawShine(ctx, player.pos.x, player.pos.y, stars, time);",
    "shine toggle",
)
shop = replace_once(
    shop,
    '          if (skin.aura && skin.aura !== "none") {',
    '          if (effectsRef.current && skin.aura && skin.aura !== "none") {',
    "aura toggle",
)
shop = replace_once(
    shop,
    "          if (stars > 0) {\n            // ★の数だけ、ふちが強く光る",
    "          if (effectsRef.current && stars > 0) {\n            // ★の数だけ、ふちが強く光る",
    "shadow glow toggle",
)

shop = replace_once(
    shop,
    '''  return (
    <div className="stage" ref={wrapRef}>
      <canvas ref={canvasRef} className="shop" />
    </div>
  );''',
    '''  return (
    <div className="stage" ref={wrapRef}>
      <canvas ref={canvasRef} className="shop" />
      <button
        type="button"
        className={`fx-toggle ${effectsOn ? "is-on" : "is-off"}`}
        aria-pressed={effectsOn}
        onClick={toggleEffects}
        title="光・粒子などの演出を切り替える"
      >
        演出 {effectsOn ? "ON" : "OFF"}
      </button>
    </div>
  );''',
    "effects button",
)

css_add = r'''

/* ---------- ゲーム内の演出切替 ---------- */
.fx-toggle {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 9;
  min-width: 4.9rem;
  padding: 0.34rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(246, 231, 207, 0.22);
  background: rgba(20, 15, 11, 0.72);
  color: rgba(246, 236, 224, 0.76);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  touch-action: manipulation;
}
.fx-toggle.is-on {
  border-color: rgba(255, 209, 102, 0.42);
  color: #f4d58a;
}
.fx-toggle.is-off {
  opacity: 0.72;
}
'''
if ".fx-toggle {" not in css:
    css += css_add

shop_path.write_text(shop)
css_path.write_text(css)
print("patched Fire outdoor visual overhaul")
