import { stageDefs } from "@/data/stages";

const stage = stageDefs.taiga;
const original = {
  name: stage.name,
  subtitle: stage.subtitle,
  icon: stage.icon,
  itemIcon: stage.itemIcon,
  currency: stage.currency,
  areaLabels: stage.areas.map((area) => area.label),
  areaPalettes: stage.areas.map((area) => ({ ...area.palette })),
  stoveLabels: stage.stoves.map((station) => station.label),
  seatLabels: stage.seats.map((seat) => seat.label),
  equipLabels: stage.equipment.map((item) => item.name),
  hireLabels: stage.hires.map((hire) => hire.label),
  labels: JSON.parse(JSON.stringify(stage.labels)) as typeof stage.labels,
};

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

const scrapWords = (text: string | undefined) => {
  if (!text) return text;
  return text
    .replaceAll("水がめ", "スクラップ回収箱")
    .replaceAll("水くみ場", "スクラップ回収口")
    .replaceAll("取水口", "自動回収ホッパー")
    .replaceAll("川辺の食事場", "資源受入ステーション")
    .replaceAll("食事場", "資源受入所")
    .replaceAll("畑", "選別ライン")
    .replaceAll("石臼", "破砕機")
    .replaceAll("窯", "精製炉")
    .replaceAll("水路", "搬送コンベア")
    .replaceAll("船着き場", "物流ターミナル")
    .replaceAll("船着場", "物流ターミナル")
    .replaceAll("いかだ", "搬送ローバー")
    .replaceAll("船", "大型搬送ローバー")
    .replaceAll("市場", "資源出荷基地")
    .replaceAll("村", "再生コロニー")
    .replaceAll("町", "再生コロニー")
    .replaceAll("羊", "回収ドローン")
    .replaceAll("ヤギ", "解体ロボ")
    .replaceAll("牧草地", "廃材ストックヤード")
    .replaceAll("木材", "構造材")
    .replaceAll("丸太", "大型廃材")
    .replaceAll("パン", "再生素材")
    .replaceAll("種", "部品")
    .replaceAll("水", "スクラップ");
};

const stationName = (station: { id: string; art?: string; label?: string }) => {
  const id = station.id;
  const art = station.art ?? "";
  if (art === "river") return "スクラップ回収口";
  if (art === "intake") return "自動回収ホッパー";
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
  return scrapWords(station.label) ?? "再生設備";
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
  stage.itemIcon = "🔩";
  stage.currency = "RP";

  stage.areas.forEach((area, index) => {
    area.label = areaNames[index] ?? `再生区画 ${String(index + 1).padStart(2, "0")}`;
    area.palette = {
      ...area.palette,
      floor: index % 2 === 0 ? "#303536" : "#373d3e",
      deep: index % 2 === 0 ? "#202526" : "#262c2d",
    };
  });

  stage.stoves.forEach((station) => {
    station.label = stationName(station);
  });
  stage.seats.forEach((seat) => {
    seat.label = scrapWords(seat.label) ?? seat.label;
  });
  stage.equipment.forEach((item) => {
    item.name = scrapWords(item.name) ?? item.name;
  });
  stage.hires.forEach((hire) => {
    hire.label = hireName(hire.kind);
  });

  stage.labels.item = "回収資源";
  stage.labels.producer = "処理設備";
  stage.labels.tray = "搬送パレット";
  stage.labels.guest = "資源受入先";
  stage.labels.using = "処理中";
  stage.labels.auto = "自動搬送";
  stage.labels.outside = "廃棄平原";
  stage.labels.outsideDetail = "回収設備と搬送ラインは廃棄平原に展開する";
  stage.labels.objective.pickup = "スクラップ回収口で資源を受け取ろう";
  stage.labels.objective.serve = "光っている処理設備まで資源を運ぼう";
  stage.labels.objective.coin = "落ちた再生ポイントを回収しよう";
  stage.labels.objective.waitItem = "処理が終わるまで待とう";
  stage.labels.objective.waitGuest = "資源受入先の準備を待っています";

  for (const key of Object.keys(stage.labels.staff) as Array<keyof typeof stage.labels.staff>) {
    stage.labels.staff[key] = hireName(key);
  }
};

export const restoreTaigaStageTheme = () => {
  const stage = stageDefs.taiga;
  stage.name = original.name;
  stage.subtitle = original.subtitle;
  stage.icon = original.icon;
  stage.itemIcon = original.itemIcon;
  stage.currency = original.currency;
  stage.areas.forEach((area, index) => {
    area.label = original.areaLabels[index] ?? area.label;
    area.palette = { ...(original.areaPalettes[index] ?? area.palette) };
  });
  stage.stoves.forEach((station, index) => {
    station.label = original.stoveLabels[index];
  });
  stage.seats.forEach((seat, index) => {
    seat.label = original.seatLabels[index];
  });
  stage.equipment.forEach((item, index) => {
    item.name = original.equipLabels[index];
  });
  stage.hires.forEach((hire, index) => {
    hire.label = original.hireLabels[index];
  });
  stage.labels = JSON.parse(JSON.stringify(original.labels)) as typeof stage.labels;
};
