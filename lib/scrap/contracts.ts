import { machines, resources, type Contract } from "@/lib/scrap/data";
import {
  isAutomated,
  outputCapacity,
  type ScrapState,
} from "@/lib/scrap/state";

export const contract = (state: ScrapState): Contract => {
  const index = Math.max(0, Math.min(machines.length - 1, state.unlocked - 1));
  const table: Omit<Contract, "id" | "resource">[] = [
    {
      name: "緊急選別資材",
      detail: "漂着ゴミから使える金属を回収する",
      amount: 3,
      reward: 160,
      restoration: 2,
    },
    {
      name: "外壁補修材",
      detail: "居住区の外壁を補強する",
      amount: 3,
      reward: 280,
      restoration: 3,
    },
    {
      name: "浄水設備資材",
      detail: "汚染水を処理する設備を直す",
      amount: 3,
      reward: 950,
      restoration: 4,
    },
    {
      name: "熱源再起動計画",
      detail: "停止した発電区画へ金属を送る",
      amount: 3,
      reward: 3200,
      restoration: 5,
    },
    {
      name: "都市骨格再建",
      detail: "再生インゴットで街の骨格を作る",
      amount: 3,
      reward: 10000,
      restoration: 7,
    },
    {
      name: "無人工場建設",
      detail: "自動工場の機械部品をそろえる",
      amount: 3,
      reward: 32000,
      restoration: 9,
    },
    {
      name: "惑星復旧ロボ派遣",
      detail: "作業ロボットを荒廃区域へ派遣する",
      amount: 2,
      reward: 85000,
      restoration: 12,
    },
  ];
  const latest = machines[index];
  return {
    id: `contract-${latest.id}`,
    resource: latest.output,
    ...table[index],
  };
};

export const currentDistrict = (state: ScrapState) => {
  if (state.unlocked >= 7) return { index: 4, name: "ロボット復旧基地" };
  if (state.unlocked >= 5) return { index: 3, name: "精密加工区画" };
  if (state.unlocked >= 3) return { index: 2, name: "素材再生区画" };
  return { index: 1, name: "漂着ゴミ処理場" };
};

export const restorationLabel = (state: ScrapState) => {
  if (state.restoration >= 100) return "再生完了";
  if (state.restoration >= 75) return "都市機能復旧";
  if (state.restoration >= 50) return "産業基盤再建";
  if (state.restoration >= 25) return "居住区復旧";
  return "緊急復旧中";
};

export const bottleneck = (state: ScrapState): string => {
  for (const machine of machines.slice(0, state.unlocked)) {
    if (state.resources[machine.output] >= outputCapacity(state, machine.id)) {
      return `${machine.short}の完成品が満杯です`;
    }
  }
  for (const machine of machines.slice(0, state.unlocked)) {
    if (
      state.inputs[machine.id] <= 0 &&
      state.resources[machine.input] > 0 &&
      !isAutomated(state, machine.id)
    ) {
      return `${machine.short}への手動搬送が必要です`;
    }
  }
  const latest = machines[Math.max(0, state.unlocked - 1)];
  if (state.resources[latest.output] > 0 && state.carry.amount === 0) {
    return `${resources[latest.output].short}を復旧本部へ納品できます`;
  }
  return "ラインは順調に流れています";
};
