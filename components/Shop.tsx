"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EAT_TIME,
  KITCHEN,
  PAD_RADIUS,
  WORLD,
  availablePads,
  currentObjective,
  inspectAt,
  maxCarry,
  openSeats,
  openStoves,
  OUTSIDE_DEPTH,
  areas,
  entrancePos,
  equipPos,
  equipment,
  hasEquip,
  outsideTop,
  padPosOf,
  stage,
  openAreas,
  stoveCapacity,
  worldBounds,
  padLevel,
  padPrice,
  trayPos,
  update,
  type Inspect,
  type Input,
  type OfflineReport,
  type ShopState,
  type StaffKind,
  type UpgradeId,
} from "@/lib/shop";
import { catchUp, equippedSkin, getState, save } from "@/lib/shopStore";
import type { Hat } from "@/data/skins";
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

const ticket = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
  ctx.fillStyle = "#ffd166";
  roundRect(ctx, x - 8 * s, y - 5 * s, 16 * s, 10 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#b8791b";
  ctx.fillRect(x - 2 * s, y - 5 * s, 1.4 * s, 10 * s);
  ctx.fillStyle = "#fff3cf";
  roundRect(ctx, x + 1 * s, y - 3 * s, 5 * s, 6 * s, 1 * s);
  ctx.fill();
};

const bowlArt = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
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

const bowl = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
  if (stage().id === "park") ticket(ctx, x, y, s);
  else bowlArt(ctx, x, y, s);
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

