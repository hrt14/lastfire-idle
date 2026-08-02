"use client";

import { useMemo } from "react";
import {
  buildings,
  buildingById,
  resources as resourceMeta,
  type BuildingId,
  type ResourceId,
} from "@/data/buildings";
import type { Levels } from "@/lib/game";

export const TILE_W = 96;
export const TILE_H = 48;
const OX = 200;
const OY = 268;
const VIEW_W = 400;
const VIEW_H = 500;
/** 建物の絵は 1マス=72 で描き、タイルの大きさに合わせて拡大する */
const ART_HW = 36;
const ART_HH = 18;
const ART_SCALE = TILE_W / 72;
const HALF_W = TILE_W * 2;
const HALF_H = TILE_H * 2;

export const iso = (c: number, r: number) => ({
  x: OX + (c - r) * (TILE_W / 2),
  y: OY + (c + r) * (TILE_H / 2),
});

export type Token = {
  id: number;
  buildingId: BuildingId;
  resource: ResourceId;
  amount: number;
};

export type Spark = {
  id: number;
  text: string;
  x: number;
  y: number;
};

type Props = {
  levels: Levels;
  campLevel: number;
  population: number;
  heat: number;
  fireScale: number;
  blizzard: boolean;
  freezing: boolean;
  unlocked: (id: BuildingId) => boolean;
  affordable: (id: BuildingId) => boolean;
  selected: BuildingId | null;
  onSelect: (id: BuildingId) => void;
  onStoke: () => void;
  tokens: Token[];
  onCollect: (token: Token) => void;
  sparks: Spark[];
};

/* ---------- 描画パーツ ---------- */

const WALL_L = "#2f4260";
const WALL_R = "#3f5679";
const SNOW_T = "#e4eefb";
const SNOW_S = "#b9cee6";
const WOOD_L = "#4b3121";
const WOOD_R = "#61402b";
const WARM = "#ffc45a";

type BoxProps = {
  s: number;
  h: number;
  left?: string;
  right?: string;
  top?: string;
};

const Box = ({
  s,
  h,
  left = WALL_L,
  right = WALL_R,
  top = "#4a6288",
}: BoxProps) => {
  const hw = ART_HW * s;
  const hh = ART_HH * s;
  return (
    <>
      <polygon
        points={`${-hw},${-h} 0,${-hh - h} ${hw},${-h} 0,${hh - h}`}
        fill={top}
      />
      <polygon
        points={`${-hw},${-h} 0,${hh - h} 0,${hh} ${-hw},0`}
        fill={left}
      />
      <polygon points={`0,${hh - h} ${hw},${-h} ${hw},0 0,${hh}`} fill={right} />
    </>
  );
};

const Roof = ({ s, h, rh }: { s: number; h: number; rh: number }) => {
  const hw = ART_HW * s * 1.12;
  const hh = ART_HH * s * 1.12;
  const apex = `0,${-h - rh}`;
  return (
    <>
      <polygon points={`${-hw},${-h} 0,${-hh - h} ${apex}`} fill={SNOW_S} />
      <polygon points={`0,${-hh - h} ${hw},${-h} ${apex}`} fill={SNOW_S} />
      <polygon points={`${-hw},${-h} 0,${hh - h} ${apex}`} fill={SNOW_T} />
      <polygon points={`0,${hh - h} ${hw},${-h} ${apex}`} fill="#cfe0f2" />
    </>
  );
};

const Window = ({ x, y, lit }: { x: number; y: number; lit: boolean }) => (
  <polygon
    points={`${x},${y} ${x + 5},${y + 2.5} ${x + 5},${y + 9} ${x},${y + 6.5}`}
    fill={lit ? WARM : "#22334d"}
    opacity={lit ? 0.95 : 0.8}
  />
);

const Smoke = ({ x, y, seed }: { x: number; y: number; seed: number }) => (
  <g className="smoke" style={{ animationDelay: `${seed * -1.3}s` }}>
    <circle cx={x} cy={y} r="3.4" fill="#dfe9f7" opacity="0.5" />
  </g>
);

