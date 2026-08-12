/**
 * 世界水族館の描画コストを、実際のゲーム画面で測る。
 *
 *   npx tsx tools/bench-aquarium.ts
 *
 * 区画をぜんぶ開けた終盤の状態で、フレーム間隔を集める。
 * 60fps なら約16.7ms。ここが大きく伸びていたら描きすぎ。
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const unlockedUpTo = (lastArea: number) => {
  const ids: string[] = ["stove-1"];
  for (let area = 0; area <= lastArea; area += 1) {
    if (area > 0) ids.push(`area-${area}`);
    for (let index = 1; index <= 3; index += 1) {
      ids.push(`tank-${area}-${index}`, `seat-${area}-${index}`, `auto-seat-${area}-${index}`);
    }
  }
  ids.push("cook-1", "waiter-1", "seller-1", "gatekeeper-1", "robot-1", "stove-2", "cook-2", "stove-3", "cook-3");
  return ids;
};

const run = async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("‼", e.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((unlocked) => {
    localStorage.setItem(
      "ramen-arcade-idle-v1",
      JSON.stringify({
        active: "aquarium",
        stages: {
          aquarium: {
            money: 33_900_000_000_000,
            served: 600,
            unlocked,
            built: [],
            levels: { carry: 6, speed: 8, cook: 8, price: 10, gate: 0 },
            lastSeen: Date.now(),
            playTime: 1200,
          },
        },
        skins: ["default"],
        stars: {},
        equipped: "default",
        gacha: [1],
      }),
    );
  }, unlockedUpTo(17));
  await page.reload({ waitUntil: "networkidle" });
  const go = page.locator("li.stage-aquarium button.stage-go");
  if (await go.count()) await go.first().click();
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForTimeout(2500);

  // tsx が関数名ヘルパーを差しこむので、計測コードは文字列で渡す
  const samples = (await page.evaluate(`
    new Promise((resolve) => {
      const out = [];
      let last = performance.now();
      function tick() {
        const now = performance.now();
        out.push(now - last);
        last = now;
        if (out.length >= 120) resolve(out);
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    })
  `)) as number[];
  const sorted = [...samples].slice(5).sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  console.log(
    `frame ms  median ${at(0.5).toFixed(1)}  p90 ${at(0.9).toFixed(1)}  max ${sorted[sorted.length - 1].toFixed(1)}`,
  );

  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
