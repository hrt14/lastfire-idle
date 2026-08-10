from pathlib import Path

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

# ---------- lib/shop.ts: palette types ----------
path = 'lib/shop.ts'
s = read(path)
old = '    | "horror"\n    | "nightforest";'
new = '    | "horror"\n    | "nightforest"\n    | "northmeadow"\n    | "moonmarsh"\n    | "rockcave"\n    | "starglen"\n    | "headwater";'
if old not in s:
    raise SystemExit('palette anchor missing')
s = s.replace(old, new, 1)
write(path, s)

# ---------- data/stages.ts: five northern side areas ----------
path = 'data/stages.ts'
s = read(path)
start = s.index('const fireAreas: AreaSpec[] = [')
end_marker = '\n];\n\n/**\n * 火のはじまりの流れ'
end = s.index(end_marker, start)
areas = r'''
  /*
   * 北側の寄り道帯。夜の森だけが北へ飛び出して見えないように、
   * 本編の各区画と並走する「野生を広く使う投資ルート」をつなげる。
   * どれも本編クリアの必須条件にはしない。
   */
  {
    id: "area-7",
    label: "風の高台へ登る",
    price: 9000,
    rect: { x0: 0, y0: -820, x1: 720, y1: 0 },
    padPos: { x: 360, y: 34 },
    palette: { floor: "#39452b", deep: "#20291a", prop: "northmeadow" },
    unlockAfter: "area-1",
    reveal: 21.8,
  },
  {
    id: "area-8",
    label: "月の湿地へ入る",
    price: 28000,
    rect: { x0: 720, y0: -820, x1: 1620, y1: 0 },
    padPos: { x: 1170, y: 34 },
    palette: { floor: "#263c37", deep: "#142521", prop: "moonmarsh" },
    unlockAfter: "mark-night-1",
    reveal: 35.8,
  },
  {
    id: "area-9",
    label: "岩棚の洞窟をひらく",
    price: 260000,
    rect: { x0: 2860, y0: -820, x1: 3760, y1: 0 },
    padPos: { x: 3310, y: 34 },
    palette: { floor: "#3d4140", deep: "#202526", prop: "rockcave" },
    unlockAfter: "area-3",
    reveal: 61.5,
  },
  {
    id: "area-10",
    label: "星見の丘へ登る",
    price: 900000,
    rect: { x0: 3760, y0: -820, x1: 4660, y1: 0 },
    padPos: { x: 4210, y: 34 },
    palette: { floor: "#353d2b", deep: "#202617", prop: "starglen" },
    unlockAfter: "area-4",
    reveal: 81.5,
  },
  {
    id: "area-11",
    label: "上流の滝へ進む",
    price: 3800000,
    rect: { x0: 4660, y0: -820, x1: 5560, y1: 0 },
    padPos: { x: 5110, y: 34 },
    palette: { floor: "#29444a", deep: "#152a2f", prop: "headwater" },
    unlockAfter: "area-5",
    reveal: 101.5,
  },
'''
s = s[:end] + areas + s[end:]

