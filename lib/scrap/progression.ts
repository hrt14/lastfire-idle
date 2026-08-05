import {
  HQ_POS,
  hqDropPos,
  machineInputPos,
  machineOutputPos,
  machines,
  resources,
  sourcePickupPos,
  type MachineId,
  type Vec,
} from "@/lib/scrap/data";
import {
  carryCapacity,
  carryUpgradeCost,
  cloneState,
  isAutomated,
  machineCapacity,
  machineUnlocked,
  speedUpgradeCost,
  upgradeCost,
  type ScrapState,
} from "@/lib/scrap/state";
import { contract } from "@/lib/scrap/contracts";

export type Purchase = {
  id: string;
  label: string;
  detail: string;
  cost: number;
  pos: Vec;
  kind: "district" | "auto" | "upgrade" | "carry" | "speed" | "cash" | "ship";
  machine?: MachineId;
};

const firstDistrictPurchases = (state: ScrapState): Purchase[] => {
  const list: Purchase[] = [];
  const hasCollector = isAutomated(state, "sort");
  const hasMotor = state.levels.sort > 0;
  const hasDelivery = isAutomated(state, "deliver");

  if (!hasCollector) {
    list.push({
      id: "auto-sort",
      label: "自動回収ドローン",
      detail: "漂着ゴミを磁力選別機へ自動投入",
      cost: 120,
      pos: { x: 84, y: 430 },
      kind: "auto",
      machine: "sort",
    });
  }
  if (!hasMotor) {
    list.push({
      id: "motor-sort",
      label: "高速モーター",
      detail: "磁力選別機の加工速度を30%アップ",
      cost: 180,
      pos: { x: 276, y: 430 },
      kind: "upgrade",
      machine: "sort",
    });
  }

  if (hasCollector || hasMotor) {
    if (!hasDelivery) {
      list.push({
        id: "auto-deliver",
        label: "納品作業員",
        detail: "補修材を復旧本部へ自動納品",
        cost: 240,
        pos: { x: 180, y: 430 },
        kind: "auto",
      });
    }
    if (state.carryLevel < 1) {
      list.push({
        id: "carry",
        label: "磁気コンテナ",
        detail: `運べる数 ${carryCapacity(state)} → ${carryCapacity(state) + 1}`,
        cost: carryUpgradeCost(state),
        pos: { x: 276, y: 430 },
        kind: "carry",
      });
    }
  }

  if (hasCollector && hasDelivery) {
    const stable: Purchase[] = [];
    // 次区画は自動化と15個納品を満たした時点で、必ず候補に出す。
    if (state.totalDelivered >= 15) {
      stable.push({
        id: "district-2",
        label: "破砕・洗浄区",
        detail: "高価な再生資材を作る第二区画を開放",
        cost: 900,
        pos: { x: 292, y: 430 },
        kind: "district",
        machine: "crush",
      });
    }
    if (!hasMotor) {
      stable.push({
        id: "motor-sort",
        label: "高速モーター",
        detail: "磁力選別機の加工速度を30%アップ",
        cost: 180,
        pos: { x: 276, y: 430 },
        kind: "upgrade",
        machine: "sort",
      });
    }
    if (state.carryLevel < 1) {
      stable.push({
        id: "carry",
        label: "磁気コンテナ",
        detail: `運べる数 ${carryCapacity(state)} → ${carryCapacity(state) + 1}`,
        cost: carryUpgradeCost(state),
        pos: { x: 180, y: 430 },
        kind: "carry",
      });
    }
    if (!isAutomated(state, "cash")) {
      stable.push({
        id: "auto-cash",
        label: "自動決済端末",
        detail: "復旧依頼の報酬を即時決済・報酬10%アップ",
        cost: 450,
        pos: { x: 68, y: 430 },
        kind: "cash",
      });
    }
    if (!isAutomated(state, "deliver-fast")) {
      stable.push({
        id: "deliver-fast",
        label: "搬送ドローン",
        detail: "納品速度を大幅にアップ",
        cost: 600,
        pos: { x: 180, y: 430 },
        kind: "auto",
      });
    }
    return stable.slice(0, 3);
  }

  return list.slice(0, 3);
};

