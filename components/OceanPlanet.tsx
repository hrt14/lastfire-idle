"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./OceanPlanet.module.css";
import {
  advanceOcean,
  areaAutomation,
  availablePurchases,
  bottleneck,
  buyOceanPurchase,
  carryCapacity,
  collectProduct,
  deliverProduct,
  depositSource,
  dismissOfflineReport,
  inputCapacity,
  oceanArea,
  oceanAreas,
  oceanCompleted,
  oceanObjective,
  oceanResources,
  outputCapacity,
  processCycle,
  selectOceanArea,
  type OceanAreaId,
  type OceanPurchase,
  type OceanResourceId,
  type OceanState,
} from "@/lib/ocean";
import { loadOcean, resetOcean, saveOcean } from "@/lib/oceanStore";
import { equippedSkin } from "@/lib/shopStore";
import type { Skin } from "@/data/skins";
import { startCloud } from "@/lib/cloud";

type Vec = { x: number; y: number };
type Joystick = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
};
type Gather = { key: string; ms: number; index: number };
type Guidance = { pos: Vec; label: string; kind: "work" | "buy" | "wait" };

const WORLD = { w: 720, h: 660 };
const SOURCE = { x: 112, y: 205 };
const SOURCE_PICKUP = { x: 112, y: 302 };
const PROCESSOR = { x: 360, y: 210 };
const INPUT = { x: 307, y: 301 };
const OUTPUT = { x: 413, y: 301 };
const HQ = { x: 608, y: 205 };
const HQ_DROP = { x: 608, y: 302 };
const PLAYER_START = { x: 360, y: 420 };
const PURCHASE_POSITIONS = [
  { x: 205, y: 548 },
  { x: 360, y: 548 },
  { x: 515, y: 548 },
];
const INTERACT_RADIUS = 48;
const GATHER_RADIUS = 43;
const PURCHASE_RADIUS = 34;
const MOVE_SPEED = 150;

const FISH_BASES: Vec[] = [
  { x: 82, y: 190 },
  { x: 137, y: 206 },
  { x: 101, y: 248 },
  { x: 148, y: 267 },
  { x: 67, y: 270 },
  { x: 126, y: 165 },
];
const STATIC_BASES: Vec[] = [
  { x: 78, y: 188 },
  { x: 132, y: 194 },
  { x: 102, y: 236 },
  { x: 148, y: 260 },
  { x: 68, y: 274 },
  { x: 126, y: 167 },
];

const emptyJoystick = (): Joystick => ({
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
});

const emptyGather = (): Gather => ({ key: "", ms: 0, index: -1 });
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const short = (value: number) => {
  if (value < 10_000) return Math.floor(value).toLocaleString("ja-JP");
  if (value < 100_000_000) return `${(value / 10_000).toFixed(value < 100_000 ? 1 : 0)}万`;
  return `${(value / 100_000_000).toFixed(1)}億`;
};

