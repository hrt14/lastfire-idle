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
    label: "gameplay imports",
    from: `  sellCarriedRobots,
  type MachineDef,`,
    to: `  saleValue,
  scrapBounds,
  sellCarried,
  type MachineDef,`,
  },
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
    from: '        next = pickup(next, "raw");',
    to: '        next = pickup(next, "raw", carryCapacity(next));',
  },
  {
    label: "machine deposit",
    from: '        if (distance(player, inputPos(machine)) < INTERACT_RADIUS) next = deposit(next, machine.id);',
    to: `        if (distance(player, inputPos(machine)) < INTERACT_RADIUS) {
          next = deposit(next, machine.id, carryCapacity(next));
        }`,
  },
  {
    label: "machine pickup",
    from: '        if (distance(player, outputPos(machine)) < INTERACT_RADIUS) next = pickup(next, machine.output);',
    to: `        if (distance(player, outputPos(machine)) < INTERACT_RADIUS) {
          next = pickup(next, machine.output, carryCapacity(next));
        }`,
  },
  {
    label: "generic sale",
    from: `      if (distance(player, { x: SHIP_POS.x, y: SHIP_POS.y + 40 }) < 43) {
        next = sellCarriedRobots(next);
      }`,
    to: `      if (distance(player, { x: SHIP_POS.x, y: SHIP_POS.y + 40 }) < 52) {
        next = sellCarried(next, carryCapacity(next));
      }`,
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
    label: "dynamic movement bounds",
    from: `        const speed = moveSpeed(state);
        state = {
          ...state,
          player: {
            x: clamp(state.player.x + (dx / Math.max(1, length)) * speed * (dt / 1000), 24, SCRAP_WORLD.w - 24),
            y: clamp(state.player.y + (dy / Math.max(1, length)) * speed * (dt / 1000), 92, SCRAP_WORLD.h - 24),
          },
        };`,
    to: `        const speed = moveSpeed(state);
        const bounds = scrapBounds(state);
        state = {
          ...state,
          player: {
            x: clamp(state.player.x + (dx / Math.max(1, length)) * speed * (dt / 1000), 24, bounds.w - 24),
            y: clamp(state.player.y + (dy / Math.max(1, length)) * speed * (dt / 1000), 92, bounds.h - 24),
          },
        };`,
  },
  {
    label: "smooth dynamic camera",
    from: `        const camera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, SCRAP_WORLD.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, SCRAP_WORLD.h - height)),
        };`,
    to: `        const bounds = scrapBounds(state);
        const targetCamera = {
          x: clamp(state.player.x - width / 2, 0, Math.max(0, bounds.w - width)),
          y: clamp(state.player.y - height / 2, 0, Math.max(0, bounds.h - height)),
        };
        const follow = Math.min(1, (dt / 1000) * 6);
        camera.x += (targetCamera.x - camera.x) * follow;
        camera.y += (targetCamera.y - camera.y) * follow;`,
  },
  {
    label: "visible machines",
    from: `        drawFloor(ctx, camera, width, height);
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        for (const machine of machines) {
          drawConnection(ctx, sourceFor(machine), inputPos(machine), isAutomated(state, machine.id), now);
        }
        drawSource(ctx, state, now);
        for (const machine of machines) drawMachine(ctx, state, machine, now);
        drawShipping(ctx, state, now);
        for (const purchase of purchases(state)) drawPurchase(ctx, state, purchase, state.player);
        for (const machine of machines) {
          if (isAutomated(state, machine.id) && machineUnlocked(state, machine.id)) drawRobot(ctx, machine, now);
        }
        drawPlayer(ctx, state, skinRef.current ?? equippedSkin(), now);`,
    to: `        drawFloor(ctx, camera, width, height);
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        const visibleMachines = machines.slice(0, Math.min(machines.length, state.unlocked + 1));
        for (const machine of visibleMachines) {
          drawConnection(ctx, sourceFor(machine), inputPos(machine), isAutomated(state, machine.id), now);
        }
        drawSource(ctx, state, now);
        for (const machine of visibleMachines) drawMachine(ctx, state, machine, now);
        drawShipping(ctx, state, now);
        for (const purchase of purchases(state)) drawPurchase(ctx, state, purchase, state.player);
        for (const machine of visibleMachines) {
          if (isAutomated(state, machine.id) && machineUnlocked(state, machine.id)) drawRobot(ctx, machine, now);
        }

        const target = (() => {
          if (state.carry.amount === 0 && state.resources.raw > 0) {
            return { x: SOURCE_POS.x, y: SOURCE_POS.y + 62 };
          }
          if (state.carry.kind) {
            const machine = machines.find(
              (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,
            );
            if (machine) return inputPos(machine);
            if (state.carry.kind !== "raw") return { x: SHIP_POS.x, y: SHIP_POS.y + 40 };
          }
          const ready = machines.find(
            (machine) => machineUnlocked(state, machine.id) && state.resources[machine.output] > 0,
          );
          if (ready) return outputPos(ready);
          const nextMachine = machines[state.unlocked];
          return nextMachine ? { x: nextMachine.pos.x, y: nextMachine.pos.y + 112 } : null;
        })();

        if (target && distance(state.player, target) > 48) {
          const pulse = 0.5 + Math.sin(now * 0.006) * 0.5;
          ctx.save();
          ctx.setLineDash([6, 8]);
          ctx.lineDashOffset = -((now * 0.04) % 14);
          ctx.strokeStyle = "rgba(255,209,102,0.72)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(state.player.x, state.player.y - 8);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = \`rgba(255,209,102,\${0.5 + pulse * 0.45})\`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(target.x, target.y, 20 + pulse * 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawPlayer(ctx, state, skinRef.current ?? equippedSkin(), now);`,
  },
  {
    label: "shipping title",
    from: '  ctx.fillText("出荷ポート", x, y - 50);',
    to: '  ctx.fillText("再生資源取引所", x, y - 50);',
  },
  {
    label: "shipping detail",
    from: '  ctx.fillText("完成ロボ 1体 = 2,600 C", x, y + 62);',
    to: '  ctx.fillText("加工品を運ぶとクレジットに交換", x, y + 62);',
  },
  {
    label: "shipping live value",
    from: `  ctx.fillStyle = "#0f172a";
  roundRect(ctx, x - 42, y - 35, 84, 52, 8);
  ctx.fill();
  ctx.fillStyle = "#7dd3fc";
  ctx.beginPath();`,
    to: `  ctx.fillStyle = "#0f172a";
  roundRect(ctx, x - 42, y - 35, 84, 52, 8);
  ctx.fill();
  const carriedValue =
    state.carry.kind && state.carry.kind !== "raw"
      ? saleValue(state.carry.kind) * state.carry.amount
      : 0;
  if (carriedValue > 0) {
    ctx.fillStyle = "#ffd166";
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.fillText(\`+\${carriedValue.toLocaleString("ja-JP")} C\`, x, y + 32);
  }
  ctx.fillStyle = "#7dd3fc";
  ctx.beginPath();`,
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
  {
    label: "help sale loop",
    from: `              <li>宇宙ゴミや完成品へ近づくと自動で拾い、機械の投入口へ近づくと自動で投入します。</li>
              <li>緑の枠に立つとクレジットが吸い出され、設備建設・強化・作業ロボ雇用が進みます。</li>`,
    to: `              <li>宇宙ゴミを拾って機械へ投入し、完成した加工品を受け取ります。</li>
              <li>加工品を再生資源取引所へ運ぶとクレジットになります。高い工程ほど高値で売れます。</li>
              <li>緑の枠に立つとクレジットが吸い出され、次の設備建設・強化・作業ロボ雇用が進みます。</li>`,
  },
]);