const laterPurchases = (state: ScrapState): Purchase[] => {
  const list: Purchase[] = [];
  const latest = machines[Math.max(0, state.unlocked - 1)];
  const nextIndex = state.unlocked;
  const nextMachine = machines[nextIndex];

  const automationTarget = machines
    .slice(0, state.unlocked)
    .find((machine) => !isAutomated(state, machine.id));
  if (automationTarget) {
    list.push({
      id: `auto-${automationTarget.id}`,
      label: `${automationTarget.short}ドローン`,
      detail: `${resources[automationTarget.input].short}の投入を自動化`,
      cost: automationTarget.autoCost,
      pos: { x: automationTarget.pos.x - 42, y: automationTarget.pos.y + 104 },
      kind: "auto",
      machine: automationTarget.id,
    });
  }

  if (latest && state.levels[latest.id] < 3) {
    list.push({
      id: `upgrade-${latest.id}`,
      label: `${latest.short}強化`,
      detail: "処理速度と保管量を改善",
      cost: upgradeCost(state, latest.id),
      pos: { x: latest.pos.x + 42, y: latest.pos.y + 104 },
      kind: "upgrade",
      machine: latest.id,
    });
  }

  if (nextMachine && nextMachine.unlockCost > 0) {
    list.push({
      id: `district-${nextMachine.district}`,
      label: `${nextMachine.name}区画`,
      detail: "次の完全な加工ラインを開放",
      cost: nextMachine.unlockCost,
      pos: { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 },
      kind: "district",
      machine: nextMachine.id,
    });
  }

  if (state.speedLevel < 4) {
    list.push({
      id: "speed",
      label: "磁気ブーツ",
      detail: `移動速度 +${Math.round((state.speedLevel + 1) * 10)}%`,
      cost: speedUpgradeCost(state),
      pos: { x: HQ_POS.x - 68, y: HQ_POS.y + 104 },
      kind: "speed",
    });
  }
  return list.slice(0, 3);
};

export const purchases = (state: ScrapState): Purchase[] => {
  if (state.tutorialStep < 4) return [];
  return state.unlocked < 3 ? firstDistrictPurchases(state) : laterPurchases(state);
};

const applyPurchase = (state: ScrapState, purchase: Purchase): ScrapState => {
  const next = cloneState(state);
  delete next.paid[purchase.id];

  if (purchase.kind === "district" && purchase.machine) {
    if (purchase.id === "district-2") {
      // 第二区画は破砕機と洗浄槽を同時に開け、行き先のない素材を作らない。
      next.unlocked = Math.max(next.unlocked, 3);
    } else {
      const index = machines.findIndex((machine) => machine.id === purchase.machine);
      const paired = machines[index + 1]?.district === machines[index]?.district ? index + 2 : index + 1;
      next.unlocked = Math.max(next.unlocked, paired);
    }
  } else if (purchase.kind === "auto") {
    const id = purchase.id === "auto-deliver"
      ? "deliver"
      : purchase.id === "deliver-fast"
        ? "deliver-fast"
        : purchase.machine ?? purchase.id.replace("auto-", "");
    next.automated = Array.from(new Set([...next.automated, id]));
  } else if (purchase.kind === "cash") {
    next.automated = Array.from(new Set([...next.automated, "cash"]));
  } else if (purchase.kind === "upgrade" && purchase.machine) {
    next.levels[purchase.machine] = Math.min(8, next.levels[purchase.machine] + 1);
  } else if (purchase.kind === "carry") {
    next.carryLevel = Math.min(7, next.carryLevel + 1);
  } else if (purchase.kind === "speed") {
    next.speedLevel = Math.min(8, next.speedLevel + 1);
  } else if (purchase.kind === "ship") {
    next.automated = Array.from(new Set([...next.automated, "ship"]));
  }

  if (next.tutorialStep === 4 && (isAutomated(next, "sort") || next.levels.sort > 0)) {
    next.tutorialStep = 5;
  }
  if (next.tutorialStep === 5 && isAutomated(next, "deliver")) {
    next.tutorialStep = 6;
  }
  next.totalActions += 1;
  return next;
};

export const payPurchase = (
  state: ScrapState,
  purchase: Purchase,
  dtMs: number,
): ScrapState => {
  const already = state.paid[purchase.id] ?? 0;
  if (already >= purchase.cost) return applyPurchase(state, purchase);
  if (state.credits <= 0) return state;
  const rate = Math.max(60, purchase.cost / 2.5);
  const amount = Math.min(
    state.credits,
    purchase.cost - already,
    (rate * dtMs) / 1000,
  );
  if (amount <= 0) return state;
  const next = cloneState(state);
  next.credits -= amount;
  next.paid[purchase.id] = already + amount;
  if (next.paid[purchase.id] + 0.001 >= purchase.cost) {
    return applyPurchase(next, purchase);
  }
  return next;
};

export const purchaseRemaining = (state: ScrapState, purchase: Purchase) =>
  Math.max(0, purchase.cost - (state.paid[purchase.id] ?? 0));