/** 建物の見た目。level に応じて大きさと小物が増える。 */
const BuildingArt = ({ id, level }: { id: BuildingId; level: number }) => {
  const building = buildingById.get(id);
  if (!building || level <= 0) return null;
  const grow = Math.min(1, level / 30);

  switch (building.art) {
    case "lodge": {
      const h = 15 + grow * 12;
      const logs = 1 + Math.min(3, Math.floor(level / 4));
      return (
        <g>
          <Box s={0.6} h={h} left={WOOD_L} right={WOOD_R} top="#6b4630" />
          <Roof s={0.6} h={h} rh={13 + grow * 6} />
          <Window x={4} y={-h + 4} lit />
          {Array.from({ length: logs }, (_, i) => (
            <ellipse
              key={i}
              cx={-20 + i * 2}
              cy={10 - i * 3.2}
              rx="9"
              ry="3.4"
              fill="#6b4630"
              stroke="#3a2419"
              strokeWidth="0.8"
            />
          ))}
        </g>
      );
    }
    case "hunter": {
      const h = 14 + grow * 10;
      const pelts = 1 + Math.min(3, Math.floor(level / 5));
      return (
        <g>
          <Box s={0.56} h={h} left={WOOD_L} right="#573926" top="#6b4630" />
          <Roof s={0.56} h={h} rh={12 + grow * 5} />
          <Window x={3} y={-h + 4} lit />
          <path
            d={`M-22,-2 L-22,-16 M-22,-16 L-6,-16`}
            stroke="#7d5a3c"
            strokeWidth="1.8"
            fill="none"
          />
          {Array.from({ length: pelts }, (_, i) => (
            <rect
              key={i}
              x={-21 + i * 5}
              y={-15}
              width="3.6"
              height="7"
              rx="1.6"
              fill="#8a6b4a"
            />
          ))}
        </g>
      );
    }
    case "mine": {
      const h = 12 + grow * 8;
      const piles = 1 + Math.min(3, Math.floor(level / 5));
      return (
        <g>
          <polygon
            points={`-26,2 -12,${-h - 8} 10,${-h - 4} 26,4 0,16`}
            fill="#3b4a5f"
          />
          <polygon
            points={`-26,2 -12,${-h - 8} -4,${-h - 2} -2,14`}
            fill="#4d5f78"
          />
          <polygon points={`-8,6 -8,-9 4,-12 4,4 -2,9`} fill="#121a26" />
          <rect x="-3" y="-11" width="5" height="4" rx="1" fill={WARM} />
          {Array.from({ length: piles }, (_, i) => (
            <ellipse
              key={i}
              cx={14 + i * 3}
              cy={10 - i * 3}
              rx="7"
              ry="3"
              fill="#1e2733"
            />
          ))}
        </g>
      );
    }
    case "tents": {
      const count = 1 + Math.min(3, Math.floor(level / 5));
      const spots = [
        [0, 0],
        [-14, 6],
        [14, 6],
        [0, 13],
      ];
      return (
        <g>
          {spots.slice(0, count).map(([dx, dy], i) => (
            <g key={i} transform={`translate(${dx},${dy})`}>
              <polygon points="-13,3 0,-19 13,3 0,9" fill={SNOW_T} />
              <polygon points="-13,3 0,-19 0,9" fill="#c8d9ee" />
              <polygon points="-4,3 0,-8 4,3 0,6" fill="#2a3a52" />
              <circle cx="0" cy="1" r="1.6" fill={WARM} opacity="0.9" />
            </g>
          ))}
        </g>
      );
    }
    case "canteen": {
      const h = 14 + grow * 10;
      return (
        <g>
          <Box s={0.58} h={h} left={WALL_L} right={WALL_R} top="#4a6288" />
          <Roof s={0.58} h={h} rh={12 + grow * 5} />
          <Window x={4} y={-h + 4} lit />
          <ellipse cx="-17" cy="6" rx="8" ry="4" fill="#2b3a4f" />
          <rect x="-24" y="-1" width="14" height="7" rx="3" fill="#3d4f68" />
          <Smoke x={-17} y={-6} seed={1} />
          <Smoke x={-14} y={-6} seed={2} />
          <ellipse cx="-17" cy="1" rx="6" ry="2.4" fill="#ff8a2b" opacity="0.7" />
        </g>
      );
    }
    case "factory": {
      const h = 17 + grow * 12;
      return (
        <g>
          <Box s={0.64} h={h} left="#33404f" right="#44525f" top="#55636f" />
          <Window x={4} y={-h + 5} lit />
          <Window x={11} y={-h + 8.5} lit />
          <g transform={`translate(-13,${-h - 2})`}>
            <Box s={0.16} h={16 + grow * 10} left="#2b3540" right="#3a4550" top="#4b5763" />
          </g>
          <Smoke x={-13} y={-h - 24} seed={1} />
          <Smoke x={-10} y={-h - 28} seed={2.4} />
          <ellipse cx="0" cy={-h + 2} rx="5" ry="2" fill="#ff8a2b" opacity="0.55" />
        </g>
      );
    }
    case "workshop": {
      const h = 14 + grow * 9;
      return (
        <g>
          <Box s={0.58} h={h} left={WOOD_L} right="#5a3a26" top="#6b4630" />
          <Roof s={0.58} h={h} rh={11 + grow * 5} />
          <Window x={4} y={-h + 4} lit />
          <circle
            className="gear"
            cx="-18"
            cy="-2"
            r="6.5"
            fill="none"
            stroke="#9fb4cf"
            strokeWidth="3"
            strokeDasharray="3 2.6"
          />
          <rect x="10" y="0" width="12" height="3" rx="1.5" fill="#7d5a3c" />
        </g>
      );
    }
    case "tower": {
      const h = 22 + Math.min(58, level * 2.2);
      return (
        <g>
          <polygon points={`-9,2 -9,${-h} -7,${-h} -7,4`} fill="#4a3524" />
          <polygon points={`9,2 9,${-h} 7,${-h} 7,4`} fill="#5c4330" />
          <polygon points={`0,10 0,${-h + 6} 2,${-h + 6} 2,12`} fill="#4a3524" />
          <g transform={`translate(0,${-h})`}>
            <Box s={0.42} h={12} left={WOOD_L} right={WOOD_R} top="#6b4630" />
            <Roof s={0.42} h={12} rh={11} />
            <circle cx="0" cy="-4" r="3.4" fill={WARM} opacity="0.95" />
            <circle className="beacon" cx="0" cy="-4" r="8" fill={WARM} opacity="0.25" />
          </g>
        </g>
      );
    }
    default:
      return null;
  }
};

