/**
 * 文字のはじまりの見た目を、実際に描いて確かめる。
 *
 * 仕様書 §19 のスクリーンショットQA用。
 * 初期・中盤・終盤の3枚をUIなしで並べ、
 * どれが最も発展しているかが一目で分かるかを見る。
 *
 *   npx tsx tools/shot-moji.ts
 *
 * Playwright で実際のゲーム画面を開き、区画と文字の段階を進めた状態で
 * キャンバスだけを切り出して png に落とす。
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOT_DIR ?? "/tmp/moji-shots";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

/** 進みぐあいの3段階。localStorage へ直接セーブを差しこんで再現する */
const SCENES: {
  name: string;
  label: string;
  unlocked: string[];
  built: string[];
  records: number;
  money: number;
  /** 右へ歩かせる時間（ミリ秒）。区画ごとに1枚ずつ撮る */
  walk?: number[];
}[] = [
  {
    name: "01-start",
    label: "開始5分",
    unlocked: ["field-1", "barn-1", "seat-0-1", "seat-0-2", "count-1"],
    built: [] as string[],
    records: 0,
    money: 300,
  },
  {
    name: "02-middle",
    label: "中盤",
    unlocked: [
      "field-1", "field-2", "field-3", "barn-1", "count-1", "reed-1",
      "seat-0-1", "seat-0-2", "seat-0-3", "seat-0-t1", "seat-0-t2",
      "farmer-1", "farmer-2", "waiter-1", "waiter-2", "keeper-1", "collector-1",
      "area-1", "clay-1", "knead-1", "dryrack-1", "scribe-1", "forest-1", "split-1",
      "build-archive", "scribe-h1", "kneader-1", "drier-1", "potter-1", "waiter-3",
      "seat-1-1", "seat-1-2", "seat-1-t1", "seat-1-t2",
      "area-2", "reed-2", "school-1", "scribe-2", "dryrack-2", "knead-2",
      "teacher-1", "pupil-1", "pupil-2", "scribe-h2",
      "build-school", "seat-2-1", "seat-2-t1",
      "mark-first-tablet", "mark-records-30", "mark-records-200",
    ],
    built: ["build-archive", "build-school"],
    records: 260,
    money: 90000,
    walk: [7000, 6000],
  },
  {
    name: "03-end",
    label: "クリア直前",
    unlocked: [
      // 6区画ぜんぶと、主だった作業場・人
      "area-1", "area-2", "area-3", "area-4", "area-5",
      "field-1", "field-2", "field-3", "barn-1", "count-1", "reed-1", "reed-2",
      "clay-1", "clay-2", "knead-1", "knead-2", "knead-3",
      "dryrack-1", "dryrack-2", "dryrack-3", "dryrack-4",
      "scribe-1", "scribe-2", "scribe-3", "scribe-4", "scribe-5",
      "school-1", "forest-1", "split-1",
      "pen-1", "loom-1", "grove-1", "desk-1",
      "survey-1", "tax-1", "quarry-1", "mason-1",
      "build-archive", "build-school", "build-yard", "build-bazaar",
      "build-archive2", "build-admin", "build-court", "build-code",
      "scribe-h1", "scribe-h2", "scribe-h3", "scribe-h4", "scribe-h5",
      "teacher-1", "pupil-1", "pupil-2", "pupil-3",
      "clerk-1", "surveyor-1", "officer-1", "guard-1",
      "mason-h1", "carver-1", "elder-1", "trader-1",
      "farmer-1", "farmer-2", "farmer-3", "keeper-1", "collector-1",
      "waiter-1", "waiter-2", "waiter-3", "waiter-4", "waiter-5", "waiter-6", "waiter-7",
      "robot-1", "robot-2", "robot-3", "robot-4", "robot-5", "robot-6",
      "builder-1", "builder-2", "builder-3", "builder-4", "builder-5", "builder-6",
      "herder-1", "weaver-1", "picker-1", "potter-1", "potter-2",
      "kneader-1", "kneader-2", "kneader-3", "drier-1", "drier-2", "drier-3", "drier-4",
      "logger-1", "sawyer-1",
      "seat-0-1", "seat-0-2", "seat-0-3", "seat-0-4", "seat-0-t1", "seat-0-t2",
      "seat-1-1", "seat-1-2", "seat-1-t1", "seat-1-t2",
      "seat-2-1", "seat-2-2", "seat-2-t1", "seat-2-t2",
      "seat-3-1", "seat-3-2", "seat-3-t1", "seat-3-t2", "seat-3-d1", "seat-3-d2",
      "seat-4-1", "seat-4-2", "seat-4-t1", "seat-4-t2", "seat-4-m1",
      "seat-5-1", "seat-5-2", "seat-5-t1", "seat-5-t2", "seat-5-m1",
      "equip-tally-way", "equip-fridge", "equip-noodle", "equip-chute-clay",
      "equip-board-way", "equip-dry-rack-plus", "equip-tally-way-2",
      "equip-alley-road", "equip-market-road", "equip-admin-road", "equip-stone-road",
      "mark-first-tablet", "mark-records-30", "mark-records-200", "mark-records-800",
      "mark-scribes-4",
    ],
    built: [
      "build-archive", "build-school", "build-yard", "build-bazaar",
      "build-archive2", "build-admin", "build-court", "build-code",
    ],
    records: 3200,
    money: 900000000,
    // 第2区画から第6区画まで、順に歩いて撮る
    walk: [7000, 6000, 6000, 6000, 6000],
  },
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  /*
   * この環境には Chromium が入っている（PLAYWRIGHT_BROWSERS_PATH）。
   * playwright の版と入っている版がずれることがあるので、実体を直接指す
   */
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 860 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (error) => console.log("‼ ページのエラー:", error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("‼ console:", msg.text());
  });

  for (const scene of SCENES) {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate((data) => {
      const save = {
        active: "moji",
        stages: {
          moji: {
            money: data.money,
            served: 500,
            unlocked: data.unlocked,
            built: data.built,
            levels: { carry: 4, speed: 4, cook: 5, price: 6, gate: 0 },
            moji: { records: data.records, tech: data.tech, engraved: false },
            lastSeen: Date.now(),
            playTime: 600,
          },
        },
        skins: [],
      };
      localStorage.setItem("ramen-arcade-idle-v1", JSON.stringify(save));
    }, { ...scene, tech: scene.records >= 2400 ? 7 : scene.records >= 220 ? 4 : scene.records >= 6 ? 1 : 0 });

    await page.reload({ waitUntil: "networkidle" });
    // トップからステージへ入る
    const go = page.locator("li.stage-moji button.stage-go");
    if (await go.count()) await go.first().click();
    await page.waitForSelector("canvas", { timeout: 15000 });
    // 何フレームか描かせてから撮る
    await page.waitForTimeout(2500);
    const canvas = page.locator("canvas").first();
    await canvas.screenshot({ path: `${OUT}/${scene.name}.png` });
    console.log(`撮った: ${scene.name}.png（${scene.label}）`);

    /*
     * 区画をまたいだ絵も見たいので、右へ歩かせながら何枚か撮る。
     * プレイヤーの位置はセーブに入っていないので、キーで動かすしかない
     */
    for (const [i, hold] of (scene.walk ?? []).entries()) {
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(hold);
      await page.keyboard.up("ArrowRight");
      await page.waitForTimeout(1200);
      const name = `${scene.name}-area${i + 1}`;
      await canvas.screenshot({ path: `${OUT}/${name}.png` });
      console.log(`撮った: ${name}.png`);
    }
  }

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
