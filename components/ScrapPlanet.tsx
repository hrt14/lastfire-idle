"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ScrapPlanet.module.css";
import {
  HQ_POS,
  SCRAP_WORLD,
  SOURCE_POS,
  advanceScrap,
  bottleneck,
  carryCapacity,
  carryTotal,
  contract,
  currentDistrict,
  deliverContract,
  deposit,
  isAutomated,
  machineCapacity,
  machineCycle,
  machineUnlocked,
  machines,
  moveSpeed,
  objective,
  outputCapacity,
  payPurchase,
  pickup,
  purchaseRemaining,
  purchases,
  resources,
  restorationLabel,
  type Contract,
  type MachineDef,
  type OfflineReport,
  type Purchase,
  type ScrapState,
  type Vec,
} from "@/lib/scrap";
import { loadScrap, resetScrap, saveScrap } from "@/lib/scrapStore";
import { equippedSkin } from "@/lib/shopStore";
import type { Skin } from "@/data/skins";
import { formatNumber } from "@/lib/format";
import { startCloud } from "@/lib/cloud";

const FONT = `700 11px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
const SMALL = `700 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
const INTERACT_RADIUS = 43;
const ACTION_INTERVAL = 145;

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const inputPos = (machine: MachineDef): Vec => ({
  x: machine.pos.x - 54,
  y: machine.pos.y + 35,
});
const outputPos = (machine: MachineDef): Vec => ({
  x: machine.pos.x + 54,
  y: machine.pos.y + 35,
});
const sourcePickupPos = (): Vec => ({ x: SOURCE_POS.x, y: SOURCE_POS.y + 68 });

const sourceFor = (machine: MachineDef): Vec => {
  const index = machines.findIndex((item) => item.id === machine.id);
  return index === 0 ? sourcePickupPos() : outputPos(machines[index - 1]);
};

const sample = (state: ScrapState) => {
  const active = contract(state);
  return {
    credits: state.credits,
    carryTotal: carryTotal(state),
    carryKind: state.carry.kind,
    capacity: carryCapacity(state),
    unlocked: state.unlocked,
    automated: state.automated.length,
    restoration: state.restoration,
    restorationLabel: restorationLabel(state),
    district: currentDistrict(state),
    order: active,
    orderDelivered: state.orderDelivered,
    objective: objective(state),
    bottleneck: bottleneck(state),
    completed: state.restoration >= 100,
  };
};

type Hud = ReturnType<typeof sample>;

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

const districtDefs = [
  { name: "1 漂着ゴミ処理場", rect: { x: 18, y: 72, w: 566, h: 342 }, min: 1 },
  { name: "2 素材再生区画", rect: { x: 596, y: 72, w: 566, h: 342 }, min: 3 },
  { name: "3 精密加工区画", rect: { x: 596, y: 426, w: 566, h: 374 }, min: 5 },
  { name: "4 ロボット復旧基地", rect: { x: 18, y: 426, w: 566, h: 374 }, min: 7 },
];

const drawDistricts = (ctx: CanvasRenderingContext2D, state: ScrapState) => {
  ctx.fillStyle = "#0f171f";
  ctx.fillRect(0, 0, SCRAP_WORLD.w, SCRAP_WORLD.h);
  ctx.fillStyle = "#111b24";
  ctx.fillRect(0, 60, SCRAP_WORLD.w, SCRAP_WORLD.h - 60);

  for (const [index, district] of districtDefs.entries()) {
    const open = state.unlocked >= district.min;
    const { x, y, w, h } = district.rect;
    ctx.fillStyle = open
      ? index % 2 === 0
        ? "#1b2933"
        : "#192630"
      : "#111820";
    roundRect(ctx, x, y, w, h, 22);
    ctx.fill();
    ctx.strokeStyle = open
      ? "rgba(126,231,168,0.16)"
      : "rgba(148,163,184,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.fillStyle = open ? "rgba(226,232,240,0.58)" : "rgba(148,163,184,0.24)";
    ctx.fillText(open ? district.name : `🔒 ${district.name}`, x + 18, y + 26);

    if (!open) {
      ctx.fillStyle = "rgba(4,8,12,0.38)";
      roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 20);
      ctx.fill();
    }
  }

  ctx.strokeStyle = "rgba(245,158,11,0.2)";
  ctx.lineWidth = 54;
  ctx.beginPath();
  ctx.moveTo(42, 410);
  ctx.lineTo(SCRAP_WORLD.w - 42, 410);
  ctx.stroke();
  ctx.strokeStyle = "rgba(245,158,11,0.42)";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(34, 410);
  ctx.lineTo(SCRAP_WORLD.w - 34, 410);
  ctx.stroke();
  ctx.setLineDash([]);

  const green = state.restoration / 100;
  ctx.fillStyle = `rgba(77, 190, 116, ${0.04 + green * 0.16})`;
  ctx.beginPath();
  ctx.arc(1080, 730, 52 + green * 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(126,231,168,0.4)";
  ctx.font = `700 44px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(state.restoration >= 100 ? "🌍" : "🪐", 1080, 745);
};

const drawConnection = (
  ctx: CanvasRenderingContext2D,
  from: Vec,
  to: Vec,
  automated: boolean,
  time: number,
) => {
  ctx.strokeStyle = automated ? "rgba(126,231,168,0.48)" : "rgba(148,163,184,0.13)";
  ctx.lineWidth = automated ? 7 : 4;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  const midX = (from.x + to.x) / 2;
  ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
  ctx.stroke();
  if (!automated) return;

  const phase = (time * 0.00042) % 1;
  for (let i = 0; i < 3; i += 1) {
    const t = (phase + i / 3) % 1;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    ctx.fillStyle = "#b7f7ce";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#26333e";
    ctx.font = `700 8px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("R", x, y + 3);
  }
};

