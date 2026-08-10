from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    text = p.read_text()
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"anchor not found: {label}")
    p.write_text(text.replace(old, new, 1))
    print(f"{label}: patched")


# ---------------------------------------------------------------------------
# data/stages.ts — side area, bait/fuel stores, torch progression
# ---------------------------------------------------------------------------
stages = Path("data/stages.ts")
text = stages.read_text()
if 'label: "夜の森へ入る"' not in text:
    old = '''    // 村がひととおりそろってから、探索者が川を見つける
    unlockAfter: "mark-pop-20",
    reveal: 100,
  },
];

/**'''
    new = '''    // 村がひととおりそろってから、探索者が川を見つける
    unlockAfter: "mark-pop-20",
    reveal: 100,
  },
  /*
   * 本編とは別の寄り道「夜の森」。
   * マンモスの谷から北へ分岐し、文明を先へ進めず、夜の危険と動物との共生を掘る。
   */
  {
    id: "area-6",
    label: "夜の森へ入る",
    price: 90000,
    rect: { x0: 1620, y0: -820, x1: 2860, y1: 0 },
    // 閉じているあいだも、谷側から入口の枠に触れられる
    padPos: { x: 2240, y: 34 },
    palette: { floor: "#243529", deep: "#101a14", prop: "nightforest" },
    // まず一度マンモスを倒して「集団で野生に向き合う」を経験してから分岐する
    unlockAfter: "mark-kills-1",
    reveal: 52,
  },
];

/**'''
    if old not in text:
        raise SystemExit("anchor not found: fire night area")
    text = text.replace(old, new, 1)

    old = '''    gives: { sail: true, note: "大型いかだができた" },
    unlockAfter: "found-river", reveal: 110,
  },
];

const fireSeats: SeatSpec[] = ['''
    new = '''    gives: { sail: true, note: "大型いかだができた" },
    unlockAfter: "found-river", reveal: 110,
  },

  /* ============ 寄り道 area-6 「夜の森」 ============ */
  {
    id: "night-wood", pos: { x: 1860, y: -170 }, price: 55000, area: 6,
    takes: "wood", store: true, hold: 16, art: "woodstore", label: "夜番の薪置き場",
    unlockAfter: "equip-hand-torch", reveal: 52.7,
  },
  {
    id: "night-bait", pos: { x: 2470, y: -470 }, price: 80000, area: 6,
    takes: "mmeat", store: true, hold: 10, art: "store", label: "オオカミの餌場",
    unlockAfter: "equip-hand-torch", reveal: 52.9,
  },
];

const fireSeats: SeatSpec[] = ['''
    if old not in text:
        raise SystemExit("anchor not found: fire night stores")
    text = text.replace(old, new, 1)

    old = '''  /* --- 第6区画: 川の道具 --- */
  { id: "net-1", name: "網", detail: "川の瀬でとれる魚が増える", pos: { x: 5330, y: 380 }, price: 700000, area: 5, capacity: { stove: "fish-1", plus: 6 }, reveal: 106.5 },
  { id: "map-1", name: "地図作り", detail: "探索が 1.6倍のはやさで帰ってくる", pos: { x: 5090, y: 400 }, price: 1600000, area: 5, unlockAfter: "built-build-raft-s", reveal: 113.5 },
];

/**'''
    new = '''  /* --- 第6区画: 川の道具 --- */
  { id: "net-1", name: "網", detail: "川の瀬でとれる魚が増える", pos: { x: 5330, y: 380 }, price: 700000, area: 5, capacity: { stove: "fish-1", plus: 6 }, reveal: 106.5 },
  { id: "map-1", name: "地図作り", detail: "探索が 1.6倍のはやさで帰ってくる", pos: { x: 5090, y: 400 }, price: 1600000, area: 5, unlockAfter: "built-build-raft-s", reveal: 113.5 },

  /* --- 寄り道「夜の森」: 光を点から線へ増やしていく --- */
  { id: "hand-torch", name: "手持ちたいまつ", detail: "夜の森で自分の周囲を照らし、オオカミを追い払える", pos: { x: 1760, y: -100 }, price: 45000, area: 6, reveal: 52.2 },
  { id: "night-torch-1", name: "森のたいまつ台", detail: "夜の森に最初の安全地帯をつくる。夜ごとに薪を1こ使う", pos: { x: 1960, y: -250 }, price: 65000, area: 6, unlockAfter: "equip-hand-torch", reveal: 53.1 },
  { id: "night-torch-2", name: "奥のたいまつ台", detail: "安全地帯を森の中央まで伸ばす。夜ごとに薪を1こ使う", pos: { x: 2280, y: -430 }, price: 110000, area: 6, unlockAfter: "equip-night-torch-1", reveal: 53.5 },
  { id: "night-torch-3", name: "最奥のたいまつ台", detail: "餌場まで光をつなぐ。夜ごとに薪を1こ使う", pos: { x: 2630, y: -620 }, price: 180000, area: 6, unlockAfter: "equip-night-torch-2", reveal: 53.9 },
  { id: "wolf-bell", name: "見張りの鐘", detail: "遠くの群れを先に察知して、一度に近づくオオカミを減らす", pos: { x: 2670, y: -180 }, price: 160000, area: 6, unlockAfter: "equip-night-torch-2", reveal: 54.2 },
];

/**'''
    if old not in text:
        raise SystemExit("anchor not found: fire night equipment")
    text = text.replace(old, new, 1)
    stages.write_text(text)
    print("data/stages.ts: patched")