/* ---------- 焚き火 ---------- */

const Bonfire = ({ level, scale }: { level: number; scale: number }) => (
  <g>
    <ellipse cx="0" cy="4" rx={26 * scale} ry={11 * scale} fill="url(#fireGlow)" />
    <g className="camp-flame" transform={`translate(0,2) scale(${scale * 0.82})`}>
      <path
        className="flame flame-1"
        d="M0,-46C10,-33 14,-26 14,-17C14,-8 7,-2 0,-2C-7,-2 -14,-8 -14,-17C-14,-26 -10,-33 0,-46Z"
        fill="url(#flameOuter)"
      />
      <path
        className="flame flame-2"
        d="M0,-31C6,-22 8,-18 8,-12C8,-6 4,-2 0,-2C-4,-2 -8,-6 -8,-12C-8,-18 -6,-22 0,-31Z"
        fill="url(#flameInner)"
      />
      <path
        className="flame flame-3"
        d="M0,-18C3,-13 4,-11 4,-8C4,-5 2,-3 0,-3C-2,-3 -4,-5 -4,-8C-4,-11 -3,-13 0,-18Z"
        fill="#fff6dc"
      />
    </g>
    <ellipse cx="0" cy="6" rx="15" ry="6" fill="#3d2519" />
    <ellipse cx="0" cy="4.5" rx="12" ry="4.6" fill="#543525" />
    {level > 0 ? (
      <ellipse cx="0" cy="4.5" rx="8" ry="3" fill="#ff8a2b" opacity="0.8" />
    ) : null}
  </g>
);

/* ---------- 装飾 ---------- */

