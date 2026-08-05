export type OceanAreaId =
  | "shallows"
  | "coral"
  | "islands"
  | "openSea"
  | "abyss"
  | "volcano"
  | "iceCity";

export type OceanResourceId =
  | "fish"
  | "grilled"
  | "shell"
  | "pearl"
  | "tuna"
  | "frozen"
  | "plankton"
  | "biofuel"
  | "deepOre"
  | "alloy"
  | "heatOre"
  | "core"
  | "iceFish"
  | "cityPart";

export type OceanAreaDef = {
  id: OceanAreaId;
  index: number;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  source: OceanResourceId;
  product: OceanResourceId;
  sourceName: string;
  productName: string;
  processorName: string;
  workerName: string;
  transportName: string;
  deliveryName: string;
  sourceEvery: number;
  processMs: number;
  orderSize: number;
  orderReward: number;
  blueReward: number;
  restorationReward: number;
  expandCost: number;
  sourceAutoCost: number;
  processAutoCost: number;
  deliveryAutoCost: number;
  unlockCost: number;
};

export type OceanLineState = {
  wild: number;
  harvested: number;
  input: number;
  output: number;
  processProgress: number;
  sourceProgress: number;
  workerProgress: number;
  transportProgress: number;
  deliveryProgress: number;
  orderProgress: number;
  orders: number;
  expanded: boolean;
  sourceAuto: boolean;
  processAuto: boolean;
  deliveryAuto: boolean;
  level: number;
};

export type OceanCarry = {
  kind: OceanResourceId | null;
  amount: number;
};

export type OceanOfflineReport = {
  elapsedMs: number;
  shells: number;
  orders: number;
  restoration: number;
  produced: Partial<Record<OceanResourceId, number>>;
  bottleneck: string;
};

export type OceanState = {
  version: 1;
  shells: number;
  bluePoints: number;
  restoration: number;
  unlockedAreas: number;
  currentArea: OceanAreaId;
  lines: Record<OceanAreaId, OceanLineState>;
  carry: OceanCarry;
  carryLevel: number;
  totalActions: number;
  totalDelivered: number;
  totalFishCaught: number;
  totalTrashCollected: number;
  totalWaterPurified: number;
  lastSeen: number;
  offlineReport?: OceanOfflineReport;
};

export type OceanPersisted = Partial<OceanState> & { version?: number };

export type OceanPurchase = {
  id: string;
  kind: "expand" | "sourceAuto" | "processAuto" | "deliveryAuto" | "level" | "carry" | "area";
  label: string;
  detail: string;
  cost: number;
  area: OceanAreaId;
};
