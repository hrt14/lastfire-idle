"use client";

import type { ReactNode } from "react";
import "@/data/aquarium";

/**
 * data/aquarium は既存の stage registry に水族館を足す side-effect module。
 * この wrapper を root に置いて、クライアント側でも Page より外側で登録を済ませる。
 */
export default function AquariumStageRegistry({ children }: { children: ReactNode }) {
  return children;
}