const decorations: { c: number; r: number; kind: "tree" | "rock" }[] = [
  { c: 0, r: 0, kind: "tree" },
  { c: 4, r: 4, kind: "tree" },
  { c: 2, r: 0, kind: "tree" },
  { c: 0, r: 2, kind: "tree" },
  { c: 4, r: 2, kind: "rock" },
  { c: 2, r: 4, kind: "tree" },
  { c: 1, r: 0, kind: "rock" },
  { c: 3, r: 0, kind: "tree" },
  { c: 0, r: 1, kind: "tree" },
  { c: 0, r: 3, kind: "rock" },
  { c: 4, r: 1, kind: "tree" },
  { c: 4, r: 3, kind: "tree" },
  { c: 1, r: 4, kind: "tree" },
  { c: 3, r: 4, kind: "rock" },
];

const Tree = () => (
  <g>
    <rect x="-1.6" y="-6" width="3.2" height="8" fill="#4a3524" />
    <polygon points="-9,-4 0,-26 9,-4" fill="#24503f" />
    <polygon points="-7,-12 0,-30 7,-12" fill="#2c6350" />
    <polygon points="-5,-22 0,-32 5,-22" fill={SNOW_T} opacity="0.9" />
  </g>
);

const Rock = () => (
  <g>
    <polygon points="-10,2 -5,-8 4,-10 10,0 2,5" fill="#4a596e" />
    <polygon points="-5,-8 4,-10 1,-4 -3,-3" fill={SNOW_T} opacity="0.85" />
  </g>
);

/* ---------- 遠景 ---------- */

const stars = [
  [38, 34],
  [96, 66],
  [150, 24],
  [212, 52],
  [268, 30],
  [330, 72],
  [366, 40],
  [72, 100],
  [284, 106],
  [186, 88],
  [24, 72],
  [352, 122],
];

const Backdrop = () => (
  <g aria-hidden>
    <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#sky)" />
    <g className="aurora">
      <path
        d="M-20,118 C80,66 150,140 230,92 C300,50 360,102 420,74 L420,6 L-20,6 Z"
        fill="url(#auroraA)"
      />
      <path
        d="M-20,156 C70,118 140,176 220,134 C300,96 360,142 420,118 L420,44 L-20,44 Z"
        fill="url(#auroraB)"
      />
    </g>
    {stars.map(([x, y], i) => (
      <circle
        key={i}
        className="star"
        cx={x}
        cy={y}
        r={i % 3 === 0 ? 1.6 : 1}
        fill="#eaf3ff"
        style={{ animationDelay: `${i * -0.7}s` }}
      />
    ))}

    {/* 遠くの山 */}
    <path
      d="M-20,252 L40,176 L86,218 L140,152 L196,222 L250,170 L308,226 L358,182 L420,250 Z"
      fill="#16233a"
    />
    <path
      d="M140,152 L166,184 L114,184 Z M250,170 L272,200 L228,200 Z M40,176 L58,200 L22,200 Z"
      fill="#31456a"
      opacity="0.85"
    />
    <path
      d="M-20,266 L60,220 L120,252 L188,206 L246,248 L320,216 L420,268 Z"
      fill="#1d2c46"
    />
  </g>
);

const Foreground = () => (
  <g aria-hidden>
    <path
      d={`M-20,${VIEW_H} L-20,452 Q60,428 130,450 Q200,470 268,446 Q340,422 420,452 L420,${VIEW_H} Z`}
      fill="#16233a"
      opacity="0.85"
    />
    <path
      d={`M-20,${VIEW_H} L-20,478 Q80,458 170,478 Q260,496 420,470 L420,${VIEW_H} Z`}
      fill="#101b2e"
    />
  </g>
);

/* ---------- 本体 ---------- */

