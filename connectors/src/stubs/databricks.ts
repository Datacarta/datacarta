import type { ConnectorContext, ConnectorResult, DatacartaConnector } from "../types.js";

export const databricksConnectorStub: DatacartaConnector = {
  id: "databricks",
  displayName: "Databricks (stub)",
  description:
    "PLACEHOLDER: future Unity Catalog / system tables integration for lineage-aware graphs.",
  async run(_ctx: ConnectorContext): Promise<ConnectorResult> {
    throw new Error("Databricks connector is not implemented yet.");
  },
};