# ---------- data/stages.ts: more night-forest + northern investments ----------
start = s.index('const fireEquipment: EquipSpec[] = [')
end_marker = '\n];\n\n/**\n * 強化は、その強化が効く相手を体験してから出す'
end = s.index(end_marker, start)
extra_equipment = r'''

  /* --- 夜の森を「買って育てる」ための追加投資 --- */
  { id: "night-torch-4", name: "古木のたいまつ台", detail: "巨大古木の周りまで安全地帯を伸ばす。夜ごとに薪を1こ使う", pos: { x: 2380, y: -690 }, price: 240000, area: 6, unlockAfter: "equip-night-torch-3", reveal: 54.4 },
  { id: "night-torch-5", name: "巣穴前のたいまつ台", detail: "洞穴の手前まで火をつなぐ。夜ごとに薪を1こ使う", pos: { x: 2740, y: -720 }, price: 340000, area: 6, unlockAfter: "equip-night-torch-4", reveal: 54.8 },
  { id: "night-path", name: "森の丸太道", detail: "入口から餌場までの移動が速くなる", pos: { x: 2190, y: -350 }, price: 140000, area: 6, road: { from: { x: 2180, y: -30 }, to: { x: 2470, y: -520 } }, unlockAfter: "equip-hand-torch", reveal: 53.3 },
  { id: "night-wood-rack", name: "薪の高床棚", detail: "夜番の薪置き場に積める数 +12", pos: { x: 1840, y: -235 }, price: 120000, area: 6, capacity: { stove: "night-wood", plus: 12 }, unlockAfter: "night-wood", reveal: 53.4 },
  { id: "night-bait-rack", name: "餌場の石囲い", detail: "オオカミの餌場に積める肉 +8", pos: { x: 2520, y: -520 }, price: 150000, area: 6, capacity: { stove: "night-bait", plus: 8 }, unlockAfter: "night-bait", reveal: 53.6 },
  { id: "wolf-feeding-rack", name: "餌の置き分け", detail: "一晩に必要なマンモス肉が 2こ→1こになる", pos: { x: 2550, y: -455 }, price: 220000, area: 6, unlockAfter: "equip-night-bait-rack", reveal: 54.0 },
  { id: "wolf-fence", name: "枝の防護柵", detail: "暗がりから同時に近づくオオカミをさらに1頭減らす", pos: { x: 2660, y: -330 }, price: 280000, area: 6, unlockAfter: "equip-wolf-bell", reveal: 54.6 },
  { id: "dog-shelter", name: "犬の寝床", detail: "最初の犬が速く走り、マンモスの追い込みも強くなる", pos: { x: 2490, y: -390 }, price: 420000, area: 6, unlockAfter: "mark-dog", reveal: 55.0 },

  /* --- area-7 風の高台: 初期区画の生産力を横から底上げ --- */
  { id: "north-trail", name: "高台の獣道", detail: "高台を縦に抜ける近道。通ると足が速くなる", pos: { x: 360, y: -310 }, price: 12000, area: 7, road: { from: { x: 360, y: -30 }, to: { x: 360, y: -700 } }, reveal: 22.1 },
  { id: "north-hunt-cache", name: "狩りの物置", detail: "はじまりの狩り場に置ける肉 +6", pos: { x: 150, y: -250 }, price: 16000, area: 7, capacity: { stove: "hunt-1", plus: 6 }, reveal: 22.4 },
  { id: "north-log-rack", name: "丸太の高床棚", detail: "はじまりの森に置ける丸太 +6", pos: { x: 570, y: -250 }, price: 19000, area: 7, capacity: { stove: "forest-1", plus: 6 }, unlockAfter: "equip-north-hunt-cache", reveal: 22.7 },
  { id: "north-hide", name: "狩人の雨よけ", detail: "高台で休める。仲間が少し集まりやすくなる", pos: { x: 210, y: -520 }, price: 26000, area: 7, draw: 1.05, reveal: 23.0 },
  { id: "north-fire", name: "高台ののろし火", detail: "遠くからも見える火。仲間がさらに集まりやすくなる", pos: { x: 520, y: -610 }, price: 42000, area: 7, draw: 1.06, unlockAfter: "equip-north-hide", reveal: 23.4 },

  /* --- area-8 月の湿地: 集落の備蓄と移動を強くする --- */
  { id: "marsh-walkway", name: "湿地の丸太道", detail: "ぬかるみを越える道。北側の移動が速くなる", pos: { x: 1120, y: -360 }, price: 36000, area: 8, road: { from: { x: 1140, y: -30 }, to: { x: 1120, y: -700 } }, reveal: 36.1 },
  { id: "marsh-food-rack", name: "湿地の保存棚", detail: "集落の食料庫に積める保存肉 +6", pos: { x: 900, y: -280 }, price: 46000, area: 8, capacity: { stove: "store-1", plus: 6 }, reveal: 36.4 },
  { id: "marsh-smoke-rack", name: "風通しの燻製棚", detail: "燻製小屋に置ける保存肉 +6", pos: { x: 1320, y: -270 }, price: 52000, area: 8, capacity: { stove: "smoke-1", plus: 6 }, unlockAfter: "equip-marsh-food-rack", reveal: 36.7 },
  { id: "marsh-log-rack", name: "水辺の丸太棚", detail: "東の森に置ける丸太 +6", pos: { x: 1450, y: -520 }, price: 62000, area: 8, capacity: { stove: "forest-2", plus: 6 }, reveal: 37.0 },
  { id: "marsh-watch", name: "水鳥の見張り台", detail: "湿地を見渡せる。仲間が少し集まりやすくなる", pos: { x: 850, y: -620 }, price: 78000, area: 8, draw: 1.06, unlockAfter: "equip-marsh-walkway", reveal: 37.4 },

  /* --- area-9 岩棚の洞窟: 冬の備蓄を厚くする --- */
  { id: "cave-trail", name: "洞窟への石道", detail: "雪の中でも洞窟へ抜けやすい近道", pos: { x: 3300, y: -330 }, price: 300000, area: 9, road: { from: { x: 3310, y: -30 }, to: { x: 3310, y: -700 } }, reveal: 62.0 },
  { id: "cave-wood-cache", name: "乾いた薪穴", detail: "大型薪倉庫に積める薪 +10", pos: { x: 3050, y: -300 }, price: 340000, area: 9, capacity: { stove: "store-wood", plus: 10 }, reveal: 62.4 },
  { id: "cave-food-cache", name: "岩陰の食料庫", detail: "保存肉倉庫に積める保存肉 +8", pos: { x: 3510, y: -300 }, price: 390000, area: 9, capacity: { stove: "store-food2", plus: 8 }, reveal: 62.8 },
  { id: "cave-coat-rack", name: "毛皮の乾燥棚", detail: "衣装棚に置ける防寒着 +6", pos: { x: 3080, y: -570 }, price: 460000, area: 9, capacity: { stove: "store-coat", plus: 6 }, unlockAfter: "equip-cave-wood-cache", reveal: 63.2 },
  { id: "cave-beacon", name: "洞窟口の火", detail: "吹雪でも洞窟の入口が分かる。仲間が少し集まりやすい", pos: { x: 3500, y: -610 }, price: 560000, area: 9, draw: 1.06, reveal: 63.6 },

  /* --- area-10 星見の丘: 村の工房を拡張する --- */
  { id: "ridge-trail", name: "丘の石段", detail: "村と丘を直につなぐ。移動が速くなる", pos: { x: 4200, y: -330 }, price: 1100000, area: 10, road: { from: { x: 4210, y: -30 }, to: { x: 4210, y: -700 } }, reveal: 82.0 },
  { id: "ridge-clay-rack", name: "粘土の乾燥棚", detail: "粘土穴に置ける粘土 +6", pos: { x: 3900, y: -280 }, price: 1250000, area: 10, capacity: { stove: "claypit-1", plus: 6 }, reveal: 82.4 },
  { id: "ridge-pot-rack", name: "土器の棚場", detail: "土器工房に置ける土器 +6", pos: { x: 4070, y: -510 }, price: 1450000, area: 10, capacity: { stove: "pottery-1", plus: 6 }, reveal: 82.8 },
  { id: "ridge-tool-rack", name: "道具の置き場", detail: "道具工房に置ける道具 +6", pos: { x: 4380, y: -500 }, price: 1700000, area: 10, capacity: { stove: "tool-1", plus: 6 }, reveal: 83.2 },
  { id: "ridge-lookout", name: "丘の見張り台", detail: "村の外まで見渡せる。仲間が少し集まりやすくなる", pos: { x: 4490, y: -650 }, price: 2200000, area: 10, draw: 1.07, reveal: 83.6 },

  /* --- area-11 上流の滝: 川の供給と探索を強くする --- */
  { id: "headwater-trail", name: "上流の岩道", detail: "川辺から滝までの移動が速くなる", pos: { x: 5100, y: -330 }, price: 4300000, area: 11, road: { from: { x: 5110, y: -30 }, to: { x: 5110, y: -700 } }, reveal: 102.0 },
  { id: "headwater-weir", name: "上流の魚どめ", detail: "川の瀬に置ける魚 +10", pos: { x: 5350, y: -250 }, price: 4900000, area: 11, capacity: { stove: "fish-1", plus: 10 }, reveal: 102.4 },
  { id: "headwater-store", name: "岩陰の川倉", detail: "川辺の倉庫に積める保存肉 +10", pos: { x: 4830, y: -260 }, price: 5600000, area: 11, capacity: { stove: "store-river", plus: 10 }, reveal: 102.8 },
  { id: "headwater-plank-rack", name: "乾燥木材棚", detail: "木材加工場に置ける板 +6", pos: { x: 4860, y: -530 }, price: 6500000, area: 11, capacity: { stove: "plank-1", plus: 6 }, reveal: 103.2 },
  { id: "headwater-rope-rack", name: "縄の乾燥棚", detail: "縄工房に置ける縄 +6", pos: { x: 5160, y: -520 }, price: 7600000, area: 11, capacity: { stove: "rope-1", plus: 6 }, reveal: 103.6 },
  { id: "headwater-marker", name: "上流の目印石", detail: "川の曲がりを覚え、探索隊がさらに1.25倍速く帰る", pos: { x: 5420, y: -650 }, price: 9200000, area: 11, unlockAfter: "equip-headwater-trail", reveal: 104.0 },
'''
s = s[:end] + extra_equipment + s[end:]