export default function CampScene({
  levels,
  campLevel,
  population,
  heat,
  fireScale,
  blizzard,
  freezing,
  unlocked,
  affordable,
  selected,
  onSelect,
  onStoke,
  tokens,
  onCollect,
  sparks,
}: Props) {
  const tiles = useMemo(() => {
    const list: { c: number; r: number; inner: boolean }[] = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        list.push({ c, r, inner: c > 0 && c < 4 && r > 0 && r < 4 });
      }
    }
    return list;
  }, []);

  const workers = useMemo(() => {
    const built = buildings.filter((b) => levels[b.id] > 0);
    const count = Math.min(7, Math.floor(population));
    return Array.from({ length: count }, (_, i) => {
      const from = built[i % built.length] ?? buildings[0];
      const to = built[(i + 2) % built.length] ?? buildings[0];
      const a = iso(from.tile[0], from.tile[1]);
      const b = iso(to.tile[0], to.tile[1]);
      return {
        id: i,
        x1: a.x + ((i % 3) - 1) * 8,
        y1: a.y + 10,
        x2: b.x + ((i % 2) - 0.5) * 12,
        y2: b.y + 10,
        duration: 7 + (i % 4) * 2.5,
        delay: i * -1.7,
      };
    });
  }, [levels, population]);

  const visibleDecor = Math.min(decorations.length, 2 + campLevel * 2);

  const ordered = useMemo(
    () =>
      [...buildings].sort(
        (a, b) => a.tile[0] + a.tile[1] - (b.tile[0] + b.tile[1]),
      ),
    [],
  );

  return (
    <svg
      className={`camp${blizzard ? " is-blizzard" : ""}${
        freezing ? " is-freezing" : ""
      }`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="雪原の拠点"
    >
      <defs>
        <linearGradient id="flameOuter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5f1f" stopOpacity="0.1" />
          <stop offset="42%" stopColor="#ff6a12" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffa233" />
        </linearGradient>
        <linearGradient id="flameInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb43d" stopOpacity="0.2" />
          <stop offset="55%" stopColor="#ffc45a" />
          <stop offset="100%" stopColor="#ffe6a3" />
        </linearGradient>
        <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a2b" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff8a2b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f7ff" />
          <stop offset="100%" stopColor="#a9c0dc" />
        </linearGradient>
        <radialGradient id="warmth" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff9a3d" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff9a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1426" />
          <stop offset="55%" stopColor="#122036" />
          <stop offset="100%" stopColor="#16243c" />
        </linearGradient>
        <linearGradient id="auroraA" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#4fd6a8" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#4fd6a8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="auroraB" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7fb4ff" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#7fb4ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <Backdrop />

      {/* 雪原の台座 */}
      <path
        className="ground"
        d={`M${OX},${OY - HALF_H - 10} L${OX + HALF_W + 10},${OY} L${OX},${
          OY + HALF_H + 10
        } L${OX - HALF_W - 10},${OY} Z`}
        fill="url(#ground)"
        stroke="url(#ground)"
        strokeWidth="18"
        strokeLinejoin="round"
        opacity="0.16"
      />
      <path
        className="ground"
        d={`M${OX},${OY - HALF_H - 2} L${OX + HALF_W + 2},${OY} L${OX},${
          OY + HALF_H + 2
        } L${OX - HALF_W - 2},${OY} Z`}
        fill="url(#ground)"
        stroke="url(#ground)"
        strokeWidth="16"
        strokeLinejoin="round"
        opacity="0.42"
      />

      {/* 焚き火の暖かい光 */}
      <ellipse
        cx={iso(2, 2).x}
        cy={iso(2, 2).y}
        rx={80 + heat}
        ry={44 + heat * 0.5}
        fill="url(#warmth)"
      />

      {/* マス目 */}
      {tiles.map(({ c, r, inner }) => {
        const { x, y } = iso(c, r);
        return (
          <polygon
            key={`${c}-${r}`}
            className={`tile${inner ? " is-plot" : ""}`}
            points={`${x},${y - TILE_H / 2} ${x + TILE_W / 2},${y} ${x},${
              y + TILE_H / 2
            } ${x - TILE_W / 2},${y}`}
          />
        );
      })}

      {/* 外周の飾り */}
      {decorations.slice(0, visibleDecor).map((item, i) => {
        const { x, y } = iso(item.c, item.r);
        return (
          <g
            key={i}
            transform={`translate(${x},${y}) scale(${ART_SCALE * 0.88})`}
            className="decor"
          >
            {item.kind === "tree" ? <Tree /> : <Rock />}
          </g>
        );
      })}

      {/* 建物 */}
      {ordered.map((building) => {
        const level = levels[building.id];
        const { x, y } = iso(building.tile[0], building.tile[1]);
        const isOpen = unlocked(building.id);
        const isSelected = selected === building.id;
        const canBuy = affordable(building.id);

        return (
          <g
            key={building.id}
            transform={`translate(${x},${y})`}
            className={`plot${isSelected ? " is-selected" : ""}${
              level === 0 && isOpen && canBuy ? " is-ready" : ""
            }`}
            onPointerDown={(event) => {
              event.preventDefault();
              if (building.id === "bonfire") onStoke();
              else onSelect(building.id);
            }}
          >
            <title>{building.name}</title>
            <polygon
              className="plot-hit"
              points={`0,${-TILE_H / 2} ${TILE_W / 2},0 0,${TILE_H / 2} ${
                -TILE_W / 2
              },0`}
            />

            {building.id === "bonfire" ? (
              <g transform={`scale(${ART_SCALE})`}>
                <Bonfire level={level} scale={fireScale} />
              </g>
            ) : level > 0 ? (
              <g transform={`scale(${ART_SCALE})`}>
                <BuildingArt id={building.id} level={level} />
              </g>
            ) : isOpen ? (
              <g className="empty-plot">
                <polygon
                  className="plot-dash"
                  points={`0,${-TILE_H / 2 + 3} ${TILE_W / 2 - 6},0 0,${
                    TILE_H / 2 - 3
                  } ${-TILE_W / 2 + 6},0`}
                />
                <text className="plot-emoji" y="-6">
                  {building.icon}
                </text>
                <circle className="plot-plus-bg" cy="6" r="8.5" />
                <text className="plot-plus" y="10">
                  ＋
                </text>
              </g>
            ) : (
              <g className="locked-plot">
                <polygon
                  className="plot-dash is-locked"
                  points={`0,${-TILE_H / 2 + 4} ${TILE_W / 2 - 8},0 0,${
                    TILE_H / 2 - 4
                  } ${-TILE_W / 2 + 8},0`}
                />
              </g>
            )}

            {level > 0 && building.id !== "bonfire" ? (
              <g className="level-badge" transform={`translate(0,${TILE_H / 2 + 2})`}>
                <rect x="-13" y="-7" width="26" height="14" rx="7" />
                <text y="4">Lv{level}</text>
              </g>
            ) : null}
          </g>
        );
      })}

      <Foreground />

      {/* 生存者 */}
      {workers.map((worker) => (
        <g
          key={worker.id}
          className="worker"
          style={{
            ["--x1" as string]: `${worker.x1}px`,
            ["--y1" as string]: `${worker.y1}px`,
            ["--x2" as string]: `${worker.x2}px`,
            ["--y2" as string]: `${worker.y2}px`,
            animationDuration: `${worker.duration}s`,
            animationDelay: `${worker.delay}s`,
          }}
        >
          <ellipse cx="0" cy="1" rx="3.4" ry="1.5" fill="#0a1220" opacity="0.35" />
          <rect x="-2" y="-8" width="4" height="7" rx="2" fill="#d7623b" />
          <circle cx="0" cy="-10" r="2.6" fill="#f2d3b3" />
        </g>
      ))}

      {/* タップで拾える資源 */}
      {tokens.map((token) => {
        const building = buildingById.get(token.buildingId);
        if (!building) return null;
        const { x, y } = iso(building.tile[0], building.tile[1]);
        const meta = resourceMeta.find((item) => item.id === token.resource);
        return (
          <g
            key={token.id}
            className="token"
            transform={`translate(${x},${y - 66})`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCollect(token);
            }}
          >
            <circle r="13" />
            <text y="5">{meta?.icon}</text>
          </g>
        );
      })}

      {/* 獲得表示 */}
      {sparks.map((spark) => (
        <text key={spark.id} className="spark" x={spark.x} y={spark.y}>
          {spark.text}
        </text>
      ))}
    </svg>
  );
}
