"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ScrapPlanet.module.css";
import {
  SCRAP_WORLD,
  SHIP_POS,
  SOURCE_POS,
  advanceScrap,
  bottleneck,
  carryCapacity,
  createScrapState,
  deposit,
  isAutomated,
  machineCapacity,
  machineCycle,
  machineUnlocked,
  machines,
  moveSpeed,
  objective,
  payPurchase,
  pickup,
  purchaseRemaining,
  purchases,
  resources,
  saleValue,
  sellCarried,
  type MachineDef,
  type Purchase,
  type ResourceId,
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
const INTERACT_RADIUS = 46;

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

const inputPos = (machine: MachineDef): Vec => ({ x: machine.pos.x - 54, y: machine.pos.y + 34 });
const outputPos = (machine: MachineDef): Vec => ({ x: machine.pos.x + 54, y: machine.pos.y + 34 });

const sourceFor = (machine: MachineDef): Vec => {
  const index = machines.findIndex((item) => item.id === machine.id);
  return index === 0 ? SOURCE_POS : outputPos(machines[index - 1]);
};

const sample = (state: ScrapState) => ({
  credits: state.credits,
  carry: state.carry,
  capacity: carryCapacity(state),
  unlocked: state.unlocked,
  automated: state.automated.length,
  sold: state.totalSold,
  objective: objective(state),
  bottleneck: bottleneck(state),
});

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

const drawFloor = (
  ctx: CanvasRenderingContext2D,
  camera: Vec,
  width: number,
  height: number,
) => {
  ctx.fillStyle = "#111820";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = "#18232d";
  ctx.fillRect(0, 72, SCRAP_WORLD.w, SCRAP_WORLD.h - 72);
  ctx.strokeStyle = "rgba(148,163,184,0.1)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= SCRAP_WORLD.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 72);
    ctx.lineTo(x, SCRAP_WORLD.h);
    ctx.stroke();
  }
  for (let y = 72; y <= SCRAP_WORLD.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCRAP_WORLD.w, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(245,158,11,0.12)";
  ctx.fillRect(24, 405, SCRAP_WORLD.w - 48, 76);
  ctx.strokeStyle = "rgba(245,158,11,0.42)";
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(28, 443);
  ctx.lineTo(SCRAP_WORLD.w - 28, 443);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};

const drawConnection = (
  ctx: CanvasRenderingContext2D,
  from: Vec,
  to: Vec,
  active: boolean,
  time: number,
) => {
  ctx.strokeStyle = active ? "rgba(126,231,168,0.5)" : "rgba(148,163,184,0.17)";
  ctx.lineWidth = active ? 8 : 5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  const midX = (from.x + to.x) / 2;
  ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
  ctx.stroke();
  if (!active) return;
  const phase = (time * 0.00035) % 1;
  for (let i = 0; i < 4; i += 1) {
    const t = (phase + i / 4) % 1;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    ctx.fillStyle = "#b7f7ce";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawSource = (ctx: CanvasRenderingContext2D, state: ScrapState, time: number) => {
  const { x, y } = SOURCE_POS;
  ctx.fillStyle = "#27323c";
  roundRect(ctx, x - 58, y - 68, 116, 112, 15);
  ctx.fill();
  ctx.strokeStyle = "rgba(148,163,184,0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#394754";
  for (let i = 0; i < Math.min(12, Math.floor(state.resources.raw)); i += 1) {
    const px = x - 42 + (i % 4) * 27;
    const py = y + 20 - Math.floor(i / 4) * 18 + Math.sin(time * 0.003 + i) * 1.5;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((i % 3 - 1) * 0.18);
    ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = i % 2 ? "#64748b" : "#475569";
    ctx.fillRect(-6, -9, 12, 7);
    ctx.restore();
    ctx.fillStyle = "#394754";
  }
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("宇宙ゴミ置き場", x, y - 48);
  ctx.font = SMALL;
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`在庫 ${Math.floor(state.resources.raw)}`, x, y - 34);
  ctx.fillStyle = "rgba(126,231,168,0.18)";
  ctx.beginPath();
  ctx.arc(x, y + 62, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,231,168,0.72)";
  ctx.stroke();
  ctx.fillStyle = "#d9ffe7";
  ctx.font = `700 15px system-ui`;
  ctx.fillText("🗑️", x, y + 67);
};

const drawMachineArt = (
  ctx: CanvasRenderingContext2D,
  machine: MachineDef,
  running: boolean,
  time: number,
) => {
  const { x, y } = machine.pos;
  ctx.fillStyle = "#26333e";
  roundRect(ctx, x - 62, y - 68, 124, 116, 16);
  ctx.fill();
  ctx.strokeStyle = running ? "rgba(126,231,168,0.65)" : "rgba(148,163,184,0.36)";
  ctx.lineWidth = running ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = "#111820";
  roundRect(ctx, x - 43, y - 38, 86, 55, 9);
  ctx.fill();
  const pulse = 0.65 + Math.sin(time * 0.006 + x) * 0.25;
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
  ctx.fillText(machine.name, x, y - 50);
};

const drawMachine = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  machine: MachineDef,
  time: number,
) => {
  const unlocked = machineUnlocked(state, machine.id);
  if (!unlocked) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    drawMachineArt(ctx, machine, false, time);
    ctx.restore();
    ctx.fillStyle = "rgba(15,23,42,0.72)";
    roundRect(ctx, machine.pos.x - 60, machine.pos.y - 66, 120, 112, 15);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = `700 22px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("🔒", machine.pos.x, machine.pos.y - 4);
    return;
  }
  const running = state.inputs[machine.id] > 0;
  drawMachineArt(ctx, machine, running, time);
  const cycle = machineCycle(state, machine.id);
  const ratio = running ? clamp(state.progress[machine.id] / cycle, 0, 1) : 0;
  ctx.fillStyle = "rgba(15,23,42,0.8)";
  roundRect(ctx, machine.pos.x - 45, machine.pos.y + 27, 90, 7, 4);
  ctx.fill();
  ctx.fillStyle = running ? "#7ee7a8" : "#475569";
  roundRect(ctx, machine.pos.x - 45, machine.pos.y + 27, 90 * ratio, 7, 4);
  ctx.fill();
  const inPos = inputPos(machine);
  const outPos = outputPos(machine);
  ctx.fillStyle = "rgba(251,191,36,0.14)";
  ctx.beginPath();
  ctx.arc(inPos.x, inPos.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.65)";
  ctx.stroke();
  ctx.fillStyle = "rgba(126,231,168,0.14)";
  ctx.beginPath();
  ctx.arc(outPos.x, outPos.y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(126,231,168,0.65)";
  ctx.stroke();
  ctx.font = `700 13px system-ui`;
  ctx.textAlign = "center";
  ctx.fillStyle = resources[machine.input].color;
  ctx.fillText(resources[machine.input].icon, inPos.x, inPos.y + 4);
  ctx.fillStyle = resources[machine.output].color;
  ctx.fillText(resources[machine.output].icon, outPos.x, outPos.y + 4);
  ctx.font = SMALL;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("投入", inPos.x, inPos.y + 30);
  ctx.fillText("受取", outPos.x, outPos.y + 30);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${Math.floor(state.inputs[machine.id])}/${machineCapacity(state, machine.id)}`, inPos.x, inPos.y + 43);
  ctx.fillText(`${Math.floor(state.resources[machine.output])}`, outPos.x, outPos.y + 43);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`LV ${state.levels[machine.id] + 1}`, machine.pos.x, machine.pos.y + 47);
};