old_reveal = '''    revealLimitBy: {
      "area-1": 6,
      "area-2": 7,
      "area-3": 7,
      "area-4": 7,
      "area-5": 7,
    },'''
new_reveal = '''    revealLimitBy: {
      "area-1": 6,
      "area-2": 7,
      "area-3": 7,
      "area-4": 7,
      "area-5": 8,
      "area-6": 9,
      "area-7": 8,
      "area-8": 8,
      "area-9": 8,
      "area-10": 8,
      "area-11": 9,
    },'''
if old_reveal not in s:
    raise SystemExit('fire revealLimitBy anchor missing')
s = s.replace(old_reveal, new_reveal, 1)
write(path, s)

# ---------- lib/fire.ts: extra night-forest mechanics + exploration investment ----------
path = 'lib/fire.ts'
s = read(path)
old_posts = '''const NIGHT_POSTS: Vec[] = [
  { x: 1960, y: -250 },
  { x: 2280, y: -430 },
  { x: 2630, y: -620 },
];'''
new_posts = '''const NIGHT_POSTS: Vec[] = [
  { x: 1960, y: -250 },
  { x: 2280, y: -430 },
  { x: 2630, y: -620 },
  { x: 2380, y: -690 },
  { x: 2740, y: -720 },
];'''
if old_posts not in s:
    raise SystemExit('night posts anchor missing')
