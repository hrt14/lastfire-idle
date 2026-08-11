import fs from "node:fs";

const path = "lib/worldGraphicPass.ts";
let s = fs.readFileSync(path, "utf8");

const insertBeforeOnce = (marker, block) => {
  if (s.includes(block.trim())) return;
  const i = s.indexOf(marker);
  if (i < 0) throw new Error(`marker not found: ${marker}`);
  s = s.slice(0, i) + block + s.slice(i);
};

const insertAfterOnce = (marker, block, unique) => {
  if (unique && s.includes(unique)) return;
  const i = s.indexOf(marker);
  if (i < 0) throw new Error(`marker not found: ${marker}`);
  const end = i + marker.length;
  s = s.slice(0, end) + block + s.slice(end);
};

const fireHelper = `const drawFireHeroScalePolish = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  effects: boolean,
) => {
  ctx.save();

  // 火は「設備」ではなく、この時代の象徴。遠目でも場所が分かる高さと広がりを足す。
  if (areas.some((area) => area.id === "area-0")) {
    const x = 344;
    const y = 196;
    ctx.strokeStyle = "rgba(77,50,29,0.52)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i += 1) {
      const a = -0.9 + i * 0.45;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 48, y + 28 + Math.sin(a) * 18);
      ctx.lineTo(x + Math.cos(a) * 104, y + 43 + Math.sin(a) * 28);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    if (effects) {
      for (let i = 0; i < 6; i += 1) {
        const t = (time * 0.055 + i * 0.15) % 1;
        const px = x + Math.sin(time * 0.45 + i * 1.4) * (9 + t * 24);
        const py = y - 34 - t * 138;
        ctx.fillStyle = "rgba(187,177,158," + 0.13 * (1 - t) + ")";
        ctx.beginPath();
        ctx.arc(px, py, 13 + t * 24, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 村はテントの集合ではなく、中心建築が視線を取る完成形へ。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-hall2")) {
    const x = 4480;
    const y = 584;
    ctx.fillStyle = "rgba(84,55,33,0.95)";
    ctx.fillRect(x - 88, y - 60, 176, 72);
    ctx.fillStyle = "rgba(119,76,40,0.96)";
    ctx.beginPath();
    ctx.moveTo(x - 108, y - 60);
    ctx.lineTo(x, y - 116);
    ctx.lineTo(x + 108, y - 60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(215,171,96,0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 62, y - 22);
    ctx.lineTo(x + 62, y - 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(38,28,21,0.76)";
    ctx.fillRect(x - 13, y - 30, 26, 42);
    if (effects) smoke(ctx, x + 62, y - 104, time + 4.2, 0.92);
  }

  // 川へ到達した瞬間は、水辺の物流施設が画面を取る。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-raft-l")) {
    const x = 5190;
    const y = 188;
    ctx.strokeStyle = "rgba(100,63,34,0.88)";
    ctx.lineWidth = 12;
    for (const dx of [-118, -54, 18, 92]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 24);
      ctx.lineTo(x + dx, y + 86);
      ctx.stroke();
    }
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(x - 145, y + 56);
    ctx.lineTo(x + 122, y + 56);
    ctx.stroke();
    cargoPile(ctx, x - 70, y + 42, 10, 0.82);
  }

  ctx.restore();
};

`;
insertBeforeOnce("export const drawFireGraphicPass = (\n", fireHelper);
insertAfterOnce(
  "  drawFireAmbientLife(ctx, areas, unlockedSet, time);\n",
  "  drawFireHeroScalePolish(ctx, areas, unlockedSet, time, effects);\n",
  "drawFireHeroScalePolish(ctx, areas, unlockedSet, time, effects);",
);

