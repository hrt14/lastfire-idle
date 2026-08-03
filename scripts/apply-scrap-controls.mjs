import { readFileSync, writeFileSync } from "node:fs";

const apply = (path, replacements) => {
  let source = readFileSync(path, "utf8");
  let changed = false;

  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      throw new Error(`${path}: ${label} anchor not found`);
    }
    source = source.replace(from, to);
    changed = true;
  }

  if (changed) writeFileSync(path, source);
};

apply("components/ScrapPlanet.tsx", [
  {
    label: "interaction radius",
    from: "const INTERACT_RADIUS = 34;",
    to: "const INTERACT_RADIUS = 46;",
  },
  {
    label: "interaction timer ref",
    from: "  const interactionRef = useRef(0);\n",
    to: "",
  },
  {
    label: "camera state",
    from: "    let raf = 0;\n    let last = performance.now();",
    to: "    let raf = 0;\n    let last = performance.now();\n    const camera = { x: 0, y: 0 };",
  },
  {
    label: "source pickup",
    from: "        next = pickup(next, \"raw\");",
    to: "        next = pickup(next, \"raw\", carryCapacity(next));",
  },
  {
    label: "machine deposit",
    from: "        if (distance(player, inputPos(machine)) < INTERACT_RADIUS) next = deposit(next, machine.id);",
    to: "        if (distance(player, inputPos(machine)) < INTERACT_RADIUS) {\n          next = deposit(next, machine.id, carryCapacity(next));\n        }",
  },
  {
    label: "machine pickup",
    from: "        if (distance(player, outputPos(machine)) < INTERACT_RADIUS) next = pickup(next, machine.output);",
    to: "        if (distance(player, outputPos(machine)) < INTERACT_RADIUS) {\n          next = pickup(next, machine.output, carryCapacity(next));\n        }",
  },
  {
    label: "shipping",
    from: "        next = sellCarriedRobots(next);",
    to: "        next = sellCarriedRobots(next, carryCapacity(next));",
  },
  {
    label: "per-frame interaction",
    from: `      interactionRef.current += dt;
      if (interactionRef.current >= 170) {
        interactionRef.current = 0;
        state = interact(state);
      }`,
    to: "      state = interact(state);",
  },
  {
    label: "smooth camera",
    from: `        const camera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
        };`,
    to: `        const targetCamera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
        };
        const follow = Math.min(1, (dt / 1000) * 6);
        camera.x += (targetCamera.x - camera.x) * follow;
        camera.y += (targetCamera.y - camera.y) * follow;`,
  },
  {
    label: "pointer down",
    from: `  const pointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();`,
    to: `  const pointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();`,
  },
  {
    label: "pointer move",
    from: `  const pointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const joy = joystickRef.current;`,
    to: `  const pointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const joy = joystickRef.current;`,
  },
  {
    label: "joystick response",
    from: `    const length = Math.hypot(rawX, rawY);
    const max = 38;
    const scale = length > max ? max / length : 1;
    joystickRef.current = {
      ...joy,
      x: joy.startX + rawX * scale,
      y: joy.startY + rawY * scale,
      dx: clamp(rawX / max, -1, 1),
      dy: clamp(rawY / max, -1, 1),
    };`,
    to: `    const length = Math.hypot(rawX, rawY);
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
    };`,
  },
]);

apply("lib/scrap.ts", [
  {
    label: "movement speed",
    from: "export const moveSpeed = (state: ScrapState) => 118 * (1 + state.speedLevel * 0.075);",
    to: "export const moveSpeed = (state: ScrapState) => 128 * (1 + state.speedLevel * 0.1);",
  },
]);