const drawSource = (ctx: CanvasRenderingContext2D, state: ScrapState, time: number) => {
  const { x, y } = SOURCE_POS;
  ctx.fillStyle = "#293640";
  roundRect(ctx, x - 60, y - 66, 120, 112, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(148,163,184,0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < Math.min(12, Math.floor(state.resources.raw)); i += 1) {
    const px = x - 40 + (i % 4) * 26;
    const py = y + 20 - Math.floor(i / 4) * 18 + Math.sin(time * 0.003 + i) * 1.8;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((i % 3 - 1) * 0.18);
    ctx.fillStyle = i % 2 ? "#64748b" : "#475569";
    ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = "#8895a3";
    ctx.fillRect(-5, -9, 10, 5);
    ctx.restore();
  }

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("漂着ゴミ山", x, y - 46);
  ctx.font = SMALL;
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`在庫 ${Math.floor(state.resources.raw)}`, x, y - 31);

  const pickup = sourcePickupPos();
  ctx.fillStyle = "rgba(126,231,168,0.15)";
  ctx.beginPath();
  ctx.arc(pickup.x, pickup.y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,231,168,0.75)";
  ctx.stroke();
  ctx.font = `700 16px system-ui`;
  ctx.fillStyle = "#e6fff0";
  ctx.fillText("🗑️", pickup.x, pickup.y + 6);
};