const drawShipping = (ctx: CanvasRenderingContext2D, state: ScrapState, time: number) => {
  const { x, y } = SHIP_POS;
  ctx.fillStyle = "#26333e";
  roundRect(ctx, x - 64, y - 70, 128, 118, 16);
  ctx.fill();
  ctx.strokeStyle = isAutomated(state, "ship") ? "rgba(126,231,168,0.7)" : "rgba(148,163,184,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  roundRect(ctx, x - 42, y - 35, 84, 52, 8);
  ctx.fill();
  ctx.fillStyle = "#7dd3fc";
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 4);
  ctx.lineTo(x + 30, y - 4);
  ctx.lineTo(x + 18, y + 12);
  ctx.lineTo(x - 18, y + 12);
  ctx.closePath();
  ctx.fill();
  const beam = 0.16 + Math.sin(time * 0.006) * 0.08;
  ctx.fillStyle = `rgba(125,211,252,${beam})`;
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 12);
  ctx.lineTo(x + 20, y + 12);
  ctx.lineTo(x + 42, y + 46);
  ctx.lineTo(x - 42, y + 46);
  ctx.closePath();
  ctx.fill();
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText("再生資源取引所", x, y - 50);
  ctx.font = SMALL;
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("加工品を運ぶとクレジットに交換", x, y + 62);
};

