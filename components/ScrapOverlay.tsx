"use client";

export default function ScrapOverlay() {
  return (
    <div className="scrap-world-overlay" aria-hidden="true">
      <div className="scrap-haze" />
      <div className="scrap-stack scrap-stack-a"><i /><i /><i /></div>
      <div className="scrap-stack scrap-stack-b"><i /><i /></div>
      <div className="scrap-crane">
        <span className="scrap-crane-mast" />
        <span className="scrap-crane-arm" />
        <span className="scrap-crane-cable" />
        <span className="scrap-crane-claw">⌄</span>
      </div>
      <div className="scrap-conveyor">
        <div className="scrap-belt">
          {Array.from({ length: 10 }, (_, i) => (
            <span className="scrap-chunk" key={i} style={{ "--i": i } as React.CSSProperties}>
              {i % 3 === 0 ? "▰" : i % 3 === 1 ? "⬡" : "◼"}
            </span>
          ))}
        </div>
        <div className="scrap-rollers">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
      </div>
      <div className="scrap-machine scrap-machine-a">
        <b>01</b><span className="scrap-light"/><em>SELECT</em>
      </div>
      <div className="scrap-machine scrap-machine-b">
        <b>02</b><span className="scrap-light"/><em>CRUSH</em>
      </div>
      <div className="scrap-pipe scrap-pipe-a" />
      <div className="scrap-pipe scrap-pipe-b" />
      <div className="scrap-zone-label">RECYCLING LINE // ACTIVE</div>
    </div>
  );
}
