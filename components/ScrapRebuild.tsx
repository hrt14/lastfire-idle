"use client";

import { useEffect, useState } from "react";
import Shop, { type Sample } from "@/components/Shop";
import { stageDefs } from "@/data/stages";
import { switchStage } from "@/lib/shopStore";
import styles from "./ScrapRebuild.module.css";

const originalTaiga = {
  ...stageDefs.taiga,
  areas: stageDefs.taiga.areas,
  stoves: stageDefs.taiga.stoves,
  seats: stageDefs.taiga.seats,
  hires: stageDefs.taiga.hires,
  equipment: stageDefs.taiga.equipment,
  upgrades: stageDefs.taiga.upgrades,
  labels: stageDefs.taiga.labels,
};

let themed = false;

const areaNames = [
  "漂着スクラップヤード",
  "自動搬送区",
  "解体・精錬工場",
  "ロボット復旧基地",
  "資源交易ターミナル",
  "再生コロニー",
  "大規模回収区",
  "軌道港区",
  "惑星再生中枢",
];

const renameStove = (id: string, fallback: string) => {
  if (id.startsWith("river") || id.startsWith("intake")) return "電力供給ユニット";
  if (id.startsWith("seed")) return "未処理スクラップ置場";
  if (id.startsWith("field")) return "自動選別機";
  if (id.startsWith("clay")) return "廃材回収ピット";
  if (id.startsWith("kiln")) return "溶解炉";
  if (id.startsWith("mill")) return "破砕機";
  if (id.startsWith("oven")) return "精製炉";
  if (id.startsWith("forest")) return "大型スクラップ山";
  if (id.startsWith("split")) return "解体ステーション";
  if (id.startsWith("graze")) return "電子部品回収区";
  if (id.startsWith("goat")) return "修復ドローン工房";
  if (id.startsWith("sheep")) return "作業ロボット工房";
  if (id.startsWith("fish")) return "希少資源回収区";
  if (id.startsWith("dry")) return "資源圧縮機";
  if (id.startsWith("build-dock")) return "物流ターミナル";
  if (id.startsWith("build-market")) return "資源出荷基地";
  if (id.startsWith("build-granary")) return "大型資源倉庫";
  if (id.startsWith("build-well")) return "中央電源塔";
  if (id.startsWith("build-temple")) return "再生ビーコン";
  if (id.startsWith("build-ship")) return "大型搬送ローバー";
  return fallback;
};

const renameEquipment = (id: string, fallback: string) => {
  if (id.includes("canal")) return "コンベアライン";
  if (id.includes("seedway")) return "スクラップ搬送ライン";
  if (id.includes("pond")) return "蓄電バンク";
  if (id.includes("gate")) return "分岐制御ゲート";
  if (id.includes("levee")) return "防塵シールド";
  if (id.includes("drain")) return "排熱ダクト";
  if (id.includes("chute")) return "自動搬送ライン";
  if (id.includes("road")) return "高速搬送レーン";
  if (id === "noodle") return "高効率工具セット";
  if (id === "fridge") return "ストレージ拡張";
  if (id === "ticket") return "自動クレジット回収";
  if (id === "flag") return "探索ビーコン";
  if (id === "sign") return "長距離センサー";
  return fallback;
};

const applyScrapTheme = () => {
  if (themed) return;
  themed = true;
  const def = stageDefs.taiga;
  def.name = "SCRAP PLANET";
  def.subtitle = "廃棄惑星を回収・加工・自動化で再生する";
  def.icon = "♻️";
  def.itemIcon = "🔩";
  def.currency = "Cr";
  def.areas = def.areas.map((area, index) => ({
    ...area,
    label: areaNames[index] ?? `再生区画 ${index + 1}`,
    palette: {
      floor: index % 2 === 0 ? "#17242a" : "#132027",
      deep: "#091217",
      prop: "none",
    },
  }));
  def.stoves = def.stoves.map((stove) => ({
    ...stove,
    label: renameStove(stove.id, stove.label ?? "処理設備"),
  }));
  def.seats = def.seats.map((seat) => ({
    ...seat,
    label: seat.area >= 4 ? "資源出荷ポイント" : "資源受入ポイント",
  }));
  def.hires = def.hires.map((hire) => ({
    ...hire,
    label:
      hire.kind === "robot"
        ? "搬送ロボ"
        : hire.kind === "boat"
          ? "大型搬送ローバー"
          : hire.kind === "builder"
            ? "建設ドロイド"
            : hire.kind === "waiter"
              ? "物流ドロイド"
              : hire.kind === "cook"
                ? "設備オペレーター"
                : hire.label,
  }));
  def.equipment = def.equipment.map((equipment) => ({
    ...equipment,
    name: renameEquipment(equipment.id, equipment.name),
  }));
  def.labels = {
    ...def.labels,
    item: "資源",
    producer: "処理設備",
    tray: "資源受入口",
    guest: "出荷ドローン",
    using: "積み込み中",
    outside: "荒廃地",
    outsideDetail: "ビーコンや大型設備は屋外に設置する",
    auto: "自動搬送",
    staff: {
      ...def.labels.staff,
      waiter: "物流ドロイド",
      robot: "搬送ロボ",
      collector: "回収ドロイド",
      cook: "設備オペレーター",
      master: "基地AI",
      builder: "建設ドロイド",
      keeper: "倉庫管理AI",
      explorer: "探索ドローン",
      boat: "大型搬送ローバー",
      runner: "搬送ドロイド",
    },
    objective: {
      pickup: "設備の出し口で資源を受け取ろう",
      serve: "次の設備か出荷ポイントまで運ぼう",
      coin: "落ちたクレジットを回収しよう",
      waitItem: "処理が終わるまで待とう",
      waitGuest: "出荷ドローンを待っています",
    },
  };
};

const restoreTaigaTheme = () => {
  Object.assign(stageDefs.taiga, originalTaiga);
  themed = false;
};

export default function ScrapRebuild() {
  const [ready, setReady] = useState(false);

  applyScrapTheme();

  useEffect(() => {
    switchStage("taiga");
    setReady(true);
    return () => restoreTaigaTheme();
  }, []);

  if (!ready) return <div className={styles.loading}>SCRAP PLANET 起動中…</div>;

  const onSample = (_sample: Sample) => {};

  return (
    <main className={styles.shell}>
      <div className={styles.banner} aria-hidden="true">
        <span className={styles.kicker}>TAIGA ENGINE REBUILD</span>
        <span className={styles.title}>SCRAP PLANET</span>
      </div>
      <Shop onSample={onSample} paused={false} />
    </main>
  );
}
