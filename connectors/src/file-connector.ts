import { readFile } from "node:fs/promises";
import { assertValidGraph } from "datacarta-spec";
import type { ConnectorContext, ConnectorResult, DatacartaConnector } from "./types.js";

export interface FileConnectorOptions {
  filePath: string;
}

export const fileConnector: DatacartaConnector = {
  id: "file",
  displayName: "File — Datacarta graph JSON",
  description: "Imports a Datacarta graph JSON file from disk.",
  async run(_ctx: ConnectorContext, options?: Record<string, unknown>): Promise<ConnectorResult> {
    const filePath = (options as FileConnectorOptions | undefined)?.filePath;
    if (!filePath) {
      throw new Error('fileConnector requires options.filePath (absolute or workspace-relative).');
    }
    const raw = JSON.parse(await readFile(filePath, "utf8"));
    const graph = assertValidGraph(raw);
    return {
      graph,
      provenance: [`Imported graph JSON: ${filePath}`],
    };
  },
};
