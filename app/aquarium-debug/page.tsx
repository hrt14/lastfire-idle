"use client";

import { useEffect, useRef } from "react";
import { drawAquariumHall } from "@/lib/aquariumTheme";

const SAMPLES = [6, 10, 16];
const H = 420;

export default function AquariumDebugPage() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#07131a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    SAMPLES.forEach((index, row) => {
      drawAquariumHall(
        ctx,
        {
          id: `area-${index}`,
          label: `area-${index}`,
          rect: { x0: 0, y0: row * H, x1: 360, y1: row * H + H },
          palette: { floor: "#17313b", deep: "#0b2028", prop: "none" },
        },
        1.5,
      );
    });
  }, []);

  return (
    <main style={{ margin: 0, padding: 0, background: "#07131a", width: 360 }}>
      <canvas ref={ref} width={360} height={H * SAMPLES.length} style={{ display: "block", width: 360, height: H * SAMPLES.length }} />
    </main>
  );
}
