from pathlib import Path

path = Path("lib/shop.ts")
text = path.read_text()

old = '''/** その一歩で棟の壁をまたぐか（戸口・渡り廊下のところだけ通れる） */
export const wallBlocked = (state: ShopState, from: Vec, to: Vec) => {
  if (!wallsOn()) return false;
  const { rooms, openings } = wallData(state);
  for (const room of rooms) {
    if (inRect(room.rect, from) === inRect(room.rect, to)) continue;
    // またいだ。穴の中を通っているなら通す
    if (openings.some((hole) => inRect(hole.rect, to) || inRect(hole.rect, from))) break;
    return true;
  }
  return false;
};'''

new = '''/** 移動線が穴の長方形を横切るか。端点が穴の中に無くても通過を拾う。 */
const segmentHitsRect = (rect: Rect, from: Vec, to: Vec) => {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);
  return maxX >= rect.x0 && minX <= rect.x1 && maxY >= rect.y0 && minY <= rect.y1;
};

/**
 * 表通りの戸口を横切ったか。
 * 戸口は棟の南端にあるので、壁をまたいだ瞬間の x を直接見る。
 * モバイルでフレーム間の移動量が大きくても、見えている暖簾を通れば必ず抜けられる。
 */
const crossesSouthDoor = (
  room: { id: string; rect: Rect },
  hole: Opening,
  from: Vec,
  to: Vec,
) => {
  if (!hole.nodes.includes(room.id) || !hole.nodes.includes("out")) return false;
  const dy = to.y - from.y;
  if (Math.abs(dy) < 0.0001) return false;
  const t = (room.rect.y1 - from.y) / dy;
  if (t < 0 || t > 1) return false;
  const x = from.x + (to.x - from.x) * t;
  return x >= hole.rect.x0 - 10 && x <= hole.rect.x1 + 10;
};

/** その一歩で棟の壁をまたぐか（戸口・渡り廊下のところだけ通れる） */
export const wallBlocked = (state: ShopState, from: Vec, to: Vec) => {
  if (!wallsOn()) return false;
  const { rooms, openings } = wallData(state);
  for (const room of rooms) {
    if (inRect(room.rect, from) === inRect(room.rect, to)) continue;
    const open = openings.some(
      (hole) =>
        hole.nodes.includes(room.id) &&
        (segmentHitsRect(hole.rect, from, to) || crossesSouthDoor(room, hole, from, to)),
    );
    if (!open) return true;
  }
  return false;
};'''

if old not in text:
    raise SystemExit("Expected wallBlocked block not found; refusing broad replacement")

path.write_text(text.replace(old, new, 1))
