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
  AUTO_TIME,
  autoPos,
  boothPos,
  hasGate,
  turnstilePos,
  customerDraw,
  hasAuto,
  openSeats,
  openStoves,
  seatCost,
  seatMode,
  isDirty,
  shelfStock,
  SHELF_MAX,
  stoveItem,
  isStation,
  holdCap,
  stoveById,
  type ItemKind,
  type StoveSpec,
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
import {
  catchUp,
  equippedSkin,
  equippedStars,
  getState,
  save,
} from "@/lib/shopStore";
import type { Face, Hat } from "@/data/skins";
import { formatYen } from "@/lib/format";
import { isMuted, loadMuted, playCombo, playSound, unlockAudio } from "@/lib/sfx";

export type Sample = {
  money: number;
  carry: number;
  maxCarry: number;
  /** いま持っているものの種類 */
  item: ItemKind | null;
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

const FLAGS = ["#ff6b6b", "#ffd166", "#6bd3ff", "#a78bfa", "#7ee7a8", "#ff9f68"];

/** 万国旗（テーマパークらしさの素） */
const bunting = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  sway = 0,
) => {
  const width = x1 - x0;
  if (width <= 20) return;
  const sag = (x: number) => Math.sin(((x - x0) / width) * Math.PI) * 11;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4) {
    if (x === x0) ctx.moveTo(x, y + sag(x));
    else ctx.lineTo(x, y + sag(x));
  }
  ctx.stroke();
  const count = Math.floor((width - 16) / 24);
  for (let i = 0; i < count; i += 1) {
    const x = x0 + 14 + i * 24;
    const top = y + sag(x);
    const tilt = Math.sin(sway + i * 0.6) * 2;
    ctx.fillStyle = FLAGS[i % FLAGS.length];
    ctx.beginPath();
    ctx.moveTo(x - 6, top);
    ctx.lineTo(x + 6, top);
    ctx.lineTo(x + tilt, top + 13);
    ctx.closePath();
    ctx.fill();
  }
};