s = s.replace(old_posts, new_posts, 1)

old_dog = '  if (d > 42) step(fire.dogPos, state.player.pos, d > 180 ? 105 : 72, dt);'
new_dog = '  if (d > 42) {\n    const trained = state.unlocked.includes("equip-dog-shelter");\n    step(fire.dogPos, state.player.pos, d > 180 ? (trained ? 132 : 105) : (trained ? 92 : 72), dt);\n  }'
if old_dog not in s:
    raise SystemExit('dog speed anchor missing')
s = s.replace(old_dog, new_dog, 1)

old_help = '''  const dogHelp =
    state.fire.dogTamed && dist(state.fire.dogPos, beast.pos) < 110 ? 0.35 : 0;'''
new_help = '''  const dogHelp =
    state.fire.dogTamed && dist(state.fire.dogPos, beast.pos) < 110
      ? state.unlocked.includes("equip-dog-shelter") ? 0.6 : 0.35
      : 0;'''
if old_help not in s:
    raise SystemExit('dog help anchor missing')
s = s.replace(old_help, new_help, 1)

old_wolves = '''  const bell = state.unlocked.includes("equip-wolf-bell") ? 2 : 0;
  const dogGuard = fire.dogTamed ? 1 : 0;
  const maxWolves = Math.max(2, 5 - bell - dogGuard);'''
