from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"anchor not found: {label}")
    p.write_text(text.replace(old, new, 1))
    print(f"{label}: patched")


stages = Path("data/stages.ts")
text = stages.read_text()
if 'id: "area-10"' not in text:
    old = '''    unlockAfter: "shelf-8-3",
  },
];

const parkStoves: StoveSpec[] = ['''
    new = '''    unlockAfter: "shelf-8-3",
  },
  /*
   * 左側へ広がるナイトメア・パーク。
   * 入口広場の左から、闇の門 → 呪われた森 → 最深部の順で開いていく。
   */
  {
    id: "area-10",
    label: "呪われた門をひらく",
    price: 100000000000,
    rect: { x0: -360, y0: 0, x1: 0, y1: 480 },
    // 買う枠は現在の入口広場側に置き、購入すると左へ世界が伸びる
    padPos: { x: 24, y: 250 },
    palette: { floor: "#30273b", deep: "#191320", prop: "horror" },
    unlockAfter: "seat-9-3",
  },
  {
    id: "area-11",
    label: "呪われた森をひらく",
    price: 420000000000,
    rect: { x0: -720, y0: 0, x1: -360, y1: 960 },
    padPos: { x: -330, y: 250 },
    palette: { floor: "#292133", deep: "#130f19", prop: "horror" },
    unlockAfter: "seat-10-3",
  },
  {
    id: "area-12",
    label: "ナイトメア・パークをひらく",
    price: 1400000000000,
    rect: { x0: -1080, y0: 0, x1: -720, y1: 1440 },
    padPos: { x: -690, y: 700 },
    palette: { floor: "#211927", deep: "#0d0911", prop: "horror" },
    unlockAfter: "seat-11-3",
  },
];

const parkStoves: StoveSpec[] = ['''
    if old not in text:
        raise SystemExit("anchor not found: park areas")
    text = text.replace(old, new, 1)

    old = '''  { id: "store-0", pos: { x: 620, y: 250 }, price: 320000000, area: 1, item: "goods", art: "stock", label: "丘のみやげ倉庫", unlockAfter: "area-8" },
];

/** アトラクションは1つずつ名前も見た目も違う */'''
    new = '''  { id: "store-0", pos: { x: 620, y: 250 }, price: 320000000, area: 1, item: "goods", art: "stock", label: "丘のみやげ倉庫", unlockAfter: "area-8" },
  // ナイトメア・パークの専用券売所。左へ進むほど発券能力が必要になる
  { id: "nightmare-ticket-1", pos: { x: -180, y: 176 }, price: 120000000000, area: 10, label: "闇の券売所" },
  { id: "nightmare-ticket-2", pos: { x: -540, y: 656 }, price: 520000000000, area: 11, label: "墓地の券売所" },
  { id: "nightmare-ticket-3", pos: { x: -900, y: 176 }, price: 1600000000000, area: 12, label: "ナイトメア券売所" },
];

/** アトラクションは1つずつ名前も見た目も違う */'''
    if old not in text:
        raise SystemExit("anchor not found: park stoves")
    text = text.replace(old, new, 1)

    old = '''  ...shelfRow(1, 294, { x: 560, y: 404 }, [
    {
      x: 700,
      price: 500000000,
      label: "メルヘンの雑貨棚",
      art: "plush",
      detail: "丘の上でしか買えない小物",
      unlockAfter: "area-8",
    },
  ]),
];

/** 券売スタッフは、担当の券売所を買えば出てくる（1人目だけ2つ目の券売所から） */'''
    new = '''  ...shelfRow(1, 294, { x: 560, y: 404 }, [
    {
      x: 700,
      price: 500000000,
      label: "メルヘンの雑貨棚",
      art: "plush",
      detail: "丘の上でしか買えない小物",
      unlockAfter: "area-8",
    },
  ]),

  /* ナイトメア・パーク: 入口から左へ、怖さと必要チケット枚数が上がる */
  ...rideRow(10, 294, [
    { x: -300, price: 130000000000, label: "おばけスナック", cost: 4, art: "shooting", detail: "幽霊が店番する怪しいスナックスタンド" },
    { x: -200, price: 180000000000, label: "呪いの人形館", cost: 5, art: "carousel", detail: "人形たちがこちらを見つめる館" },
    { x: -100, price: 260000000000, label: "魔女の館", cost: 6, art: "castleride", detail: "大釜と魔法が待つ森の奥の館" },
  ]),
  ...rideRow(11, 774, [
    { x: -660, price: 520000000000, label: "呪われた墓地", cost: 5, art: "dig", detail: "霧の中で墓石と幽霊が増えていく墓地" },
    { x: -540, price: 720000000000, label: "呪われた教会", cost: 6, art: "theater", detail: "鐘が鳴るたびに怪異が起こる古い教会" },
    { x: -420, price: 980000000000, label: "地下迷宮", cost: 7, art: "minecart", detail: "地下へ入り、別の出口から戻ってくる迷宮" },
  ]),
  ...rideRow(12, 294, [
    { x: -1020, price: 1800000000000, label: "幽霊列車", cost: 6, art: "coaster", detail: "紫の煙を吐きながら闇を周回する列車" },
    { x: -900, price: 2600000000000, label: "呪われたホテル", cost: 7, art: "castleride", detail: "泊まった客が奇妙な体験をする巨大ホテル" },
    { x: -780, price: 4000000000000, label: "ザ・ナイトメア・ハウス", cost: 7, art: "theater", detail: "ナイトメア・パーク最後の巨大お化け屋敷" },
  ]),
];

/** 券売スタッフは、担当の券売所を買えば出てくる（1人目だけ2つ目の券売所から） */'''
    if old not in text:
        raise SystemExit("anchor not found: park seats")
    text = text.replace(old, new, 1)

    old = '''  { id: "collector-4", kind: "collector", pos: { x: 1380, y: 640 }, price: 32000000000, label: "集金係", area: 9 },

  // あとから前の区画に出てくるスタッフ'''
    new = '''  { id: "collector-4", kind: "collector", pos: { x: 1380, y: 640 }, price: 32000000000, label: "集金係", area: 9 },

  // ナイトメア・パーク。専用券売所と案内を順に自動化する
  { id: "cook-horror-1", kind: "cook", pos: { x: -140, y: 130 }, price: 160000000000, label: "闇の券売スタッフ", stoveId: "nightmare-ticket-1", area: 10 },
  { id: "waiter-horror-1", kind: "waiter", pos: { x: -300, y: 434 }, price: 190000000000, label: "ホラー案内人", area: 10, unlockAfter: "seat-10-1" },
  { id: "cook-horror-2", kind: "cook", pos: { x: -500, y: 610 }, price: 650000000000, label: "墓地の券売スタッフ", stoveId: "nightmare-ticket-2", area: 11 },
  { id: "robot-horror-1", kind: "robot", pos: { x: -620, y: 912 }, price: 900000000000, label: "ゴースト案内ロボ", area: 11, unlockAfter: "seat-11-1" },
  { id: "cook-horror-3", kind: "cook", pos: { x: -860, y: 130 }, price: 2200000000000, label: "ナイトメア券売スタッフ", stoveId: "nightmare-ticket-3", area: 12 },
  { id: "waiter-horror-2", kind: "waiter", pos: { x: -1020, y: 640 }, price: 2600000000000, label: "夜の案内人", area: 12, unlockAfter: "seat-12-1" },
  { id: "collector-horror-1", kind: "collector", pos: { x: -780, y: 640 }, price: 3200000000000, label: "夜の集金係", area: 12, unlockAfter: "seat-12-2" },

  // あとから前の区画に出てくるスタッフ'''
    if old not in text:
        raise SystemExit("anchor not found: park hires")
    text = text.replace(old, new, 1)
    stages.write_text(text)
    print("data/stages.ts: patched")
