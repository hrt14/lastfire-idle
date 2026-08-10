from pathlib import Path

stages_path = Path('data/stages.ts')
taiga_path = Path('lib/taiga.ts')
shop_path = Path('lib/shop.ts')

stages = stages_path.read_text(encoding='utf-8')
taiga = taiga_path.read_text(encoding='utf-8')
shop = shop_path.read_text(encoding='utf-8')

if 'id: "area-6"' in stages:
    raise SystemExit('Taiga expansion already present')


def insert_array(text: str, marker: str, block: str) -> str:
    start = text.index(marker)
    end = text.index('\n];', start)
    return text[:end] + '\n' + block.rstrip() + '\n' + text[end:]

# The old area-5 endpoint becomes the gateway to deeper same-era play.
old = '    gives: { sail: true, note: "大型交易船ができた。代表団が上流へ発つ" },'
new = '    gives: { note: "大型交易船ができた。下流の大穀倉地帯へ人と荷を運べるようになった" },'
assert stages.count(old) == 1, stages.count(old)
stages = stages.replace(old, new, 1)
stages = stages.replace(
    '   * 最後の大型交易船が建つと、上流から使者が来てステージが終わる。',
    '   * 大型交易船が建つと、さらに下流の大穀倉地帯へ進める。',
    1,
)
stages = stages.replace(
    '    // これが建つと、上流から使者が来てステージが終わる',
    '    // ここから先も同じ農耕時代を深掘りする。時代が変わるのは次ステージ',
    1,
)

areas = '''  {
    id: "area-6",
    label: "大穀倉地帯を拓く",
    price: 32000000,
    rect: { x0: 5220, y0: 0, x1: 6120, y1: 760 },
    padPos: { x: 5190, y: 300 },
    palette: { floor: "#4b4a2b", deep: "#2d2c18", prop: "market" },
    unlockAfter: "built-build-ship",
    reveal: 120,
  },
  {
    id: "area-7",
    label: "川の三角州へ出る",
    price: 180000000,
    rect: { x0: 6120, y0: 0, x1: 7020, y1: 760 },
    padPos: { x: 6090, y: 300 },
    palette: { floor: "#29454a", deep: "#172b2f", prop: "ship" },
    unlockAfter: "built-build-granary-2",
    reveal: 140,
  },
  {
    id: "area-8",
    label: "大治水を完成させる",
    price: 900000000,
    rect: { x0: 7020, y0: 0, x1: 7920, y1: 760 },
    padPos: { x: 6990, y: 300 },
    palette: { floor: "#4a4033", deep: "#2c251d", prop: "none" },
    unlockAfter: "built-build-delta-dock",
    reveal: 160,
  },'''
stages = insert_array(stages, 'const taigaAreas: AreaSpec[] = [', areas)

