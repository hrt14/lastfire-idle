"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ScrapPlanet.module.css";
import {
  HQ_POS,
  SCRAP_VIEW_WIDTH,
  SOURCE_POS,
  advanceScrap,
  bottleneck,
  carryCapacity,
  carryTotal,
  contract,
  currentDistrict,
  deliverContract,
  deposit,
  guidance,
  hqDropPos,
  isAutomated,
  machineCapacity,
  machineCycle,
  machineInputPos,
  machineOutputPos,
  machines,
  moveSpeed,
  outputCapacity,
  payPurchase,
  pickup,
  purchaseRemaining,
  purchases,
  resources,
  restorationLabel,
  sourcePickupPos,
  worldBounds,
  type Contract,
  type Guidance,
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
const INTERACT_RADIUS = 48;
const PURCHASE_RADIUS = 27;

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

const samePoint = (a: Vec | null, b: Vec) =>
  !!a && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

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
    objective: guidance(state),
    bottleneck: bottleneck(state),
    completed: state.restoration >= 100,
    totalDelivered: state.totalDelivered,
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
  { name: "1 漂着ゴミ処理場", rect: { x: 0, y: 0, w: 360, h: 480 }, min: 1 },
  { name: "2 破砕・洗浄区", rect: { x: 0, y: 480, w: 360, h: 480 }, min: 3 },
  { name: "3 溶解・精錬区", rect: { x: 360, y: 0, w: 360, h: 480 }, min: 4 },
  { name: "4 ロボット復旧基地", rect: { x: 360, y: 480, w: 360, h: 480 }, min: 6 },
];