new_wolves = '''  const bell = state.unlocked.includes("equip-wolf-bell") ? 2 : 0;
  const fence = state.unlocked.includes("equip-wolf-fence") ? 1 : 0;
  const dogGuard = fire.dogTamed ? 1 : 0;
  const maxWolves = Math.max(1, 5 - bell - fence - dogGuard);'''
if old_wolves not in s:
    raise SystemExit('wolf count anchor missing')
s = s.replace(old_wolves, new_wolves, 1)

old_bait = '''  const nightAge = fire.clock - DAY_TIME - DUSK_TIME;
  const bait = state.hold["night-bait"] ?? 0;
  if (!fire.dogTamed && nightAge >= 7 && fire.wolfFedDay !== fire.day && bait >= 2) {
    state.hold["night-bait"] = bait - 2;'''
new_bait = '''  const nightAge = fire.clock - DAY_TIME - DUSK_TIME;
  const bait = state.hold["night-bait"] ?? 0;
  const baitNeed = state.unlocked.includes("equip-wolf-feeding-rack") ? 1 : 2;
  if (!fire.dogTamed && nightAge >= 7 && fire.wolfFedDay !== fire.day && bait >= baitNeed) {
    state.hold["night-bait"] = bait - baitNeed;'''
if old_bait not in s:
    raise SystemExit('bait anchor missing')
s = s.replace(old_bait, new_bait, 1)

old_maps = '''  const maps = state.unlocked.includes("equip-map-1") ? 1.6 : 1;
  fire.voyageLeft -= dt * (1 + crew * 0.5) * maps;'''
new_maps = '''  const maps = state.unlocked.includes("equip-map-1") ? 1.6 : 1;
  const headwater = state.unlocked.includes("equip-headwater-marker") ? 1.25 : 1;
  fire.voyageLeft -= dt * (1 + crew * 0.5) * maps * headwater;'''
if old_maps not in s:
    raise SystemExit('voyage anchor missing')
s = s.replace(old_maps, new_maps, 1)
write(path, s)

# ---------- components/Shop.tsx: north biome backgrounds + investment visuals ----------
path = 'components/Shop.tsx'
s = read(path)
anchor = '  if (palette.prop === "nightforest") {'
if anchor not in s:
    raise SystemExit('nightforest draw anchor missing')