else:
    print("data/stages.ts: already patched")

replace_once(
    "lib/shop.ts",
    '''    | "market"
    | "volcano";''',
    '''    | "market"
    | "volcano"
    | "horror";''',
    "horror palette type",
)

shop = Path("components/Shop.tsx")
src = shop.read_text()
if 'prop === "horror"' not in src:
    old = '''    return;
  }
};

/**
 * 火山の秘境の山。'''
    new = '''    return;
  }
  if (prop === "horror") {
    // 墓石と枯れ木。小物だけでも通常エリアとの境目が分かるようにする
    for (const [i, gx] of [left - 8, left + 12, left + 28].entries()) {
      const h = 18 + (i % 2) * 7;
      ctx.fillStyle = i % 2 ? "#6f6878" : "#57515f";
      roundRect(ctx, gx - 7, y - h, 14, h + 5, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(20,15,28,0.45)";
      ctx.fillRect(gx - 4, y - h + 7, 8, 2);
    }
    ctx.strokeStyle = "#3c2d43";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(right, y + 14);
    ctx.lineTo(right, y - 34);
    ctx.lineTo(right - 16, y - 48);
    ctx.moveTo(right, y - 18);
    ctx.lineTo(right + 18, y - 38);
    ctx.moveTo(right - 4, y - 6);
    ctx.lineTo(right - 20, y - 22);
    ctx.stroke();
    const glow = 0.35 + Math.abs(Math.sin(time * 2.4)) * 0.35;
    ctx.fillStyle = `rgba(166,90,255,${glow})`;
    ctx.beginPath();
    ctx.arc(left + 12, y - 26, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
};

/**
 * 火山の秘境の山。'''
    if old not in src:
        raise SystemExit("anchor not found: horror sideDecor")
    src = src.replace(old, new, 1)

