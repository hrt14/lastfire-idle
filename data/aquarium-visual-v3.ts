import { aquariumCardDef, aquariumRuntimeDef } from "@/data/aquarium";

/**
 * 世界水族館 visual v3
 *
 * ゲームロジックは既存のまま、展示の配置と命名を
 * 「横一列の同型水槽」から「地域ごとの見せ場がある館内」へ寄せる。
 * 背景は lib/aquariumTheme.ts と同じ配置規則を使う。
 */

const AREA_H = 420;

type ExhibitLayout = { x: number; y: number };

/** 館の節目。ここだけ3展示のレイアウトを崩して、1つの大水槽へ収束させる */
const HERO_AREAS = new Set([17, 53]);

const layoutForArea = (area: number): ExhibitLayout[] => {
  const y0 = area * AREA_H;

  // 本館の終着点（WORLD OCEAN）と、館ぜんたいの終着点（生命誕生の海）だけは
  // 通常の3展示レイアウトを崩す。
  // 中央上側に約5倍の大水槽、手前左右に2つの強化展示を置き、
  // 「3つの小水槽」ではなく「1つのランドマークへ収束する」構図にする。
  if (HERO_AREAS.has(area)) {
    return [
      { x: 82, y: y0 + 344 },
      { x: 278, y: y0 + 344 },
      { x: 180, y: y0 + 230 },
    ];
  }

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
const area = (index: number) =>
  aquariumRuntimeDef.areas.find((item) => item.id === `area-${index}`);

for (let region = 0; region < aquariumRuntimeDef.areas.length; region += 1) {
  const layout = layoutForArea(region);
  for (let index = 1; index <= 3; index += 1) {
    const exhibit = tank(region, index);
    const viewing = seat(region, index);
    const p = layout[index - 1];
    if (!p) continue;

    if (exhibit) {
      exhibit.pos = { x: p.x, y: p.y };
      exhibit.zone =
        HERO_AREAS.has(region) && index === 3
          ? {
              // 巨大水槽本体の占有範囲。通常展示の約5倍の見た目に合わせ、
              // 中央の床をしっかりランドマークとして使う。
              x0: p.x - 120,
              y0: p.y - 118,
              x1: p.x + 120,
              y1: p.y + 48,
            }
          : {
              x0: p.x - 48,
              y0: p.y - 138,
              x1: p.x + 48,
              y1: p.y - 14,
            };
    }

    if (viewing) {
      if (HERO_AREAS.has(region) && index === 3) {
        // プレイヤーと客が「水槽の中」ではなく、その手前の観覧デッキに立つ構図。
        viewing.pos = { x: 180, y: region * AREA_H + 382 };
        viewing.serve = { x: 180, y: region * AREA_H + 350 };
        viewing.tray = { x: 180, y: region * AREA_H + 366 };
      } else if (HERO_AREAS.has(region)) {
        // 左右の2展示は大水槽の強化ポイントとして手前の隅へ寄せる。
        viewing.pos = { x: p.x, y: p.y + 48 };
        viewing.serve = { x: p.x, y: p.y + 21 };
        viewing.tray = { x: p.x, y: p.y + 34 };
      } else {
        viewing.pos = { x: p.x, y: p.y + 64 };
        viewing.serve = { x: p.x, y: p.y + 23 };
        viewing.tray = { x: p.x, y: p.y + 40 };
      }
    }
  }
}

const rename = (region: number, index: number, label: string, detail?: string) => {
  const exhibit = tank(region, index);
  const viewing = seat(region, index);
  if (exhibit) exhibit.label = label;
  if (viewing) {
    viewing.label = label;
    if (detail) viewing.detail = detail;
  }
};

const areaNames = [
  "日本の淡水・里川",
  "日本の清流",
  "東アジアの大河",
  "メコン川",
  "東南アジア・水没森林",
  "アフリカの湖と川",
  "アマゾン熱帯雨林",
  "アマゾン大河",
  "日本の海",
  "北の海",
  "沖縄・サンゴ礁",
  "カリフォルニア・ケルプの森",
  "東南アジアの海",
  "オーストラリア大礁",
  "インド洋",
  "外洋",
  "深海",
  "世界の大海",
];

for (let i = 0; i < areaNames.length; i += 1) {
  const target = area(i);
  if (!target) continue;
  target.label = i === 0 ? areaNames[i] : `${areaNames[i]}をひらく`;
}

// 最初の二地域は、身近な小さな水辺から大水槽へスケールが上がる流れを明示する。
rename(0, 1, "小川のメダカ水槽", "FRESH WATER · JAPAN｜浅い小川を再現。水草の間をメダカの群れが泳ぐ。");
rename(0, 2, "田んぼの生きもの水槽", "FRESH WATER · JAPAN｜ドジョウは川底を進み、フナは中層を泳ぐ。田園の水辺を再現。");
rename(0, 3, "里川大水槽", "FRESH WATER · JAPAN｜オイカワ、タナゴ、ナマズが同じ水辺をつくる最初の主役展示。");
rename(1, 1, "清流のアユ水槽", "FRESH WATER · JAPAN｜澄んだ流れをアユが群れて泳ぐ清流展示。");
rename(1, 2, "渓流のヤマメ水槽", "FRESH WATER · JAPAN｜岩陰と速い流れを再現したヤマメの渓流展示。");
rename(1, 3, "清流大水槽", "FRESH WATER · JAPAN｜冷たい山の水、岩場、大型の渓流魚を見せる日本淡水エリアのランドマーク。");

// 以降も各地域の3番展示を必ず「この地域の顔」にする。
const landmarks: Array<[number, string, string]> = [
  [2, "東アジア大河水槽", "FRESH WATER · EAST ASIA｜大型ナマズが現れ、小魚中心だった展示から一段スケールが上がる大河の見せ場。"],
  [3, "巨大ナマズ", "FRESH WATER · MEKONG｜メコンの巨大ナマズが悠々と横切る、東南アジア淡水の主役展示。"],
  [4, "水没森林アロワナ大水槽", "FRESH WATER · FLOODED FOREST｜沈んだ巨木の根の間をアジアアロワナが泳ぐ、水没森林の象徴展示。"],
  [5, "アフリカ大湖水槽", "FRESH WATER · AFRICA｜岩場と色鮮やかな魚群の奥を大型魚が通る、アフリカ淡水のランドマーク。"],
  [6, "アマゾン熱帯雨林大水槽", "FRESH WATER · AMAZON｜密生する水草と流木の間を色鮮やかな魚が満たす熱帯雨林の大展示。"],
  [7, "ピラルク大河水槽", "FRESH WATER · GRAND FINALE｜淡水編最大級のピラルクが泳ぐ、川の旅のクライマックス。"],
  [8, "日本沿岸大水槽", "OCEAN · JAPAN｜群泳魚、岩礁魚、タコやウツボが同じ海をつくり、淡水から海へ景色が一変する。"],
  [9, "北海底大水槽", "OCEAN · COLD WATER｜冷たい青の海底を大きなカニが歩く、北の海の低層展示。"],
  [10, "沖縄サンゴ礁大水槽", "OCEAN · OKINAWA｜カラフルな魚群の上をウミガメが泳ぐ、明るいサンゴ礁の主役展示。"],
  [11, "ケルプフォレスト大水槽", "OCEAN · KELP FOREST｜巨大海藻の森を小型サメが横切る、縦方向の奥行きを見せる展示。"],
  [12, "東南アジア海中大水槽", "OCEAN · SOUTH EAST ASIA｜魚群、ミノカサゴ、フグ、エイが層ごとに動く密度の高い熱帯海域展示。"],
  [13, "グレートリーフ大水槽", "OCEAN · AUSTRALIA｜巨大サンゴ礁、ウミガメ、大型エイ、リーフシャークが共存する大展示。"],
  [14, "インド洋大型魚水槽", "OCEAN · INDIAN OCEAN｜大型エイと大型サメがゆったり横切り、魚の数ではなく大きさで圧倒する。"],
  [15, "外洋回遊大水槽", "OCEAN · OPEN OCEAN｜大群泳の中をマグロ、サメ、大型エイが回遊する水族館らしい巨大展示。"],
  [16, "深海発光大水槽", "OCEAN · DEEP SEA｜暗闇の中で深海魚が光り、館内の雰囲気そのものが変わる特殊展示。"],
  [17, "WORLD OCEAN 中央大水槽", "WORLD OCEAN · GRAND FINALE｜通常展示の約5倍。世界の魚群、マンタ、大型サメ、ジンベエザメ級の巨大魚が同じ水槽を回遊する最終ランドマーク。"],
];

for (const [region, label, detail] of landmarks) rename(region, 3, label, detail);

// WORLD OCEAN の1・2番展示は独立した小水槽ではなく、
// 中央大水槽が完成していく過程を示す強化ポイントとして読める名前にする。
rename(17, 1, "世界魚群パノラマ", "WORLD OCEAN｜小型魚の群泳密度を高め、中央大水槽を世界の魚群で満たす強化展示。");
rename(17, 2, "マンタ回遊ステージ", "WORLD OCEAN｜マンタと大型エイを加え、中央大水槽に大きな回遊の動きを生む強化展示。");

// カメラ開始位置も直線中央ではなく、入口から奥の展示へ視線が抜ける位置にする。
aquariumRuntimeDef.startPos = { x: 176, y: 274 };
aquariumRuntimeDef.view = 400;
aquariumCardDef.startPos = aquariumRuntimeDef.startPos;
aquariumCardDef.view = aquariumRuntimeDef.view;