export type Guidance = {
  label: string;
  pos: Vec | null;
  kind: "pickup" | "input" | "output" | "hq" | "purchase" | "wait";
};

const recommendedPurchase = (state: ScrapState) => {
  const list = purchases(state);
  if (state.tutorialStep === 4) {
    return list.find((item) => item.id === "auto-sort") ?? list[0] ?? null;
  }
  if (state.tutorialStep === 5) {
    return list.find((item) => item.id === "auto-deliver") ?? list[0] ?? null;
  }
  return list.find((item) => state.credits >= purchaseRemaining(state, item)) ?? null;
};

export const guidance = (state: ScrapState): Guidance => {
  if (state.restoration >= 100) {
    return { label: "惑星再生完了！ 自動工場をさらに強化しよう", pos: null, kind: "wait" };
  }

  const first = machines[0];
  if (state.tutorialStep === 0) {
    return { label: "漂着ゴミを3個拾おう", pos: sourcePickupPos(), kind: "pickup" };
  }
  if (state.tutorialStep === 1) {
    return { label: "磁力選別機の投入口へ運ぼう", pos: machineInputPos(first), kind: "input" };
  }
  if (state.tutorialStep === 2) {
    if (state.resources.sorted > 0) {
      return { label: "受取口で外壁補修材を受け取ろう", pos: machineOutputPos(first), kind: "output" };
    }
    return { label: "外壁補修材を製造中…", pos: machineOutputPos(first), kind: "wait" };
  }
  if (state.tutorialStep === 3) {
    return { label: "外壁補修材を惑星復旧本部へ運ぼう", pos: hqDropPos(), kind: "hq" };
  }
  if (state.tutorialStep === 4 || state.tutorialStep === 5) {
    const buy = recommendedPurchase(state);
    if (buy) {
      return { label: `${buy.label}を購入しよう`, pos: buy.pos, kind: "purchase" };
    }
  }

  const active = contract(state);
  if (state.carry.kind) {
    if (state.carry.kind === active.resource) {
      return {
        label: `${resources[active.resource].name}を惑星復旧本部へ運ぼう`,
        pos: hqDropPos(),
        kind: "hq",
      };
    }
    const nextMachine = machines.find(
      (machine) => machineUnlocked(state, machine.id) && machine.input === state.carry.kind,
    );
    if (nextMachine) {
      return {
        label: `${nextMachine.name}の投入口へ運ぼう`,
        pos: machineInputPos(nextMachine),
        kind: "input",
      };
    }
    return { label: "この素材の行き先を確認しています", pos: null, kind: "wait" };
  }

  const ready = [...machines]
    .slice(0, state.unlocked)
    .reverse()
    .find((machine) => state.resources[machine.output] > 0);
  if (ready) {
    return {
      label: `${ready.name}の受取口で${resources[ready.output].short}を受け取ろう`,
      pos: machineOutputPos(ready),
      kind: "output",
    };
  }

  const full = machines
    .slice(0, state.unlocked)
    .find((machine) => state.resources[machine.output] >= 6 + state.levels[machine.id] * 2);
  if (full) {
    return { label: `${full.name}の受取口が満杯です`, pos: machineOutputPos(full), kind: "output" };
  }

  const buy = recommendedPurchase(state);
  if (buy && state.credits >= purchaseRemaining(state, buy)) {
    return { label: `${buy.label}を購入できます`, pos: buy.pos, kind: "purchase" };
  }

  const running = machines
    .slice(0, state.unlocked)
    .find((machine) => state.inputs[machine.id] > 0);
  if (running) {
    return { label: `${running.name}で加工中…`, pos: machineOutputPos(running), kind: "wait" };
  }

  const rawRoom = machineCapacity(state, "sort") - state.inputs.sort;
  if (rawRoom > 0 && state.resources.raw > 0 && !isAutomated(state, "sort")) {
    return { label: "漂着ゴミを拾って磁力選別機へ運ぼう", pos: sourcePickupPos(), kind: "pickup" };
  }

  if (isAutomated(state, "sort") && !isAutomated(state, "deliver")) {
    return { label: "補修材が完成するまで少し待とう", pos: machineOutputPos(first), kind: "wait" };
  }

  return {
    label: `${active.name}をあと${Math.max(0, active.amount - state.orderDelivered)}個納品しよう`,
    pos: machineOutputPos(machines[Math.max(0, state.unlocked - 1)]),
    kind: "wait",
  };
};

export const objective = (state: ScrapState) => guidance(state).label;