const drawMachineArt = (
  ctx: CanvasRenderingContext2D,
  machine: MachineDef,
  running: boolean,
  time: number,
) => {
  const { x, y } = machine.pos;
  ctx.fillStyle = "#283741";
  roundRect(ctx, x - 64, y - 68, 128, 116, 16);
  ctx.fill();
  ctx.strokeStyle = running ? "rgba(126,231,168,0.72)" : "rgba(148,163,184,0.34)";
  ctx.lineWidth = running ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = "#101820";
  roundRect(ctx, x - 43, y - 38, 86, 55, 10);
  ctx.fill();

  const pulse = 0.6 + Math.sin(time * 0.006 + x) * 0.25;
  if (machine.art === "furnace" || machine.art === "refinery") {
    ctx.fillStyle = running ? `rgba(251,146,60,${pulse})` : "rgba(251,146,60,0.18)";
    ctx.beginPath();
    ctx.arc(x, y - 10, 20, 0, Math.PI * 2);
    ctx.fill();
  } else if (machine.art === "washer") {
    ctx.strokeStyle = running ? "#67e8f9" : "#365865";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y - 10, 19, time * 0.004, time * 0.004 + Math.PI * 1.45);
    ctx.stroke();
  } else if (machine.art === "crusher") {
    ctx.fillStyle = running ? "#fbbf24" : "#6b7280";
    const squeeze = running ? Math.sin(time * 0.01) * 8 : 0;
    ctx.fillRect(x - 30 + squeeze, y - 22, 18, 30);
    ctx.fillRect(x + 12 - squeeze, y - 22, 18, 30);
  } else if (machine.art === "press") {
    ctx.fillStyle = running ? "#fde68a" : "#737373";
    ctx.fillRect(x - 24, y - 30, 48, 10);
    ctx.fillRect(x - 10, y - 20, 20, 30 + (running ? Math.sin(time * 0.012) * 7 : 0));
  } else if (machine.art === "assembly") {
    ctx.fillStyle = running ? "#c4b5fd" : "#6d6680";
    ctx.beginPath();
    ctx.arc(x, y - 10, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111820";
    ctx.fillRect(x - 10, y - 14, 7, 5);
    ctx.fillRect(x + 3, y - 14, 7, 5);
  } else {
    ctx.fillStyle = running ? "#7dd3fc" : "#536875";
    ctx.save();
    ctx.translate(x, y - 10);
    ctx.rotate(running ? time * 0.004 : 0);
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(13, -3, 10, 6);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(machine.name, x, y - 49);
};

const drawMachine = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  machine: MachineDef,
  index: number,
  time: number,
) => {
  const unlocked = machineUnlocked(state, machine.id);
  if (!unlocked && index > state.unlocked) return;
  if (!unlocked) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    drawMachineArt(ctx, machine, false, time);
    ctx.restore();
    ctx.fillStyle = "rgba(7,12,18,0.78)";
    roundRect(ctx, machine.pos.x - 62, machine.pos.y - 66, 124, 112, 15);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = `700 24px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("🔒", machine.pos.x, machine.pos.y - 2);
    ctx.font = SMALL;
    ctx.fillText("次の建設設備", machine.pos.x, machine.pos.y + 19);
    return;
  }

  const running = state.inputs[machine.id] > 0;
  drawMachineArt(ctx, machine, running, time);
  const ratio = running
    ? clamp(state.progress[machine.id] / machineCycle(state, machine.id), 0, 1)
    : 0;
  ctx.fillStyle = "rgba(15,23,42,0.82)";
  roundRect(ctx, machine.pos.x - 45, machine.pos.y + 27, 90, 7, 4);
  ctx.fill();
  ctx.fillStyle = running ? "#7ee7a8" : "#475569";
  roundRect(ctx, machine.pos.x - 45, machine.pos.y + 27, 90 * ratio, 7, 4);
  ctx.fill();

  const input = inputPos(machine);
  const output = outputPos(machine);
  ctx.fillStyle = "rgba(251,191,36,0.15)";
  ctx.beginPath();
  ctx.arc(input.x, input.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.68)";
  ctx.stroke();
  ctx.fillStyle = "rgba(126,231,168,0.15)";
  ctx.beginPath();
  ctx.arc(output.x, output.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,231,168,0.68)";
  ctx.stroke();

  ctx.font = `700 14px system-ui`;
  ctx.textAlign = "center";
  ctx.fillStyle = resources[machine.input].color;
  ctx.fillText(resources[machine.input].icon, input.x, input.y + 5);
  ctx.fillStyle = resources[machine.output].color;
  ctx.fillText(resources[machine.output].icon, output.x, output.y + 5);
  ctx.font = SMALL;
  ctx.fillStyle = "#d6dee8";
  ctx.fillText("投入", input.x, input.y + 31);
  ctx.fillText("受取", output.x, output.y + 31);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(
    `${Math.floor(state.inputs[machine.id])}/${machineCapacity(state, machine.id)}`,
    input.x,
    input.y + 43,
  );
  ctx.fillText(
    `${Math.floor(state.resources[machine.output])}/${outputCapacity(state, machine.id)}`,
    output.x,
    output.y + 43,
  );
  ctx.fillText(`LV ${state.levels[machine.id] + 1}`, machine.pos.x, machine.pos.y + 48);

  if (isAutomated(state, machine.id)) {
    ctx.fillStyle = "rgba(126,231,168,0.18)";
    roundRect(ctx, machine.pos.x - 42, machine.pos.y - 88, 84, 19, 10);
    ctx.fill();
    ctx.fillStyle = "#b7f7ce";
    ctx.font = SMALL;
    ctx.fillText("🤖 自動投入", machine.pos.x, machine.pos.y - 75);
  }
};

const drawHQ = (ctx: CanvasRenderingContext2D, state: ScrapState) => {
  const active = contract(state);
  const { x, y } = HQ_POS;
  ctx.fillStyle = state.restoration >= 100 ? "#214832" : "#24313d";
  roundRect(ctx, x - 82, y - 65, 164, 112, 18);
  ctx.fill();
  ctx.strokeStyle = state.restoration >= 100
    ? "rgba(126,231,168,0.8)"
    : "rgba(196,181,253,0.52)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f0ff";
  ctx.fillText("惑星復旧本部", x, y - 43);
  ctx.font = SMALL;
  ctx.fillStyle = "#c4b5fd";
  ctx.fillText(active.name, x, y - 26);
  ctx.fillStyle = resources[active.resource].color;
  ctx.font = `700 17px system-ui`;
  ctx.fillText(resources[active.resource].icon, x, y - 4);
  ctx.font = FONT;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`${state.orderDelivered}/${active.amount}`, x, y + 17);
  ctx.font = SMALL;
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`報酬 ${active.reward.toLocaleString("ja-JP")} C`, x, y + 34);

  ctx.fillStyle = "rgba(196,181,253,0.17)";
  ctx.beginPath();
  ctx.arc(x, y + 69, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(196,181,253,0.78)";
  ctx.stroke();
  ctx.font = `700 17px system-ui`;
  ctx.fillStyle = "#f4f0ff";
  ctx.fillText("📦", x, y + 75);
};

const drawPurchase = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  purchase: Purchase,
  time: number,
) => {
  const remaining = purchaseRemaining(state, purchase);
  const paid = purchase.cost - remaining;
  const ratio = purchase.cost > 0 ? clamp(paid / purchase.cost, 0, 1) : 1;
  const pulse = 0.62 + Math.sin(time * 0.006 + purchase.pos.x) * 0.15;
  ctx.fillStyle = `rgba(34,197,94,${0.12 + pulse * 0.08})`;
  roundRect(ctx, purchase.pos.x - 53, purchase.pos.y - 25, 106, 57, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,231,168,0.66)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(8,13,19,0.72)";
  roundRect(ctx, purchase.pos.x - 45, purchase.pos.y + 21, 90, 5, 3);
  ctx.fill();
  ctx.fillStyle = "#7ee7a8";
  roundRect(ctx, purchase.pos.x - 45, purchase.pos.y + 21, 90 * ratio, 5, 3);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.font = SMALL;
  ctx.fillStyle = "#e7fff0";
  ctx.fillText(purchase.label, purchase.pos.x, purchase.pos.y - 7);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(
    remaining > 0 ? `${Math.ceil(remaining).toLocaleString("ja-JP")} C` : "完成",
    purchase.pos.x,
    purchase.pos.y + 10,
  );
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  skin: Skin,
  time: number,
) => {
  const { x, y } = state.player;
  const bob = Math.sin(time * 0.01) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 17, 19, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skin.coat;
  roundRect(ctx, x - 13, y - 7 + bob, 26, 29, 9);
  ctx.fill();
  ctx.fillStyle = skin.head;
  ctx.beginPath();
  ctx.arc(x, y - 15 + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  if (skin.hat !== "none") {
    ctx.fillStyle = skin.hatColor ?? skin.coat;
    roundRect(ctx, x - 13, y - 29 + bob, 26, 8, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#111820";
  ctx.beginPath();
  ctx.arc(x - 4, y - 16 + bob, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 16 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (state.carry.kind && state.carry.amount > 0) {
    const icon = resources[state.carry.kind].icon;
    const visible = Math.min(5, state.carry.amount);
    ctx.font = `700 15px system-ui`;
    ctx.textAlign = "center";
    for (let i = 0; i < visible; i += 1) {
      ctx.fillText(icon, x, y - 38 - i * 12 + bob);
    }
    if (state.carry.amount > visible) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = SMALL;
      ctx.fillText(`+${state.carry.amount - visible}`, x + 18, y - 40 - (visible - 1) * 12 + bob);
    }
  }
};

const targetFor = (state: ScrapState): Vec | null => {
  if (state.restoration >= 100) return null;
  if (state.tutorialStep === 0) return sourcePickupPos();
  if (state.tutorialStep === 1) return inputPos(machines[0]);
  if (state.tutorialStep === 2) return outputPos(machines[0]);
  if (state.tutorialStep === 3) return { x: HQ_POS.x, y: HQ_POS.y + 69 };
  if (state.tutorialStep === 4) {
    return purchases(state).find((item) => item.kind === "unlock")?.pos ?? null;
  }
  if (state.tutorialStep === 5) {
    return purchases(state).find((item) => item.kind === "auto")?.pos ?? null;
  }

  const active = contract(state);
  if (state.carry.kind) {
    if (state.carry.kind === active.resource) return { x: HQ_POS.x, y: HQ_POS.y + 69 };
    const machine = machines.find(
      (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,
    );
    return machine ? inputPos(machine) : null;
  }

  const ready = [...machines]
    .slice(0, state.unlocked)
    .reverse()
    .find((machine) => state.resources[machine.output] > 0);
  if (ready) return outputPos(ready);

  const affordable = purchases(state).find((item) => state.credits >= purchaseRemaining(state, item));
  if (affordable) return affordable.pos;
  return sourcePickupPos();
};

const drawTarget = (ctx: CanvasRenderingContext2D, target: Vec | null, time: number) => {
  if (!target) return;
  const pulse = 28 + Math.sin(time * 0.008) * 5;
  ctx.strokeStyle = "rgba(255,209,102,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.font = `700 18px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("▼", target.x, target.y - pulse - 7);
};