const drawDistricts = (ctx: CanvasRenderingContext2D, state: ScrapState) => {
  const bounds = worldBounds(state.unlocked);
  ctx.fillStyle = "#0f171f";
  ctx.fillRect(bounds.x0, bounds.y0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);

  for (const [index, district] of districtDefs.entries()) {
    if (state.unlocked < district.min) continue;
    const { x, y, w, h } = district.rect;
    ctx.fillStyle = index % 2 === 0 ? "#1b2933" : "#192630";
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(126,231,168,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(226,232,240,0.58)";
    ctx.fillText(district.name, x + 22, y + 34);
  }
};

const drawConnection = (
  ctx: CanvasRenderingContext2D,
  from: Vec,
  to: Vec,
  automated: boolean,
  time: number,
) => {
  ctx.strokeStyle = automated ? "rgba(126,231,168,0.48)" : "rgba(148,163,184,0.12)";
  ctx.lineWidth = automated ? 6 : 3;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  const midX = (from.x + to.x) / 2;
  ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);
  ctx.stroke();
  if (!automated) return;
  const phase = (time * 0.00048) % 1;
  for (let i = 0; i < 3; i += 1) {
    const t = (phase + i / 3) % 1;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    ctx.fillStyle = "#b7f7ce";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawInteractionRing = (
  ctx: CanvasRenderingContext2D,
  at: Vec,
  active: boolean,
  icon: string,
  label: string,
  time: number,
) => {
  const radius = active ? 27 + Math.sin(time * 0.008) * 4 : 24;
  ctx.fillStyle = active ? "rgba(255,209,102,0.18)" : "rgba(126,231,168,0.09)";
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255,209,102,0.96)" : "rgba(126,231,168,0.42)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = active ? "#ffe4a4" : "#d7f8e3";
  ctx.font = `700 15px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(icon, at.x, at.y + 5);
  ctx.font = SMALL;
  ctx.fillText(label, at.x, at.y + 39);
};

const drawSource = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  target: Vec | null,
  time: number,
) => {
  const { x, y } = SOURCE_POS;
  ctx.fillStyle = "#293640";
  roundRect(ctx, x - 54, y - 58, 108, 102, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(148,163,184,0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < Math.min(12, Math.floor(state.resources.raw)); i += 1) {
    const px = x - 36 + (i % 4) * 24;
    const py = y + 18 - Math.floor(i / 4) * 17 + Math.sin(time * 0.003 + i) * 1.4;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((i % 3 - 1) * 0.18);
    ctx.fillStyle = i % 2 ? "#64748b" : "#475569";
    ctx.fillRect(-7, -5, 14, 10);
    ctx.fillStyle = "#8895a3";
    ctx.fillRect(-4, -8, 8, 4);
    ctx.restore();
  }

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("漂着ゴミ山", x, y - 39);
  ctx.font = SMALL;
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`在庫 ${Math.floor(state.resources.raw)}`, x, y - 25);
  const pickupAt = sourcePickupPos();
  drawInteractionRing(ctx, pickupAt, samePoint(target, pickupAt), "🗑️", "拾う", time);
};

const drawMachineArt = (
  ctx: CanvasRenderingContext2D,
  machine: MachineDef,
  running: boolean,
  time: number,
) => {
  const { x, y } = machine.pos;
  ctx.fillStyle = "#283741";
  roundRect(ctx, x - 58, y - 58, 116, 102, 15);
  ctx.fill();
  ctx.strokeStyle = running ? "rgba(126,231,168,0.72)" : "rgba(148,163,184,0.34)";
  ctx.lineWidth = running ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = "#101820";
  roundRect(ctx, x - 38, y - 32, 76, 48, 9);
  ctx.fill();

  const pulse = 0.6 + Math.sin(time * 0.006 + x) * 0.25;
  if (machine.art === "furnace" || machine.art === "refinery") {
    ctx.fillStyle = running ? `rgba(251,146,60,${pulse})` : "rgba(251,146,60,0.18)";
    ctx.beginPath();
    ctx.arc(x, y - 8, 18, 0, Math.PI * 2);
    ctx.fill();
  } else if (machine.art === "washer") {
    ctx.strokeStyle = running ? "#67e8f9" : "#365865";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y - 8, 17, time * 0.004, time * 0.004 + Math.PI * 1.45);
    ctx.stroke();
  } else if (machine.art === "crusher") {
    ctx.fillStyle = running ? "#fbbf24" : "#6b7280";
    const squeeze = running ? Math.sin(time * 0.01) * 7 : 0;
    ctx.fillRect(x - 27 + squeeze, y - 20, 16, 27);
    ctx.fillRect(x + 11 - squeeze, y - 20, 16, 27);
  } else if (machine.art === "press") {
    ctx.fillStyle = running ? "#fde68a" : "#737373";
    ctx.fillRect(x - 22, y - 27, 44, 9);
    ctx.fillRect(x - 9, y - 18, 18, 27 + (running ? Math.sin(time * 0.012) * 6 : 0));
  } else if (machine.art === "assembly") {
    ctx.fillStyle = running ? "#c4b5fd" : "#6d6680";
    ctx.beginPath();
    ctx.arc(x, y - 8, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111820";
    ctx.fillRect(x - 9, y - 12, 6, 5);
    ctx.fillRect(x + 3, y - 12, 6, 5);
  } else {
    ctx.fillStyle = running ? "#7dd3fc" : "#536875";
    ctx.save();
    ctx.translate(x, y - 8);
    ctx.rotate(running ? time * 0.004 : 0);
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(12, -3, 9, 6);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(machine.name, x, y - 41);
};

const drawMachine = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  machine: MachineDef,
  target: Vec | null,
  time: number,
) => {
  const running = state.inputs[machine.id] > 0;
  drawMachineArt(ctx, machine, running, time);

  const cycle = machineCycle(state, machine.id);
  const ratio = running ? clamp(state.progress[machine.id] / cycle, 0, 1) : 0;
  ctx.fillStyle = "rgba(5,10,16,0.72)";
  roundRect(ctx, machine.pos.x - 40, machine.pos.y + 21, 80, 5, 3);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = "#7ee7a8";
    roundRect(ctx, machine.pos.x - 40, machine.pos.y + 21, 80 * ratio, 5, 3);
    ctx.fill();
  }

  const input = machineInputPos(machine);
  const output = machineOutputPos(machine);
  drawInteractionRing(ctx, input, samePoint(target, input), "⬇️", `投入 ${state.inputs[machine.id]}/${machineCapacity(state, machine.id)}`, time);
  drawInteractionRing(ctx, output, samePoint(target, output), resources[machine.output].icon, `受取 ${Math.floor(state.resources[machine.output])}/${outputCapacity(state, machine.id)}`, time);

  if (state.inputs[machine.id] <= 0) {
    ctx.fillStyle = "rgba(255,190,130,0.8)";
    ctx.font = SMALL;
    ctx.textAlign = "center";
    ctx.fillText("材料まち", machine.pos.x, machine.pos.y + 39);
  } else if (state.resources[machine.output] >= outputCapacity(state, machine.id)) {
    ctx.fillStyle = "#ffd166";
    ctx.font = SMALL;
    ctx.textAlign = "center";
    ctx.fillText("受取口が満杯", machine.pos.x, machine.pos.y + 39);
  }
};

const drawHQ = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  target: Vec | null,
  time: number,
) => {
  const active = contract(state);
  const { x, y } = HQ_POS;
  ctx.fillStyle = state.restoration >= 100 ? "#214832" : "#24313d";
  roundRect(ctx, x - 76, y - 56, 152, 96, 17);
  ctx.fill();
  ctx.strokeStyle = state.restoration >= 100
    ? "rgba(126,231,168,0.8)"
    : "rgba(196,181,253,0.52)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = FONT;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f0ff";
  ctx.fillText("惑星復旧本部", x, y - 36);
  ctx.font = SMALL;
  ctx.fillStyle = "#c4b5fd";
  ctx.fillText(active.name, x, y - 21);
  ctx.font = `700 16px system-ui`;
  ctx.fillStyle = resources[active.resource].color;
  ctx.fillText(resources[active.resource].icon, x, y + 1);
  ctx.font = FONT;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(`${state.orderDelivered}/${active.amount}`, x, y + 20);
  ctx.font = SMALL;
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`報酬 ${active.reward.toLocaleString("ja-JP")} C`, x, y + 34);
  const drop = hqDropPos();
  drawInteractionRing(ctx, drop, samePoint(target, drop), "📦", "納品", time);
};

const drawPurchase = (
  ctx: CanvasRenderingContext2D,
  state: ScrapState,
  purchase: Purchase,
  active: boolean,
  time: number,
) => {
  const remaining = purchaseRemaining(state, purchase);
  const paid = purchase.cost - remaining;
  const ratio = purchase.cost > 0 ? clamp(paid / purchase.cost, 0, 1) : 1;
  const pulse = active ? 0.8 + Math.sin(time * 0.007) * 0.16 : 0.5;
  ctx.fillStyle = active ? `rgba(255,209,102,${0.14 + pulse * 0.06})` : "rgba(34,197,94,0.11)";
  roundRect(ctx, purchase.pos.x - 49, purchase.pos.y - 24, 98, 53, 13);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255,209,102,0.92)" : "rgba(126,231,168,0.52)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(8,13,19,0.72)";
  roundRect(ctx, purchase.pos.x - 41, purchase.pos.y + 18, 82, 5, 3);
  ctx.fill();
  ctx.fillStyle = active ? "#ffd166" : "#7ee7a8";
  roundRect(ctx, purchase.pos.x - 41, purchase.pos.y + 18, 82 * ratio, 5, 3);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.font = SMALL;
  ctx.fillStyle = "#e7fff0";
  ctx.fillText(purchase.label, purchase.pos.x, purchase.pos.y - 7);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`${Math.ceil(remaining).toLocaleString("ja-JP")} C`, purchase.pos.x, purchase.pos.y + 9);
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
  ctx.ellipse(x, y + 17, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin.coat;
  roundRect(ctx, x - 12, y - 7 + bob, 24, 28, 8);
  ctx.fill();
  ctx.fillStyle = skin.head;
  ctx.beginPath();
  ctx.arc(x, y - 15 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  if (skin.hat !== "none") {
    ctx.fillStyle = skin.hatColor ?? skin.coat;
    roundRect(ctx, x - 12, y - 28 + bob, 24, 7, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#111820";
  ctx.beginPath();
  ctx.arc(x - 4, y - 16 + bob, 1.4, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 16 + bob, 1.4, 0, Math.PI * 2);
  ctx.fill();

  if (state.carry.kind && state.carry.amount > 0) {
    const icon = resources[state.carry.kind].icon;
    const visible = Math.min(5, state.carry.amount);
    ctx.font = `700 14px system-ui`;
    ctx.textAlign = "center";
    for (let i = 0; i < visible; i += 1) {
      ctx.fillText(icon, x, y - 37 - i * 11 + bob);
    }
    if (state.carry.amount > visible) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = SMALL;
      ctx.fillText(`+${state.carry.amount - visible}`, x + 17, y - 39 - (visible - 1) * 11 + bob);
    }
  }
};

const drawGuideLine = (
  ctx: CanvasRenderingContext2D,
  from: Vec,
  target: Vec | null,
  time: number,
) => {
  if (!target) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,209,102,0.68)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.lineDashOffset = -(time * 0.018) % 13;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y - 10);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.restore();
};

const formatOfflineTime = (ms: number) => {
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}時間${rest}分` : `${hours}時間`;
};

const progressSignature = (state: ScrapState) =>
  [
    Math.floor(state.credits),
    state.carry.kind ?? "none",
    state.carry.amount,
    state.totalProduced,
    state.totalDelivered,
    state.unlocked,
    state.automated.join(","),
    state.levels.sort,
    Object.values(state.paid).reduce((sum, value) => sum + Math.floor(value), 0),
  ].join("|");

export default function ScrapPlanet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<ScrapState | null>(null);
  const skinRef = useRef<Skin | null>(null);
  const joystickRef = useRef<Joystick>(emptyJoystick());
  const keysRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const saveAtRef = useRef(0);
  const sampleAtRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);
  const viewportRef = useRef({ width: 1, height: 1, dpr: 1, fit: 1 });
  const cameraRef = useRef({ x: 0, y: 0 });
  const progressRef = useRef({ signature: "", at: 0 });

  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState<Hud | null>(null);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState<OfflineReport | null>(null);
  const [toast, setToast] = useState("");
  const [stalledFor, setStalledFor] = useState(0);

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
        showToast(`${currentDistrict(after).name}を開放しました`);
        return;
      }
      if (after.automated.length > before.automated.length) {
        const added = after.automated.find((id) => !before.automated.includes(id));
        const labels: Record<string, string> = {
          sort: "自動回収ドローンが稼働しました",
          deliver: "納品作業員が働き始めました",
          "deliver-fast": "搬送ドローンが稼働しました",
          cash: "自動決済端末が稼働しました",
        };
        showToast(labels[added ?? ""] ?? "自動化設備が稼働しました");
        return;
      }
      if (after.levels.sort > before.levels.sort) {
        showToast("磁力選別機の加工速度が上がりました");
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
    progressRef.current = { signature: progressSignature(next), at: performance.now() };
    setHud(sample(next));
    setOffline(null);
    setStalledFor(0);
    showToast("復旧計画を最初から開始しました");
  }, [showToast]);

  useEffect(() => {
    startCloud();
    const loaded = loadScrap();
    const report = loaded.offlineReport;
    loaded.offlineReport = undefined;
    stateRef.current = loaded;
    skinRef.current = equippedSkin();
    progressRef.current = { signature: progressSignature(loaded), at: performance.now() };
    queueMicrotask(() => {
    setHud(sample(loaded));
    setOffline(report ?? null);
    setReady(true);
  });

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
      viewportRef.current = {
        width,
        height,
        dpr,
        fit: width / SCRAP_VIEW_WIDTH,
      };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let previous = performance.now();

    const interact = (state: ScrapState, dt: number) => {
      let next = state;
      for (const purchase of purchases(next)) {
        if (distance(next.player, purchase.pos) <= PURCHASE_RADIUS) {
          next = payPurchase(next, purchase, dt);
          break;
        }
      }

      const room = carryCapacity(next) - next.carry.amount;
      if (distance(next.player, sourcePickupPos()) <= INTERACT_RADIUS && room > 0) {
        return pickup(next, "raw", room);
      }
      if (distance(next.player, hqDropPos()) <= INTERACT_RADIUS && next.carry.amount > 0) {
        return deliverContract(next, next.carry.amount);
      }

      for (const machine of machines.slice(0, next.unlocked)) {
        const atInput = machineInputPos(machine);
        const atOutput = machineOutputPos(machine);
        const nearBody = distance(next.player, machine.pos) <= 61;
        if (
          next.carry.kind === machine.input &&
          (distance(next.player, atInput) <= INTERACT_RADIUS || (nearBody && next.player.x <= machine.pos.x))
        ) {
          return deposit(next, machine.id, next.carry.amount);
        }
        if (
          (!next.carry.kind || next.carry.kind === machine.output) &&
          (distance(next.player, atOutput) <= INTERACT_RADIUS || (nearBody && next.player.x > machine.pos.x))
        ) {
          const capacity = carryCapacity(next) - next.carry.amount;
          if (capacity > 0) return pickup(next, machine.output, capacity);
        }
      }
      return next;
    };

    const drawScreenArrow = (
      target: Vec | null,
      camera: Vec,
      guidanceNow: Guidance,
    ) => {
      if (!target) return;
      const { width, height, dpr, fit } = viewportRef.current;
      const sx = (target.x - camera.x) * fit;
      const sy = (target.y - camera.y) * fit;
      const margin = 28;
      if (sx >= margin && sx <= width - margin && sy >= margin && sy <= height - margin) return;
      const cx = width / 2;
      const cy = height / 2;
      const dx = sx - cx;
      const dy = sy - cy;
      const scale = Math.min(
        Math.abs(dx) > 0.001 ? (width / 2 - margin) / Math.abs(dx) : Infinity,
        Math.abs(dy) > 0.001 ? (height / 2 - margin) / Math.abs(dy) : Infinity,
      );
      const x = cx + dx * scale;
      const y = cy + dy * scale;
      const angle = Math.atan2(dy, dx);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(255,209,102,0.96)";
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.font = SMALL;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe4a4";
      ctx.fillText(guidanceNow.label.slice(0, 14), x, clamp(y + 22, 14, height - 8));
    };

    const draw = (state: ScrapState, time: number) => {
      const { width, height, dpr, fit } = viewportRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bounds = worldBounds(state.unlocked);
      const viewW = width / fit;
      const viewH = height / fit;
      const targetX = bounds.x1 - bounds.x0 <= viewW
        ? bounds.x0 - (viewW - (bounds.x1 - bounds.x0)) / 2
        : clamp(state.player.x - viewW / 2, bounds.x0, bounds.x1 - viewW);
      const targetY = bounds.y1 - bounds.y0 <= viewH
        ? bounds.y0 - (viewH - (bounds.y1 - bounds.y0)) / 2
        : clamp(state.player.y - viewH / 2, bounds.y0, bounds.y1 - viewH);
      const follow = Math.min(1, Math.max(0.02, (time - previous) * 0.006));
      cameraRef.current.x += (targetX - cameraRef.current.x) * follow;
      cameraRef.current.y += (targetY - cameraRef.current.y) * follow;
      const camera = cameraRef.current;

      const guidanceNow = guidance(state);
      ctx.setTransform(
        dpr * fit,
        0,
        0,
        dpr * fit,
        -camera.x * dpr * fit,
        -camera.y * dpr * fit,
      );
      drawDistricts(ctx, state);
      for (const machine of machines.slice(0, state.unlocked)) {
        const index = machines.findIndex((item) => item.id === machine.id);
        const source = index === 0 ? sourcePickupPos() : machineOutputPos(machines[index - 1]);
        drawConnection(ctx, source, machineInputPos(machine), isAutomated(state, machine.id), time);
      }
      drawGuideLine(ctx, state.player, guidanceNow.pos, time);
      drawSource(ctx, state, guidanceNow.pos, time);
      drawHQ(ctx, state, guidanceNow.pos, time);
      machines.slice(0, state.unlocked).forEach((machine) =>
        drawMachine(ctx, state, machine, guidanceNow.pos, time));
      purchases(state).forEach((purchase) =>
        drawPurchase(ctx, state, purchase, samePoint(guidanceNow.pos, purchase.pos), time));
      drawPlayer(ctx, state, skinRef.current ?? equippedSkin(), time);
      drawScreenArrow(guidanceNow.pos, camera, guidanceNow);

      const joystick = joystickRef.current;
      if (joystick.active) {
        const rect = canvas.getBoundingClientRect();
        const startX = joystick.startX - rect.left;
        const startY = joystick.startY - rect.top;
        const knobX = joystick.x - rect.left;
        const knobY = joystick.y - rect.top;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(15,23,42,0.5)";
        ctx.beginPath();
        ctx.arc(startX, startY, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(226,232,240,0.3)";
        ctx.stroke();
        ctx.fillStyle = "rgba(126,231,168,0.55)";
        ctx.beginPath();
        ctx.arc(knobX, knobY, 19, 0, Math.PI * 2);
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
        if (length > 0.08) {
          const scale = Math.min(1, length);
          const speed = moveSpeed(state) * scale * (dt / 1000);
          const bounds = worldBounds(state.unlocked);
          state = {
            ...state,
            player: {
              x: clamp(state.player.x + (dx / length) * speed, bounds.x0 + 18, bounds.x1 - 18),
              y: clamp(state.player.y + (dy / length) * speed, bounds.y0 + 54, bounds.y1 - 24),
            },
          };
        }
        state = interact(state, dt);
        announceTransition(before, state);
        stateRef.current = state;
      }

      draw(state, now);
      if (now - sampleAtRef.current >= 160) {
        sampleAtRef.current = now;
        const signature = progressSignature(state);
        if (signature !== progressRef.current.signature) {
          progressRef.current = { signature, at: now };
          setStalledFor(0);
        } else {
          setStalledFor(Math.floor((now - progressRef.current.at) / 1000));
        }
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
    const max = 42;
    const clamped = length > max ? max / length : 1;
    const shownX = rawX * clamped;
    const shownY = rawY * clamped;
    const dead = 4;
    const full = 34;
    const inputScale = length <= dead ? 0 : Math.min(1, (length - dead) / (full - dead));
    joystickRef.current = {
      ...joystick,
      x: joystick.startX + shownX,
      y: joystick.startY + shownY,
      dx: length > 0 ? (rawX / length) * inputScale : 0,
      dy: length > 0 ? (rawY / length) * inputScale : 0,
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
        <p className={styles.objective}>{hud?.objective.label ?? "工場を読み込み中…"}</p>
        {!ready ? <div className={styles.loading}>復旧計画を読み込み中…</div> : null}
        {toast ? <div className={styles.toast}>{toast}</div> : null}
        {stalledFor >= 40 ? (
          <button
            type="button"
            className={styles.hintButton}
            onClick={() => showToast(hud?.objective.label ?? "黄色い案内へ進もう")}
          >
            次にやることを確認
          </button>
        ) : null}
        {hud?.completed ? <div className={styles.complete}>🌍 惑星再生完了</div> : null}
      </section>

      <footer className={styles.dock}>
        <div className={styles.carry}>
          <span>{carryIcon}</span>
          <strong>
            {hud?.carryTotal ?? 0}<small> / {hud?.capacity ?? 5}</small>
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
              <div><span>納品</span><strong>{offline.delivered.toLocaleString("ja-JP")}</strong><small>個</small></div>
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
              <li>黄色いリングと点線は、今向かう場所を1か所だけ示します。</li>
              <li>漂着ゴミを磁力選別機へ運び、外壁補修材を復旧本部へ納品します。</li>
              <li>初回3個の報酬は280C。その後も3個210Cで何度でも稼げます。</li>
              <li>自動回収ドローンと納品作業員を買うと、第一区画が自動で回ります。</li>
              <li>合計15個を納品すると、破砕・洗浄区を開けられます。</li>
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