/** 風船（ふわふわ） */
const balloons = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
) => {
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    const bx = x + (i - 1) * 11;
    const by = y - 34 + Math.sin(time * 1.6 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + bx) / 2, y - 18, bx, by + 9);
    ctx.stroke();
    ctx.fillStyle = FLAGS[i % FLAGS.length];
    ctx.beginPath();
    ctx.ellipse(bx, by, 7, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(bx - 2.4, by - 3, 2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** 電飾つきのポール */
const lampPost = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
) => {
  ctx.fillStyle = "#e6e2d4";
  ctx.fillRect(x - 2, y - 40, 4, 40);
  const glow = 0.55 + Math.sin(time * 2 + x) * 0.25;
  ctx.fillStyle = `rgba(255,225,150,${glow})`;
  ctx.beginPath();
  ctx.arc(x, y - 44, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,225,150,${glow * 0.16})`;
  ctx.beginPath();
  ctx.arc(x, y - 44, 18, 0, Math.PI * 2);
  ctx.fill();
};

/** 区画の左右に置く、テーマごとの小物 */
const sideDecor = (
  ctx: CanvasRenderingContext2D,
  rect: { x0: number; y0: number; x1: number; y1: number },
  prop: string,
  time: number,
) => {
  const left = rect.x0 + 42;
  const right = rect.x1 - 42;
  const y = rect.y0 + (rect.y1 - rect.y0) * 0.42;

  if (prop === "castle") {
    // きのこの家
    ctx.fillStyle = "#f6e7cf";
    roundRect(ctx, left - 12, y - 14, 24, 26, 4);
    ctx.fill();
    ctx.fillStyle = "#3a2f45";
    roundRect(ctx, left - 5, y - 2, 10, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#e8574a";
    ctx.beginPath();
    ctx.ellipse(left, y - 14, 22, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#fff3d9";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(left - 12 + i * 12, y - 20 + (i % 2) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // 大きな花
    for (let i = 0; i < 3; i += 1) {
      const fx = right - 16 + i * 16;
      const fy = y + 6 - (i % 2) * 10;
      ctx.strokeStyle = "#4c6b45";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 14);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = FLAGS[i % FLAGS.length];
      for (let k = 0; k < 5; k += 1) {
        const a = (k / 5) * Math.PI * 2 + time * 0.4;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 3.4, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (prop === "snow") {
    // かまくら
    ctx.fillStyle = "#eaf3ff";
    ctx.beginPath();
    ctx.arc(left, y + 8, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#93b6d6";
    ctx.beginPath();
    ctx.arc(left, y + 8, 9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,209,102,${0.4 + Math.abs(Math.sin(time * 2)) * 0.4})`;
    ctx.beginPath();
    ctx.arc(left, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
    // 氷の彫刻
    ctx.fillStyle = "rgba(200,235,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(right - 12, y + 12);
    ctx.lineTo(right, y - 26);
    ctx.lineTo(right + 12, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(right - 5, y + 12);
    ctx.lineTo(right, y - 20);
    ctx.lineTo(right + 3, y + 12);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (prop === "cactus") {
    // 給水塔
    ctx.fillStyle = "#6b5433";
    ctx.fillRect(left - 14, y - 4, 4, 24);
    ctx.fillRect(left + 10, y - 4, 4, 24);
    ctx.fillStyle = "#8a6a42";
    roundRect(ctx, left - 18, y - 26, 36, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#5d3f26";
    ctx.beginPath();
    ctx.moveTo(left - 21, y - 26);
    ctx.lineTo(left, y - 40);
    ctx.lineTo(left + 21, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c9a94a";
    ctx.fillRect(left - 18, y - 16, 36, 2);
    // 樽
    for (let i = 0; i < 3; i += 1) {
      const bx = right - 16 + (i % 2) * 18;
      const by = y + 10 - Math.floor(i / 2) * 16;
      ctx.fillStyle = "#8a5a2b";
      roundRect(ctx, bx - 8, by - 12, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#5d3f26";
      ctx.fillRect(bx - 8, by - 8, 16, 2);
      ctx.fillRect(bx - 8, by - 2, 16, 2);
    }
    return;
  }
  if (prop === "ship") {
    // 宝箱
    ctx.fillStyle = "#7a4a2f";
    roundRect(ctx, left - 16, y - 6, 32, 18, 3);
    ctx.fill();
    ctx.fillStyle = "#9a6438";
    ctx.beginPath();
    ctx.arc(left, y - 6, 16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(left - 16, y - 4, 32, 3);
    ctx.beginPath();
    ctx.arc(left, y + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = i % 2 ? "#ffd166" : "#f4f1ea";
      ctx.beginPath();
      ctx.arc(left - 20 + i * 4, y + 14, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 灯台
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.moveTo(right - 11, y + 14);
    ctx.lineTo(right - 7, y - 34);
    ctx.lineTo(right + 7, y - 34);
    ctx.lineTo(right + 11, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8574a";
    ctx.fillRect(right - 9, y - 16, 18, 7);
    ctx.fillRect(right - 10.4, y + 2, 21, 7);
    ctx.fillStyle = `rgba(255,225,150,${0.5 + Math.abs(Math.sin(time * 1.6)) * 0.5})`;
    ctx.beginPath();
    ctx.arc(right, y - 38, 6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (prop === "star") {
    // パラボラアンテナ
    ctx.fillStyle = "#5a6285";
    ctx.fillRect(left - 2, y - 6, 4, 20);
    ctx.save();
    ctx.translate(left, y - 10);
    ctx.rotate(-0.5 + Math.sin(time * 0.6) * 0.15);
    ctx.fillStyle = "#c6cdf5";
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f9ad6";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // コンテナ
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = ["#5a6285", "#7a6bb5", "#4f9e83"][i];
      roundRect(ctx, right - 20 + (i % 2) * 20, y - 2 - Math.floor(i / 2) * 16, 18, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      roundRect(ctx, right - 20 + (i % 2) * 20, y - 2 - Math.floor(i / 2) * 16, 18, 4, 2);
      ctx.fill();
    }
    return;
  }
  if (prop === "fossil") {
    // 恐竜の卵の巣
    ctx.fillStyle = "#6b5433";
    ctx.beginPath();
    ctx.ellipse(left, y + 8, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = "#e7dcc0";
      ctx.beginPath();
      ctx.ellipse(left - 12 + i * 12, y + 2 - (i % 2) * 4, 7, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(140,120,80,0.4)";
      ctx.beginPath();
      ctx.arc(left - 12 + i * 12, y + 2 - (i % 2) * 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // シダの茂み
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      ctx.fillStyle = i % 2 ? "#4f7a44" : "#3f6437";
      ctx.beginPath();
      ctx.ellipse(
        right + Math.cos(a) * 14,
        y + 8 + Math.sin(a) * 16,
        7,
        14,
        a + Math.PI / 2 + Math.sin(time + i) * 0.03,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    return;
  }
};

/** 区画ごとの飾り（テーマの見分け） */
const drawProps = (
  ctx: CanvasRenderingContext2D,
  area: {
    rect: { x0: number; y0: number; x1: number; y1: number };
    palette: { prop: string };
  },
  time: number,
) => {
  const { rect, palette } = area;
  const park = stage().id === "park";
  const cx = (rect.x0 + rect.x1) / 2;
  const spots = [rect.x0 + 34, rect.x1 - 34];
  const baseY = rect.y1 - 40;

  if (park) {
    // 区画の上にかかる万国旗と、四隅の電飾ポール
    bunting(ctx, rect.x0 + 6, rect.x1 - 6, rect.y0 + (rect.y0 === 0 ? 232 : 30), time * 2);
    lampPost(ctx, rect.x0 + 18, rect.y1 - 16, time);
    lampPost(ctx, rect.x1 - 18, rect.y1 - 16, time);
    sideDecor(ctx, rect, palette.prop, time);
  }

  if (palette.prop === "castle") {
    // メルヘン: 奥にお城
    ctx.fillStyle = "#cbb6e6";
    roundRect(ctx, cx - 52, rect.y0 + 54, 104, 66, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 4; i += 1) {
      roundRect(ctx, cx - 40 + i * 24, rect.y0 + 78, 14, 20, 6);
      ctx.fill();
    }
    for (const tx of [cx - 52, cx, cx + 52]) {
      ctx.fillStyle = "#e6d9f7";
      roundRect(ctx, tx - 13, rect.y0 + 26, 26, 94, 5);
      ctx.fill();
      ctx.fillStyle = "#f06a8a";
      ctx.beginPath();
      ctx.moveTo(tx - 17, rect.y0 + 26);
      ctx.lineTo(tx, rect.y0 - 2);
      ctx.lineTo(tx + 17, rect.y0 + 26);
      ctx.closePath();
      ctx.fill();
      // 旗
      ctx.strokeStyle = "#f6e7cf";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, rect.y0 - 2);
      ctx.lineTo(tx, rect.y0 - 16);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(tx, rect.y0 - 16);
      ctx.lineTo(tx + 11 + Math.sin(time * 3 + tx) * 2, rect.y0 - 12);
      ctx.lineTo(tx, rect.y0 - 8);
      ctx.closePath();
      ctx.fill();
    }
    // 花壇
    for (const x of spots) {
      ctx.fillStyle = "#4c6b45";
      ctx.beginPath();
      ctx.ellipse(x, baseY + 10, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = FLAGS[(i + 1) % FLAGS.length];
        ctx.beginPath();
        ctx.arc(x - 14 + i * 7, baseY + 8 - (i % 2) * 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
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
    // 雪だるま
    const sx = cx + 96;
    const sy = rect.y0 + 92;
    ctx.fillStyle = "#f4f9ff";
    ctx.beginPath();
    ctx.arc(sx, sy, 15, 0, Math.PI * 2);
    ctx.arc(sx, sy - 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#28323f";
    ctx.beginPath();
    ctx.arc(sx - 3.4, sy - 22, 1.6, 0, Math.PI * 2);
    ctx.arc(sx + 3.4, sy - 22, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8763a";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 19);
    ctx.lineTo(sx + 9, sy - 17.5);
    ctx.lineTo(sx, sy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c2402f";
    roundRect(ctx, sx - 11, sy - 33, 22, 5, 2);
    ctx.fill();
    // 氷のアーチ
    ctx.strokeStyle = "rgba(200,235,255,0.5)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx - 70, rect.y0 + 110, 40, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 34; i += 1) {
      const px = rect.x0 + ((i * 97) % (rect.x1 - rect.x0));
      const py = rect.y0 + (((i * 53 + time * 22) % (rect.y1 - rect.y0)) | 0);
      ctx.fillRect(px, py, 2, 2);
    }
    return;
  }
  if (palette.prop === "cactus") {
    // サルーン
    const sx = cx;
    const sy = rect.y0 + 96;
    ctx.fillStyle = "#7a5433";
    roundRect(ctx, sx - 60, sy - 44, 120, 56, 3);
    ctx.fill();
    ctx.fillStyle = "#5d3f26";
    ctx.beginPath();
    ctx.moveTo(sx - 68, sy - 44);
    ctx.lineTo(sx - 46, sy - 62);
    ctx.lineTo(sx + 46, sy - 62);
    ctx.lineTo(sx + 68, sy - 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f2dcae";
    ctx.font = `800 11px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("SALOON", sx, sy - 52);
    ctx.font = FONT;
    ctx.fillStyle = "#3b2a1b";
    roundRect(ctx, sx - 16, sy - 22, 32, 34, 2);
    ctx.fill();
    ctx.fillStyle = "#8a6a42";
    roundRect(ctx, sx - 15, sy - 12, 14, 18, 1);
    ctx.fill();
    roundRect(ctx, sx + 1, sy - 12, 14, 18, 1);
    ctx.fill();
    for (const x of spots) {
      ctx.fillStyle = "#4f7a44";
      roundRect(ctx, x - 6, baseY - 44, 12, 46, 6);
      ctx.fill();
      roundRect(ctx, x - 20, baseY - 30, 14, 8, 4);
      ctx.fill();
      roundRect(ctx, x + 6, baseY - 38, 14, 8, 4);
      ctx.fill();
    }
    // 転がる草
    const tw = rect.x0 + ((time * 40) % (rect.x1 - rect.x0));
    ctx.strokeStyle = "rgba(210,180,120,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tw, baseY + 14, 8, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (palette.prop === "ship") {
    ctx.fillStyle = "#2b5560";
    ctx.fillRect(rect.x0, rect.y0 + 24, rect.x1 - rect.x0, 74);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 6; i += 1) {
      const wy = rect.y0 + 38 + i * 11;
      ctx.beginPath();
      for (let x = rect.x0; x <= rect.x1; x += 8) {
        const y = wy + Math.sin(x * 0.06 + time * 1.4 + i) * 2.6;
        if (x === rect.x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // 停泊する帆船
    const bob = Math.sin(time * 1.1) * 3;
    ctx.fillStyle = "#6b4a2f";
    ctx.beginPath();
    ctx.moveTo(cx - 52, rect.y0 + 62 + bob);
    ctx.lineTo(cx + 52, rect.y0 + 62 + bob);
    ctx.lineTo(cx + 36, rect.y0 + 84 + bob);
    ctx.lineTo(cx - 36, rect.y0 + 84 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a6440";
    ctx.fillRect(cx - 2, rect.y0 - 4 + bob, 4, 66);
    ctx.fillStyle = "#f2e3c6";
    ctx.beginPath();
    ctx.moveTo(cx + 2, rect.y0 + 2 + bob);
    ctx.quadraticCurveTo(cx + 34, rect.y0 + 26 + bob, cx + 2, rect.y0 + 52 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1c1c22";
    ctx.beginPath();
    ctx.arc(cx - 16, rect.y0 - 6 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.arc(cx - 17.6, rect.y0 - 7.6 + bob, 1.4, 0, Math.PI * 2);
    ctx.arc(cx - 14.4, rect.y0 - 7.6 + bob, 1.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (palette.prop === "star") {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 46; i += 1) {
      const px = rect.x0 + ((i * 131) % (rect.x1 - rect.x0));
      const py = rect.y0 + ((i * 79) % (rect.y1 - rect.y0));
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.6 + i));
      ctx.globalAlpha = tw;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;
    // 惑星と輪
    ctx.fillStyle = "#9aa6ff";
    ctx.beginPath();
    ctx.arc(rect.x1 - 64, rect.y0 + 58, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(rect.x1 - 74, rect.y0 + 48, 9, 0, Math.PI * 2);
    ctx.arc(rect.x1 - 54, rect.y0 + 68, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,210,255,0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(rect.x1 - 64, rect.y0 + 58, 48, 11, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    // 管制塔
    const tx = rect.x0 + 56;
    const ty = rect.y0 + 106;
    ctx.fillStyle = "#5a6285";
    roundRect(ctx, tx - 8, ty - 60, 16, 60, 4);
    ctx.fill();
    ctx.fillStyle = "#8f9ad6";
    roundRect(ctx, tx - 22, ty - 76, 44, 20, 8);
    ctx.fill();
    ctx.fillStyle = `rgba(126,231,168,${0.4 + Math.abs(Math.sin(time * 2)) * 0.5})`;
    ctx.beginPath();
    ctx.arc(tx, ty - 82, 4, 0, Math.PI * 2);
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
    // 発掘現場の骨組み
    ctx.strokeStyle = "#d9d3b8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 56, rect.y0 + 96);
    ctx.quadraticCurveTo(cx, rect.y0 + 34, cx + 56, rect.y0 + 96);
    ctx.stroke();
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 15, rect.y0 + 58 + Math.abs(i) * 7);
      ctx.lineTo(cx + i * 15, rect.y0 + 82 + Math.abs(i) * 5);
      ctx.stroke();
    }
    // ヤシの木
    for (const x of [rect.x0 + 40, rect.x1 - 46]) {
      const ty = rect.y0 + 120;
      ctx.fillStyle = "#6b5433";
      ctx.fillRect(x - 3, ty - 52, 6, 52);
      ctx.fillStyle = "#4f7a44";
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i - 2) * 0.55 + Math.sin(time + i) * 0.05;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(a) * 17,
          ty - 52 + Math.sin(a) * 11,
          17,
          6,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    return;
  }
  if (palette.prop === "diner") {
    // レストラン街: ネオンの看板とテーブルの並ぶ通り
    ctx.fillStyle = "#5d3535";
    ctx.fillRect(rect.x0, rect.y0 + 24, rect.x1 - rect.x0, 56);
    ctx.fillStyle = "#3a2222";
    for (let x = rect.x0; x < rect.x1; x += 40) {
      ctx.fillRect(x + 6, rect.y0 + 30, 26, 44);
    }
    ctx.fillStyle = `rgba(255,120,90,${0.5 + Math.abs(Math.sin(time * 2)) * 0.5})`;
    ctx.font = `800 16px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("R E S T A U R A N T", cx, rect.y0 + 52);
    ctx.font = FONT;
    // 通りのパラソル
    for (const x of spots) {
      ctx.fillStyle = "#8a6440";
      ctx.fillRect(x - 2, baseY - 34, 4, 34);
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 ? "#e8574a" : "#fff3d9";
        ctx.beginPath();
        ctx.moveTo(x, baseY - 36);
        ctx.arc(x, baseY - 18, 24, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }
  if (palette.prop === "market") {
    // おみやげ通り: 提灯の並ぶアーケード
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x0 + 8, rect.y0 + 40);
    ctx.lineTo(rect.x1 - 8, rect.y0 + 40);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const lx = rect.x0 + 30 + i * ((rect.x1 - rect.x0 - 60) / 7);
      const glow = 0.5 + Math.abs(Math.sin(time * 2 + i)) * 0.5;
      ctx.fillStyle = `rgba(255,170,120,${glow})`;
      ctx.beginPath();
      ctx.ellipse(lx, rect.y0 + 52, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a4a2f";
      ctx.fillRect(lx - 7, rect.y0 + 46, 14, 2);
      ctx.fillRect(lx - 7, rect.y0 + 58, 14, 2);
    }
    ctx.fillStyle = "#ffd166";
    ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("お み や げ 通 り", cx, rect.y0 + 84);
    ctx.font = FONT;
    // 積み上げた木箱
    for (const x of spots) {
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = ["#8a6440", "#a9743f", "#7a5433"][i];
        roundRect(ctx, x - 14 + (i % 2) * 10, baseY - 14 - i * 12, 22, 12, 2);
        ctx.fill();
      }
    }
    return;
  }
  if (park && palette.prop === "none") {
    // 入口広場: 噴水と花壇と風船
    const fx = cx;
    const fy = rect.y0 + 264;
    ctx.fillStyle = "#3f5f86";
    ctx.beginPath();
    ctx.ellipse(fx, fy, 32, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6fa8d6";
    ctx.beginPath();
    ctx.ellipse(fx, fy - 2, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(220,245,255,0.7)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const h = 14 + Math.sin(time * 3 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 10);
      ctx.quadraticCurveTo(
        fx + Math.cos(a) * 8,
        fy - 10 - h,
        fx + Math.cos(a) * 16,
        fy - 3,
      );
      ctx.stroke();
    }
    ctx.fillStyle = "#e6eef7";
    roundRect(ctx, fx - 4, fy - 26, 8, 18, 4);
    ctx.fill();
    balloons(ctx, rect.x0 + 26, rect.y0 + 252, time);
    return;
  }
};

/** 料理の皿 */
const plate = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.ellipse(x, y, 9 * s, 5.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9d2c4";
  ctx.beginPath();
  ctx.ellipse(x, y, 9 * s, 5.4 * s, 0, 0.2, Math.PI - 0.2);
  ctx.fill();
  ctx.fillStyle = "#e8574a";
  ctx.beginPath();
  ctx.ellipse(x, y - 1.4 * s, 4.6 * s, 2.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7ee7a8";
  ctx.beginPath();
  ctx.arc(x + 2.6 * s, y - 2.2 * s, 1.4 * s, 0, Math.PI * 2);
  ctx.fill();
};

/** おみやげの箱 */
const parcel = (ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) => {
  ctx.fillStyle = "#c8a165";
  roundRect(ctx, x - 8 * s, y - 6 * s, 16 * s, 12 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#e8574a";
  ctx.fillRect(x - 1.4 * s, y - 6 * s, 2.8 * s, 12 * s);
  ctx.fillRect(x - 8 * s, y - 1.4 * s, 16 * s, 2.8 * s);
  ctx.fillStyle = "#f0a6c0";
  ctx.beginPath();
  ctx.arc(x - 2 * s, y - 7 * s, 2 * s, 0, Math.PI * 2);
  ctx.arc(x + 2 * s, y - 7 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
};

/** 持ちものの絵（種類で変わる） */
/** ワーキングプラネットの工程の品（種類ごとに色と形を変える） */
const chainItem = (
  ctx: CanvasRenderingContext2D,
  item: string,
  x: number,
  y: number,
  s: number,
  time: number,
) => {
  const spec: Record<
    string,
    { body: string; cap: string; steam?: boolean; log?: boolean }
  > = {
    meat: { body: "#c0503f", cap: "#e0d8c8" }, // なま肉（赤身＋骨）
    wood: { body: "#8a5a2b", cap: "#a9743f", log: true }, // まき
    roast: { body: "#7a4325", cap: "#4a2a15", steam: true }, // 焼き肉
    cut: { body: "#d98a7a", cap: "#b56553" }, // 切り身
    feast: { body: "#c8843f", cap: "#8a5220", steam: true }, // ごちそう
  };
  const it = spec[item] ?? { body: "#b98a4a", cap: "#7a5a2b" };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 4, 6);
  if (it.log) {
    // まきは横向きの丸太
    ctx.fillStyle = it.body;
    roundRect(ctx, -7, -3, 14, 6, 2);
    ctx.fill();
    ctx.fillStyle = it.cap;
    ctx.beginPath();
    ctx.ellipse(7, 0, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = it.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = it.cap;
  ctx.beginPath();
  ctx.ellipse(0, -4, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (it.steam) {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let i = 0; i < 2; i += 1) {
      const t = (time * 0.6 + i * 0.5) % 1;
      ctx.beginPath();
      ctx.arc(Math.sin(t * 6 + i) * 3, -8 - t * 12, 2.4 - t * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

const held = (
  ctx: CanvasRenderingContext2D,
  item: ItemKind | null,
  x: number,
  y: number,
  s = 1,
) => {
  if (item === null) return;
  if (item === "food") plate(ctx, x, y, s);
  else if (item === "goods") parcel(ctx, x, y, s);
  else if (item === "main") bowl(ctx, x, y, s);
  else chainItem(ctx, item, x, y, s, performance.now() / 1000);
};

/**
 * ワーキングプラネットの作業場。
 * 素材の採取場（takes なし）と、加工場（takes あり）で見た目を変える。
 */
const drawFireStation = (
  ctx: CanvasRenderingContext2D,
  stove: StoveSpec,
  x: number,
  y: number,
  time: number,
  state: ShopState,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const art = stove.art ?? "";
  if (art === "hunt") {
    // 狩り場: 草むらと、立てかけた槍
    ctx.fillStyle = "#3f5a34";
    for (const gx of [-16, -6, 5, 15]) {
      ctx.beginPath();
      ctx.moveTo(x + gx, y + 6);
      ctx.lineTo(x + gx - 3, y - 8);
      ctx.lineTo(x + gx + 3, y - 8);
      ctx.closePath();
      ctx.fill();
    }
    // 槍
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x - 4, y - 28);
    ctx.stroke();
    ctx.fillStyle = "#d8d2c4";
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 28);
    ctx.lineTo(x - 8, y - 20);
    ctx.lineTo(x, y - 22);
    ctx.closePath();
    ctx.fill();
    // 足あと
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (const [dx, dy] of [[10, -6], [16, -14], [12, -20]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, 2.2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (art === "logs") {
    // まき集め: 積んだ丸太
    for (let r = 0; r < 2; r += 1) {
      for (let i = 0; i < 3 - r; i += 1) {
        const lx = x - 16 + r * 8 + i * 16;
        const ly = y + 2 - r * 9;
        ctx.fillStyle = "#6b4a2b";
        roundRect(ctx, lx - 8, ly - 4, 16, 8, 3);
        ctx.fill();
        ctx.fillStyle = "#a9743f";
        ctx.beginPath();
        ctx.ellipse(lx + 8, ly, 2.6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (art === "cut") {
    // さばき台: 切り株の台と、石のナイフ
    ctx.fillStyle = "#5a3a20";
    roundRect(ctx, x - 16, y - 6, 32, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#6e4a2a";
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c8c2b4";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 8);
    ctx.lineTo(x + 14, y - 18);
    ctx.stroke();
  } else {
    // たき火・大かまど（焼き場）
    ctx.fillStyle = "#4a4038";
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 18, y + 6 + Math.sin(a) * 6, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // まきの土台
    ctx.fillStyle = "#5a3a20";
    ctx.fillRect(x - 12, y - 2, 24, 5);
    ctx.fillRect(x - 3, y - 10, 6, 16);
    // 燃えているときだけ炎（まき切れなら小さく）
    const lit = (state.fuel[stove.id] ?? 0) > 0 || !stove.fuel;
    for (const fx of [x - 6, x, x + 6]) {
      const flame = (lit ? 0.6 : 0.15) + Math.abs(Math.sin(time * 6 + fx)) * (lit ? 0.4 : 0.1);
      ctx.fillStyle = `rgba(255,${120 + flame * 80},50,${flame})`;
      ctx.beginPath();
      ctx.moveTo(fx, y - 6);
      ctx.quadraticCurveTo(fx + 6, y - 18, fx, y - 26);
      ctx.quadraticCurveTo(fx - 6, y - 18, fx, y - 6);
      ctx.fill();
    }
  }
};

/** レストランのテーブル。皿が残っていると赤い合図が出る */
const drawTable = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
  dirty: boolean,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 店構え
  if (art === "steak") {
    ctx.fillStyle = "#7a4a2f";
    roundRect(ctx, x - 30, y - 52, 60, 26, 4);
    ctx.fill();
    ctx.fillStyle = "#e8574a";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x - 30 + i * 12, y - 26, 6, 6);
    }
    ctx.fillStyle = "#ffd166";
    ctx.font = SMALL;
    ctx.fillText("STEAK", x, y - 40);
    ctx.font = FONT;
  } else if (art === "cafe") {
    ctx.fillStyle = "#f0a6c0";
    roundRect(ctx, x - 30, y - 52, 60, 24, 6);
    ctx.fill();
    tentRoof(ctx, x, y - 28, 64, "#fdf1f6", "#f0a6c0");
    ctx.fillStyle = "#5d3f26";
    ctx.font = SMALL;
    ctx.fillText("CAFE", x, y - 42);
    ctx.font = FONT;
  } else if (art === "terrace") {
    // パラソルつきのテラス席
    ctx.fillStyle = "#8a6440";
    ctx.fillRect(x - 2, y - 50, 4, 34);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 ? "#e8574a" : "#fff3d9";
      ctx.beginPath();
      ctx.moveTo(x, y - 52);
      ctx.arc(x, y - 30, 30, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#c2402f";
    roundRect(ctx, x - 30, y - 52, 60, 24, 5);
    ctx.fill();
    ctx.fillStyle = "#fff3d9";
    ctx.font = SMALL;
    ctx.fillText("PASTA", x, y - 40);
    ctx.font = FONT;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let i = 0; i < 3; i += 1) {
      const t = (time * 0.6 + i * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t * 6 + i) * 5, y - 56 - t * 16, 4 - t * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // いす
  ctx.fillStyle = "#5d3f26";
  for (const cx of [x - 22, x + 22]) {
    roundRect(ctx, cx - 6, y - 12, 12, 14, 4);
    ctx.fill();
  }
  // テーブル
  ctx.fillStyle = "#8a6440";
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a9743f";
  ctx.beginPath();
  ctx.ellipse(x, y - 6, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f1ea";
  roundRect(ctx, x - 9, y - 12, 18, 6, 2);
  ctx.fill();

  if (dirty) {
    // 残った皿
    plate(ctx, x - 7, y - 8, 0.85);
    plate(ctx, x + 6, y - 6, 0.7);
    ctx.fillStyle = "#8a8f98";
    ctx.fillRect(x + 1, y - 12, 8, 1.6);
    ctx.fillStyle = `rgba(255,150,120,${0.4 + Math.abs(Math.sin(time * 4)) * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y - 24, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** お土産の棚。並んでいる数だけ商品が乗る */
const drawShelf = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
  stock: number,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 天幕と看板
  const tint =
    art === "sweets" ? "#f0a6c0" : art === "limited" ? "#ffd166" : "#6bd3ff";
  tentRoof(ctx, x, y - 44, 68, tint, "#fff3d9");
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, x - 26, y - 44, 52, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#fff3d9";
  ctx.font = SMALL;
  ctx.fillText(
    art === "sweets" ? "OKASHI" : art === "limited" ? "LIMITED" : "GOODS",
    x,
    y - 39,
  );
  ctx.font = FONT;

  // 棚
  ctx.fillStyle = "#7a5433";
  roundRect(ctx, x - 28, y - 32, 56, 34, 3);
  ctx.fill();
  ctx.fillStyle = "#5d3f26";
  ctx.fillRect(x - 28, y - 18, 56, 3);
  ctx.fillRect(x - 28, y - 4, 56, 3);

  // 並んでいる商品
  for (let i = 0; i < stock; i += 1) {
    const row = i < 2 ? 0 : 1;
    const col = i % 2;
    const px = x - 13 + col * 26;
    const py = y - 24 + row * 14;
    if (art === "sweets") {
      ctx.fillStyle = ["#e8574a", "#ffd166", "#7ee7a8", "#6bd3ff"][i % 4];
      roundRect(ctx, px - 8, py - 5, 16, 10, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px - 8, py - 1, 16, 1.6);
    } else if (art === "limited") {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px + 7, py + 4);
      ctx.lineTo(px - 7, py + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(time * 3 + i)) * 0.5})`;
      ctx.beginPath();
      ctx.arc(px, py - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ぬいぐるみ
      ctx.fillStyle = ["#f0a6c0", "#6bd3ff", "#7ee7a8", "#ffd166"][i % 4];
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.arc(px - 4, py - 5, 2.6, 0, Math.PI * 2);
      ctx.arc(px + 4, py - 5, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(px - 2, py - 1, 1, 0, Math.PI * 2);
      ctx.arc(px + 2, py - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stock === 0) {
    ctx.fillStyle = `rgba(255,209,102,${0.4 + Math.abs(Math.sin(time * 3)) * 0.4})`;
    ctx.font = SMALL;
    ctx.fillText("品切れ", x, y - 12);
    ctx.font = FONT;
  }
};

/** 小さな乗客（アトラクションに乗っている人） */
const rider = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coat: string,
  s = 1,
) => {
  ctx.fillStyle = coat;
  roundRect(ctx, x - 4 * s, y - 6 * s, 8 * s, 9 * s, 3.5 * s);
  ctx.fill();
  ctx.fillStyle = "#f0cfae";
  ctx.beginPath();
  ctx.arc(x, y - 8 * s, 3.4 * s, 0, Math.PI * 2);
  ctx.fill();
};

/** 天幕（縞のテント屋根） */
const tentRoof = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  a: string,
  b: string,
) => {
  const half = w / 2;
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i % 2 ? a : b;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x - half + (i * w) / 6, y);
    ctx.lineTo(x - half + ((i + 1) * w) / 6, y);
    ctx.closePath();
    ctx.fill();
  }
};

/**
 * アトラクション。名前ごとに1つずつ違う見た目を持つ。
 * 描く範囲は x±34 / y-52〜y+16 におさめる（改札と名札にかぶらないように）
 */
const drawRide = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 32, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (art) {
    /* ---------- 入口広場 ---------- */
    case "teacup": {
      // コーヒーカップ: 台が回り、カップも回る
      ctx.fillStyle = "#4a5d7a";
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 30, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [i, cup] of [-1, 1].entries()) {
        const a = time * 1.3 + i * Math.PI;
        const cxp = x + Math.cos(a) * 15;
        const cyp = y - 2 + Math.sin(a) * 5;
        ctx.fillStyle = i ? "#f0a6c0" : "#6bd3ff";
        ctx.beginPath();
        ctx.moveTo(cxp - 11, cyp - 12);
        ctx.lineTo(cxp + 11, cyp - 12);
        ctx.lineTo(cxp + 8, cyp + 2);
        ctx.lineTo(cxp - 8, cyp + 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = i ? "#f0a6c0" : "#6bd3ff";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(cxp + 12 * cup, cyp - 6, 4, -1.2, 1.2);
        ctx.stroke();
        ctx.fillStyle = "#fff6e2";
        ctx.beginPath();
        ctx.ellipse(cxp, cyp - 12, 11, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        rider(ctx, cxp, cyp - 12, "#e8574a", 0.8);
      }
      return;
    }
    case "panda": {
      // パンダライド: ばねの上で揺れる
      const tilt = Math.sin(time * 3) * 0.14;
      ctx.strokeStyle = "#8f9aa8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        ctx.arc(x, y + 4 - i * 4, 4, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.save();
      ctx.translate(x, y - 12);
      ctx.rotate(tilt);
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-14, -12, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(-20, -20, 4.4, 0, Math.PI * 2);
      ctx.arc(-8, -20, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-17, -12, 3.2, 4, 0.3, 0, Math.PI * 2);
      ctx.ellipse(-9, -12, 3.2, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 6, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, 6, -8, "#6bd3ff", 0.85);
      ctx.restore();
      return;
    }
    case "shooting": {
      // 射的コーナー: 的が横に流れる
      ctx.fillStyle = "#3a2f45";
      roundRect(ctx, x - 30, y - 26, 60, 34, 4);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 28, y - 24, 56, 20);
      ctx.clip();
      for (let i = 0; i < 4; i += 1) {
        const px = x - 28 + (((time * 26 + i * 22) % 68) | 0);
        ctx.fillStyle = FLAGS[i % FLAGS.length];
        ctx.beginPath();
        ctx.ellipse(px, y - 14, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2b2b33";
        ctx.beginPath();
        ctx.arc(px, y - 14, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#8a6440";
      roundRect(ctx, x - 32, y - 2, 64, 10, 3);
      ctx.fill();
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(x - 12, y - 6, 22, 3);
      tentRoof(ctx, x, y - 26, 68, "#e8574a", "#fff3d9");
      return;
    }
    case "wheel": {
      // ミニ観覧車
      ctx.fillStyle = "#6b7a8c";
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 12);
      ctx.lineTo(x - 2, y - 20);
      ctx.lineTo(x + 2, y - 20);
      ctx.lineTo(x + 16, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#dfe6f2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 22, 26, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const a = time * 0.8 + (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 22);
        ctx.lineTo(x + Math.cos(a) * 26, y - 22 + Math.sin(a) * 26);
        ctx.stroke();
        ctx.fillStyle = FLAGS[i % FLAGS.length];
        roundRect(
          ctx,
          x + Math.cos(a) * 26 - 5,
          y - 22 + Math.sin(a) * 26 - 2,
          10,
          9,
          3,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#dfe6f2";
      ctx.beginPath();
      ctx.arc(x, y - 22, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    /* ---------- メルヘンの丘 ---------- */
    case "carousel": {
      ctx.fillStyle = "#6a5a86";
      roundRect(ctx, x - 30, y - 2, 60, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#e8dcf6";
      ctx.fillRect(x - 2, y - 40, 4, 40);
      const horse = (a: number, i: number) => {
        const px = x + Math.cos(a) * 22;
        const py = y + 2 + Math.sin(a) * 6;
        ctx.fillStyle = "#f6e7cf";
        ctx.fillRect(px - 1.4, py - 24, 2.8, 24);
        const lift = Math.sin(time * 4 + i) * 3;
        ctx.fillStyle = "#fdf1f6";
        ctx.beginPath();
        ctx.ellipse(px, py - 16 + lift, 9, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + 7, py - 22 + lift, 5, 3.4, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f0a6c0";
        ctx.beginPath();
        ctx.moveTo(px - 8, py - 20 + lift);
        ctx.lineTo(px - 1, py - 22 + lift);
        ctx.lineTo(px - 4, py - 13 + lift);
        ctx.closePath();
        ctx.fill();
        rider(ctx, px, py - 20 + lift, "#6bd3ff", 0.75);
      };
      for (let i = 0; i < 3; i += 1) {
        const a = time * 1.6 + (i / 3) * Math.PI * 2;
        if (Math.sin(a) <= 0) horse(a, i);
      }
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = i % 2 ? "#f06a8a" : "#fdf1f6";
        ctx.beginPath();
        ctx.moveTo(x, y - 52);
        ctx.arc(
          x,
          y - 30,
          30,
          Math.PI + (i / 8) * Math.PI,
          Math.PI + ((i + 1) / 8) * Math.PI,
        );
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 3; i += 1) {
        const a = time * 1.6 + (i / 3) * Math.PI * 2;
        if (Math.sin(a) > 0) horse(a, i);
      }
      return;
    }
    case "balloonride": {
      // ゆめの気球
      const lift = Math.sin(time * 1.1) * 5;
      ctx.fillStyle = "#4c6b45";
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(0, -lift);
      const grad = ctx.createLinearGradient(x - 20, y - 50, x + 20, y - 20);
      grad.addColorStop(0, "#ff9f68");
      grad.addColorStop(0.5, "#ffd166");
      grad.addColorStop(1, "#f06a8a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.bezierCurveTo(x - 26, y - 26, x - 22, y - 52, x, y - 52);
      ctx.bezierCurveTo(x + 22, y - 52, x + 26, y - 26, x, y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - 52);
      ctx.lineTo(x, y - 8);
      ctx.stroke();
      ctx.strokeStyle = "#c8b48f";
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 10);
      ctx.lineTo(x - 7, y - 2);
      ctx.moveTo(x + 7, y - 10);
      ctx.lineTo(x + 7, y - 2);
      ctx.stroke();
      ctx.fillStyle = "#a9743f";
      roundRect(ctx, x - 9, y - 2, 18, 11, 3);
      ctx.fill();
      rider(ctx, x, y - 4, "#7ee7a8", 0.7);
      ctx.restore();
      return;
    }
    case "castleride": {
      // おとぎの城ツアー: 城の入口をトロッコが出入りする
      ctx.fillStyle = "#cbb6e6";
      roundRect(ctx, x - 28, y - 40, 56, 46, 4);
      ctx.fill();
      for (const tx of [x - 28, x + 28]) {
        ctx.fillStyle = "#e6d9f7";
        roundRect(ctx, tx - 7, y - 50, 14, 56, 3);
        ctx.fill();
        ctx.fillStyle = "#f06a8a";
        ctx.beginPath();
        ctx.moveTo(tx - 9, y - 50);
        ctx.lineTo(tx, y - 62);
        ctx.lineTo(tx + 9, y - 50);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#3a2f45";
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 6);
      ctx.lineTo(x - 12, y - 12);
      ctx.arc(x, y - 12, 12, Math.PI, 0);
      ctx.lineTo(x + 12, y + 6);
      ctx.closePath();
      ctx.fill();
      const t = (time * 0.5) % 1;
      const cxp = x - 26 + t * 52;
      ctx.globalAlpha = Math.abs(cxp - x) < 12 ? 0.25 : 1;
      ctx.fillStyle = "#f0a6c0";
      roundRect(ctx, cxp - 9, y - 2, 18, 10, 3);
      ctx.fill();
      rider(ctx, cxp, y - 2, "#ffd166", 0.7);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 9);
      ctx.lineTo(x + 30, y + 9);
      ctx.stroke();
      return;
    }

    /* ---------- 雪の国 ---------- */
    case "sled": {
      ctx.strokeStyle = "#cfe4f5";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 34, y + 6);
      ctx.quadraticCurveTo(x, y - 44, x + 34, y + 6);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      const curveY = (t: number) =>
        (1 - t) * (1 - t) * (y + 6) + 2 * (1 - t) * t * (y - 44) + t * t * (y + 6);
      for (let i = 0; i <= 6; i += 1) {
        const t = i / 6;
        const px = x - 34 + t * 68;
        ctx.beginPath();
        ctx.moveTo(px, curveY(t));
        ctx.lineTo(px, y + 12);
        ctx.stroke();
      }
      const t = (time * 0.5) % 1;
      const cxp = x - 34 + t * 68;
      const cyp = curveY(t);
      ctx.fillStyle = "#e8574a";
      roundRect(ctx, cxp - 10, cyp - 12, 20, 11, 4);
      ctx.fill();
      rider(ctx, cxp, cyp - 12, "#f4f1ea", 0.75);
      return;
    }
    case "rink": {
      // スケートリンク: 氷の楕円をすべる
      ctx.fillStyle = "#cfe8f7";
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 32, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 22, 11, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - 6, y - 6, 13, 7, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#8fb8d6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 32, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      const a = time * 1.6;
      const sx = x + Math.cos(a) * 20;
      const sy = y - 6 + Math.sin(a) * 9;
      rider(ctx, sx, sy, "#a78bfa", 1.1);
      const b = a + 2.4;
      rider(ctx, x + Math.cos(b) * 14, y - 4 + Math.sin(b) * 7, "#6bd3ff", 0.95);
      return;
    }
    case "penguin": {
      // ペンギンボート: 水路をボートが進む
      ctx.fillStyle = "#3f6b90";
      roundRect(ctx, x - 32, y - 12, 64, 26, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - 26, y - 6 + i * 8);
        ctx.lineTo(x + 26, y - 6 + i * 8 + Math.sin(time * 2 + i) * 2);
        ctx.stroke();
      }
      const t = (time * 0.4) % 1;
      const bx = x - 24 + t * 48;
      const by = y + 2 + Math.sin(time * 3) * 1.5;
      ctx.fillStyle = "#1f2a36";
      ctx.beginPath();
      ctx.ellipse(bx, by - 6, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f9ff";
      ctx.beginPath();
      ctx.ellipse(bx + 2, by - 5, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2a36";
      ctx.beginPath();
      ctx.arc(bx - 12, by - 13, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(bx - 19, by - 12);
      ctx.lineTo(bx - 26, by - 10);
      ctx.lineTo(bx - 19, by - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f4f9ff";
      ctx.beginPath();
      ctx.arc(bx - 13, by - 15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, bx + 6, by - 10, "#e8574a", 0.7);
      return;
    }

    /* ---------- ウェスタンの町 ---------- */
    case "showdown": {
      // ガンマンショー: 舞台の上で早撃ち
      ctx.fillStyle = "#7a5433";
      roundRect(ctx, x - 32, y - 6, 64, 20, 3);
      ctx.fill();
      ctx.fillStyle = "#5d3f26";
      ctx.fillRect(x - 32, y - 6, 64, 4);
      ctx.fillStyle = "#8a6a42";
      ctx.fillRect(x - 28, y - 40, 5, 34);
      ctx.fillRect(x + 23, y - 40, 5, 34);
      ctx.fillStyle = "#c2402f";
      roundRect(ctx, x - 32, y - 50, 64, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#f2dcae";
      ctx.font = SMALL;
      ctx.fillText("SHOW", x, y - 44);
      ctx.font = FONT;
      const step = Math.sin(time * 2.4) * 3;
      rider(ctx, x - 12 + step, y - 12, "#3b4a6b", 1.15);
      rider(ctx, x + 12 - step, y - 12, "#8a4a2f", 1.15);
      const flash = Math.max(0, Math.sin(time * 2.4 * 2));
      ctx.fillStyle = `rgba(255,220,120,${flash * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y - 16, 4 * flash + 1, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "wagon": {
      // 幌馬車ライド
      const roll = time * 2;
      ctx.fillStyle = "#8a6440";
      roundRect(ctx, x - 20, y - 12, 40, 16, 3);
      ctx.fill();
      ctx.fillStyle = "#f2e3c6";
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 12);
      ctx.quadraticCurveTo(x, y - 44, x + 20, y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120,90,60,0.5)";
      ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 7, y - 12);
        ctx.lineTo(x + i * 7, y - 34 + Math.abs(i) * 5);
        ctx.stroke();
      }
      for (const wx of [x - 13, x + 13]) {
        ctx.strokeStyle = "#5d3f26";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(wx, y + 6, 8, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 4; i += 1) {
          const a = roll + (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(wx, y + 6);
          ctx.lineTo(wx + Math.cos(a) * 8, y + 6 + Math.sin(a) * 8);
          ctx.stroke();
        }
      }
      // 馬
      ctx.fillStyle = "#a9743f";
      ctx.beginPath();
      ctx.ellipse(x + 30, y - 8, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 39, y - 17, 6, 4, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a5433";
      ctx.fillRect(x + 26, y - 3, 3, 9 + Math.sin(roll) * 2);
      ctx.fillRect(x + 34, y - 3, 3, 9 - Math.sin(roll) * 2);
      return;
    }
    case "minecart": {
      // 鉱山トロッコ
      ctx.fillStyle = "#4a3a2a";
      ctx.beginPath();
      ctx.moveTo(x - 34, y + 12);
      ctx.lineTo(x - 34, y - 12);
      ctx.arc(x - 16, y - 12, 18, Math.PI, 0);
      ctx.lineTo(x + 2, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8a7a5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 34, y + 8);
      ctx.lineTo(x + 34, y + 8);
      ctx.moveTo(x - 34, y + 13);
      ctx.lineTo(x + 34, y + 13);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - 30 + i * 12, y + 6);
        ctx.lineTo(x - 30 + i * 12, y + 15);
        ctx.stroke();
      }
      const t = (time * 0.6) % 1;
      const cxp = x - 30 + t * 58;
      ctx.globalAlpha = cxp < x - 6 ? 0.4 : 1;
      ctx.fillStyle = "#6b7a8c";
      roundRect(ctx, cxp - 11, y - 6, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(cxp - 6, y + 9, 3.4, 0, Math.PI * 2);
      ctx.arc(cxp + 6, y + 9, 3.4, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, cxp, y - 6, "#ffd166", 0.75);
      ctx.globalAlpha = 1;
      return;
    }

    /* ---------- 海賊の入江 ---------- */
    case "viking": {
      const swing = Math.sin(time * 1.4) * 0.5;
      ctx.strokeStyle = "#7d8794";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 24, y + 14);
      ctx.lineTo(x, y - 44);
      ctx.lineTo(x + 24, y + 14);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, y - 44);
      ctx.rotate(swing);
      ctx.strokeStyle = "#a8b0bb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 40);
      ctx.stroke();
      ctx.fillStyle = "#6b4a2f";
      ctx.beginPath();
      ctx.moveTo(-22, 40);
      ctx.lineTo(22, 40);
      ctx.lineTo(15, 54);
      ctx.lineTo(-15, 54);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(-22, 40, 44, 3);
      rider(ctx, -8, 40, "#e8574a", 0.8);
      rider(ctx, 8, 40, "#6bd3ff", 0.8);
      ctx.restore();
      return;
    }
    case "cannon": {
      // 大砲チャレンジ
      ctx.fillStyle = "#4a3a2a";
      roundRect(ctx, x - 22, y - 2, 40, 12, 4);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(x - 12, y + 10, 6, 0, Math.PI * 2);
      ctx.arc(x + 8, y + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x - 4, y - 6);
      ctx.rotate(-0.5 + Math.sin(time * 1.2) * 0.06);
      ctx.fillStyle = "#5a6270";
      roundRect(ctx, -4, -8, 38, 16, 7);
      ctx.fill();
      ctx.fillStyle = "#2f353c";
      ctx.beginPath();
      ctx.ellipse(33, 0, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const puff = (time * 0.8) % 1;
      if (puff < 0.35) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 - puff})`;
        ctx.beginPath();
        ctx.arc(x + 24 + puff * 20, y - 22 - puff * 12, 5 + puff * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      // 的
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.arc(x - 26, y - 26, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8574a";
      ctx.beginPath();
      ctx.arc(x - 26, y - 26, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.arc(x - 26, y - 26, 2.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "raft": {
      // 急流いかだ下り
      ctx.fillStyle = "#2f6b7a";
      roundRect(ctx, x - 32, y - 16, 64, 30, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        for (let px = x - 28; px <= x + 28; px += 6) {
          const py = y - 8 + i * 9 + Math.sin(px * 0.25 + time * 4 + i) * 2.2;
          if (px === x - 28) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      const spin = time * 1.2;
      const rx = x + Math.cos(spin) * 8;
      const ry = y - 2 + Math.sin(spin) * 4;
      ctx.fillStyle = "#c8a165";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a6440";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 10, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, rx - 5, ry - 2, "#7ee7a8", 0.7);
      rider(ctx, rx + 5, ry - 2, "#ffd166", 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 5; i += 1) {
        const a = spin * 2 + i;
        ctx.beginPath();
        ctx.arc(rx + Math.cos(a) * 18, ry + Math.sin(a) * 9, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    /* ---------- 宇宙ステーション ---------- */
    case "rocket": {
      const lift = Math.abs(Math.sin(time * 1.2)) * 6;
      ctx.fillStyle = "#4a5170";
      roundRect(ctx, x - 26, y + 2, 52, 12, 5);
      ctx.fill();
      ctx.strokeStyle = "#8f9ad6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 20, y + 2);
      ctx.lineTo(x - 20, y - 34);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, -lift);
      ctx.fillStyle = "#e9edff";
      ctx.beginPath();
      ctx.moveTo(x, y - 48);
      ctx.quadraticCurveTo(x + 13, y - 22, x + 11, y + 2);
      ctx.lineTo(x - 11, y + 2);
      ctx.quadraticCurveTo(x - 13, y - 22, x, y - 48);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e8574a";
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 6);
      ctx.lineTo(x - 22, y + 6);
      ctx.lineTo(x - 11, y + 2);
      ctx.closePath();
      ctx.moveTo(x + 11, y - 6);
      ctx.lineTo(x + 22, y + 6);
      ctx.lineTo(x + 11, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6bd3ff";
      ctx.beginPath();
      ctx.arc(x, y - 26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,180,80,${0.55 + (lift / 6) * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 2);
      ctx.lineTo(x, y + 14 + lift);
      ctx.lineTo(x + 7, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    case "spinner": {
      // 無重力スピナー: 中心の柱に腕がぶら下がって回る
      ctx.fillStyle = "#3b4260";
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8f9ad6";
      roundRect(ctx, x - 4, y - 48, 8, 56, 3);
      ctx.fill();
      ctx.fillStyle = "#c6cdf5";
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 44);
      ctx.lineTo(x + 18, y - 44);
      ctx.lineTo(x + 10, y - 52);
      ctx.lineTo(x - 10, y - 52);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        const a = time * 2.2 + (i / 4) * Math.PI * 2;
        const px = x + Math.cos(a) * 24;
        const py = y - 18 + Math.sin(a) * 8;
        ctx.strokeStyle = "rgba(200,210,255,0.7)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y - 42);
        ctx.lineTo(px, py - 8);
        ctx.stroke();
        ctx.fillStyle = i % 2 ? "#6bd3ff" : "#a78bfa";
        roundRect(ctx, px - 7, py - 8, 14, 12, 5);
        ctx.fill();
        rider(ctx, px, py - 2, "#f4f1ea", 0.6);
      }
      return;
    }
    case "theater": {
      // 宇宙シアター: ドームに星が流れる
      ctx.fillStyle = "#2a2f4d";
      ctx.beginPath();
      ctx.arc(x, y + 2, 30, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y + 2, 26, Math.PI, 0);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#141a33";
      ctx.fillRect(x - 26, y - 26, 52, 28);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 14; i += 1) {
        const px = x - 26 + ((i * 37 + time * 30) % 52);
        const py = y - 24 + ((i * 13) % 24);
        ctx.fillRect(px, py, 1.6, 1.6);
      }
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(x + 12, y - 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#8f9ad6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 2, 30, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = "#4a5170";
      roundRect(ctx, x - 32, y + 2, 64, 12, 4);
      ctx.fill();
      ctx.fillStyle = "#141a33";
      roundRect(ctx, x - 8, y + 2, 16, 12, 3);
      ctx.fill();
      return;
    }

    /* ---------- 恐竜の谷 ---------- */
    case "dino": {
      const bob = Math.sin(time * 1.6) * 3;
      ctx.fillStyle = "#5f7a4a";
      ctx.beginPath();
      ctx.ellipse(x, y - 4 + bob, 26, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4f6a3c";
      ctx.beginPath();
      ctx.moveTo(x + 20, y - 6 + bob);
      ctx.quadraticCurveTo(x + 44, y - 10 + bob, x + 40, y + 8 + bob);
      ctx.quadraticCurveTo(x + 30, y + 2 + bob, x + 18, y + 4 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5f7a4a";
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 10 + bob);
      ctx.quadraticCurveTo(x - 30, y - 34 + bob, x - 18, y - 42 + bob);
      ctx.quadraticCurveTo(x - 8, y - 30 + bob, x - 6, y - 12 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - 20, y - 44 + bob, 11, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.arc(x - 24, y - 46 + bob, 2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = "#c9a94a";
        ctx.beginPath();
        ctx.moveTo(x - 10 + i * 9, y - 17 + bob);
        ctx.lineTo(x - 6 + i * 9, y - 26 + bob);
        ctx.lineTo(x - 2 + i * 9, y - 17 + bob);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#7a4a2f";
      roundRect(ctx, x - 4, y - 20 + bob, 20, 8, 3);
      ctx.fill();
      rider(ctx, x + 6, y - 20 + bob, "#e8574a", 0.8);
      return;
    }
    case "dig": {
      // 化石発掘場: 砂場と骨とスコップ
      ctx.fillStyle = "#c8a165";
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 32, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b08b4f";
      ctx.beginPath();
      ctx.ellipse(x - 6, y, 18, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#efe8cf";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 4);
      ctx.lineTo(x + 4, y - 10);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - 14 + i * 6, y - 4 - i * 1.4);
        ctx.lineTo(x - 12 + i * 6, y - 12 - i * 1.4);
        ctx.stroke();
      }
      ctx.fillStyle = "#efe8cf";
      ctx.beginPath();
      ctx.arc(x + 10, y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      // スコップ
      const swing = Math.sin(time * 2.4) * 0.3;
      ctx.save();
      ctx.translate(x + 22, y - 16);
      ctx.rotate(-0.6 + swing);
      ctx.fillStyle = "#8a6440";
      ctx.fillRect(-1.5, -18, 3, 20);
      ctx.fillStyle = "#9aa4b0";
      roundRect(ctx, -5, 2, 10, 10, 3);
      ctx.fill();
      ctx.restore();
      // 砂ぼこり
      const puff = (time * 1.2) % 1;
      ctx.fillStyle = `rgba(226,200,150,${0.5 - puff * 0.5})`;
      ctx.beginPath();
      ctx.arc(x + 18, y - 6 - puff * 10, 3 + puff * 5, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, x - 20, y - 10, "#6bd3ff", 0.9);
      return;
    }
    case "ptera": {
      // 翼竜フライト: ぶら下がって旋回
      ctx.fillStyle = "#4a5a3a";
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a7a5a";
      roundRect(ctx, x - 3, y - 50, 6, 58, 3);
      ctx.fill();
      ctx.fillStyle = "#6f7a5a";
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 48);
      ctx.lineTo(x + 16, y - 48);
      ctx.lineTo(x + 8, y - 54);
      ctx.lineTo(x - 8, y - 54);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 2; i += 1) {
        const a = time * 1.8 + i * Math.PI;
        const px = x + Math.cos(a) * 26;
        const py = y - 24 + Math.sin(a) * 9;
        const flap = Math.sin(time * 6 + i) * 5;
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - 46);
        ctx.lineTo(px, py - 6);
        ctx.stroke();
        ctx.fillStyle = i ? "#7a6bb5" : "#4f9e83";
        ctx.beginPath();
        ctx.moveTo(px - 20, py - 4 - flap);
        ctx.quadraticCurveTo(px, py - 12, px + 20, py - 4 + flap);
        ctx.quadraticCurveTo(px, py + 4, px - 20, py - 4 - flap);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, py - 2, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 6, py - 4);
        ctx.lineTo(px + 18, py - 8);
        ctx.lineTo(px + 6, py);
        ctx.closePath();
        ctx.fill();
        rider(ctx, px, py + 4, "#ffd166", 0.65);
      }
      return;
    }
    default: {
      // 予備のベンチ
      ctx.fillStyle = "#6b7a8c";
      ctx.fillRect(x - 24, y + 2, 5, 12);
      ctx.fillRect(x + 19, y + 2, 5, 12);
      ctx.fillStyle = "#b8834e";
      roundRect(ctx, x - 28, y - 6, 56, 9, 4);
      ctx.fill();
      roundRect(ctx, x - 28, y - 22, 56, 8, 4);
      ctx.fill();
      return;
    }
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
  const park = stage().id === "park";
  if (id === "ticket" && park) {
    // 自動改札: 二枚の羽根が開く
    ctx.fillStyle = "#3d4c68";
    roundRect(ctx, x - 24, y - 22, 18, 38, 5);
    ctx.fill();
    roundRect(ctx, x + 6, y - 22, 18, 38, 5);
    ctx.fill();
    ctx.fillStyle = "#6bd3ff";
    roundRect(ctx, x - 22, y - 18, 14, 5, 2);
    ctx.fill();
    roundRect(ctx, x + 8, y - 18, 14, 5, 2);
    ctx.fill();
    const open = (Math.sin(time * 2) + 1) / 2;
    ctx.fillStyle = "rgba(180,230,255,0.7)";
    roundRect(ctx, x - 6, y - 10, 6 * (1 - open) + 0.5, 20, 2);
    ctx.fill();
    roundRect(ctx, x + 6 - (6 * (1 - open) + 0.5), y - 10, 6 * (1 - open) + 0.5, 20, 2);
    ctx.fill();
    ctx.fillStyle = `rgba(126,231,168,${0.5 + open * 0.4})`;
    ctx.beginPath();
    ctx.arc(x - 15, y - 26, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id === "sign" && park) {
    // 園内アナウンス: スピーカー塔
    ctx.fillStyle = "#4a5568";
    ctx.fillRect(x - 3, y - 20, 6, 34);
    ctx.fillStyle = "#8f9fc7";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 24);
      ctx.lineTo(x + dir * 18, y - 32);
      ctx.lineTo(x + dir * 18, y - 12);
      ctx.lineTo(x, y - 20);
      ctx.closePath();
      ctx.fill();
    }
    const wave = 0.3 + Math.abs(Math.sin(time * 3)) * 0.5;
    ctx.strokeStyle = `rgba(255,209,102,${wave})`;
    ctx.lineWidth = 1.6;
    for (let i = 1; i <= 2; i += 1) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + dir * 18, y - 22, 6 * i, dir > 0 ? -0.8 : Math.PI - 0.8, dir > 0 ? 0.8 : Math.PI + 0.8);
        ctx.stroke();
      }
    }
    return;
  }
  if (id === "noodle" && park) {
    // 高速印刷機: チケットが吐き出される
    ctx.fillStyle = "#3f4a5a";
    roundRect(ctx, x - 26, y - 22, 52, 36, 6);
    ctx.fill();
    ctx.fillStyle = "#6bd3ff";
    roundRect(ctx, x - 18, y - 16, 36, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#151c25";
    roundRect(ctx, x - 14, y + 2, 28, 4, 2);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const t = (time * 0.8 + i * 0.33) % 1;
      ticket(ctx, x, y + 8 + t * 14, 0.8);
    }
    return;
  }
  if (id === "fridge" && park) {
    // チケット倉庫: 棚に束が並ぶ
    ctx.fillStyle = "#6b5a45";
    roundRect(ctx, x - 24, y - 34, 48, 50, 5);
    ctx.fill();
    ctx.fillStyle = "#4a3d2e";
    for (let r = 0; r < 3; r += 1) ctx.fillRect(x - 24, y - 20 + r * 12, 48, 3);
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        ticket(ctx, x - 14 + c * 14, y - 26 + r * 12, 0.7);
      }
    }
    return;
  }
  if (id === "flag") {
    const fire = stage().id === "fire";
    if (fire) {
      // けむりのろし: 立てた棒から、ゆらめく煙が上がる
      ctx.fillStyle = "#6b5433";
      ctx.fillRect(x - 2, y - 30, 4, 44);
      ctx.fillStyle = "rgba(200,190,180,0.5)";
      for (let i = 0; i < 4; i += 1) {
        const t = (time * 0.6 + i * 0.25) % 1;
        ctx.beginPath();
        ctx.arc(x + Math.sin(t * 6 + i) * 6, y - 30 - t * 34, 5 - t * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    // のぼり旗
    ctx.fillStyle = "#6b5433";
    ctx.fillRect(x - 2, y - 44, 4, 58);
    const wave = Math.sin(time * 3) * 3;
    ctx.fillStyle = park ? "#4d6b9e" : "#c2402f";
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 44);
    ctx.quadraticCurveTo(x + 18 + wave, y - 30, x + 2, y - 16);
    ctx.lineTo(x + 2, y - 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3d9";
    ctx.font = SMALL;
    ctx.fillText(park ? "P" : "麺", x + 7, y - 30);
    ctx.font = FONT;
    return;
  }
  if (id === "lantern") {
    // 大提灯
    ctx.fillStyle = "#4a3524";
    ctx.fillRect(x - 22, y - 46, 44, 4);
    const glow = 0.6 + Math.abs(Math.sin(time * 1.6)) * 0.4;
    ctx.fillStyle = `rgba(255,120,90,${glow})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 18, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,30,20,0.6)";
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y - 20, 18 - Math.abs(i) * 2, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#3a2118";
    roundRect(ctx, x - 8, y - 46, 16, 6, 2);
    ctx.fill();
    roundRect(ctx, x - 8, y - 2, 16, 6, 2);
    ctx.fill();
    ctx.fillStyle = "#fff3d9";
    ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("祭", x, y - 20);
    ctx.font = FONT;
    return;
  }
  if (id === "queue") {
    // 行列の整理棒（並んでいる人つき）
    for (let i = 0; i < 3; i += 1) {
      const px = x - 24 + i * 24;
      ctx.fillStyle = "#c8b49a";
      ctx.fillRect(px - 2, y - 22, 4, 24);
      ctx.fillStyle = "#8a8f98";
      ctx.beginPath();
      ctx.ellipse(px, y + 4, 8, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (i < 2) {
        ctx.strokeStyle = "#c2402f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, y - 20);
        ctx.quadraticCurveTo(px + 12, y - 12, px + 24, y - 20);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 2; i += 1) {
      const px = x - 12 + i * 24;
      const bob = Math.sin(time * 2 + i * 1.4) * 1.5;
      ctx.fillStyle = ["#5b7fbc", "#a35b7a"][i];
      roundRect(ctx, px - 6, y - 30 + bob, 12, 14, 5);
      ctx.fill();
      ctx.fillStyle = "#f0cfae";
      ctx.beginPath();
      ctx.arc(px, y - 33 + bob, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (id === "screen") {
    // 街頭ビジョン
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(x - 4, y - 10, 8, 24);
    ctx.fillStyle = "#22282f";
    roundRect(ctx, x - 32, y - 46, 64, 38, 4);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 28, y - 42, 56, 30);
    ctx.clip();
    const hue = (time * 60) % 360;
    ctx.fillStyle = `hsl(${hue}, 65%, 45%)`;
    ctx.fillRect(x - 28, y - 42, 56, 30);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 3; i += 1) {
      const px = x - 28 + ((time * 40 + i * 22) % 60);
      ctx.fillRect(px, y - 34 + i * 8, 14, 4);
    }
    ctx.restore();
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.abs(Math.sin(time * 2)) * 0.1})`;
    roundRect(ctx, x - 32, y - 46, 64, 38, 4);
    ctx.fill();
    return;
  }
  if (id === "truck") {
    // 宣伝トラック
    const roll = Math.sin(time * 1.2) * 3;
    ctx.fillStyle = "#c2402f";
    roundRect(ctx, x - 30 + roll, y - 26, 40, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#8a2f22";
    roundRect(ctx, x + 8 + roll, y - 18, 20, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#6bd3ff";
    roundRect(ctx, x + 12 + roll, y - 15, 12, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#fff3d9";
    ctx.font = SMALL;
    ctx.fillText("SALE", x - 10 + roll, y - 14);
    ctx.font = FONT;
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(x - 18 + roll, y + 2, 6, 0, Math.PI * 2);
    ctx.arc(x + 16 + roll, y + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    // スピーカー
    ctx.fillStyle = "#8f9fc7";
    ctx.beginPath();
    ctx.moveTo(x - 26 + roll, y - 30);
    ctx.lineTo(x - 14 + roll, y - 38);
    ctx.lineTo(x - 14 + roll, y - 26);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (id === "balloon") {
    // 巨大バルーン
    const lift = Math.sin(time * 1.1) * 4;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.lineTo(x, y - 20 + lift);
    ctx.stroke();
    ctx.fillStyle = "#f0a6c0";
    ctx.beginPath();
    ctx.arc(x, y - 40 + lift, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fdf1f6";
    ctx.beginPath();
    ctx.arc(x - 15, y - 54 + lift, 9, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 54 + lift, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(x - 7, y - 42 + lift, 3, 0, Math.PI * 2);
    ctx.arc(x + 7, y - 42 + lift, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8574a";
    ctx.beginPath();
    ctx.ellipse(x, y - 32 + lift, 6, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id === "greet") {
    // キャラクターグリーティング（着ぐるみ＋看板）
    const bob = Math.sin(time * 2.4) * 2;
    ctx.fillStyle = "#4f9e83";
    roundRect(ctx, x - 12, y - 26 + bob, 24, 26, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 34 + bob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d7a66";
    ctx.beginPath();
    ctx.arc(x - 10, y - 44 + bob, 5, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 44 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.arc(x - 4, y - 36 + bob, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 36 + bob, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // 手をふる
    ctx.strokeStyle = "#4f9e83";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 20 + bob);
    ctx.lineTo(x + 20, y - 30 + Math.sin(time * 6) * 6);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;
    return;
  }
  if (id === "parade") {
    // パレードカー
    const roll = ((time * 12) % 24) - 12;
    ctx.fillStyle = "#a78bfa";
    roundRect(ctx, x - 28 + roll, y - 22, 56, 22, 8);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    roundRect(ctx, x - 20 + roll, y - 34, 40, 14, 6);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = FLAGS[i % FLAGS.length];
      ctx.beginPath();
      ctx.arc(x - 20 + roll + i * 10, y - 40 + Math.sin(time * 4 + i) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f0cfae";
    ctx.beginPath();
    ctx.arc(x + roll, y - 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(x - 16 + roll, y + 2, 6, 0, Math.PI * 2);
    ctx.arc(x + 16 + roll, y + 2, 6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id === "firework") {
    // 花火の打ち上げ台
    ctx.fillStyle = "#4a5568";
    roundRect(ctx, x - 20, y - 8, 40, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#2f3a4a";
    for (const fx of [x - 10, x + 10]) {
      roundRect(ctx, fx - 5, y - 22, 10, 16, 3);
      ctx.fill();
    }
    // 打ち上がる花火
    for (let i = 0; i < 2; i += 1) {
      const t = (time * 0.5 + i * 0.5) % 1;
      const hue = (i * 120 + Math.floor(time * 0.5 + i * 0.5) * 60) % 360;
      if (t < 0.45) {
        ctx.fillStyle = `hsla(${hue}, 95%, 75%, 0.9)`;
        ctx.beginPath();
        ctx.arc(x - 10 + i * 20, y - 24 - t * 90, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const spread = (t - 0.45) / 0.55;
        for (let k = 0; k < 10; k += 1) {
          const a = (k / 10) * Math.PI * 2;
          ctx.fillStyle = `hsla(${hue}, 95%, 72%, ${1 - spread})`;
          ctx.beginPath();
          ctx.arc(
            x - 10 + i * 20 + Math.cos(a) * spread * 30,
            y - 64 + Math.sin(a) * spread * 30,
            2.4 * (1 - spread) + 0.6,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
    return;
  }
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

/**
 * 同じ見た目がダブると増える★の光り方（6段階）。
 * ★1 ふちが光る / ★2 きらきら / ★3 虹のオーラ /
 * ★4 光の輪 / ★5 まわる星 / ★6 光の柱
 */
const drawShine = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stars: number,
  time: number,
) => {
  const pulse = 0.6 + Math.sin(time * 3) * 0.4;
  const hue = (time * 90) % 360;
  const rainbow = stars >= 3;

  // ★6 光の柱
  if (stars >= 6) {
    const pillar = ctx.createLinearGradient(x, y - 76, x, y + 10);
    pillar.addColorStop(0, `hsla(${hue}, 95%, 72%, 0)`);
    pillar.addColorStop(0.55, `hsla(${(hue + 40) % 360}, 95%, 72%, 0.22)`);
    pillar.addColorStop(1, `hsla(${(hue + 80) % 360}, 95%, 72%, 0.4)`);
    ctx.fillStyle = pillar;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 76);
    ctx.lineTo(x + 8, y - 76);
    ctx.lineTo(x + 20, y + 8);
    ctx.lineTo(x - 20, y + 8);
    ctx.closePath();
    ctx.fill();
    // 立ちのぼる光の粒
    for (let i = 0; i < 6; i += 1) {
      const t = (time * 0.7 + i * 0.17) % 1;
      const px = x + Math.sin(time * 2 + i * 2.1) * 12;
      ctx.fillStyle = `hsla(${(hue + i * 40) % 360}, 95%, 78%, ${1 - t})`;
      ctx.beginPath();
      ctx.arc(px, y + 6 - t * 62, 2.4 * (1 - t) + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 足元の光の輪（★4 で二重になる）
  const ring = rainbow
    ? `hsla(${hue}, 90%, 65%, ${0.35 + pulse * 0.3})`
    : stars === 2
      ? `rgba(150,215,255,${0.3 + pulse * 0.25})`
      : `rgba(255,209,102,${0.25 + pulse * 0.2})`;
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 7, 15 + pulse * 2, 6 + pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (stars >= 4) {
    ctx.strokeStyle = rainbow
      ? `hsla(${(hue + 120) % 360}, 90%, 70%, ${0.25 + pulse * 0.25})`
      : `rgba(255,225,150,${0.2 + pulse * 0.2})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 24 + pulse * 4, 10 + pulse * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 頭上の光の輪
    ctx.strokeStyle = `hsla(${hue}, 95%, 75%, ${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(x, y - 34 - pulse * 1.5, 11, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (rainbow) {
    // 虹のオーラ（★が増えるほど広く強く）
    const size = 26 + stars * 3;
    const aura = ctx.createRadialGradient(x, y - 10, 4, x, y - 10, size);
    aura.addColorStop(0, `hsla(${hue}, 95%, 70%, ${0.22 + stars * 0.05})`);
    aura.addColorStop(1, `hsla(${(hue + 90) % 360}, 95%, 70%, 0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y - 10, size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stars >= 5) {
    // まわる星
    for (let i = 0; i < 3; i += 1) {
      const a = time * 2 + (i / 3) * Math.PI * 2;
      const px = x + Math.cos(a) * 22;
      const py = y - 14 + Math.sin(a) * 8;
      const scale = 0.8 + Math.sin(a) * 0.25;
      ctx.fillStyle = `hsla(${(hue + i * 90) % 360}, 95%, 78%, 0.95)`;
      ctx.beginPath();
      for (let k = 0; k < 10; k += 1) {
        const ra = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = (k % 2 ? 2 : 5) * scale;
        const sx = px + Math.cos(ra) * rr;
        const sy = py + Math.sin(ra) * rr;
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  if (stars >= 2) {
    // きらきら（★が増えるほど数が増える）
    const count = Math.min(8, 2 + stars);
    for (let i = 0; i < count; i += 1) {
      const t = (time * 0.9 + i / count) % 1;
      const a = i * 1.9 + time * 1.4;
      const px = x + Math.cos(a) * (12 + t * 8);
      const py = y - 6 - t * 24;
      const size = 3.4 * (1 - t);
      ctx.fillStyle = rainbow
        ? `hsla(${(hue + i * 60) % 360}, 95%, 75%, ${1 - t})`
        : `rgba(230,245,255,${1 - t})`;
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px + size * 0.5, py);
      ctx.lineTo(px, py + size);
      ctx.lineTo(px - size * 0.5, py);
      ctx.closePath();
      ctx.fill();
    }
  }
};

/**
 * 動物スキンの顔まわり。頭（半径 7.6・中心 y-20）にかぶせて描く。
 * しっぽは体の後ろ側に出す
 */
const drawFace = (
  ctx: CanvasRenderingContext2D,
  face: Face,
  color: string,
  head: string,
  x: number,
  y: number,
  time: number,
) => {
  const hy = y - 20;
  const ear = (dx: number, w: number, h: number, tilt = 0) => {
    ctx.beginPath();
    ctx.ellipse(x + dx, hy - 7, w, h, tilt, 0, Math.PI * 2);
    ctx.fill();
  };
  const eyes = (dx = 2.6, r = 1.3) => {
    ctx.fillStyle = "#2b2b33";
    ctx.beginPath();
    ctx.arc(x - dx, hy - 1, r, 0, Math.PI * 2);
    ctx.arc(x + dx, hy - 1, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const snout = (fill: string, w = 4.4, h = 3) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, hy + 3, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const tail = (fill: string, len = 12, thick = 3) => {
    ctx.strokeStyle = fill;
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 2);
    ctx.quadraticCurveTo(
      x + 8 + len,
      y - 6 + Math.sin(time * 4) * 3,
      x + 6 + len,
      y - 14 + Math.sin(time * 4) * 3,
    );
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;
  };

  switch (face) {
    case "cat":
      tail(color, 12, 3);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.moveTo(x - 8, hy - 4);
      ctx.lineTo(x - 5.5, hy - 12);
      ctx.lineTo(x - 2, hy - 5);
      ctx.closePath();
      ctx.moveTo(x + 8, hy - 4);
      ctx.lineTo(x + 5.5, hy - 12);
      ctx.lineTo(x + 2, hy - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 6.6, hy - 6);
      ctx.lineTo(x - 5.4, hy - 10);
      ctx.lineTo(x - 3.6, hy - 6);
      ctx.closePath();
      ctx.moveTo(x + 6.6, hy - 6);
      ctx.lineTo(x + 5.4, hy - 10);
      ctx.lineTo(x + 3.6, hy - 6);
      ctx.closePath();
      ctx.fill();
      eyes();
      ctx.fillStyle = "#f0a6c0";
      ctx.beginPath();
      ctx.moveTo(x, hy + 4);
      ctx.lineTo(x - 2, hy + 1.6);
      ctx.lineTo(x + 2, hy + 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(60,50,40,0.5)";
      ctx.lineWidth = 0.8;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + dir * 3, hy + 3);
        ctx.lineTo(x + dir * 10, hy + 1.6);
        ctx.moveTo(x + dir * 3, hy + 3.6);
        ctx.lineTo(x + dir * 10, hy + 4.6);
        ctx.stroke();
      }
      return;
    case "shiba":
      tail(color, 10, 4);
      ctx.fillStyle = color;
      ear(-6.4, 3.4, 4.4, -0.4);
      ear(6.4, 3.4, 4.4, 0.4);
      eyes();
      snout("#f6efe2", 4.6, 3.2);
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.ellipse(x, hy + 1.6, 1.8, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "chick":
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, hy - 12);
      ctx.lineTo(x - 3, hy - 6);
      ctx.lineTo(x + 3, hy - 6);
      ctx.closePath();
      ctx.fill();
      eyes(2.4, 1.5);
      ctx.fillStyle = "#f5a623";
      ctx.beginPath();
      ctx.moveTo(x - 3, hy + 2);
      ctx.lineTo(x + 3, hy + 2);
      ctx.lineTo(x, hy + 6);
      ctx.closePath();
      ctx.fill();
      return;
    case "bear":
      ctx.fillStyle = color;
      ear(-6.6, 3.8, 3.8);
      ear(6.6, 3.8, 3.8);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(x - 6.6, hy - 7, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 6.6, hy - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
      eyes();
      snout("#e8dcc8", 5, 3.4);
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.ellipse(x, hy + 1.8, 2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "bunny":
      ctx.fillStyle = head;
      ear(-3.6, 2.8, 9, -0.15);
      ear(3.6, 2.8, 9, 0.15);
      ctx.fillStyle = color;
      ear(-3.6, 1.4, 6, -0.15);
      ear(3.6, 1.4, 6, 0.15);
      eyes();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, hy + 4);
      ctx.lineTo(x - 2, hy + 1.6);
      ctx.lineTo(x + 2, hy + 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(x + 10, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "penguin":
      ctx.fillStyle = "#2b3440";
      ctx.beginPath();
      ctx.arc(x, hy, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      eyes(2.8, 1.4);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 3, hy + 2);
      ctx.lineTo(x + 3, hy + 2);
      ctx.lineTo(x, hy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2b3440";
      ctx.beginPath();
      ctx.ellipse(x - 10, y - 6, 3, 6, 0.3, 0, Math.PI * 2);
      ctx.ellipse(x + 10, y - 6, 3, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "frog":
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(x - 5.5, hy - 7, 4, 0, Math.PI * 2);
      ctx.arc(x + 5.5, hy - 7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(x - 5.5, hy - 7, 1.8, 0, Math.PI * 2);
      ctx.arc(x + 5.5, hy - 7, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, hy + 1, 4.4, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(x - 6, hy + 2, 1.6, 0, Math.PI * 2);
      ctx.arc(x + 6, hy + 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "tiger":
      tail("#e08a2b", 12, 3.4);
      ctx.fillStyle = "#e08a2b";
      ear(-6.6, 3.6, 3.6);
      ear(6.6, 3.6, 3.6);
      ctx.fillStyle = color;
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(x + i * 4 - 0.8, hy - 8, 1.6, 4);
      }
      eyes();
      snout("#f6efe2", 4.6, 3);
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.ellipse(x, hy + 1.6, 1.8, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "panda":
      ctx.fillStyle = color;
      ear(-6.8, 3.8, 3.8);
      ear(6.8, 3.8, 3.8);
      ctx.beginPath();
      ctx.ellipse(x - 3.4, hy - 1, 3, 3.6, -0.3, 0, Math.PI * 2);
      ctx.ellipse(x + 3.4, hy - 1, 3, 3.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.arc(x - 3.4, hy - 1.4, 1.2, 0, Math.PI * 2);
      ctx.arc(x + 3.4, hy - 1.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, hy + 3, 2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "unicorn":
      ctx.fillStyle = head;
      ear(-6.4, 2.6, 5, -0.3);
      ear(6.4, 2.6, 5, 0.3);
      // つの
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(x - 2.4, hy - 7);
      ctx.lineTo(x, hy - 17);
      ctx.lineTo(x + 2.4, hy - 7);
      ctx.closePath();
      ctx.fill();
      // たてがみ
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = `hsl(${(time * 40 + i * 40) % 360}, 80%, 72%)`;
        ctx.beginPath();
        ctx.arc(x - 7 + i * 2, hy - 6 - i * 2.4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      eyes();
      snout(color, 4.2, 2.8);
      return;
    case "dragon":
      // つばさ
      ctx.fillStyle = "rgba(120,200,180,0.85)";
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + dir * 6, y - 12);
        ctx.quadraticCurveTo(x + dir * 22, y - 24 + Math.sin(time * 6) * 4, x + dir * 20, y - 6);
        ctx.quadraticCurveTo(x + dir * 12, y - 8, x + dir * 6, y - 12);
        ctx.closePath();
        ctx.fill();
      }
      tail("#3f8f7a", 12, 3.4);
      // とげ
      ctx.fillStyle = color;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * 5 - 2.4, hy - 6);
        ctx.lineTo(x + i * 5, hy - 12);
        ctx.lineTo(x + i * 5 + 2.4, hy - 6);
        ctx.closePath();
        ctx.fill();
      }
      eyes(3, 1.4);
      snout("#5fb39b", 5, 3.2);
      ctx.fillStyle = `rgba(255,150,80,${0.5 + Math.abs(Math.sin(time * 3)) * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(x, hy + 4);
      ctx.lineTo(x - 2.6, hy + 10);
      ctx.lineTo(x + 2.6, hy + 10);
      ctx.closePath();
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
  const inspect = useRef<Inspect | null>(null);
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

      const isPark = stage().id === "park";
      const isFire = stage().id === "fire";

      /* --- 床 --- */
      ctx.fillStyle = isFire ? "#20160f" : isPark ? "#101826" : "#191512";
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
      if (isPark) {
        // 園内の遊歩道（区画をつなぐ石畳）
        for (const area of openAreas(state)) {
          const { rect } = area;
          ctx.fillStyle = "rgba(236,226,206,0.13)";
          ctx.fillRect(rect.x0, rect.y1 - 34, rect.x1 - rect.x0, 26);
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          for (let x = rect.x0 + 4; x < rect.x1 - 8; x += 26) {
            ctx.fillRect(x, rect.y1 - 30, 18, 18);
          }
        }
      } else {
        ctx.strokeStyle = "rgba(0,0,0,0.16)";
        ctx.lineWidth = 1;
        for (let y = KITCHEN.bottom + 20; y < worldH; y += 34) {
          ctx.beginPath();
          ctx.moveTo(box.x0, y);
          ctx.lineTo(box.x1, y);
          ctx.stroke();
        }
      }

      /* --- 作業場（歩いて入れる） --- */
      for (const area of openAreas(state)) {
        if (area.rect.y0 !== 0) continue;
        const { x0, x1 } = area.rect;
        const mid = (x0 + x1) / 2;
        ctx.fillStyle = isPark ? "#414f6b" : "#2b241d";
        ctx.fillRect(x0, 0, x1 - x0, KITCHEN.bottom);
        ctx.fillStyle = isPark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)";
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

        if (isPark) {
          // 入園ゲート: 二本の塔と電飾つきのアーチ
          for (const tx of [x0 + 24, x1 - 24]) {
            ctx.fillStyle = "#5b6a8f";
            roundRect(ctx, tx - 13, 18, 26, 44, 5);
            ctx.fill();
            ctx.fillStyle = "#8f9fc7";
            roundRect(ctx, tx - 15, 16, 30, 8, 4);
            ctx.fill();
            ctx.fillStyle = "#e8574a";
            ctx.beginPath();
            ctx.moveTo(tx - 15, 16);
            ctx.lineTo(tx, 1);
            ctx.lineTo(tx + 15, 16);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "#2f3a52";
          roundRect(ctx, x0 + 24, 18, x1 - x0 - 48, 30, 14);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,209,102,0.6)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, x0 + 24, 18, x1 - x0 - 48, 30, 14);
          ctx.stroke();
          ctx.fillStyle = "#ffd166";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(
            area.price === 0
              ? "D R E A M   P A R K"
              : area.label.replace("をつくる", ""),
            mid,
            33,
          );
          ctx.font = FONT;
          // 電球
          const bulbs = Math.floor((x1 - x0 - 60) / 18);
          for (let i = 0; i <= bulbs; i += 1) {
            const bx = x0 + 30 + i * 18;
            const on = 0.35 + 0.55 * Math.abs(Math.sin(time * 3 + i * 0.7));
            ctx.fillStyle = `rgba(255,225,150,${on})`;
            ctx.beginPath();
            ctx.arc(bx, 44, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
          // 広場の万国旗と花壇
          bunting(ctx, x0 + 8, x1 - 8, 108, time * 2);
          for (const fx of [x0 + 26, x1 - 26]) {
            ctx.fillStyle = "#4c6b45";
            roundRect(ctx, fx - 16, KITCHEN.bottom - 22, 32, 16, 5);
            ctx.fill();
            for (let i = 0; i < 4; i += 1) {
              ctx.fillStyle = FLAGS[i % FLAGS.length];
              ctx.beginPath();
              ctx.arc(fx - 10 + i * 7, KITCHEN.bottom - 16, 2.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (isFire) {
          ctx.fillStyle = area.price === 0 ? "#7a3b1f" : "#4a3524";
          roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, 6);
          ctx.fill();
          ctx.fillStyle = "#f6d9a8";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(
            area.price === 0
              ? "火 の は じ ま り"
              : area.label.replace("をひらく", "").replace("へ下りる", ""),
            mid,
            20,
          );
          ctx.font = FONT;
        } else {
          ctx.fillStyle = area.price === 0 ? "#c2402f" : "#8a5a3c";
          roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, 6);
          ctx.fill();
          ctx.fillStyle = "#f6e7cf";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(area.price === 0 ? "ら ー め ん" : "製 麺 所", mid, 20);
          ctx.font = FONT;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          for (let i = 1; i < 5; i += 1) {
            ctx.fillRect(x0 + 10 + ((x1 - x0 - 20) / 5) * i - 1, 4, 2, 30);
          }
        }
      }

      /* --- 寸胴 --- */
      // 直結の設備（樋・ベルト）: つないだ2点のあいだに線を描く
      for (const item of stage().equipment) {
        if (!item.link || !state.unlocked.includes(`equip-${item.id}`)) continue;
        const a = stoveById.get(item.link.from);
        const b = stoveById.get(item.link.to);
        if (!a || !b) continue;
        ctx.strokeStyle = "rgba(180,140,90,0.55)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(a.pos.x, a.pos.y + 8);
        ctx.lineTo(b.pos.x, b.pos.y - 8);
        ctx.stroke();
        // 流れている品
        const t = (time * 0.7) % 1;
        chainItem(
          ctx,
          stoveItem(a),
          a.pos.x + (b.pos.x - a.pos.x) * t,
          a.pos.y + 8 + (b.pos.y - 8 - (a.pos.y + 8)) * t,
          0.8,
          time,
        );
      }

      for (const stove of openStoves(state)) {
        const { x, y } = stove.pos;
        const made = stoveItem(stove);
        if (isFire) {
          drawFireStation(ctx, stove, x, y, time, state);
        } else if (made === "food") {
          // 厨房（レストラン）
          ctx.fillStyle = "#4d4038";
          roundRect(ctx, x - 30, y - 34, 60, 48, 6);
          ctx.fill();
          ctx.fillStyle = "#6b5a4c";
          roundRect(ctx, x - 30, y - 34, 60, 12, 5);
          ctx.fill();
          ctx.fillStyle = "#2f2a26";
          roundRect(ctx, x - 22, y - 16, 44, 22, 4);
          ctx.fill();
          // コンロの火
          for (const fx of [x - 11, x + 11]) {
            const flame = 0.6 + Math.abs(Math.sin(time * 6 + fx)) * 0.4;
            ctx.fillStyle = `rgba(255,140,60,${flame})`;
            ctx.beginPath();
            ctx.moveTo(fx, y - 14);
            ctx.quadraticCurveTo(fx + 5, y - 6, fx, y + 2);
            ctx.quadraticCurveTo(fx - 5, y - 6, fx, y - 14);
            ctx.fill();
          }
          ctx.fillStyle = "#8d98a6";
          ctx.beginPath();
          ctx.ellipse(x, y - 18, 13, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f2dcae";
          ctx.font = SMALL;
          ctx.fillText("KITCHEN", x, y - 28);
          ctx.font = FONT;
        } else if (made === "goods") {
          // 倉庫（お土産）
          ctx.fillStyle = "#5a4a38";
          roundRect(ctx, x - 30, y - 34, 60, 48, 5);
          ctx.fill();
          ctx.fillStyle = "#3d3227";
          roundRect(ctx, x - 24, y - 8, 48, 22, 3);
          ctx.fill();
          for (let i = 0; i < 3; i += 1) {
            ctx.fillStyle = ["#c8a165", "#a9743f", "#c8a165"][i];
            roundRect(ctx, x - 22 + i * 16, y - 28, 14, 16, 2);
            ctx.fill();
            ctx.fillStyle = "#e8574a";
            ctx.fillRect(x - 22 + i * 16, y - 22, 14, 2);
          }
          ctx.fillStyle = "#f2dcae";
          ctx.font = SMALL;
          ctx.fillText("STOCK", x, y + 4);
          ctx.font = FONT;
        } else if (isPark) {
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
        for (let i = 0; i < ready; i += 1) held(ctx, made, x, y + 22 - i * 5.5);

        // 工程の作業場: 受け口の材料（左）とまき（右）、詰まりの合図
        if (isStation(stove)) {
          const held0 = state.hold[stove.id] ?? 0;
          for (let i = 0; i < held0; i += 1) {
            held(ctx, stove.takes ?? null, x - 30, y + 16 - i * 5, 0.8);
          }
          const fuel0 = stove.fuel ? state.fuel[stove.id] ?? 0 : 0;
          if (stove.fuel) {
            for (let i = 0; i < fuel0; i += 1) {
              held(ctx, stove.fuel, x + 30, y + 16 - i * 5, 0.8);
            }
          }
          const waitWord: Record<string, string> = {
            meat: "肉まち",
            cut: "身まち",
          };
          ctx.font = SMALL;
          if (held0 <= 0) {
            ctx.fillStyle = "rgba(255,150,140,0.9)";
            ctx.fillText(waitWord[stove.takes ?? ""] ?? "材料まち", x - 30, y - 30);
          }
          if (stove.fuel && fuel0 <= 0) {
            ctx.fillStyle = "rgba(255,200,120,0.9)";
            ctx.fillText("まきまち", x + 30, y - 30);
          }
          ctx.font = FONT;
        }
        if (ready >= holdCap(state, stove)) {
          ctx.fillStyle = "#ffd166";
          ctx.fillText("満杯", x, y + 36);
        }
      }

      /* --- カウンター（ラーメンだけ） --- */
      if (!isPark && !isFire) {
        ctx.fillStyle = "#6b4a2f";
        roundRect(ctx, 16, 306, 328, 34, 10);
        ctx.fill();
        ctx.fillStyle = "#8a6440";
        roundRect(ctx, 16, 306, 328, 11, 6);
        ctx.fill();
      }

      for (const seat of openSeats(state)) {
        const mode = seatMode(seat);
        if (mode === "table" || mode === "shelf") {
          const { x, y } = seat.pos;
          const area = openAreas(state).find(
            (item) => item.id === `area-${seat.area}`,
          );
          const tint = area?.palette.floor ?? "#5b6b8c";

          // 店の床
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          roundRect(ctx, x - 44, y - 58, 88, 80, 12);
          ctx.fill();
          ctx.fillStyle = tint;
          ctx.globalAlpha = 0.4;
          roundRect(ctx, x - 42, y - 56, 84, 76, 11);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(255,255,255,0.16)";
          ctx.lineWidth = 1;
          roundRect(ctx, x - 42, y - 56, 84, 76, 11);
          ctx.stroke();

          if (mode === "table") {
            drawTable(ctx, seat.art ?? "pasta", x, y, time, isDirty(state, seat.id));
          } else {
            drawShelf(ctx, seat.art ?? "plush", x, y, time, shelfStock(state, seat.id));
          }

          // 名札
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          roundRect(ctx, x - 36, y + 18, 72, 14, 7);
          ctx.fill();
          ctx.strokeStyle =
            mode === "table" ? "rgba(255,150,120,0.6)" : "rgba(160,220,255,0.6)";
          ctx.lineWidth = 1;
          roundRect(ctx, x - 36, y + 18, 72, 14, 7);
          ctx.stroke();
          ctx.font = SMALL;
          ctx.fillStyle = mode === "table" ? "#ffd9c2" : "#d6ecff";
          ctx.fillText(seat.label, x, y + 25);
          ctx.font = FONT;
        } else if (isPark) {
          // アトラクションと、その周り（乗り場・柵・看板）
          const area = openAreas(state).find(
            (item) => item.id === `area-${seat.area}`,
          );
          const tint = area?.palette.floor ?? "#5b6b8c";
          const { x, y } = seat.pos;

          // 乗り場の床（テーマ色のタイル）
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          roundRect(ctx, x - 44, y - 54, 88, 76, 12);
          ctx.fill();
          ctx.fillStyle = tint;
          ctx.globalAlpha = 0.35;
          roundRect(ctx, x - 42, y - 52, 84, 72, 11);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 1;
          roundRect(ctx, x - 42, y - 52, 84, 72, 11);
          ctx.stroke();

          // 待機列の柵
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.lineWidth = 2;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + side * 42, y + 20);
            ctx.lineTo(x + side * 42, y - 2);
            ctx.stroke();
            for (let i = 0; i < 3; i += 1) {
              ctx.fillStyle = "rgba(255,255,255,0.3)";
              ctx.beginPath();
              ctx.arc(x + side * 42, y + 20 - i * 11, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          drawRide(ctx, seat.art ?? "bench", x, y, time);

          // 乗り物の名前を出す小さな看板
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          roundRect(ctx, x - 34, y + 18, 68, 14, 7);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,209,102,0.5)";
          ctx.lineWidth = 1;
          roundRect(ctx, x - 34, y + 18, 68, 14, 7);
          ctx.stroke();
          ctx.font = SMALL;
          ctx.fillStyle = "#ffe6a8";
          const cost = seatCost(seat);
          ctx.fillText(cost > 1 ? `${seat.label}（${cost}枚）` : seat.label, x, y + 25);
          ctx.font = FONT;
        } else if (isFire) {
          // 丸太のベンチ
          const bx = seat.pos.x;
          const by = seat.pos.y + 4;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(bx, by + 8, 26, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#5a3a20";
          roundRect(ctx, bx - 26, by - 2, 52, 11, 5);
          ctx.fill();
          ctx.fillStyle = "#7a5230";
          roundRect(ctx, bx - 26, by - 2, 52, 4, 3);
          ctx.fill();
          for (const lx of [bx - 18, bx + 18]) {
            ctx.fillStyle = "#43301c";
            ctx.fillRect(lx - 2, by + 8, 4, 6);
          }
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

      // レジ（棚の客がお金を払いに行く場所）
      const tills = new Map<string, { x: number; y: number }>();
      for (const seat of openSeats(state)) {
        if (seatMode(seat) !== "shelf" || !seat.pay) continue;
        tills.set(`${seat.pay.x},${seat.pay.y}`, seat.pay);
      }
      for (const till of tills.values()) {
        shadow(ctx, till.x, till.y + 14, 20);
        ctx.fillStyle = "#4a3a2a";
        roundRect(ctx, till.x - 24, till.y - 6, 48, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#6b7a8c";
        roundRect(ctx, till.x - 14, till.y - 24, 28, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#1d2630";
        roundRect(ctx, till.x - 10, till.y - 20, 20, 9, 2);
        ctx.fill();
        ctx.fillStyle = `rgba(126,231,168,${0.5 + Math.abs(Math.sin(time * 2)) * 0.4})`;
        ctx.beginPath();
        ctx.arc(till.x + 10, till.y - 22, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = SMALL;
        ctx.fillStyle = "rgba(246,231,207,0.65)";
        ctx.fillText("レジ", till.x, till.y + 4);
        ctx.font = FONT;
      }

      for (const seat of openSeats(state)) {
        const tray = trayPos(seat);
        const mode = seatMode(seat);
        const hot = waitingSeats.has(seat.id);
        const eating = eatingBySeat.get(seat.id);
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;

        if (mode === "shelf") {
          // 棚は「並べる場所」。空きがあるほど強く光る
          const stock = shelfStock(state, seat.id);
          const room = stock < SHELF_MAX;
          ctx.save();
          if (room) {
            ctx.shadowColor = "rgba(150,220,255,0.8)";
            ctx.shadowBlur = 6 + pulse * 8;
          }
          ctx.fillStyle = room
            ? `rgba(150,220,255,${0.28 + pulse * 0.25})`
            : "rgba(255,255,255,0.08)";
          roundRect(ctx, tray.x - 18, tray.y - 8, 36, 16, 8);
          ctx.fill();
          ctx.restore();
          ctx.font = SMALL;
          ctx.fillStyle = room ? "#d6ecff" : "rgba(246,231,207,0.5)";
          ctx.fillText(`${stock} / ${SHELF_MAX}`, tray.x, tray.y);
          ctx.font = FONT;
          continue;
        }

        if (mode === "table" && isDirty(state, seat.id)) {
          // 皿が残っている合図
          ctx.save();
          ctx.shadowColor = "rgba(255,150,120,0.8)";
          ctx.shadowBlur = 8 + pulse * 8;
          ctx.fillStyle = `rgba(255,150,120,${0.4 + pulse * 0.3})`;
          roundRect(ctx, tray.x - 18, tray.y - 9, 36, 18, 8);
          ctx.fill();
          ctx.restore();
          ctx.font = SMALL;
          ctx.fillStyle = "#ffe0d2";
          ctx.fillText("片づけ", tray.x, tray.y);
          ctx.font = FONT;
          continue;
        }

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

        // 2つ以上いる場所は、必要な数を出す
        const need = seatCost(seat);
        if (need > 1) {
          ctx.fillStyle = hot ? "#3a2a12" : "rgba(246,231,207,0.75)";
          ctx.font = SMALL;
          ctx.fillText(`×${need}`, tray.x, tray.y + 1);
          ctx.font = FONT;
        }

        if (eating) {
          const span = mode === "table" ? EAT_TIME * 1.6 : EAT_TIME;
          const left = Math.max(0, eating.timer) / span;
          if (mode === "table") plate(ctx, tray.x, tray.y, 1.2);
          else bowl(ctx, tray.x, tray.y, left > 0.88 ? 1.35 : 1.15);
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

      /* --- 店の外（歩道と道路 / パークは並木道） --- */
      const top = outsideTop(state);
      ctx.fillStyle = isPark ? "#4a5568" : "#332e28";
      ctx.fillRect(box.x0, top, box.x1 - box.x0, 44);
      ctx.fillStyle = isPark ? "#2c4433" : "#1c1b1d";
      ctx.fillRect(box.x0, top + 44, box.x1 - box.x0, OUTSIDE_DEPTH - 44);
      ctx.strokeStyle = "rgba(246,231,207,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(box.x0, top + 44);
      ctx.lineTo(box.x1, top + 44);
      ctx.stroke();
      if (isPark) {
        // 芝生の並木道
        for (let x = box.x0 + 30; x < box.x1; x += 96) {
          const ty = top + 96;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(x, ty + 2, 14, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#6b5433";
          ctx.fillRect(x - 3, ty - 22, 6, 22);
          ctx.fillStyle = "#4f7a44";
          ctx.beginPath();
          ctx.arc(x, ty - 30, 15, 0, Math.PI * 2);
          ctx.arc(x - 11, ty - 22, 10, 0, Math.PI * 2);
          ctx.arc(x + 11, ty - 22, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        for (let x = box.x0; x < box.x1; x += 24) {
          ctx.fillRect(x + 3, top + 8, 18, 28);
        }
      } else {
        ctx.strokeStyle = "rgba(246,231,207,0.25)";
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 14]);
        ctx.beginPath();
        ctx.moveTo(box.x0, top + 92);
        ctx.lineTo(box.x1, top + 92);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 入場券売り場と改札（入場のあるステージだけ）
      if (hasGate()) {
        const booth = boothPos(state);
        const gate = turnstilePos(state);

        // 券売所の小屋
        shadow(ctx, booth.x, booth.y + 16, 26);
        ctx.fillStyle = "#37507a";
        roundRect(ctx, booth.x - 30, booth.y - 30, 60, 44, 6);
        ctx.fill();
        ctx.fillStyle = "#4d6b9e";
        roundRect(ctx, booth.x - 34, booth.y - 38, 68, 12, 5);
        ctx.fill();
        ctx.fillStyle = "#16202c";
        roundRect(ctx, booth.x - 20, booth.y - 20, 40, 16, 3);
        ctx.fill();
        ctx.fillStyle = "#ffd166";
        ctx.font = SMALL;
        ctx.fillText("入場券", booth.x, booth.y - 32);
        ctx.font = FONT;
        ticket(ctx, booth.x, booth.y + 2, 1.1);
        const selling = hasEquip(state, "vend");
        ctx.fillStyle = selling
          ? `rgba(126,231,168,${0.5 + Math.abs(Math.sin(time * 3)) * 0.5})`
          : "rgba(255,209,102,0.6)";
        ctx.beginPath();
        ctx.arc(booth.x + 22, booth.y - 24, 3, 0, Math.PI * 2);
        ctx.fill();

        // 改札
        shadow(ctx, gate.x, gate.y + 14, 22);
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#3d4c68";
          roundRect(ctx, gate.x + side * 18 - 8, gate.y - 20, 16, 34, 4);
          ctx.fill();
          ctx.fillStyle = "#6bd3ff";
          roundRect(ctx, gate.x + side * 18 - 6, gate.y - 16, 12, 4, 2);
          ctx.fill();
        }
        const autoGate = hasEquip(state, "turnstile");
        const flap = autoGate ? (Math.sin(time * 3) + 1) / 2 : 0.15;
        ctx.fillStyle = "rgba(180,230,255,0.75)";
        roundRect(ctx, gate.x - 10, gate.y - 8, 9 * (1 - flap) + 1, 20, 2);
        ctx.fill();
        roundRect(ctx, gate.x + 10 - (9 * (1 - flap) + 1), gate.y - 8, 9 * (1 - flap) + 1, 20, 2);
        ctx.fill();
        ctx.font = SMALL;
        ctx.fillStyle = "rgba(246,231,207,0.6)";
        ctx.fillText(autoGate ? "自動改札" : "改札", gate.x, gate.y - 26);
        ctx.font = FONT;
      }

      // 店の壁と入口
      ctx.fillStyle = isPark ? "#2f3a52" : "#241d18";
      ctx.fillRect(box.x0, top - 10, box.x1 - box.x0, 10);
      const entrance = entrancePos(state);
      ctx.fillStyle = "#0f0c0a";
      roundRect(ctx, entrance.x - 34, top - 12, 68, 14, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(246,231,207,0.5)";
      ctx.font = SMALL;
      ctx.fillText(isPark ? "入園口" : "入口", entrance.x, top - 5);
      ctx.font = FONT;

      // 集客が上がるほど、外の通りがにぎわう
      const draw = customerDraw(state);
      const crowd = Math.min(14, Math.round((draw - 1) * 4));
      for (let i = 0; i < crowd; i += 1) {
        const span = box.x1 - box.x0 + 120;
        const dir = i % 2 === 0 ? 1 : -1;
        const base = (time * (14 + (i % 3) * 5) + i * 97) % span;
        const px = dir > 0 ? box.x0 - 60 + base : box.x1 + 60 - base;
        const py = top + 62 + ((i * 37) % 34);
        const palette = ["#5b7fbc", "#7a6bb5", "#4f9e83", "#c07a4a", "#a35b7a"];
        person(ctx, px, py, palette[i % palette.length], "#f0cfae", time * 8 + i);
      }

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

      /* --- 場所ごとの自動供給機 --- */
      for (const seat of openSeats(state)) {
        if (!hasAuto(state, seat)) continue;
        const at = autoPos(seat);
        shadow(ctx, at.x, at.y + 16, 12);
        ctx.fillStyle = "#3f4a5a";
        roundRect(ctx, at.x - 12, at.y - 22, 24, 36, 4);
        ctx.fill();
        ctx.fillStyle = "#25303d";
        roundRect(ctx, at.x - 9, at.y - 18, 18, 14, 2);
        ctx.fill();
        for (let i = 0; i < 4; i += 1) {
          ctx.fillStyle =
            (i + Math.floor(time * 3)) % 4 === 0 ? "#ffd166" : "#7f8c9c";
          roundRect(ctx, at.x - 8 + (i % 2) * 9, at.y - 17 + Math.floor(i / 2) * 6, 7, 4, 1);
          ctx.fill();
        }
        // 出てくる口
        ctx.fillStyle = "#151c25";
        roundRect(ctx, at.x - 7, at.y - 1, 14, 4, 2);
        ctx.fill();
        const busy = (state.autoTimer[seat.id] ?? 0) > 0;
        ctx.fillStyle = busy
          ? `rgba(126,231,168,${0.5 + Math.abs(Math.sin(time * 6)) * 0.5})`
          : "rgba(126,231,168,0.35)";
        ctx.beginPath();
        ctx.arc(at.x + 7, at.y - 26, 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (busy) {
          const ratio = Math.min(1, (state.autoTimer[seat.id] ?? 0) / AUTO_TIME);
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          roundRect(ctx, at.x - 12, at.y + 16, 24, 4, 2);
          ctx.fill();
          ctx.fillStyle = "#7ee7a8";
          roundRect(ctx, at.x - 12, at.y + 16, 24 * ratio, 4, 2);
          ctx.fill();
        }
      }

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
        busser: "#4f9e83",
        stocker: "#b5763f",
        server: "#c2402f",
        seller: "#3f7fbf",
        gatekeeper: "#2f6f5a",
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
            // まだまわる予定が残っている人は、頭の上に丸が出る
            const left = Math.max(0, customer.budget - customer.visits - 1);
            if (left > 0 && customer.state !== "leaving") {
              for (let i = 0; i < Math.min(4, left); i += 1) {
                ctx.fillStyle = "rgba(255,209,102,0.85)";
                ctx.beginPath();
                ctx.arc(
                  customer.pos.x - (Math.min(4, left) - 1) * 3 + i * 6,
                  customer.pos.y - 32,
                  2,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();
              }
            }
            // 入場を待っている人は、頭の上に入場券のしるし
            if (
              (customer.state === "buying" || customer.state === "entering") &&
              customer.timer >= 1
            ) {
              const bob = Math.sin(time * 4 + customer.id) * 2;
              ctx.save();
              ctx.shadowColor = "rgba(255,209,102,0.8)";
              ctx.shadowBlur = 8;
              ticket(ctx, customer.pos.x, customer.pos.y - 34 + bob, 0.9);
              ctx.restore();
            }
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
              const gait =
                worker.kind === "master"
                  ? 200
                  : worker.kind === "collector"
                    ? 70
                    : worker.kind === "busser"
                      ? 95
                      : worker.kind === "stocker"
                        ? 130
                        : 110;
              person(
                ctx,
                worker.pos.x,
                worker.pos.y,
                coats[worker.kind],
                "#f0cfae",
                performance.now() / gait + worker.id,
              );
              const wx = worker.pos.x;
              const wy = worker.pos.y;
              if (worker.kind === "cook") {
                // コック帽
                ctx.fillStyle = "#fbf7ef";
                roundRect(ctx, wx - 7, wy - 32, 14, 9, 4);
                ctx.fill();
              }
              if (worker.kind === "master") {
                // 鉢巻きと腕組み
                ctx.fillStyle = "#d94f3d";
                roundRect(ctx, wx - 8, wy - 25, 16, 4, 2);
                ctx.fill();
                ctx.fillStyle = "#1f2833";
                roundRect(ctx, wx - 9, wy - 8, 18, 4, 2);
                ctx.fill();
              }
              if (worker.kind === "waiter") {
                // 前掛けとお盆
                ctx.fillStyle = "rgba(255,255,255,0.75)";
                roundRect(ctx, wx - 6, wy - 6, 12, 10, 2);
                ctx.fill();
                if (worker.carry === 0) {
                  ctx.fillStyle = "#c9b79a";
                  ctx.beginPath();
                  ctx.ellipse(wx + 11, wy - 12, 6, 2.6, 0, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              if (worker.kind === "server") {
                // 料理係: 白い前掛けと丸いトレイ
                ctx.fillStyle = "rgba(255,255,255,0.85)";
                roundRect(ctx, wx - 6, wy - 7, 12, 11, 2);
                ctx.fill();
                ctx.fillStyle = "#c9b79a";
                ctx.beginPath();
                ctx.ellipse(wx + 12, wy - 14, 7, 3, 0, 0, Math.PI * 2);
                ctx.fill();
              }
              if (worker.kind === "collector") {
                // 集金かばん
                ctx.fillStyle = "#2f3b4d";
                roundRect(ctx, wx + 7, wy - 10, 9, 8, 2);
                ctx.fill();
                ctx.fillStyle = "#ffd166";
                ctx.beginPath();
                ctx.arc(wx + 11.5, wy - 6, 2, 0, Math.PI * 2);
                ctx.fill();
              }
              if (worker.kind === "busser") {
                // ふきんとバケツ
                ctx.fillStyle = "#dff3ea";
                roundRect(ctx, wx - 14, wy - 10, 8, 6, 2);
                ctx.fill();
                ctx.fillStyle = "#6b7a8c";
                roundRect(ctx, wx + 7, wy - 4, 10, 9, 2);
                ctx.fill();
                if (worker.charge > 0) {
                  // 拭いている最中
                  const swipe = Math.sin(time * 12) * 5;
                  ctx.fillStyle = "rgba(220,245,255,0.8)";
                  roundRect(ctx, wx - 4 + swipe, wy - 18, 10, 4, 2);
                  ctx.fill();
                  ctx.fillStyle = "rgba(220,245,255,0.5)";
                  ctx.font = SMALL;
                  ctx.fillText("ふきふき", wx, wy - 34);
                  ctx.font = FONT;
                }
              }
              if (worker.kind === "seller") {
                // 制帽と、手元の券つづり
                ctx.fillStyle = "#26456b";
                roundRect(ctx, wx - 8, wy - 31, 16, 6, 2);
                ctx.fill();
                ctx.fillStyle = "#1b3350";
                roundRect(ctx, wx - 10, wy - 26, 20, 3, 1.5);
                ctx.fill();
                ctx.fillStyle = "#ffd166";
                roundRect(ctx, wx + 8, wy - 12, 9, 7, 1.5);
                ctx.fill();
                ctx.fillStyle = "#c9962b";
                roundRect(ctx, wx + 10, wy - 10, 5, 1.5, 0.75);
                ctx.fill();
                if (worker.charge > 0) {
                  ctx.fillStyle = "rgba(255,225,150,0.75)";
                  ctx.font = SMALL;
                  ctx.fillText("1枚どうぞ", wx, wy - 36);
                  ctx.font = FONT;
                }
              }
              if (worker.kind === "gatekeeper") {
                // 制帽と、改札ばさみ
                ctx.fillStyle = "#1f4a3c";
                roundRect(ctx, wx - 8, wy - 31, 16, 6, 2);
                ctx.fill();
                ctx.fillStyle = "#14342a";
                roundRect(ctx, wx - 10, wy - 26, 20, 3, 1.5);
                ctx.fill();
                const snip = worker.charge > 0 ? Math.sin(time * 18) * 2 : 0;
                ctx.strokeStyle = "#c8d4dd";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wx + 8, wy - 12);
                ctx.lineTo(wx + 15, wy - 15 - snip);
                ctx.moveTo(wx + 8, wy - 12);
                ctx.lineTo(wx + 15, wy - 9 + snip);
                ctx.stroke();
                if (worker.charge > 0) {
                  ctx.fillStyle = "rgba(200,235,220,0.75)";
                  ctx.font = SMALL;
                  ctx.fillText("どうぞ", wx, wy - 36);
                  ctx.font = FONT;
                }
              }
              if (worker.kind === "stocker") {
                // 台車
                ctx.fillStyle = "#5a4a38";
                roundRect(ctx, wx - 16, wy + 2, 20, 6, 2);
                ctx.fill();
                ctx.fillStyle = "#2b2b33";
                ctx.beginPath();
                ctx.arc(wx - 12, wy + 9, 2.6, 0, Math.PI * 2);
                ctx.arc(wx - 1, wy + 9, 2.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#8a7a5a";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wx + 4, wy + 4);
                ctx.lineTo(wx + 8, wy - 10);
                ctx.stroke();
              }
            }
            for (let i = 0; i < worker.carry; i += 1) {
              held(ctx, worker.item, worker.pos.x, worker.pos.y - 30 - i * 6, 0.85);
            }
          },
        });
      }

      const player = state.player;
      const skin = equippedSkin();
      const stars = equippedStars();
      actors.push({
        y: player.pos.y,
        render: () => {
          if (stars > 0) drawShine(ctx, player.pos.x, player.pos.y, stars, time);
          ctx.save();
          if (stars > 0) {
            // ★の数だけ、ふちが強く光る
            ctx.shadowColor =
              stars >= 3
                ? `hsla(${(time * 90) % 360}, 90%, 65%, 0.95)`
                : stars === 2
                  ? "rgba(180,230,255,0.9)"
                  : "rgba(255,225,150,0.85)";
            ctx.shadowBlur = 6 + stars * 4 + Math.sin(time * 4) * 2;
          }
          person(ctx, player.pos.x, player.pos.y, skin.coat, skin.head, player.step);
          if (skin.face) {
            drawFace(
              ctx,
              skin.face,
              skin.faceColor ?? skin.coat,
              skin.head,
              player.pos.x,
              player.pos.y,
              time,
            );
          } else if (skin.hat === "none") {
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
          ctx.restore();
          for (let i = 0; i < player.carry; i += 1) {
            held(ctx, player.item, player.pos.x, player.pos.y - 34 - i * 6);
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
      const info = inspect.current;
      if (info) {
        ctx.font = FONT;
        const lines = info.lines;
        const close = "タップで閉じる";
        const width =
          Math.max(
            ctx.measureText(info.title).width + 8,
            ctx.measureText(close).width,
            ...lines.map((line) => ctx.measureText(line).width),
          ) + 22;
        const height = 26 + lines.length * 15 + 15;
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
        ctx.fillStyle = "rgba(232,221,205,0.5)";
        ctx.font = SMALL;
        ctx.fillText(close, cx, top + 36 + lines.length * 15);
        ctx.font = FONT;
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
      // 説明が出ているあいだは、どこを触っても閉じるだけ
      if (inspect.current) {
        inspect.current = null;
        stick.current = null;
        input.current = { x: 0, y: 0 };
        return;
      }
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
      // 説明は指を離しても消えない。読み終わったら画面をタップして閉じる
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
          inspect.current = found;
          input.current = { x: 0, y: 0 };
        } else {
          s.moved = true;
        }
      }
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
        for (const entry of state.sfx) {
          if (typeof entry === "object") {
            // 連鎖チャイムは、段ごとに音が上がるので毎回鳴らす
            playCombo(entry.combo);
            continue;
          }
          if (played.has(entry)) continue;
          played.add(entry);
          playSound(entry);
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
          item: state.player.item,
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
