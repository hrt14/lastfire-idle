"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EAT_TIME,
  ENTRANCE,
  KITCHEN,
  PAD_RADIUS,
  STOVE_CAPACITY,
  WORLD,
  availablePads,
  currentObjective,
  maxCarry,
  openSeats,
  openStoves,
  padLevel,
  padPrice,
  trayPos,
  update,
  type Input,
  type OfflineReport,
  type ShopState,
  type StaffKind,
  type UpgradeId,
} from "@/lib/shop";
import { catchUp, getState, save } from "@/lib/shopStore";
import { formatYen } from "@/lib/format";
import { isMuted, loadMuted, playSound, unlockAudio } from "@/lib/sfx";

export type Sample = {
  money: number;
  carry: number;
  maxCarry: number;
  served: number;
  staff: number;
  levels: Record<UpgradeId, number>;
  toast: string | null;
  muted: boolean;
  offline: OfflineReport | null;
};

type Props = {
  onSample: (sample: Sample) => void;
  paused: boolean;
};

const FONT = `700 11px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
const SMALL = `700 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;

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

const shadow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
};

const bowl = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.ellipse(x, y, 7.5 * s, 4.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d94f3d";
  ctx.beginPath();
  ctx.ellipse(x, y - 0.6 * s, 5.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe9b0";
  ctx.beginPath();
  ctx.ellipse(x - 1.4 * s, y - 1 * s, 2.2 * s, 1.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
};

const person = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coat: string,
  head: string,
  bob: number,
) => {
  shadow(ctx, x, y + 7, 10);
  const oy = Math.sin(bob) * 1.6;
  ctx.fillStyle = coat;
  roundRect(ctx, x - 8.5, y - 15 + oy, 17, 19, 7.5);
  ctx.fill();
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(x, y - 20 + oy, 7.6, 0, Math.PI * 2);
  ctx.fill();
};

/** 配膳ロボ */
const robot = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number) => {
  shadow(ctx, x, y + 7, 11);
  const hover = Math.sin(t * 3) * 1.2;
  ctx.fillStyle = "#8fa4bb";
  roundRect(ctx, x - 10, y - 18 + hover, 20, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#c9d8e8";
  roundRect(ctx, x - 10, y - 18 + hover, 20, 7, 4);
  ctx.fill();
  ctx.fillStyle = "#1d2734";
  roundRect(ctx, x - 6, y - 12 + hover, 12, 6, 3);
  ctx.fill();
  ctx.fillStyle = "#7ee7a8";
  ctx.beginPath();
  ctx.arc(x - 3, y - 9 + hover, 1.6, 0, Math.PI * 2);
  ctx.arc(x + 3, y - 9 + hover, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9d8e8";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 18 + hover);
  ctx.lineTo(x, y - 24 + hover);
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(x, y - 25 + hover, 2, 0, Math.PI * 2);
  ctx.fill();
};

export default function Shop({ onSample, paused }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const input = useRef<Input>({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const stick = useRef<{
    id: number;
    origin: { x: number; y: number };
    at: { x: number; y: number };
  } | null>(null);
  const pausedRef = useRef(paused);
  const sampleRef = useRef(onSample);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    sampleRef.current = onSample;
  }, [onSample]);

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      state: ShopState,
      scale: number,
      ox: number,
      oy: number,
      time: number,
    ) => {
      const canvas = ctx.canvas;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /* --- 床 --- */
      const floor = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      floor.addColorStop(0, "#3b322a");
      floor.addColorStop(1, "#282019");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      for (let y = KITCHEN.bottom + 20; y < WORLD.h; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.w, y);
        ctx.stroke();
      }

      /* --- 厨房（歩いて入れる） --- */
      ctx.fillStyle = "#2b241d";
      ctx.fillRect(0, 0, WORLD.w, KITCHEN.bottom);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let y = KITCHEN.top; y < KITCHEN.bottom; y += 22) {
        for (let x = 0; x < WORLD.w; x += 22) {
          if (((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);
        }
      }
      ctx.strokeStyle = "rgba(246,231,207,0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, KITCHEN.bottom);
      ctx.lineTo(WORLD.w, KITCHEN.bottom);
      ctx.stroke();

      // のれん
      ctx.fillStyle = "#c2402f";
      roundRect(ctx, 10, 4, WORLD.w - 20, 30, 6);
      ctx.fill();
      ctx.fillStyle = "#f6e7cf";
      ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
      ctx.fillText("ら ー め ん", WORLD.w / 2, 20);
      ctx.font = FONT;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 1; i < 5; i += 1) {
        ctx.fillRect(10 + ((WORLD.w - 20) / 5) * i - 1, 4, 2, 30);
      }

      /* --- 寸胴 --- */
      for (const stove of openStoves(state)) {
        const { x, y } = stove.pos;
        ctx.fillStyle = "#2f353c";
        roundRect(ctx, x - 26, y - 18, 52, 32, 8);
        ctx.fill();
        ctx.fillStyle = "#454d57";
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 17, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8d5a2b";
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 13, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.16)";
        for (let i = 0; i < 3; i += 1) {
          const t = (time * 0.5 + i * 0.33) % 1;
          ctx.beginPath();
          ctx.arc(x + Math.sin(t * 6 + i) * 5, y - 14 - t * 26, 4 - t * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const ready = state.ready[stove.id] ?? 0;
        for (let i = 0; i < ready; i += 1) bowl(ctx, x, y + 22 - i * 5.5);
        if (ready >= STOVE_CAPACITY) {
          ctx.fillStyle = "#ffd166";
          ctx.fillText("満杯", x, y + 36);
        }
      }

      /* --- カウンター --- */
      ctx.fillStyle = "#6b4a2f";
      roundRect(ctx, 16, 306, WORLD.w - 32, 34, 10);
      ctx.fill();
      ctx.fillStyle = "#8a6440";
      roundRect(ctx, 16, 306, WORLD.w - 32, 11, 6);
      ctx.fill();

      for (const seat of openSeats(state)) {
        if (seat.row === 0) {
          ctx.fillStyle = "#b0463a";
          ctx.beginPath();
          ctx.ellipse(seat.pos.x, seat.pos.y + 8, 12, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#6b4a2f";
          roundRect(ctx, seat.pos.x - 32, seat.pos.y - 42, 64, 28, 8);
          ctx.fill();
          ctx.fillStyle = "#8a6440";
          roundRect(ctx, seat.pos.x - 32, seat.pos.y - 42, 64, 9, 5);
          ctx.fill();
        }
      }

      /* --- 配膳口 --- */
      const waitingSeats = new Set(
        state.customers
          .filter((customer) => customer.state === "waiting")
          .map((customer) => customer.seatId),
      );
      const eatingBySeat = new Map(
        state.customers
          .filter((customer) => customer.state === "eating")
          .map((customer) => [customer.seatId, customer]),
      );

      for (const seat of openSeats(state)) {
        const tray = trayPos(seat);
        const hot = waitingSeats.has(seat.id);
        const eating = eatingBySeat.get(seat.id);
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;

        ctx.save();
        if (hot) {
          ctx.shadowColor = "rgba(255,209,102,0.9)";
          ctx.shadowBlur = 10 + pulse * 12;
        }
        ctx.fillStyle = hot
          ? `rgba(255,209,102,${0.5 + pulse * 0.35})`
          : "rgba(255,255,255,0.09)";
        roundRect(ctx, tray.x - 15, tray.y - 9, 30, 18, 8);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = hot ? "#fff0c2" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = hot ? 2 : 1;
        roundRect(ctx, tray.x - 15, tray.y - 9, 30, 18, 8);
        ctx.stroke();

        if (hot) {
          const dy = Math.sin(time * 5) * 3;
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.moveTo(tray.x, tray.y - 16 + dy);
          ctx.lineTo(tray.x - 6, tray.y - 25 + dy);
          ctx.lineTo(tray.x + 6, tray.y - 25 + dy);
          ctx.closePath();
          ctx.fill();
        }

        if (eating) {
          const left = Math.max(0, eating.timer) / EAT_TIME;
          bowl(ctx, tray.x, tray.y, left > 0.88 ? 1.35 : 1.15);
          ctx.strokeStyle = "rgba(255,209,102,0.85)";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(tray.x, tray.y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
          ctx.stroke();
        }
      }

      /* --- 飾りと入口 --- */
      for (const px of [26, 334]) {
        ctx.fillStyle = "#5a3f2a";
        roundRect(ctx, px - 9, 566, 18, 16, 4);
        ctx.fill();
        ctx.fillStyle = "#2f6b4a";
        ctx.beginPath();
        ctx.ellipse(px, 560, 13, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, ENTRANCE.x - 42, WORLD.h - 24, 84, 20, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(246,231,207,0.55)";
      ctx.fillText("入口", ENTRANCE.x, WORLD.h - 14);

      /* --- 枠（買い物する場所） --- */
      for (const pad of availablePads(state)) {
        const price = padPrice(state, pad);
        const paid = state.padProgress[pad.id] ?? 0;
        const ratio = Math.min(1, paid / price);
        const near = state.activePad === pad.id;
        const affordable = state.money > 0;
        const level = padLevel(state, pad);

        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = near
          ? "#7ee7a8"
          : affordable
            ? "rgba(126,231,168,0.75)"
            : "rgba(255,255,255,0.28)";
        ctx.fillStyle = near ? "rgba(126,231,168,0.2)" : "rgba(126,231,168,0.08)";
        roundRect(
          ctx,
          pad.pos.x - PAD_RADIUS,
          pad.pos.y - PAD_RADIUS + 4,
          PAD_RADIUS * 2,
          PAD_RADIUS * 2 - 8,
          10,
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (ratio > 0) {
          ctx.fillStyle = "rgba(126,231,168,0.35)";
          const h = (PAD_RADIUS * 2 - 8) * ratio;
          roundRect(
            ctx,
            pad.pos.x - PAD_RADIUS,
            pad.pos.y + PAD_RADIUS - 4 - h,
            PAD_RADIUS * 2,
            h,
            10,
          );
          ctx.fill();
        }

        if (pad.kind === "upgrade") {
          ctx.font = SMALL;
          ctx.fillStyle = "#9fe6bd";
          ctx.fillText(`Lv${level}`, pad.pos.x, pad.pos.y - 16);
          ctx.font = FONT;
        }
        ctx.fillStyle = "#eafff2";
        ctx.fillText(pad.label, pad.pos.x, pad.pos.y - 3);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(formatYen(Math.max(0, price - paid)), pad.pos.x, pad.pos.y + 12);
      }

      /* --- お金 --- */
      for (const coin of state.coins) {
        const lift = Math.min(6, coin.age * 24);
        shadow(ctx, coin.pos.x, coin.pos.y + 4, 6);
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(coin.pos.x, coin.pos.y - lift, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#a8761b";
        ctx.fillText("円", coin.pos.x, coin.pos.y - lift + 0.5);
      }

      /* --- 人 --- */
      const actors: { y: number; render: () => void }[] = [];
      const coats: Record<StaffKind, string> = {
        waiter: "#d98c2b",
        robot: "#8fa4bb",
        collector: "#4aa3c7",
        cook: "#eee8dc",
      };

      for (const customer of state.customers) {
        actors.push({
          y: customer.pos.y,
          render: () => {
            const palette = ["#5b7fbc", "#7a6bb5", "#4f9e83", "#c07a4a", "#a35b7a"];
            person(
              ctx,
              customer.pos.x,
              customer.pos.y,
              palette[customer.id % palette.length],
              "#f0cfae",
              customer.state === "walking" ? performance.now() / 90 : 0,
            );
            if (customer.state === "waiting") {
              const bounce = Math.sin(time * 4.5) * 2;
              const bx = customer.pos.x + 24;
              const by = customer.pos.y - 6 + bounce;
              ctx.save();
              ctx.shadowColor = "rgba(255,209,102,0.8)";
              ctx.shadowBlur = 9;
              ctx.fillStyle = "#ffd166";
              roundRect(ctx, bx - 15, by - 11, 30, 22, 10);
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(bx - 15, by + 2);
              ctx.lineTo(bx - 22, by + 8);
              ctx.lineTo(bx - 12, by + 8);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
              bowl(ctx, bx, by, 1);
            }
            if (customer.state === "eating") {
              ctx.fillStyle = "rgba(255,255,255,0.35)";
              for (let i = 0; i < 2; i += 1) {
                const t = (time * 0.7 + i * 0.5) % 1;
                ctx.beginPath();
                ctx.arc(
                  customer.pos.x + 10 + Math.sin(t * 6 + i) * 3,
                  customer.pos.y - 26 - t * 16,
                  3 - t * 1.6,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
              }
            }
          },
        });
      }

      for (const worker of state.staff) {
        actors.push({
          y: worker.pos.y,
          render: () => {
            if (worker.kind === "robot") {
              robot(ctx, worker.pos.x, worker.pos.y, time);
            } else {
              person(
                ctx,
                worker.pos.x,
                worker.pos.y,
                coats[worker.kind],
                "#f0cfae",
                performance.now() / 110,
              );
              if (worker.kind === "cook") {
                ctx.fillStyle = "#fbf7ef";
                roundRect(ctx, worker.pos.x - 7, worker.pos.y - 32, 14, 9, 4);
                ctx.fill();
              }
            }
            for (let i = 0; i < worker.carry; i += 1) {
              bowl(ctx, worker.pos.x, worker.pos.y - 30 - i * 6, 0.85);
            }
          },
        });
      }

      const player = state.player;
      actors.push({
        y: player.pos.y,
        render: () => {
          person(ctx, player.pos.x, player.pos.y, "#e2483c", "#f7d9b8", player.step);
          ctx.fillStyle = "#f6e7cf";
          roundRect(ctx, player.pos.x - 8, player.pos.y - 29, 16, 6, 3);
          ctx.fill();
          for (let i = 0; i < player.carry; i += 1) {
            bowl(ctx, player.pos.x, player.pos.y - 34 - i * 6);
          }
        },
      });

      actors.sort((a, b) => a.y - b.y);
      for (const actor of actors) actor.render();

      /* --- 演出 --- */
      for (const item of state.pops) {
        const t = Math.min(1, item.age);
        ctx.save();
        ctx.globalAlpha = 1 - t * t;
        ctx.font = `800 13px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "rgba(10,8,6,0.85)";
        ctx.strokeText(item.text, item.pos.x, item.pos.y - t * 26);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(item.text, item.pos.x, item.pos.y - t * 26);
        ctx.restore();
      }
      ctx.font = FONT;

      /* --- 案内 --- */
      const objective = currentObjective(state);
      if (objective.pos) {
        const from = player.pos;
        const to = objective.pos;
        if (Math.hypot(to.x - from.x, to.y - from.y) > 46) {
          ctx.save();
          ctx.setLineDash([5, 7]);
          ctx.lineDashOffset = -((time * 40) % 12);
          ctx.strokeStyle = "rgba(255,209,102,0.55)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y - 6);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          ctx.restore();

          const ring = 0.5 + Math.sin(time * 5) * 0.5;
          ctx.strokeStyle = `rgba(255,209,102,${0.35 + ring * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(to.x, to.y, 18 + ring * 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const width = ctx.measureText(objective.label).width + 26;
      roundRect(ctx, WORLD.w / 2 - width / 2, 234, width, 24, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,209,102,0.45)";
      ctx.lineWidth = 1;
      roundRect(ctx, WORLD.w / 2 - width / 2, 234, width, 24, 12);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.fillText(objective.label, WORLD.w / 2, 247);
      ctx.restore();

      /* --- ジョイスティック --- */
      const s = stick.current;
      if (s) {
        const dx = s.at.x - s.origin.x;
        const dy = s.at.y - s.origin.y;
        const len = Math.hypot(dx, dy);
        const max = 42;
        const nx = len > max ? (dx / len) * max : dx;
        const ny = len > max ? (dy / len) * max : dy;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.arc(s.origin.x, s.origin.y, max, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.arc(s.origin.x + nx, s.origin.y + ny, 19, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    loadMuted();
    const state = getState();
    let pendingOffline: OfflineReport | null = catchUp();
    let scale = 1;
    let ox = 0;
    let oy = 0;
    let dpr = 1;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const fit = Math.min(rect.width / WORLD.w, rect.height / WORLD.h);
      scale = fit * dpr;
      ox = ((rect.width - WORLD.w * fit) / 2) * dpr;
      oy = ((rect.height - WORLD.h * fit) / 2) * dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const toWorld = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const fit = Math.min(rect.width / WORLD.w, rect.height / WORLD.h);
      return {
        x: (event.clientX - rect.left - (rect.width - WORLD.w * fit) / 2) / fit,
        y: (event.clientY - rect.top - (rect.height - WORLD.h * fit) / 2) / fit,
      };
    };

    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      unlockAudio();
      canvas.setPointerCapture(event.pointerId);
      const point = toWorld(event);
      stick.current = { id: event.pointerId, origin: point, at: point };
    };
    const onMove = (event: PointerEvent) => {
      const s = stick.current;
      if (!s || s.id !== event.pointerId) return;
      s.at = toWorld(event);
      const dx = s.at.x - s.origin.x;
      const dy = s.at.y - s.origin.y;
      const len = Math.hypot(dx, dy);
      if (len < 4) {
        input.current = { x: 0, y: 0 };
        return;
      }
      const scaled = Math.min(1, len / 34);
      input.current = { x: (dx / len) * scaled, y: (dy / len) * scaled };
    };
    const onUp = (event: PointerEvent) => {
      if (stick.current?.id !== event.pointerId) return;
      stick.current = null;
      input.current = { x: 0, y: 0 };
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const keyDown = (event: KeyboardEvent) => {
      unlockAudio();
      keys.current.add(event.key.toLowerCase());
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let raf = 0;
    let last = performance.now();
    let sampleAt = 0;
    let saveAt = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const held = keys.current;
      const kx =
        (held.has("arrowright") || held.has("d") ? 1 : 0) -
        (held.has("arrowleft") || held.has("a") ? 1 : 0);
      const ky =
        (held.has("arrowdown") || held.has("s") ? 1 : 0) -
        (held.has("arrowup") || held.has("w") ? 1 : 0);
      const move: Input = kx || ky ? { x: kx, y: ky } : input.current;

      if (!pausedRef.current && !document.hidden) update(state, move, dt);

      // 効果音を鳴らす（同じ音が同フレームで重ならないようにする）
      if (state.sfx.length > 0) {
        const played = new Set<string>();
        for (const id of state.sfx) {
          if (played.has(id)) continue;
          played.add(id);
          playSound(id);
        }
        state.sfx.length = 0;
      }
      draw(ctx, state, scale, ox, oy, now / 1000);

      if (now - sampleAt > 110) {
        sampleAt = now;
        sampleRef.current({
          money: state.money,
          carry: state.player.carry,
          maxCarry: maxCarry(state),
          served: state.served,
          staff: state.staff.length,
          levels: { ...state.levels },
          toast:
            state.toast && Date.now() - state.toast.at < 2200
              ? state.toast.text
              : null,
          muted: isMuted(),
          offline: pendingOffline,
        });
        pendingOffline = null;
      }
      if (now - saveAt > 5000) {
        saveAt = now;
        save();
      }
    };
    raf = requestAnimationFrame(frame);

    const onHide = () => {
      if (document.hidden) save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [draw]);

  return (
    <div className="stage" ref={wrapRef}>
      <canvas ref={canvasRef} className="shop" />
    </div>
  );
}
