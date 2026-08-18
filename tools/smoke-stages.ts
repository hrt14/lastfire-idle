/** 各ステージを開いて、エラーが出ないことだけ確かめる */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const run = async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 430, height: 860 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const cards = page.locator("li[class*='stage-'] button.stage-go:not([disabled])");
  const n = await cards.count();
  console.log(`遊べるステージ: ${n}`);
  for (let i = 0; i < n; i += 1) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const card = page.locator("li[class*='stage-'] button.stage-go:not([disabled])").nth(i);
    const label = await card.locator("xpath=ancestor::li").first().getAttribute("class");
    await card.click();
    await page.waitForTimeout(2200);
    const hasCanvas = await page.locator("canvas").count();
    console.log(`  ${label} … canvas=${hasCanvas}`);
  }
  await browser.close();
  if (errors.length) { console.log("‼ エラー:"); for (const e of new Set(errors)) console.log("   " + e); process.exit(1); }
  console.log("エラーなし");
};

run().catch((e) => { console.error(e); process.exit(1); });
