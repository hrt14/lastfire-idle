/**
 * 区画ごとの見た目を1枚ずつ確かめる。
 * 入口からその区画まで歩き直してから撮るので、何枚撮ってもずれない。
 */
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOT_DIR ?? "/tmp/transect";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const COLS = 9;
const ROWS = 6;
const CELL_W = 360;
const CELL_H = 420;

const path: [number, number][] = [];
for (let row = ROWS - 1; row >= 0; row -= 1) {
  const l2r = row % 2 === 1;
  for (let step = 0; step < 5; step += 1) path.push([l2r ? 4 + step : 8 - step, row]);
}
for (let row = 0; row < ROWS; row += 1) {
  const r2l = row % 2 === 0;
  for (let step = 0; step < 4; step += 1) path.push([r2l ? 3 - step : step, row]);
}
void COLS;

const unlocked = () => {
  const ids: string[] = ["stove-1"];
  for (let area = 0; area <= 53; area += 1) {
    if (area > 0) ids.push(`area-${area}`);
    for (let index = 1; index <= 3; index += 1) {
      ids.push(`tank-${area}-${index}`, `seat-${area}-${index}`, `auto-seat-${area}-${index}`);
    }
  }
  ids.push("cook-1", "waiter-1", "seller-1", "gatekeeper-1", "robot-1", "stove-2", "cook-2", "stove-3", "cook-3");
  ids.push("shop-store-1", "stocker-1", "stocker-2");
  ids.push("restaurant-kitchen-1", "restaurant-kitchen-2", "server-1", "server-2", "busser-1", "busser-2");
  ids.push("waiter-4", "robot-4");
  for (let i = 0; i < 4; i += 1) ids.push(`stove-${6 + i}`, `cook-${6 + i}`);
  for (let i = 1; i <= 8; i += 1) ids.push(`ancient-crew-${i}`);
  ids.push("equip-night", "equip-jelly-light", "equip-ocean-sign", "equip-terrarium-heat", "equip-night-terrarium");
  ids.push("equip-time-tunnel", "equip-fossil-lab", "equip-paleo-dome", "equip-origin-hall");
  return ids;
};

/** 速度Lv10 で 256 units/s */
const SPEED = 256;
const HOLD_FACTOR = Number(process.env.HOLD_FACTOR ?? 1);
const PLAY_TIME = Number(process.env.PLAY_TIME ?? 120);
const AREAS = (process.env.AREAS ?? "18,19,20,21,22,24,25,30,32,37,41,43,45,47,49,51,52,53")
  .split(",")
  .map((n) => Number(n.trim()));

const press = async (page: Page, key: string, ms: number) => {
  if (ms <= 0) return;
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(320);
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("‼ ページのエラー:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("‼ console:", m.text()); });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ ids, playTime }) => {
    localStorage.setItem("ramen-arcade-idle-v1", JSON.stringify({
      active: "aquarium",
      stages: { aquarium: {
        money: 9e21, served: 7000, unlocked: ids, built: [],
        levels: { carry: 10, speed: 10, cook: 10, price: 24, gate: 0 },
        lastSeen: Date.now(), playTime,
      } },
      skins: ["default"], stars: {}, equipped: "default", gacha: [1],
    }));
  }, { ids: unlocked(), playTime: PLAY_TIME });

  for (const area of AREAS) {
    const cell = path[area];
    if (!cell) continue;
    await page.reload({ waitUntil: "networkidle" });
    const go = page.locator("li.stage-aquarium button.stage-go");
    if (await go.count()) await go.first().click();
    await page.waitForSelector("canvas", { timeout: 15000 });
    await page.waitForTimeout(1800);

    const dx = (cell[0] - 4) * CELL_W;
    const dy = (cell[1] - 5) * CELL_H;
    await press(page, dx >= 0 ? "ArrowRight" : "ArrowLeft", (Math.abs(dx) / SPEED) * 1000 * HOLD_FACTOR);
    await press(page, dy >= 0 ? "ArrowDown" : "ArrowUp", (Math.abs(dy) / SPEED) * 1000 * HOLD_FACTOR);
    await page.waitForTimeout(900);

    const canvas = page.locator("canvas").first();
    await canvas.screenshot({ path: `${OUT}/area-${String(area).padStart(2, "0")}.png` });
    console.log(`撮った: area-${area}（cell ${cell[0]},${cell[1]}）`);
  }
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