else:
    print("data/stages.ts: already patched")


# ---------------------------------------------------------------------------
# lib/shop.ts — area palette type for the new forest look
# ---------------------------------------------------------------------------
replace_once(
    "lib/shop.ts",
    '''    | "volcano"
    | "horror";''',
    '''    | "volcano"
    | "horror"
    | "nightforest";''',
    "night forest palette type",
)


# ---------------------------------------------------------------------------
# lib/fire.ts — wolf AI, torch fuel, taming, persistent dog companion
# ---------------------------------------------------------------------------
fire = Path("lib/fire.ts")
src = fire.read_text()
if "export type NightWolf" not in src:
    src = src.replace(
        '''export type NightReport = {''',
        '''/** 夜の森に現れるオオカミ。倒す敵ではなく、光で距離を取らせる。 */
export type NightWolf = {
  id: number;
  pos: Vec;
  target: Vec;
  state: "roam" | "approach" | "flee";
  timer: number;
  face: number;
};

export type NightReport = {''',
        1,
    )

    src = src.replace(
        '''  /** 建てかけの建物が、まだ欲しがっている品と数（毎フレーム数え直す） */
  wants: Record<string, number>;
};''',
        '''  /** 建てかけの建物が、まだ欲しがっている品と数（毎フレーム数え直す） */
  wants: Record<string, number>;

  /* ---- 寄り道「夜の森」 ---- */
  nightWolves: NightWolf[];
  wolfSpawn: number;
  /** 餌を受け取って近づいた夜の数。3で犬になる */
  wolfTrust: number;
  /** 同じ夜に何度も餌を食べないための日付 */
  wolfFedDay: number;
  /** たいまつ台へ薪を入れた日 */
  nightFuelDay: number;
  /** 今夜、実際に点いているたいまつ台の本数 */
  nightLitPosts: number;
  dogTamed: boolean;
  dogPos: Vec;
};''',
        1,
    )

    src = src.replace(
        '''  report: null,
  flash: null,
  wants: {},
});''',
        '''  report: null,
  flash: null,
  wants: {},
  nightWolves: [],
  wolfSpawn: 2,
  wolfTrust: 0,
  wolfFedDay: -1,
  nightFuelDay: -1,
  nightLitPosts: 0,
  dogTamed: false,
  dogPos: { x: 2470, y: -450 },
});''',
        1,
    )

    src = src.replace(
        '''  finds: fire.finds,
  sailed: fire.sailed,
});''',
        '''  finds: fire.finds,
  sailed: fire.sailed,
  wolfTrust: fire.wolfTrust,
  wolfFedDay: fire.wolfFedDay,
  dogTamed: fire.dogTamed,
});''',
        1,
    )

    src = src.replace(
        '''  fire.voyages = Math.max(0, Math.floor(num(saved.voyages, 0)));
  fire.sailed = saved.sailed === true;
  if (Array.isArray(saved.finds)) {''',
        '''  fire.voyages = Math.max(0, Math.floor(num(saved.voyages, 0)));
  fire.sailed = saved.sailed === true;
  fire.wolfTrust = Math.max(0, Math.min(3, Math.floor(num(saved.wolfTrust, 0))));
  fire.wolfFedDay = Math.floor(num(saved.wolfFedDay, -1));
  fire.dogTamed = saved.dogTamed === true || fire.wolfTrust >= 3;
  if (Array.isArray(saved.finds)) {''',
        1,
    )

    src = src.replace(
        '''  const near = hunters + (dist(state.player.pos, beast.pos) < 90 ? 1 : 0);
  if (near <= 0) {''',
        '''  const dogHelp =
    state.fire.dogTamed && dist(state.fire.dogPos, beast.pos) < 110 ? 0.35 : 0;
  const near = hunters + (dist(state.player.pos, beast.pos) < 90 ? 1 : 0) + dogHelp;
  if (near <= 0) {''',
        1,
    )

    night_code = r'''
/* ---------- 寄り道「夜の森」 ---------- */

export const NIGHT_FOREST = { x0: 1620, y0: -820, x1: 2860, y1: 0 };
const BAIT_POS: Vec = { x: 2470, y: -470 };
const NIGHT_POSTS: Vec[] = [
  { x: 1960, y: -250 },
  { x: 2280, y: -430 },
  { x: 2630, y: -620 },
];

export const nightForestOpen = (state: ShopState) =>
  state.stageId === "fire" && state.unlocked.includes("area-6");

const inNightForest = (pos: Vec) =>
  pos.x >= NIGHT_FOREST.x0 &&
  pos.x <= NIGHT_FOREST.x1 &&
  pos.y >= NIGHT_FOREST.y0 &&
  pos.y <= NIGHT_FOREST.y1;

const randomNightSpot = (): Vec => ({
  x: NIGHT_FOREST.x0 + 70 + Math.random() * (NIGHT_FOREST.x1 - NIGHT_FOREST.x0 - 140),
  y: NIGHT_FOREST.y0 + 70 + Math.random() * (NIGHT_FOREST.y1 - NIGHT_FOREST.y0 - 140),
});

const newNightWolf = (state: ShopState): NightWolf => {
  const pos = randomNightSpot();
  const target = randomNightSpot();
  return {
    id: state.nextId++,
    pos,
    target,
    state: "roam",
    timer: 2 + Math.random() * 4,
    face: target.x >= pos.x ? 1 : -1,
  };
};

const boughtNightPosts = (state: ShopState) =>
  NIGHT_POSTS.filter((_, i) => state.unlocked.includes(`equip-night-torch-${i + 1}`));

/** 描画側も同じ光源を使う。手持ちたいまつは自分と一緒に動く。 */
export const nightLights = (state: ShopState): { pos: Vec; r: number }[] => {
  if (!nightForestOpen(state) || state.fire.phase === "day") return [];
  const lights: { pos: Vec; r: number }[] = [];
  if (state.unlocked.includes("equip-hand-torch") && inNightForest(state.player.pos)) {
    lights.push({ pos: { ...state.player.pos }, r: 118 });
  }
  const posts = boughtNightPosts(state);
  for (let i = 0; i < Math.min(posts.length, state.fire.nightLitPosts); i += 1) {
    lights.push({ pos: posts[i], r: 145 + i * 10 });
  }
  return lights;
};

const litAt = (state: ShopState, pos: Vec) =>
  nightLights(state).some((light) => dist(light.pos, pos) <= light.r);

const updateDog = (state: ShopState, dt: number) => {
  const fire = state.fire;
  if (!fire.dogTamed) return;
  const dx = state.player.pos.x - fire.dogPos.x;
  const dy = state.player.pos.y - fire.dogPos.y;
  const d = Math.hypot(dx, dy);
  if (d > 42) step(fire.dogPos, state.player.pos, d > 180 ? 105 : 72, dt);
};

const updateNightForest = (state: ShopState, dt: number) => {
  const fire = state.fire;
  updateDog(state, dt);
  if (!nightForestOpen(state)) {
    fire.nightWolves = [];
    return;
  }

  if (fire.phase !== "night") {
    fire.nightWolves = [];
    fire.wolfSpawn = 2;
    fire.nightLitPosts = 0;
    return;
  }

  if (fire.nightFuelDay !== fire.day) {
    fire.nightFuelDay = fire.day;
    const wanted = boughtNightPosts(state).length;
    const have = state.hold["night-wood"] ?? 0;
    fire.nightLitPosts = Math.min(wanted, have);
    if (fire.nightLitPosts > 0) {
      state.hold["night-wood"] = have - fire.nightLitPosts;
    }
    if (wanted > fire.nightLitPosts) {
      toast(state, `夜の森の薪が ${wanted - fire.nightLitPosts}こ 足りない ― 消えたたいまつ台がある`);
    }
  }

  const bell = state.unlocked.includes("equip-wolf-bell") ? 2 : 0;
  const dogGuard = fire.dogTamed ? 1 : 0;
  const maxWolves = Math.max(2, 5 - bell - dogGuard);
  fire.wolfSpawn -= dt;
  if (fire.wolfSpawn <= 0 && fire.nightWolves.length < maxWolves) {
    fire.nightWolves.push(newNightWolf(state));
    fire.wolfSpawn = 4.5 + Math.random() * 4;
  }

  for (const wolf of fire.nightWolves) {
    wolf.timer -= dt;
    const dogNear = fire.dogTamed && dist(fire.dogPos, wolf.pos) < 78;
    if (litAt(state, wolf.pos) || dogNear) {
      wolf.state = "flee";
      const threat = dogNear ? fire.dogPos : state.player.pos;
      const dx = wolf.pos.x - threat.x || (Math.random() - 0.5);
      const dy = wolf.pos.y - threat.y || -1;
      const n = Math.max(1, Math.hypot(dx, dy));
      wolf.target = {
        x: Math.max(NIGHT_FOREST.x0 + 20, Math.min(NIGHT_FOREST.x1 - 20, wolf.pos.x + (dx / n) * 180)),
        y: Math.max(NIGHT_FOREST.y0 + 20, Math.min(NIGHT_FOREST.y1 - 20, wolf.pos.y + (dy / n) * 180)),
      };
      wolf.timer = 2.5;
    } else if (inNightForest(state.player.pos) && dist(state.player.pos, wolf.pos) < 250) {
      wolf.state = "approach";
      wolf.target = { ...state.player.pos };
    } else if (wolf.timer <= 0 || dist(wolf.pos, wolf.target) < 8) {
      wolf.state = "roam";
      wolf.target = randomNightSpot();
      wolf.timer = 3 + Math.random() * 5;
    }

    const speed = wolf.state === "approach" ? 58 : wolf.state === "flee" ? 76 : 30;
    step(wolf.pos, wolf.target, speed, dt);
    wolf.face = wolf.target.x >= wolf.pos.x ? 1 : -1;

    if (wolf.state === "approach" && dist(state.player.pos, wolf.pos) < 36) {
      state.player.pos.y = Math.min(24, state.player.pos.y + 72);
      fire.morale = Math.max(0.82, fire.morale - 0.08);
      wolf.state = "flee";
      wolf.target = randomNightSpot();
      wolf.timer = 4;
      toast(state, "暗闇からオオカミが飛び出した ― たいまつの光へ戻ろう");
      say(state, { x: state.player.pos.x, y: state.player.pos.y - 30 }, "うわっ！");
    }
  }

  const nightAge = fire.clock - DAY_TIME - DUSK_TIME;
  const bait = state.hold["night-bait"] ?? 0;
  if (!fire.dogTamed && nightAge >= 7 && fire.wolfFedDay !== fire.day && bait >= 2) {
    state.hold["night-bait"] = bait - 2;
    fire.wolfFedDay = fire.day;
    fire.wolfTrust = Math.min(3, fire.wolfTrust + 1);
    say(state, { x: BAIT_POS.x, y: BAIT_POS.y - 34 }, `なつき ${fire.wolfTrust}/3`);
    if (fire.wolfTrust >= 3) {
      fire.dogTamed = true;
      fire.dogPos = { x: BAIT_POS.x + 22, y: BAIT_POS.y + 18 };
      fire.flash = "dog";
      toast(state, "オオカミが逃げなくなった ― 最初の犬が仲間になった！");
      state.sfx.push("buy");
    } else {
      toast(state, `オオカミが餌を食べた。こちらを見る目が変わった（${fire.wolfTrust}/3）`);
    }
  }
};

'''
    anchor = '/* ---------- 探索と交易 ---------- */'
    if anchor not in src:
        raise SystemExit("anchor not found: night forest logic")
    src = src.replace(anchor, night_code + anchor, 1)

    src = src.replace(
        '''  { id: "mark-pop-20", reach: (state) => state.fire.pop >= 20 },
  { id: "mark-sailed", reach: (state) => state.fire.sailed },''',
        '''  { id: "mark-pop-20", reach: (state) => state.fire.pop >= 20 },
  { id: "mark-dog", reach: (state) => state.fire.dogTamed },
  { id: "mark-sailed", reach: (state) => state.fire.sailed },''',
        1,
    )

    src = src.replace(
        '''  // 解体が止まっている（仮置き場が満杯）
  if (fire.beast?.stuck) wish.push("robot-3", "waiter-4", "pile-meat");''',
        '''  // 夜の森へ入ったら、まず光を確保する。これは本編の強制条件にはしない。
  if (has("area-6") && !has("equip-hand-torch")) wish.push("equip-hand-torch");
  if (has("equip-hand-torch") && !has("night-bait")) wish.push("night-bait", "night-wood");

  // 解体が止まっている（仮置き場が満杯）
  if (fire.beast?.stuck) wish.push("robot-3", "waiter-4", "pile-meat");''',
        1,
    )

    src = src.replace(
        '''  updateResidents(state, dt);
  updateBeast(state, dt);
  updateVoyage(state, dt);
};''',
        '''  updateResidents(state, dt);
  updateBeast(state, dt);
  updateNightForest(state, dt);
  updateVoyage(state, dt);
};''',
        1,
    )

    fire.write_text(src)
    print("lib/fire.ts: patched")
