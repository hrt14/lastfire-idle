"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EAT_TIME,
  KITCHEN,
  PAD_RADIUS,
  TREE_REGROW,
  availablePads,
  currency,
  currentObjective,
  inspectAt,
  itemLabel,
  maxCarry,
  viewWidth,
  AUTO_TIME,
  autoPos,
  boothPos,
  hasGate,
  turnstilePos,
  customerDraw,
  hasAuto,
  openSeats,
  openStoves,
  carryOf,
  carryTotal,
  topKind,
  seatCost,
  seatMode,
  seatNeeds,
  isDirty,
  isManned,
  shelfStock,
  SHELF_MAX,
  stoveItem,
  isStation,
  fuelAt,
  heldAt,
  holdCap,
  huntZone,
  RIVER_LANE,
  seatById,
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
  openingsOf,
  roomRects,
  wallsOn,
  worldBounds,
  padLevel,
  padPrice,
  trayPos,
  update,
  isBuild,
  isStore,
  isPile,
  isDone,
  partsAt,
  recommendedPad,
  type Inspect,
  type Input,
  type OfflineReport,
  type ShopState,
  type StaffKind,
  type UpgradeId,
} from "@/lib/shop";
import {
  darkness as onsenDark,
  festivalOn,
  onsenLive,
  phaseLabel as onsenPhaseLabel,
  phaseLeft as onsenPhaseLeft,
  reputation,
  springCap,
  springLabel,
  springUse,
  weatherLabel,
} from "@/lib/onsen";
import {
  buildRatio,
  darkness,
  DAY_TIME,
  DUSK_TIME,
  fireLive,
  nightNeed,
  phaseLabel,
  phaseLeft,
  popCap,
  REPORT_SHOW,
  reportVisible,
  snowDepth,
  stockIn,
  tempLabel,
  winterOn,
  beastZone,
} from "@/lib/fire";
import {
  SEASON_TIME,
  fertile,
  flooding as taigaFlooding,
  riverRise,
  fieldCount,
  flooding,
  season,
  seasonLeft,
  seasonMark,
  seasonName,
  taigaLive,
  townPop,
  handCount,
  handsLeft,
  jobsOpen,
  type Job,
  TOWN_BUILDS,
  TOWN_POP,
} from "@/lib/taiga";
import {
  catchUp,
  equippedSkin,
  equippedStars,
  getState,
  save,
} from "@/lib/shopStore";
import type { Aura, Face, Hat } from "@/data/skins";
import type { Beast } from "@/lib/fire";
import { formatMoney } from "@/lib/format";
import { isMuted, loadMuted, playCombo, playSound, unlockAudio } from "@/lib/sfx";
import { isBgmMuted, loadBgmMuted, suspendBgm, updateBgm, type Scene } from "@/lib/bgm";

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
  bgmMuted: boolean;
  offline: OfflineReport | null;
  /**
   * 湯けむり温泉街の、町の様子（それ以外のステージでは null）。
   * 時刻・天気・湯量・評判をHUDに出す（仕様書 §18.1）
   */
  town: {
    phase: string;
    weather: string;
    left: number;
    springUse: number;
    springCap: number;
    fame: number;
    festival: boolean;
    cleared: boolean;
  } | null;
  /** 大河の文明の、人手の割りふり（それ以外のステージでは null） */
  crew: {
    open: boolean;
    hands: number;
    left: number;
    pop: number;
    jobs: Record<Job, number>;
  } | null;
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

/** 区画の名前。「〜をつくる」などの語尾を落として、看板に出す形にする */
const areaTitle = (label: string) =>
  label.replace(/(をつくる|をひらく|へ下りる)$/, "");

/** 看板の文字を一字ずつ空ける（ら ー め ん） */
const spaced = (text: string) => [...text].join(" ");

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

/**
 * 火山の秘境の山。
 * 券売所の帯（画面のいちばん奥）に重なる位置なので、帯を塗ったあとに呼ぶ
 */