stoves = '''  /* --- area-6 第7区画「大穀倉地帯」 --- */
  { id: "intake-2", pos: { x: 5360, y: 150 }, price: 6000000, area: 6, item: "water", art: "intake", label: "大取水口", work: 0.45, hold: 12, reveal: 121 },
  { id: "seed-3", pos: { x: 6040, y: 150 }, price: 5000000, area: 6, item: "seed", art: "seedhut", label: "共同種倉", work: 0.75, hold: 12, reveal: 121.5 },
  { id: "field-6", pos: { x: 5520, y: 300 }, price: 8000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "6面目の畑", work: 1.15, reveal: 122 },
  { id: "field-7", pos: { x: 5700, y: 300 }, price: 12000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "7面目の畑", work: 1.15, reveal: 124 },
  { id: "field-8", pos: { x: 5880, y: 300 }, price: 18000000, area: 6, item: "grain", takes: "water", fuel: "seed", art: "field", label: "8面目の畑", work: 1.1, reveal: 126 },
  {
    id: "build-granary-2", pos: { x: 5920, y: 620 }, price: 24000000, area: 6,
    art: "bighut", label: "共同大穀倉", needs: { wood: 18, clay: 16, pot: 8, grain: 20 },
    gives: { note: "共同大穀倉が完成した。収穫期の余りを町じゅうで蓄えられる" },
    reveal: 130,
  },

  /* --- area-7 第8区画「川の三角州」 --- */
  { id: "fish-2", pos: { x: 6260, y: 360 }, price: 40000000, area: 7, item: "fish", art: "fish", label: "三角州の漁場", manual: true, hold: 10, zone: { x0: 6160, y0: 90, x1: 6460, y1: 320 }, reveal: 141 },
  { id: "dry-2", pos: { x: 6460, y: 230 }, price: 52000000, area: 7, item: "dried", takes: "fish", fuel: "wood", art: "smoke", label: "三角州の干し場", work: 1.0, reveal: 143 },
  { id: "intake-3", pos: { x: 6660, y: 150 }, price: 36000000, area: 7, item: "water", art: "intake", label: "分流水門", work: 0.42, hold: 12, reveal: 142 },
  { id: "field-9", pos: { x: 6740, y: 320 }, price: 48000000, area: 7, item: "grain", takes: "water", fuel: "seed", art: "field", label: "三角州の畑", work: 1.1, reveal: 144 },
  { id: "field-10", pos: { x: 6920, y: 320 }, price: 72000000, area: 7, item: "grain", takes: "water", fuel: "seed", art: "field", label: "河口の畑", work: 1.05, reveal: 146 },
  {
    id: "build-delta-hall", pos: { x: 6500, y: 620 }, price: 90000000, area: 7,
    art: "hall", label: "三角州の交易小屋", needs: { wood: 16, pot: 10, wool: 8 },
    gives: { note: "三角州の交易小屋ができた。農民と漁師が同じ市場を使いはじめる" },
    reveal: 149,
  },
  {
    id: "build-delta-dock", pos: { x: 6780, y: 620 }, price: 140000000, area: 7,
    art: "raft", label: "分流の船着き場", needs: { log: 18, wood: 12, clay: 12 },
    gives: { dock: true, note: "分流の船着き場が完成した。治水工事の場所まで船で資材を運べる" },
    unlockAfter: "built-build-delta-hall", reveal: 153,
  },

  /* --- area-8 第9区画「大治水」 --- */
  { id: "clay-2", pos: { x: 7160, y: 240 }, price: 130000000, area: 8, item: "clay", art: "clay", label: "堤防の粘土場", manual: true, work: 0.7, hold: 12, reveal: 161 },
  { id: "forest-3", pos: { x: 7800, y: 330 }, price: 150000000, area: 8, item: "log", art: "forest", label: "治水の森", zone: { x0: 7620, y0: 90, x1: 7900, y1: 300 }, hold: 10, reveal: 161.5 },
  { id: "split-3", pos: { x: 7700, y: 430 }, price: 170000000, area: 8, item: "wood", takes: "log", art: "split", label: "工事の薪割り場", manual: true, work: 0.45, reveal: 162 },
  {
    id: "build-reservoir", pos: { x: 7280, y: 610 }, price: 260000000, area: 8,
    art: "well", label: "大貯水池", needs: { clay: 24, pot: 14, log: 12 },
    gives: { note: "大貯水池ができた。乾季でも川の水をためておける" }, reveal: 165,
  },
  {
    id: "build-great-levee", pos: { x: 7520, y: 610 }, price: 420000000, area: 8,
    art: "bighut", label: "大堤防", needs: { clay: 36, log: 20, wood: 18 },
    gives: { note: "大堤防がつながった。増水しても人と荷が止まりにくくなった" },
    unlockAfter: "built-build-reservoir", reveal: 169,
  },
  {
    id: "build-great-weir", pos: { x: 7780, y: 610 }, price: 760000000, area: 8,
    art: "hall", label: "大河の水門", needs: { log: 32, wood: 24, clay: 28, pot: 16 },
    gives: { sail: true, note: "大河の水門が完成した。農耕と水運の文明がひとつの流れにつながった" },
    unlockAfter: "built-build-great-levee", reveal: 175,
  },'''
stages = insert_array(stages, 'const taigaStoves: StoveSpec[] = [', stoves)

