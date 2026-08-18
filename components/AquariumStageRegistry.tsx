"use client";

import type { ReactNode } from "react";
import "@/data/aquarium-balance-v2";
import "@/data/aquarium-visual-v3";
import "@/data/aquarium-expansion-v6";
import "@/data/aquarium-square-v4";

/**
 * 水族館の登録・バランス・ビジュアル・施設棟と古代棟の拡張・回遊型レイアウト調整を、
 * Pageより外側で先に適用する。
 * サーバー描画とクライアント操作で同じステージ定義を使うためのwrapper。
 */
export default function AquariumStageRegistry({ children }: { children: ReactNode }) {
  return children;
}
