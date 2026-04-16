import { databricksConnectorStub } from "./stubs/databricks.js";
import { dbtConnectorStub } from "./stubs/dbt.js";
import { snowflakeConnectorStub } from "./stubs/snowflake.js";
import { fileConnector } from "./file-connector.js";
import { mockConnector } from "./mock-connector.js";
import type { DatacartaConnector } from "./types.js";

const all: DatacartaConnector[] = [
  mockConnector,
  fileConnector,
  dbtConnectorStub,
  snowflakeConnectorStub,
  databricksConnectorStub,
];

export function listConnectors(): DatacartaConnector[] {
  return all;
}

export function getConnector(id: string): DatacartaConnector | undefined {
  return all.find((c) => c.id === id);
}
