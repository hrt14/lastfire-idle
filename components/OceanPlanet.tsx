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
  collectSource,
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
const PURCHASE_RADIUS = 34;
const MOVE_SPEED = 150;

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
  skin: Skin,
  time: number,
) => {
  const def = oceanArea(state.currentArea);
  const line = state.lines[state.currentArea];
  const purchases = availablePurchases(state, state.currentArea);
  const sourceInfo = oceanResources[def.source];
  const productInfo = oceanResources[def.product];
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
  ctx.font = "700 38px system-ui";
  ctx.fillText(sourceInfo.icon, SOURCE.x, 215);
  ctx.font = "700 11px system-ui";
  ctx.fillStyle = "rgba(240,252,255,0.78)";
  ctx.fillText(
    line.sourceAuto
      ? `自然 ${Math.floor(line.wild)} / 水揚げ ${Math.floor(line.harvested)}`
      : `資源 ${Math.floor(line.wild)}`,
    SOURCE.x,
    246,
  );
  if (line.sourceAuto) {
    ctx.font = "700 22px system-ui";
    ctx.fillText("🧑‍✈️", 76 + Math.sin(time * 0.003) * 13, 274);
  }
  drawRing(
    ctx,
    SOURCE_PICKUP,
    sourceInfo.icon,
    line.sourceAuto ? "水揚げ" : "拾う",
    distance(player, SOURCE_PICKUP) < INTERACT_RADIUS,
    time,
  );

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

      interactionRef.current += dt;
      const id = next.currentArea;
      const player = playerRef.current;
      if (interactionRef.current >= 230) {
        let changed = next;
        if (distance(player, SOURCE_PICKUP) < INTERACT_RADIUS) changed = collectSource(changed, id);
        else if (distance(player, INPUT) < INTERACT_RADIUS) changed = depositSource(changed, id);
        else if (distance(player, OUTPUT) < INTERACT_RADIUS) changed = collectProduct(changed, id);
        else if (distance(player, HQ_DROP) < INTERACT_RADIUS) changed = deliverProduct(changed, id);
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
          skin,
          time,
        );
      }
      frame = window.requestAnimationFrame(run);
    };

    frame = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(frame);
  }, [commit, ready]);

  const switchArea = (id: OceanAreaId) => {
    const current = stateRef.current;
    if (!current) return;
    const next = selectOceanArea(current, id);
    if (next === current) return;
    playerRef.current = { ...PLAYER_START };
    commit(next, true);
  };

  const reset = () => {
    const next = resetOcean();
    playerRef.current = { ...PLAYER_START };
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
          <strong>{bottleneck(display)}</strong>
          <small>現場を歩き、光る円に入ると作業します</small>
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
              <li>画面をドラッグしてキャラクターを動かす</li>
              <li>資源の円に入って拾い、加工設備へ運ぶ</li>
              <li>完成品を受け取り、海洋復旧本部へ納品する</li>
              <li>購入パッドに立って、仕事を仲間や船へ渡す</li>
              <li>全7海域を開き、海洋再生率100%を目指す</li>
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
