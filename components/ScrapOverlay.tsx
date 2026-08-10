"use client";

import type { CSSProperties } from "react";

const chunks = ["▰", "⬡", "◼", "⌁", "▱", "⬢", "◩", "▰", "⬡", "◼", "▱", "⬢"];

export default function ScrapOverlay() {
  return (
    <div className="scrap-world-overlay" aria-hidden="true">
      <div className="scrap-haze" />
      <div className="scrap-distant-city">
        <i /><i /><i /><i /><i /><i /><i />
      </div>

      <div className="scrap-pile scrap-pile-left">
        <span>▱</span><span>◫</span><span>⬡</span><span>▰</span><span>◼</span><span>⌁</span>
      </div>
      <div className="scrap-pile scrap-pile-right">
        <span>◼</span><span>⬢</span><span>▱</span><span>◩</span><span>⌁</span>
      </div>

      <div className="scrap-stack scrap-stack-a"><i /><i /><i /></div>
      <div className="scrap-stack scrap-stack-b"><i /><i /></div>

      <div className="scrap-crane">
        <span className="scrap-crane-mast" />
        <span className="scrap-crane-arm" />
        <span className="scrap-crane-cable" />
        <span className="scrap-crane-claw">⌄</span>
      </div>

      <div className="scrap-conveyor scrap-conveyor-main">
        <div className="scrap-belt">
          {chunks.map((chunk, i) => (
            <span className="scrap-chunk" key={`${chunk}-${i}`} style={{ "--i": i } as CSSProperties}>{chunk}</span>
          ))}
        </div>
        <div className="scrap-rollers">{Array.from({ length: 16 }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className="scrap-conveyor scrap-conveyor-upper">
        <div className="scrap-belt">
          {chunks.slice(0, 8).map((chunk, i) => (
            <span className="scrap-chunk scrap-chunk-small" key={`u-${i}`} style={{ "--i": i } as CSSProperties}>{chunk}</span>
          ))}
        </div>
        <div className="scrap-rollers">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className="scrap-machine scrap-machine-a">
        <b>01</b><span className="scrap-light"/><em>SELECT</em><i className="scrap-fan" />
      </div>
      <div className="scrap-machine scrap-machine-b">
        <b>02</b><span className="scrap-light"/><em>CRUSH</em><i className="scrap-jaw" />
      </div>
      <div className="scrap-machine scrap-machine-c">
        <b>03</b><span className="scrap-light hot"/><em>SMELT</em><i className="scrap-furnace" />
      </div>

      <div className="scrap-tank scrap-tank-a"><i /><b>COOLANT</b></div>
      <div className="scrap-tank scrap-tank-b"><i /><b>RECYCLE</b></div>

      <div className="scrap-pipe scrap-pipe-a" />
      <div className="scrap-pipe scrap-pipe-b" />
      <div className="scrap-pipe scrap-pipe-c" />

      <div className="scrap-rover scrap-rover-a"><i /><i /><b>R-07</b></div>
      <div className="scrap-rover scrap-rover-b"><i /><i /><b>R-12</b></div>

      <div className="scrap-beacon scrap-beacon-a"><i /></div>
      <div className="scrap-beacon scrap-beacon-b"><i /></div>
      <div className="scrap-zone-label">RECYCLING LINE // ACTIVE</div>
      <div className="scrap-zone-label scrap-zone-label-right">PLANETARY RESTORATION GRID</div>
    </div>
  );
}
