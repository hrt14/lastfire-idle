"use client";

import type { ReactNode } from "react";
import "@/data/aquarium-balance";

/**
 * 水族館の登録とバランス調整を、Pageより外側で先に適用する。
 * サーバー描画とクライアント操作で同じステージ定義を使うためのwrapper。
 */
export default function AquariumStageRegistry({ children }: { children: ReactNode }) {
  return children;
}
