import { readFileSync, writeFileSync } from "node:fs";

const replaceOnce = (path, marker, pattern, replacement) => {
  let source = readFileSync(path, "utf8");
  if (source.includes(marker)) return;
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`${path}: ${marker} anchor not found`);
  writeFileSync(path, next);
};

const interactionReplacement = [
  "      // Sorter stall guard: do not pick up more raw scrap than the sorter can accept.",
  "      const firstMachine = machines[0];",
  "      const rawRoom = Math.max(",
  "        0,",
  "        machineCapacity(next, firstMachine.id) - next.inputs[firstMachine.id],",
  "      );",
  "      if (",
  "        !next.carry.kind &&",
  "        rawRoom > 0 &&",
  "        distance(player, { x: SOURCE_POS.x, y: SOURCE_POS.y + 62 }) < INTERACT_RADIUS",
  "      ) {",
  "        next = pickup(next, \"raw\", Math.min(carryCapacity(next), rawRoom));",
  "      }",
  "      for (const machine of machines) {",
  "        if (!machineUnlocked(next, machine.id)) continue;",
  "        const nearMachine = distance(player, machine.pos) < 80;",
  "        const nearInput = distance(player, inputPos(machine)) < INTERACT_RADIUS;",
  "        const nearOutput = distance(player, outputPos(machine)) < INTERACT_RADIUS;",
  "        if (next.carry.kind === machine.input && (nearInput || nearMachine)) {",
  "          next = deposit(next, machine.id, carryCapacity(next));",
  "        }",
  "        if (",
  "          (!next.carry.kind || next.carry.kind === machine.output) &&",
  "          next.resources[machine.output] > 0 &&",
  "          (nearOutput || nearMachine)",
  "        ) {",
  "          next = pickup(next, machine.output, carryCapacity(next));",
  "        }",
  "      }",
  "      if (distance(player, { x: SHIP_POS.x, y: SHIP_POS.y + 40 })",
].join("\n");

replaceOnce(
  "components/ScrapPlanet.tsx",
  "Sorter stall guard",
  /      if \(distance\(player, \{ x: SOURCE_POS\.x, y: SOURCE_POS\.y \+ 62 \}\) < INTERACT_RADIUS\) \{[\s\S]*?      if \(distance\(player, \{ x: SHIP_POS\.x, y: SHIP_POS\.y \+ 40 \}\)/,
  interactionReplacement,
);

const portLabels = [
  "  ctx.font = SMALL;",
  "  ctx.fillStyle = \"#cbd5e1\";",
  "  ctx.fillText(\"投入\", inPos.x, inPos.y + 30);",
  "  ctx.fillText(\"受取\", outPos.x, outPos.y + 30);",
  "  ctx.fillStyle = \"#94a3b8\";",
  "  ctx.fillText(`${Math.floor(state.inputs[machine.id])}/${machineCapacity(state, machine.id)}`, inPos.x, inPos.y + 43);",
  "  ctx.fillText(`${Math.floor(state.resources[machine.output])}`, outPos.x, outPos.y + 43);",
].join("\n");

replaceOnce(
  "components/ScrapPlanet.tsx",
  'ctx.fillText("投入"',
  /  ctx\.font = SMALL;\n  ctx\.fillStyle = "#cbd5e1";\n  ctx\.fillText\(`\$\{Math\.floor\(state\.inputs\[machine\.id\]\)\}\/\$\{machineCapacity\(state, machine\.id\)\}`, inPos\.x, inPos\.y \+ 36\);\n  ctx\.fillText\(`\$\{Math\.floor\(state\.resources\[machine\.output\]\)\}`, outPos\.x, outPos\.y \+ 36\);/,
  portLabels,
);

const objectiveReplacement = [
  "export const objective = (state: ScrapState): string => {",
  "  if (state.carry.kind) {",
  "    const machine = machines.find(",
  "      (item) => machineUnlocked(state, item.id) && item.input === state.carry.kind,",
  "    );",
  "    if (machine) {",
  "      const room = machineCapacity(state, machine.id) - state.inputs[machine.id];",
  "      if (room > 0) return `${machine.name}へ運ぼう`;",
  "      return `${machine.name}が満杯。加工が進むまで少し待とう`;",
  "    }",
  "    if (state.carry.kind !== \"raw\") {",
  "      return `再生資源取引所へ運ぼう（1個 ${saleValue(state.carry.kind).toLocaleString(\"ja-JP\")} C）`;",
  "    }",
  "    return \"磁力選別機が満杯。手持ちのゴミが入るまで少し待とう\";",
  "  }",
  "",
  "  const ready = machines.find(",
  "    (machine) => machineUnlocked(state, machine.id) && state.resources[machine.output] > 0,",
  "  );",
  "  if (ready) return `${ready.name}の緑側で完成品を受け取ろう`;",
  "",
  "  const running = machines.find(",
  "    (machine) => machineUnlocked(state, machine.id) && state.inputs[machine.id] > 0,",
  "  );",
  "  if (running) return `${running.name}で加工中…完成品は緑側に出る`;",
  "",
  "  const first = machines[0];",
  "  const rawRoom = machineCapacity(state, first.id) - state.inputs[first.id];",
  "  if (rawRoom > 0 && state.resources.raw > 0) {",
  "    return \"宇宙ゴミを拾って磁力選別機へ運ぼう\";",
  "  }",
  "",
  "  const nextMachine = machines[state.unlocked];",
  "  if (nextMachine) {",
  "    if (state.credits >= nextMachine.unlockCost) {",
  "      return `緑の建設枠で${nextMachine.name}を建てよう`;",
  "    }",
  "    return \"完成した加工品を取引所で売って、次の設備代を稼ごう\";",
  "  }",
  "  return \"作業ロボを増やして、工場を完全自動化しよう\";",
  "};",
  "",
  "export const bottleneck",
].join("\n");

replaceOnce(
  "lib/scrap.ts",
  "緑側で完成品を受け取ろう",
  /export const objective = \(state: ScrapState\): string => \{[\s\S]*?\n\};\n\nexport const bottleneck/,
  objectiveReplacement,
);

replaceOnce(
  "lib/scrap.ts",
  "cycleMs: 1100",
  /cycleMs: 2200/,
  "cycleMs: 1100",
);
