import { readFileSync, writeFileSync } from "node:fs";

const patch = (path, edits) => {
  let source = readFileSync(path, "utf8");
  for (const [pattern, replacement, label] of edits) {
    if (typeof replacement === "string" && source.includes(replacement)) continue;
    const next = source.replace(pattern, replacement);
    if (next === source) throw new Error(`${path}: ${label}`);
    source = next;
  }
  writeFileSync(path, source);
};

patch("components/ScrapPlanet.tsx", [
  [/  sellCarriedRobots,\n  type MachineDef,/, `  saleValue,
  sellCarried,
  type MachineDef,`, "imports"],
  [/const INTERACT_RADIUS = 34;/, "const INTERACT_RADIUS = 46;", "radius"],
  [/  const interactionRef = useRef\(0\);\n/, "", "interaction ref"],
  [/    let raf = 0;\n    let last = performance\.now\(\);/, `    let raf = 0;
    let last = performance.now();
    const camera = { x: 0, y: 0 };`, "camera state"],
  [/next = pickup\(next, "raw"\);/, 'next = pickup(next, "raw", carryCapacity(next));', "source pickup"],
  [/if \(distance\(player, inputPos\(machine\)\) < INTERACT_RADIUS\) next = deposit\(next, machine\.id\);/, `if (distance(player, inputPos(machine)) < INTERACT_RADIUS) {
          next = deposit(next, machine.id, carryCapacity(next));
        }`, "deposit"],
  [/if \(distance\(player, outputPos\(machine\)\) < INTERACT_RADIUS\) next = pickup\(next, machine\.output\);/, `if (distance(player, outputPos(machine)) < INTERACT_RADIUS) {
          next = pickup(next, machine.output, carryCapacity(next));
        }`, "output pickup"],
  [/if \(distance\(player, \{ x: SHIP_POS\.x, y: SHIP_POS\.y \+ 40 \}\) < 43\) \{\n        next = sellCarriedRobots\(next\);\n      \}/, `if (distance(player, { x: SHIP_POS.x, y: SHIP_POS.y + 40 }) < 52) {
        next = sellCarried(next, carryCapacity(next));
      }`, "sale interaction"],
  [/      interactionRef\.current \+= dt;\n      if \(interactionRef\.current >= 170\) \{\n        interactionRef\.current = 0;\n        state = interact\(state\);\n      \}/, "      state = interact(state);", "per frame interaction"],
  [/        const camera = \{\n          x: clamp\(state\.player\.x - width \/ 2, 0, Math\.max\(0, SCRAP_WORLD\.w - width\)\),\n          y: clamp\(state\.player\.y - height \/ 2, 0, Math\.max\(0, SCRAP_WORLD\.h - height\)\),\n        \};/, `        const targetCamera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
        };
        const follow = Math.min(1, (dt / 1000) * 6);
        camera.x += (targetCamera.x - camera.x) * follow;
        camera.y += (targetCamera.y - camera.y) * follow;`, "smooth camera"],
  [/  const pointerDown = useCallback\(\(event: React\.PointerEvent<HTMLCanvasElement>\) => \{\n    const rect/, `  const pointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect`, "pointer down"],
  [/  const pointerMove = useCallback\(\(event: React\.PointerEvent<HTMLCanvasElement>\) => \{\n    const joy/, `  const pointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const joy`, "pointer move"],
  [/    const length = Math\.hypot\(rawX, rawY\);\n    const max = 38;\n    const scale = length > max \? max \/ length : 1;\n    joystickRef\.current = \{\n      \.\.\.joy,\n      x: joy\.startX \+ rawX \* scale,\n      y: joy\.startY \+ rawY \* scale,\n      dx: clamp\(rawX \/ max, -1, 1\),\n      dy: clamp\(rawY \/ max, -1, 1\),\n    \};/, `    const length = Math.hypot(rawX, rawY);
    const maxVisual = 42;
    const visualScale = length > maxVisual ? maxVisual / length : 1;
    const deadZone = 4;
    const strength = length <= deadZone ? 0 : Math.min(1, (length - deadZone) / 30);
    const nx = length > 0 ? rawX / length : 0;
    const ny = length > 0 ? rawY / length : 0;
    joystickRef.current = {
      ...joy,
      x: joy.startX + rawX * visualScale,
      y: joy.startY + rawY * visualScale,
      dx: nx * strength,
      dy: ny * strength,
    };`, "joystick"],
  [/"出荷ポート"/, '"再生資源取引所"', "trade title"],
  [/"完成ロボ 1体 = 2,600 C"/, '"加工品を運ぶとクレジットに交換"', "trade detail"],
  [/<li>宇宙ゴミや完成品へ近づくと自動で拾い、機械の投入口へ近づくと自動で投入します。<\/li>\n              <li>緑の枠に立つとクレジットが吸い出され、設備建設・強化・作業ロボ雇用が進みます。<\/li>/, `<li>宇宙ゴミを拾って機械へ投入し、完成した加工品を受け取ります。</li>
              <li>加工品を再生資源取引所へ運ぶとクレジットになります。高い工程ほど高値で売れます。</li>
              <li>緑の枠に立つとクレジットが吸い出され、次の設備建設・強化・作業ロボ雇用が進みます。</li>`, "help"],
]);

patch("lib/scrap.ts", [
  [/export const SHIP_POS: Vec = \{ x: 260, y: 600 \};/, "export const SHIP_POS: Vec = { x: 390, y: 470 };", "trade position"],
  [/};\n\nexport const machines: MachineDef\[\] = \[/, `};

export const saleValues: Record<ResourceId, number> = {
  raw: 0,
  sorted: 15,
  crushed: 45,
  washed: 130,
  molten: 380,
  ingot: 1100,
  parts: 3200,
  robots: 9000,
};

export const saleValue = (kind: ResourceId) => saleValues[kind] ?? 0;

export const machines: MachineDef[] = [`, "sale values"],
  [/  raw: 5,/, "  raw: 6,", "starting scrap"],
  [/  credits: 25,/, "  credits: 0,", "starting credits"],
  [/export const moveSpeed = \(state: ScrapState\) => 118 \* \(1 \+ state\.speedLevel \* 0\.075\);/, "export const moveSpeed = (state: ScrapState) => 128 * (1 + state.speedLevel * 0.1);", "speed"],
  [/      next\.credits \+= machine\.reward \* made;\n/, "", "remove phantom income"],
  [/export const sellCarriedRobots = \(state: ScrapState, amount = 1\): ScrapState => \{\n  if \(state\.carry\.kind !== "robots" \|\| state\.carry\.amount <= 0\) return state;\n  const sold = Math\.min\(amount, state\.carry\.amount\);\n  const next = cloneState\(state\);\n  next\.carry\.amount -= sold;\n  if \(next\.carry\.amount <= 0\) next\.carry = \{ kind: null, amount: 0 \};\n  next\.credits \+= sold \* 2600;\n  next\.totalSold \+= sold;\n  next\.totalActions \+= sold;\n  return next;\n\};/, `export const sellCarried = (state: ScrapState, amount = 1): ScrapState => {
  const kind = state.carry.kind;
  if (!kind || kind === "raw" || state.carry.amount <= 0) return state;
  const price = saleValue(kind);
  const sold = Math.min(amount, state.carry.amount);
  const next = cloneState(state);
  next.carry.amount -= sold;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.credits += sold * price;
  next.totalSold += sold;
  next.totalActions += sold;
  return next;
};`, "generic sale"],
  [/    if \(machine\) return `\$\{machine\.name\}の投入口へ運ぼう`;\n    if \(state\.carry\.kind === "robots"\) return "出荷ポートへ完成ロボットを運ぼう";/, `    if (machine) return \`\${machine.name}の投入口へ運ぼう\`;
    if (state.carry.kind !== "raw") {
      return \`再生資源取引所へ運ぼう（1個 \${saleValue(state.carry.kind).toLocaleString("ja-JP")} C）\`;
    }`, "sale objective"],
  [/      next\.credits \+= 2600;/, '      next.credits += saleValue("robots");', "auto sale price"],
  [/"完成ロボットを自動出荷"/, '"完成ロボットを自動売却"', "auto sale label"],
]);