const formatOfflineTime = (ms: number) => {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}時間${rest}分` : `${hours}時間`;
};

export default function ScrapPlanet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<ScrapState | null>(null);
  const skinRef = useRef<Skin | null>(null);
  const joystickRef = useRef<Joystick>(emptyJoystick());
  const keysRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const actionAtRef = useRef(0);
  const saveAtRef = useRef(0);
  const sampleAtRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);
  const viewportRef = useRef({ width: 1, height: 1, dpr: 1 });

  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState<OfflineReport | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    pausedRef.current = help || offline !== null;
  }, [help, offline]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  const announceTransition = useCallback(
    (before: ScrapState, after: ScrapState) => {
      if (after.contractsCompleted > before.contractsCompleted) {
        const active = contract(before);
        showToast(`復旧依頼達成　+${active.reward.toLocaleString("ja-JP")} C`);
        return;
      }
      if (after.unlocked > before.unlocked) {
        const built = machines[after.unlocked - 1];
        showToast(`${built.name} 建設完了`);
        return;
      }
      if (after.automated.length > before.automated.length) {
        const added = after.automated.find((id) => !before.automated.includes(id));
        showToast(added === "ship" ? "復旧ロボの自動派遣を開始" : "作業ロボが稼働しました");
        return;
      }
      if (before.restoration < 100 && after.restoration >= 100) {
        showToast("惑星再生率100%　復旧完了！");
      }
    },
    [showToast],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm("スクラッププラネットを最初から再建しますか？")) return;
    const next = resetScrap();
    stateRef.current = next;
    setHud(sample(next));
    setOffline(null);
    showToast("復旧計画を最初から開始しました");
  }, [showToast]);

  useEffect(() => {
    startCloud();
    const loaded = loadScrap();
    const report = loaded.offlineReport;
    loaded.offlineReport = undefined;
    stateRef.current = loaded;
    skinRef.current = equippedSkin();
    setHud(sample(loaded));
    setOffline(report ?? null);
    setReady(true);

    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
        event.preventDefault();
        keysRef.current.add(event.key.toLowerCase());
      }
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      if (stateRef.current) saveScrap(stateRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      viewportRef.current = { width, height, dpr };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let previous = performance.now();

    const interact = (state: ScrapState, dt: number, now: number) => {
      let next = state;
      for (const purchase of purchases(next)) {
        if (distance(next.player, purchase.pos) <= INTERACT_RADIUS) {
          next = payPurchase(next, purchase, dt);
          break;
        }
      }

      if (now - actionAtRef.current < ACTION_INTERVAL) return next;
      let acted = false;
      if (distance(next.player, sourcePickupPos()) <= INTERACT_RADIUS) {
        const changed = pickup(next, "raw", 1);
        acted = changed !== next;
        next = changed;
      } else if (distance(next.player, { x: HQ_POS.x, y: HQ_POS.y + 69 }) <= INTERACT_RADIUS) {
        const changed = deliverContract(next, 1);
        acted = changed !== next;
        next = changed;
      } else {
        for (const machine of machines.slice(0, next.unlocked)) {
          if (distance(next.player, inputPos(machine)) <= INTERACT_RADIUS) {
            const changed = deposit(next, machine.id, 1);
            acted = changed !== next;
            next = changed;
            break;
          }
          if (distance(next.player, outputPos(machine)) <= INTERACT_RADIUS) {
            const changed = pickup(next, machine.output, 1);
            acted = changed !== next;
            next = changed;
            break;
          }
        }
      }
      if (acted) actionAtRef.current = now;
      return next;
    };

    const draw = (state: ScrapState, time: number) => {
      const { width, height, dpr } = viewportRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const camera = {
        x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
        y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
      };

      ctx.save();
      ctx.translate(-camera.x, -camera.y);
      drawDistricts(ctx, state);
      for (const [index, machine] of machines.entries()) {
        if (index > state.unlocked) continue;
        drawConnection(ctx, sourceFor(machine), inputPos(machine), isAutomated(state, machine.id), time);
      }
      drawSource(ctx, state, time);
      drawHQ(ctx, state);
      machines.forEach((machine, index) => drawMachine(ctx, state, machine, index, time));
      purchases(state).forEach((purchase) => drawPurchase(ctx, state, purchase, time));
      drawTarget(ctx, targetFor(state), time);
      drawPlayer(ctx, state, skinRef.current ?? equippedSkin(), time);
      ctx.restore();

      const joystick = joystickRef.current;
      if (joystick.active) {
        const rect = canvas.getBoundingClientRect();
        const startX = joystick.startX - rect.left;
        const startY = joystick.startY - rect.top;
        const knobX = joystick.x - rect.left;
        const knobY = joystick.y - rect.top;
        ctx.fillStyle = "rgba(15,23,42,0.5)";
        ctx.beginPath();
        ctx.arc(startX, startY, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(226,232,240,0.3)";
        ctx.stroke();
        ctx.fillStyle = "rgba(126,231,168,0.55)";
        ctx.beginPath();
        ctx.arc(knobX, knobY, 21, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(50, Math.max(0, now - previous));
      previous = now;
      let state = stateRef.current;
      if (!state) {
        raf = requestAnimationFrame(frame);
        return;
      }

      if (!pausedRef.current) {
        const before = state;
        state = advanceScrap(state, dt);

        let dx = 0;
        let dy = 0;
        const keys = keysRef.current;
        if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
        if (keys.has("arrowright") || keys.has("d")) dx += 1;
        if (keys.has("arrowup") || keys.has("w")) dy -= 1;
        if (keys.has("arrowdown") || keys.has("s")) dy += 1;
        const joystick = joystickRef.current;
        if (joystick.active) {
          dx += joystick.dx;
          dy += joystick.dy;
        }
        const length = Math.hypot(dx, dy);
        if (length > 0.05) {
          const speed = moveSpeed(state) * (dt / 1000);
          state = {
            ...state,
            player: {
              x: clamp(state.player.x + (dx / Math.max(1, length)) * speed, 28, SCRAP_WORLD.w - 28),
              y: clamp(state.player.y + (dy / Math.max(1, length)) * speed, 74, SCRAP_WORLD.h - 28),
            },
          };
        }
        state = interact(state, dt, now);
        announceTransition(before, state);
        stateRef.current = state;
      }

      draw(state, now);
      if (now - sampleAtRef.current >= 160) {
        sampleAtRef.current = now;
        setHud(sample(state));
      }
      if (now - saveAtRef.current >= 1800) {
        saveAtRef.current = now;
        saveScrap(state);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [announceTransition, ready]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    joystickRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      dy: 0,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const joystick = joystickRef.current;
    if (!joystick.active || joystick.pointerId !== event.pointerId) return;
    const rawX = event.clientX - joystick.startX;
    const rawY = event.clientY - joystick.startY;
    const length = Math.hypot(rawX, rawY);
    const max = 50;
    const scale = length > max ? max / length : 1;
    joystickRef.current = {
      ...joystick,
      x: joystick.startX + rawX * scale,
      y: joystick.startY + rawY * scale,
      dx: (rawX * scale) / max,
      dy: (rawY * scale) / max,
    };
  };

  const releasePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (joystickRef.current.pointerId !== event.pointerId) return;
    joystickRef.current = emptyJoystick();
  };

  const activeOrder: Contract | null = hud?.order ?? null;
  const carryIcon = hud?.carryKind ? resources[hud.carryKind].icon : "📦";

  return (
    <main className={styles.app}>
      <header className={styles.hud}>
        <div className={styles.wallet}>
          <span>◈</span>
          <strong>{hud ? formatNumber(hud.credits) : "0"}</strong>
          <small>C</small>
        </div>
        <div className={styles.hudTitle}>
          <strong>SCRAP PLANET</strong>
          <small>{hud?.district.name ?? "漂着ゴミ処理場"}</small>
        </div>
        <div className={styles.hudButtons}>
          <Link href="/" aria-label="ステージ選択へ">☰</Link>
          <button type="button" onClick={() => setHelp(true)} aria-label="遊びかた">？</button>
        </div>
      </header>

      <section className={styles.restorePanel} aria-label="惑星再生率">
        <div>
          <span>惑星再生率</span>
          <strong>{Math.floor(hud?.restoration ?? 0)}%</strong>
          <small>{hud?.restorationLabel ?? "緊急復旧中"}</small>
        </div>
        <div className={styles.restoreTrack}>
          <span style={{ width: `${clamp(hud?.restoration ?? 0, 0, 100)}%` }} />
        </div>
      </section>

      <section className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releasePointer}
          onPointerCancel={releasePointer}
          onContextMenu={(event: React.MouseEvent<HTMLCanvasElement>) => event.preventDefault()}
        />
        <p className={styles.objective}>{hud?.objective ?? "工場を読み込み中…"}</p>
        {!ready ? <div className={styles.loading}>復旧計画を読み込み中…</div> : null}
        {toast ? <div className={styles.toast}>{toast}</div> : null}
        {hud?.completed ? (
          <div className={styles.complete}>🌍 惑星再生完了</div>
        ) : null}
      </section>

      <footer className={styles.dock}>
        <div className={styles.carry}>
          <span>{carryIcon}</span>
          <strong>
            {hud?.carryTotal ?? 0}<small> / {hud?.capacity ?? 3}</small>
          </strong>
          <small>{hud?.carryKind ? resources[hud.carryKind].short : "手持ち"}</small>
        </div>
        <div className={styles.order}>
          <div>
            <span>{activeOrder ? resources[activeOrder.resource].icon : "📋"}</span>
            <strong>{activeOrder?.name ?? "復旧依頼"}</strong>
            <small>{hud?.orderDelivered ?? 0}/{activeOrder?.amount ?? 0}</small>
          </div>
          <div className={styles.orderTrack}>
            <span
              style={{
                width: `${activeOrder ? clamp(((hud?.orderDelivered ?? 0) / activeOrder.amount) * 100, 0, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </footer>

      {offline ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="工場レポート">
          <section className={styles.sheet}>
            <div className={styles.sheetHead}>
              <div>
                <small>自動工場レポート</small>
                <h2>{formatOfflineTime(offline.elapsedMs)} 稼働しました</h2>
              </div>
              <button type="button" onClick={() => setOffline(null)}>✕</button>
            </div>
            <div className={styles.reportGrid}>
              <div><span>生産</span><strong>{offline.produced.toLocaleString("ja-JP")}</strong><small>個</small></div>
              <div><span>派遣</span><strong>{offline.delivered.toLocaleString("ja-JP")}</strong><small>個</small></div>
              <div><span>報酬</span><strong>{formatNumber(offline.credits)}</strong><small>C</small></div>
              <div><span>再生</span><strong>+{Math.floor(offline.restoration)}</strong><small>%</small></div>
            </div>
            <p className={styles.reportNote}>{offline.bottleneck}</p>
            <button type="button" className={styles.primary} onClick={() => setOffline(null)}>
              工場へ戻る
            </button>
          </section>
        </div>
      ) : null}

      {help ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="遊びかた">
          <section className={styles.sheet}>
            <div className={styles.sheetHead}>
              <div>
                <small>SCRAP PLANET</small>
                <h2>遊びかた</h2>
              </div>
              <button type="button" onClick={() => setHelp(false)}>✕</button>
            </div>
            <ul>
              <li>画面をスワイプして作業員を移動します。PCは矢印キーかWASDです。</li>
              <li>素材の近くへ行くと自動で拾い、黄色い投入口で自動投入します。</li>
              <li>緑の受取口で完成品を拾い、惑星復旧本部へ納品します。</li>
              <li>復旧依頼を達成するとクレジットと惑星再生率が上がります。</li>
              <li>緑の建設枠へ立つと設備や作業ロボを購入できます。</li>
              <li>設備強化は処理速度と保管量を改善します。素材は全工程で1個から1個作られます。</li>
            </ul>
            <p className={styles.reportNote}>{hud?.bottleneck}</p>
            <button type="button" className={styles.reset} onClick={handleReset}>
              復旧計画をリセット
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