const duration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}時間${rest}分` : `${Math.max(1, minutes)}分`;
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

const drawRing = (
  ctx: CanvasRenderingContext2D,
  at: Vec,
  icon: string,
  label: string,
  active: boolean,
  time: number,
) => {
  const radius = active ? 28 + Math.sin(time * 0.009) * 3 : 25;
  ctx.fillStyle = active ? "rgba(255,230,130,0.24)" : "rgba(226,250,255,0.14)";
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? "#ffe58a" : "rgba(225,249,255,0.55)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "700 17px system-ui";
  ctx.fillStyle = "#fff";
  ctx.fillText(icon, at.x, at.y + 6);
  ctx.font = "700 10px system-ui";
  ctx.fillText(label, at.x, at.y + 43);
};

const isSwimmingSource = (kind: OceanResourceId) =>
  kind === "fish" || kind === "tuna" || kind === "iceFish";

const gatherDuration = (areaIndex: number, swimming: boolean) =>
  swimming ? 720 + areaIndex * 85 : 560 + areaIndex * 70;

const sourceTargets = (state: OceanState, time: number): Vec[] => {
  const def = oceanArea(state.currentArea);
  const line = state.lines[state.currentArea];
  const count = Math.min(6, Math.max(0, Math.floor(line.wild)));
  const swimming = isSwimmingSource(def.source);
  const bases = swimming ? FISH_BASES : STATIC_BASES;
  return bases.slice(0, count).map((base, index) => {
    if (!swimming) {
      const pulse = Math.sin(time * 0.0015 + index * 1.7) * 2;
      return { x: base.x, y: base.y + pulse };
    }
    const speed = def.source === "tuna" ? 0.00085 : def.source === "iceFish" ? 0.00055 : 0.0007;
    const phase = time * speed + index * 1.31 + def.index * 0.4;
    return {
      x: clamp(base.x + Math.sin(phase) * (18 + (index % 2) * 8), 62, 160),
      y: clamp(base.y + Math.cos(phase * 0.83) * (13 + (index % 3) * 4), 160, 282),
    };
  });
};

const nearestTarget = (player: Vec, targets: Vec[]) => {
  let best = -1;
  let bestDistance = Infinity;
  targets.forEach((target, index) => {
    const d = distance(player, target);
    if (d < bestDistance) {
      best = index;
      bestDistance = d;
    }
  });
  return { index: best, distance: bestDistance, pos: best >= 0 ? targets[best] : SOURCE_PICKUP };
};

const collectOneSource = (state: OceanState, id: OceanAreaId): OceanState => {
  const def = oceanArea(id);
  const line = state.lines[id];
  const compatible = state.carry.amount <= 0 || state.carry.kind === def.source;
  const room = carryCapacity(state) - state.carry.amount;
  const available = line.sourceAuto ? line.harvested : line.wild;
  if (!compatible || room <= 0 || available < 1) return state;
  const nextLine = { ...line };
  if (line.sourceAuto) nextLine.harvested -= 1;
  else nextLine.wild -= 1;
  return {
    ...state,
    lines: { ...state.lines, [id]: nextLine },
    carry: { kind: def.source, amount: state.carry.amount + 1 },
    totalActions: state.totalActions + 1,
    totalFishCaught: state.totalFishCaught + 1,
  };
};

const purchasePosition = (purchases: OceanPurchase[], purchase: OceanPurchase) => {
  const index = purchases.findIndex((item) => item.id === purchase.id);
  return PURCHASE_POSITIONS[Math.max(0, index)] ?? PURCHASE_POSITIONS[0];
};

const guidance = (state: OceanState, player: Vec, time: number): Guidance => {
  const def = oceanArea(state.currentArea);
  const line = state.lines[state.currentArea];
  const purchases = availablePurchases(state, state.currentArea);

  if (state.carry.kind === def.source && state.carry.amount > 0) {
    return { pos: INPUT, label: `${def.processorName}へ運ぶ`, kind: "work" };
  }
  if (state.carry.kind === def.product && state.carry.amount > 0) {
    return { pos: HQ_DROP, label: `${def.productName}を納品`, kind: "work" };
  }
  if (line.output >= 1) {
    return { pos: OUTPUT, label: `${def.productName}を受け取る`, kind: "work" };
  }

  const affordable = purchases.find((purchase) => state.shells >= purchase.cost);
  if (affordable) {
    return {
      pos: purchasePosition(purchases, affordable),
      label: affordable.label,
      kind: "buy",
    };
  }

  if (line.input > 0) {
    return { pos: OUTPUT, label: "加工完了を待つ", kind: "wait" };
  }
  if (line.sourceAuto && line.harvested >= 1) {
    return { pos: SOURCE_PICKUP, label: `${def.sourceName}の水揚げを受け取る`, kind: "work" };
  }
  if (!line.sourceAuto && line.wild >= 1) {
    const target = nearestTarget(player, sourceTargets(state, time)).pos;
    return { pos: target, label: `${oceanResources[def.source].name}を採る`, kind: "work" };
  }
  if (line.sourceAuto && line.harvested < 1) {
    return { pos: SOURCE_PICKUP, label: "水揚げを待つ", kind: "wait" };
  }
  return { pos: SOURCE_PICKUP, label: "資源の再出現を待つ", kind: "wait" };
};

const drawGuidance = (
  ctx: CanvasRenderingContext2D,
  from: Vec,
  next: Guidance,
  time: number,
) => {
  const to = next.pos;
  if (distance(from, to) > 42) {
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -((time * 0.04) % 14);
    ctx.strokeStyle = next.kind === "buy" ? "rgba(126,240,194,0.75)" : "rgba(255,225,112,0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y - 8);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  const pulse = 0.5 + Math.sin(time * 0.006) * 0.5;
  ctx.strokeStyle = next.kind === "buy"
    ? `rgba(126,240,194,${0.55 + pulse * 0.4})`
    : `rgba(255,225,112,${0.5 + pulse * 0.45})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(to.x, to.y, 22 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = "800 10px system-ui";
  const label = `NEXT  ${next.label}`;
  const width = ctx.measureText(label).width + 18;
  const x = clamp(to.x, width / 2 + 8, WORLD.w - width / 2 - 8);
  const y = Math.max(92, to.y - 52);
  ctx.fillStyle = "rgba(3,24,34,0.82)";
  roundRect(ctx, x - width / 2, y - 12, width, 22, 11);
  ctx.fill();
  ctx.strokeStyle = next.kind === "buy" ? "rgba(126,240,194,0.8)" : "rgba(255,225,112,0.7)";
  ctx.lineWidth = 1.3;
  roundRect(ctx, x - width / 2, y - 12, width, 22, 11);
  ctx.stroke();
  ctx.fillStyle = next.kind === "buy" ? "#9ff5d1" : "#fff0a8";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 3);
};