const drawPurchase = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  purchase: Purchase,
  player: Vec,
) => {
  const near = distance(player, purchase.pos) < 42;
  const remaining = purchaseRemaining(state, purchase);
  const paid = purchase.cost <= 0 ? 1 : 1 - remaining / purchase.cost;
  ctx.fillStyle = near ? "rgba(126,231,168,0.34)" : "rgba(58,166,99,0.2)";
  ctx.beginPath();
  ctx.arc(purchase.pos.x, purchase.pos.y, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = near ? "#b7f7ce" : "rgba(126,231,168,0.7)";
  ctx.lineWidth = near ? 3 : 2;
  ctx.stroke();
  if (paid > 0) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(purchase.pos.x, purchase.pos.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * paid);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.font = SMALL;
  ctx.fillStyle = "#e8fff0";
  ctx.fillText(purchase.label, purchase.pos.x, purchase.pos.y - 4);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`${Math.ceil(remaining).toLocaleString("ja-JP")} C`, purchase.pos.x, purchase.pos.y + 10);
};

const drawRobot = (
  ctx: CanvasRenderingContext2D,
  machine: MachineDef,
  time: number,
) => {
  const from = sourceFor(machine);
  const to = inputPos(machine);
  const t = (time * 0.00025 + machines.findIndex((item) => item.id === machine.id) * 0.17) % 1;
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;
  ctx.fillStyle = "#b7a6ff";
  roundRect(ctx, x - 8, y - 8, 16, 14, 5);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 4, y - 4, 3, 3);
  ctx.fillRect(x + 1, y - 4, 3, 3);
  ctx.strokeStyle = "#d8d1ff";
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y - 13);
  ctx.stroke();
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  skin: Skin,
  time: number,
) => {
  const { x, y } = state.player;
  const bob = Math.sin(time * 0.012) * 1.4;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.coat;
  roundRect(ctx, x - 10, y - 14 + bob, 20, 24, 8);
  ctx.fill();
  ctx.fillStyle = skin.head;
  ctx.beginPath();
  ctx.arc(x, y - 20 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  if (skin.hat === "helmet") {
    ctx.strokeStyle = "#dbeafe";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 20 + bob, 11, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (skin.hat !== "none") {
    ctx.fillStyle = skin.hatColor ?? "#334155";
    ctx.beginPath();
    ctx.ellipse(x, y - 28 + bob, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.carry.kind && state.carry.amount > 0) {
    const item = resources[state.carry.kind];
    for (let i = 0; i < Math.min(5, state.carry.amount); i += 1) {
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      roundRect(ctx, x - 10, y - 45 - i * 12 + bob, 20, 11, 4);
      ctx.fill();
      ctx.font = `700 10px system-ui`;
      ctx.textAlign = "center";
      ctx.fillStyle = item.color;
      ctx.fillText(item.icon, x, y - 36 - i * 12 + bob);
    }
  }
};

export default function ScrapPlanet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<ScrapState>(createScrapState());
  const skinRef = useRef<Skin | null>(null);
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<Joystick>(emptyJoystick());
  const interactionRef = useRef(0);
  const saveRef = useRef(0);
  const hudRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [hud, setHud] = useState<Hud>(() => sample(createScrapState()));
  const [help, setHelp] = useState(false);

  useEffect(() => {
    startCloud();
    const frame = window.requestAnimationFrame(() => {
      const loaded = loadScrap();
      stateRef.current = loaded;
      skinRef.current = equippedSkin();
      setHud(sample(loaded));
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const down = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || help) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    const camera = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const interact = (state: ScrapState): ScrapState => {
      let next = state;
      const player = next.player;
      // Sorter stall guard: do not pick up more raw scrap than the sorter can accept.
      const firstMachine = machines[0];
      const rawRoom = Math.max(
        0,
        machineCapacity(next, firstMachine.id) - next.inputs[firstMachine.id],
      );
      if (
        !next.carry.kind &&
        rawRoom > 0 &&
        distance(player, { x: SOURCE_POS.x, y: SOURCE_POS.y + 62 }) < 78
      ) {
        next = pickup(next, "raw", Math.min(carryCapacity(next), rawRoom));
      }
      for (const machine of machines) {
        if (!machineUnlocked(next, machine.id)) continue;
        const nearMachine = distance(player, machine.pos) < 88;
        const nearInput = distance(player, inputPos(machine)) < INTERACT_RADIUS;
        const nearOutput = distance(player, outputPos(machine)) < INTERACT_RADIUS;
        if (next.carry.kind === machine.input && (nearInput || nearMachine)) {
          next = deposit(next, machine.id, carryCapacity(next));
        }
        if (
          (!next.carry.kind || next.carry.kind === machine.output) &&
          next.resources[machine.output] > 0 &&
          (nearOutput || nearMachine)
        ) {
          next = pickup(next, machine.output, carryCapacity(next));
        }
      }
      // 取引所では売る。ただし、まだ加工できる素材（建てた機械が受け取れる物）は
      // 売らずに運ばせる。売れるのは行き止まりの完成品だけ（誤爆防止）
      const canProcess =
        !!next.carry.kind &&
        machines.some(
          (machine) =>
            machineUnlocked(next, machine.id) && machine.input === next.carry.kind,
        );
      if (
        !canProcess &&
        distance(player, { x: SHIP_POS.x, y: SHIP_POS.y + 40 }) < 60
      ) {
        next = sellCarried(next, carryCapacity(next));
      }
      return next;
    };

    const frame = (now: number) => {
      resize();
      const dt = Math.min(50, Math.max(0, now - last));
      last = now;
      let state = advanceScrap(stateRef.current, dt);
      let dx = joystickRef.current.dx;
      let dy = joystickRef.current.dy;
      const keys = keysRef.current;
      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;
      if (keys.has("arrowup") || keys.has("w")) dy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) dy += 1;
      const length = Math.hypot(dx, dy);
      if (length > 0.05) {
        const speed = moveSpeed(state);
        state = {
          ...state,
          player: {
            x: clamp(state.player.x + (dx / Math.max(1, length)) * speed * (dt / 1000), 24, SCRAP_WORLD.w - 24),
            y: clamp(state.player.y + (dy / Math.max(1, length)) * speed * (dt / 1000), 92, SCRAP_WORLD.h - 24),
          },
        };
      }
      interactionRef.current += dt;
      if (interactionRef.current >= 170) {
        interactionRef.current = 0;
        state = interact(state);
      }
      for (const purchase of purchases(state)) {
        if (distance(state.player, purchase.pos) < 40) state = payPurchase(state, purchase, dt);
      }
      stateRef.current = state;
      saveRef.current += dt;
      if (saveRef.current >= 5000) {
        saveRef.current = 0;
        saveScrap(state);
      }
      hudRef.current += dt;
      if (hudRef.current >= 120) {
        hudRef.current = 0;
        setHud(sample(state));
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const targetCamera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
        };
        const follow = Math.min(1, (dt / 1000) * 6);
        camera.x += (targetCamera.x - camera.x) * follow;
        camera.y += (targetCamera.y - camera.y) * follow;
        drawFloor(ctx, camera, width, height);
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        for (const machine of machines) {
          drawConnection(ctx, sourceFor(machine), inputPos(machine), isAutomated(state, machine.id), now);
        }
        drawSource(ctx, state, now);
        for (const machine of machines) drawMachine(ctx, state, machine, now);
        drawShipping(ctx, state, now);
        for (const purchase of purchases(state)) drawPurchase(ctx, state, purchase, state.player);
        for (const machine of machines) {
          if (isAutomated(state, machine.id) && machineUnlocked(state, machine.id)) drawRobot(ctx, machine, now);
        }
        drawPlayer(ctx, state, skinRef.current ?? equippedSkin(), now);
        ctx.restore();

        if (joystickRef.current.active) {
          const joy = joystickRef.current;
          ctx.fillStyle = "rgba(15,23,42,0.45)";
          ctx.beginPath();
          ctx.arc(joy.startX, joy.startY, 42, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(226,232,240,0.3)";
          ctx.stroke();
          ctx.fillStyle = "rgba(126,231,168,0.65)";
          ctx.beginPath();
          ctx.arc(joy.x, joy.y, 19, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);
    const persist = () => saveScrap(stateRef.current);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", persist);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", persist);
      persist();
    };
  }, [help, mounted]);

  const pointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.setPointerCapture(event.pointerId);
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
  }, []);

  const pointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const joy = joystickRef.current;
    if (!joy.active || joy.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const rawX = px - joy.startX;
    const rawY = py - joy.startY;
    const length = Math.hypot(rawX, rawY);
    const maxVisual = 42;
    const visualScale = length > maxVisual ? maxVisual / length : 1;
    const deadZone = 4;
    const strength = length <= deadZone ? 0 : Math.min(1, (length - deadZone) / 30);
    const nx = length > 0 ? rawX / length : 0;
    const ny = length > 0 ? rawY / length : 0;
    joystickRef.current = {
      ...joy,
      x: joy.startX + rawX * visualScale,
      y: joy.startY + rawY * visualScale,
      dx: nx * strength,
      dy: ny * strength,
    };
  }, []);

  const pointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (joystickRef.current.pointerId !== event.pointerId) return;
    joystickRef.current = emptyJoystick();
  }, []);

  const reset = useCallback(() => {
    if (!window.confirm("SCRAP PLANETの工場を最初から作り直しますか？")) return;
    const next = resetScrap();
    stateRef.current = next;
    setHud(sample(next));
  }, []);

  const carry = hud.carry.kind ? resources[hud.carry.kind as ResourceId] : null;

  return (
    <main className={styles.app}>
      <header className={styles.hud}>
        <div className={styles.wallet}>
          <span>🪙</span>
          <strong>{formatNumber(Math.floor(hud.credits))}</strong>
          <small>C</small>
        </div>
        <div className={styles.hudTitle}>
          <strong>SCRAP PLANET</strong>
          <small>{hud.bottleneck}</small>
        </div>
        <div className={styles.hudButtons}>
          <Link href="/" aria-label="シリーズ選択へ">☰</Link>
          <button type="button" onClick={() => setHelp(true)} aria-label="遊びかた">？</button>
        </div>
      </header>

      <section className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        />
        <p className={styles.objective}>{hud.objective}</p>
        {!mounted ? <div className={styles.loading}>工場を起動しています…</div> : null}
      </section>

      <footer className={styles.dock}>
        <div className={styles.carry}>
          <span>{carry?.icon ?? "📦"}</span>
          <strong>{hud.carry.amount}<small> / {hud.capacity}</small></strong>
          <small>{carry?.short ?? "手ぶら"}</small>
        </div>
        <div className={styles.progress}>
          <span>加工ライン {hud.unlocked}/{machines.length}</span>
          <span>自動化 {hud.automated}/{machines.length + 1}</span>
          <span>出荷 {hud.sold}体</span>
        </div>
      </footer>

      {help ? (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <section className={styles.sheet}>
            <div className={styles.sheetHead}>
              <h2>SCRAP PLANETの遊びかた</h2>
              <button type="button" onClick={() => setHelp(false)}>✕</button>
            </div>
            <ul>
              <li>画面をスワイプして作業員を動かします。PCは矢印キー／WASDです。</li>
              <li>宇宙ゴミを拾って機械へ投入し、完成した加工品を受け取ります。</li>
              <li>加工品を再生資源取引所へ運ぶとクレジットになります。高い工程ほど高値で売れます。</li>
              <li>緑の枠に立つとクレジットが吸い出され、次の設備建設・強化・作業ロボ雇用が進みます。</li>
              <li>作業ロボを買うと、その工程への運搬が自動化され、自分の往復がひとつ減ります。</li>
              <li>選別→破砕→洗浄→溶解→精錬→部品化→ロボット組立→出荷までつなげます。</li>
              <li>工場を閉じているあいだも、自動化済みの工程は最大8時間進みます。</li>
            </ul>
            <button type="button" className={styles.reset} onClick={reset}>SCRAP PLANETだけ最初から</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
