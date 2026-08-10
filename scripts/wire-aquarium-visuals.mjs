import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shopPath = path.join(root, "components", "Shop.tsx");
const aquariumPath = path.join(root, "data", "aquarium.ts");

const importLine = 'import { drawAquariumExhibit } from "@/lib/aquariumArt";';
const hook = `  if (art.startsWith("aquarium-")) {\n    return drawAquariumExhibit(ctx, art, seed);\n  }\n\n`;

let shop = fs.readFileSync(shopPath, "utf8");
if (!shop.includes(importLine)) {
  const marker = '"use client";\n';
  if (!shop.includes(marker)) throw new Error("Shop.tsx client marker not found");
  shop = shop.replace(marker, `${marker}\n${importLine}\n`);
}
if (!shop.includes('art.startsWith("aquarium-")')) {
  const marker = '  if (art === "fish") {';
  if (!shop.includes(marker)) throw new Error("generic fish renderer marker not found");
  shop = shop.replace(marker, `${hook}${marker}`);
}
fs.writeFileSync(shopPath, shop);

let aquarium = fs.readFileSync(aquariumPath, "utf8");
if (!aquarium.includes('art: `aquarium-${area}-${index}`')) {
  const marker = '      art: "fish",';
  if (!aquarium.includes(marker)) throw new Error("aquarium fish art marker not found");
  aquarium = aquarium.replace(marker, '      art: `aquarium-${area}-${index}`,');
}
fs.writeFileSync(aquariumPath, aquarium);

console.log("Aquarium unique exhibit visuals wired (54 exhibit keys).");
