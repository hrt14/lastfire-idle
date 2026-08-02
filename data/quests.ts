import type { Cost } from "@/data/buildings";
import type { Derived, GameState } from "@/lib/game";

export type Quest = {
  id: string;
  title: string;
  detail: string;
  target: number;
  current: (state: GameState, derived: Derived) => number;
  reward: Cost;
};

export const quests: Quest[] = [
  {
    id: "first-spark",
    title: "火を絶やすな",
    detail: "焚き火を10回かき立てる",
    target: 10,
    current: (state) => state.taps,
    reward: { wood: 60 },
  },
  {
    id: "lumber-3",
    title: "薪を確保する",
    detail: "木こり小屋を Lv3 まで育てる",
    target: 3,
    current: (state) => state.levels.lumber,
    reward: { wood: 150 },
  },
  {
    id: "bonfire-3",
    title: "拠点の心臓",
    detail: "焚き火を Lv3 まで育てる",
    target: 3,
    current: (state) => state.levels.bonfire,
    reward: { wood: 250, food: 60 },
  },
  {
    id: "hunter-5",
    title: "雪原の狩人",
    detail: "狩猟小屋を Lv5 まで育てる",
    target: 5,
    current: (state) => state.levels.hunter,
    reward: { food: 400 },
  },
  {
    id: "pop-8",
    title: "仲間が集まる",
    detail: "生存者を8人まで増やす",
    target: 8,
    current: (state) => Math.floor(state.population),
    reward: { wood: 900, coal: 60 },
  },
  {
    id: "mine-8",
    title: "燃料の確保",
    detail: "炭鉱を Lv8 まで育てる",
    target: 8,
    current: (state) => state.levels.mine,
    reward: { coal: 700 },
  },
  {
    id: "blizzard-1",
    title: "はじめての吹雪",
    detail: "吹雪を1回やり過ごす",
    target: 1,
    current: (state) => state.blizzardsSurvived,
    reward: { wood: 2000, coal: 400 },
  },
  {
    id: "shelter-10",
    title: "眠れる場所を",
    detail: "避難所を Lv10 まで育てる",
    target: 10,
    current: (state) => state.levels.shelter,
    reward: { wood: 6000, food: 2500 },
  },
  {
    id: "camp-5",
    title: "拠点レベル5",
    detail: "建物を育てて拠点レベルを5にする",
    target: 5,
    current: (_state, derived) => derived.campLevel,
    reward: { wood: 12000, food: 4000, coal: 2500 },
  },
  {
    id: "furnace-1",
    title: "鋼を打つ",
    detail: "製鉄所を建てる",
    target: 1,
    current: (state) => state.levels.furnace,
    reward: { coal: 6000, steel: 30 },
  },
  {
    id: "pop-25",
    title: "小さな町へ",
    detail: "生存者を25人まで増やす",
    target: 25,
    current: (state) => Math.floor(state.population),
    reward: { food: 30000, steel: 90 },
  },
  {
    id: "blizzard-5",
    title: "冬を越える",
    detail: "吹雪を5回やり過ごす",
    target: 5,
    current: (state) => state.blizzardsSurvived,
    reward: { wood: 90000, coal: 40000, steel: 200 },
  },
  {
    id: "workshop-10",
    title: "技術の芽",
    detail: "工房を Lv10 まで育てる",
    target: 10,
    current: (state) => state.levels.workshop,
    reward: { steel: 900 },
  },
  {
    id: "levels-80",
    title: "見上げるほどの拠点",
    detail: "建物の合計レベルを80にする",
    target: 80,
    current: (_state, derived) => derived.totalLevels,
    reward: { wood: 900000, food: 400000, coal: 300000, steel: 3000 },
  },
  {
    id: "levels-120",
    title: "旅立ちの準備",
    detail: "建物の合計レベルを120にして移住を解禁する",
    target: 120,
    current: (_state, derived) => derived.totalLevels,
    reward: { steel: 12000 },
  },
];