north_draw = r'''  if (
    palette.prop === "northmeadow" ||
    palette.prop === "moonmarsh" ||
    palette.prop === "rockcave" ||
    palette.prop === "starglen" ||
    palette.prop === "headwater"
  ) {
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;
    const seed = Math.round(rect.x0 / 720) + 3;

    // 共通: 北側は地面そのものに密度を出す。草・石・低木を散らす。
    for (let i = 0; i < 30; i += 1) {
      const px = rect.x0 + 34 + ((i * 149 + seed * 37) % Math.max(80, w - 68));
      const py = rect.y0 + 40 + ((i * 83 + seed * 61) % Math.max(80, h - 80));
      if (palette.prop === "rockcave") {
        ctx.fillStyle = i % 3 === 0 ? "#5b5a55" : "#474944";
        ctx.beginPath();
        ctx.ellipse(px, py, 9 + (i % 4) * 3, 5 + (i % 3) * 2, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = palette.prop === "headwater" ? "#406b5d" : "#4c623d";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py + 8);
        ctx.lineTo(px - 4, py - 7 - (i % 3) * 3);
        ctx.moveTo(px, py + 8);
        ctx.lineTo(px + 5, py - 5 - (i % 4) * 2);
        ctx.stroke();
      }
    }

    if (palette.prop === "northmeadow") {
      // 風の高台: 岩の縁、低い草、遠くへ向く風見布。
      ctx.fillStyle = "rgba(116,133,80,0.22)";
      for (let i = 0; i < 9; i += 1) {
        ctx.beginPath();
        ctx.ellipse(rect.x0 + 70 + i * (w - 140) / 8, rect.y0 + 190 + (i % 3) * 130, 44, 18, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 5; i += 1) {
        const x = rect.x0 + 90 + i * 130;
        const y = rect.y0 + 120 + (i % 2) * 210;
        ctx.fillStyle = "#665a43";
        ctx.fillRect(x - 2, y - 28, 4, 36);
        ctx.fillStyle = "#b28a52";
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 26);
        ctx.quadraticCurveTo(x + 24 + Math.sin(time * 3 + i) * 8, y - 18, x + 7, y - 8);
        ctx.lineTo(x + 2, y - 26);
        ctx.fill();
      }
      // 鹿の足跡が北へ続く。
      ctx.fillStyle = "rgba(65,49,31,0.42)";
      for (let i = 0; i < 11; i += 1) {
        const x = rect.x0 + 310 + Math.sin(i * 0.8) * 90;
        const y = rect.y1 - 70 - i * 55;
        ctx.beginPath();
        ctx.ellipse(x - 4, y, 3, 7, -0.35, 0, Math.PI * 2);
        ctx.ellipse(x + 4, y, 3, 7, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (palette.prop === "moonmarsh") {
      // 月の湿地: 水たまりが点在し、葦・蛙の波紋・水鳥が動く。
      for (let i = 0; i < 7; i += 1) {
        const x = rect.x0 + 90 + ((i * 137) % Math.max(150, w - 180));
        const y = rect.y0 + 110 + ((i * 163) % Math.max(180, h - 220));
        ctx.fillStyle = "rgba(34,80,77,0.72)";
        ctx.beginPath();
        ctx.ellipse(x, y, 50 + (i % 3) * 17, 24 + (i % 2) * 9, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(145,200,178,0.22)";
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(time + i) * 7, y, 12 + (i % 3) * 5, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "#47664b";
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i += 1) {
        const x = rect.x0 + 30 + ((i * 79) % Math.max(100, w - 60));
        const y = rect.y0 + 80 + ((i * 107) % Math.max(100, h - 120));
        ctx.beginPath();
        ctx.moveTo(x, y + 15);
        ctx.lineTo(x + Math.sin(i) * 4, y - 18);
        ctx.stroke();
      }
      // 水鳥が低く横切る。
      ctx.strokeStyle = "rgba(215,225,205,0.65)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i += 1) {
        const x = rect.x0 + ((time * (28 + i * 5) + i * 210) % (w + 120)) - 60;
        const y = rect.y0 + 90 + i * 55;
        ctx.beginPath();
        ctx.arc(x - 5, y, 7, Math.PI * 1.1, Math.PI * 1.85);
        ctx.arc(x + 5, y, 7, Math.PI * 1.15, Math.PI * 1.9);
        ctx.stroke();
      }
    } else if (palette.prop === "rockcave") {
      // 岩棚の洞窟: 大きな岩壁と複数の穴、天井からつらら。
      ctx.fillStyle = "#4b4d49";
      for (let i = 0; i < 9; i += 1) {
        const x = rect.x0 + 55 + i * (w - 110) / 8;
        const y = rect.y0 + 150 + (i % 2) * 30;
        ctx.beginPath();
        ctx.ellipse(x, y, 78, 105 + (i % 3) * 24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [x, y, rx, ry] of [[0.25, 0.28, 62, 52], [0.57, 0.23, 78, 60], [0.82, 0.32, 54, 45]] as const) {
        ctx.fillStyle = "#111514";
        ctx.beginPath();
        ctx.ellipse(rect.x0 + w * x, rect.y0 + h * y, rx, ry, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(220,235,240,0.72)";
      for (let i = 0; i < 13; i += 1) {
        const x = rect.x0 + 45 + ((i * 73) % Math.max(90, w - 90));
        ctx.beginPath();
        ctx.moveTo(x - 4, rect.y0 + 5);
        ctx.lineTo(x + 5, rect.y0 + 5);
        ctx.lineTo(x, rect.y0 + 32 + (i % 4) * 10);
        ctx.closePath();
        ctx.fill();
      }
    } else if (palette.prop === "starglen") {
      // 星見の丘: なだらかな尾根、石の輪、夜には蛍が星のように見える。
      ctx.fillStyle = "rgba(90,105,62,0.34)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + w * 0.5, rect.y0 + h * 0.48, w * 0.42, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      const cx = rect.x0 + w * 0.52;
      const cy = rect.y0 + h * 0.32;
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const x = cx + Math.cos(a) * 105;
        const y = cy + Math.sin(a) * 45;
        ctx.fillStyle = "#777468";
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 17, a, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 16; i += 1) {
        const x = rect.x0 + 40 + ((i * 101) % Math.max(120, w - 80));
        const y = rect.y0 + 70 + ((i * 61) % Math.max(120, h - 160));
        const glow = 0.25 + Math.abs(Math.sin(time * 2.1 + i)) * 0.6;
        ctx.fillStyle = `rgba(222,229,136,${glow})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (palette.prop === "headwater") {
      // 上流の滝: 北端から水が落ち、岩のあいだを南へ流れる。
      const riverX = rect.x0 + w * 0.68;
      ctx.fillStyle = "rgba(58,123,139,0.72)";
      ctx.beginPath();
      ctx.moveTo(riverX - 74, rect.y0);
      ctx.lineTo(riverX + 52, rect.y0);
      ctx.bezierCurveTo(riverX + 110, rect.y0 + 180, riverX - 10, rect.y0 + 350, riverX + 35, rect.y1);
      ctx.lineTo(riverX - 90, rect.y1);
      ctx.bezierCurveTo(riverX - 120, rect.y0 + 380, riverX + 20, rect.y0 + 180, riverX - 74, rect.y0);
      ctx.fill();
      ctx.fillStyle = "rgba(220,245,250,0.62)";
      for (let i = 0; i < 18; i += 1) {
        const x = riverX - 55 + ((i * 31) % 100);
        const y = rect.y0 + 40 + ((time * (38 + i) + i * 67) % Math.max(100, h - 80));
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#55584f";
      for (let i = 0; i < 12; i += 1) {
        const x = rect.x0 + 70 + ((i * 167) % Math.max(100, w - 140));
        const y = rect.y0 + 90 + ((i * 113) % Math.max(100, h - 180));
        ctx.beginPath();
        ctx.ellipse(x, y, 24 + (i % 4) * 8, 12 + (i % 3) * 4, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
'''
s = s.replace(anchor, north_draw + anchor, 1)

