/**
 * 世界水族館の見た目を、実際に描いて確かめる。
 *
 * 背景（館内）と生き物の絵が意図どおり出ているかを、UIなしのキャンバスだけで見る。
 *
 *   npx tsx tools/shot-aquarium.ts
 *
 * Playwright でゲーム画面を開き、区画と水槽を開けた状態にしてから
 * キャンバスを png に落とす。区画は 5×4 のグリッドなので、
 * 上下左右に歩かせて何枚か撮る。
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOT_DIR ?? "/tmp/aquarium-shots";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

/** area 0..n までの区画・水槽・観覧席をぜんぶ開けた状態を作る */
const unlockedUpTo = (lastArea: number) => {
  const ids: string[] = ["stove-1"];
  for (let area = 0; area <= lastArea; area += 1) {
    if (area > 0) ids.push(`area-${area}`);
    for (let index = 1; index <= 3; index += 1) {
      ids.push(`tank-${area}-${index}`);
      ids.push(`seat-${area}-${index}`);
      ids.push(`auto-seat-${area}-${index}`);
    }
  }
  ids.push("cook-1", "waiter-1", "seller-1", "gatekeeper-1", "robot-1");
  if (lastArea >= 4) ids.push("stove-2", "cook-2");
  if (lastArea >= 8) ids.push("stove-3", "cook-3");
  return ids;
};

const SCENES: {
  name: string;
  label: string;
  lastArea: number;
  money: number;
  /** 撮影のたびに押す矢印キーと時間 */
  walk?: { key: string; hold: number }[];
}[] = [
  {
    name: "01-start",
    label: "開始",
    lastArea: 1,
    money: 30_000,
    walk: [{ key: "ArrowRight", hold: 2500 }],
  },
  {
    name: "02-middle",
    label: "中盤（淡水〜海水）",
    lastArea: 9,
    money: 900_000_000,
    walk: [
      { key: "ArrowRight", hold: 3000 },
      { key: "ArrowUp", hold: 3000 },
      { key: "ArrowLeft", hold: 3000 },
    ],
  },
  {
    name: "03-end",
    label: "終盤（世界の海まで）",
    lastArea: 17,
    money: 33_900_000_000_000,
    walk: [
      { key: "ArrowUp", hold: 3000 },
      { key: "ArrowLeft", hold: 3500 },
      { key: "ArrowDown", hold: 3000 },
    ],
  },
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
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
    await page.evaluate(
      (data) => {
        const save = {
          active: "aquarium",
          stages: {
            aquarium: {
              money: data.money,
              served: 400,
              unlocked: data.unlocked,
              built: [],
              levels: { carry: 5, speed: 6, cook: 6, price: 8, gate: 0 },
              lastSeen: Date.now(),
              playTime: 900,
            },
          },
          skins: ["default"],
          stars: {},
          equipped: "default",
          gacha: [1],
        };
        localStorage.setItem("ramen-arcade-idle-v1", JSON.stringify(save));
      },
      { money: scene.money, unlocked: unlockedUpTo(scene.lastArea) },
    );

    await page.reload({ waitUntil: "networkidle" });
    const go = page.locator("li.stage-aquarium button.stage-go");
    if (await go.count()) await go.first().click();
    await page.waitForSelector("canvas", { timeout: 15000 });
    await page.waitForTimeout(2500);
    const canvas = page.locator("canvas").first();
    await canvas.screenshot({ path: `${OUT}/${scene.name}.png` });
    console.log(`撮った: ${scene.name}.png（${scene.label}）`);

    for (const [i, step] of (scene.walk ?? []).entries()) {
      await page.keyboard.down(step.key);
      await page.waitForTimeout(step.hold);
      await page.keyboard.up(step.key);
      await page.waitForTimeout(1200);
      const name = `${scene.name}-walk${i + 1}`;
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
