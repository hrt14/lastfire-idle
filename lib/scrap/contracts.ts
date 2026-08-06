import { machines, resources, type Contract } from "@/lib/scrap/data";
import {
  isAutomated,
  outputCapacity,
  type ScrapState,
} from "@/lib/scrap/state";

export const contract = (state: ScrapState): Contract => {
  if (state.unlocked < 3) {
    if (state.contractsCompleted === 0) {
      return {
        id: "contract-wall-first",
        name: "外壁補修材",
        detail: "最初の3個で居住区の外壁を応急修理する",
        resource: "sorted",
        amount: 3,
        reward: 280,
        restoration: 3,
      };
    }
    return {
      id: `contract-wall-repeat-${state.contractsCompleted}`,
      name: "外壁補修材",
      detail: "通常買取：1個70C",
      resource: "sorted",
      amount: 3,
      reward: 210,
      restoration: 1,
    };
  }

  const index = Math.max(0, Math.min(machines.length - 1, state.unlocked - 1));
  const table: Partial<Record<number, Omit<Contract, "id" | "resource">>> = {
    2: {
      name: "浄水設備資材",
      detail: "破砕・洗浄した再生資材を送る",
      amount: 3,
      reward: 950,
      restoration: 4,
    },
    4: {
      name: "都市骨格再建",
      detail: "再生インゴットで街の骨格を作る",
      amount: 3,
      reward: 10000,
      restoration: 7,
    },
    6: {
      name: "惑星復旧ロボ派遣",
      detail: "作業ロボットを荒廃区域へ派遣する",
      amount: 2,
      reward: 85000,
      restoration: 12,
    },
  };
  const latest = machines[index];
  const fallback = {
    name: `${resources[latest.output].name}の復旧便`,
    detail: "完成品を復旧本部へ届ける",
    amount: 3,
    reward: Math.max(950, latest.unlockCost * 2),
    restoration: 5,
  };
  return {
    id: `contract-${latest.id}-${state.contractsCompleted}`,
    resource: latest.output,
    ...(table[index] ?? fallback),
  };
};

export const currentDistrict = (state: ScrapState) => {
  if (state.unlocked >= 6) return { index: 4, name: "ロボット復旧基地" };
  if (state.unlocked >= 4) return { index: 3, name: "溶解・精錬区" };
  if (state.unlocked >= 3) return { index: 2, name: "破砕・洗浄区" };
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
      return `${machine.name}の受取口が満杯です`;
    }
  }
  for (const machine of machines.slice(0, state.unlocked)) {
    if (
      state.inputs[machine.id] <= 0 &&
      state.resources[machine.input] > 0 &&
      !isAutomated(state, machine.id)
    ) {
      return `${resources[machine.input].short}を${machine.name}へ運べます`;
    }
  }
  const active = contract(state);
  if (state.resources[active.resource] > 0 && state.carry.amount === 0) {
    return `${resources[active.resource].short}を復旧本部へ納品できます`;
  }
  return "ラインは順調に流れています";
};