const drawVolcano = (
  ctx: CanvasRenderingContext2D,
  rect: { x0: number; y0: number; x1: number; y1: number },
  time: number,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const top = rect.y0 + 74;
  const foot = rect.y0 + 196;
  const beat = 0.55 + Math.abs(Math.sin(time * 1.6)) * 0.45;

  // 火口のまわりのぼんやりした明かり
  const halo = ctx.createRadialGradient(cx, top, 4, cx, top, 70);
  halo.addColorStop(0, `rgba(255,140,60,${0.22 * beat})`);
  halo.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 70, top - 70, 140, 140);

  // 山（左が明るい面、右が影）
  ctx.fillStyle = "#3f2b28";
  ctx.beginPath();
  ctx.moveTo(cx - 84, foot);
  ctx.lineTo(cx - 20, top);
  ctx.lineTo(cx + 20, top);
  ctx.lineTo(cx + 84, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.moveTo(cx - 84, foot);
  ctx.lineTo(cx - 20, top);
  ctx.lineTo(cx - 2, top);
  ctx.lineTo(cx - 18, foot);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.moveTo(cx + 84, foot);
  ctx.lineTo(cx + 20, top);
  ctx.lineTo(cx + 8, top);
  ctx.lineTo(cx + 40, foot);
  ctx.closePath();
  ctx.fill();

  // 火口。脈打つように光る
  ctx.fillStyle = "#2b1d1b";
  ctx.beginPath();
  ctx.ellipse(cx, top, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,150,60,${beat})`;
  ctx.beginPath();
  ctx.ellipse(cx, top, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 流れ落ちる溶岩
  ctx.lineWidth = 2.4;
  for (const [i, side] of [-1, 1].entries()) {
    ctx.strokeStyle = `rgba(255,${110 + i * 30},50,${0.4 + beat * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(cx + side * 6, top + 3);
    ctx.quadraticCurveTo(
      cx + side * 26,
      top + 54,
      cx + side * 40 + Math.sin(time + i) * 3,
      foot - 6,
    );
    ctx.stroke();
  }

  // 火口から跳ねる火の粉
  for (let i = 0; i < 6; i += 1) {
    const t = (time * 0.7 + i / 6) % 1;
    const ex = cx + Math.sin(i * 2.1) * 16 * t;
    const ey = top - 4 - t * 34 + t * t * 18;
    ctx.fillStyle = `rgba(255,190,90,${(1 - t) * 0.9})`;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2 - t, 0, Math.PI * 2);
    ctx.fill();
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
  if (stage().id === "onsen") {
    drawOnsenProps(ctx, rect, palette.prop, time);
    return;
  }
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
  if (palette.prop === "volcano") {
    // 山は券売所の帯にかかるので、帯を塗ったあとに別で描く（drawVolcano）。
    // ここは足もと ― 溶岩の固まった原っぱ
    const rows = Math.floor((rect.y1 - 90 - (rect.y0 + 840)) / 150) + 1;
    for (let row = 0; row < rows; row += 1) {
      const y = rect.y0 + 840 + row * 150;
      const shift = (row % 2) * 34;
      for (const [k, at] of [rect.x0 + 56, cx + 26, rect.x1 - 62].entries()) {
        const x = at - shift;
        const seed = row * 3 + k;
        if (seed % 4 === 1) {
          // 噴気孔（湯気が立つ）
          ctx.fillStyle = "#33211d";
          ctx.beginPath();
          ctx.ellipse(x, y, 15, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 3; i += 1) {
            const t = (time * 0.4 + i / 3 + k * 0.2) % 1;
            ctx.fillStyle = `rgba(210,200,196,${0.22 * (1 - t)})`;
            ctx.beginPath();
            ctx.arc(x + Math.sin(t * 4 + k) * 6, y - 6 - t * 34, 5 + t * 9, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // ごつごつした溶岩の岩（高さと向きを少しずつ変える）
          const tall = 8 + (seed % 3) * 6;
          ctx.fillStyle = "#33211d";
          ctx.beginPath();
          ctx.moveTo(x - 20, y + 8);
          ctx.lineTo(x - 10, y - tall);
          ctx.lineTo(x + 3, y - tall * 0.4);
          ctx.lineTo(x + 15, y - tall * 1.2);
          ctx.lineTo(x + 22, y + 8);
          ctx.closePath();
          ctx.fill();
          // ふちに残る熱
          ctx.fillStyle = "rgba(255,120,50,0.2)";
          ctx.fillRect(x - 16, y + 5, 34, 3);
        }
      }
    }
    // ふもとの溶岩だまり
    for (const x of spots) {
      ctx.fillStyle = "#3a221c";
      ctx.beginPath();
      ctx.ellipse(x, baseY, 27, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,120,40,${0.5 + Math.abs(Math.sin(time * 2 + x)) * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x, baseY, 19, 8, 0, 0, Math.PI * 2);
      ctx.fill();
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

/** 立ちのぼる湯気 */
const steamPuffs = (ctx: CanvasRenderingContext2D, time: number, from = -8) => {
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  for (let i = 0; i < 2; i += 1) {
    const t = (time * 0.6 + i * 0.5) % 1;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 6 + i) * 3, from - t * 12, 2.4 - t * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

/**
 * ワーキングプラネットの工程の品。
 *
 * 色だけでなく形でも見分けられるようにする（§8.3）。
 *   生肉   骨つきの赤身。白い骨が横に突き出る
 *   丸太   樹皮と年輪の見える太い木材。横向き
 *   薪     割った薪を3本たばねた、とがった束
 *   焼き肉 串と焦げ目のついた、湯気の立つ肉
 */
const chainItem = (
  ctx: CanvasRenderingContext2D,
  item: string,
  x: number,
  y: number,
  s: number,
  time: number,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 5, 6);

  if (item === "meat") {
    // 生肉: 赤身のかたまり + 白い骨 + 脂身のふち
    ctx.fillStyle = "#e8ddc8";
    roundRect(ctx, 3, -2.4, 8, 3.4, 1.7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10.5, -0.7, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0402f";
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.quadraticCurveTo(2, -7.5, 5, -1.5);
    ctx.quadraticCurveTo(2, 6, -6, 4);
    ctx.quadraticCurveTo(-9.5, 0.5, -7, -4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,236,220,0.6)";
    ctx.beginPath();
    ctx.ellipse(-5.6, -1.4, 2.2, 3.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "log") {
    // 丸太: 樹皮のついた太い木材。切り口に年輪
    ctx.fillStyle = "#6b4a2b";
    roundRect(ctx, -9, -4.5, 17, 9, 2.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 0.9;
    for (const bx of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(bx, -4.2);
      ctx.lineTo(bx - 1, 4.2);
      ctx.stroke();
    }
    ctx.fillStyle = "#c79a5e";
    ctx.beginPath();
    ctx.ellipse(8, 0, 2.6, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6236";
    ctx.lineWidth = 0.8;
    for (const r of [1, 2]) {
      ctx.beginPath();
      ctx.ellipse(8, 0, r * 0.8, r * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "wood") {
    // 薪: 割った薪を3本たばねた束。先がとがっていて丸太と見分けられる
    for (const [i, oy] of [-3.4, 0, 3.4].entries()) {
      ctx.fillStyle = i === 1 ? "#c79a5e" : "#a9743f";
      ctx.beginPath();
      ctx.moveTo(-8, oy - 1.5);
      ctx.lineTo(5, oy - 1.9);
      ctx.lineTo(8.5, oy);
      ctx.lineTo(5, oy + 1.9);
      ctx.lineTo(-8, oy + 1.5);
      ctx.closePath();
      ctx.fill();
    }
    // たばねたつる
    ctx.strokeStyle = "#5a4024";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, -5.6);
    ctx.lineTo(-2, 5.6);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "roast" || item === "feast") {
    const big = item === "feast";
    // 焼き肉: 串に刺した焼き色つきの肉。焦げ目と湯気
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.lineTo(9, -5);
    ctx.stroke();
    ctx.fillStyle = big ? "#b06a2a" : "#8a4a24";
    ctx.beginPath();
    ctx.ellipse(0, 0, big ? 8 : 6.6, big ? 6 : 4.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9903f";
    ctx.beginPath();
    ctx.ellipse(-1.4, -1.2, big ? 4.4 : 3.4, big ? 3 : 2.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // 焦げ目
    ctx.strokeStyle = "rgba(40,22,10,0.75)";
    ctx.lineWidth = 1;
    for (const g of [-2.2, 0.6, 3.4]) {
      ctx.beginPath();
      ctx.moveTo(g - 2.4, -3.6);
      ctx.lineTo(g + 1.4, 3.4);
      ctx.stroke();
    }
    steamPuffs(ctx, time, big ? -9 : -7);
    ctx.restore();
    return;
  }

  if (item === "cut") {
    // 切り身: 平たい四角の身。脂の筋が入る
    ctx.fillStyle = "#d98a7a";
    roundRect(ctx, -7, -4.5, 14, 9, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,235,0.7)";
    ctx.lineWidth = 1;
    for (const ly of [-1.6, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(-6, ly);
      ctx.lineTo(6, ly - 0.8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "smoked") {
    // 保存肉: つるして燻した肉の束。ひもで縛ってある
    ctx.strokeStyle = "#6b5a3a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -3);
    ctx.stroke();
    for (const [i, ox] of [-3.6, 0, 3.6].entries()) {
      ctx.fillStyle = i === 1 ? "#7a3f22" : "#5f3018";
      roundRect(ctx, ox - 2.2, -3, 4.4, 10, 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#c9b389";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 1.5);
    ctx.lineTo(6, 1.5);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "mmeat") {
    // マンモス肉: 焼き肉より大きい赤身のかたまり。骨が太い
    ctx.fillStyle = "#e8ddc8";
    roundRect(ctx, 4, -3, 9, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12.5, -1, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9c3327";
    ctx.beginPath();
    ctx.moveTo(-9, -5.5);
    ctx.quadraticCurveTo(3, -10, 6, -2);
    ctx.quadraticCurveTo(3, 8, -8, 5.5);
    ctx.quadraticCurveTo(-12, 0, -9, -5.5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,236,220,0.5)";
    ctx.beginPath();
    ctx.ellipse(-6, -1.6, 2.6, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "hide") {
    // 毛皮: 丸めた皮。裏は白く、表は茶の毛
    ctx.fillStyle = "#6b4a30";
    roundRect(ctx, -8, -5, 16, 10, 4);
    ctx.fill();
    ctx.fillStyle = "#e6d6bd";
    ctx.beginPath();
    ctx.ellipse(-7, 0, 2.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,26,14,0.5)";
    ctx.lineWidth = 0.9;
    for (const ox of [-2, 2, 6]) {
      ctx.beginPath();
      ctx.moveTo(ox, -4.4);
      ctx.lineTo(ox, 4.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "bone") {
    // 骨: 太い骨を2本たばねたもの
    ctx.strokeStyle = "#e6e2d4";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.lineTo(7, -3);
    ctx.moveTo(-7, -2);
    ctx.lineTo(6, 4);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "#f2eee2";
    for (const [bx, by] of [[-7, 3], [7, -3], [-7, -2], [6, 4]]) {
      ctx.beginPath();
      ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (item === "fat") {
    // 脂: 皮の袋に入れた脂。口をひもで縛ってある
    ctx.fillStyle = "#d8c48d";
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 6.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b39c62";
    roundRect(ctx, -2.6, -7, 5.2, 5, 1.6);
    ctx.fill();
    ctx.strokeStyle = "#7a6435";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3.4, -3.4);
    ctx.lineTo(3.4, -3.4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "tusk") {
    // 牙: 大きく湾曲した1本
    ctx.strokeStyle = "#f0e9d6";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(2, 2, 8, -6);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(160,140,100,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 4.6);
    ctx.quadraticCurveTo(2, 2.6, 7, -5);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "coat") {
    // 防寒着: えりに毛のついた上着
    ctx.fillStyle = "#7a5433";
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(7, -3);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d9cbb2";
    ctx.beginPath();
    ctx.ellipse(0, -3.6, 5.4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5f3f26";
    roundRect(ctx, -1, -2, 2, 8, 1);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "clay") {
    // 粘土: 湿った土のかたまり
    ctx.fillStyle = "#8a6a58";
    ctx.beginPath();
    ctx.ellipse(0, 1, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a08272";
    ctx.beginPath();
    ctx.ellipse(-1.6, -1, 4, 2.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "pot") {
    // 土器: 口の広いつぼ。もようが入っている
    ctx.fillStyle = "#b06a3f";
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.quadraticCurveTo(-8, 2, -4, 6);
    ctx.lineTo(4, 6);
    ctx.quadraticCurveTo(8, 2, 5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a4f2c";
    ctx.beginPath();
    ctx.ellipse(0, -5, 5.4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,225,195,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5.6, 0.5);
    ctx.lineTo(5.6, 0.5);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "tool") {
    // 道具: 骨の柄に石の刃をくくった手斧
    ctx.strokeStyle = "#c8b68d";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(3, -5);
    ctx.stroke();
    ctx.fillStyle = "#9aa3ad";
    ctx.beginPath();
    ctx.moveTo(1, -4);
    ctx.lineTo(8, -7);
    ctx.lineTo(7, -1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6b5a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.6, -2.4);
    ctx.lineTo(4.4, -4.4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "plank") {
    // 加工木材: 面を削って平らにした板
    ctx.fillStyle = "#c79a5e";
    roundRect(ctx, -9, -4, 18, 8, 1.5);
    ctx.fill();
    ctx.fillStyle = "#e0bb85";
    roundRect(ctx, -9, -4, 18, 2.6, 1.2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,86,48,0.7)";
    ctx.lineWidth = 0.9;
    for (const ox of [-4, 1, 5]) {
      ctx.beginPath();
      ctx.moveTo(ox, -3.4);
      ctx.lineTo(ox + 1, 3.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "rope") {
    // 縄: ぐるぐる巻いた縄の輪
    ctx.strokeStyle = "#b79a63";
    ctx.lineWidth = 2.4;
    for (const r of [6.4, 4]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.66, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(90,70,40,0.6)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 3.4, Math.sin(a) * 2.4);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 4.8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "fish") {
    // 魚: 川の魚。尾びれと目
    ctx.fillStyle = "#7fa8bf";
    ctx.beginPath();
    ctx.ellipse(-1, 0, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(9.5, -4);
    ctx.lineTo(9.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-3, -1, 3, 1.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2b33";
    ctx.beginPath();
    ctx.arc(-5.4, -0.8, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  /* ---------- 大河の文明 ---------- */

  if (item === "water") {
    // 水: 水を張った土の器。ふちで水面がゆれる
    ctx.fillStyle = "#a8724a";
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.quadraticCurveTo(-8, 6, 0, 7);
    ctx.quadraticCurveTo(8, 6, 7, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3f9bb0";
    ctx.beginPath();
    ctx.ellipse(0, -4, 7, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,245,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-2.4, -4.4, 2.6, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "seed") {
    // 種: 小さな粒が3つ、麻の袋に入っている
    ctx.fillStyle = "#c2ad84";
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 6.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a7350";
    roundRect(ctx, -3, -6.5, 6, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#e0c268";
    for (const [dx, dy] of [[-2.4, 2], [0.6, 3.4], [2.6, 1]]) {
      ctx.beginPath();
      ctx.ellipse(dx, dy, 1.5, 2.1, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (item === "grain") {
    // 穀物: 刈り取った穂の束。縄でしばってある
    ctx.strokeStyle = "#c9a95e";
    ctx.lineWidth = 1.4;
    for (const dx of [-3.5, 0, 3.5]) {
      ctx.beginPath();
      ctx.moveTo(dx * 0.6, 7);
      ctx.lineTo(dx, -7);
      ctx.stroke();
      ctx.fillStyle = "#e8c86a";
      ctx.beginPath();
      ctx.ellipse(dx, -6.5, 2, 4, dx * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4.5, 2);
    ctx.lineTo(4.5, 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "flour") {
    // 粉: 白い粉を盛った浅い器
    ctx.fillStyle = "#9a8f7c";
    ctx.beginPath();
    ctx.ellipse(0, 3, 8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2ecdc";
    ctx.beginPath();
    ctx.moveTo(-7, 2.5);
    ctx.quadraticCurveTo(0, -7, 7, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(-2, -0.5, 2.4, 1.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (item === "bread") {
    // パン: 焼き目の入った丸パン。切りこみが2本
    ctx.fillStyle = "#c98a45";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0a95c";
    ctx.beginPath();
    ctx.ellipse(-1, -1.4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a86a32";
    ctx.lineWidth = 1.2;
    for (const dx of [-2.4, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(dx - 1.6, -3);
      ctx.lineTo(dx + 1.6, 1.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "grass") {
    // 草: 刈った草の束
    for (const [i, dx] of [-4, 0, 4].entries()) {
      ctx.strokeStyle = i === 1 ? "#8fc464" : "#6f9c46";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx * 0.4, 7);
      ctx.quadraticCurveTo(dx, 0, dx * 1.5, -7);
      ctx.stroke();
    }
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, 3);
    ctx.lineTo(4, 3);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "milk") {
    // 乳: 白い乳の入った小さな壺
    ctx.fillStyle = "#b98a5a";
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.quadraticCurveTo(-8, 7, 0, 7.5);
    ctx.quadraticCurveTo(8, 7, 6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f1e8";
    ctx.beginPath();
    ctx.ellipse(0, -3, 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a3c";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6, -1);
    ctx.quadraticCurveTo(9.5, 1, 6, 4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (item === "wool") {
    // 毛: 刈った羊毛のかたまり
    ctx.fillStyle = "#efe9dc";
    for (const [dx, dy, r] of [[-3.4, 0.5, 4.6], [3, -1, 4.2], [0, 2.6, 4]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(150,140,124,0.7)";
    ctx.lineWidth = 0.9;
    for (const [dx, dy] of [[-3.4, 0.5], [3, -1]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, 2.4, 0.4, 3.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item === "dried") {
    // 干し魚: 縄に2尾つるした干物
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(8, -5);
    ctx.stroke();
    for (const dx of [-3.5, 3.5]) {
      ctx.fillStyle = "#c2a17a";
      ctx.beginPath();
      ctx.ellipse(dx, 1, 3, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dx, 6);
      ctx.lineTo(dx - 2.6, 9);
      ctx.lineTo(dx + 2.6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6f5a45";
      ctx.beginPath();
      ctx.arc(dx, -2.4, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // 知らない品は、まるい包みで出しておく
  ctx.fillStyle = "#b98a4a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5a2b";
  ctx.beginPath();
  ctx.ellipse(0, -4, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();
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
 * 持っている荷物を、品種ごとに分けて見せる（§4.6）。
 *
 * 異種の品を1本の縦積みに混ぜず、種類ごとに列を分ける。
 * 3つを超えるぶんは、全部は描かずに `×5` とまとめる。
 */
const drawLoad = (
  ctx: CanvasRenderingContext2D,
  bag: Record<string, number>,
  x: number,
  y: number,
  offset: number,
  time: number,
) => {
  const kinds = Object.keys(bag).filter((kind) => (bag[kind] ?? 0) > 0);
  if (kinds.length === 0) return;
  const span = 13;
  const left = x + offset - ((kinds.length - 1) * span) / 2;
  kinds.forEach((kind, col) => {
    const count = bag[kind] ?? 0;
    const show = Math.min(3, count);
    const cx = left + col * span;
    for (let i = 0; i < show; i += 1) {
      held(ctx, kind, cx, y - i * 6, 0.8);
    }
    if (count > 3) {
      const label = `×${count}`;
      const top = y - show * 6 - 7;
      ctx.font = SMALL;
      ctx.fillStyle = "rgba(10,8,6,0.75)";
      const w = ctx.measureText(label).width + 6;
      roundRect(ctx, cx - w / 2, top - 5, w, 10, 5);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillText(label, cx, top);
      ctx.font = FONT;
    }
  });
  void time;
};

/** 狩り場をうろつく動物 */
const drawPrey = (
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  time: number,
) => {
  const bob = Math.sin(time * 8 + x) * 1.2;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const body =
    kind === "boar" ? "#5a4433" : kind === "deer" ? "#b98a58" : "#c9c2b6";
  // 胴
  ctx.fillStyle = body;
  roundRect(ctx, x - 9, y - 8 + bob, 18, 10, 5);
  ctx.fill();
  // 足
  ctx.strokeStyle = body;
  ctx.lineWidth = 2;
  for (const lx of [x - 6, x + 6]) {
    ctx.beginPath();
    ctx.moveTo(lx, y + 1 + bob);
    ctx.lineTo(lx, y + 6);
    ctx.stroke();
  }
  // 頭
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x + 9, y - 7 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "boar") {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(x + 12, y - 6 + bob, 3, 1.4);
  } else if (kind === "deer") {
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 11 + bob);
    ctx.lineTo(x + 7, y - 16 + bob);
    ctx.moveTo(x + 10, y - 11 + bob);
    ctx.lineTo(x + 13, y - 16 + bob);
    ctx.stroke();
  } else {
    // うさぎの耳
    ctx.fillStyle = body;
    ctx.fillRect(x + 8, y - 15 + bob, 1.6, 6);
    ctx.fillRect(x + 11, y - 15 + bob, 1.6, 6);
  }
};

/** 森に生えている木。切ると切り株になり、しばらくして生えなおす */
const drawTree = (
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  stump: number,
  chop: number,
  time: number,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (stump > 0) {
    // 切り株。芽が出はじめると、もうすぐ生えなおす合図
    ctx.fillStyle = "#5a3f26";
    roundRect(ctx, x - 7, y - 8, 14, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#c79a5e";
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6236";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 3.4, 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (stump < TREE_REGROW * 0.45) {
      ctx.fillStyle = "#6fae52";
      ctx.beginPath();
      ctx.ellipse(x + 3, y - 13, 3.5, 2.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // 幹
  const sway = Math.sin(time * 1.4 + x * 0.05) * 1.2 + chop * Math.sin(time * 22) * 3;
  ctx.fillStyle = "#5f4227";
  roundRect(ctx, x - 3.5, y - 26, 7, 30, 2);
  ctx.fill();
  if (kind === "cedar") {
    // すぎ: とがった三角が3段
    for (let i = 0; i < 3; i += 1) {
      const w = 17 - i * 3.5;
      const ty = y - 24 - i * 11;
      ctx.fillStyle = i === 2 ? "#4f8f4a" : "#3f7a3d";
      ctx.beginPath();
      ctx.moveTo(x + sway * (0.4 + i * 0.3), ty - 15);
      ctx.lineTo(x - w, ty);
      ctx.lineTo(x + w, ty);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === "pine") {
    // まつ: 幹が高く、まるい葉が上に寄る
    ctx.fillStyle = "#4a7c3f";
    for (const [ox, oy, r] of [
      [0, -44, 13],
      [-9, -36, 9],
      [9, -36, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(x + ox + sway, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // ぶな: 横に広い、こんもりした葉
    ctx.fillStyle = "#557f3d";
    ctx.beginPath();
    ctx.ellipse(x + sway, y - 36, 18, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#67934a";
    ctx.beginPath();
    ctx.ellipse(x - 5 + sway, y - 40, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (chop > 0) {
    // 切りかけの傷と、飛び散る木くず
    ctx.fillStyle = "#c79a5e";
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 6);
    ctx.lineTo(x - 4 + 8 * chop, y - 9);
    ctx.lineTo(x - 4 + 8 * chop, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(214,180,120,0.8)";
    for (let i = 0; i < 3; i += 1) {
      const t = (time * 3 + i * 0.4) % 1;
      ctx.beginPath();
      ctx.arc(x - 8 - t * 8, y - 8 - Math.sin(t * Math.PI) * 10, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 進み具合の輪
    ctx.strokeStyle = "rgba(255,209,102,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 2, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chop);
    ctx.stroke();
  }
};

/**
 * マンモス。
 *
 * ふつうの人の3〜4倍の高さ。色を消してもマンモスと分かる形にする:
 * 盛り上がった背中、長い鼻、湾曲した2本の牙、厚い体毛、太い4本の脚。
 */
const drawBeast = (
  ctx: CanvasRenderingContext2D,
  beast: Beast,
  time: number,
) => {
  const { pos, face } = beast;
  const down = beast.state === "down";
  const falling = beast.state === "falling";
  // 倒れるときは、ゆっくり横になる
  const tilt = down ? Math.PI / 2 : falling ? (1 - beast.timer / 2.2) * (Math.PI / 2) : 0;
  const walk = beast.state === "charge" ? 12 : 4;
  const bob = down || falling ? 0 : Math.sin(time * walk) * 2;
  // 解体が進むほど、身が減っていく
  const left = down ? Math.max(0.18, 1 - beast.cut) : 1;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(tilt * 0.9);
  ctx.scale(face, 1);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 54, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  const fur = down ? "#5a4636" : "#6b5340";
  // 太い4本の脚
  ctx.fillStyle = "#4f3c2c";
  for (const [i, ox] of [-30, -14, 14, 30].entries()) {
    const swing = down || falling ? 0 : Math.sin(time * walk + i * 1.6) * 3;
    roundRect(ctx, ox - 8 + swing, -12, 16, 26, 5);
    ctx.fill();
  }
  // 胴と、盛り上がった背中
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-42, 2 + bob);
  ctx.quadraticCurveTo(-46, -34 * left, -20, -44 * left + bob);
  ctx.quadraticCurveTo(4, -54 * left + bob, 26, -40 * left + bob);
  ctx.quadraticCurveTo(46, -30 * left + bob, 42, 4);
  ctx.closePath();
  ctx.fill();
  // 体毛
  ctx.strokeStyle = "rgba(40,28,18,0.35)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i += 1) {
    const hx = -38 + i * 9;
    ctx.beginPath();
    ctx.moveTo(hx, -6 + bob);
    ctx.lineTo(hx - 3, 8);
    ctx.stroke();
  }
  // 重い頭
  ctx.fillStyle = down ? "#54402f" : "#634c39";
  ctx.beginPath();
  ctx.ellipse(38, -26 + bob, 20, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  // 長く動く鼻
  const swing = down || falling ? 0.5 : Math.sin(time * 2.2) * 0.35;
  ctx.strokeStyle = "#5a4433";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(50, -22 + bob);
  ctx.quadraticCurveTo(66, -6 + swing * 14 + bob, 58, 12 + swing * 10);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(58, 10 + swing * 10);
  ctx.lineTo(64, 16 + swing * 8);
  ctx.stroke();
  // 湾曲した2本の牙
  ctx.strokeStyle = "#f0e9d6";
  ctx.lineWidth = 6;
  for (const [oy, curve] of [[-14, 20], [-8, 26]]) {
    ctx.beginPath();
    ctx.moveTo(48, oy + bob);
    ctx.quadraticCurveTo(74, oy + curve * 0.4, 62, oy + curve);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  // 目
  if (!down) {
    ctx.fillStyle = "#1c140e";
    ctx.beginPath();
    ctx.arc(44, -32 + bob, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // 疲れると、鼻から白い息が出る
  if (!down && !falling && beast.stamina <= 0.25) {
    for (let i = 0; i < 3; i += 1) {
      const t = ((time * 0.7 + i * 0.33) % 1);
      ctx.fillStyle = `rgba(230,240,245,${(1 - t) * 0.45})`;
      ctx.beginPath();
      ctx.arc(70 + t * 22, 14 + Math.sin(t * 4) * 6, 3 + t * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 倒れたあとの土煙
  if (falling) {
    const t = 1 - beast.timer / 2.2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = `rgba(170,150,120,${(1 - t) * 0.5})`;
      ctx.beginPath();
      ctx.arc(pos.x + Math.cos(a) * (20 + t * 60), pos.y + 12 + Math.sin(a) * (8 + t * 18), 8 + t * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 体力・持久力の帯
  if (!down) {
    const w = 96;
    const bx = pos.x - w / 2;
    const by = pos.y - 84;
    ctx.fillStyle = "rgba(10,8,6,0.6)";
    roundRect(ctx, bx - 3, by - 3, w + 6, 16, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, bx, by, w, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = "#e8574a";
    roundRect(ctx, bx, by, w * beast.hp, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, bx, by + 7, w, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    roundRect(ctx, bx, by + 7, w * beast.stamina, 4, 2);
    ctx.fill();
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(240,228,206,0.85)";
    ctx.fillText(
      beast.stamina > 0 ? "追い込め（持久力）" : "疲れている ― いまだ",
      pos.x,
      by - 8,
    );
    ctx.font = FONT;
  } else {
    // 解体の進み
    const w = 90;
    const bx = pos.x - w / 2;
    const by = pos.y - 60;
    ctx.fillStyle = "rgba(10,8,6,0.6)";
    roundRect(ctx, bx - 3, by - 3, w + 6, 10, 5);
    ctx.fill();
    ctx.fillStyle = beast.stuck ? "#ff9f8a" : "#7ee7a8";
    roundRect(ctx, bx, by, w * beast.cut, 4, 2);
    ctx.fill();
    ctx.font = SMALL;
    ctx.fillStyle = beast.stuck ? "#ff9f8a" : "rgba(240,228,206,0.85)";
    ctx.fillText(
      beast.stuck ? "仮置き場が満杯だ" : `解体 ${Math.round(beast.cut * 100)}%`,
      pos.x,
      by - 8,
    );
    ctx.font = FONT;
  }
};

/** 屋根つきの小屋。集落の建物はどれもこの形から派生させる */
const hutShape = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  wall: string,
  roof: string,
) => {
  ctx.fillStyle = wall;
  roundRect(ctx, x - w / 2, y - h, w, h, 3);
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 6, y - h);
  ctx.lineTo(x, y - h - 20);
  ctx.lineTo(x + w / 2 + 6, y - h);
  ctx.closePath();
  ctx.fill();
};

/** 積んだ材料の山（仮置き場・倉庫の中身） */
const pileOf = (
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  count: number,
) => {
  const show = Math.min(6, count);
  for (let i = 0; i < show; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    chainItem(ctx, kind, x - 12 + col * 12, y - row * 8, 0.62, 0);
  }
};

/**
 * 第2区画から出てくる建物と作業場。
 * 描けたら true を返す（描けなかったものは今までの絵にまかせる）。
 */
const drawSettlement = (
  ctx: CanvasRenderingContext2D,
  stove: StoveSpec,
  x: number,
  y: number,
  time: number,
  state: ShopState,
): boolean => {
  const art = stove.art ?? "";

  /* --- 建築予定地: 建つまでは骨組み、建つと建物になる --- */
  if (isBuild(stove) && !isDone(state, stove.id)) {
    const ratio = buildRatio(state, stove);
    // 地面をならした跡
    ctx.fillStyle = "rgba(120,96,64,0.28)";
    roundRect(ctx, x - 34, y - 10, 68, 24, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,209,102,0.4)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 34, y - 10, 68, 24, 8);
    ctx.stroke();
    ctx.setLineDash([]);
    // 柱 → 壁 → 屋根の順に立ちあがる
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 3;
    for (const ox of [-20, 20]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 6);
      ctx.lineTo(x + ox, y - 6 - 26 * Math.min(1, ratio * 3));
      ctx.stroke();
    }
    if (ratio > 0.33) {
      ctx.fillStyle = "#7a5a3a";
      const wallH = 26 * Math.min(1, (ratio - 0.33) * 3);
      roundRect(ctx, x - 20, y - 6 - wallH, 40, wallH, 2);
      ctx.fill();
    }
    if (ratio > 0.66) {
      ctx.fillStyle = "#5f4a30";
      ctx.globalAlpha = Math.min(1, (ratio - 0.66) * 3);
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 32);
      ctx.lineTo(x, y - 50);
      ctx.lineTo(x + 28, y - 32);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // まだ足りない材料
    const needs = Object.entries(stove.needs ?? {});
    needs.forEach(([kind, need], i) => {
      const got = partsAt(state, stove.id, kind);
      const sx = x - ((needs.length - 1) * 26) / 2 + i * 26;
      const done = got >= need;
      chainItem(ctx, kind, sx, y + 26, 0.6, time);
      ctx.font = SMALL;
      ctx.fillStyle = done ? "#7ee7a8" : "rgba(255,180,150,0.95)";
      // アイコンだけだと何の資材か分かりにくいので、名前も添える
      ctx.fillText(itemLabel(kind), sx, y + 37);
      ctx.fillText(`${got}/${need}`, sx, y + 48);
      ctx.font = FONT;
    });
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(255,209,102,0.9)";
    ctx.fillText(stove.label ?? "建築予定地", x, y - 58);
    ctx.font = FONT;
    return true;
  }

  /* --- 貯蔵庫: 中身が減るのが外から見える --- */
  if (art === "store" || art === "rack" || art === "woodstore") {
    const have = heldAt(state, stove.id);
    const cap = holdCap(state, stove);
    const ratio = cap === 0 ? 0 : have / cap;
    hutShape(ctx, x, y, 52, 30, art === "woodstore" ? "#5f462c" : "#7a6142", "#4f3d26");
    // 棚の段
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.4;
    for (const oy of [-20, -10]) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y + oy);
      ctx.lineTo(x + 24, y + oy);
      ctx.stroke();
    }
    pileOf(ctx, stove.takes ?? "smoked", x, y - 4, have);
    // 空／少ない／十分／満杯
    const word = have === 0 ? "空" : ratio < 0.34 ? "少ない" : ratio < 0.9 ? "十分" : "満杯";
    ctx.font = SMALL;
    ctx.fillStyle =
      have === 0 ? "#ff9f8a" : ratio < 0.34 ? "#ffd166" : "#7ee7a8";
    ctx.fillText(`${stove.label ?? "貯蔵"} ${have}/${cap}・${word}`, x, y - 40);
    ctx.font = FONT;
    return true;
  }

  /* --- 燻製小屋: 屋根から煙が出て、中に肉がつり下がる --- */
  if (art === "smoke") {
    hutShape(ctx, x, y, 44, 32, "#6b4f33", "#3f3020");
    // 入口の格子から、つるした肉が見える
    ctx.fillStyle = "#241a12";
    roundRect(ctx, x - 14, y - 26, 28, 22, 3);
    ctx.fill();
    for (const ox of [-8, 0, 8]) {
      ctx.strokeStyle = "#8a6a44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 26);
      ctx.lineTo(x + ox, y - 20);
      ctx.stroke();
      ctx.fillStyle = "#6b3218";
      roundRect(ctx, x + ox - 2.4, y - 20, 4.8, 10, 2);
      ctx.fill();
    }
    // 煙。加工中は濃くなる
    const busy = (state.cooking[stove.id] ?? 0) > 0;
    for (let i = 0; i < 4; i += 1) {
      const t = ((time * 0.35 + i * 0.25) % 1);
      ctx.fillStyle = `rgba(215,205,190,${(busy ? 0.4 : 0.14) * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(
        x + 10 + Math.sin(t * 5 + i) * 6,
        y - 52 - t * 30,
        4 + t * (busy ? 7 : 4),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#3f3020";
    roundRect(ctx, x + 6, y - 56, 9, 10, 2);
    ctx.fill();
    return true;
  }

  /* --- 住居・毛皮の住居・大きな住居 --- */
  if (art === "hut" || art === "furhut" || art === "bighut") {
    const big = art === "bighut";
    const w = big ? 62 : 48;
    hutShape(
      ctx,
      x,
      y,
      w,
      big ? 36 : 30,
      art === "furhut" ? "#6f5a45" : "#7a5a3a",
      art === "furhut" ? "#8a7358" : "#4f3d26",
    );
    // 出入口と、中でゆれる火あかり
    ctx.fillStyle = "#241a12";
    roundRect(ctx, x - 7, y - 18, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = `rgba(255,170,80,${0.35 + Math.abs(Math.sin(time * 2 + x)) * 0.35})`;
    roundRect(ctx, x - 5, y - 12, 10, 12, 2);
    ctx.fill();
    if (art === "furhut") {
      // 屋根にかけた毛皮
      ctx.fillStyle = "#5f4630";
      ctx.beginPath();
      ctx.moveTo(x - 18, y - (big ? 36 : 30));
      ctx.lineTo(x, y - (big ? 46 : 40));
      ctx.lineTo(x + 6, y - (big ? 36 : 30));
      ctx.closePath();
      ctx.fill();
    }
    return true;
  }

  /* --- 共同たき火: 夜になると広場が明るくなる --- */
  if (art === "hearth") {
    ctx.fillStyle = "#4a4038";
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 30, y + 10 + Math.sin(a) * 11, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5a3a20";
    for (const rot of [-0.6, 0, 0.6]) {
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(rot);
      roundRect(ctx, -18, -4, 36, 8, 3);
      ctx.fill();
      ctx.restore();
    }
    const lit = stockIn(state, "wood") > 0;
    for (const fx of [x - 10, x, x + 10]) {
      const flame = (lit ? 0.7 : 0.15) + Math.abs(Math.sin(time * 5 + fx)) * 0.4;
      const tall = lit ? 40 : 12;
      ctx.fillStyle = `rgba(255,${130 + flame * 70},50,${flame})`;
      ctx.beginPath();
      ctx.moveTo(fx, y - 4);
      ctx.quadraticCurveTo(fx + 10, y - tall * 0.6, fx, y - tall);
      ctx.quadraticCurveTo(fx - 10, y - tall * 0.6, fx, y - 4);
      ctx.fill();
    }
    if (!lit) {
      ctx.font = SMALL;
      ctx.fillStyle = "rgba(255,160,148,0.95)";
      ctx.fillText("薪がない", x, y - 26);
      ctx.font = FONT;
    }
    return true;
  }

  /* --- 集会所: 長い屋根と、まわりの座席 --- */
  if (art === "hall") {
    ctx.fillStyle = "#6b543a";
    roundRect(ctx, x - 44, y - 34, 88, 34, 4);
    ctx.fill();
    ctx.fillStyle = "#4a3a26";
    ctx.beginPath();
    ctx.moveTo(x - 52, y - 34);
    ctx.lineTo(x, y - 60);
    ctx.lineTo(x + 52, y - 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#241a12";
    roundRect(ctx, x - 10, y - 22, 20, 22, 3);
    ctx.fill();
    // 柱に立てかけた牙
    ctx.strokeStyle = "#f0e9d6";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 36, y);
      ctx.quadraticCurveTo(x + side * 44, y - 16, x + side * 34, y - 30);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    return true;
  }

  /* --- 谷（マンモスがうろつく草原） --- */
  if (art === "valley") {
    const zone = beastZone(stove);
    ctx.fillStyle = "rgba(96,104,64,0.26)";
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(190,180,120,0.28)";
    ctx.lineWidth = 2;
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 30);
    ctx.stroke();
    // 大きな岩と枯れ木
    for (let i = 0; i < 7; i += 1) {
      const rx = zone.x0 + 60 + ((i * 331) % (zone.x1 - zone.x0 - 120));
      const ry = zone.y0 + 40 + ((i * 197) % (zone.y1 - zone.y0 - 80));
      if (i % 2 === 0) {
        ctx.fillStyle = "#6a6358";
        ctx.beginPath();
        ctx.ellipse(rx, ry, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7d7568";
        ctx.beginPath();
        ctx.ellipse(rx - 3, ry - 3, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx, ry + 10);
        ctx.lineTo(rx, ry - 18);
        ctx.moveTo(rx, ry - 8);
        ctx.lineTo(rx + 10, ry - 18);
        ctx.moveTo(rx, ry - 12);
        ctx.lineTo(rx - 9, ry - 22);
        ctx.stroke();
      }
    }
    // 足跡
    ctx.fillStyle = "rgba(60,48,34,0.4)";
    for (let i = 0; i < 8; i += 1) {
      const fx = zone.x0 + 40 + i * 46;
      const fy = zone.y1 - 30 + Math.sin(i) * 12;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 狩猟キャンプの小屋と槍
    ctx.fillStyle = "#5f4630";
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 8);
    ctx.lineTo(x, y - 26);
    ctx.lineTo(x + 22, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 2;
    for (const ox of [-30, 30]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 8);
      ctx.lineTo(x + ox + 4, y - 26);
      ctx.stroke();
    }
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(230,210,170,0.6)";
    ctx.fillText("マンモスの谷", (zone.x0 + zone.x1) / 2, zone.y0 + 14);
    ctx.font = FONT;
    return true;
  }

  /* --- 仮置き場: 満杯になると解体が止まる --- */
  if (art === "pile") {
    const have = state.ready[stove.id] ?? 0;
    const cap = holdCap(state, stove);
    ctx.fillStyle = "#4a3a28";
    roundRect(ctx, x - 22, y - 2, 44, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#3a2c1e";
    for (const ox of [-18, 18]) ctx.fillRect(x + ox - 2, y + 6, 4, 8);
    pileOf(ctx, stove.item ?? "mmeat", x, y - 6, have);
    const full = have >= cap;
    ctx.font = SMALL;
    ctx.fillStyle = full ? "#ff9f8a" : "rgba(240,228,206,0.75)";
    ctx.fillText(full ? `${stove.label}が満杯！` : `${stove.label} ${have}/${cap}`, x, y + 22);
    ctx.font = FONT;
    return true;
  }

  /* --- 大かまど: たき火より大きい石組みの炉 --- */
  if (art === "grill") {
    ctx.fillStyle = "#554a40";
    roundRect(ctx, x - 34, y - 12, 68, 26, 6);
    ctx.fill();
    ctx.fillStyle = "#6b5f52";
    roundRect(ctx, x - 34, y - 16, 68, 8, 4);
    ctx.fill();
    const lit = fuelAt(state, stove.id) > 0;
    for (const fx of [x - 14, x, x + 14]) {
      const flame = (lit ? 0.7 : 0.15) + Math.abs(Math.sin(time * 6 + fx)) * 0.35;
      ctx.fillStyle = `rgba(255,${130 + flame * 70},60,${flame})`;
      ctx.beginPath();
      ctx.moveTo(fx, y - 8);
      ctx.quadraticCurveTo(fx + 8, y - 24, fx, y - 34);
      ctx.quadraticCurveTo(fx - 8, y - 24, fx, y - 8);
      ctx.fill();
    }
    // 串にささった大きな肉が回る
    const spin = Math.sin(time * 2) * 0.25;
    ctx.save();
    ctx.translate(x, y - 34);
    ctx.rotate(spin);
    ctx.fillStyle = "#8a4a24";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9903f";
    ctx.beginPath();
    ctx.ellipse(-3, -2, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#9aa3ad";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 32, y - 34);
    ctx.lineTo(x + 32, y - 34);
    ctx.stroke();
    return true;
  }

  /* --- 工房いろいろ（骨・皮・土器・道具・木材・縄） --- */
  if (
    art === "bonework" ||
    art === "tan" ||
    art === "pottery" ||
    art === "toolshop" ||
    art === "plank" ||
    art === "rope"
  ) {
    const wall =
      art === "tan" ? "#7a6142" : art === "pottery" ? "#8a5a3c" : "#5f5142";
    hutShape(ctx, x, y, 46, 26, wall, "#3f3527");
    ctx.fillStyle = "rgba(20,14,10,0.5)";
    roundRect(ctx, x - 16, y - 20, 32, 16, 2);
    ctx.fill();
    // 工房ごとの目じるし
    if (art === "bonework" || art === "toolshop") {
      chainItem(ctx, art === "bonework" ? "bone" : "tool", x, y - 12, 0.9, time);
    } else if (art === "tan") {
      // 張った皮
      ctx.strokeStyle = "#8a6a44";
      ctx.lineWidth = 2;
      roundRect(ctx, x - 14, y - 18, 28, 14, 2);
      ctx.stroke();
      ctx.fillStyle = "#a0805c";
      roundRect(ctx, x - 12, y - 16, 24, 10, 2);
      ctx.fill();
    } else if (art === "pottery") {
      chainItem(ctx, "pot", x, y - 12, 0.9, time);
      const busy = (state.cooking[stove.id] ?? 0) > 0;
      ctx.fillStyle = `rgba(255,150,60,${busy ? 0.6 : 0.2})`;
      roundRect(ctx, x - 10, y - 4, 20, 4, 2);
      ctx.fill();
    } else if (art === "plank") {
      chainItem(ctx, "plank", x, y - 12, 0.9, time);
    } else {
      chainItem(ctx, "rope", x, y - 12, 0.9, time);
    }
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(240,228,206,0.6)";
    ctx.fillText(stove.label ?? "", x, y - 42);
    ctx.font = FONT;
    return true;
  }

  /* --- 粘土穴 --- */
  if (art === "clay") {
    const zone = huntZone(state, stove);
    void zone;
    ctx.fillStyle = "#5a4436";
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a5a48";
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [ox, oy] of [[-14, 4], [10, 8], [18, -2]]) {
      chainItem(ctx, "clay", x + ox, y + oy, 0.55, time);
    }
    return true;
  }

  /* --- 川の瀬（魚をとる） --- */
  if (art === "fish") {
    const zone = huntZone(state, stove);
    ctx.fillStyle = "rgba(70,120,140,0.5)";
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 26);
    ctx.fill();
    // 流れ
    ctx.strokeStyle = "rgba(190,225,235,0.3)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i += 1) {
      const wy = zone.y0 + 26 + i * 32;
      const off = ((time * 26 + i * 40) % 90) - 45;
      ctx.beginPath();
      ctx.moveTo(zone.x0 + 20 + off, wy);
      ctx.lineTo(zone.x0 + 70 + off, wy);
      ctx.stroke();
    }
    // 泳ぐ魚
    for (let i = 0; i < 4; i += 1) {
      const fx = zone.x0 + 40 + ((time * 22 + i * 90) % (zone.x1 - zone.x0 - 80));
      const fy = zone.y0 + 50 + ((i * 71) % (zone.y1 - zone.y0 - 90));
      chainItem(ctx, "fish", fx, fy, 0.7, time);
    }
    // 岸の台
    ctx.fillStyle = "#6b563a";
    roundRect(ctx, x - 20, y - 6, 40, 12, 3);
    ctx.fill();
    return true;
  }

  /* --- いかだ --- */
  if (art === "raft" || art === "bigraft") {
    const big = art === "bigraft";
    const w = big ? 76 : 52;
    ctx.fillStyle = "#8a6a44";
    for (let i = 0; i < (big ? 7 : 5); i += 1) {
      roundRect(ctx, x - w / 2 + i * (w / (big ? 7 : 5)), y - 12, w / (big ? 7.6 : 5.6), 26, 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#b79a63";
    ctx.lineWidth = 2;
    for (const oy of [-6, 8]) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + oy);
      ctx.lineTo(x + w / 2, y + oy);
      ctx.stroke();
    }
    if (big) {
      // 帆柱と荷台
      ctx.strokeStyle = "#6b4a2b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x, y - 52);
      ctx.stroke();
      ctx.fillStyle = "rgba(232,220,196,0.85)";
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 50);
      ctx.quadraticCurveTo(x + 30, y - 36, x + 2, y - 20);
      ctx.fill();
    }
    return true;
  }

  /* --- 井戸・門・見張り台・ランプ・大宴会場 --- */
  if (art === "well") {
    ctx.fillStyle = "#6a6358";
    roundRect(ctx, x - 16, y - 12, 32, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#25303a";
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 14);
    ctx.lineTo(x - 14, y - 40);
    ctx.moveTo(x + 14, y - 14);
    ctx.lineTo(x + 14, y - 40);
    ctx.stroke();
    ctx.fillStyle = "#4f3d26";
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 40);
    ctx.lineTo(x, y - 54);
    ctx.lineTo(x + 22, y - 40);
    ctx.closePath();
    ctx.fill();
    return true;
  }
  if (art === "gate") {
    ctx.fillStyle = "#5f4630";
    for (const ox of [-26, 26]) roundRect(ctx, x + ox - 6, y - 54, 12, 58, 3);
    ctx.fill();
    ctx.fillStyle = "#6b543a";
    roundRect(ctx, x - 34, y - 62, 68, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "#f0e9d6";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 12, y - 50);
      ctx.quadraticCurveTo(x + side * 22, y - 42, x + side * 16, y - 28);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    return true;
  }
  if (art === "watch") {
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 3;
    for (const ox of [-16, 16]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 6);
      ctx.lineTo(x + ox * 0.5, y - 46);
      ctx.stroke();
    }
    ctx.fillStyle = "#7a5a3a";
    roundRect(ctx, x - 20, y - 58, 40, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#4f3d26";
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 58);
    ctx.lineTo(x, y - 74);
    ctx.lineTo(x + 24, y - 58);
    ctx.closePath();
    ctx.fill();
    return true;
  }
  if (art === "lamp") {
    ctx.fillStyle = "#5f4630";
    roundRect(ctx, x - 6, y - 30, 12, 34, 3);
    ctx.fill();
    const glow = 0.5 + Math.abs(Math.sin(time * 2)) * 0.5;
    const light = ctx.createRadialGradient(x, y - 36, 2, x, y - 36, 46);
    light.addColorStop(0, `rgba(255,210,140,${0.3 * glow})`);
    light.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x, y - 36, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8c48d";
    ctx.beginPath();
    ctx.ellipse(x, y - 34, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,190,90,${glow})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 40, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }
  if (art === "feast") {
    // 大宴会場: 円く並べた丸太の席と、中央の大きな火
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 48, 24, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const fx of [x - 8, x + 8]) {
      const flame = 0.6 + Math.abs(Math.sin(time * 5 + fx)) * 0.4;
      ctx.fillStyle = `rgba(255,${140 + flame * 70},60,${flame})`;
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.quadraticCurveTo(fx + 10, y - 22, fx, y - 36);
      ctx.quadraticCurveTo(fx - 10, y - 22, fx, y);
      ctx.fill();
    }
    // 火の粉
    for (let i = 0; i < 6; i += 1) {
      const t = (time * 0.5 + i * 0.17) % 1;
      ctx.fillStyle = `rgba(255,200,120,${(1 - t) * 0.8})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t * 7 + i) * 16, y - 30 - t * 46, 2.2 - t, 0, Math.PI * 2);
      ctx.fill();
    }
    return true;
  }

  /* ================= 大河の文明 ================= */

  /* --- 水くみ場: 川の水ぎわ。水面が流れ、岸に水がめが並ぶ --- */
  if (art === "river" || art === "intake") {
    const intake = art === "intake";
    // 川そのものは、区画をまたぐ1本を先に描いてある。ここは岸まわりだけ

    if (intake) {
      // 取水口: 石で囲った切りこみ。水が水路の口へ吸いこまれていく
      ctx.fillStyle = "#8a8272";
      roundRect(ctx, x - 26, y - 26, 52, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#2f7d8c";
      roundRect(ctx, x - 18, y - 24, 36, 16, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(220,245,255,0.5)";
      for (let i = 0; i < 3; i += 1) {
        const t = (time * 0.7 + i * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(x - 12 + t * 24, y - 16 + Math.sin(t * 6) * 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // 石積みの水門
      ctx.fillStyle = "#7a7264";
      for (const ox of [-26, 26]) {
        roundRect(ctx, x + ox - 5, y - 38, 10, 20, 2);
        ctx.fill();
      }
    } else {
      /*
       * 水くみ場: 岸に降りる段と、水をためている大きな水がめ。
       * 「いま水がたまっているところ」が、ひと目で分かるようにする。
       * ―― かめの中の水位が上がる／上から水が落ちる／たまったかめが岸に並ぶ
       */
      ctx.fillStyle = "#7a6142";
      for (let i = 0; i < 3; i += 1) {
        roundRect(ctx, x - 26 + i * 4, y - 16 + i * 5, 52 - i * 8, 5, 2);
        ctx.fill();
      }
      const fill = Math.max(0, Math.min(1, state.cooking[stove.id] ?? 0));
      // 川から落ちてくる水すじ（かめは、人が立つ場所から少し左にずらす）
      const jx = x - 20;
      ctx.strokeStyle = "rgba(150,220,240,0.65)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(jx - 4, y - 20);
      ctx.quadraticCurveTo(jx - 2, y - 14, jx, y - 8);
      ctx.stroke();
      for (let i = 0; i < 3; i += 1) {
        const t = (time * 1.4 + i * 0.33) % 1;
        ctx.fillStyle = `rgba(190,235,250,${0.8 - t * 0.5})`;
        ctx.beginPath();
        ctx.arc(jx + Math.sin(t * 3) * 1.5, y - 20 + t * 14, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // 水をためている大きなかめ（中の水位が上がっていく）
      const jarY = y + 2;
      ctx.fillStyle = "#a8724a";
      ctx.beginPath();
      ctx.moveTo(jx - 11, jarY - 10);
      ctx.quadraticCurveTo(jx - 14, jarY + 8, jx, jarY + 9);
      ctx.quadraticCurveTo(jx + 14, jarY + 8, jx + 11, jarY - 10);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(jx - 10, jarY - 9);
      ctx.quadraticCurveTo(jx - 12.5, jarY + 7, jx, jarY + 8);
      ctx.quadraticCurveTo(jx + 12.5, jarY + 7, jx + 10, jarY - 9);
      ctx.closePath();
      ctx.clip();
      const level = jarY + 8 - fill * 16;
      ctx.fillStyle = "#3f9bb0";
      ctx.fillRect(jx - 13, level, 26, 20);
      ctx.fillStyle = "rgba(220,245,255,0.55)";
      ctx.fillRect(jx - 13, level, 26, 1.6);
      ctx.restore();
      ctx.fillStyle = "#8a5a3c";
      roundRect(ctx, jx - 12, jarY - 12, 24, 4, 2);
      ctx.fill();
      // たまったぶんは、かめごと岸に並ぶ（持っていける数）
      const ready = state.ready[stove.id] ?? 0;
      for (let i = 0; i < Math.min(4, ready); i += 1) {
        chainItem(ctx, "water", x + 14 + (i % 2) * 13, y + 2 - Math.floor(i / 2) * 11, 0.66, time);
      }
      ctx.font = SMALL;
      ctx.fillStyle = ready > 0 ? "#7ee7a8" : "rgba(240,228,206,0.85)";
      ctx.fillText(
        ready > 0 ? `水 ${ready}こ・持っていける` : `水をためている ${Math.round(fill * 100)}%`,
        x,
        y + 22,
      );
      ctx.font = FONT;
    }
    return true;
  }

  /* --- 種置き場: 干した穂を吊るした小屋。下に種の袋 --- */
  if (art === "seedhut") {
    hutShape(ctx, x, y, 40, 26, "#8a7350", "#5e4a2e");
    // 軒からつるした穂
    for (const ox of [-12, 0, 12]) {
      ctx.strokeStyle = "#c9a95e";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 26);
      ctx.lineTo(x + ox + Math.sin(time * 1.4 + ox) * 1.5, y - 12);
      ctx.stroke();
      ctx.fillStyle = "#e0c268";
      ctx.beginPath();
      ctx.ellipse(x + ox + Math.sin(time * 1.4 + ox) * 1.5, y - 12, 2.4, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 種の袋
    ctx.fillStyle = "#c2ad84";
    ctx.beginPath();
    ctx.ellipse(x + 16, y - 4, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a7350";
    roundRect(ctx, x + 13, y - 12, 6, 4, 2);
    ctx.fill();
    return true;
  }

  /*
   * 畑: このステージの主役。
   * 水と種が入っているか、いま何分どおり育ったかが、地面と作物で分かる。
   */
  if (art === "field") {
    const grow = Math.max(0, Math.min(1, state.cooking[stove.id] ?? 0));
    const water = heldAt(state, stove.id);
    const seed = fuelAt(state, stove.id);
    const ready = state.ready[stove.id] ?? 0;
    // 土。水があるうちは黒っぽく、切れると白茶けて乾く
    const wet = water > 0;
    ctx.fillStyle = wet ? "#4a3320" : "#7a6446";
    roundRect(ctx, x - 40, y - 26, 80, 44, 6);
    ctx.fill();
    // うねの筋
    ctx.strokeStyle = wet ? "rgba(0,0,0,0.28)" : "rgba(120,100,70,0.5)";
    ctx.lineWidth = 2;
    for (const oy of [-16, -4, 8]) {
      ctx.beginPath();
      ctx.moveTo(x - 36, y + oy);
      ctx.lineTo(x + 36, y + oy);
      ctx.stroke();
    }
    // 作物。芽 → 苗 → 穂と、育ちに合わせて背が伸びて色が変わる
    const stalks = 7;
    for (let i = 0; i < stalks; i += 1) {
      const sx = x - 30 + i * 10;
      const base = y + 10 - (i % 3) * 12;
      const h = 4 + grow * 22;
      const sway = Math.sin(time * 1.6 + i) * (1 + grow * 1.6);
      ctx.strokeStyle = grow > 0.75 ? "#d8b451" : grow > 0.35 ? "#8fc464" : "#7ee7a8";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, base);
      ctx.quadraticCurveTo(sx + sway * 0.5, base - h * 0.6, sx + sway, base - h);
      ctx.stroke();
      if (grow > 0.35) {
        // 葉
        ctx.strokeStyle = grow > 0.75 ? "#c9a95e" : "#8fc464";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx + sway * 0.4, base - h * 0.55);
        ctx.lineTo(sx + sway * 0.4 + 4, base - h * 0.72);
        ctx.stroke();
      }
      if (grow > 0.75) {
        // 穂
        ctx.fillStyle = "#e8c86a";
        ctx.beginPath();
        ctx.ellipse(sx + sway, base - h - 1, 2, 4, sway * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 増水で水につかっているあいだは、うねの上に水が乗る
    if (taigaFlooding(state)) {
      ctx.fillStyle = "rgba(70,140,165,0.45)";
      roundRect(ctx, x - 40, y - 26, 80, 44, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(220,245,255,0.4)";
      ctx.lineWidth = 1.2;
      for (const oy of [-14, 0]) {
        ctx.beginPath();
        for (let sx = -36; sx <= 36; sx += 8) {
          const yy = y + oy + Math.sin((sx + time * 50) * 0.09) * 1.8;
          if (sx === -36) ctx.moveTo(x + sx, yy);
          else ctx.lineTo(x + sx, yy);
        }
        ctx.stroke();
      }
    }
    // 刈り取りを待っている束
    if (ready > 0) {
      for (let i = 0; i < Math.min(3, ready); i += 1) {
        chainItem(ctx, "grain", x - 12 + i * 12, y + 22, 0.7, time);
      }
    }
    // 足りないものを、名前で言う（アイコンだけだと分からない）
    ctx.font = SMALL;
    if (water <= 0) {
      ctx.fillStyle = "#ff9f8a";
      ctx.fillText("水がない", x, y - 34);
    } else if (seed <= 0) {
      ctx.fillStyle = "#ffd166";
      ctx.fillText("種がない", x, y - 34);
    } else {
      ctx.fillStyle = "rgba(240,228,206,0.85)";
      ctx.fillText(grow > 0.75 ? "もうすぐ実る" : "育っている", x, y - 34);
    }
    ctx.fillStyle = "rgba(240,228,206,0.7)";
    ctx.fillText(`水 ${water}・種 ${seed}`, x, y + 32);
    ctx.font = FONT;
    return true;
  }

  /* --- 石臼: 上の石が回って粉が出る。人の手が要る --- */
  if (art === "mill") {
    // 台
    ctx.fillStyle = "#5e5346";
    roundRect(ctx, x - 22, y - 8, 44, 12, 3);
    ctx.fill();
    // 下石
    ctx.fillStyle = "#9a9384";
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // 上石（回る）
    const spin = isManned(state, stove) ? time * 2.2 : 0;
    ctx.fillStyle = "#b6ae9c";
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 17, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,52,40,0.5)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      const a = spin + (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 15, y - 20 + Math.sin(a) * 6.5);
      ctx.lineTo(x - Math.cos(a) * 15, y - 20 - Math.sin(a) * 6.5);
      ctx.stroke();
    }
    // 取っ手
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(spin) * 15, y - 22 + Math.sin(spin) * 6);
    ctx.lineTo(x + Math.cos(spin) * 15, y - 34 + Math.sin(spin) * 6);
    ctx.stroke();
    // こぼれた粉
    ctx.fillStyle = "rgba(240,232,210,0.75)";
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  }

  /* --- 窯: 丸い焼き物の窯。中が赤く、上から煙が出る --- */
  if (art === "kiln" || art === "oven") {
    const bread = art === "oven";
    const burning = fuelAt(state, stove.id) > 0;
    // 本体（土のドーム）
    ctx.fillStyle = bread ? "#8a6a44" : "#7a6152";
    ctx.beginPath();
    ctx.moveTo(x - 26, y);
    ctx.quadraticCurveTo(x - 26, y - 40, x, y - 40);
    ctx.quadraticCurveTo(x + 26, y - 40, x + 26, y);
    ctx.closePath();
    ctx.fill();
    // 石積みの目
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    for (const oy of [-10, -22]) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y + oy);
      ctx.lineTo(x + 24, y + oy);
      ctx.stroke();
    }
    // 投入口。焼いているあいだは赤い
    ctx.fillStyle = burning ? "#ff7a3c" : "#2a1d14";
    roundRect(ctx, x - 11, y - 18, 22, 18, 5);
    ctx.fill();
    if (burning) {
      const flick = 0.6 + Math.sin(time * 9) * 0.25;
      ctx.fillStyle = `rgba(255,209,102,${flick})`;
      ctx.beginPath();
      ctx.ellipse(x, y - 8, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // 煙
      for (let i = 0; i < 4; i += 1) {
        const t = (time * 0.4 + i * 0.25) % 1;
        ctx.fillStyle = `rgba(200,200,196,${(1 - t) * 0.4})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(t * 5 + i) * 5, y - 44 - t * 30, 2 + t * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 横に積んだ薪
    ctx.fillStyle = "#8a6a44";
    for (const oy of [-6, -11]) {
      roundRect(ctx, x + 28, y + oy, 14, 4, 2);
      ctx.fill();
    }
    // できあがったものを棚に並べる
    const done = state.ready[stove.id] ?? 0;
    for (let i = 0; i < Math.min(3, done); i += 1) {
      chainItem(ctx, bread ? "bread" : "pot", x - 34 + i * 11, y - 4, 0.62, time);
    }
    return true;
  }

  /* --- 牧草地: 草が風になびく。刈ると短くなる --- */
  if (art === "pasture") {
    const zone = huntZone(state, stove);
    ctx.fillStyle = "rgba(96,132,52,0.32)";
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(150,190,110,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.stroke();
    // 草むら
    for (let i = 0; i < 26; i += 1) {
      const gx = zone.x0 + ((i * 97) % (zone.x1 - zone.x0));
      const gy = zone.y0 + ((i * 53) % (zone.y1 - zone.y0));
      const sway = Math.sin(time * 1.3 + i) * 2;
      ctx.strokeStyle = i % 3 === 0 ? "#8fc464" : "#6f9c46";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sway, gy - 6, gx + sway * 2, gy - 11);
      ctx.stroke();
    }
    // 刈り取った草の山
    ctx.fillStyle = "#9cbf5e";
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,120,50,0.6)";
    ctx.lineWidth = 1;
    for (const ox of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.moveTo(x + ox - 6, y - 4);
      ctx.lineTo(x + ox + 6, y - 10);
      ctx.stroke();
    }
    return true;
  }

  /* --- 家畜の囲い: 柵の中にヤギか羊。餌と水があると動く --- */
  if (art === "pen") {
    const sheep = stove.item === "wool";
    const fed = heldAt(state, stove.id) > 0 && fuelAt(state, stove.id) > 0;
    // 地面
    ctx.fillStyle = "rgba(120,140,70,0.35)";
    roundRect(ctx, x - 46, y - 34, 92, 46, 10);
    ctx.fill();
    // 柵
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 2.4;
    for (const ox of [-46, -23, 0, 23, 46]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 36);
      ctx.lineTo(x + ox, y - 20);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 46, y - 32);
    ctx.lineTo(x + 46, y - 32);
    ctx.stroke();
    // 家畜2頭。餌と水があるときだけ、もぐもぐ動く
    for (const [i, ox] of [-18, 14].entries()) {
      const bob = fed ? Math.sin(time * 2.6 + i * 1.7) * 1.6 : 0;
      const by = y - 8 + bob;
      ctx.fillStyle = sheep ? "#e8e2d4" : "#c8b49a";
      ctx.beginPath();
      ctx.ellipse(x + ox, by, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sheep) {
        // 羊はもこもこ
        ctx.fillStyle = "#f2eee2";
        for (const cx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.arc(x + ox + cx, by - 4, 4.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 顔
      ctx.fillStyle = sheep ? "#6f6252" : "#8a7358";
      ctx.beginPath();
      ctx.ellipse(x + ox + 11, by - 3, 4.6, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!sheep) {
        // ヤギの角
        ctx.strokeStyle = "#6f5a45";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + ox + 11, by - 6);
        ctx.lineTo(x + ox + 15, by - 11);
        ctx.stroke();
      }
      // 脚
      ctx.strokeStyle = sheep ? "#b9b0a0" : "#9a8468";
      ctx.lineWidth = 1.6;
      for (const lx of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(x + ox + lx, by + 6);
        ctx.lineTo(x + ox + lx, by + 12);
        ctx.stroke();
      }
    }
    // 餌おけ
    ctx.fillStyle = "#7a5a3a";
    roundRect(ctx, x - 40, y + 2, 20, 7, 3);
    ctx.fill();
    ctx.font = SMALL;
    if (!fed) {
      ctx.fillStyle = "#ff9f8a";
      ctx.fillText(heldAt(state, stove.id) <= 0 ? "草がない" : "水がない", x, y - 44);
      ctx.font = FONT;
    } else {
      ctx.font = FONT;
    }
    return true;
  }
  return false;
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

  // 第2区画から出てくる建物と作業場は、そちらで描く
  if (drawSettlement(ctx, stove, x, y, time, state)) return;

  const art = stove.art ?? "";
  if (art === "hunt") {
    // 狩り場: 草の生えた開けた草原（この中を動物がうろつく）と、生肉を置く台
    const zone = huntZone(state, stove);
    ctx.fillStyle = "rgba(84,116,60,0.3)";
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(150,190,110,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.stroke();
    // 草むら
    ctx.fillStyle = "#3f5a34";
    for (let i = 0; i < 26; i += 1) {
      const gx = zone.x0 + 12 + ((i * 53) % (zone.x1 - zone.x0 - 24));
      const gy = zone.y0 + 16 + ((i * 71) % (zone.y1 - zone.y0 - 26));
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 3, gy - 9);
      ctx.lineTo(gx + 3, gy - 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(190,220,160,0.55)";
    ctx.fillText("草原", (zone.x0 + zone.x1) / 2, zone.y0 + 12);
    ctx.font = FONT;
    // 生肉を置く、石を並べた出し口
    ctx.fillStyle = "#6b6157";
    roundRect(ctx, x - 20, y - 6, 40, 14, 4);
    ctx.fill();
    ctx.fillStyle = "#8b8073";
    roundRect(ctx, x - 20, y - 6, 40, 5, 3);
    ctx.fill();
  } else if (art === "forest") {
    // 森: 下草の広がりと、丸太を積む出し口（木そのものは actors 側で描く）
    const zone = huntZone(state, stove);
    ctx.fillStyle = "rgba(46,72,42,0.42)";
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(110,160,100,0.3)";
    ctx.lineWidth = 2;
    roundRect(ctx, zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 22);
    ctx.stroke();
    ctx.fillStyle = "rgba(60,92,52,0.5)";
    for (let i = 0; i < 14; i += 1) {
      const bx = zone.x0 + 16 + ((i * 67) % (zone.x1 - zone.x0 - 32));
      const by = zone.y0 + 20 + ((i * 43) % (zone.y1 - zone.y0 - 34));
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = SMALL;
    ctx.fillStyle = "rgba(180,220,160,0.55)";
    ctx.fillText("森", (zone.x0 + zone.x1) / 2, zone.y0 + 12);
    ctx.font = FONT;
    // 丸太の出し口: 横木を渡した木組みの台
    ctx.fillStyle = "#4a3320";
    roundRect(ctx, x - 24, y - 2, 48, 8, 3);
    ctx.fill();
    for (const px of [x - 20, x + 20]) {
      ctx.fillStyle = "#3a2716";
      ctx.fillRect(px - 2, y + 4, 4, 8);
    }
  } else if (art === "split") {
    // 薪割り場: 切り株の割り台に斧が刺さり、まわりに薪が散る
    ctx.fillStyle = "#3f2c1a";
    roundRect(ctx, x - 30, y - 4, 60, 16, 5);
    ctx.fill();
    // 割り台（切り株）
    ctx.fillStyle = "#5f4227";
    roundRect(ctx, x - 13, y - 20, 26, 22, 4);
    ctx.fill();
    ctx.fillStyle = "#c79a5e";
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6236";
    ctx.lineWidth = 1;
    for (const r of [0.4, 0.7]) {
      ctx.beginPath();
      ctx.ellipse(x, y - 20, 13 * r, 5.5 * r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 刺さった斧（作業中はふり上がる）
    const working = (state.cooking[stove.id] ?? 0) > 0;
    const swing = working ? Math.abs(Math.sin(time * 7)) : 0;
    ctx.save();
    ctx.translate(x + 6, y - 22);
    ctx.rotate(-0.5 - swing * 1.5);
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -20);
    ctx.stroke();
    ctx.fillStyle = "#b9bec4";
    ctx.beginPath();
    ctx.moveTo(-1, -20);
    ctx.lineTo(7, -24);
    ctx.lineTo(7, -15);
    ctx.lineTo(-1, -16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 足もとの薪くず
    for (const [ox, oy] of [
      [-22, 8],
      [20, 9],
      [-14, 12],
    ]) {
      ctx.fillStyle = "#a9743f";
      roundRect(ctx, x + ox - 5, y + oy - 2, 10, 4, 1.5);
      ctx.fill();
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
    // たき火・大かまど（焼き場）: 囲いの石・まき・炎・焼けていく肉
    ctx.fillStyle = "#4a4038";
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 22, y + 8 + Math.sin(a) * 8, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5c5148";
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 22, y + 6 + Math.sin(a) * 8, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 組んだまき
    ctx.fillStyle = "#5a3a20";
    ctx.save();
    ctx.translate(x, y + 2);
    for (const rot of [-0.5, 0.5]) {
      ctx.save();
      ctx.rotate(rot);
      roundRect(ctx, -13, -3, 26, 6, 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    const lit = (state.fuel[stove.id] ?? 0) > 0 || !stove.fuel;
    const cooking = (state.cooking[stove.id] ?? 0) > 0;
    // 燃えさし（まき切れなら赤いおき火だけ）
    ctx.fillStyle = lit ? "rgba(255,140,40,0.75)" : "rgba(190,70,30,0.5)";
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 炎（まきがあるほど高く、火の番が付いた火は勢いよく揺れる）
    for (const fx of [x - 7, x, x + 7]) {
      const flame = (lit ? 0.62 : 0.14) + Math.abs(Math.sin(time * 6 + fx)) * (lit ? 0.4 : 0.1);
      const tall = lit ? 28 : 10;
      ctx.fillStyle = `rgba(255,${120 + flame * 80},50,${flame})`;
      ctx.beginPath();
      ctx.moveTo(fx, y - 4);
      ctx.quadraticCurveTo(fx + 7, y - tall * 0.6, fx, y - tall);
      ctx.quadraticCurveTo(fx - 7, y - tall * 0.6, fx, y - 4);
      ctx.fill();
    }
    // 火にかけた肉。焼けるほど色が変わり、焦げ目が出る
    if (cooking) {
      const done = Math.min(1, state.cooking[stove.id] ?? 0);
      ctx.strokeStyle = "#8a6a44";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 26);
      ctx.lineTo(x + 20, y - 26);
      ctx.stroke();
      const r = Math.round(198 - done * 60);
      const g = Math.round(74 + done * 26);
      const b = Math.round(50 - done * 20);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.ellipse(x, y - 22, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (done > 0.5) {
        ctx.strokeStyle = `rgba(50,26,12,${(done - 0.5) * 1.6})`;
        ctx.lineWidth = 1.4;
        for (const g0 of [-3, 1, 5]) {
          ctx.beginPath();
          ctx.moveTo(x + g0 - 3, y - 26);
          ctx.lineTo(x + g0 + 2, y - 18);
          ctx.stroke();
        }
      }
      // 焼き上がりまでの輪
      ctx.strokeStyle = "rgba(255,209,102,0.85)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y - 22, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done);
      ctx.stroke();
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

    /* ---------- 火山の秘境 ---------- */
    case "coaster": {
      // マグマコースター: 急な下りをトロッコが繰り返し落ちる
      const glow = 0.5 + Math.abs(Math.sin(time * 2)) * 0.5;
      ctx.fillStyle = `rgba(255,110,40,${0.35 * glow})`;
      roundRect(ctx, x - 30, y + 6, 60, 8, 4);
      ctx.fill();
      // 支柱
      ctx.fillStyle = "#4a3a3a";
      for (const px of [x - 22, x - 4, x + 16]) ctx.fillRect(px, y - 10, 4, 24);
      // レール（登って落ちる）
      ctx.strokeStyle = "#c8b9a8";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 6);
      ctx.lineTo(x - 12, y - 34);
      ctx.quadraticCurveTo(x + 2, y - 46, x + 12, y - 20);
      ctx.lineTo(x + 22, y + 6);
      ctx.stroke();
      // トロッコ
      const run = (time * 0.55) % 1;
      const cxp = x - 30 + run * 52;
      const cyp =
        run < 0.45 ? y + 6 - (run / 0.45) * 44 : y - 38 + ((run - 0.45) / 0.55) * 44;
      ctx.fillStyle = "#c2402f";
      roundRect(ctx, cxp - 9, cyp - 8, 18, 10, 3);
      ctx.fill();
      rider(ctx, cxp, cyp - 8, "#ffd166", 0.7);
      return;
    }
    case "lava": {
      // 溶岩ラフト: 光る流れを丸いいかだが回りながら下る
      const flow = 0.55 + Math.abs(Math.sin(time * 1.8)) * 0.45;
      ctx.fillStyle = "#3a221c";
      roundRect(ctx, x - 32, y - 12, 64, 26, 12);
      ctx.fill();
      ctx.fillStyle = `rgba(255,120,40,${flow})`;
      roundRect(ctx, x - 28, y - 8, 56, 18, 9);
      ctx.fill();
      ctx.fillStyle = `rgba(255,220,140,${flow * 0.7})`;
      for (let i = 0; i < 3; i += 1) {
        const wx = x - 20 + ((time * 26 + i * 22) % 44);
        ctx.beginPath();
        ctx.ellipse(wx, y - 2 + Math.sin(time * 3 + i) * 3, 5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // いかだ
      const spin = time * 1.2;
      const rx = x + Math.cos(spin) * 12;
      const ry = y + Math.sin(spin) * 4;
      ctx.fillStyle = "#8a6440";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b4a2f";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 9, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      rider(ctx, rx, ry - 2, "#6bd3ff", 0.7);
      return;
    }
    case "blast": {
      // 大噴火タワー: 噴火に合わせてゴンドラが一気に上がって落ちる
      const cycle = (time * 0.42) % 1;
      // 上がるのは一瞬、降りるのはゆっくり
      const lift = cycle < 0.18 ? cycle / 0.18 : Math.max(0, 1 - (cycle - 0.18) / 0.82);
      ctx.fillStyle = "#4a3a3a";
      roundRect(ctx, x - 7, y - 44, 14, 58, 4);
      ctx.fill();
      ctx.fillStyle = "#6b5450";
      roundRect(ctx, x - 20, y + 6, 40, 10, 4);
      ctx.fill();
      // 噴き上がる火柱
      if (cycle < 0.3) {
        const burst = 1 - cycle / 0.3;
        ctx.fillStyle = `rgba(255,150,50,${burst * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(x - 9, y - 44);
        ctx.lineTo(x, y - 44 - 22 * burst);
        ctx.lineTo(x + 9, y - 44);
        ctx.closePath();
        ctx.fill();
      }
      // ゴンドラ
      const gy = y + 2 - lift * 40;
      ctx.fillStyle = "#2f3b4d";
      roundRect(ctx, x - 17, gy - 8, 34, 12, 4);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x - 17, gy - 2, 34, 2);
      rider(ctx, x - 7, gy - 6, "#e8574a", 0.7);
      rider(ctx, x + 7, gy - 6, "#7ee7a8", 0.7);
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


/**
 * 温泉街の背景。町のまわりに、山あいの景色を敷く。
 * 区画のない暗がりが画面をしめないように、
 * 町の奥（上）には遠くの尾根と杉林、手前（下）には谷あいの闇を置く
 */
const drawOnsenBackdrop = (
  ctx: CanvasRenderingContext2D,
  view: { x0: number; y0: number; x1: number; y1: number },
  town: { x0: number; y0: number; x1: number; y1: number },
  time: number,
) => {
  const sky = ctx.createLinearGradient(0, view.y0, 0, town.y0);
  sky.addColorStop(0, "#121a25");
  sky.addColorStop(1, "#26303b");
  ctx.fillStyle = sky;
  ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);

  // 遠くの尾根（2枚重ね）。町の奥に、いつも同じ高さで見えている
  for (const [lift, tint, height, step] of [
    [330, "#27313f", 190, 60],
    [200, "#2f3b45", 130, 44],
  ] as const) {
    const base = town.y0 - lift + height;
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.moveTo(view.x0 - 40, base);
    for (let x = view.x0 - 40; x <= view.x1 + 40; x += step) {
      const t = x * 0.0014 + lift;
      ctx.lineTo(x, base - height * (0.45 + Math.abs(Math.sin(t)) * 0.55));
    }
    ctx.lineTo(view.x1 + 40, base);
    ctx.closePath();
    ctx.fill();
  }
  // 尾根のあいだから立ちのぼる湯けむり（この町の源泉は山にある）
  for (let i = 0; i < 4; i += 1) {
    const x = town.x0 + ((town.x1 - town.x0) * (i + 0.5)) / 4;
    steam(ctx, x, town.y0 - 150, 130, time * 0.5 + i, 1.2);
  }
  // 町のきわの杉林
  ctx.fillStyle = "#18211f";
  for (let x = view.x0 - 30; x <= view.x1 + 30; x += 24) {
    const h = 34 + Math.abs(Math.sin(x * 0.07)) * 22;
    ctx.beginPath();
    ctx.moveTo(x, town.y0 + 4);
    ctx.lineTo(x + 12, town.y0 + 4 - h);
    ctx.lineTo(x + 24, town.y0 + 4);
    ctx.closePath();
    ctx.fill();
  }
  // 谷あい（町より下）。夜の闇にしずむ
  ctx.fillStyle = "#0d1114";
  ctx.fillRect(view.x0, town.y1, view.x1 - view.x0, view.y1 - town.y1);
};

/* ==================== 湯けむり温泉街の絵 ==================== */

/** 湯気。湯のあるところから、ゆらゆら立ちのぼる */
const steam = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  time: number,
  strength = 1,
) => {
  for (let i = 0; i < 3; i += 1) {
    const t = (time * 0.5 + i * 0.37) % 1;
    const rise = t * 30 * strength;
    ctx.globalAlpha = (1 - t) * 0.34 * strength;
    ctx.fillStyle = "#f2fbff";
    ctx.beginPath();
    ctx.ellipse(
      x + Math.sin(time * 1.3 + i * 2) * w * 0.22,
      y - rise,
      w * (0.24 + t * 0.3),
      6 + t * 7,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

/** 瓦屋根。棟の手前にかかる、落ちついた色の切妻 */
const kawara = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  tint = "#4a4048",
) => {
  const half = w / 2;
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - half + 7, y - 13);
  ctx.lineTo(x + half - 7, y - 13);
  ctx.lineTo(x + half, y);
  ctx.closePath();
  ctx.fill();
  // 瓦の筋
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const px = x - half + (w * i) / 5;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + (px < x ? 5 : -5), y - 13);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x - half, y - 15, w, 3);
};

/** のれん。店の間口に下げる */
const noren = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
  mark?: string,
) => {
  ctx.fillStyle = color;
  roundRect(ctx, x - w / 2, y, w, 13, 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (const cut of [-w / 6, w / 6]) ctx.fillRect(x + cut - 1, y + 4, 2, 9);
  if (mark) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = SMALL;
    ctx.fillText(mark, x, y + 6);
    ctx.font = FONT;
  }
};

/** 提灯 */
const chochin = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  time: number,
  glow = 1,
) => {
  const sway = Math.sin(time * 1.1 + x * 0.05) * 2;
  ctx.strokeStyle = "rgba(60,44,32,0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 8 * s);
  ctx.lineTo(x + sway, y);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,150,90,${0.18 * glow})`;
  ctx.beginPath();
  ctx.arc(x + sway, y + 6 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8574a";
  ctx.beginPath();
  ctx.ellipse(x + sway, y + 6 * s, 5 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,224,180,0.9)";
  ctx.fillRect(x + sway - 4 * s, y + 4 * s, 8 * s, 2 * s);
};

/** 湯船。岩・檜・打たせで表情を変える */
const tub = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: "iwa" | "hinoki" | "utase",
  time: number,
) => {
  // ふち
  ctx.fillStyle = kind === "hinoki" ? "#b98d55" : kind === "utase" ? "#7d6a52" : "#6d6a63";
  roundRect(ctx, x - w / 2, y - h / 2, w, h, kind === "iwa" ? 10 : 4);
  ctx.fill();
  if (kind === "iwa") {
    // 岩を組んだふち
    ctx.fillStyle = "#575249";
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * (w / 2 - 2),
        y + Math.sin(a) * (h / 2 - 2),
        5,
        4,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  // 湯
  const yu = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  yu.addColorStop(0, "#63b6b0");
  yu.addColorStop(1, "#2f7d7e");
  ctx.fillStyle = yu;
  roundRect(ctx, x - w / 2 + 5, y - h / 2 + 4, w - 10, h - 8, kind === "iwa" ? 8 : 3);
  ctx.fill();
  // 湯のゆらぎ
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i += 1) {
    const wy = y - 3 + i * 6 + Math.sin(time * 2 + i) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 9, wy);
    ctx.lineTo(x + w / 2 - 9, wy);
    ctx.stroke();
  }
  if (kind === "utase") {
    // 打たせ湯: 上から落ちてくる筋
    ctx.fillStyle = "rgba(210,245,245,0.75)";
    for (const dx of [-8, 8]) ctx.fillRect(x + dx - 1, y - h / 2 - 16, 2.5, 18);
  }
  steam(ctx, x, y - h / 2, w, time, kind === "utase" ? 1.3 : 1);
};

/** 湯にひたっている人（肩から上だけ見える） */
const bather = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
) => {
  ctx.fillStyle = "#f0cfae";
  ctx.beginPath();
  ctx.arc(x, y, 3.6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f2e6";
  roundRect(ctx, x - 3 * s, y - 6.5 * s, 6 * s, 3 * s, 1.5 * s);
  ctx.fill();
};

/**
 * 湯の席。足湯・浴槽・見物席を1つずつ描き分ける。
 * 描く範囲は x±34 / y-52〜y+16 におさめる（名札にかぶらないように）
 */
const drawOnsenSeat = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 13, 31, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (art) {
    case "ashiyu":
    case "ashiyuroof": {
      if (art === "ashiyuroof") {
        // 差しかけの屋根と柱
        ctx.fillStyle = "#6b5a44";
        ctx.fillRect(x - 28, y - 40, 4, 30);
        ctx.fillRect(x + 24, y - 40, 4, 30);
        kawara(ctx, x, y - 40, 68, "#4d4148");
      }
      // 石を組んだ細長い湯だまり
      ctx.fillStyle = "#6f6a60";
      roundRect(ctx, x - 30, y - 8, 60, 20, 5);
      ctx.fill();
      const yu = ctx.createLinearGradient(0, y - 8, 0, y + 12);
      yu.addColorStop(0, "#6cc0b8");
      yu.addColorStop(1, "#2f7d7e");
      ctx.fillStyle = yu;
      roundRect(ctx, x - 26, y - 5, 52, 14, 4);
      ctx.fill();
      // 腰かけの板
      ctx.fillStyle = "#a5794a";
      roundRect(ctx, x - 30, y - 14, 60, 6, 2);
      ctx.fill();
      steam(ctx, x, y - 6, 44, time, 0.8);
      return;
    }
    case "bench": {
      ctx.fillStyle = "#6b5a44";
      ctx.fillRect(x - 22, y + 2, 4, 10);
      ctx.fillRect(x + 18, y + 2, 4, 10);
      ctx.fillStyle = "#b8834e";
      roundRect(ctx, x - 27, y - 5, 54, 8, 3);
      ctx.fill();
      roundRect(ctx, x - 27, y - 19, 54, 7, 3);
      ctx.fill();
      // 赤い毛氈
      ctx.fillStyle = "#c0453c";
      roundRect(ctx, x - 24, y - 7, 48, 4, 2);
      ctx.fill();
      return;
    }
    case "teyu": {
      // 手湯・顔湯: 竹の樋から水盤へ落ちる
      ctx.fillStyle = "#7d8a4e";
      ctx.fillRect(x - 26, y - 26, 30, 5);
      ctx.fillStyle = "rgba(200,240,240,0.7)";
      ctx.fillRect(x + 2, y - 21, 2.5, 14);
      ctx.fillStyle = "#5f5a52";
      roundRect(ctx, x - 16, y - 8, 34, 16, 6);
      ctx.fill();
      ctx.fillStyle = "#4f9d9a";
      roundRect(ctx, x - 13, y - 5, 28, 10, 4);
      ctx.fill();
      steam(ctx, x, y - 6, 26, time, 0.7);
      return;
    }
    case "taki": {
      // 湯滝を眺める席
      ctx.fillStyle = "#4b4640";
      roundRect(ctx, x - 30, y - 46, 60, 20, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(190,235,235,0.8)";
      for (let i = 0; i < 5; i += 1) {
        ctx.fillRect(x - 22 + i * 11, y - 28, 4, 22 + Math.sin(time * 3 + i) * 3);
      }
      ctx.fillStyle = "#2f7d7e";
      roundRect(ctx, x - 28, y - 2, 56, 12, 5);
      ctx.fill();
      steam(ctx, x, y - 4, 46, time, 1.1);
      ctx.fillStyle = "#b8834e";
      roundRect(ctx, x - 20, y + 6, 40, 6, 2);
      ctx.fill();
      return;
    }
    case "deck": {
      // 撮影デッキ: 木のデッキと手すり
      ctx.fillStyle = "#8a6a44";
      roundRect(ctx, x - 30, y - 10, 60, 22, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - 30 + i * 10, y - 10);
        ctx.lineTo(x - 30 + i * 10, y + 12);
        ctx.stroke();
      }
      ctx.fillStyle = "#6b5a44";
      ctx.fillRect(x - 30, y - 26, 60, 4);
      for (const px of [-28, -8, 12, 26]) ctx.fillRect(x + px, y - 26, 3, 16);
      return;
    }
    case "hinoki":
      tub(ctx, x, y - 2, 58, 30, "hinoki", time);
      bather(ctx, x - 12, y - 6);
      return;
    case "iwaburo":
      tub(ctx, x, y - 2, 62, 32, "iwa", time);
      bather(ctx, x + 10, y - 6);
      return;
    case "utase":
      tub(ctx, x, y - 2, 56, 28, "utase", time);
      bather(ctx, x, y - 4);
      return;
    case "neyu": {
      // 寝湯: 浅い湯に寝ころぶ
      ctx.fillStyle = "#5f5a52";
      roundRect(ctx, x - 32, y - 12, 64, 26, 8);
      ctx.fill();
      ctx.fillStyle = "#3f8f8c";
      roundRect(ctx, x - 28, y - 8, 56, 18, 6);
      ctx.fill();
      ctx.fillStyle = "#f0cfae";
      ctx.beginPath();
      ctx.arc(x - 14, y - 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7f2e6";
      roundRect(ctx, x - 10, y - 4, 26, 7, 3);
      ctx.fill();
      steam(ctx, x, y - 8, 48, time, 0.9);
      return;
    }
    case "mise": {
      // 湯もみの見物席: 桟敷と、板をかまえる姿
      ctx.fillStyle = "#8a6a44";
      roundRect(ctx, x - 30, y - 4, 60, 16, 3);
      ctx.fill();
      ctx.fillStyle = "#c0453c";
      roundRect(ctx, x - 27, y - 2, 54, 5, 2);
      ctx.fill();
      // 湯もみ板
      const swing = Math.sin(time * 2.6) * 0.35;
      ctx.save();
      ctx.translate(x, y - 22);
      ctx.rotate(swing);
      ctx.fillStyle = "#b98d55";
      roundRect(ctx, -4, -18, 8, 30, 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#2f7d7e";
      roundRect(ctx, x - 22, y - 14, 44, 10, 3);
      ctx.fill();
      steam(ctx, x, y - 14, 34, time, 0.8);
      return;
    }
    case "room":
    case "roomyu": {
      // 客室: 障子と、敷いた布団
      ctx.fillStyle = "#5f4e3a";
      roundRect(ctx, x - 32, y - 46, 64, 34, 3);
      ctx.fill();
      ctx.fillStyle = "#efe6cf";
      roundRect(ctx, x - 29, y - 43, 58, 28, 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,96,64,0.6)";
      ctx.lineWidth = 1.2;
      for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - 29 + (i * 58) / 4, y - 43);
        ctx.lineTo(x - 29 + (i * 58) / 4, y - 15);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - 29, y - 29);
      ctx.lineTo(x + 29, y - 29);
      ctx.stroke();
      // 畳と布団
      ctx.fillStyle = "#9aa06a";
      roundRect(ctx, x - 30, y - 12, 60, 22, 2);
      ctx.fill();
      ctx.fillStyle = "#f5f1e6";
      roundRect(ctx, x - 22, y - 6, 44, 14, 3);
      ctx.fill();
      ctx.fillStyle = "#c0453c";
      roundRect(ctx, x - 22, y - 6, 44, 4, 2);
      ctx.fill();
      if (art === "roomyu") {
        // 部屋つきの小さな露天
        ctx.fillStyle = "#6d6a63";
        roundRect(ctx, x + 12, y - 44, 20, 16, 5);
        ctx.fill();
        ctx.fillStyle = "#4f9d9a";
        roundRect(ctx, x + 14, y - 42, 16, 12, 4);
        ctx.fill();
        steam(ctx, x + 22, y - 42, 18, time, 0.7);
      }
      return;
    }
    default: {
      ctx.fillStyle = "#6f6a60";
      roundRect(ctx, x - 28, y - 8, 56, 18, 5);
      ctx.fill();
      ctx.fillStyle = "#3f8f8c";
      roundRect(ctx, x - 24, y - 5, 48, 12, 4);
      ctx.fill();
      steam(ctx, x, y - 6, 40, time, 0.8);
      return;
    }
  }
};

/** 食事処の席。店ごとに間口と品を変える */
const drawOnsenTable = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
  dirty: boolean,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 13, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 店構え（瓦屋根とのれん）
  const tint =
    art === "irori" ? "#4a3a34" : art === "kushi" ? "#54402f" : art === "chaya" ? "#4a4438" : "#463c34";
  kawara(ctx, x, y - 36, 70, tint);
  noren(
    ctx,
    x,
    y - 36,
    46,
    art === "soba" ? "#2f4a6b" : art === "amazake" ? "#c0453c" : art === "chaya" ? "#4a6b46" : "#6b4a2f",
  );

  // 卓
  ctx.fillStyle = "#8a6a44";
  roundRect(ctx, x - 26, y - 12, 52, 20, 3);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x - 26, y + 4, 52, 4);

  if (art === "irori") {
    // 囲炉裏: まんなかで炭が赤い
    ctx.fillStyle = "#3a2f28";
    roundRect(ctx, x - 12, y - 9, 24, 14, 3);
    ctx.fill();
    ctx.fillStyle = `rgba(255,140,60,${0.6 + Math.sin(time * 4) * 0.2})`;
    roundRect(ctx, x - 9, y - 6, 18, 8, 2);
    ctx.fill();
    steam(ctx, x, y - 10, 22, time, 0.5);
  } else if (art === "kushi") {
    // 立ち食い台と串
    ctx.fillStyle = "#3a3028";
    roundRect(ctx, x - 22, y - 10, 44, 8, 2);
    ctx.fill();
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = "#c8a05a";
      ctx.fillRect(x - 18 + i * 11, y - 18, 2, 12);
      ctx.fillStyle = "#a5603a";
      roundRect(ctx, x - 20 + i * 11, y - 18, 6, 6, 2);
      ctx.fill();
    }
    steam(ctx, x, y - 14, 30, time, 0.6);
  } else if (art === "tamago") {
    // 温泉たまごのかご
    ctx.fillStyle = "#8a7a52";
    roundRect(ctx, x - 14, y - 10, 28, 12, 4);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = "#f5efdc";
      ctx.beginPath();
      ctx.ellipse(x - 9 + i * 5, y - 8 + (i % 2) * 3, 3, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    steam(ctx, x, y - 10, 24, time, 0.7);
  } else if (art === "soba") {
    ctx.fillStyle = "#2f2a24";
    roundRect(ctx, x - 11, y - 9, 22, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#d8c79a";
    roundRect(ctx, x - 8, y - 7, 16, 5, 2);
    ctx.fill();
    steam(ctx, x, y - 10, 20, time, 0.6);
  } else if (art === "amazake") {
    for (const dx of [-9, 9]) {
      ctx.fillStyle = "#f2ead6";
      roundRect(ctx, x + dx - 5, y - 10, 10, 10, 2);
      ctx.fill();
    }
    steam(ctx, x, y - 10, 22, time, 0.6);
  } else {
    // 茶屋: 湯のみとところてん
    ctx.fillStyle = "#3f6b52";
    roundRect(ctx, x - 12, y - 9, 10, 9, 2);
    ctx.fill();
    ctx.fillStyle = "#eaf2ec";
    roundRect(ctx, x + 2, y - 9, 12, 9, 2);
    ctx.fill();
  }

  if (dirty) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = SMALL;
    ctx.fillText("かたづけ", x, y - 20);
    ctx.font = FONT;
  }
};

/** 甘味とみやげの棚。品ごとに見た目を変える */
const drawOnsenShelf = (
  ctx: CanvasRenderingContext2D,
  art: string,
  x: number,
  y: number,
  time: number,
  stock: number,
) => {
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, y + 13, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  kawara(ctx, x, y - 38, 70, art === "parfait" ? "#463a4a" : "#463c34");
  noren(
    ctx,
    x,
    y - 38,
    44,
    art === "manju" ? "#c0453c" : art === "omamori" ? "#8a5aa0" : art === "purin" ? "#e0a04a" : "#4a6b8a",
  );

  // 台
  ctx.fillStyle = "#8a6a44";
  roundRect(ctx, x - 28, y - 14, 56, 22, 3);
  ctx.fill();

  if (stock === 0) {
    ctx.fillStyle = `rgba(255,209,102,${0.4 + Math.abs(Math.sin(time * 3)) * 0.4})`;
    ctx.font = SMALL;
    ctx.fillText("品切れ", x, y - 20);
    ctx.font = FONT;
    return;
  }

  const n = Math.min(6, stock);
  if (art === "manju") {
    // 蒸籠に並ぶまんじゅう
    ctx.fillStyle = "#b98d55";
    roundRect(ctx, x - 22, y - 12, 44, 14, 3);
    ctx.fill();
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = "#e8dcc0";
      ctx.beginPath();
      ctx.arc(x - 16 + (i % 3) * 12, y - 8 + Math.floor(i / 3) * 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    steam(ctx, x, y - 12, 34, time, 0.9);
  } else if (art === "purin" || art === "parfait") {
    // ガラスのショーケース
    ctx.fillStyle = "rgba(190,230,245,0.35)";
    roundRect(ctx, x - 24, y - 14, 48, 16, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    roundRect(ctx, x - 24, y - 14, 48, 16, 2);
    ctx.stroke();
    for (let i = 0; i < n; i += 1) {
      const px = x - 17 + (i % 4) * 11;
      const py = y - 6 + Math.floor(i / 4) * 6;
      ctx.fillStyle = art === "parfait" ? "#f0a6c0" : "#f5e6b8";
      roundRect(ctx, px - 3.5, py - 7, 7, 8, 1.5);
      ctx.fill();
      ctx.fillStyle = "#c86a3a";
      ctx.fillRect(px - 3.5, py - 7, 7, 2);
    }
  } else if (art === "yunohana") {
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = "#efe6d2";
      roundRect(ctx, x - 20 + (i % 4) * 11, y - 11 + Math.floor(i / 4) * 8, 8, 7, 2);
      ctx.fill();
      ctx.fillStyle = "#8a7a58";
      ctx.fillRect(x - 20 + (i % 4) * 11, y - 11 + Math.floor(i / 4) * 8, 8, 2);
    }
  } else if (art === "kibori") {
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = "#8a5a34";
      roundRect(ctx, x - 19 + (i % 4) * 11, y - 12 + Math.floor(i / 4) * 8, 7, 9, 2);
      ctx.fill();
    }
  } else if (art === "omamori") {
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = ["#c0453c", "#4a6b8a", "#8a5aa0"][i % 3];
      roundRect(ctx, x - 19 + (i % 4) * 11, y - 12 + Math.floor(i / 4) * 8, 6, 9, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,224,150,0.9)";
      ctx.fillRect(x - 19 + (i % 4) * 11, y - 10 + Math.floor(i / 4) * 8, 6, 1.5);
    }
  } else if (art === "yakigashi") {
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = "#c8934e";
      ctx.beginPath();
      ctx.arc(x - 17 + (i % 4) * 11, y - 8 + Math.floor(i / 4) * 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 案内所の刷りもの
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = "#f2ead6";
      roundRect(ctx, x - 20 + (i % 4) * 11, y - 12 + Math.floor(i / 4) * 8, 9, 7, 1);
      ctx.fill();
      ctx.fillStyle = "#4a6b8a";
      ctx.fillRect(x - 20 + (i % 4) * 11, y - 12 + Math.floor(i / 4) * 8, 9, 2);
    }
  }
};

/** 石畳。道の区画いちめんに敷く */
const ishidatami = (
  ctx: CanvasRenderingContext2D,
  rect: { x0: number; y0: number; x1: number; y1: number },
  tint = "rgba(255,255,255,0.05)",
) => {
  ctx.fillStyle = tint;
  const step = 34;
  for (let y = rect.y0; y < rect.y1; y += step) {
    const shift = (Math.floor(y / step) % 2) * (step / 2);
    for (let x = rect.x0 + shift; x < rect.x1; x += step) {
      ctx.fillRect(x + 2, y + 2, step - 5, step - 5);
    }
  }
};

/** 区画ごとの飾り（温泉街） */
const drawOnsenProps = (
  ctx: CanvasRenderingContext2D,
  rect: { x0: number; y0: number; x1: number; y1: number },
  prop: string,
  time: number,
) => {
  const cx = (rect.x0 + rect.x1) / 2;
  const cy = (rect.y0 + rect.y1) / 2;

  if (prop === "stone" || prop === "slope" || prop === "alley" || prop === "lantern" || prop === "night") {
    ishidatami(ctx, rect, prop === "night" ? "rgba(255,190,120,0.05)" : "rgba(255,255,255,0.05)");
  }
  if (prop === "slope") {
    // 坂: 段差の線を横に何本か引く
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 3;
    for (let y = rect.y0 + 40; y < rect.y1; y += 80) {
      ctx.beginPath();
      ctx.moveTo(rect.x0 + 8, y);
      ctx.lineTo(rect.x1 - 8, y);
      ctx.stroke();
    }
  }
  if (prop === "steps") {
    // 石段
    for (let y = rect.y0 + 16; y < rect.y1; y += 26) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(rect.x0 + 10, y, rect.x1 - rect.x0 - 20, 18);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(rect.x0 + 10, y + 18, rect.x1 - rect.x0 - 20, 4);
    }
    // 灯籠
    for (const px of [rect.x0 + 14, rect.x1 - 14]) {
      for (let y = rect.y0 + 60; y < rect.y1; y += 150) {
        ctx.fillStyle = "#6f6a60";
        ctx.fillRect(px - 4, y, 8, 16);
        roundRect(ctx, px - 8, y - 10, 16, 11, 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,190,110,${0.5 + Math.sin(time * 2 + y) * 0.15})`;
        roundRect(ctx, px - 5, y - 8, 10, 7, 2);
        ctx.fill();
      }
    }
  }
  if (prop === "lantern" || prop === "night") {
    // 通りにかかる提灯の列
    const n = Math.max(3, Math.round((rect.x1 - rect.x0) / 90));
    for (let i = 0; i <= n; i += 1) {
      const px = rect.x0 + ((rect.x1 - rect.x0) * i) / n;
      chochin(ctx, px, rect.y0 + 16, 1, time, prop === "night" ? 1.6 : 0.9);
    }
  }
  if (prop === "yubatake") {
    // 源泉広場: 湯坪と、そこから引いた木の湯樋
    ctx.fillStyle = "#3f4f4c";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 168, 92, 0.08, 0, Math.PI * 2);
    ctx.fill();
    const yu = ctx.createLinearGradient(0, cy - 70, 0, cy + 90);
    yu.addColorStop(0, "#63b6b0");
    yu.addColorStop(1, "#2b6f74");
    ctx.fillStyle = yu;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 156, 82, 0.08, 0, Math.PI * 2);
    ctx.fill();
    // 湯樋（5本）。湯の花をすくう木の樋
    for (let i = 0; i < 5; i += 1) {
      const px = cx - 110 + i * 55;
      ctx.fillStyle = "#8a6a44";
      roundRect(ctx, px - 11, cy - 66, 22, 150, 4);
      ctx.fill();
      ctx.fillStyle = "#4f9d9a";
      roundRect(ctx, px - 7, cy - 62, 14, 142, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      const flow = (time * 40 + i * 30) % 142;
      roundRect(ctx, px - 7, cy - 62 + flow, 14, 16, 3);
      ctx.fill();
    }
    // 湯滝
    ctx.fillStyle = "rgba(200,240,240,0.55)";
    ctx.fillRect(cx + 120, cy + 30, 34, 46);
    steam(ctx, cx + 137, cy + 30, 40, time, 1.4);
    for (const sx of [cx - 90, cx, cx + 80]) steam(ctx, sx, cy - 30, 90, time, 1.5);
    // まわりの石畳と柵
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 176, 100, 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (prop === "river") {
    // 湯の川。区画を斜めに流れる
    ctx.fillStyle = "#3f7d7a";
    ctx.beginPath();
    ctx.moveTo(rect.x0, rect.y0 + 60);
    ctx.lineTo(rect.x1, rect.y0 + 20);
    ctx.lineTo(rect.x1, rect.y0 + 78);
    ctx.lineTo(rect.x0, rect.y0 + 118);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const px = rect.x0 + 40 + i * 120;
      const py = rect.y0 + 70 - i * 8 + Math.sin(time * 2 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 40, py - 4);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i += 1) steam(ctx, rect.x0 + 80 + i * 150, rect.y0 + 66 - i * 10, 70, time, 1.1);
    // 岩
    ctx.fillStyle = "#5a554c";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.ellipse(rect.x0 + 50 + i * 110, rect.y0 + 150 + (i % 3) * 30, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (prop === "tatami" || prop === "inn") {
    // 店の中: 畳の目
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    for (let y = rect.y0 + 8; y < rect.y1 - 8; y += 34) {
      for (let x = rect.x0 + 8; x < rect.x1 - 8; x += 52) {
        ctx.fillRect(x, y, 48, 30);
      }
    }
  }
  if (prop === "bath") {
    // 浴場の床。湯気がこもる
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = rect.y0 + 10; y < rect.y1; y += 24) ctx.fillRect(rect.x0 + 8, y, rect.x1 - rect.x0 - 16, 12);
    for (let i = 0; i < 3; i += 1) {
      steam(ctx, rect.x0 + 60 + i * ((rect.x1 - rect.x0 - 120) / 2), cy, 90, time, 1.2);
    }
  }
  if (prop === "shrine") {
    // 社: 鳥居のような門と、注連縄
    ctx.fillStyle = "#a8433a";
    ctx.fillRect(cx - 52, rect.y0 + 24, 9, 74);
    ctx.fillRect(cx + 43, rect.y0 + 24, 9, 74);
    ctx.fillRect(cx - 66, rect.y0 + 20, 132, 9);
    ctx.fillRect(cx - 58, rect.y0 + 38, 116, 6);
    ctx.fillStyle = "#e8dcc0";
    ctx.fillRect(cx - 30, rect.y0 + 30, 60, 5);
  }
  if (prop === "garden") {
    // 庭園: 松と飛び石と池
    ctx.fillStyle = "#2f6b74";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 40, 76, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx - 60 + i * 30, cy - 20, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const px of [rect.x0 + 40, rect.x1 - 40]) {
      ctx.fillStyle = "#5a4630";
      ctx.fillRect(px - 3, cy - 30, 6, 30);
      ctx.fillStyle = "#3f6b46";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(px, cy - 34 - i * 12, 24 - i * 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
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

  /* --- 谷の罠。買うと、その場所に実物が現れる（枠だけで効かせない） --- */
  if (id === "rope-stake") {
    // ロープ杭: 杭のあいだに縄を渡す
    for (const ox of [-24, 0, 24]) {
      ctx.fillStyle = "#6b4a2b";
      roundRect(ctx, x + ox - 3, y - 22, 6, 30, 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#b79a63";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 16);
    ctx.quadraticCurveTo(x, y - 8, x + 24, y - 16);
    ctx.stroke();
    return;
  }
  if (id === "mud-lure") {
    // ぬかるみ: 光る泥だまり
    ctx.fillStyle = "rgba(84,66,44,0.85)";
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(150,130,100,${0.3 + Math.abs(Math.sin(time * 1.6)) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 3, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id === "pit-trap") {
    // 落とし穴: 枝でふさいだ穴
    ctx.fillStyle = "#1a120c";
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6b5433";
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y - 12);
      ctx.lineTo(x + i * 8 + 4, y + 12);
      ctx.stroke();
    }
    return;
  }
  if (id === "fire-ring") {
    // 火の囲い: 並べたかがり火
    for (const ox of [-30, 0, 30]) {
      ctx.fillStyle = "#4a4038";
      roundRect(ctx, x + ox - 6, y - 4, 12, 12, 3);
      ctx.fill();
      const flame = 0.6 + Math.abs(Math.sin(time * 6 + ox)) * 0.4;
      ctx.fillStyle = `rgba(255,140,50,${flame})`;
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 4);
      ctx.quadraticCurveTo(x + ox + 7, y - 16, x + ox, y - 26);
      ctx.quadraticCurveTo(x + ox - 7, y - 16, x + ox, y - 4);
      ctx.fill();
    }
    return;
  }
  if (id === "rock-drop") {
    // 岩落とし: 崖の上に組んだ大岩
    ctx.fillStyle = "#5a5248";
    roundRect(ctx, x - 26, y - 4, 52, 12, 4);
    ctx.fill();
    ctx.fillStyle = "#7d7568";
    ctx.beginPath();
    ctx.ellipse(x, y - 16, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#918879";
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 20, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id === "spear-rack" || id === "stone-spear") {
    // 槍置き場・石槍: 立てかけた槍の束
    ctx.fillStyle = "#5f4630";
    roundRect(ctx, x - 22, y + 2, 44, 8, 3);
    ctx.fill();
    for (const [i, ox] of [-14, -4, 6, 16].entries()) {
      ctx.strokeStyle = "#8a6a44";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x + ox, y + 4);
      ctx.lineTo(x + ox + 6, y - 34);
      ctx.stroke();
      ctx.fillStyle = id === "stone-spear" ? "#b9bec4" : "#d8c9a8";
      ctx.beginPath();
      ctx.moveTo(x + ox + 6, y - 40);
      ctx.lineTo(x + ox + 10, y - 30);
      ctx.lineTo(x + ox + 2, y - 30);
      ctx.closePath();
      ctx.fill();
      void i;
    }
    return;
  }
  if (id === "lookout") {
    // 見張り小屋
    ctx.fillStyle = "#5f4630";
    roundRect(ctx, x - 18, y - 26, 36, 30, 4);
    ctx.fill();
    ctx.fillStyle = "#3f3226";
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 26);
    ctx.lineTo(x, y - 44);
    ctx.lineTo(x + 24, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#241a12";
    roundRect(ctx, x - 8, y - 20, 16, 12, 2);
    ctx.fill();
    return;
  }
  if (id === "net-1") {
    // 網: 杭に張った網
    ctx.strokeStyle = "#b79a63";
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 24 + i * 8, y - 18);
      ctx.lineTo(x - 24 + i * 8, y + 10);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 18 + i * 7);
      ctx.lineTo(x + 24, y - 18 + i * 7);
      ctx.stroke();
    }
    return;
  }
  if (id === "map-1") {
    // 地図作り: 広げた皮の地図
    ctx.fillStyle = "#d9c9a2";
    roundRect(ctx, x - 20, y - 16, 40, 28, 3);
    ctx.fill();
    ctx.strokeStyle = "#7a5a3a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 6);
    ctx.quadraticCurveTo(x - 2, y - 6, x + 14, y - 10);
    ctx.stroke();
    ctx.fillStyle = "#c2402f";
    ctx.beginPath();
    ctx.arc(x + 12, y - 8, 2.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (id.startsWith("store-plus") || id === "wood-plus" || id === "pile-plus" || id === "smoke-rack") {
    // 積み増しの棚
    ctx.fillStyle = "#6b543a";
    roundRect(ctx, x - 20, y - 20, 40, 30, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.4;
    for (const oy of [-10, 0]) {
      ctx.beginPath();
      ctx.moveTo(x - 18, y + oy);
      ctx.lineTo(x + 18, y + oy);
      ctx.stroke();
    }
    return;
  }

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
  if (id === "blimp") {
    // 飛行船の広告: 看板を提げた船体が、ゆっくり漂う
    const drift = Math.sin(time * 0.6) * 4;
    ctx.fillStyle = "#7a6a86";
    ctx.fillRect(x - 1, y - 4, 2, 18);
    ctx.fillStyle = "#d8dee8";
    ctx.beginPath();
    ctx.ellipse(x + drift, y - 22, 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c2402f";
    ctx.beginPath();
    ctx.ellipse(x + drift - 12, y - 22, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef7";
    ctx.beginPath();
    ctx.moveTo(x + drift + 26, y - 22);
    ctx.lineTo(x + drift + 36, y - 30);
    ctx.lineTo(x + drift + 34, y - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a3128";
    roundRect(ctx, x + drift - 9, y - 11, 18, 7, 2);
    ctx.fill();
    // ぶら下げた電光看板
    const glow = 0.45 + Math.abs(Math.sin(time * 2.4)) * 0.55;
    ctx.fillStyle = `rgba(255,209,102,${glow})`;
    roundRect(ctx, x + drift - 22, y - 3, 44, 13, 3);
    ctx.fill();
    ctx.fillStyle = "#2b2118";
    ctx.font = `800 9px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
    ctx.fillText("総本店", x + drift, y + 4);
    ctx.font = FONT;
    return;
  }
  if (id === "crater") {
    // 噴火ショー: 小さな山が周期で火を噴く
    const cycle = (time * 0.5) % 1;
    const burst = cycle < 0.32 ? 1 - cycle / 0.32 : 0;
    ctx.fillStyle = "#4a3129";
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 14);
    ctx.lineTo(x - 8, y - 16);
    ctx.lineTo(x + 8, y - 16);
    ctx.lineTo(x + 26, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,150,60,${0.5 + burst * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 16, 9, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (burst > 0) {
      ctx.fillStyle = `rgba(255,120,40,${burst * 0.85})`;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 16);
      ctx.lineTo(x, y - 18 - 30 * burst);
      ctx.lineTo(x + 8, y - 16);
      ctx.closePath();
      ctx.fill();
      // 飛び散る火の粉
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        const d = 16 + (1 - burst) * 26;
        ctx.fillStyle = `rgba(255,190,90,${burst})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y - 18 + Math.sin(a) * d, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ふもとを照らす明かり
    ctx.fillStyle = `rgba(255,120,40,${0.18 + burst * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 15, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
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

    /* ---- 10億／100億ガチャで増える動物 ---- */
    case "fox":
      // きつね: とがった大きな耳と、白い先のふさふさしっぽ
      tail(color, 15, 5);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.moveTo(x - 9, hy - 3);
      ctx.lineTo(x - 6, hy - 14);
      ctx.lineTo(x - 2, hy - 4);
      ctx.closePath();
      ctx.moveTo(x + 9, hy - 3);
      ctx.lineTo(x + 6, hy - 14);
      ctx.lineTo(x + 2, hy - 4);
      ctx.closePath();
      ctx.fill();
      eyes(3, 1.2);
      // とがった鼻づら
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 3.4, hy + 2);
      ctx.lineTo(x, hy + 8);
      ctx.lineTo(x + 3.4, hy + 2);
      ctx.closePath();
      ctx.fill();
      return;
    case "wolf":
      // おおかみ: きつねより角ばった耳と、太いしっぽ
      tail(color, 13, 5);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 9, hy - 2);
      ctx.lineTo(x - 8, hy - 13);
      ctx.lineTo(x - 1, hy - 4);
      ctx.closePath();
      ctx.moveTo(x + 9, hy - 2);
      ctx.lineTo(x + 8, hy - 13);
      ctx.lineTo(x + 1, hy - 4);
      ctx.closePath();
      ctx.fill();
      eyes(3.2, 1.3);
      snout(head, 5, 3.4);
      // きば
      ctx.fillStyle = "#f4f1ea";
      ctx.beginPath();
      ctx.moveTo(x - 2, hy + 5);
      ctx.lineTo(x - 1, hy + 8);
      ctx.lineTo(x, hy + 5);
      ctx.closePath();
      ctx.fill();
      return;
    case "redpanda":
      // レッサーパンダ: まるい耳、白い顔まわり、しま模様のしっぽ
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 2);
      ctx.quadraticCurveTo(x + 20, y - 6, x + 19, y - 15);
      ctx.stroke();
      ctx.strokeStyle = "#f4e3d2";
      ctx.lineWidth = 1.6;
      for (const p of [0.35, 0.7]) {
        ctx.beginPath();
        ctx.arc(x + 12 + p * 8, y - 6 - p * 8, 2.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4e3d2";
      ear(-7, 4, 3.6);
      ear(7, 4, 3.6);
      ctx.beginPath();
      ctx.ellipse(x, hy + 1, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      eyes(3.2, 1.4);
      snout(color, 3, 2.2);
      return;
    case "capybara":
      // カピバラ: 小さい耳、四角い鼻づら、ねむたい目
      ctx.fillStyle = color;
      ear(-6.5, 2.6, 2.4);
      ear(6.5, 2.6, 2.4);
      ctx.fillStyle = head;
      roundRect(ctx, x - 7, hy - 5, 14, 13, 5);
      ctx.fill();
      ctx.strokeStyle = "#2b2b33";
      ctx.lineWidth = 1.3;
      for (const dx of [-3, 3]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 1.6, hy - 1);
        ctx.lineTo(x + dx + 1.6, hy - 1);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      roundRect(ctx, x - 4, hy + 3, 8, 4, 2);
      ctx.fill();
      return;
    case "owl":
      // ふくろう: 大きな丸い目と、羽の角、翼
      ctx.fillStyle = color;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + dir * 10, y - 8, 4.5, 9, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(x, hy, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + dir * 3, hy - 7);
        ctx.lineTo(x + dir * 8, hy - 13);
        ctx.lineTo(x + dir * 8, hy - 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#fbf7ef";
      ctx.beginPath();
      ctx.arc(x - 3.4, hy - 1, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 3.4, hy - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b33";
      ctx.beginPath();
      ctx.arc(x - 3.4, hy - 1, 1.6, 0, Math.PI * 2);
      ctx.arc(x + 3.4, hy - 1, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 2, hy + 2);
      ctx.lineTo(x, hy + 7);
      ctx.lineTo(x + 2, hy + 2);
      ctx.closePath();
      ctx.fill();
      return;
    case "mammoth":
      // マンモス: 長い鼻と、そりあがった牙、もこもこの毛
      ctx.fillStyle = color;
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(x - 9 + i * 3.6, y - 12 + (i % 2) * 3, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.ellipse(x, hy, 9, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ear(-9.5, 4, 6);
      ear(9.5, 4, 6);
      eyes(3.4, 1.1);
      // 鼻
      ctx.strokeStyle = head;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, hy + 4);
      ctx.quadraticCurveTo(x + 2, hy + 12, x - 2 + Math.sin(time * 2) * 2, hy + 16);
      ctx.stroke();
      ctx.lineCap = "butt";
      // 牙
      ctx.strokeStyle = faceColorOr(color, "#f2ece0");
      ctx.lineWidth = 2.2;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + dir * 5, hy + 5);
        ctx.quadraticCurveTo(x + dir * 10, hy + 12, x + dir * 11, hy + 4);
        ctx.stroke();
      }
      return;
    case "phoenix":
      // 不死鳥: 燃える翼と、羽根の冠
      for (const dir of [-1, 1]) {
        const wing = ctx.createLinearGradient(x, y - 20, x + dir * 24, y);
        wing.addColorStop(0, "rgba(255,209,102,0.9)");
        wing.addColorStop(1, "rgba(232,84,31,0.35)");
        ctx.fillStyle = wing;
        ctx.beginPath();
        ctx.moveTo(x + dir * 5, y - 14);
        ctx.quadraticCurveTo(
          x + dir * 26,
          y - 28 + Math.sin(time * 5) * 5,
          x + dir * 22,
          y - 2,
        );
        ctx.quadraticCurveTo(x + dir * 12, y - 8, x + dir * 5, y - 14);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(x, hy, 7.6, 0, Math.PI * 2);
      ctx.fill();
      // 冠羽
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillStyle = `rgba(255,${150 + i * 30},60,0.95)`;
        ctx.beginPath();
        ctx.moveTo(x + i * 4 - 2, hy - 5);
        ctx.lineTo(x + i * 4 + Math.sin(time * 4 + i) * 2, hy - 15);
        ctx.lineTo(x + i * 4 + 2, hy - 5);
        ctx.closePath();
        ctx.fill();
      }
      eyes(2.8, 1.2);
      ctx.fillStyle = "#ffb347";
      ctx.beginPath();
      ctx.moveTo(x - 2, hy + 2);
      ctx.lineTo(x, hy + 7);
      ctx.lineTo(x + 2, hy + 2);
      ctx.closePath();
      ctx.fill();
      return;
    case "ninetails":
      // 九尾: 何本もの尾が扇のように広がる
      for (let i = 0; i < 9; i += 1) {
        const a = -0.4 + (i / 8) * 1.5 + Math.sin(time * 2 + i) * 0.06;
        ctx.strokeStyle = i % 2 === 0 ? color : "#fbf3e2";
        ctx.lineWidth = 3.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x + 6, y - 4);
        ctx.quadraticCurveTo(
          x + 12 + Math.cos(a) * 10,
          y - 10 - Math.sin(a) * 10,
          x + 10 + Math.cos(a) * 20,
          y - 14 - Math.sin(a) * 20,
        );
        ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.moveTo(x - 9, hy - 3);
      ctx.lineTo(x - 6, hy - 14);
      ctx.lineTo(x - 2, hy - 4);
      ctx.closePath();
      ctx.moveTo(x + 9, hy - 3);
      ctx.lineTo(x + 6, hy - 14);
      ctx.lineTo(x + 2, hy - 4);
      ctx.closePath();
      ctx.fill();
      eyes(3, 1.2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 3.4, hy + 2);
      ctx.lineTo(x, hy + 8);
      ctx.lineTo(x + 3.4, hy + 2);
      ctx.closePath();
      ctx.fill();
      return;
  }
};

/** 色の指定がなければ、決めうちの色を返す小さな助け */
const faceColorOr = (color: string | undefined, fallback: string) =>
  color ?? fallback;

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
  if (hat === "wizard") {
    // とんがり帽子: 大きなつばと、先の折れた円すい
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, top + 3, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 8, top + 2);
    ctx.quadraticCurveTo(x - 3, top - 12, x + 6, top - 18);
    ctx.quadraticCurveTo(x + 3, top - 8, x + 8, top + 2);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (hat === "tricorn") {
    // 三角帽: 三方に角が跳ねる
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 14, top + 3);
    ctx.quadraticCurveTo(x, top - 11, x + 14, top + 3);
    ctx.quadraticCurveTo(x, top - 2, x - 14, top + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.beginPath();
    ctx.arc(x, top - 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (hat === "hood") {
    // 毛皮のフード: 顔のまわりをふさふさが囲む
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 20, 12, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI * (0.85 + (i / 8) * 1.3);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 12, y - 20 + Math.sin(a) * 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (hat === "mask") {
    // 火祭りの面: 額に乗せた面。目と角がある
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, top - 1, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1806";
    ctx.beginPath();
    ctx.ellipse(x - 3.4, top - 1, 1.8, 1.2, 0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 3.4, top - 1, 1.8, 1.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 7, top - 5);
      ctx.lineTo(x + side * 11, top - 12);
      ctx.lineTo(x + side * 4, top - 7);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (hat === "halo") {
    // 光の輪: 頭のうえに浮く
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(x, top - 6, 10, 3.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, top - 6, 10, 3.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (hat === "horns") {
    // 角: 頭の両側から後ろへそる
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 6, top + 2);
      ctx.quadraticCurveTo(x + side * 13, top - 3, x + side * 11, top - 11);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    return;
  }
};

/**
 * 最上位スキンのオーラ（§11.3）。
 * 色替えだけにせず、動く飾りで見分けられるようにする
 */
const drawAura = (
  ctx: CanvasRenderingContext2D,
  aura: Aura,
  x: number,
  y: number,
  t: number,
) => {
  if (aura === "none") return;
  const cy = y - 14;
  ctx.save();
  if (aura === "flame") {
    for (let i = 0; i < 5; i += 1) {
      const p = (t * 0.9 + i * 0.2) % 1;
      ctx.fillStyle = `rgba(255,${120 + p * 100},50,${(1 - p) * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.sin(t * 4 + i * 2) * 12,
        cy + 12 - p * 34,
        4 * (1 - p) + 1,
        7 * (1 - p) + 1,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (aura === "star") {
    for (let i = 0; i < 5; i += 1) {
      const a = t * 1.6 + (i / 5) * Math.PI * 2;
      const r = 17 + Math.sin(t * 2 + i) * 3;
      ctx.fillStyle = `rgba(255,240,190,${0.5 + Math.sin(t * 4 + i) * 0.35})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (aura === "moon") {
    ctx.strokeStyle = `rgba(200,220,255,${0.4 + Math.sin(t * 2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(230,240,255,0.85)";
    ctx.beginPath();
    ctx.arc(x + Math.cos(t) * 19, cy + Math.sin(t) * 10, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (aura === "sun") {
    for (let i = 0; i < 8; i += 1) {
      const a = t * 0.7 + (i / 8) * Math.PI * 2;
      ctx.strokeStyle = `rgba(255,210,90,${0.35 + Math.sin(t * 3 + i) * 0.25})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 15, cy + Math.sin(a) * 9);
      ctx.lineTo(x + Math.cos(a) * 23, cy + Math.sin(a) * 14);
      ctx.stroke();
    }
  } else if (aura === "galaxy") {
    for (let i = 0; i < 14; i += 1) {
      const a = t * 1.1 + (i / 14) * Math.PI * 2;
      const r = 8 + (i % 4) * 5;
      ctx.fillStyle = `rgba(${180 - i * 6},${150 + i * 4},255,0.6)`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (aura === "rainbow") {
    for (let i = 0; i < 6; i += 1) {
      ctx.strokeStyle = `hsla(${(t * 90 + i * 60) % 360},90%,68%,0.5)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, cy, 12 + i * 2.4, t + i, t + i + 1.4);
      ctx.stroke();
    }
  } else if (aura === "gold") {
    for (let i = 0; i < 7; i += 1) {
      const p = (t * 0.7 + i * 0.14) % 1;
      ctx.fillStyle = `rgba(255,209,102,${(1 - p) * 0.8})`;
      ctx.beginPath();
      ctx.arc(
        x + Math.sin(t * 2 + i * 1.7) * 15,
        cy + 14 - p * 30,
        2.2 * (1 - p) + 0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (aura === "clock") {
    ctx.strokeStyle = `rgba(230,200,120,${0.35 + Math.sin(t * 2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, 19, 0, Math.PI * 2);
    ctx.stroke();
    for (const [len, speed] of [
      [12, 1],
      [17, 0.2],
    ]) {
      const a = t * speed - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x + Math.cos(a) * len, cy + Math.sin(a) * len * 0.6);
      ctx.stroke();
    }
  } else if (aura === "water") {
    for (let i = 0; i < 4; i += 1) {
      const p = (t * 0.5 + i * 0.25) % 1;
      ctx.strokeStyle = `rgba(140,220,240,${(1 - p) * 0.55})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(x, cy + 12, 8 + p * 18, 3 + p * 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
};

/** 背中のマント。歩くとひるがえる */
const drawCape = (
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  t: number,
) => {
  const flap = Math.sin(t * 3) * 2.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 16);
  ctx.quadraticCurveTo(x - 15 - flap, y - 4, x - 12 - flap, y + 6);
  ctx.lineTo(x + 12 + flap, y + 6);
  ctx.quadraticCurveTo(x + 15 + flap, y - 4, x + 8, y - 16);
  ctx.closePath();
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

/** 犬1頭。向きに合わせて体をひっくり返す */
const sledDog = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  moving: boolean,
  t: number,
) => {
  const coat = "#8a7050";
  const gait = moving ? Math.sin(t * 12) : 0;
  const breath = moving ? 0 : Math.sin(t * 2.2) * 0.5;
  // 足
  ctx.strokeStyle = "#6a5238";
  ctx.lineWidth = 2;
  for (const [i, lx] of [-4, 3].entries()) {
    const swing = moving ? Math.sin(t * 12 + i * Math.PI) * 2.4 : 0;
    ctx.beginPath();
    ctx.moveTo(x + lx * face, y - 2);
    ctx.lineTo(x + lx * face + swing, y + 4);
    ctx.stroke();
  }
  // 胴
  ctx.fillStyle = coat;
  roundRect(ctx, x - 7, y - 8 - breath, 14, 7.5, 3.5);
  ctx.fill();
  // しっぽ（止まっているときはゆっくり振る）
  ctx.strokeStyle = coat;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 7 * face, y - 6);
  ctx.quadraticCurveTo(
    x - 12 * face,
    y - 9 + (moving ? gait : Math.sin(t * 3) * 3),
    x - 13 * face,
    y - 13,
  );
  ctx.stroke();
  // 頭と耳と鼻
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.arc(x + 7 * face, y - 10 - breath, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 5 * face, y - 13 - breath);
  ctx.lineTo(x + 5.5 * face, y - 18 - breath);
  ctx.lineTo(x + 9 * face, y - 13.5 - breath);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f2ece0";
  ctx.beginPath();
  ctx.ellipse(x + 10 * face, y - 9 - breath, 2.6, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2b2318";
  ctx.beginPath();
  ctx.arc(x + 12 * face, y - 9.4 - breath, 1, 0, Math.PI * 2);
  ctx.arc(x + 8 * face, y - 11.4 - breath, 0.9, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * 犬ぞり（§8.2）。
 * 2頭の犬・引き綱・荷台でできている。ロボットの部品は使わない。
 * 進む向きに犬とそりが向き、荷物は荷台に品種ごとに載る。
 */
/**
 * 荷車（大河の文明）。牛が引く二輪の荷車。
 * 犬ぞりと同じ「低いところを走る運び屋」だが、車輪と牛で見分けがつく。
 */
/**
 * 川を行く運搬船（大河の文明）。
 * 船頭が棹（さお）を差し、荷を積んで水の上を進む。
 */
const drawRiverBoat = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  moving: boolean,
  t: number,
) => {
  const bob = Math.sin(t * 2.2) * 1.4;
  const by = y + bob;
  // 水しぶきと引き波
  if (moving) {
    ctx.strokeStyle = "rgba(220,245,255,0.45)";
    ctx.lineWidth = 1.4;
    for (const oy of [2, 6]) {
      ctx.beginPath();
      ctx.moveTo(x - 26 * face, by + oy);
      ctx.lineTo(x - 46 * face, by + oy);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, by + 8, 26, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 船体
  ctx.fillStyle = "#6b4a2b";
  ctx.beginPath();
  ctx.moveTo(x - 26, by - 2);
  ctx.quadraticCurveTo(x, by + 12, x + 26, by - 2);
  ctx.lineTo(x + 21, by - 9);
  ctx.lineTo(x - 21, by - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8a6440";
  roundRect(ctx, x - 22, by - 11, 44, 4, 2);
  ctx.fill();
  // 積み荷のむしろ
  ctx.fillStyle = "#c2ad84";
  roundRect(ctx, x - 12, by - 19, 22, 9, 3);
  ctx.fill();
  // 船頭と棹
  ctx.fillStyle = "#e8c9a0";
  ctx.beginPath();
  ctx.arc(x + 15 * face, by - 20, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4f7f6a";
  roundRect(ctx, x + 15 * face - 4, by - 17, 8, 9, 3);
  ctx.fill();
  ctx.strokeStyle = "#8a6a44";
  ctx.lineWidth = 1.8;
  const pole = moving ? Math.sin(t * 3) * 4 : 0;
  ctx.beginPath();
  ctx.moveTo(x + 19 * face, by - 24);
  ctx.lineTo(x + (26 + pole) * face, by + 6);
  ctx.stroke();
};

const drawCart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  moving: boolean,
  t: number,
) => {
  shadow(ctx, x, y + 8, 22);
  // 荷台（うしろ側）
  const bx = x - 16 * face;
  ctx.fillStyle = "#6b4a2b";
  roundRect(ctx, bx - 13, y - 10, 26, 12, 3);
  ctx.fill();
  ctx.fillStyle = "#8a6440";
  roundRect(ctx, bx - 13, y - 10, 26, 4, 2);
  ctx.fill();
  // 車輪（走ると回る）
  const spin = moving ? t * 6 : 0;
  for (const ox of [-7, 7]) {
    ctx.fillStyle = "#4a3524";
    ctx.beginPath();
    ctx.arc(bx + ox, y + 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a08858";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      const a = spin + (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(bx + ox + Math.cos(a) * 5, y + 3 + Math.sin(a) * 5);
      ctx.lineTo(bx + ox - Math.cos(a) * 5, y + 3 - Math.sin(a) * 5);
      ctx.stroke();
    }
  }
  // 引き棒
  ctx.strokeStyle = "#7a5836";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx + 12 * face, y - 4);
  ctx.lineTo(x + 8 * face, y - 6);
  ctx.stroke();
  // 牛（前）
  const step = moving ? Math.sin(t * 8) * 2 : 0;
  ctx.fillStyle = "#9a8468";
  ctx.beginPath();
  ctx.ellipse(x + 16 * face, y - 8, 12, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a7358";
  ctx.beginPath();
  ctx.ellipse(x + 26 * face, y - 11, 5.4, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 角
  ctx.strokeStyle = "#e8ddc8";
  ctx.lineWidth = 1.6;
  for (const dy of [-2, 2]) {
    ctx.beginPath();
    ctx.moveTo(x + 27 * face, y - 14);
    ctx.lineTo(x + (30 + dy) * face, y - 18);
    ctx.stroke();
  }
  // 脚
  ctx.strokeStyle = "#7a6650";
  ctx.lineWidth = 2;
  for (const [i, ox] of [8, 22].entries()) {
    ctx.beginPath();
    ctx.moveTo(x + ox * face, y - 2);
    ctx.lineTo(x + ox * face + (i === 0 ? step : -step), y + 6);
    ctx.stroke();
  }
};

const drawSled = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  moving: boolean,
  t: number,
) => {
  shadow(ctx, x, y + 8, 22);
  // 荷台（うしろ側）
  const bx = x - 16 * face;
  ctx.fillStyle = "#5a3f26";
  roundRect(ctx, bx - 12, y - 8, 24, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#7a5836";
  roundRect(ctx, bx - 12, y - 8, 24, 3.5, 2);
  ctx.fill();
  // そりの滑走部と支柱
  ctx.strokeStyle = "#3d2b1a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx - 13, y + 5);
  ctx.lineTo(bx + 11, y + 5);
  ctx.quadraticCurveTo(bx + 16, y + 5, bx + 16, y + 1);
  ctx.stroke();
  for (const px of [bx - 8, bx + 6]) {
    ctx.beginPath();
    ctx.moveTo(px, y + 2);
    ctx.lineTo(px, y + 5);
    ctx.stroke();
  }
  // 引き綱（走っているとぴんと張って揺れる）
  ctx.strokeStyle = "#a08858";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 12 * face, y - 4);
  ctx.quadraticCurveTo(
    x + 6 * face,
    y - 6 + (moving ? Math.sin(t * 12) * 1.5 : 1.5),
    x + 18 * face,
    y - 6,
  );
  ctx.stroke();
  // 犬2頭（前後に並べる）
  sledDog(ctx, x + 8 * face, y + 3, face, moving, t);
  sledDog(ctx, x + 26 * face, y - 1, face, moving, t + 0.4);
};

/** いまの場面（BGMの層を決めるための、ざっくりした状況） */
const currentScene = (state: ShopState): Scene => {
  const player = state.player;
  let area = 0;
  for (const item of areas) {
    if (
      player.pos.x >= item.rect.x0 &&
      player.pos.x <= item.rect.x1 &&
      player.pos.y >= item.rect.y0 &&
      player.pos.y <= item.rect.y1
    ) {
      const n = Number(item.id.replace("area-", ""));
      if (Number.isFinite(n)) area = n;
      break;
    }
  }
  return {
    stage:
      stage().id === "fire"
        ? "fire"
        : stage().id === "taiga"
          ? "taiga"
          : stage().id === "park"
            ? "park"
            : "ramen",
    area,
    phase: state.fire.phase,
    weather: state.fire.weather,
  };
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
  /** 区画が開いた時刻。しばらく工事中の絵を出すために使う（描画側だけ） */
  const builtAt = useRef(new Map<string, number>());
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
      const isTaiga = stage().id === "taiga";
      const isOnsen = stage().id === "onsen";
      /*
       * 原始の見た目（火のはじまり・大河の文明）。
       * 床・区画の看板・作業場・ベンチ・働く人を、こちらの絵で描く。
       * 雪と夜、犬ぞりは「火のはじまり」だけのものなので、isFire のまま。
       */
      const wild = isFire || isTaiga;
      /** 画面に映るワールドの横幅。広い区画のステージは少し引いて見せる */
      const view = viewWidth();

      /* --- 床 --- */
      if (isOnsen) {
        // 山あいの景色は、区画のあるなしにかかわらず画面いっぱいに敷く
        drawOnsenBackdrop(
          ctx,
          {
            x0: camX,
            y0: camY,
            x1: camX + canvas.width / scale,
            y1: camY + canvas.height / scale,
          },
          box,
          time,
        );
      }
      ctx.fillStyle = wild
        ? "#20160f"
        : isPark
          ? "#101826"
          : isOnsen
            ? "rgba(20,24,28,0)"
            : "#191512";
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
      /* --- 棟の壁と、戸口・渡り廊下（2号店） --- */
      if (wallsOn()) {
        const holes = openingsOf(state);
        // 渡り廊下は床の一部として先に敷く
        if (isOnsen) {
          for (const hole of holes) {
            // 建物の戸口だけ（通りどうしの辻には下げない）
            if (!hole.nodes.some((node) => !node.startsWith("road:") && node !== "out")) continue;
            const { x0, y0, x1, y1 } = hole.rect;
            const flat = x1 - x0 > y1 - y0;
            noren(
              ctx,
              (x0 + x1) / 2,
              flat ? y0 - 2 : (y0 + y1) / 2 - 8,
              flat ? x1 - x0 : 20,
              "#2f4a5c",
            );
          }
        }
        for (const hole of holes) {
          if (hole.nodes.includes("out") && hole.nodes.length <= 2) continue;
          // 通り（辻・戸口）は道そのものなので、渡り廊下の床は敷かない
          if (hole.nodes.some((node) => node.startsWith("road:"))) continue;
          const { x0, y0, x1, y1 } = hole.rect;
          ctx.fillStyle = "rgba(214,190,150,0.20)";
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          ctx.strokeStyle = "rgba(236,214,176,0.30)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        }
        for (const room of roomRects(state)) {
          const { x0, y0, x1, y1 } = room.rect;
          const gaps = holes.filter((hole) => hole.nodes.includes(room.id));
          if (isOnsen) {
            // 温泉街の棟は、奥側に瓦屋根がかかって見える
            ctx.fillStyle = "rgba(0,0,0,0.22)";
            ctx.fillRect(x0, y0, x1 - x0, 18);
            kawara(ctx, (x0 + x1) / 2, y0 + 18, x1 - x0, "#443a40");
          }
          ctx.strokeStyle = isOnsen ? "#7b6547" : "#6d5a44";
          ctx.lineWidth = 7;
          // 壁は4辺を線分でなぞり、穴のところだけ描かない
          const edges: [number, number, number, number][] = [
            [x0, y0, x1, y0],
            [x0, y1, x1, y1],
            [x0, y0, x0, y1],
            [x1, y0, x1, y1],
          ];
          for (const [ax, ay, bx, by] of edges) {
            const flat = ay === by;
            const cuts = gaps
              .filter((hole) =>
                flat
                  ? hole.rect.y0 < ay && hole.rect.y1 > ay
                  : hole.rect.x0 < ax && hole.rect.x1 > ax,
              )
              .map((hole) => (flat ? [hole.rect.x0, hole.rect.x1] : [hole.rect.y0, hole.rect.y1]))
              .sort((p, q) => p[0] - q[0]);
            let at = flat ? ax : ay;
            const end = flat ? bx : by;
            for (const [from, to] of cuts) {
              if (from > at) {
                ctx.beginPath();
                if (flat) {
                  ctx.moveTo(at, ay);
                  ctx.lineTo(Math.min(from, end), ay);
                } else {
                  ctx.moveTo(ax, at);
                  ctx.lineTo(ax, Math.min(from, end));
                }
                ctx.stroke();
              }
              at = Math.max(at, to);
            }
            if (at < end) {
              ctx.beginPath();
              if (flat) {
                ctx.moveTo(at, ay);
                ctx.lineTo(end, ay);
              } else {
                ctx.moveTo(ax, at);
                ctx.lineTo(ax, end);
              }
              ctx.stroke();
            }
          }
        }
        // 戸口は のれん で分かるようにする
        for (const hole of holes) {
          if (!hole.nodes.includes("out") || hole.nodes.length > 2) continue;
          const { x0, x1, y0 } = hole.rect;
          ctx.fillStyle = "#b8452f";
          ctx.fillRect(x0, y0 + 2, x1 - x0, 12);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.fillRect((x0 + x1) / 2 - 1.5, y0 + 3, 3, 10);
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
        // 山は帯より手前（奥の景色）として描く
        if (area.palette.prop === "volcano") drawVolcano(ctx, area.rect, time);

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
            area.price === 0 ? "D R E A M   P A R K" : areaTitle(area.label),
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
        } else if (wild) {
          ctx.fillStyle = area.price === 0 ? "#7a3b1f" : "#4a3524";
          roundRect(ctx, x0 + 10, 4, x1 - x0 - 20, 30, 6);
          ctx.fill();
          ctx.fillStyle = "#f6d9a8";
          ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
          ctx.fillText(
            area.price === 0
              ? stage().name.split("").join(" ")
              : areaTitle(area.label),
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
          ctx.fillText(
            spaced(area.price === 0 ? "らーめん" : areaTitle(area.label)),
            mid,
            20,
          );
          ctx.font = FONT;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          for (let i = 1; i < 5; i += 1) {
            ctx.fillRect(x0 + 10 + ((x1 - x0 - 20) / 5) * i - 1, 4, 2, 30);
          }
        }
      }

      /*
       * 大河。区画をまたいで、世界のはしからはしまで流れている。
       * 水くみ場や取水口はこの岸に立ち、運搬船はこの上を行き来する。
       * 季節で水かさが変わる（雨季は岸に迫り、乾季は川原が広がる）
       */
      if (isTaiga) {
        const rise = riverRise(state);
        const top = box.y0 + 26 - rise * 14;
        const edge = RIVER_LANE + 24 + rise * 12;
        const wide = box.x1 - box.x0;
        const water = ctx.createLinearGradient(0, top, 0, edge);
        water.addColorStop(0, rise > 0.8 ? "#2a5a48" : "#1d4b5c");
        water.addColorStop(1, rise > 0.8 ? "#4a8c72" : "#2f7d8c");
        ctx.fillStyle = water;
        ctx.fillRect(box.x0, top, wide, edge - top);
        // 流れの筋
        ctx.strokeStyle = "rgba(220,245,255,0.28)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i += 1) {
          const ly = top + 12 + i * ((edge - top - 16) / 5);
          const shift = (time * (26 + i * 7)) % 240;
          ctx.beginPath();
          for (let sx = box.x0; sx <= box.x1; sx += 14) {
            const yy = ly + Math.sin((sx + shift) * 0.03 + i) * 2.4;
            if (sx === box.x0) ctx.moveTo(sx, yy);
            else ctx.lineTo(sx, yy);
          }
          ctx.stroke();
        }
        // 岸（水が引くと川原が広がる）
        ctx.fillStyle = "#6d5a3c";
        ctx.fillRect(box.x0, edge - 2, wide, 10 - rise * 4);
        if (rise < -0.2) {
          ctx.fillStyle = "rgba(150,128,92,0.5)";
          ctx.fillRect(box.x0, edge + 6, wide, -rise * 16);
        }
      }
      // 冬が来ると、地面が少しずつ白くなる（第4区画）
      const snow = isFire ? snowDepth(state) : 0;
      if (snow > 0) {
        ctx.fillStyle = `rgba(224,235,246,${0.14 + snow * 0.26})`;
        ctx.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      }
      // 敷いた道（村の道）。通る人みんなが速くなる
      if (wild) {
        for (const item of equipment) {
          if (!item.road || !hasEquip(state, item.id)) continue;
          ctx.strokeStyle = "rgba(196,176,140,0.34)";
          ctx.lineWidth = 26;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(item.road.from.x, item.road.from.y);
          ctx.lineTo(item.road.to.x, item.road.to.y);
          ctx.stroke();
          ctx.lineCap = "butt";
          ctx.fillStyle = "rgba(120,102,74,0.35)";
          const span = Math.hypot(
            item.road.to.x - item.road.from.x,
            item.road.to.y - item.road.from.y,
          );
          for (let i = 0; i < span / 30; i += 1) {
            const t = i / (span / 30);
            ctx.beginPath();
            ctx.ellipse(
              item.road.from.x + (item.road.to.x - item.road.from.x) * t,
              item.road.from.y + (item.road.to.y - item.road.from.y) * t + ((i % 2) - 0.5) * 8,
              6,
              4,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
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
        if (wild) {
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
        // 貯蔵庫・仮置き場・建築予定地は、中身をそれぞれの絵で見せている
        const plain = isStore(stove) || isPile(stove) || isBuild(stove);
        if (!plain) {
          for (let i = 0; i < ready; i += 1) held(ctx, made, x, y + 22 - i * 5.5);
        }

        /*
         * 工程の作業場の様子を、文字を読まなくても分かるようにする（§8.4）。
         *   左  = 受け口の材料（生肉・丸太・切り身）
         *   右  = まき（薪）の受け口
         *   下  = できあがった品
         * 足りない受け口には、その品の絵を薄く出して「何待ちか」を見せる
         */
        if (isStation(stove) && !plain) {
          const held0 = heldAt(state, stove.id);
          const fuel0 = stove.fuel ? fuelAt(state, stove.id) : 0;
          const needs = Object.keys(stove.recipe ?? {});
          const slots: { kind: string; count: number; sx: number; word: string }[] =
            needs.length > 0
              ? // 多品目の受け口（盛り付け台）。どの品が足りないかまで並べて出す
                needs.map((kind, i) => ({
                  kind,
                  count: partsAt(state, stove.id, kind),
                  sx: x + (i - (needs.length - 1) / 2) * 26,
                  word: `${itemLabel(kind)}まち`,
                }))
              : [
                  {
                    kind: stove.takes ?? "",
                    count: held0,
                    sx: x - 32,
                    word: `${itemLabel(stove.takes ?? "")}まち`,
                  },
                  ...(stove.fuel
                    ? [
                        {
                          kind: stove.fuel,
                          count: fuel0,
                          sx: x + 32,
                          word: `${itemLabel(stove.fuel)}まち`,
                        },
                      ]
                    : []),
                ];
          for (const slot of slots) {
            // 受け口の枠（空だと赤く点滅する）
            const empty = slot.count <= 0;
            const pulse = 0.5 + Math.sin(time * 4) * 0.5;
            ctx.save();
            ctx.strokeStyle = empty
              ? `rgba(255,150,140,${0.45 + pulse * 0.4})`
              : "rgba(255,255,255,0.22)";
            ctx.lineWidth = empty ? 2 : 1;
            roundRect(ctx, slot.sx - 11, y - 4, 22, 26, 5);
            ctx.stroke();
            ctx.restore();
            if (empty) {
              // 何を待っているのか、品の絵を薄く出す
              ctx.save();
              ctx.globalAlpha = 0.3 + pulse * 0.2;
              held(ctx, slot.kind, slot.sx, y + 12, 0.75);
              ctx.restore();
              ctx.font = SMALL;
              ctx.fillStyle = "rgba(255,160,148,0.95)";
              ctx.fillText(slot.word, slot.sx, y - 12);
              ctx.font = FONT;
            } else {
              for (let i = 0; i < slot.count; i += 1) {
                held(ctx, slot.kind, slot.sx, y + 16 - i * 5, 0.8);
              }
            }
          }
          // 人の手が要る作業場は、誰もいないと止まっているのが分かるようにする
          if (stove.manual && !isManned(state, stove)) {
            const word = held0 > 0 ? "手を貸そう" : "手が空いている";
            ctx.font = SMALL;
            const w = ctx.measureText(word).width + 10;
            ctx.fillStyle = "rgba(10,8,6,0.7)";
            roundRect(ctx, x - w / 2, y - 52, w, 12, 6);
            ctx.fill();
            ctx.fillStyle = `rgba(255,209,102,${0.6 + Math.abs(Math.sin(time * 3)) * 0.4})`;
            ctx.fillText(word, x, y - 46);
            ctx.font = FONT;
          }
        }
        if (ready >= holdCap(state, stove) && !plain) {
          ctx.fillStyle = "#ffd166";
          ctx.fillText("満杯", x, y + 36);
        }
        // 工程が長い店は、作業場の名前を足もとに出す
        if (wallsOn() && stove.label && !plain) {
          ctx.font = SMALL;
          ctx.fillStyle = "rgba(240,228,208,0.7)";
          ctx.fillText(stove.label, x, y + (ready >= holdCap(state, stove) ? 48 : 36));
          ctx.font = FONT;
        }
      }

      /* --- カウンター（ラーメンだけ） --- */
      if (!isPark && !wild) {
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
            if (isOnsen) {
              drawOnsenTable(ctx, seat.art ?? "soba", x, y, time, isDirty(state, seat.id));
            } else {
              drawTable(ctx, seat.art ?? "pasta", x, y, time, isDirty(state, seat.id));
            }
          } else if (isOnsen) {
            drawOnsenShelf(ctx, seat.art ?? "manju", x, y, time, shelfStock(state, seat.id));
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
        } else if (isPark || isOnsen) {
          // アトラクション・湯どころと、その周り（乗り場・柵・看板）
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

          if (isOnsen) {
            drawOnsenSeat(ctx, seat.art ?? "ashiyu", x, y, time);
          } else {
            drawRide(ctx, seat.art ?? "bench", x, y, time);
          }

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
        } else if (wild) {
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
          else held(ctx, seatNeeds(seat), tray.x, tray.y, left > 0.88 ? 1.35 : 1.15);
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
          areaTitle(area.label),
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
      // いまつまっているところに合う枠を1つだけ「おすすめ」にする。
      // 買わなくても進めなくならない（§2.4）
      const tip = recommendedPad(state);
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
        ctx.fillText(
          formatMoney(Math.max(0, price - paid), currency()),
          at.x,
          at.y + 12,
        );

        if (pad.id === tip) {
          const beat = 0.55 + Math.abs(Math.sin(time * 3)) * 0.45;
          ctx.font = SMALL;
          const word = "おすすめ";
          const w = ctx.measureText(word).width + 14;
          ctx.fillStyle = `rgba(255,209,102,${beat})`;
          roundRect(ctx, at.x - w / 2, at.y - PAD_RADIUS - 16, w, 13, 6);
          ctx.fill();
          ctx.fillStyle = "#2a1c0c";
          ctx.fillText(word, at.x, at.y - PAD_RADIUS - 9);
          ctx.font = FONT;
        }
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
        ctx.fillText(currency(), coin.pos.x, coin.pos.y - lift + 0.5);
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
        hunter: "#6b4a2b",
        logger: "#3f6b4a",
        splitter: "#8a5a3c",
        butcher: "#9c4f4f",
        builder: "#c2903f",
        keeper: "#4f7a5c",
        nightman: "#5b4f9e",
        explorer: "#3f8fa0",
        runner: "#c98b5a",
        boat: "#4f7f6a",
      };

      // 谷のマンモス（人と同じ列にならべて、前後が分かるようにする）
      const beast = state.fire.beast;
      if (beast) {
        actors.push({
          y: beast.pos.y,
          render: () => drawBeast(ctx, beast, time),
        });
      }

      // 集落の住民（朝は広場へ、夜は住居へ帰る）
      for (const person0 of state.fire.residents) {
        actors.push({
          y: person0.pos.y,
          render: () => {
            person(
              ctx,
              person0.pos.x,
              person0.pos.y,
              person0.helper ? "#8a6a4a" : "#6f5f8a",
              "#f0cfae",
              person0.bob,
            );
            // 冬は毛皮を着る
            if (winterOn(state)) {
              ctx.fillStyle = "#5f4630";
              roundRect(ctx, person0.pos.x - 9, person0.pos.y - 16, 18, 8, 3);
              ctx.fill();
            }
          },
        });
      }

      // 狩り場の動物（人と一緒に前後で並べる）
      for (const animal of state.prey) {
        actors.push({
          y: animal.pos.y,
          render: () => drawPrey(ctx, animal.kind, animal.pos.x, animal.pos.y, time),
        });
      }

      // 森の木（切ると切り株になり、しばらくして生えなおす）
      for (const tree of state.trees) {
        actors.push({
          y: tree.pos.y,
          render: () =>
            drawTree(ctx, tree.kind, tree.pos.x, tree.pos.y, tree.stump, tree.chop, time),
        });
      }

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
              // 何を待っているかを、その品の絵で見せる
              const want = seatById.get(customer.seatId);
              held(ctx, want ? seatNeeds(want) : "main", bx, by, 1);
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
            // マンモスにはね飛ばされた人は、しばらく転がっている（死なない）
            const knocked = (worker.down ?? 0) > 0;
            if (knocked) {
              ctx.save();
              ctx.translate(worker.pos.x, worker.pos.y);
              ctx.rotate(0.9);
              ctx.translate(-worker.pos.x, -worker.pos.y);
            }
            if (worker.kind === "boat") {
              drawRiverBoat(
                ctx,
                worker.pos.x,
                worker.pos.y,
                worker.face ?? 1,
                worker.moving ?? false,
                time,
              );
            } else if (worker.kind === "robot") {
              // 火のはじまりの「犬ぞり」は犬が引く。大河の文明は牛の荷車
              if (isTaiga) {
                drawCart(
                  ctx,
                  worker.pos.x,
                  worker.pos.y,
                  worker.face ?? 1,
                  worker.moving ?? false,
                  time,
                );
              } else if (isFire) {
                drawSled(
                  ctx,
                  worker.pos.x,
                  worker.pos.y,
                  worker.face ?? 1,
                  worker.moving ?? false,
                  time,
                );
              } else {
                robot(ctx, worker.pos.x, worker.pos.y, time);
              }
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
                        : worker.kind === "hunter"
                          ? 80
                          : worker.kind === "logger"
                            ? 100
                            : worker.kind === "splitter"
                              ? 150
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
              const face = worker.face ?? 1;
              if (worker.kind === "cook") {
                if (wild) {
                  // 火の番: すすけた頭巾と、火かき棒。火をつつく手つき
                  ctx.fillStyle = "#7a4a2b";
                  roundRect(ctx, wx - 8, wy - 30, 16, 8, 4);
                  ctx.fill();
                  ctx.fillStyle = "#5c3620";
                  roundRect(ctx, wx - 9, wy - 24, 18, 3, 1.5);
                  ctx.fill();
                  const poke = Math.sin(time * 3) * 3;
                  ctx.strokeStyle = "#3d2b1a";
                  ctx.lineWidth = 2.4;
                  ctx.beginPath();
                  ctx.moveTo(wx + 8 * face, wy - 4);
                  ctx.lineTo(wx + (18 + poke) * face, wy - 18);
                  ctx.stroke();
                  // 棒先の赤い熱
                  ctx.fillStyle = `rgba(255,140,60,${0.6 + Math.abs(Math.sin(time * 5)) * 0.4})`;
                  ctx.beginPath();
                  ctx.arc(wx + (18 + poke) * face, wy - 18, 2.2, 0, Math.PI * 2);
                  ctx.fill();
                } else {
                  // コック帽
                  ctx.fillStyle = "#fbf7ef";
                  roundRect(ctx, wx - 7, wy - 32, 14, 9, 4);
                  ctx.fill();
                }
              }
              if (worker.kind === "logger") {
                // 木こり: 毛皮のベストと、両手でかまえた斧
                ctx.fillStyle = "#6b5030";
                roundRect(ctx, wx - 9, wy - 13, 18, 10, 3);
                ctx.fill();
                const swing = worker.charge > 0 ? Math.abs(Math.sin(time * 9)) : 0;
                ctx.save();
                ctx.translate(wx + 8 * face, wy - 8);
                ctx.rotate(face * (0.7 - swing * 1.6));
                ctx.strokeStyle = "#8a6a44";
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -19);
                ctx.stroke();
                ctx.fillStyle = "#b9bec4";
                ctx.beginPath();
                ctx.moveTo(-1, -19);
                ctx.lineTo(7, -23);
                ctx.lineTo(7, -14);
                ctx.lineTo(-1, -15);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
              }
              if (worker.kind === "splitter") {
                // 薪割り: 腕まくりの太い腕と、両手で振り下ろすくさび斧
                ctx.fillStyle = "#e0c49a";
                roundRect(ctx, wx - 12, wy - 11, 5, 9, 2.5);
                ctx.fill();
                roundRect(ctx, wx + 7, wy - 11, 5, 9, 2.5);
                ctx.fill();
                const chop = Math.abs(Math.sin(time * 5));
                ctx.save();
                ctx.translate(wx, wy - 14);
                ctx.rotate(-1.1 + chop * 1.5);
                ctx.strokeStyle = "#6b4a2b";
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -16);
                ctx.stroke();
                ctx.fillStyle = "#c8ced4";
                ctx.beginPath();
                ctx.moveTo(-4, -16);
                ctx.lineTo(4, -16);
                ctx.lineTo(2, -22);
                ctx.lineTo(-2, -22);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
              }
              if (worker.kind === "hunter") {
                // 狩人: 毛皮の肩あてと、手にした槍
                ctx.fillStyle = "#4f3a22";
                roundRect(ctx, wx - 10, wy - 16, 20, 6, 3);
                ctx.fill();
                ctx.strokeStyle = "#8a6a44";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(wx + 9 * face, wy + 4);
                ctx.lineTo(wx + 14 * face, wy - 26);
                ctx.stroke();
                ctx.fillStyle = "#d8d2c4";
                ctx.beginPath();
                ctx.moveTo(wx + 14 * face, wy - 26);
                ctx.lineTo(wx + 10 * face, wy - 20);
                ctx.lineTo(wx + 17 * face, wy - 21);
                ctx.closePath();
                ctx.fill();
              }
              if (worker.kind === "butcher") {
                // 解体係: 血よけの前かけと、石のナイフ。刻んでいると手が動く
                ctx.fillStyle = "#b8a184";
                roundRect(ctx, wx - 9, wy - 12, 18, 15, 3);
                ctx.fill();
                const cut = worker.charge > 0 ? Math.sin(time * 12) * 4 : 0;
                ctx.strokeStyle = "#c8c2b4";
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.moveTo(wx + 8 * face, wy - 6 + cut);
                ctx.lineTo(wx + 17 * face, wy - 14 + cut);
                ctx.stroke();
                if (worker.charge > 0) {
                  ctx.font = SMALL;
                  ctx.fillStyle = "rgba(255,209,102,0.8)";
                  ctx.fillText("ざくっ", wx, wy - 36);
                  ctx.font = FONT;
                }
              }
              if (worker.kind === "builder") {
                // 建築係: 肩に担いだ丸太と、腰の縄
                ctx.fillStyle = "#6b4a2b";
                ctx.save();
                ctx.translate(wx, wy - 22);
                ctx.rotate(-0.25 * face);
                roundRect(ctx, -13, -3, 26, 6, 3);
                ctx.fill();
                ctx.restore();
                ctx.strokeStyle = "#b79a63";
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(wx, wy - 4, 8, 0.2, Math.PI - 0.2);
                ctx.stroke();
              }
              if (worker.kind === "keeper") {
                // 食料番: 大きなかごを胸に抱える
                ctx.fillStyle = "#8a6a44";
                roundRect(ctx, wx - 10, wy - 10, 20, 13, 4);
                ctx.fill();
                ctx.strokeStyle = "rgba(60,44,26,0.6)";
                ctx.lineWidth = 1;
                for (const ox of [-5, 0, 5]) {
                  ctx.beginPath();
                  ctx.moveTo(wx + ox, wy - 9);
                  ctx.lineTo(wx + ox, wy + 2);
                  ctx.stroke();
                }
                chainItem(ctx, "smoked", wx, wy - 14, 0.55, time);
              }
              if (worker.kind === "nightman") {
                // 夜番: 手にした松明。夜のあいだ足もとを照らす
                ctx.strokeStyle = "#6b4a2b";
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(wx + 10 * face, wy);
                ctx.lineTo(wx + 14 * face, wy - 22);
                ctx.stroke();
                const flame = 0.6 + Math.abs(Math.sin(time * 7)) * 0.4;
                ctx.fillStyle = `rgba(255,150,60,${flame})`;
                ctx.beginPath();
                ctx.moveTo(wx + 14 * face, wy - 22);
                ctx.quadraticCurveTo(wx + 19 * face, wy - 30, wx + 14 * face, wy - 38);
                ctx.quadraticCurveTo(wx + 9 * face, wy - 30, wx + 14 * face, wy - 22);
                ctx.fill();
                const halo = ctx.createRadialGradient(
                  wx + 14 * face, wy - 30, 2, wx + 14 * face, wy - 30, 54,
                );
                halo.addColorStop(0, "rgba(255,200,120,0.2)");
                halo.addColorStop(1, "rgba(255,200,120,0)");
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(wx + 14 * face, wy - 30, 54, 0, Math.PI * 2);
                ctx.fill();
              }
              if (worker.kind === "explorer") {
                // 探索者・追跡者: つばの広い日よけと、遠くを指す手
                ctx.fillStyle = "#3f5a5f";
                roundRect(ctx, wx - 11, wy - 26, 22, 4, 2);
                ctx.fill();
                roundRect(ctx, wx - 7, wy - 32, 14, 7, 3);
                ctx.fill();
                ctx.strokeStyle = "#e0d6bd";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wx + 6 * face, wy - 10);
                ctx.lineTo(wx + 17 * face, wy - 16);
                ctx.stroke();
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
                if (wild) {
                  // はこび手: 背負子（せおいこ）と、肩にかけた帯
                  ctx.fillStyle = "#6b4a2b";
                  roundRect(ctx, wx - 13 * face, wy - 20, 9, 18, 3);
                  ctx.fill();
                  ctx.strokeStyle = "#a08858";
                  ctx.lineWidth = 1.6;
                  for (const sy of [-16, -10, -5]) {
                    ctx.beginPath();
                    ctx.moveTo(wx - 13 * face, wy + sy);
                    ctx.lineTo(wx - 4 * face, wy + sy);
                    ctx.stroke();
                  }
                  ctx.strokeStyle = "#c8a97a";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(wx - 5 * face, wy - 18);
                  ctx.quadraticCurveTo(wx + 3 * face, wy - 14, wx + 5 * face, wy - 4);
                  ctx.stroke();
                } else {
                  // 前掛けとお盆
                  ctx.fillStyle = "rgba(255,255,255,0.75)";
                  roundRect(ctx, wx - 6, wy - 6, 12, 10, 2);
                  ctx.fill();
                  if (carryTotal(worker) === 0) {
                    ctx.fillStyle = "#c9b79a";
                    ctx.beginPath();
                    ctx.ellipse(wx + 11, wy - 12, 6, 2.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                  }
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
                if (wild) {
                  // 拾い手: 腰に下げた貝がら入れ（編みかご）と、拾う前かがみの手
                  ctx.fillStyle = "#a98a52";
                  roundRect(ctx, wx + 6, wy - 8, 12, 11, 3);
                  ctx.fill();
                  ctx.strokeStyle = "#7a6136";
                  ctx.lineWidth = 1;
                  for (const gy of [-5, -1, 3]) {
                    ctx.beginPath();
                    ctx.moveTo(wx + 6, wy + gy);
                    ctx.lineTo(wx + 18, wy + gy);
                    ctx.stroke();
                  }
                  // かごから顔を出す貝がら
                  ctx.fillStyle = "#f4e3c2";
                  ctx.beginPath();
                  ctx.arc(wx + 10, wy - 9, 2.4, Math.PI, Math.PI * 2);
                  ctx.arc(wx + 15, wy - 9, 2, Math.PI, Math.PI * 2);
                  ctx.fill();
                } else {
                  // 集金かばん
                  ctx.fillStyle = "#2f3b4d";
                  roundRect(ctx, wx + 7, wy - 10, 9, 8, 2);
                  ctx.fill();
                  ctx.fillStyle = "#ffd166";
                  ctx.beginPath();
                  ctx.arc(wx + 11.5, wy - 6, 2, 0, Math.PI * 2);
                  ctx.fill();
                }
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
            // 荷物は品種ごとに分けて見せる（異種を1本に混ぜない）
            drawLoad(
              ctx,
              worker.bag,
              worker.pos.x,
              (worker.kind === "robot" && wild) || worker.kind === "boat"
                ? worker.pos.y - 22
                : worker.pos.y - 30,
              (worker.kind === "robot" && wild) || worker.kind === "boat"
                ? (worker.face ?? 1) * -14
                : 0,
              time,
            );
            if (knocked) {
              ctx.restore();
              ctx.font = SMALL;
              ctx.fillStyle = "rgba(255,209,102,0.9)";
              ctx.fillText("＠＿＠", worker.pos.x, worker.pos.y - 34);
              ctx.font = FONT;
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
          // 上位スキンの動く飾り。マントは体より先に、オーラはさらに奥に描く
          if (skin.aura && skin.aura !== "none") {
            drawAura(ctx, skin.aura, player.pos.x, player.pos.y, time);
          }
          if (skin.cape) drawCape(ctx, skin.cape, player.pos.x, player.pos.y, time);
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
          // 持っているものを、種類ごとに列を分けて見せる（異種を混ぜない）
          drawLoad(ctx, player.bag, player.pos.x, player.pos.y - 34, 0, time);
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

      /* --- 昼と夜・吹雪 --- */
      const viewH0 = canvas.height / scale;
      if (isFire && fireLive(state)) {
        const fire = state.fire;
        const dark = Math.max(0, darkness(fire));
        if (dark > 0.02) {
          // 夜は青くしずむ。共同たき火と住居のまわりだけ明るい
          ctx.fillStyle = `rgba(18,26,54,${dark * 0.66})`;
          ctx.fillRect(camX, camY, view, viewH0);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const stove of openStoves(state)) {
            const lit =
              stove.art === "hearth" || stove.art === "fire" || stove.art === "grill" ||
              stove.art === "lamp" || stove.art === "feast";
            if (!lit || (isBuild(stove) && !isDone(state, stove.id))) continue;
            const glow = ctx.createRadialGradient(
              stove.pos.x, stove.pos.y - 10, 4, stove.pos.x, stove.pos.y - 10, 130,
            );
            glow.addColorStop(0, `rgba(255,190,110,${0.34 * dark})`);
            glow.addColorStop(1, "rgba(255,190,110,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(stove.pos.x, stove.pos.y - 10, 130, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        // 吹雪。視界がせまくなり、外の仕事が止まる
        if (fire.weather === "blizzard") {
          ctx.fillStyle = "rgba(206,222,238,0.2)";
          ctx.fillRect(camX, camY, view, viewH0);
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          for (let i = 0; i < 90; i += 1) {
            const sx = camX + ((i * 137 + time * 260) % view);
            const sy = camY + ((i * 79 + time * 150) % viewH0);
            ctx.fillRect(sx, sy, 2.4, 2.4);
          }
        } else if (winterOn(state)) {
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          for (let i = 0; i < 30; i += 1) {
            const sx = camX + ((i * 211 + time * 40) % view);
            const sy = camY + ((i * 157 + time * 60) % viewH0);
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
      }

      /* --- 温泉街: 夕暮れと夜、小雪、湯あかり大祭 --- */
      if (isOnsen && onsenLive(state)) {
        const onsen = state.onsen;
        const dark = Math.max(0, onsenDark(onsen));
        const matsuri = festivalOn(state);
        if (dark > 0.02) {
          // 夜は藍にしずむ。灯りのまわりだけ暖かい
          ctx.fillStyle = `rgba(16,22,46,${dark})`;
          ctx.fillRect(camX, camY, view, viewH0);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          // 提灯・灯籠・店の灯り。大祭の夜は、町ぜんぶがともる
          const lamps: { x: number; y: number; r: number; warm: number }[] = [];
          for (const area of openAreas(state)) {
            const { rect, palette } = area;
            if (area.building) {
              // 店のなかの灯り
              lamps.push({
                x: (rect.x0 + rect.x1) / 2,
                y: (rect.y0 + rect.y1) / 2,
                r: Math.max(rect.x1 - rect.x0, rect.y1 - rect.y0) * 0.75,
                warm: 0.3,
              });
            } else {
              // 通りの提灯。夜見世と大祭はとくに明るい
              const bright =
                palette.prop === "night" || matsuri ? 0.42 : palette.prop === "lantern" ? 0.34 : 0.2;
              const n = Math.max(2, Math.round((rect.x1 - rect.x0) / 150));
              for (let i = 0; i <= n; i += 1) {
                lamps.push({
                  x: rect.x0 + ((rect.x1 - rect.x0) * i) / n,
                  y: rect.y0 + 18,
                  r: 130,
                  warm: bright,
                });
              }
            }
          }
          for (const lamp of lamps) {
            const glow = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, lamp.r);
            const power = lamp.warm * dark * (matsuri ? 1.5 : 1);
            glow.addColorStop(0, `rgba(255,190,120,${power})`);
            glow.addColorStop(1, "rgba(255,190,120,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        // 小雪。屋根と道に積もり、湯気が濃くなる
        if (onsen.weather === "snow") {
          ctx.fillStyle = "rgba(206,222,238,0.10)";
          ctx.fillRect(camX, camY, view, viewH0);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          for (let i = 0; i < 60; i += 1) {
            const sx = camX + ((i * 197 + time * 26) % view);
            const sy = camY + ((i * 131 + time * 46) % viewH0);
            ctx.beginPath();
            ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          // 棟の北側に積もった雪
          for (const room of roomRects(state)) {
            ctx.fillStyle = "rgba(236,244,252,0.5)";
            ctx.fillRect(room.rect.x0, room.rect.y0 + 2, room.rect.x1 - room.rect.x0, 7);
          }
        } else if (onsen.weather === "cloud") {
          ctx.fillStyle = "rgba(120,130,140,0.10)";
          ctx.fillRect(camX, camY, view, viewH0);
        }
        // 大祭の夜は、灯籠が流れる
        if (matsuri) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < 26; i += 1) {
            const lx = camX + ((i * 173 + time * 18) % view);
            const ly = camY + ((i * 109 + time * 9) % viewH0);
            const flick = 0.5 + Math.sin(time * 3 + i) * 0.2;
            ctx.fillStyle = `rgba(255,170,90,${0.5 * flick})`;
            ctx.beginPath();
            ctx.arc(lx, ly, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      /* --- 大河の文明: 季節の色あいと、増水 --- */
      if (isTaiga && taigaLive(state)) {
        const now = season(state);
        // 季節ごとに、光の色をうっすら変える（言葉より先に、色で分かるように）
        const tint: Record<string, string> = {
          spring: "rgba(150,220,140,0.07)",
          summer: "rgba(255,190,90,0.09)",
          rain: "rgba(90,140,190,0.13)",
          harvest: "rgba(255,200,110,0.10)",
          dry: "rgba(210,170,110,0.10)",
        };
        ctx.fillStyle = tint[now] ?? "rgba(0,0,0,0)";
        ctx.fillRect(camX, camY, view, viewH0);
        if (now === "rain") {
          // 雨。斜めの筋を降らせる
          ctx.strokeStyle = "rgba(180,215,240,0.35)";
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 60; i += 1) {
            const sx = camX + ((i * 137 + time * 220) % view);
            const sy = camY + ((i * 79 + time * 620) % viewH0);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - 3, sy + 11);
            ctx.stroke();
          }
        }
        if (flooding(state)) {
          // 川があふれて、低いところが水につかる
          const line = camY + viewH0 * 0.18;
          ctx.fillStyle = "rgba(60,130,155,0.32)";
          ctx.fillRect(camX, camY, view, line - camY + 120);
          ctx.strokeStyle = "rgba(220,245,255,0.35)";
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 4; i += 1) {
            const wy = line + 26 + i * 26 + Math.sin(time * 1.6 + i) * 3;
            ctx.beginPath();
            for (let sx = camX; sx <= camX + view; sx += 12) {
              const yy = wy + Math.sin((sx + time * 60) * 0.05 + i) * 2.4;
              if (sx === camX) ctx.moveTo(sx, yy);
              else ctx.lineTo(sx, yy);
            }
            ctx.stroke();
          }
        }
      }

      /* --- 大河の文明: 季節と、町の育ちぐあい --- */
      if (isTaiga && taigaLive(state)) {
        const now = season(state);
        const left = Math.max(0, Math.ceil(seasonLeft(state)));
        const pop = townPop(state);
        const town = state.unlocked.includes("area-5");
        const rows: { text: string; ok: boolean }[] = [
          { text: `畑 ${fieldCount(state)}面${town ? " / 5" : ""}`, ok: fieldCount(state) >= (town ? 5 : 1) },
          { text: `町の人 ${pop} / ${TOWN_POP}`, ok: pop >= TOWN_POP },
          // 町づくりに入ったら、完成に要る建物をならべて出す
          ...(town
            ? TOWN_BUILDS.map((item) => ({
                text: `${item.label}${state.built.includes(item.id) ? " ✓" : ""}`,
                ok: state.built.includes(item.id),
              }))
            : []),
          ...(flooding(state)
            ? [{ text: "増水中", ok: hasEquip(state, "levee") }]
            : fertile(state)
              ? [{ text: "泥が肥えている", ok: true }]
              : []),
        ];
        const title = `${seasonMark[now]} ${seasonName[now]} ― あと${left}秒`;
        ctx.font = SMALL;
        const width =
          Math.max(
            ctx.measureText(title).width,
            ...rows.map((row) => ctx.measureText(row.text).width),
          ) + 20;
        const height = 20 + rows.length * 13;
        const px = camX + view - width - 8;
        const py = camY + 8;
        ctx.fillStyle = "rgba(10,8,6,0.62)";
        roundRect(ctx, px, py, width, height, 8);
        ctx.fill();
        ctx.strokeStyle = flooding(state)
          ? "rgba(120,190,235,0.7)"
          : "rgba(255,209,102,0.35)";
        ctx.lineWidth = 1;
        roundRect(ctx, px, py, width, height, 8);
        ctx.stroke();
        // 季節の残りは、わくの下ぶちの帯で出す
        ctx.fillStyle = "rgba(255,209,102,0.5)";
        ctx.fillRect(px + 2, py + height - 3, (width - 4) * (1 - left / SEASON_TIME), 2);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(title, px + width / 2, py + 10);
        rows.forEach((row, i) => {
          ctx.fillStyle = row.ok ? "rgba(226,240,226,0.85)" : "#ff9f8a";
          ctx.fillText(row.text, px + width / 2, py + 24 + i * 13);
        });
        ctx.font = FONT;
      }

      /* --- 大河の文明の終わり: 使者とともに、大型交易船が上流へ --- */
      if (isTaiga && state.taiga.sailed) {
        const t = (time * 0.06) % 1;
        const bx = camX + view * (0.15 + t * 0.7);
        const by = camY + viewH0 * 0.16;
        ctx.save();
        ctx.globalAlpha = 0.95;
        // 船体
        ctx.fillStyle = "#6b4a2b";
        ctx.beginPath();
        ctx.moveTo(bx - 34, by);
        ctx.quadraticCurveTo(bx, by + 14, bx + 34, by);
        ctx.lineTo(bx + 26, by - 7);
        ctx.lineTo(bx - 26, by - 7);
        ctx.closePath();
        ctx.fill();
        // 帆
        ctx.fillStyle = "#e8ddc8";
        ctx.beginPath();
        ctx.moveTo(bx, by - 8);
        ctx.lineTo(bx, by - 44);
        ctx.lineTo(bx + 24, by - 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#4f3d26";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by - 8);
        ctx.lineTo(bx, by - 46);
        ctx.stroke();
        // 引き波
        ctx.strokeStyle = "rgba(220,245,255,0.5)";
        ctx.lineWidth = 1.4;
        for (const oy of [2, 6]) {
          ctx.beginPath();
          ctx.moveTo(bx - 40, by + oy);
          ctx.lineTo(bx - 66, by + oy);
          ctx.stroke();
        }
        ctx.restore();
        // 締めのことば
        ctx.font = `800 15px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`;
        const words = "大河の文明 ― 使者とともに、次の都市へ";
        const w = ctx.measureText(words).width + 34;
        const wx = camX + view / 2 - w / 2;
        const wy = camY + viewH0 * 0.3;
        ctx.fillStyle = "rgba(10,8,6,0.72)";
        roundRect(ctx, wx, wy, w, 30, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,209,102,0.6)";
        ctx.lineWidth = 1.2;
        roundRect(ctx, wx, wy, w, 30, 10);
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.fillText(words, camX + view / 2, wy + 15);
        ctx.font = FONT;
      }

      /* --- 温泉街: 建てたばかりの区画の工事と、町のミニ地図 --- */
      if (isOnsen) {
        // 工事中（買ってから2.5秒。地ならし → 石を敷く → 街灯がつく）
        const marks = builtAt.current;
        // 開いたばかりの町を読みこんだときは、ぜんぶ工事中にしない。
        // 最初の1回は「もう建っている」ことにして、そのあと買ったものだけ工事する
        const primed = marks.has("__primed");
        if (!primed) marks.set("__primed", time);
        for (const area of openAreas(state)) {
          if (!marks.has(area.id)) marks.set(area.id, primed ? time : time - 999);
          const age = time - (marks.get(area.id) ?? time);
          if (age > 2.5 || age < 0) continue;
          const { rect } = area;
          const t = age / 2.5;
          const w = rect.x1 - rect.x0;
          const h = rect.y1 - rect.y0;
          // 敷き終わったところから、下地が消えていく
          ctx.save();
          ctx.beginPath();
          ctx.rect(rect.x0, rect.y0 + h * t, w, h * (1 - t));
          ctx.clip();
          ctx.fillStyle = "rgba(60,50,38,0.85)";
          ctx.fillRect(rect.x0, rect.y0, w, h);
          ctx.fillStyle = "rgba(255,209,102,0.16)";
          for (let x = rect.x0 - h; x < rect.x1; x += 34) {
            ctx.beginPath();
            ctx.moveTo(x, rect.y1);
            ctx.lineTo(x + 17, rect.y1);
            ctx.lineTo(x + 17 + h, rect.y0);
            ctx.lineTo(x + h, rect.y0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          // 工事の帯
          const bw = Math.min(w - 20, 160);
          const bx = (rect.x0 + rect.x1) / 2 - bw / 2;
          const by = (rect.y0 + rect.y1) / 2;
          ctx.fillStyle = "rgba(16,20,28,0.7)";
          roundRect(ctx, bx, by - 16, bw, 22, 7);
          ctx.fill();
          ctx.fillStyle = "#ffd166";
          roundRect(ctx, bx + 4, by + 1, (bw - 8) * t, 4, 2);
          ctx.fill();
          ctx.font = SMALL;
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffe9b8";
          ctx.fillText(
            t < 0.35 ? "地ならし" : t < 0.7 ? "石を敷いている" : "街灯をつけている",
            bx + bw / 2,
            by - 7,
          );
          ctx.font = FONT;
        }

        // ミニ地図（食べ歩き通りをひらいてから。仕様書 §18.2）
        if (state.unlocked.includes("area-10")) {
          const mw = 132;
          const mh = 86;
          const mx = camX + 10;
          const my = camY + viewH0 - mh - 10;
          const span = Math.max(box.x1 - box.x0, 1);
          const spanY = Math.max(box.y1 - box.y0, 1);
          const k = Math.min(mw / span, mh / spanY);
          const ox = mx + (mw - span * k) / 2;
          const oy = my + (mh - spanY * k) / 2;
          const at = (x: number, y: number) => ({
            x: ox + (x - box.x0) * k,
            y: oy + (y - box.y0) * k,
          });
          ctx.fillStyle = "rgba(12,16,22,0.74)";
          roundRect(ctx, mx, my, mw, mh, 8);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.16)";
          ctx.lineWidth = 1;
          roundRect(ctx, mx, my, mw, mh, 8);
          ctx.stroke();
          for (const area of openAreas(state)) {
            const a = at(area.rect.x0, area.rect.y0);
            const b = at(area.rect.x1, area.rect.y1);
            ctx.fillStyle = area.building
              ? "rgba(214,180,130,0.75)"
              : "rgba(120,196,190,0.55)";
            ctx.fillRect(a.x, a.y, Math.max(1.5, b.x - a.x), Math.max(1.5, b.y - a.y));
          }
          // 次に建てられるところ
          for (const pad of availablePads(state)) {
            if (!pad.id.startsWith("area-")) continue;
            const at2 = at(padPosOf(state, pad).x, padPosOf(state, pad).y);
            ctx.fillStyle = `rgba(126,231,168,${0.5 + Math.abs(Math.sin(time * 3)) * 0.5})`;
            ctx.beginPath();
            ctx.arc(at2.x, at2.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          // お客さんと自分
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          for (const customer of state.customers) {
            const c = at(customer.pos.x, customer.pos.y);
            ctx.fillRect(c.x - 0.6, c.y - 0.6, 1.4, 1.4);
          }
          const me = at(state.player.pos.x, state.player.pos.y);
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(me.x, me.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* --- 町の様子（日にち・時間帯・天気・湯量・評判） --- */
      if (isOnsen && onsenLive(state)) {
        const onsen = state.onsen;
        const use = springUse(state, openSeats(state));
        const cap = springCap(state);
        const fame = reputation(onsen);
        const left = Math.max(0, Math.ceil(onsenPhaseLeft(onsen)));
        const rows: { text: string; ok: boolean }[] = [
          {
            text: `湯量 ${use} / ${cap}・${springLabel(Math.min(1, cap / Math.max(1, use)))}`,
            ok: use <= cap,
          },
          { text: `評判 ${Math.round(fame * 100)}%`, ok: fame >= 0.8 },
        ];
        const title = festivalOn(state)
          ? `湯あかり大祭 ― あと${left}秒`
          : `${onsen.day}日目 ${onsenPhaseLabel(onsen.phase)}・${weatherLabel(onsen.weather)} ― あと${left}秒`;
        ctx.font = SMALL;
        const width =
          Math.max(
            ctx.measureText(title).width,
            ...rows.map((row) => ctx.measureText(row.text).width),
          ) + 20;
        const bx = camX + view - width - 10;
        const by = camY + 10;
        const height = 20 + rows.length * 13;
        ctx.fillStyle = "rgba(16,20,28,0.72)";
        roundRect(ctx, bx, by, width, height, 8);
        ctx.fill();
        ctx.strokeStyle = festivalOn(state)
          ? "rgba(255,190,110,0.7)"
          : "rgba(255,255,255,0.16)";
        ctx.lineWidth = 1;
        roundRect(ctx, bx, by, width, height, 8);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = festivalOn(state) ? "#ffd166" : "#e8dcc8";
        ctx.fillText(title, bx + width / 2, by + 11);
        for (const [i, row] of rows.entries()) {
          ctx.fillStyle = row.ok ? "#9fd7a8" : "#f0a06a";
          ctx.fillText(row.text, bx + width / 2, by + 24 + i * 13);
        }
        ctx.font = FONT;
      }

      /* --- 集落の様子（日にち・時間帯・備蓄・気温・人口） --- */
      if (isFire && fireLive(state)) {
        const fire = state.fire;
        const need = nightNeed(state);
        const food = stockIn(state, "smoked");
        const wood = stockIn(state, "wood");
        const cap = popCap(state);
        const left = Math.max(0, Math.ceil(phaseLeft(fire)));
        const rows: { text: string; ok: boolean }[] = [
          { text: `保存肉 ${food} / ${need}`, ok: food >= need },
          ...(winterOn(state) ? [{ text: `薪 ${wood}`, ok: wood > 0 }] : []),
          { text: `住民 ${fire.pop} / ${cap}`, ok: fire.pop < cap || cap === 0 },
          ...(winterOn(state)
            ? [{ text: `${fire.temp}度・${tempLabel(fire.temp)}`, ok: fire.temp >= 0 }]
            : []),
        ];
        const title = `${fire.day}日目 ${phaseLabel(fire.phase)} ― あと${left}秒`;
        ctx.font = SMALL;
        const width =
          Math.max(
            ctx.measureText(title).width,
            ...rows.map((row) => ctx.measureText(row.text).width),
          ) + 20;
        const height = 20 + rows.length * 13;
        const px = camX + view - width - 8;
        const py = camY + 8;
        ctx.fillStyle = "rgba(10,8,6,0.62)";
        roundRect(ctx, px, py, width, height, 8);
        ctx.fill();
        ctx.strokeStyle =
          fire.phase === "night"
            ? "rgba(140,170,255,0.5)"
            : fire.phase === "dusk"
              ? "rgba(255,160,90,0.6)"
              : "rgba(255,209,102,0.35)";
        ctx.lineWidth = 1;
        roundRect(ctx, px, py, width, height, 8);
        ctx.stroke();
        ctx.fillStyle = "#ffd166";
        ctx.fillText(title, px + width / 2, py + 10);
        rows.forEach((row, i) => {
          ctx.fillStyle = row.ok ? "rgba(226,240,226,0.85)" : "#ff9f8a";
          ctx.fillText(row.text, px + width / 2, py + 24 + i * 13);
        });
        ctx.font = FONT;

        // 夜になった直後の数秒だけ、前の夜の結果を出す（夜の30秒ぶんずっと出しっぱなしにはしない）
        const report = fire.report;
        if (report && reportVisible(fire)) {
          const lines = report.ok
            ? [`保存肉 ${report.got} / ${report.need}`, "みんな腹いっぱいで眠った"]
            : report.cold
              ? [`寒さで眠れなかった`, "薪と毛皮を増やそう"]
              : [
                  `保存肉が ${report.need - report.got}こ 足りなかった`,
                  "明日は燻製を増やそう",
                ];
          // 出はじめとおわりぎわだけ、すっと現れて・消える
          const t = (fire.clock - (DAY_TIME + DUSK_TIME)) / REPORT_SHOW;
          const alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 4);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = FONT;
          const w = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 34;
          const bx = camX + view / 2 - w / 2;
          const by = camY + viewH0 * 0.3;
          ctx.fillStyle = "rgba(10,8,6,0.78)";
          roundRect(ctx, bx, by, w, 26 + lines.length * 16, 12);
          ctx.fill();
          ctx.strokeStyle = report.ok ? "rgba(126,231,168,0.7)" : "rgba(255,159,138,0.7)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, bx, by, w, 26 + lines.length * 16, 12);
          ctx.stroke();
          ctx.fillStyle = report.ok ? "#7ee7a8" : "#ff9f8a";
          ctx.fillText(report.ok ? "夜を越した" : "つらい夜だった", bx + w / 2, by + 16);
          ctx.fillStyle = "#e8ddcd";
          lines.forEach((line, i) => {
            ctx.fillText(line, bx + w / 2, by + 34 + i * 16);
          });
          ctx.restore();
        }
      }

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

        /*
         * 目的地が画面の外にあるときは、画面のへりに向きを出す（§7.2）。
         * 広い区画では、次に行く先がどちらか分からなくならないように
         */
        const viewH = canvas.height / scale;
        const pad = 26;
        const outside =
          to.x < camX + pad ||
          to.x > camX + view - pad ||
          to.y < camY + pad ||
          to.y > camY + viewH - pad;
        if (outside) {
          const cx = camX + view / 2;
          const cy = camY + viewH / 2;
          const angle = Math.atan2(to.y - cy, to.x - cx);
          // 画面の内側のふちに、矢印を貼りつける
          const hx = view / 2 - pad;
          const hy = viewH / 2 - pad;
          const scaleT = Math.min(
            Math.abs(hx / Math.cos(angle)),
            Math.abs(hy / Math.sin(angle)),
          );
          const ax = cx + Math.cos(angle) * scaleT;
          const ay = cy + Math.sin(angle) * scaleT;
          const beat = 0.6 + Math.abs(Math.sin(time * 4)) * 0.4;
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(angle);
          ctx.fillStyle = `rgba(255,209,102,${beat})`;
          ctx.beginPath();
          ctx.moveTo(13, 0);
          ctx.lineTo(-8, -9);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-8, 9);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(10,8,6,0.7)";
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.restore();
          // どれくらい遠いか
          const away = Math.round(Math.hypot(to.x - from.x, to.y - from.y));
          ctx.font = SMALL;
          ctx.fillStyle = "rgba(10,8,6,0.75)";
          const tag = `${away}`;
          const tw = ctx.measureText(tag).width + 8;
          roundRect(ctx, ax - tw / 2, ay + 12, tw, 11, 5);
          ctx.fill();
          ctx.fillStyle = "#ffd166";
          ctx.fillText(tag, ax, ay + 18);
          ctx.font = FONT;
        }
      }

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const width = ctx.measureText(objective.label).width + 26;
      const bannerY = camY + canvas.height / scale - 46;
      roundRect(ctx, camX + view / 2 - width / 2, bannerY, width, 24, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,209,102,0.45)";
      ctx.lineWidth = 1;
      roundRect(ctx, camX + view / 2 - width / 2, bannerY, width, 24, 12);
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.fillText(objective.label, camX + view / 2, bannerY + 13);
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
          camX + view - width / 2 - 6,
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
    loadBgmMuted();
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
      const fit = rect.width / viewWidth();
      scale = fit * dpr;
      ox = 0;
      oy = 0;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const toWorld = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const fit = rect.width / viewWidth();
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

      if (!pausedRef.current && !document.hidden) {
        update(state, move, dt);
        // 実際に進めたときだけ「見ていた最後の瞬間」を進める。
        // タブを裏に置いているあいだは進めない＝そこで時計が止まり、
        // 戻ってきたときに正しく「そのぶん放置していた」と分かる
        state.lastSeen = Date.now();
      }

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
      updateBgm(currentScene(state), dt);
      draw(ctx, state, scale, ox, oy, now / 1000);

      if (now - sampleAt > 110) {
        sampleAt = now;
        // 種類ごとに上限があるので、足もとの数字は
        // アイコンに出している種類のぶんだけを見せる（合計だと上限を超えて見える）
        const shown = topKind(state.player);
        sampleRef.current({
          money: state.money,
          carry: shown ? carryOf(state.player, shown) : 0,
          maxCarry: maxCarry(state),
          item: shown,
          served: state.served,
          staff: state.staff.length,
          levels: { ...state.levels },
          toast:
            state.toast && Date.now() - state.toast.at < 2200
              ? state.toast.text
              : null,
          muted: isMuted(),
          bgmMuted: isBgmMuted(),
          offline: pendingOffline,
          town: onsenLive(state)
            ? {
                phase: onsenPhaseLabel(state.onsen.phase),
                weather: weatherLabel(state.onsen.weather),
                left: Math.max(0, Math.round(onsenPhaseLeft(state.onsen))),
                springUse: springUse(state, openSeats(state)),
                springCap: springCap(state),
                fame: reputation(state.onsen),
                festival: festivalOn(state),
                cleared: state.onsen.cleared,
              }
            : null,
          crew: jobsOpen(state)
            ? {
                open: true,
                hands: handCount(state),
                left: handsLeft(state),
                pop: townPop(state),
                jobs: { ...state.taiga.jobs },
              }
            : null,
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
      // 画面を離れるので、BGMはすっと静かにする（層じたいは残す。戻ればまたすぐ鳴る）
      suspendBgm();
    };
  }, [draw]);

  return (
    <div className="stage" ref={wrapRef}>
      <canvas ref={canvasRef} className="shop" />
    </div>
  );
}