else:
    print("lib/fire.ts: already patched")


# ---------------------------------------------------------------------------
# components/Shop.tsx — forest art, wolves/dog, torch visuals + real light
# ---------------------------------------------------------------------------
shop = Path("components/Shop.tsx")
ui = shop.read_text()
if "const nightWolf = (" not in ui:
    ui = ui.replace(
        '''  winterOn,
  beastZone,
} from "@/lib/fire";''',
        '''  winterOn,
  beastZone,
  nightLights,
} from "@/lib/fire";''',
        1,
    )

    forest_art = r'''  if (palette.prop === "nightforest") {
    ctx.fillStyle = "rgba(7,18,12,0.34)";
    for (let i = 0; i < 12; i += 1) {
      const px = rect.x0 + 70 + ((i * 173) % Math.max(120, rect.x1 - rect.x0 - 140));
      const py = rect.y0 + 70 + ((i * 97) % Math.max(120, rect.y1 - rect.y0 - 140));
      ctx.beginPath();
      ctx.ellipse(px, py, 55 + (i % 3) * 14, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(154,132,88,0.2)";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 620, rect.y1 - 12);
    ctx.bezierCurveTo(rect.x0 + 520, rect.y0 + 610, rect.x0 + 800, rect.y0 + 390, rect.x0 + 850, rect.y0 + 170);
    ctx.stroke();
    ctx.lineCap = "butt";
    for (let i = 0; i < 22; i += 1) {
      const left = i % 2 === 0;
      const lane = left ? 90 + (i % 5) * 72 : rect.x1 - rect.x0 - 90 - (i % 5) * 72;
      const tx = rect.x0 + lane + Math.sin(i * 2.2) * 24;
      const ty = rect.y0 + 60 + ((i * 109) % Math.max(120, rect.y1 - rect.y0 - 120));
      ctx.fillStyle = "#3a2b1d";
      ctx.fillRect(tx - 3, ty - 10, 6, 28);
      ctx.fillStyle = i % 3 === 0 ? "#203c2a" : "#1a3324";
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.moveTo(tx, ty - 38 - k * 13);
        ctx.lineTo(tx - 18 + k * 2, ty - 7 - k * 12);
        ctx.lineTo(tx + 18 - k * 2, ty - 7 - k * 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (let i = 0; i < 10; i += 1) {
      const drift = (time * (10 + i) + i * 91) % Math.max(160, rect.x1 - rect.x0 - 80);
      const fx = rect.x0 + 40 + drift;
      const fy = rect.y0 + 100 + ((i * 131) % Math.max(120, rect.y1 - rect.y0 - 180));
      const glow = 0.25 + Math.abs(Math.sin(time * 2.4 + i)) * 0.55;
      ctx.fillStyle = `rgba(210,225,120,${glow})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
'''
    horror_anchor = '  if (palette.prop === "horror") {'
    if horror_anchor not in ui:
        raise SystemExit("anchor not found: night forest art")
    ui = ui.replace(horror_anchor, forest_art + horror_anchor, 1)

    equip_code = r'''  if (id === "hand-torch") {
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 3, y - 24);
    ctx.stroke();
    const flame = 0.6 + Math.abs(Math.sin(time * 7)) * 0.4;
    ctx.fillStyle = `rgba(255,145,55,${flame})`;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 24);
    ctx.quadraticCurveTo(x + 12, y - 34, x + 5, y - 44);
    ctx.quadraticCurveTo(x - 4, y - 34, x + 3, y - 24);
    ctx.fill();
    return;
  }
  if (id.startsWith("night-torch-")) {
    ctx.fillStyle = "#5d4931";
    roundRect(ctx, x - 4, y - 30, 8, 42, 3);
    ctx.fill();
    ctx.fillStyle = "#4a4038";
    roundRect(ctx, x - 11, y - 30, 22, 8, 3);
    ctx.fill();
    const flame = 0.55 + Math.abs(Math.sin(time * 6 + x)) * 0.45;
    ctx.fillStyle = `rgba(255,145,55,${flame})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 29);
    ctx.quadraticCurveTo(x + 10, y - 43, x + 1, y - 54);
    ctx.quadraticCurveTo(x - 9, y - 43, x, y - 29);
    ctx.fill();
    return;
  }
  if (id === "wolf-bell") {
    ctx.fillStyle = "#59442c";
    ctx.fillRect(x - 3, y - 38, 6, 50);
    ctx.fillStyle = "#a88745";
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 34);
    ctx.quadraticCurveTo(x, y - 48, x + 12, y - 34);
    ctx.lineTo(x + 9, y - 20);
    ctx.lineTo(x - 9, y - 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6f542b";
    ctx.beginPath();
    ctx.arc(x, y - 18, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

'''
    equip_anchor = '  /* --- 谷の罠。買うと、その場所に実物が現れる（枠だけで効かせない） --- */'
    if equip_anchor not in ui:
        raise SystemExit("anchor not found: night forest equipment art")
    ui = ui.replace(equip_anchor, equip_code + equip_anchor, 1)

    wolf_draw = r'''/** 夜の森のオオカミ。犬ぞりの犬より低く、細く、灰色で目だけが光る。 */
const nightWolf = (
  ctx: CanvasRenderingContext2D,
  wolf: { pos: { x: number; y: number }; face: number; state: string },
  time: number,
) => {
  const { pos, face } = wolf;
  const run = wolf.state === "flee" || wolf.state === "approach";
  const gait = run ? Math.sin(time * 12 + pos.x * 0.02) * 2.5 : Math.sin(time * 3) * 0.7;
  shadow(ctx, pos.x, pos.y + 5, 11);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.scale(face, 1);
  ctx.strokeStyle = "#3c4241";
  ctx.lineWidth = 2.2;
  for (const [i, lx] of [-6, 3].entries()) {
    ctx.beginPath();
    ctx.moveTo(lx, -2);
    ctx.lineTo(lx + (i === 0 ? gait : -gait), 5);
    ctx.stroke();
  }
  ctx.fillStyle = "#4c5552";
  ctx.beginPath();
  ctx.ellipse(-1, -7, 11, 6, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4c5552";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.quadraticCurveTo(-18, -14 + gait, -20, -7);
  ctx.stroke();
  ctx.fillStyle = "#58615d";
  ctx.beginPath();
  ctx.ellipse(10, -11, 6, 5, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7, -15);
  ctx.lineTo(8, -22);
  ctx.lineTo(12, -15);
  ctx.moveTo(11, -15);
  ctx.lineTo(14, -21);
  ctx.lineTo(16, -14);
  ctx.fill();
  ctx.fillStyle = "#3e4644";
  ctx.beginPath();
  ctx.ellipse(15, -10, 5, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#171b1a";
  ctx.beginPath();
  ctx.arc(19, -10, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wolf.state === "approach" ? "#ffd36b" : "#b9d46a";
  ctx.beginPath();
  ctx.arc(11, -12, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

'''
    sled_anchor = '''/**
 * 犬ぞり（§8.2）。'''
    if sled_anchor not in ui:
        raise SystemExit("anchor not found: wolf drawing")
    ui = ui.replace(sled_anchor, wolf_draw + sled_anchor, 1)

    actor_anchor = '''      // 谷のマンモス（人と同じ列にならべて、前後が分かるようにする）
      const beast = state.fire.beast;'''
    actor_code = '''      // 夜の森のオオカミ。HP敵ではなく、光から逃げる生きもの。
      for (const wolf of state.fire.nightWolves) {
        actors.push({
          y: wolf.pos.y,
          render: () => nightWolf(ctx, wolf, time),
        });
      }
      if (state.fire.dogTamed) {
        const dog = state.fire.dogPos;
        const moving = Math.hypot(state.player.pos.x - dog.x, state.player.pos.y - dog.y) > 42;
        const face = state.player.pos.x >= dog.x ? 1 : -1;
        actors.push({
          y: dog.y,
          render: () => {
            shadow(ctx, dog.x, dog.y + 4, 9);
            sledDog(ctx, dog.x, dog.y, face, moving, time);
            ctx.fillStyle = "#d9513c";
            roundRect(ctx, dog.x - 5, dog.y - 8, 10, 2.5, 1.2);
            ctx.fill();
          },
        });
      }

      // 谷のマンモス（人と同じ列にならべて、前後が分かるようにする）
      const beast = state.fire.beast;'''
    if actor_anchor not in ui:
        raise SystemExit("anchor not found: night wolf actors")
    ui = ui.replace(actor_anchor, actor_code, 1)

    light_anchor = '''          for (const stove of openStoves(state)) {
            const lit =
              stove.art === "hearth" || stove.art === "fire" || stove.art === "grill" ||
              stove.art === "lamp" || stove.art === "feast";
            if (!lit || (isBuild(stove) && !isDone(state, stove.id))) continue;
            const glow = ctx.createRadialGradient(
              stove.pos.x, stove.pos.y - 10, 4, stove.pos.x, stove.pos.y - 10, 130,
            );
            glow.addColorStop(0, `rgba(255,190,110,${0.34 * dark})`);
            glow.addColorStop(1, "rgba(255,190,110,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(stove.pos.x, stove.pos.y - 10, 130, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();'''
    light_new = '''          for (const stove of openStoves(state)) {
            const lit =
              stove.art === "hearth" || stove.art === "fire" || stove.art === "grill" ||
              stove.art === "lamp" || stove.art === "feast";
            if (!lit || (isBuild(stove) && !isDone(state, stove.id))) continue;
            const glow = ctx.createRadialGradient(
              stove.pos.x, stove.pos.y - 10, 4, stove.pos.x, stove.pos.y - 10, 130,
            );
            glow.addColorStop(0, `rgba(255,190,110,${0.34 * dark})`);
            glow.addColorStop(1, "rgba(255,190,110,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(stove.pos.x, stove.pos.y - 10, 130, 0, Math.PI * 2);
            ctx.fill();
          }
          for (const light of nightLights(state)) {
            const glow = ctx.createRadialGradient(
              light.pos.x, light.pos.y - 12, 3, light.pos.x, light.pos.y - 12, light.r,
            );
            glow.addColorStop(0, `rgba(255,178,82,${0.46 * dark})`);
            glow.addColorStop(0.45, `rgba(255,150,68,${0.18 * dark})`);
            glow.addColorStop(1, "rgba(255,140,60,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(light.pos.x, light.pos.y - 12, light.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();'''
    if light_anchor not in ui:
        raise SystemExit("anchor not found: night forest light overlay")
    ui = ui.replace(light_anchor, light_new, 1)

    progress_anchor = '''      /* --- 大河の文明: 季節の色あいと、増水 --- */'''
    progress_code = '''      if (isFire && state.unlocked.includes("area-6") && !state.fire.dogTamed) {
        const bait = state.hold["night-bait"] ?? 0;
        const fuel = state.hold["night-wood"] ?? 0;
        const text = `夜の森  なつき ${state.fire.wolfTrust}/3  餌 ${bait}  薪 ${fuel}`;
        ctx.font = SMALL;
        const w = ctx.measureText(text).width + 18;
        const px = camX + 8;
        const py = camY + 8;
        ctx.fillStyle = "rgba(8,18,12,0.72)";
        roundRect(ctx, px, py, w, 22, 7);
        ctx.fill();
        ctx.strokeStyle = "rgba(190,210,120,0.35)";
        ctx.stroke();
        ctx.fillStyle = "#dce5b3";
        ctx.fillText(text, px + w / 2, py + 12);
        ctx.font = FONT;
      }

      /* --- 大河の文明: 季節の色あいと、増水 --- */'''
    if progress_anchor not in ui:
        raise SystemExit("anchor not found: night forest progress")
    ui = ui.replace(progress_anchor, progress_code, 1)

    shop.write_text(ui)
    print("components/Shop.tsx: patched")