seats = '''  // 第7区画: 収穫期の大量流通
  ...benchRow(6, 400, "grain", 48, "大穀倉の市", [
    { x: 5360, price: 36000000, reveal: 123 },
    { x: 5500, price: 62000000, reveal: 127 },
  ]),
  ...benchRow(6, 400, "bread", 58, "収穫祭の食事場", [
    { x: 5860, price: 90000000, reveal: 128 },
    { x: 6000, price: 140000000, reveal: 132 },
  ], "t"),
  // 第8区画: 漁と農業が同じ三角州で動く
  ...benchRow(7, 400, "dried", 74, "三角州の魚市", [
    { x: 6280, price: 220000000, reveal: 145 },
    { x: 6420, price: 320000000, reveal: 148 },
  ]),
  ...benchRow(7, 400, "grain", 82, "河口の穀物市", [
    { x: 6800, price: 360000000, reveal: 150 },
    { x: 6940, price: 480000000, reveal: 154 },
  ], "t"),
  // 第9区画: 大工事を支える食事と器
  ...benchRow(8, 400, "bread", 96, "治水工事の食事場", [
    { x: 7160, price: 650000000, reveal: 164 },
    { x: 7300, price: 820000000, reveal: 167 },
  ]),
  ...benchRow(8, 400, "pot", 110, "工事の器市", [
    { x: 7680, price: 980000000, reveal: 171 },
    { x: 7840, price: 1200000000, reveal: 173 },
  ], "t"),'''
stages = insert_array(stages, 'const taigaSeats: SeatSpec[] = [', seats)

hires = '''  /* --- area-6 大穀倉地帯 --- */
  { id: "gateman-2", kind: "cook", pos: { x: 5360, y: 215 }, price: 9000000, label: "大取水口番", stoveId: "intake-2", area: 6, reveal: 121.2 },
  { id: "sower-3", kind: "cook", pos: { x: 6040, y: 215 }, price: 8000000, label: "種倉番", stoveId: "seed-3", area: 6, reveal: 121.7 },
  { id: "farmer-6", kind: "cook", pos: { x: 5520, y: 366 }, price: 12000000, label: "農民", stoveId: "field-6", area: 6, reveal: 122.5 },
  { id: "farmer-7", kind: "cook", pos: { x: 5700, y: 366 }, price: 16000000, label: "農民", stoveId: "field-7", area: 6, reveal: 124.5 },
  { id: "farmer-8", kind: "cook", pos: { x: 5880, y: 366 }, price: 22000000, label: "農民", stoveId: "field-8", area: 6, reveal: 126.5 },
  { id: "builder-3", kind: "builder", pos: { x: 5920, y: 540 }, price: 26000000, label: "穀倉の建築係", area: 6, reveal: 129 },
  { id: "waiter-8", kind: "waiter", pos: { x: 5600, y: 570 }, price: 28000000, label: "収穫のはこび手", area: 6, reveal: 125 },
  { id: "robot-7", kind: "robot", pos: { x: 5680, y: 570 }, price: 52000000, label: "収穫荷車", area: 6, reveal: 131 },
  /* --- area-7 川の三角州 --- */
  { id: "fisher-2", kind: "splitter", pos: { x: 6260, y: 440 }, price: 48000000, label: "三角州の漁師", stoveId: "fish-2", area: 7, reveal: 141.5 },
  { id: "drier-2", kind: "cook", pos: { x: 6460, y: 315 }, price: 60000000, label: "干し場番", stoveId: "dry-2", area: 7, reveal: 143.5 },
  { id: "gateman-3", kind: "cook", pos: { x: 6660, y: 215 }, price: 50000000, label: "分流水門番", stoveId: "intake-3", area: 7, reveal: 142.5 },
  { id: "farmer-9", kind: "cook", pos: { x: 6740, y: 386 }, price: 68000000, label: "三角州の農民", stoveId: "field-9", area: 7, reveal: 144.5 },
  { id: "farmer-10", kind: "cook", pos: { x: 6920, y: 386 }, price: 90000000, label: "河口の農民", stoveId: "field-10", area: 7, reveal: 146.5 },
  { id: "builder-4", kind: "builder", pos: { x: 6540, y: 540 }, price: 110000000, label: "三角州の建築係", area: 7, reveal: 149.5 },
  { id: "waiter-9", kind: "waiter", pos: { x: 6640, y: 570 }, price: 120000000, label: "分流のはこび手", area: 7, reveal: 147 },
  { id: "boat-3", kind: "boat", pos: { x: 6840, y: 520 }, price: 180000000, label: "三角州の運搬船", area: 7, unlockAfter: "built-build-delta-dock", reveal: 154.5 },
  /* --- area-8 大治水 --- */
  { id: "digger-2", kind: "splitter", pos: { x: 7160, y: 320 }, price: 150000000, label: "堤防の土掘り", stoveId: "clay-2", area: 8, reveal: 161.2 },
  { id: "logger-3", kind: "logger", pos: { x: 7840, y: 390 }, price: 170000000, label: "治水の木こり", stoveId: "forest-3", area: 8, reveal: 161.7 },
  { id: "splitter-3", kind: "splitter", pos: { x: 7700, y: 490 }, price: 190000000, label: "工事の薪割り", stoveId: "split-3", area: 8, reveal: 162.5 },
  { id: "builder-5", kind: "builder", pos: { x: 7360, y: 540 }, price: 220000000, label: "治水の建築係", area: 8, reveal: 163 },
  { id: "builder-6", kind: "builder", pos: { x: 7440, y: 540 }, price: 360000000, label: "治水の建築係", area: 8, unlockAfter: "built-build-reservoir", reveal: 166 },
  { id: "waiter-10", kind: "waiter", pos: { x: 7560, y: 540 }, price: 260000000, label: "工事のはこび手", area: 8, reveal: 163.5 },
  { id: "robot-8", kind: "robot", pos: { x: 7640, y: 540 }, price: 480000000, label: "工事の荷車", area: 8, reveal: 168 },'''
