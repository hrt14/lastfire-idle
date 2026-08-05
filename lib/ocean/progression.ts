import type {
  OceanAreaId,
  OceanPurchase,
  OceanState,
} from "@/lib/ocean/contracts";
import { oceanArea, oceanAreas, oceanResources } from "@/lib/ocean/data";
import { carryCapacity, cloneOcean } from "@/lib/ocean/state";

export const levelCost = (state: OceanState, id: OceanAreaId) => {
  const def = oceanArea(id);
  return Math.ceil((def.expandCost * 0.8 + 80) * Math.pow(1.75, state.lines[id].level));
};

export const carryUpgradeCost = (state: OceanState) =>
  Math.ceil(120 * Math.pow(1.85, state.carryLevel));

export const availablePurchases = (state: OceanState, id: OceanAreaId): OceanPurchase[] => {
  const def = oceanArea(id);
  const line = state.lines[id];
  const list: OceanPurchase[] = [];

  if (line.orders < 1) return list;

  if (!line.expanded) {
    return [
      {
        id: `expand-${id}`,
        kind: "expand",
        label: id === "shallows" ? "干物台を建設" : `${def.processorName}を拡張`,
        detail: "処理速度と保管容量が上がる",
        cost: def.expandCost,
        area: id,
      },
    ];
  }

  if (!line.sourceAuto) {
    return [
      {
        id: `source-${id}`,
        kind: "sourceAuto",
        label: `${def.workerName}を配置`,
        detail: `${def.sourceName}から自動で回収する`,
        cost: def.sourceAutoCost,
        area: id,
      },
    ];
  }

  if (!line.processAuto) {
    list.push({
      id: `process-${id}`,
      kind: "processAuto",
      label: `${def.transportName}を配置`,
      detail: `${def.processorName}へ自動投入する`,
      cost: def.processAutoCost,
      area: id,
    });
  }

  if (line.processAuto && !line.deliveryAuto) {
    list.push({
      id: `deliver-${id}`,
      kind: "deliveryAuto",
      label: `${def.deliveryName}を配置`,
      detail: `${def.productName}の依頼を自動で完了する`,
      cost: def.deliveryAutoCost,
      area: id,
    });
  }

  if (line.level < 10) {
    list.push({
      id: `level-${id}`,
      kind: "level",
      label: `${def.processorName} LV${line.level + 2}`,
      detail: "速度と各保管容量を強化",
      cost: levelCost(state, id),
      area: id,
    });
  }

  if (state.carryLevel < 7) {
    list.push({
      id: "carry-ocean",
      kind: "carry",
      label: "大型船員バッグ",
      detail: `運搬 ${carryCapacity(state)} → ${carryCapacity(state) + 1}`,
      cost: carryUpgradeCost(state),
      area: id,
    });
  }

  const next = oceanAreas[def.index + 1];
  if (
    next &&
    state.unlockedAreas === def.index + 1 &&
    line.orders >= 3 &&
    line.sourceAuto &&
    line.processAuto &&
    line.deliveryAuto
  ) {
    list.unshift({
      id: `area-${next.id}`,
      kind: "area",
      label: `${next.icon} ${next.name}へ出航`,
      detail: next.subtitle,
      cost: def.unlockCost,
      area: id,
    });
  }

  return list.slice(0, 3);
};

export const buyOceanPurchase = (
  state: OceanState,
  purchase: OceanPurchase,
): OceanState => {
  if (state.shells + 0.001 < purchase.cost) return state;
  const next = cloneOcean(state);
  const line = next.lines[purchase.area];
  next.shells -= purchase.cost;

  if (purchase.kind === "expand") line.expanded = true;
  if (purchase.kind === "sourceAuto") line.sourceAuto = true;
  if (purchase.kind === "processAuto") line.processAuto = true;
  if (purchase.kind === "deliveryAuto") line.deliveryAuto = true;
  if (purchase.kind === "level") line.level = Math.min(10, line.level + 1);
  if (purchase.kind === "carry") next.carryLevel = Math.min(7, next.carryLevel + 1);
  if (purchase.kind === "area") {
    next.unlockedAreas = Math.min(oceanAreas.length, next.unlockedAreas + 1);
    next.currentArea = oceanAreas[next.unlockedAreas - 1].id;
  }
  next.totalActions += 1;
  return next;
};

export const selectOceanArea = (state: OceanState, id: OceanAreaId): OceanState => {
  const index = oceanAreas.findIndex((area) => area.id === id);
  if (index < 0 || index >= state.unlockedAreas) return state;
  return { ...state, currentArea: id };
};

export const oceanObjective = (state: OceanState): string => {
  const def = oceanArea(state.currentArea);
  const line = state.lines[state.currentArea];
  const carry = state.carry;

  if (state.restoration >= 100) return "海の星は再生しました。海上・海底都市をさらに発展させよう";

  if (carry.amount > 0) {
    if (carry.kind === def.source) return `${def.processorName}へ${def.sourceName}の資源を投入しよう`;
    if (carry.kind === def.product) {
      return `復旧依頼へ${def.productName}を納品しよう（${line.orderProgress}/${def.orderSize}）`;
    }
    return "手持ちの資源を元の海域で使おう";
  }

  if (line.orders === 0) {
    if (line.input > 0 && line.output <= 0) return `${def.processorName}で加工中…`;
    if (line.output > 0) return `${def.productName}を受け取ろう`;
    return `${def.sourceName}から${oceanResources[def.source].name}を集めよう`;
  }

  if (!line.expanded) return idFirst(state.currentArea, "干物台を建てよう", `${def.processorName}を拡張しよう`);
  if (!line.sourceAuto) return `${def.workerName}を配置して採集を自動化しよう`;
  if (!line.processAuto) return `${def.transportName}を配置して投入を自動化しよう`;
  if (!line.deliveryAuto) return `${def.deliveryName}を配置して納品を自動化しよう`;

  const next = oceanAreas[def.index + 1];
  if (next && line.orders < 3) return `復旧依頼をあと${3 - line.orders}回完了しよう`;
  if (next && state.unlockedAreas === def.index + 1) return `${next.name}への航路を開こう`;
  if (!next) return `海底都市を完成させ、海洋再生率100%を目指そう`;
  return `${def.name}の設備を強化しよう`;
};

const idFirst = (id: OceanAreaId, first: string, other: string) =>
  id === "shallows" ? first : other;

export const areaAutomation = (state: OceanState, id: OceanAreaId) => {
  const line = state.lines[id];
  return [line.sourceAuto, line.processAuto, line.deliveryAuto].filter(Boolean).length;
};

export const oceanCompleted = (state: OceanState) =>
  state.unlockedAreas >= oceanAreas.length && state.restoration >= 100;
