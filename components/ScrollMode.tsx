"use client";

export default function ScrollMode() {
  return (
    <style jsx global>{`
      body {
        touch-action: auto !important;
      }

      .top {
        height: 100svh;
        min-height: 0 !important;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }

      .app,
      .shop,
      canvas {
        touch-action: none;
      }
    `}</style>
  );
}