else:
    print("components/Shop.tsx: already patched")


# ---------------------------------------------------------------------------
# docs/fire-zones.md — keep the implementation notes truthful
# ---------------------------------------------------------------------------
doc = Path("docs/fire-zones.md")
if doc.exists():
    d = doc.read_text()
    marker = "## 寄り道エリア「夜の森」"
    if marker not in d:
        d += r'''

## 寄り道エリア「夜の森」

本編の第7区画ではない。第3区画「マンモスの谷」で1頭倒すと、谷の北側へ
任意で入れる大型サブエリア。大河の文明へ進む本筋は変えない。

- 昼は静かな森、夜になるとオオカミが3〜5頭現れる
- オオカミにはHPがなく、手持ちたいまつ／たいまつ台／犬の近くから逃げる
- たいまつ台は夜ごとに「夜番の薪置き場」の薪を1こずつ使う
- 暗闇で接近されると死亡ではなく谷側へ追い返され、少し士気が落ちる
- マンモス肉2こを餌場へ置くと、一晩に一度だけ群れとの距離が縮まる
- 3晩餌を食べると「最初の犬」が仲間になる。以後プレイヤーについて歩く
- 犬がマンモスの近くにいると、追い込み／仕留めに小さな補助が入る
- 見張りの鐘を買うと、同時に森へ入ってくる群れが小さくなる

つまり「倒す大型ボス」のマンモスとは逆に、夜の森は
**光で追い払い、餌で距離を縮め、最後は共生する**遊びにしている。
'''
        doc.write_text(d)
        print("docs/fire-zones.md: patched")