apply("lib/scrap.ts", [
  {
    label: "trade station position",
    from: "export const SHIP_POS: Vec = { x: 260, y: 600 };",
    to: "export const SHIP_POS: Vec = { x: 390, y: 470 };",
  },
  {
    label: "sale values",
    from: `};

export const machines: MachineDef[] = [`,
    to: `};

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

export const machines: MachineDef[] = [`,
  },
  {
    label: "starting scrap",
    from: "  raw: 5,",
    to: "  raw: 6,",
  },
  {
    label: "starting credits",
    from: "  credits: 25,",
    to: "  credits: 0,",
  },
  {
    label: "movement speed",
    from: "export const moveSpeed = (state: ScrapState) => 118 * (1 + state.speedLevel * 0.075);",
    to: "export const moveSpeed = (state: ScrapState) => 128 * (1 + state.speedLevel * 0.1);",
  },
  {
    label: "dynamic world bounds",
    from: `export const isAutomated = (state: ScrapState, id: MachineId | "ship") =>
  state.automated.includes(id);`,
    to: `export const isAutomated = (state: ScrapState, id: MachineId | "ship") =>
  state.automated.includes(id);

export const scrapBounds = (state: ScrapState) => {
  const next = machines[Math.min(state.unlocked, machines.length - 1)];
  const width = Math.min(SCRAP_WORLD.w, Math.max(650, next.pos.x + 160));
  const height = state.unlocked >= 4 ? SCRAP_WORLD.h : 650;
  return { w: width, h: height };
};`,
  },
  {
    label: "remove phantom machine income",
    from: "      next.credits += machine.reward * made;\n",
    to: "",
  },
  {
    label: "generic sale function",
    from: `export const sellCarriedRobots = (state: ScrapState, amount = 1): ScrapState => {
  if (state.carry.kind !== "robots" || state.carry.amount <= 0) return state;
  const sold = Math.min(amount, state.carry.amount);
  const next = cloneState(state);
  next.carry.amount -= sold;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.credits += sold * 2600;
  next.totalSold += sold;
  next.totalActions += sold;
  return next;
};`,
    to: `export const sellCarried = (state: ScrapState, amount = 1): ScrapState => {
  const kind = state.carry.kind;
  if (!kind || kind === "raw" || state.carry.amount <= 0) return state;
  const price = saleValue(kind);
  if (price <= 0) return state;
  const sold = Math.min(amount, state.carry.amount);
  const next = cloneState(state);
  next.carry.amount -= sold;
  if (next.carry.amount <= 0) next.carry = { kind: null, amount: 0 };
  next.credits += sold * price;
  next.totalSold += sold;
  next.totalActions += sold;
  return next;
};`,
  },
  {
    label: "objective sale",
    from: `  if (state.carry.kind) {
    const machine = machines.find(
      (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,
    );
    if (machine) return \`${machine.name}の投入口へ運ぼう\`;
    if (state.carry.kind === "robots") return "出荷ポートへ完成ロボットを運ぼう";
  }`,
    to: `  if (state.carry.kind) {
    const machine = machines.find(
      (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,
    );
    if (machine) return \`${machine.name}の投入口へ運ぼう\`;
    if (state.carry.kind !== "raw") {
      return \`再生資源取引所へ運ぼう（1個 \${saleValue(state.carry.kind).toLocaleString("ja-JP")} C）\`;
    }
  }`,
  },
  {
    label: "auto shipping value",
    from: "      next.credits += 2600;",
    to: "      next.credits += saleValue(\"robots\");",
  },
  {
    label: "auto sale label",
    from: '      detail: "完成ロボットを自動出荷",',
    to: '      detail: "完成ロボットを自動売却",',
  },
]);