stages = insert_array(stages, 'const taigaHires: HireSpec[] = [', hires)

equipment = '''  /* --- 第7区画: 大穀倉地帯 --- */
  { id: "canal-4", name: "大穀倉の主水路", detail: "大取水口の水を、6面目の畑へ流す", pos: { x: 5480, y: 220 }, price: 12000000, area: 6, link: { from: "intake-2", to: "field-6" }, unlockAfter: "field-6", reveal: 123.5 },
  { id: "canal-5", name: "大穀倉の分岐水路", detail: "大取水口の水を、7面目の畑へ流す", pos: { x: 5660, y: 220 }, price: 20000000, area: 6, link: { from: "intake-2", to: "field-7" }, unlockAfter: "equip-canal-4", reveal: 125.5 },
  { id: "canal-6", name: "末端水路", detail: "大取水口の水を、8面目の畑へ流す", pos: { x: 5840, y: 220 }, price: 32000000, area: 6, link: { from: "intake-2", to: "field-8" }, unlockAfter: "equip-canal-5", reveal: 127.5 },
  { id: "seedway-2", name: "共同種の道", detail: "共同種倉から、6面目の畑へ種を送る", pos: { x: 6000, y: 260 }, price: 26000000, area: 6, link: { from: "seed-3", to: "field-6" }, unlockAfter: "sower-3", reveal: 128.5 },
  { id: "harvest-road", name: "収穫の道", detail: "大穀倉地帯を横断する道。収穫の運びが速くなる", pos: { x: 5660, y: 470 }, price: 48000000, area: 6, road: { from: { x: 5260, y: 470 }, to: { x: 6080, y: 470 } }, reveal: 133 },
  /* --- 第8区画: 三角州 --- */
  { id: "canal-delta-1", name: "三角州の水路", detail: "分流水門の水を、三角州の畑へ流す", pos: { x: 6740, y: 230 }, price: 70000000, area: 7, link: { from: "intake-3", to: "field-9" }, unlockAfter: "field-9", reveal: 145.5 },
  { id: "canal-delta-2", name: "河口の水路", detail: "分流水門の水を、河口の畑へ流す", pos: { x: 6900, y: 230 }, price: 110000000, area: 7, link: { from: "intake-3", to: "field-10" }, unlockAfter: "equip-canal-delta-1", reveal: 147.5 },
  { id: "net-2", name: "三角州の大網", detail: "三角州の漁場に積める魚 +8", pos: { x: 6240, y: 470 }, price: 90000000, area: 7, capacity: { stove: "fish-2", plus: 8 }, unlockAfter: "fisher-2", reveal: 148.5 },
  { id: "delta-road", name: "堤上の道", detail: "分流の岸をつなぎ、農と漁の行き来を速くする", pos: { x: 6600, y: 470 }, price: 160000000, area: 7, road: { from: { x: 6160, y: 470 }, to: { x: 6980, y: 470 } }, reveal: 151 },
  /* --- 第9区画: 大治水 --- */
  { id: "clay-plus-2", name: "土運び場", detail: "堤防の粘土場に積める数 +10", pos: { x: 7200, y: 360 }, price: 220000000, area: 8, capacity: { stove: "clay-2", plus: 10 }, unlockAfter: "digger-2", reveal: 164.5 },
  { id: "works-road", name: "治水工事の道", detail: "粘土場・森・工事現場を一直線につなぐ", pos: { x: 7500, y: 470 }, price: 320000000, area: 8, road: { from: { x: 7060, y: 470 }, to: { x: 7880, y: 470 } }, reveal: 166.5 },
  { id: "intake-cap-3", name: "分流水門の貯水壺", detail: "分流水門にためられる水 +10", pos: { x: 6700, y: 90 }, price: 240000000, area: 7, capacity: { stove: "intake-3", plus: 10 }, unlockAfter: "built-build-reservoir", reveal: 170 },'''
