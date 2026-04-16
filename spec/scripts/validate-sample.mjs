import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDatacartaGraph } from "../dist/validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = join(root, "samples", "harmonic-audio.sample.json");
const sample = JSON.parse(readFileSync(samplePath, "utf8"));
const result = validateDatacartaGraph(sample);

if (!result.ok) {
  console.error("Sample graph failed validation:");
  for (const err of result.errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("Sample graph OK:", samplePath);
process.exit(0);
