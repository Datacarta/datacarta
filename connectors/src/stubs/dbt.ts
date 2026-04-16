import type { ConnectorContext, ConnectorResult, DatacartaConnector } from "../types.js";

export const dbtConnectorStub: DatacartaConnector = {
  id: "dbt",
  displayName: "dbt (stub)",
  description:
    "PLACEHOLDER: future ingestion from dbt manifest.json + catalog.json to emit a Datacarta graph.",
  async run(_ctx: ConnectorContext): Promise<ConnectorResult> {
    throw new Error(
      "dbt connector is not implemented yet. Export a graph JSON from dbt docs or use the file connector."
    );
  },
};