stages = insert_array(stages, 'const taigaEquipment: EquipSpec[] = [', equipment)

# Increase the visible choice count as the stage becomes a mature civilization.
needle = '      "area-4": 7,\n      "area-5": 7,\n'
idx = stages.rfind(needle)
assert idx >= 0
replacement = '      "area-4": 7,\n      "area-5": 7,\n      "area-6": 8,\n      "area-7": 8,\n      "area-8": 8,\n'
stages = stages[:idx] + stages[idx:].replace(needle, replacement, 1)

# Seasonal depth: late flood-control construction materially changes play.
old_dry = '''    case "dry":
      if (isWater(stove)) rate *= 0.6;
      if (isField(stove)) rate *= 0.85;
      break;
'''
new_dry = '''    case "dry":
      if (isWater(stove)) {
        rate *= state.built.includes("build-reservoir") ? 1.0 : 0.6;
      }
      if (isField(stove)) rate *= 0.85;
      break;
'''
assert taiga.count(old_dry) == 1
taiga = taiga.replace(old_dry, new_dry, 1)

old_protect = '    if (!hasEquip(state, "levee")) return 0;\n'
new_protect = '''    if (
      !hasEquip(state, "levee") &&
      !state.built.includes("build-great-levee")
    ) {
      return 0;
    }
'''
assert taiga.count(old_protect) == 1
taiga = taiga.replace(old_protect, new_protect, 1)

old_move = '''export const taigaMove = (state: ShopState) =>
  flooding(state) && !hasEquip(state, "levee") ? 0.82 : 1;
'''
new_move = '''export const taigaMove = (state: ShopState) =>
  flooding(state) &&
  !hasEquip(state, "levee") &&
  !state.built.includes("build-great-levee")
    ? 0.82
    : 1;
'''
assert taiga.count(old_move) == 1
taiga = taiga.replace(old_move, new_move, 1)

old_flood = '    taiga.flood = hasEquip(state, "drain") ? FLOOD_TIME / 2 : FLOOD_TIME;\n'
new_flood = '''    taiga.flood = state.built.includes("build-great-levee")
      ? FLOOD_TIME / 4
      : hasEquip(state, "drain")
        ? FLOOD_TIME / 2
        : FLOOD_TIME;
'''
assert taiga.count(old_flood) == 1
taiga = taiga.replace(old_flood, new_flood, 1)

old_sail = '''/** 大型交易船が建ったときの、旅の終わり */
export const taigaSail = (state: ShopState) => {
  if (state.taiga.sailed) return;
  state.taiga.sailed = true;
  state.taiga.flash = "sail";
  toast(state, "上流から使者が来た ― 「大河の文明」の旅はここまで");
};
'''
new_sail = '''/** 大河の水門が完成したときの、この時代の終わり */
export const taigaSail = (state: ShopState) => {
  if (state.taiga.sailed) return;
  state.taiga.sailed = true;
  state.taiga.flash = "sail";
  toast(
    state,
    "大河の流れを治めた ― 農耕・水運・治水の文明が完成した。次は新しい時代へ",
  );
};
'''
assert taiga.count(old_sail) == 1
taiga = taiga.replace(old_sail, new_sail, 1)

# Old saves that finished at area-5 must reopen for the new areas.
old_load = '''  state.fire = fromFire(raw.fire);
  state.taiga = fromTaiga(raw.taiga);

  for (const stove of stoves) {
'''
new_load = '''  state.fire = fromFire(raw.fire);
  state.taiga = fromTaiga(raw.taiga);
  if (
    state.stageId === "taiga" &&
    state.taiga.sailed &&
    !state.built.includes("build-great-weir")
  ) {
    state.taiga.sailed = false;
  }

  for (const stove of stoves) {
'''
assert shop.count(old_load) == 1
shop = shop.replace(old_load, new_load, 1)

stages_path.write_text(stages, encoding='utf-8')
taiga_path.write_text(taiga, encoding='utf-8')
shop_path.write_text(shop, encoding='utf-8')
print('Taiga expansion patched: area-6..8')