if 'palette.prop === "horror"' not in src:
    old = '''  if (palette.prop === "volcano") {'''
    new = '''  if (palette.prop === "horror") {
    // ナイトメア・パーク: 石畳、紫の霧、満月、枯れ木、古い門
    ctx.fillStyle = "rgba(10,7,14,0.42)";
    roundRect(ctx, rect.x0 + 20, rect.y0 + 104, rect.x1 - rect.x0 - 40, 92, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(190,165,210,0.12)";
    ctx.lineWidth = 1;
    for (let yy = rect.y0 + 118, row = 0; yy < rect.y0 + 190; yy += 16, row += 1) {
      const shift = (row % 2) * 17;
      for (let xx = rect.x0 + 28; xx < rect.x1 - 42; xx += 34) {
        ctx.strokeRect(xx + shift, yy, 28, 10);
      }
    }

    const moonX = rect.x0 + 66;
    const moonY = rect.y0 + 56;
    const halo = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 42);
    halo.addColorStop(0, "rgba(232,222,255,0.28)");
    halo.addColorStop(1, "rgba(120,80,170,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(225,218,240,0.86)";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(8,5,12,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const bx = rect.x0 + 110 + i * 38;
      const by = rect.y0 + 44 + (i % 2) * 15;
      const flap = Math.sin(time * 5 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + flap);
      ctx.quadraticCurveTo(bx - 4, by - 5, bx, by);
      ctx.quadraticCurveTo(bx + 4, by - 5, bx + 10, by - flap);
      ctx.stroke();
    }

    const gateX = rect.x1 - 22;
    ctx.strokeStyle = "#46384f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(gateX - 28, rect.y0 + 118);
    ctx.lineTo(gateX - 28, rect.y0 + 54);
    ctx.quadraticCurveTo(gateX, rect.y0 + 20, gateX + 28, rect.y0 + 54);
    ctx.lineTo(gateX + 28, rect.y0 + 118);
    ctx.stroke();
    ctx.strokeStyle = "rgba(154,118,174,0.55)";
    ctx.lineWidth = 2;
    for (let gx = gateX - 20; gx <= gateX + 20; gx += 10) {
      ctx.beginPath();
      ctx.moveTo(gx, rect.y0 + 58);
      ctx.lineTo(gx, rect.y0 + 116);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i += 1) {
      const drift = (time * (8 + i) + i * 71) % (rect.x1 - rect.x0 + 120);
      const fx = rect.x0 - 60 + drift;
      const fy = rect.y0 + 210 + ((i * 83) % Math.max(80, rect.y1 - rect.y0 - 240));
      ctx.fillStyle = `rgba(112,72,148,${0.055 + (i % 3) * 0.018})`;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 58 + (i % 2) * 20, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const rows = Math.max(1, Math.floor((rect.y1 - rect.y0) / 260));
    for (let i = 0; i < rows; i += 1) {
      for (const tx of [rect.x0 + 42, rect.x1 - 48]) {
        const ty = rect.y0 + 250 + i * 250;
        ctx.strokeStyle = "#35283b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, ty + 18);
        ctx.lineTo(tx, ty - 36);
        ctx.moveTo(tx, ty - 12);
        ctx.lineTo(tx - 18, ty - 30);
        ctx.moveTo(tx, ty - 20);
        ctx.lineTo(tx + 16, ty - 42);
        ctx.stroke();
      }
    }
    return;
  }
  if (palette.prop === "volcano") {'''
    if old not in src:
        raise SystemExit("anchor not found: horror theme")
    src = src.replace(old, new, 1)

shop.write_text(src)
print("components/Shop.tsx: patched")
