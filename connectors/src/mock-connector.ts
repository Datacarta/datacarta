import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { assertValidGraph } from "datacarta-spec";
import type { ConnectorContext, ConnectorResult, DatacartaConnector } from "./types.js";

const require = createRequire(import.meta.url);

function resolveSamplePath(): string {
  const specPkgJson = require.resolve("datacarta-spec/package.json");
  return join(dirname(specPkgJson), "samples", "harmonic-audio.sample.json");
}

export const mockConnector: DatacartaConnector = {
  id: "mock",
  displayName: "Mock — Harmonic Audio sample",
  description: "Loads the Harmonic Audio sample graph shipped with datacarta-spec.",
  async run(_ctx: ConnectorContext): Promise<ConnectorResult> {
    const samplePath = resolveSamplePath();
    const raw = JSON.parse(await readFile(samplePath, "utf8"));
    const graph = assertValidGraph(raw);
    return {
      graph,
      provenance: [`Loaded static sample via datacarta-spec: ${samplePath}`],
    };
  },
};
