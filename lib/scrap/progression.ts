import {
  HQ_POS,
  machines,
  resources,
  type MachineId,
  type Vec,
} from "@/lib/scrap/data";
import {
  carryCapacity,
  carryUpgradeCost,
  cloneState,
  isAutomated,
  machineUnlocked,
  shipAutoCost,
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
  kind: "unlock" | "auto" | "upgrade" | "carry" | "speed" | "ship";
  machine?: MachineId;
};

export const purchases = (state: ScrapState): Purchase[] => {
  const list: Purchase[] = [];
  const nextMachine = machines[state.unlocked];

  // 最初の2分は、次に買うものを1つだけ見せる。
  // 順番を飛ばしてもチュートリアルが止まらないようにする。
  if (state.tutorialStep < 4) return list;
  if (state.tutorialStep === 4 && nextMachine) {
    return [
      {
        id: `unlock-${nextMachine.id}`,
        label: `${nextMachine.short}ライン建設`,
        detail: `${nextMachine.name}を建てて工程を増やす`,
        cost: nextMachine.unlockCost,
        pos: { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 },
        kind: "unlock",
        machine: nextMachine.id,
      },
    ];
  }
  if (state.tutorialStep === 5 && !isAutomated(state, "sort")) {
    const first = machines[0];
    return [
      {
        id: "auto-sort",
        label: "選別ロボ",
        detail: "宇宙ゴミの投入を自動化",
        cost: first.autoCost,
        pos: { x: first.pos.x - 54, y: first.pos.y + 108 },
        kind: "auto",
        machine: "sort",
      },
    ];
  }

  if (nextMachine) {
    list.push({
      id: `unlock-${nextMachine.id}`,
      label: `${nextMachine.short}ライン建設`,
      detail: `${nextMachine.name}を建てて工程を増やす`,
      cost: nextMachine.unlockCost,
      pos: { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 },
      kind: "unlock",
      machine: nextMachine.id,
    });
  } else if (!isAutomated(state, "ship")) {
    list.push({
      id: "auto-ship",
      label: "派遣ドローン",
      detail: "完成ロボットを復旧現場へ自動派遣",
      cost: shipAutoCost(),
      pos: { x: HQ_POS.x + 65, y: HQ_POS.y + 96 },
      kind: "ship",
    });
  }

  const automationTarget = machines
    .slice(0, state.unlocked)
    .find((machine) => !isAutomated(state, machine.id));
  if (automationTarget) {
    list.push({
      id: `auto-${automationTarget.id}`,
      label: `${automationTarget.short}ロボ`,
      detail: `${resources[automationTarget.input].short}の投入を自動化`,
      cost: automationTarget.autoCost,
      pos: { x: automationTarget.pos.x - 54, y: automationTarget.pos.y + 108 },
      kind: "auto",
      machine: automationTarget.id,
    });
  }

  if (state.carryLevel < 3) {
    list.push({
      id: "carry",
      label: "大型コンテナ",
      detail: `運べる数 ${carryCapacity(state)} → ${carryCapacity(state) + 2}`,
      cost: carryUpgradeCost(state),
      pos: { x: HQ_POS.x - 70, y: HQ_POS.y + 96 },
      kind: "carry",
    });
  } else {
    const latest = machines[Math.max(0, state.unlocked - 1)];
    if (state.levels[latest.id] < 8) {
      list.push({
        id: `upgrade-${latest.id}`,
        label: `${latest.short}強化`,
        detail: `処理時間と保管量を改善（LV ${state.levels[latest.id] + 1}）`,
        cost: upgradeCost(state, latest.id),
        pos: { x: latest.pos.x + 54, y: latest.pos.y + 108 },
        kind: "upgrade",
        machine: latest.id,
      });
    } else if (state.speedLevel < 8) {
      list.push({
        id: "speed",
        label: "磁気ブーツ",
        detail: `移動速度 +${Math.round((state.speedLevel + 1) * 9)}%`,
        cost: speedUpgradeCost(state),
        pos: { x: HQ_POS.x - 70, y: HQ_POS.y + 96 },
        kind: "speed",
      });
    }
  }
  return list.slice(0, 3);
};

const applyPurchase = (state: ScrapState, purchase: Purchase): ScrapState => {
  const next = cloneState(state);
  delete next.paid[purchase.id];
  if (purchase.kind === "unlock" && purchase.machine) {
    const index = machines.findIndex((machine) => machine.id === purchase.machine);
    next.unlocked = Math.max(next.unlocked, index + 1);
    if (purchase.machine === "crush" && next.tutorialStep === 4) {
      next.tutorialStep = 5;
    }
  } else if (purchase.kind === "auto" && purchase.machine) {
    next.automated = Array.from(new Set([...next.automated, purchase.machine]));
    if (purchase.machine === "sort" && next.tutorialStep === 5) {
      next.tutorialStep = 6;
    }
  } else if (purchase.kind === "upgrade" && purchase.machine) {
    next.levels[purchase.machine] = Math.min(8, next.levels[purchase.machine] + 1);
  } else if (purchase.kind === "carry") {
    next.carryLevel = Math.min(8, next.carryLevel + 1);
  } else if (purchase.kind === "speed") {
    next.speedLevel = Math.min(8, next.speedLevel + 1);
  } else if (purchase.kind === "ship") {
    next.automated = Array.from(new Set([...next.automated, "ship"]));
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
  const rate = Math.max(36, purchase.cost / 2.2);
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

export const objective = (state: ScrapState): string => {
  if (state.restoration >= 100) {
    return "惑星再生完了！ 自動工場を眺めるか、さらに効率を高めよう";
  }
  const tutorial = [
    "宇宙ゴミを3個拾おう",
    "磁力選別機の黄色い投入口へ運ぼう",
    "加工を待ち、緑の受取口で選別材を受け取ろう",
    "選別材3個を復旧本部へ納品しよう",
    "緑の建設枠で破砕機を建てよう",
    "選別機の作業ロボを雇って、投入を自動化しよう",
  ];
  if (state.tutorialStep < tutorial.length) return tutorial[state.tutorialStep];

  const active = contract(state);
  if (state.carry.kind) {
    if (state.carry.kind === active.resource) {
      return `復旧本部へ${resources[active.resource].short}を納品しよう`;
    }
    const nextMachine = machines.find(
      (machine) =>
        machineUnlocked(state, machine.id) && machine.input === state.carry.kind,
    );
    if (nextMachine) return `${nextMachine.name}の黄色い投入口へ運ぼう`;
    return "手持ちの素材を使える工程へ運ぼう";
  }

  const ready = [...machines]
    .slice(0, state.unlocked)
    .reverse()
    .find((machine) => state.resources[machine.output] > 0);
  if (ready) {
    return `${ready.name}の緑側で${resources[ready.output].short}を受け取ろう`;
  }

  const nextMachine = machines[state.unlocked];
  if (nextMachine && state.credits >= nextMachine.unlockCost) {
    return `建設枠で${nextMachine.name}を建てよう`;
  }

  const autoTarget = machines
    .slice(0, state.unlocked)
    .find((machine) => !isAutomated(state, machine.id));
  if (autoTarget && state.credits >= autoTarget.autoCost) {
    return `${autoTarget.short}ロボを雇い、古い仕事を自動化しよう`;
  }

  const running = machines
    .slice(0, state.unlocked)
    .find((machine) => state.inputs[machine.id] > 0);
  if (running) return `${running.name}で加工中…`;

  if (state.resources.raw > 0) return "宇宙ゴミを拾い、加工ラインを動かそう";
  return `${active.name}：${active.amount - state.orderDelivered}個を納品しよう`;
};