# Purchased northern investments need to look like actual objects, not generic benches.
equip_anchor = '  /* --- 谷の罠。買うと、その場所に実物が現れる（枠だけで効かせない） --- */'
if equip_anchor not in s:
    raise SystemExit('drawEquip anchor missing')
equip_draw = r'''  const wildNorth =
    id.startsWith("north-") || id.startsWith("marsh-") || id.startsWith("cave-") ||
    id.startsWith("ridge-") || id.startsWith("headwater-") || id === "night-path" ||
    id === "night-wood-rack" || id === "night-bait-rack" || id === "wolf-feeding-rack" ||
    id === "wolf-fence" || id === "dog-shelter";
  if (wildNorth) {
    if (id.includes("trail") || id.includes("walkway") || id === "night-path") {
      ctx.fillStyle = "#7b684b";
      for (let i = -2; i <= 2; i += 1) {
        ctx.save();
        ctx.translate(x + i * 10, y - i * 3);
        ctx.rotate(-0.14);
        roundRect(ctx, -9, -3, 18, 6, 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }
    if (id.includes("rack") || id.includes("cache") || id.includes("store")) {
      ctx.fillStyle = "#604a31";
      roundRect(ctx, x - 24, y - 24, 48, 32, 4);
      ctx.fill();
      ctx.strokeStyle = "#9c7c4e";
      ctx.lineWidth = 2;
      for (const oy of [-13, -2]) {
        ctx.beginPath();
        ctx.moveTo(x - 21, y + oy);
        ctx.lineTo(x + 21, y + oy);
        ctx.stroke();
      }
      ctx.fillStyle = "#b49a6a";
      for (let i = 0; i < 4; i += 1) {
        roundRect(ctx, x - 18 + (i % 2) * 20, y - 20 + Math.floor(i / 2) * 12, 14, 8, 2);
        ctx.fill();
      }
      return;
    }
    if (id.includes("lookout") || id.includes("watch")) {
      ctx.strokeStyle = "#684d31";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 12);
      ctx.lineTo(x - 8, y - 32);
      ctx.moveTo(x + 14, y + 12);
      ctx.lineTo(x + 8, y - 32);
      ctx.stroke();
      ctx.fillStyle = "#705438";
      roundRect(ctx, x - 24, y - 38, 48, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#493523";
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 38);
      ctx.lineTo(x, y - 54);
      ctx.lineTo(x + 28, y - 38);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (id.includes("fire") || id.includes("beacon")) {
      ctx.fillStyle = "#5c5144";
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 12, y + Math.sin(a) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const flame = 0.6 + Math.abs(Math.sin(time * 6)) * 0.4;
      ctx.fillStyle = `rgba(255,145,55,${flame})`;
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.quadraticCurveTo(x + 13, y - 18, x + 2, y - 34);
      ctx.quadraticCurveTo(x - 12, y - 18, x, y - 2);
      ctx.fill();
      return;
    }
    if (id === "wolf-fence") {
      ctx.strokeStyle = "#725536";
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i += 1) {
        const px = x + i * 14;
        ctx.beginPath();
        ctx.moveTo(px, y + 12);
        ctx.lineTo(px + (i % 2) * 5, y - 30 - Math.abs(i) * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "#a08354";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 32, y - 10);
      ctx.lineTo(x + 32, y - 4);
      ctx.stroke();
      return;
    }
    if (id === "dog-shelter" || id === "north-hide") {
      ctx.fillStyle = "#6b5137";
      ctx.beginPath();
      ctx.moveTo(x - 28, y + 8);
      ctx.lineTo(x, y - 34);
      ctx.lineTo(x + 28, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#211914";
      roundRect(ctx, x - 9, y - 8, 18, 16, 6);
      ctx.fill();
      return;
    }
    if (id.includes("marker")) {
      ctx.fillStyle = "#77756d";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x, y + 8 - i * 9, 18 - i * 3, 7, i * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (id.includes("weir")) {
      ctx.strokeStyle = "#8a7148";
      ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 8, y + 12);
        ctx.lineTo(x + i * 8 + 4, y - 20);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(205,235,240,0.6)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 38, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    // その他は石積み・杭として見せる。
    ctx.fillStyle = "#777164";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x - 22 + i * 11, y + 5 - (i % 2) * 5, 9, 6, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

'''
s = s.replace(equip_anchor, equip_draw + equip_anchor, 1)
write(path, s)

# ---------- docs ----------
path = 'docs/fire-zones.md'
s = read(path)
append = r'''

## 北側の寄り道帯（2026-08-10追加）

夜の森だけが北へ張り出していた空白を、5つの任意エリアでつないだ。
本編の年代を先へ進めず、狩猟採集時代の「環境を使いこなす」遊びを増やす。

- area-7 風の高台: 狩り場・森の置き場、近道、見張り
- area-8 月の湿地: 保存肉・燻製・丸太の備蓄、湿地の丸太道
- area-6 夜の森: たいまつ5基、丸太道、餌と薪の拡張、柵、犬の寝床
- area-9 岩棚の洞窟: 冬用の薪・食料・防寒着の備蓄
- area-10 星見の丘: 粘土・土器・道具の工房拡張
- area-11 上流の滝: 魚・板・縄・川倉庫、探索速度強化

各エリアには5〜8個の投資先を置き、開けただけで終わらず、景色と効率が段階的に育つようにする。
'''
if '## 北側の寄り道帯（2026-08-10追加）' not in s:
    s += append
write(path, s)