const taigaHelper = `const drawTaigaHeroScalePolish = (
  ctx: CanvasRenderingContext2D,
  areas: AreaView[],
  unlocked: ReadonlySet<string>,
  time: number,
  riverLane: number,
) => {
  ctx.save();

  // 市場を小屋の集合ではなく、一つの「大市場」として読ませる。
  if (areas.some((area) => area.id === "area-4") && unlocked.has("built-build-market")) {
    const x = 3920;
    const y = 505;
    ctx.fillStyle = "rgba(106,67,39,0.86)";
    ctx.fillRect(x - 118, y - 22, 236, 58);
    ctx.fillStyle = "rgba(195,139,65,0.78)";
    ctx.beginPath();
    ctx.moveTo(x - 148, y - 22);
    ctx.lineTo(x, y - 88);
    ctx.lineTo(x + 148, y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(233,197,120,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 118, y + 2);
    ctx.lineTo(x + 118, y + 2);
    ctx.stroke();
    cargoPile(ctx, x + 132, y + 42, 14, 0.88);
  }

  // 川の町は塔と家並みの高さ差を強くし、遠景でも町だと分かる輪郭にする。
  if (areas.some((area) => area.id === "area-5") && unlocked.has("built-build-temple")) {
    const x = 4820;
    const y = 585;
    ctx.fillStyle = "rgba(85,58,36,0.88)";
    ctx.fillRect(x - 26, y - 154, 52, 158);
    ctx.fillStyle = "rgba(119,78,43,0.92)";
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 154);
    ctx.lineTo(x, y - 205);
    ctx.lineTo(x + 42, y - 154);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(232,190,101,0.40)";
    for (const wy of [y - 124, y - 90, y - 56]) ctx.fillRect(x - 13, wy, 26, 12);
  }

  // 大穀倉地帯は建物一棟で終わらせず、穀物の集積量を横方向に見せる。
  if (areas.some((area) => area.id === "area-6") && unlocked.has("built-build-granary-2")) {
    cargoPile(ctx, 5920, 652, 24, 1.05);
    cargoPile(ctx, 5750, 648, 15, 0.88);
  }

  // 最終治水は水門だけでなく、堤防が奥へ連続することで巨大さを出す。
  if (areas.some((area) => area.id === "area-8") && unlocked.has("built-build-great-weir")) {
    const x = 7780;
    const y = riverLane + 90;
    ctx.strokeStyle = "rgba(119,82,49,0.48)";
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 420, y + 145);
    ctx.quadraticCurveTo(x - 250, y + 54, x - 138, y + 30);
    ctx.moveTo(x + 420, y + 145);
    ctx.quadraticCurveTo(x + 250, y + 54, x + 138, y + 30);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(222,240,238,0.16)";
    for (let i = 0; i < 8; i += 1) {
      const px = x - 108 + i * 31;
      ctx.beginPath();
      ctx.ellipse(px, y + 48 + Math.sin(time * 1.2 + i) * 3, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

`;
insertBeforeOnce("export const drawTaigaGraphicPass = (\n", taigaHelper);
insertAfterOnce(
  "  drawTaigaAmbientLife(ctx, areas, unlockedSet, time, riverLane);\n",
  "  drawTaigaHeroScalePolish(ctx, areas, unlockedSet, time, riverLane);\n",
  "drawTaigaHeroScalePolish(ctx, areas, unlockedSet, time, riverLane);",
);

const fireForeground = `    if (area.id === "area-2") {
      ctx.fillStyle = "rgba(48,40,34,0.88)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 38, rect.y1 - 15, 48, 27, -0.18, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 42, rect.y1 - 10, 58, 31, 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (area.id === "area-3") {
      ctx.fillStyle = "rgba(223,233,234,0.78)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 80, rect.y1 - 4, 104, 28, -0.04, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 110, rect.y1 - 3, 132, 34, 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (area.id === "area-5") {
      for (let r = 0; r < 5; r += 1) {
        grassTuft(ctx, rect.x0 + 28 + r * 38, rect.y1 - 4, 1.85 + r * 0.08, "rgba(55,91,63,0.88)");
      }
    }
`;
if (!s.includes(fireForeground.trim())) {
  const scope = s.indexOf("export const drawFireForegroundPass = (");
  const loop = s.indexOf("    for (let i = 0; i < count; i += 1) {\n", scope);
  if (scope < 0 || loop < 0) throw new Error("fire foreground marker not found");
  s = s.slice(0, loop) + fireForeground + s.slice(loop);
}

const taigaForegroundMarker = "    // 川辺は葦を手前に被せる。畑側は背の高い作物でプレイ層を挟む。\n";
const taigaForeground = `    if (area.id === "area-4") {
      cargoPile(ctx, rect.x1 - 82, rect.y1 - 5, 12, 1.0);
    }
    if (area.id === "area-6") {
      for (let r = 0; r < 6; r += 1) {
        grassTuft(ctx, rect.x0 + 35 + r * 42, rect.y1 - 4, 1.95, "rgba(183,148,52,0.90)");
      }
    }
    if (area.id === "area-8") {
      ctx.fillStyle = "rgba(113,82,52,0.72)";
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 85, rect.y1 + 2, 120, 32, -0.06, 0, Math.PI * 2);
      ctx.ellipse(rect.x1 - 105, rect.y1 + 4, 145, 38, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
`;
insertBeforeOnce(taigaForegroundMarker, taigaForeground);

fs.writeFileSync(path, s);