const drawFish = (
  ctx: CanvasRenderingContext2D,
  pos: Vec,
  kind: OceanResourceId,
  index: number,
  time: number,
  active: boolean,
) => {
  const scale = kind === "tuna" ? 1.35 : kind === "iceFish" ? 1.05 : 0.9;
  const phase = time * 0.003 + index;
  const face = Math.cos(phase * 0.23 + index) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.scale(face * scale, scale);
  if (active) {
    ctx.shadowColor = "rgba(255,232,130,0.95)";
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = kind === "iceFish" ? "#b8f4ff" : kind === "tuna" ? "#5ea3e8" : "#74d8f5";
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(-21, -8);
  ctx.lineTo(-19, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(4, -2, 4, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#102b3b";
  ctx.beginPath();
  ctx.arc(8, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawStaticSource = (
  ctx: CanvasRenderingContext2D,
  pos: Vec,
  kind: OceanResourceId,
  active: boolean,
  time: number,
) => {
  ctx.save();
  ctx.translate(pos.x, pos.y + Math.sin(time * 0.002 + pos.x) * 1.5);
  if (active) {
    ctx.shadowColor = "rgba(255,232,130,0.95)";
    ctx.shadowBlur = 13;
  }
  ctx.font = kind === "plankton" ? "700 20px system-ui" : "700 26px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(oceanResources[kind].icon, 0, 7);
  ctx.restore();
};

const drawGatherProgress = (
  ctx: CanvasRenderingContext2D,
  pos: Vec,
  progress: number,
  swimming: boolean,
) => {
  ctx.strokeStyle = "rgba(5,24,34,0.65)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#ffe37e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  ctx.font = "800 9px system-ui";
  ctx.fillStyle = "#fff0a8";
  ctx.textAlign = "center";
  ctx.fillText(swimming ? "つかまえる" : "採集", pos.x, pos.y + 38);
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  player: Vec,
  skin: Skin,
  state: OceanState,
  time: number,
) => {
  const bob = Math.sin(time * 0.009) * 1.5;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.coat;
  roundRect(ctx, -13, -2, 26, 27, 9);
  ctx.fill();
  ctx.fillStyle = skin.head;
  ctx.beginPath();
  ctx.arc(0, -12, 11, 0, Math.PI * 2);
  ctx.fill();
  if (skin.hat !== "none") {
    ctx.fillStyle = skin.hatColor ?? "#dff6ff";
    roundRect(ctx, -12, -23, 24, 8, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#12212d";
  ctx.fillRect(-6, -14, 3, 3);
  ctx.fillRect(3, -14, 3, 3);
  ctx.restore();

  if (state.carry.kind && state.carry.amount > 0) {
    const resource = oceanResources[state.carry.kind];
    ctx.fillStyle = "rgba(5,25,36,0.82)";
    roundRect(ctx, player.x - 25, player.y - 54, 50, 24, 12);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.font = "700 13px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${resource.icon} ×${state.carry.amount}`, player.x, player.y - 37);
  }
};

const drawScene = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: OceanState,
  player: Vec,
  joystick: Joystick,
  hold: { id: string; ms: number },
  gather: Gather,
  skin: Skin,
  time: number,
) => {
  const def = oceanArea(state.currentArea);
  const line = state.lines[state.currentArea];
  const purchases = availablePurchases(state, state.currentArea);
  const sourceInfo = oceanResources[def.source];
  const productInfo = oceanResources[def.product];
  const targets = sourceTargets(state, time);
  const nearest = nearestTarget(player, targets);
  const swimming = isSwimmingSource(def.source);
  const scale = Math.min(width / WORLD.w, height / WORLD.h);
  const ox = (width - WORLD.w * scale) / 2;
  const oy = (height - WORLD.h * scale) / 2;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, def.color);
  gradient.addColorStop(1, "#052b42");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "rgba(222,249,255,0.13)";
  ctx.lineWidth = 2;
  for (let y = 84; y < WORLD.h; y += 32) {
    ctx.beginPath();
    for (let x = 0; x <= WORLD.w; x += 18) {
      const wave = Math.sin(x * 0.035 + time * 0.002 + y) * 3;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(14,56,70,0.82)";
  roundRect(ctx, 40, 115, 145, 230, 42);
  ctx.fill();
  roundRect(ctx, 266, 115, 188, 230, 42);
  ctx.fill();
  roundRect(ctx, 535, 115, 145, 230, 42);
  ctx.fill();

  ctx.strokeStyle = "rgba(239,250,232,0.52)";
  ctx.lineWidth = 8;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(183, 250);
  ctx.lineTo(270, 250);
  ctx.moveTo(452, 250);
  ctx.lineTo(537, 250);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.fillStyle = "#f5fdff";
  ctx.font = "800 12px system-ui";
  ctx.fillText(def.sourceName, SOURCE.x, 145);
  ctx.font = "700 11px system-ui";
  ctx.fillStyle = "rgba(240,252,255,0.78)";
  ctx.fillText(
    line.sourceAuto
      ? `自然 ${Math.floor(line.wild)} / 水揚げ ${Math.floor(line.harvested)}`
      : `残り ${Math.floor(line.wild)}`,
    SOURCE.x,
    156,
  );

  if (line.sourceAuto) {
    ctx.font = "700 22px system-ui";
    ctx.fillText("🧑‍✈️", 76 + Math.sin(time * 0.003) * 13, 244);
    ctx.fillStyle = "rgba(7,35,45,0.76)";
    roundRect(ctx, 84, 265, 56, 32, 8);
    ctx.fill();
    ctx.font = "700 16px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${sourceInfo.icon} ${Math.floor(line.harvested)}`, SOURCE_PICKUP.x, 286);
    drawRing(
      ctx,
      SOURCE_PICKUP,
      sourceInfo.icon,
      "水揚げ",
      distance(player, SOURCE_PICKUP) < INTERACT_RADIUS,
      time,
    );
  } else {
    targets.forEach((target, index) => {
      const active = nearest.index === index && nearest.distance < GATHER_RADIUS;
      if (swimming) drawFish(ctx, target, def.source, index, time, active);
      else drawStaticSource(ctx, target, def.source, active, time);
      if (gather.index === index && gather.ms > 0) {
        drawGatherProgress(
          ctx,
          target,
          Math.min(1, gather.ms / gatherDuration(def.index, swimming)),
          swimming,
        );
      }
    });
    if (targets.length === 0) {
      ctx.font = "700 24px system-ui";
      ctx.fillStyle = "rgba(224,250,255,0.5)";
      ctx.fillText("○  ○  ○", SOURCE.x, 222);
      ctx.font = "700 10px system-ui";
      ctx.fillText("再出現を待っています", SOURCE.x, 249);
    }
  }

  ctx.fillStyle = "#194b5c";
  roundRect(ctx, PROCESSOR.x - 72, PROCESSOR.y - 52, 144, 104, 18);
  ctx.fill();
  ctx.strokeStyle = line.input > 0 ? "#7ef0c2" : "rgba(220,248,255,0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = "#fff";
  ctx.fillText(def.processorName, PROCESSOR.x, 145);
  ctx.font = "700 35px system-ui";
  ctx.fillText(def.index >= 4 ? "⚙️" : def.index >= 2 ? "🏭" : "🍳", PROCESSOR.x, 215);
  const ratio = line.input > 0 ? Math.min(1, line.processProgress / processCycle(state, def.id)) : 0;
  ctx.fillStyle = "rgba(2,24,34,0.72)";
  roundRect(ctx, PROCESSOR.x - 54, 246, 108, 9, 5);
  ctx.fill();
  ctx.fillStyle = "#69e7b4";
  roundRect(ctx, PROCESSOR.x - 54, 246, 108 * ratio, 9, 5);
  ctx.fill();
  ctx.font = "700 10px system-ui";
  ctx.fillStyle = "rgba(240,252,255,0.76)";
  ctx.fillText(
    `投入 ${Math.floor(line.input)}/${inputCapacity(state, def.id)}  完成 ${Math.floor(line.output)}/${outputCapacity(state, def.id)}`,
    PROCESSOR.x,
    274,
  );
  drawRing(
    ctx,
    INPUT,
    sourceInfo.icon,
    line.processAuto ? "自動投入" : "投入",
    distance(player, INPUT) < INTERACT_RADIUS,
    time,
  );
  drawRing(
    ctx,
    OUTPUT,
    productInfo.icon,
    "受取",
    distance(player, OUTPUT) < INTERACT_RADIUS,
    time,
  );

  ctx.fillStyle = "#174a66";
  roundRect(ctx, HQ.x - 55, HQ.y - 55, 110, 110, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,235,150,0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = "#fff";
  ctx.fillText("海洋復旧本部", HQ.x, 145);
  ctx.font = "700 34px system-ui";
  ctx.fillText("⚓", HQ.x, 213);
  ctx.font = "700 11px system-ui";
  ctx.fillStyle = "#dffaff";
  ctx.fillText(`${productInfo.icon} ${line.orderProgress}/${def.orderSize}`, HQ.x, 246);
  ctx.fillText(`報酬 🐚${short(def.orderReward)}・💧${def.blueReward}`, HQ.x, 266);
  if (line.deliveryAuto) {
    ctx.font = "700 22px system-ui";
    ctx.fillText("🚤", 650 + Math.sin(time * 0.004) * 12, 285);
  }
  drawRing(
    ctx,
    HQ_DROP,
    productInfo.icon,
    line.deliveryAuto ? "自動納品" : "納品",
    distance(player, HQ_DROP) < INTERACT_RADIUS,
    time,
  );

  ctx.fillStyle = "rgba(4,31,43,0.62)";
  roundRect(ctx, 86, 470, 548, 145, 28);
  ctx.fill();
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = "rgba(238,253,255,0.82)";
  ctx.fillText("設備投資ドック", WORLD.w / 2, 492);

  if (purchases.length === 0) {
    ctx.font = "700 12px system-ui";
    ctx.fillStyle = "rgba(224,249,255,0.72)";
    ctx.fillText("復旧依頼を進めると次の投資が出現します", WORLD.w / 2, 558);
  }

  purchases.forEach((purchase, index) => {
    const at = PURCHASE_POSITIONS[index];
    const active = distance(player, at) < PURCHASE_RADIUS;
    const ratio = hold.id === purchase.id ? Math.min(1, hold.ms / 850) : 0;
    ctx.fillStyle = active ? "rgba(255,222,105,0.25)" : "rgba(92,219,184,0.16)";
    ctx.beginPath();
    ctx.arc(at.x, at.y, 43, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.shells >= purchase.cost ? "#ffe37e" : "rgba(210,233,240,0.35)";
    ctx.lineWidth = active ? 4 : 2;
    ctx.stroke();
    if (ratio > 0) {
      ctx.strokeStyle = "#79f2ba";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }
    ctx.font = "800 10px system-ui";
    ctx.fillStyle = "#fff";
    ctx.fillText(purchase.label, at.x, at.y - 7);
    ctx.font = "800 12px system-ui";
    ctx.fillStyle = state.shells >= purchase.cost ? "#ffe58a" : "#a9bbc2";
    ctx.fillText(`🐚 ${short(purchase.cost)}`, at.x, at.y + 13);
  });

  drawGuidance(ctx, player, guidance(state, player, time), time);
  drawPlayer(ctx, player, skin, state, time);
  ctx.restore();

  if (joystick.active) {
    const rect = ctx.canvas.getBoundingClientRect();
    const ratioX = width / Math.max(1, rect.width);
    const ratioY = height / Math.max(1, rect.height);
    const sx = joystick.startX * ratioX;
    const sy = joystick.startY * ratioY;
    const x = joystick.x * ratioX;
    const y = joystick.y * ratioY;
    ctx.fillStyle = "rgba(3,22,31,0.4)";
    ctx.beginPath();
    ctx.arc(sx, sy, 42 * ratioX, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(235,252,255,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(230,250,255,0.82)";
    ctx.beginPath();
    ctx.arc(x, y, 20 * ratioX, 0, Math.PI * 2);
    ctx.fill();
  }
};

export default function OceanPlanet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<OceanState | null>(null);
  const playerRef = useRef<Vec>({ ...PLAYER_START });
  const joystickRef = useRef<Joystick>(emptyJoystick());
  const interactionRef = useRef(0);
  const purchaseHoldRef = useRef({ id: "", ms: 0 });
  const gatherRef = useRef<Gather>(emptyGather());
  const skinRef = useRef<Skin | null>(null);
  const [display, setDisplay] = useState<OceanState | null>(null);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const completeShownRef = useRef(false);

  const commit = useCallback((next: OceanState, render = false) => {
    stateRef.current = next;
    if (render) setDisplay(next);
  }, []);

  useEffect(() => {
    const loaded = loadOcean();
    stateRef.current = loaded;
    skinRef.current = equippedSkin();
    setDisplay(loaded);
    startCloud();

    const saveTimer = window.setInterval(() => {
      if (stateRef.current) saveOcean(stateRef.current);
    }, 2500);
    const onHidden = () => {
      if (document.visibilityState === "hidden" && stateRef.current) saveOcean(stateRef.current);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.clearInterval(saveTimer);
      document.removeEventListener("visibilitychange", onHidden);
      if (stateRef.current) saveOcean(stateRef.current);
    };
  }, []);

  const ready = display !== null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || !skinRef.current) return;
    let frame = 0;
    let previous = performance.now();
    let lastHud = 0;

    const run = (time: number) => {
      const current = stateRef.current;
      const skin = skinRef.current;
      if (!current || !skin) return;
      const dt = Math.min(80, Math.max(0, time - previous));
      previous = time;
      let next = advanceOcean(current, dt);

      const joystick = joystickRef.current;
      if (joystick.active) {
        const length = Math.hypot(joystick.dx, joystick.dy);
        if (length > 3) {
          const power = Math.min(1, length / 48);
          playerRef.current.x = clamp(
            playerRef.current.x + (joystick.dx / length) * MOVE_SPEED * power * (dt / 1000),
            34,
            WORLD.w - 34,
          );
          playerRef.current.y = clamp(
            playerRef.current.y + (joystick.dy / length) * MOVE_SPEED * power * (dt / 1000),
            78,
            WORLD.h - 35,
          );
        }
      }

      const id = next.currentArea;
      const def = oceanArea(id);
      const line = next.lines[id];
      const player = playerRef.current;
      const carryCompatible =
        next.carry.amount <= 0 || next.carry.kind === def.source;
      const canGather =
        !line.sourceAuto &&
        line.wild >= 1 &&
        carryCompatible &&
        next.carry.amount < carryCapacity(next);

      if (canGather) {
        const targets = sourceTargets(next, time);
        const nearest = nearestTarget(player, targets);
        if (nearest.index >= 0 && nearest.distance < GATHER_RADIUS) {
          const key = `${id}:${nearest.index}`;
          if (gatherRef.current.key !== key) {
            gatherRef.current = { key, ms: 0, index: nearest.index };
          }
          gatherRef.current.ms += dt;
          if (gatherRef.current.ms >= gatherDuration(def.index, isSwimmingSource(def.source))) {
            next = collectOneSource(next, id);
            gatherRef.current = emptyGather();
          }
        } else {
          gatherRef.current = emptyGather();
        }
      } else {
        gatherRef.current = emptyGather();
      }

      interactionRef.current += dt;
      if (interactionRef.current >= 230) {
        let changed = next;
        if (line.sourceAuto && distance(player, SOURCE_PICKUP) < INTERACT_RADIUS) {
          changed = collectOneSource(changed, id);
        } else if (distance(player, INPUT) < INTERACT_RADIUS) {
          changed = depositSource(changed, id);
        } else if (distance(player, OUTPUT) < INTERACT_RADIUS) {
          changed = collectProduct(changed, id);
        } else if (distance(player, HQ_DROP) < INTERACT_RADIUS) {
          changed = deliverProduct(changed, id);
        }
        if (changed !== next) next = changed;
        interactionRef.current = 0;
      }

      const purchases = availablePurchases(next, id);
      const purchaseIndex = purchases.findIndex(
        (_, index) => distance(player, PURCHASE_POSITIONS[index]) < PURCHASE_RADIUS,
      );
      if (purchaseIndex >= 0) {
        const purchase = purchases[purchaseIndex];
        if (purchaseHoldRef.current.id !== purchase.id) {
          purchaseHoldRef.current = { id: purchase.id, ms: 0 };
        }
        if (next.shells >= purchase.cost) {
          purchaseHoldRef.current.ms += dt;
          if (purchaseHoldRef.current.ms >= 850) {
            const beforeArea = next.currentArea;
            next = buyOceanPurchase(next, purchase);
            purchaseHoldRef.current = { id: "", ms: 0 };
            gatherRef.current = emptyGather();
            if (next.currentArea !== beforeArea) playerRef.current = { ...PLAYER_START };
          }
        }
      } else {
        purchaseHoldRef.current = { id: "", ms: 0 };
      }

      stateRef.current = next;
      if (oceanCompleted(next) && !completeShownRef.current) {
        completeShownRef.current = true;
        setShowComplete(true);
      }
      if (time - lastHud >= 180) {
        setDisplay(next);
        lastHud = time;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawScene(
          ctx,
          width,
          height,
          next,
          playerRef.current,
          joystickRef.current,
          purchaseHoldRef.current,
          gatherRef.current,
          skin,
          time,
        );
      }
      frame = window.requestAnimationFrame(run);
    };

    frame = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  const switchArea = (id: OceanAreaId) => {
    const current = stateRef.current;
    if (!current) return;
    const next = selectOceanArea(current, id);
    if (next === current) return;
    playerRef.current = { ...PLAYER_START };
    gatherRef.current = emptyGather();
    commit(next, true);
  };

  const reset = () => {
    const next = resetOcean();
    playerRef.current = { ...PLAYER_START };
    gatherRef.current = emptyGather();
    commit(next, true);
    completeShownRef.current = false;
    setShowComplete(false);
    setConfirmReset(false);
    setSettings(false);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    joystickRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      x,
      y,
      dx: 0,
      dy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const joystick = joystickRef.current;
    if (!joystick.active || joystick.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const dx = rawX - joystick.startX;
    const dy = rawY - joystick.startY;
    const length = Math.hypot(dx, dy);
    const ratio = length > 48 ? 48 / length : 1;
    joystickRef.current = {
      ...joystick,
      x: joystick.startX + dx * ratio,
      y: joystick.startY + dy * ratio,
      dx: dx * ratio,
      dy: dy * ratio,
    };
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (joystickRef.current.pointerId !== event.pointerId) return;
    joystickRef.current = emptyJoystick();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!display) return <main className={styles.loading}>海の星へ航行中…</main>;

  const def = oceanArea(display.currentArea);
  const carryInfo = display.carry.kind ? oceanResources[display.carry.kind] : null;
  const next = guidance(display, playerRef.current, Date.now());

  return (
    <main className={styles.app}>
      <header className={styles.hud}>
        <div className={styles.wallet}>
          <span>🐚</span>
          <strong>{short(display.shells)}</strong>
          <small>シェル</small>
        </div>
        <div className={styles.restoration}>
          <div><span>海洋再生</span><strong>{Math.floor(display.restoration)}%</strong></div>
          <div className={styles.bar}><span style={{ width: `${display.restoration}%` }} /></div>
        </div>
        <div className={styles.hudButtons}>
          <button type="button" onClick={() => setHelp(true)} aria-label="遊び方">?</button>
          <button type="button" onClick={() => setSettings(true)} aria-label="設定">⚙</button>
          <Link href="/" aria-label="ステージ選択へ">☰</Link>
        </div>
      </header>

      <nav className={styles.areaRail} aria-label="海域選択">
        {oceanAreas.map((area) => {
          const open = area.index < display.unlockedAreas;
          return (
            <button
              key={area.id}
              type="button"
              disabled={!open}
              className={area.id === display.currentArea ? styles.selected : undefined}
              onClick={() => switchArea(area.id)}
              aria-label={open ? area.name : "未解放の海域"}
            >
              {open ? area.icon : "🔒"}<small>{area.index + 1}</small>
            </button>
          );
        })}
      </nav>

      <section className={styles.stage}>
        <div className={styles.areaTitle}>
          <strong>{def.icon} {def.name}</strong>
          <small>自動化 {areaAutomation(display, def.id)}/3</small>
        </div>
        <p className={styles.objective}>{oceanObjective(display)}</p>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          aria-label="海の星の作業場。画面をドラッグして移動します"
        />
      </section>

      <footer className={styles.dock}>
        <div className={styles.carry}>
          <span>{carryInfo?.icon ?? "🎒"}</span>
          <div><strong>{display.carry.amount}/{carryCapacity(display)}</strong><small>{carryInfo?.name ?? "手持ちなし"}</small></div>
        </div>
        <div className={styles.status}>
          <strong>次：{next.label}</strong>
          <small>{bottleneck(display)}</small>
        </div>
      </footer>

      {display.offlineReport ? (
        <div className={styles.modal}>
          <section className={styles.sheet}>
            <h2>🌙 留守中の海上レポート</h2>
            <p>{duration(display.offlineReport.elapsedMs)}のあいだに仲間と船が働きました。</p>
            <div className={styles.reportGrid}>
              <span>収入<strong>🐚 {short(display.offlineReport.shells)}</strong></span>
              <span>依頼<strong>{display.offlineReport.orders}件</strong></span>
              <span>海洋再生<strong>+{display.offlineReport.restoration.toFixed(1)}%</strong></span>
            </div>
            <p>{display.offlineReport.bottleneck}</p>
            <button type="button" className={styles.primary} onClick={() => {
              const current = stateRef.current;
              if (current) commit(dismissOfflineReport(current), true);
            }}>海へ戻る</button>
          </section>
        </div>
      ) : null}

      {help ? (
        <div className={styles.modal} onClick={() => setHelp(false)}>
          <section className={styles.sheet} onClick={(event: ReactMouseEvent<HTMLElement>) => event.stopPropagation()}>
            <h2>OCEAN PLANETの遊び方</h2>
            <ol>
              <li>黄色い破線が、次に向かう場所を示します</li>
              <li>泳ぐ魚を追い、近くにいると捕獲ゲージがたまります</li>
              <li>資源を加工設備へ運び、完成品を復旧本部へ納品します</li>
              <li>購入パッドに立ち、仕事を漁師・加工係・船へ渡します</li>
              <li>全7海域を開き、海洋再生率100%を目指します</li>
            </ol>
            <button type="button" className={styles.primary} onClick={() => setHelp(false)}>わかった</button>
          </section>
        </div>
      ) : null}

      {settings ? (
        <div className={styles.modal} onClick={() => setSettings(false)}>
          <section className={styles.sheet} onClick={(event: ReactMouseEvent<HTMLElement>) => event.stopPropagation()}>
            <h2>設定</h2>
            <p>海の星だけを最初からやり直します。他ステージと共通スキンは残ります。</p>
            {!confirmReset ? (
              <button type="button" className={styles.danger} onClick={() => setConfirmReset(true)}>海の星をリセット</button>
            ) : (
              <div className={styles.confirm}>
                <strong>本当にリセットしますか？</strong>
                <button type="button" className={styles.danger} onClick={reset}>リセットする</button>
                <button type="button" onClick={() => setConfirmReset(false)}>キャンセル</button>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {showComplete ? (
        <div className={styles.modal}>
          <section className={`${styles.sheet} ${styles.complete}`}>
            <span className={styles.completeIcon}>🌍</span>
            <h2>海の星は、再び命に満ちた。</h2>
            <p>全7海域の仕事を仲間と機械へ渡し、海洋再生率100%を達成しました。</p>
            <button type="button" className={styles.primary} onClick={() => setShowComplete(false)}>海上都市を発展させる</button>
            <Link href="/">ステージ選択へ戻る</Link>
          </section>
        </div>
      ) : null}
    </main>
  );
}
