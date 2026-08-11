import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";

/**
 * 世界水族館 visual v3
 *
 * ゲームロジックは既存のまま、展示の配置だけを「横一列」から
 * 曲がる観覧動線へ変更する。背景は lib/aquariumTheme.ts と同じ配置規則を使う。
 *
 * 原則:
 * - 3展示を同じ高さ・等間隔に置かない
 * - 小展示 → 中展示 → 主役展示のスケール感を作る
 * - 展示名と見た目の意味を一致させる
 * - 来館者が同じ一直線上に並ばず、奥行きのある群れになる
 */

const AREA_H = 420;

type ExhibitLayout = {
  x: number;
  y: number;
};

const layoutForArea = (area: number): ExhibitLayout[] => {
  const y0 = area * AREA_H;
  const mirrored = area % 2 === 1;

  if (mirrored) {
    return [
      { x: 278, y: y0 + 286 },
      { x: 190, y: y0 + 330 },
      { x: 82, y: y0 + 258 },
    ];
  }

  return [
    { x: 82, y: y0 + 286 },
    { x: 176, y: y0 + 330 },
    { x: 278, y: y0 + 258 },
  ];
};

const tank = (area: number, index: number) =>
  aquariumRuntimeDef.stoves.find((item) => item.id === `tank-${area}-${index}`);
const seat = (area: number, index: number) =>
  aquariumRuntimeDef.seats.find((item) => item.id === `seat-${area}-${index}`);

for (let area = 0; area < aquariumRuntimeDef.areas.length; area += 1) {
  const layout = layoutForArea(area);

  for (let index = 1; index <= 3; index += 1) {
    const exhibit = tank(area, index);
    const viewing = seat(area, index);
    const p = layout[index - 1];
    if (!p) continue;

    if (exhibit) {
      exhibit.pos = { x: p.x, y: p.y };
      // 元実装と同じ「展示の少し手前」を作業/接近ゾーンにしつつ、
      // 配置の曲線に追従させる。
      exhibit.zone = {
        x0: p.x - 48,
        y0: p.y - 138,
        x1: p.x + 48,
        y1: p.y - 14,
      };
    }

    if (viewing) {
      viewing.pos = { x: p.x, y: p.y + 64 };
      viewing.serve = { x: p.x, y: p.y + 23 };
      viewing.tray = { x: p.x, y: p.y + 40 };
    }
  }
}

// 最初に見る展示は、UIラベルだけでも「何が見えるか」が想像できる名前にする。
const rename = (area: number, index: number, label: string, detail?: string) => {
  const exhibit = tank(area, index);
  const viewing = seat(area, index);
  if (exhibit) exhibit.label = label;
  if (viewing) {
    viewing.label = label;
    if (detail) viewing.detail = detail;
  }
};

const firstArea = aquariumRuntimeDef.areas.find((item) => item.id === "area-0");
if (firstArea) firstArea.label = "日本の淡水・里川";
const secondArea = aquariumRuntimeDef.areas.find((item) => item.id === "area-1");
if (secondArea) secondArea.label = "日本の清流をひらく";

rename(
  0,
  1,
  "小川のメダカ水槽",
  "FRESH WATER · JAPAN｜浅い小川を再現。水草の間をメダカの群れが泳ぐ。",
);
rename(
  0,
  2,
  "田んぼの生きもの水槽",
  "FRESH WATER · JAPAN｜ドジョウは川底を進み、フナは中層を泳ぐ。田園の水辺を再現。",
);
rename(
  0,
  3,
  "里川大水槽",
  "FRESH WATER · JAPAN｜オイカワ、タナゴ、ナマズが同じ水辺をつくる最初の主役展示。",
);
rename(
  1,
  1,
  "清流のアユ水槽",
  "FRESH WATER · JAPAN｜澄んだ流れをアユが群れて泳ぐ清流展示。",
);
rename(
  1,
  2,
  "渓流のヤマメ水槽",
  "FRESH WATER · JAPAN｜岩陰と速い流れを再現したヤマメの渓流展示。",
);
rename(
  1,
  3,
  "清流大水槽",
  "FRESH WATER · JAPAN｜冷たい山の水、岩場、大型の渓流魚を見せる日本淡水エリアのランドマーク。",
);

// カメラ開始位置も直線中央ではなく、入口から奥の展示へ視線が抜ける位置にする。
aquariumRuntimeDef.startPos = { x: 176, y: 274 };
aquariumRuntimeDef.view = 400;
aquariumCardDef.startPos = aquariumRuntimeDef.startPos;
aquariumCardDef.view = aquariumRuntimeDef.view;
