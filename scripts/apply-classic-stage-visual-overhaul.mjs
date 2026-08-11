import fs from "node:fs";

const file = "components/Shop.tsx";
let src = fs.readFileSync(file, "utf8");

const importNeedle = `import {
  drawFireForegroundPass,
  drawFireGraphicPass,
  drawTaigaForegroundPass,
  drawTaigaGraphicPass,
} from "@/lib/worldGraphicPass";
`;
const importAdd = `${importNeedle}import {
  drawClassicStageForegroundPass,
  drawClassicStageGraphicPass,
} from "@/lib/stageVisualOverhaul";
`;
if (!src.includes("@/lib/stageVisualOverhaul")) {
  if (!src.includes(importNeedle)) throw new Error("worldGraphicPass import marker not found");
  src = src.replace(importNeedle, importAdd);
}

const backNeedle = `      if (isFire) {
        drawFireGraphicPass(
`;
const backAdd = `      if (stage().id === "ramen" || isPark || isOnsen) {
        drawClassicStageGraphicPass(
          ctx,
          stage().id,
          openAreas(state),
          state.unlocked,
          effectsRef.current ? time : 0,
          effectsRef.current,
        );
      }

      if (isFire) {
        drawFireGraphicPass(
`;
if (!src.includes("drawClassicStageGraphicPass(")) {
  if (!src.includes(backNeedle)) throw new Error("background pass marker not found");
  src = src.replace(backNeedle, backAdd);
}

const foregroundNeedle = `      // 前景をキャラクターより手前に被せ、背景→プレイ層→前景の3層にする。
      if (isFire) drawFireForegroundPass(ctx, openAreas(state));
`;
const foregroundAdd = `      // 前景をキャラクターより手前に被せ、背景→プレイ層→前景の3層にする。
      if (stage().id === "ramen" || isPark || isOnsen) {
        drawClassicStageForegroundPass(
          ctx,
          stage().id,
          openAreas(state),
          effectsRef.current ? time : 0,
          effectsRef.current,
        );
      }
      if (isFire) drawFireForegroundPass(ctx, openAreas(state));
`;
if (!src.includes("drawClassicStageForegroundPass(")) {
  if (!src.includes(foregroundNeedle)) throw new Error("foreground pass marker not found");
  src = src.replace(foregroundNeedle, foregroundAdd);
}

fs.writeFileSync(file, src);
console.log("classic stage visual overhaul wired into Shop.tsx");
