import type { ConnectorContext, ConnectorResult, DatacartaConnector } from "../types.js";

export const snowflakeConnectorStub: DatacartaConnector = {
  id: "snowflake",
  displayName: "Snowflake (stub)",
  description:
    "PLACEHOLDER: future INFORMATION_SCHEMA / ACCOUNT_USAGE metadata harvest for tables, columns, and tags.",
  async run(_ctx: ConnectorContext): Promise<ConnectorResult> {
    throw new Error("Snowflake connector is not implemented yet.");
  },
};
