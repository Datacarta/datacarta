import type { DatacartaGraph } from "datacarta-spec";

export type ConnectorId = "mock" | "file" | "dbt" | "snowflake" | "databricks";

export interface ConnectorContext {
  /** Workspace root or scratch directory for temp files */
  workspacePath: string;
}

export interface ConnectorResult {
  graph: DatacartaGraph;
  /** Human-readable provenance for audit trails */
  provenance: string[];
}

export interface DatacartaConnector {
  id: ConnectorId;
  displayName: string;
  description: string;
  /**
   * Import or synthesize a graph. Implementations must return spec-compliant graphs.
   * Heavy connectors may later become async generators; keep sync for MVP.
   */
  run(ctx: ConnectorContext, options?: Record<string, unknown>): Promise<ConnectorResult>;
}