/** 区画ごとの飾り（テーマの見分け） */
const drawProps = (
  ctx: CanvasRenderingContext2D,
  area: { rect: { x0: number; y0: number; x1: number; y1: number }; palette: { prop: string } },
  time: number,
) => {
  const { rect, palette } = area;
  const cx = (rect.x0 + rect.x1) / 2;
  const spots = [rect.x0 + 34, rect.x1 - 34];
  const baseY = rect.y1 - 40;

  if (palette.prop === "castle") {
    // メルヘン: 奥にお城
    ctx.fillStyle = "#cbb6e6";
    roundRect(ctx, cx - 46, rect.y0 + 54, 92, 60, 6);
    ctx.fill();
    ctx.fillStyle = "#e6d9f7";
    for (const tx of [cx - 46, cx, cx + 46]) {
      roundRect(ctx, tx - 12, rect.y0 + 30, 24, 84, 5);
      ctx.fill();
      ctx.fillStyle = "#f06a8a";
      ctx.beginPath();
      ctx.moveTo(tx - 15, rect.y0 + 30);
      ctx.lineTo(tx, rect.y0 + 6);
      ctx.lineTo(tx + 15, rect.y0 + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e6d9f7";
    }
    return;
  }
  if (palette.prop === "snow") {
    for (const x of spots) {
      ctx.fillStyle = "#2f5240";
      ctx.beginPath();
      ctx.moveTo(x - 16, baseY);
      ctx.lineTo(x, baseY - 46);
      ctx.lineTo(x + 16, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#eaf3ff";
      ctx.beginPath();
      ctx.moveTo(x - 9, baseY - 22);
      ctx.lineTo(x, baseY - 46);
      ctx.lineTo(x + 9, baseY - 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 26; i += 1) {
      const px = rect.x0 + ((i * 97) % (rect.x1 - rect.x0));
      const py = rect.y0 + (((i * 53 + time * 22) % (rect.y1 - rect.y0)) | 0);
      ctx.fillRect(px, py, 2, 2);
    }
    return;
  }
  if (palette.prop === "cactus") {
    for (const x of spots) {
      ctx.fillStyle = "#4f7a44";
      roundRect(ctx, x - 6, baseY - 44, 12, 46, 6);
      ctx.fill();
      roundRect(ctx, x - 20, baseY - 30, 14, 8, 4);
      ctx.fill();
      roundRect(ctx, x + 6, baseY - 38, 14, 8, 4);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (let y = rect.y0 + 40; y < rect.y1; y += 46) {
      ctx.beginPath();
      ctx.moveTo(rect.x0, y);
      ctx.lineTo(rect.x1, y);
      ctx.stroke();
    }
    return;
  }
  if (palette.prop === "ship") {
    ctx.fillStyle = "#2b5560";
    ctx.fillRect(rect.x0, rect.y0 + 30, rect.x1 - rect.x0, 44);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(rect.x0 + 10 + i * 70, rect.y0 + 44 + Math.sin(time + i) * 3, 40, 3);
    }
    ctx.fillStyle = "#6b4a2f";
    roundRect(ctx, cx - 40, rect.y0 + 58, 80, 22, 6);
    ctx.fill();
    ctx.fillStyle = "#f2e3c6";
    ctx.beginPath();
    ctx.moveTo(cx, rect.y0 + 14);
    ctx.lineTo(cx + 26, rect.y0 + 56);
    ctx.lineTo(cx - 26, rect.y0 + 56);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (palette.prop === "star") {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 40; i += 1) {
      const px = rect.x0 + ((i * 131) % (rect.x1 - rect.x0));
      const py = rect.y0 + ((i * 79) % (rect.y1 - rect.y0));
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.6 + i));
      ctx.globalAlpha = tw;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#9aa6ff";
    ctx.beginPath();
    ctx.arc(rect.x1 - 60, rect.y0 + 56, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(rect.x1 - 60, rect.y0 + 56, 44, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (palette.prop === "fossil") {
    ctx.fillStyle = "#6f7a5a";
    for (const x of spots) {
      ctx.beginPath();
      ctx.ellipse(x, baseY, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#d9d3b8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 50, rect.y0 + 80);
    ctx.quadraticCurveTo(cx, rect.y0 + 30, cx + 50, rect.y0 + 80);
    ctx.stroke();
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 14, rect.y0 + 52 + Math.abs(i) * 6);
      ctx.lineTo(cx + i * 14, rect.y0 + 74 + Math.abs(i) * 4);
      ctx.stroke();
    }
    return;
  }
};

/** 設備の見た目 */
const drawEquip = (
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  time: number,
) => {
  if (id === "noodle") {
    // 製麺機: 銀色の台に2本のローラー、麺が垂れている
    ctx.fillStyle = "#4d5661";
    roundRect(ctx, x - 26, y - 20, 52, 34, 6);
    ctx.fill();
    ctx.fillStyle = "#6b7684";
    roundRect(ctx, x - 26, y - 20, 52, 9, 4);
    ctx.fill();
    ctx.fillStyle = "#2b323a";
    ctx.beginPath();
    ctx.arc(x - 9, y - 4, 6, 0, Math.PI * 2);
    ctx.arc(x + 9, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0e2bd";
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 5, y + 2);
      ctx.lineTo(x + i * 5 + Math.sin(time * 2 + i) * 1.5, y + 15);
      ctx.stroke();
    }
    return;
  }
  if (id === "fridge") {
    // 大型冷蔵庫: 縦長の二枚扉
    ctx.fillStyle = "#8d98a6";
    roundRect(ctx, x - 22, y - 34, 44, 50, 6);
    ctx.fill();
    ctx.fillStyle = "#a7b3c1";
    roundRect(ctx, x - 22, y - 34, 44, 8, 4);
    ctx.fill();
    ctx.strokeStyle = "#59636f";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 26);
    ctx.lineTo(x, y + 16);
    ctx.stroke();
    ctx.fillStyle = "#59636f";
    roundRect(ctx, x - 8, y - 18, 3, 12, 1.5);
    ctx.fill();
    roundRect(ctx, x + 5, y - 18, 3, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = "rgba(150,220,255,0.25)";
    roundRect(ctx, x - 18, y - 2, 36, 6, 3);
    ctx.fill();
    return;
  }
  if (id === "ticket") {
    // 券売機: ボタンの並んだ箱
    ctx.fillStyle = "#3f4a5a";
    roundRect(ctx, x - 20, y - 36, 40, 52, 5);
    ctx.fill();
    ctx.fillStyle = "#25303d";
    roundRect(ctx, x - 15, y - 30, 30, 22, 3);
    ctx.fill();
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        ctx.fillStyle = (r + c + Math.floor(time * 2)) % 4 === 0 ? "#ffd166" : "#7f8c9c";
        roundRect(ctx, x - 13 + c * 9, y - 28 + r * 7, 7, 5, 1.5);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#151c25";
    roundRect(ctx, x - 10, y - 3, 20, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    roundRect(ctx, x - 7, y + 5, 14, 5, 2);
    ctx.fill();
    return;
  }
  if (id === "sign") {
    // 呼び込み看板: A型の立て看板
    ctx.fillStyle = "#4a3524";
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 14);
    ctx.lineTo(x - 6, y - 26);
    ctx.lineTo(x + 6, y - 26);
    ctx.lineTo(x + 20, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f2e3c6";
    roundRect(ctx, x - 17, y - 22, 34, 30, 3);
    ctx.fill();
    ctx.fillStyle = "#c2402f";
    ctx.font = `800 11px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("らーめん", x, y - 12);
    ctx.font = SMALL;
    ctx.fillStyle = "#6b4a2f";
    ctx.fillText("営業中", x, y + 1);
    ctx.font = FONT;
    const glow = 0.4 + Math.sin(time * 3) * 0.3;
    ctx.fillStyle = `rgba(255,209,102,${glow})`;
    ctx.beginPath();
    ctx.arc(x, y - 30, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
};

/** ガチャの見た目に付く かぶりもの */
const drawHat = (
  ctx: CanvasRenderingContext2D,
  hat: Hat,
  color: string,
  x: number,
  y: number,
) => {
  if (hat === "none") return;
  const top = y - 27;
  if (hat === "chef") {
    ctx.fillStyle = color;
    roundRect(ctx, x - 7, top - 4, 14, 9, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 5, top - 5, 4, 0, Math.PI * 2);
    ctx.arc(x + 5, top - 5, 4, 0, Math.PI * 2);
    ctx.arc(x, top - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (hat === "cowboy") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, top + 3, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, x - 6, top - 6, 12, 9, 4);
    ctx.fill();
    return;
  }
  if (hat === "crown") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 8, top + 3);
    ctx.lineTo(x - 8, top - 5);
    ctx.lineTo(x - 4, top - 1);
    ctx.lineTo(x, top - 7);
    ctx.lineTo(x + 4, top - 1);
    ctx.lineTo(x + 8, top - 5);
    ctx.lineTo(x + 8, top + 3);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (hat === "helmet") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(180,220,255,0.25)";
    ctx.beginPath();
    ctx.arc(x, y - 20, 9, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (hat === "topknot") {
    ctx.fillStyle = color;
    roundRect(ctx, x - 8, top + 1, 16, 4, 2);
    ctx.fill();
    roundRect(ctx, x - 2, top - 6, 4, 8, 2);
    ctx.fill();
    return;
  }
  if (hat === "ears") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 9, top + 4);
    ctx.lineTo(x - 5, top - 5);
    ctx.lineTo(x - 1, top + 4);
    ctx.closePath();
    ctx.moveTo(x + 1, top + 4);
    ctx.lineTo(x + 5, top - 5);
    ctx.lineTo(x + 9, top + 4);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (hat === "cap") {
    ctx.fillStyle = color;
    roundRect(ctx, x - 8, top - 1, 16, 7, 3);
    ctx.fill();
    roundRect(ctx, x - 12, top + 4, 12, 3, 1.5);
    ctx.fill();
    return;
  }
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
    downAt: number;
    moved: boolean;
  } | null>(null);
  const inspect = useRef<{ data: Inspect; until: number } | null>(null);
  const camera = useRef({ x: 0, y: 0 });
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
      const box = worldBounds(state);
      const worldH = box.y1;
      const camX = -ox / scale;
      const camY = -oy / scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.font = FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      /* --- 床 --- */
      ctx.fillStyle = "#191512";
      ctx.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      for (const area of openAreas(state)) {
        const { rect, palette } = area;
        const grad = ctx.createLinearGradient(0, rect.y0, 0, rect.y1);
        grad.addColorStop(0, palette.floor);
        grad.addColorStop(1, palette.deep);
        ctx.fillStyle = grad;
        ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
        drawProps(ctx, area, time);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      for (let y = KITCHEN.bottom + 20; y < worldH; y += 34) {
        ctx.beginPath();
        ctx.moveTo(box.x0, y);
        ctx.lineTo(box.x1, y);
        ctx.stroke();
      }

      const isPark = stage().id === "park";

      /* --- 作業場（歩いて入れる） --- */
      for (const area of openAreas(state)) {
        if (area.rect.y0 !== 0) continue;
        const { x0, x1 } = area.rect;
        ctx.fillStyle = "#2b241d";
        ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        for (let y = KITCHEN.top; y < KITCHEN.bottom; y += 22) {
          for (let x = x0; x < x1; x += 22) {
            if (((x + y) / 22) % 2 === 0) ctx.fillRect(x, y, 22, 22);
          }
        }
        ctx.strokeStyle = "rgba(246,231,207,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, KITCHEN.bottom);
        ctx.lineTo(x1, KITCHEN.bottom);
        ctx.stroke();

        // 看板（ラーメン屋はのれん、パークはゲート）
        ctx.fillStyle = isPark
          ? "#2f3a52"
          : area.price === 0
            ? "#c2402f"
            : "#8a5a3c";
        roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, isPark ? 14 : 6);
        ctx.fill();
        ctx.fillStyle = isPark ? "#ffd166" : "#f6e7cf";
        ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
        ctx.fillText(
          isPark
            ? area.price === 0
              ? "D R E A M   P A R K"
              : area.label.replace("をつくる", "")
            : area.price === 0
              ? "ら ー め ん"
              : "製 麺 所",
          (x0 + x1) / 2,
          20,
        );
        ctx.font = FONT;
        if (!isPark) {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          for (let i = 1; i < 5; i += 1) {
            ctx.fillRect(x0 + 10 + ((x1 - x0 - 20) / 5) * i - 1, 4, 2, 30);
          }
        }
      }

      /* --- 寸胴 --- */
      for (const stove of openStoves(state)) {
        const { x, y } = stove.pos;
        if (isPark) {
          // 券売所
          ctx.fillStyle = "#37507a";
          roundRect(ctx, x - 28, y - 30, 56, 44, 7);
          ctx.fill();
          ctx.fillStyle = "#4d6b9e";
          roundRect(ctx, x - 28, y - 30, 56, 10, 5);
          ctx.fill();
          ctx.fillStyle = "#16202c";
          roundRect(ctx, x - 20, y - 16, 40, 16, 4);
          ctx.fill();
          ctx.fillStyle = "#ffd166";
          roundRect(ctx, x - 12, y + 4, 24, 5, 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,209,102,${0.4 + 0.4 * Math.abs(Math.sin(time * 2))})`;
          ctx.beginPath();
          ctx.arc(x + 20, y - 24, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
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
        }

        const ready = state.ready[stove.id] ?? 0;
        for (let i = 0; i < ready; i += 1) bowl(ctx, x, y + 22 - i * 5.5);
        if (ready >= stoveCapacity(state)) {
          ctx.fillStyle = "#ffd166";
          ctx.fillText("満杯", x, y + 36);
        }
      }

      /* --- カウンター --- */
      if (!isPark) {
        ctx.fillStyle = "#6b4a2f";
        roundRect(ctx, 16, 306, 328, 34, 10);
        ctx.fill();
        ctx.fillStyle = "#8a6440";
        roundRect(ctx, 16, 306, 328, 11, 6);
        ctx.fill();
      }

      for (const seat of openSeats(state)) {
        if (isPark) {
          // アトラクション（区画の色に合わせた乗り物）
          const area = openAreas(state).find((item) => item.id === `area-${seat.area}`);
          const tint = area?.palette.floor ?? "#5b6b8c";
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(seat.pos.x, seat.pos.y + 16, 34, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#2a2f3c";
          roundRect(ctx, seat.pos.x - 32, seat.pos.y - 6, 64, 20, 8);
          ctx.fill();
          ctx.fillStyle = tint;
          roundRect(ctx, seat.pos.x - 26, seat.pos.y - 34, 52, 30, 8);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          roundRect(ctx, seat.pos.x - 26, seat.pos.y - 34, 52, 8, 4);
          ctx.fill();
          ctx.strokeStyle = "#ffd166";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            seat.pos.x,
            seat.pos.y - 20,
            13,
            time * 1.5,
            time * 1.5 + Math.PI * 1.4,
          );
          ctx.stroke();
        } else if (seat.area === 0) {
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

      /* --- 区画の仕切り --- */
      for (const area of openAreas(state)) {
        if (area.price === 0 || area.rect.y0 === 0) continue;
        ctx.strokeStyle = "rgba(246,231,207,0.14)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(
          area.rect.x0 + 1,
          area.rect.y0 + 1,
          area.rect.x1 - area.rect.x0 - 2,
          area.rect.y1 - area.rect.y0 - 2,
        );
        ctx.setLineDash([]);
        ctx.font = SMALL;
        ctx.fillStyle = "rgba(246,231,207,0.4)";
        ctx.fillText(
          area.label.replace("をつくる", ""),
          (area.rect.x0 + area.rect.x1) / 2,
          area.rect.y0 + 14,
        );
        ctx.font = FONT;
      }

      /* --- この先に広げられる柵 --- */
      const openIds = new Set(openAreas(state).map((area) => area.id));
      for (const area of areas) {
        if (openIds.has(area.id)) continue;
        // 店の内側に残っている工事中の区画は、面ごと塗って入れなくする
        const ix0 = Math.max(area.rect.x0, box.x0);
        const iy0 = Math.max(area.rect.y0, box.y0);
        const ix1 = Math.min(area.rect.x1, box.x1);
        const iy1 = Math.min(area.rect.y1, outsideTop(state));
        if (ix1 > ix0 && iy1 > iy0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(ix0, iy0, ix1 - ix0, iy1 - iy0);
          ctx.clip();
          ctx.fillStyle = "#150f0c";
          ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
          ctx.fillStyle = "rgba(255,209,102,0.07)";
          for (let x = ix0 - 40; x < ix1 + 40; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, iy0);
            ctx.lineTo(x + 15, iy0);
            ctx.lineTo(x + 15 - (iy1 - iy0), iy1);
            ctx.lineTo(x - (iy1 - iy0), iy1);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          ctx.fillStyle = "rgba(246,231,207,0.5)";
          ctx.font = SMALL;
          ctx.fillText("工事中", (ix0 + ix1) / 2, (iy0 + iy1) / 2);
          ctx.font = FONT;
          continue;
        }

        const below = area.rect.y0 >= box.y1;
        const right = area.rect.x0 >= box.x1;
        if (!below && !right) continue;
        const bx = below ? area.rect.x0 : box.x1 - 16;
        const by = below ? box.y1 - 16 : area.rect.y0;
        const bw = below ? area.rect.x1 - area.rect.x0 : 16;
        const bh = below ? 16 : Math.min(area.rect.y1, box.y1) - area.rect.y0;
        if (bw <= 0 || bh <= 0) continue;
        ctx.fillStyle = "#191310";
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "rgba(255,209,102,0.16)";
        if (below) {
          for (let x = bx - 20; x < bx + bw + 20; x += 26) {
            ctx.beginPath();
            ctx.moveTo(x, by);
            ctx.lineTo(x + 13, by);
            ctx.lineTo(x + 26, by + bh);
            ctx.lineTo(x + 13, by + bh);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          for (let y = by - 20; y < by + bh + 20; y += 26) {
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx, y + 13);
            ctx.lineTo(bx + bw, y + 26);
            ctx.lineTo(bx + bw, y + 13);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      /* --- 店の外（歩道と道路） --- */
      const top = outsideTop(state);
      ctx.fillStyle = "#332e28";
      ctx.fillRect(box.x0, top, box.x1 - box.x0, 44);
      ctx.fillStyle = "#1c1b1d";
      ctx.fillRect(box.x0, top + 44, box.x1 - box.x0, OUTSIDE_DEPTH - 44);
      ctx.strokeStyle = "rgba(246,231,207,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(box.x0, top + 44);
      ctx.lineTo(box.x1, top + 44);
      ctx.stroke();
      ctx.strokeStyle = "rgba(246,231,207,0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 14]);
      ctx.beginPath();
      ctx.moveTo(box.x0, top + 92);
      ctx.lineTo(box.x1, top + 92);
      ctx.stroke();
      ctx.setLineDash([]);

      // 店の壁と入口
      ctx.fillStyle = "#241d18";
      ctx.fillRect(box.x0, top - 10, box.x1 - box.x0, 10);
      const entrance = entrancePos(state);
      ctx.fillStyle = "#0f0c0a";
      roundRect(ctx, entrance.x - 34, top - 12, 68, 14, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(246,231,207,0.5)";
      ctx.font = SMALL;
      ctx.fillText("入口", entrance.x, top - 5);
      ctx.font = FONT;

      // 街灯
      const lampX = box.x0 + 40;
      ctx.fillStyle = "#3a4048";
      ctx.fillRect(lampX - 2, top + 46, 4, 40);
      ctx.fillStyle = "rgba(255,225,160,0.9)";
      ctx.beginPath();
      ctx.arc(lampX, top + 44, 5, 0, Math.PI * 2);
      ctx.fill();
      const lamp = ctx.createRadialGradient(lampX, top + 52, 2, lampX, top + 52, 54);
      lamp.addColorStop(0, "rgba(255,215,140,0.18)");
      lamp.addColorStop(1, "rgba(255,215,140,0)");
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(lampX, top + 52, 54, 0, Math.PI * 2);
      ctx.fill();

      /* --- 導入した設備の見た目 --- */
      for (const item of equipment) {
        if (!hasEquip(state, item.id)) continue;
        const at = equipPos(state, item);
        shadow(ctx, at.x, at.y + 16, 18);
        drawEquip(ctx, item.id, at.x, at.y, time);
      }

      /* --- 飾りと入口 --- */

      /* --- 枠（買い物する場所） --- */
      for (const pad of availablePads(state)) {
        const at = padPosOf(state, pad);
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
          at.x - PAD_RADIUS,
          at.y - PAD_RADIUS + 4,
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
            at.x - PAD_RADIUS,
            at.y + PAD_RADIUS - 4 - h,
            PAD_RADIUS * 2,
            h,
            10,
          );
          ctx.fill();
        }

        if (pad.kind === "upgrade") {
          ctx.font = SMALL;
          ctx.fillStyle = "#9fe6bd";
          ctx.fillText(`Lv${level}`, at.x, at.y - 16);
          ctx.font = FONT;
        }
        ctx.fillStyle = "#eafff2";
        ctx.fillText(pad.label, at.x, at.y - 3);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(formatYen(Math.max(0, price - paid)), at.x, at.y + 12);
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
        master: "#2f3b4d",
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
              if (worker.kind === "master") {
                // 鉢巻き
                ctx.fillStyle = "#d94f3d";
                roundRect(ctx, worker.pos.x - 8, worker.pos.y - 25, 16, 4, 2);
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
      const skin = equippedSkin();
      actors.push({
        y: player.pos.y,
        render: () => {
          person(ctx, player.pos.x, player.pos.y, skin.coat, skin.head, player.step);
          if (skin.hat === "none") {
            ctx.fillStyle = "#f6e7cf";
            roundRect(ctx, player.pos.x - 8, player.pos.y - 29, 16, 6, 3);
            ctx.fill();
          } else {
            drawHat(
              ctx,
              skin.hat,
              skin.hatColor ?? "#f6e7cf",
              player.pos.x,
              player.pos.y,
            );
          }
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
      const bannerY = camY + canvas.height / scale - 46;
      roundRect(ctx, camX + WORLD.w / 2 - width / 2, bannerY, width, 24, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,209,102,0.45)";
      ctx.lineWidth = 1;
      roundRect(ctx, camX + WORLD.w / 2 - width / 2, bannerY, width, 24, 12);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.fillText(objective.label, camX + WORLD.w / 2, bannerY + 13);
      ctx.restore();

      /* --- 長押しの説明 --- */
      const info = inspect.current?.data;
      if (info) {
        ctx.font = FONT;
        const lines = info.lines;
        const width =
          Math.max(
            ctx.measureText(info.title).width + 8,
            ...lines.map((line) => ctx.measureText(line).width),
          ) + 22;
        const height = 26 + lines.length * 15;
        const cx = Math.min(
          camX + WORLD.w - width / 2 - 6,
          Math.max(camX + width / 2 + 6, info.pos.x),
        );
        let top = info.pos.y - height - 30;
        if (top < 6) top = Math.min(worldH - height - 6, info.pos.y + 30);

        ctx.strokeStyle = "rgba(255,209,102,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(info.pos.x, info.pos.y, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(12,9,7,0.94)";
        roundRect(ctx, cx - width / 2, top, width, height, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,209,102,0.55)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, cx - width / 2, top, width, height, 12);
        ctx.stroke();

        ctx.fillStyle = "#ffd166";
        ctx.font = `800 12px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
        ctx.fillText(info.title, cx, top + 15);
        ctx.font = FONT;
        ctx.fillStyle = "#e8ddcd";
        lines.forEach((line, i) => {
          ctx.fillText(line, cx, top + 33 + i * 15);
        });
      }

      /* --- ジョイスティック --- */
      const s = stick.current;
      if (s && !info) {
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
      // 横幅にぴったり合わせ、縦は店の広さに応じてスクロールする
      const fit = rect.width / WORLD.w;
      scale = fit * dpr;
      ox = 0;
      oy = 0;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const toWorld = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const fit = rect.width / WORLD.w;
      return {
        x: (event.clientX - rect.left) / fit + camera.current.x,
        y: (event.clientY - rect.top) / fit + camera.current.y,
      };
    };

    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      unlockAudio();
      canvas.setPointerCapture(event.pointerId);
      const point = toWorld(event);
      stick.current = {
        id: event.pointerId,
        origin: point,
        at: point,
        downAt: performance.now(),
        moved: false,
      };
    };
    const onMove = (event: PointerEvent) => {
      const s = stick.current;
      if (!s || s.id !== event.pointerId) return;
      s.at = toWorld(event);
      const dx = s.at.x - s.origin.x;
      const dy = s.at.y - s.origin.y;
      const len = Math.hypot(dx, dy);
      if (len > 12) s.moved = true;
      if (len < 4 || inspect.current) {
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
      // 指を離しても少しのあいだ読めるように残す
      if (inspect.current) inspect.current.until = performance.now() + 2200;
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
      // 長押し（動かさずに 380ms）でその場所の説明を出す
      const s = stick.current;
      if (s && !s.moved && !inspect.current && now - s.downAt > 380) {
        const found = inspectAt(state, s.origin);
        if (found) {
          inspect.current = { data: found, until: Infinity };
          input.current = { x: 0, y: 0 };
        } else {
          s.moved = true;
        }
      }
      if (inspect.current && now > inspect.current.until) inspect.current = null;

      const move: Input =
        inspect.current !== null
          ? { x: 0, y: 0 }
          : kx || ky
            ? { x: kx, y: ky }
            : input.current;

      if (!pausedRef.current && !document.hidden) update(state, move, dt);

      // カメラ: 店が画面より広いぶんだけ、店主を追って縦横に動く
      {
        const box = worldBounds(state);
        const viewW = canvas.width / scale;
        const viewH = canvas.height / scale;
        const worldW = box.x1 - box.x0;
        const worldH2 = box.y1 - box.y0;
        const targetX =
          worldW <= viewW
            ? box.x0 - (viewW - worldW) / 2
            : Math.min(
                Math.max(state.player.pos.x - viewW / 2, box.x0),
                box.x1 - viewW,
              );
        const targetY =
          worldH2 <= viewH
            ? box.y0 - (viewH - worldH2) / 2
            : Math.min(
                Math.max(state.player.pos.y - viewH / 2, box.y0),
                box.y1 - viewH,
              );
        const follow = Math.min(1, dt * 6);
        camera.current.x += (targetX - camera.current.x) * follow;
        camera.current.y += (targetY - camera.current.y) * follow;
        ox = -camera.current.x * scale;
        oy = -camera.current.y * scale;
      }

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
