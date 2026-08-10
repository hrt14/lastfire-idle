import { stageDefs } from "@/data/stages";

const original = structuredClone(stageDefs.taiga);

const areaNames = [
  "廃棄平原",
  "自動選別ヤード",
  "解体・破砕区",
  "精錬工業区",
  "資源物流区",
  "再生コロニー",
  "大型処理区",
  "汚染デルタ",
  "惑星再生中枢",
];

const stationName = (station: { id: string; art?: string; label?: string }) => {
  const id = station.id;
  const art = station.art ?? "";
  if (art === "river") return "スクラップ回収口";
  if (art === "intake") return "自動吸引ホッパー";
  if (art === "seedhut") return "部品投入庫";
  if (art === "field") return id.includes("field") ? "自動選別ライン" : "処理ライン";
  if (art === "mill") return "高速破砕機";
  if (art === "oven") return "高温精製炉";
  if (art === "pasture") return "廃材ストックヤード";
  if (art === "goat") return "小型解体ロボ";
  if (art === "sheep") return "資材回収ドローン";
  if (art === "fish") return "冷却廃液回収槽";
  if (art === "smoke") return "乾燥・脱水ライン";
  if (art === "clay") return "レアメタル採取坑";
  if (art === "forest") return "巨大スクラップ山";
  if (art === "split") return "油圧シュレッダー";
  if (art === "plank") return "圧縮成形機";
  if (art === "rope") return "ケーブル加工機";
  if (art === "store" || art === "woodstore") return "資源ストレージ";
  if (art === "raft") return "小型搬送ローバー";
  if (art === "bigraft") return "大型搬送ローバー";
  if (art === "well") return "冷却タンク";
  if (art === "bighut") return "大型資源サイロ";
  if (art === "hall") return "再生プラント";
  return station.label ?? "再生設備";
};

const hireName = (kind: string) => {
  switch (kind) {
    case "waiter": return "搬送ボット";
    case "robot": return "無人搬送車";
    case "collector": return "回収ドローン";
    case "cook": return "ラインオペレーター";
    case "master": return "プラント管理AI";
    case "builder": return "建設ドローン";
    case "keeper": return "倉庫管理ボット";
    case "explorer": return "探索ローバー";
    case "boat": return "大型搬送車";
    case "logger": return "解体ボット";
    case "splitter": return "破砕オペレーター";
    case "butcher": return "分解アーム";
    default: return "作業ロボ";
  }
};

export const applyScrapStageTheme = () => {
  const stage = stageDefs.taiga;
  stage.name = "SCRAP PLANET";
  stage.subtitle = "廃棄惑星を巨大な再生工場へ";
  stage.icon = "♻️";
  stage.itemIcon = "⚙️";
  stage.currency = "RP";

  stage.areas.forEach((area, index) => {
    area.label = areaNames[index] ?? `再生区画 ${String(index + 1).padStart(2, "0")}`;
    area.palette = {
      ...area.palette,
      floor: index % 2 === 0 ? "#2b3032" : "#32383a",
      deep: index % 2 === 0 ? "#181c1d" : "#202526",
    };
  });

  stage.stoves.forEach((station) => {
    station.label = stationName(station);
  });

  stage.hires.forEach((hire) => {
    hire.label = hireName(hire.kind);
  });

  stage.labels.item = "回収資源";
  stage.labels.producer = "処理設備";
  stage.labels.tray = "出荷パレット";
  stage.labels.guest = "搬送先";
  stage.labels.using = "処理中";
  stage.labels.auto = "自動搬送";
  stage.labels.outside = "廃棄平原";
  stage.labels.outsideDetail = "回収設備と搬送レーンは廃棄平原に展開する";
  stage.labels.objective.pickup = "回収口で資源を受け取ろう";
  stage.labels.objective.serve = "光っている処理設備まで資源を運ぼう";
  stage.labels.objective.coin = "落ちた再生ポイントを回収しよう";
  stage.labels.objective.waitItem = "処理が終わるまで待とう";
  stage.labels.objective.waitGuest = "搬送先の受け入れを待っています";

  for (const key of Object.keys(stage.labels.staff) as Array<keyof typeof stage.labels.staff>) {
    stage.labels.staff[key] = hireName(key);
  }
};

export const restoreTaigaStageTheme = () => {
  stageDefs.taiga = structuredClone(original);
};
