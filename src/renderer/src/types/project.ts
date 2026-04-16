import type { DatacartaGraph } from "datacarta-spec/client";

/** Star / Kimball-style role for planning and documentation (stored on nodes + blueprints). */
export type StarSchemaRole = "dimension" | "fact" | "bridge" | "staging" | "unknown";

/** Optional Data Vault pattern hint (documentation-only in OSS MVP). */
export type DataVaultRole = "hub" | "link" | "satellite" | "none";

export interface ModelBlueprint {
  id: string;
  title: string;
  starRole: StarSchemaRole;
  /** Kimball SCD style intent for dimensions (documentation). */
  scdType?: "0" | "1" | "2" | "none";
  grain?: string;
  notes?: string;
  status: "idea" | "planned" | "in_build" | "shipped";
  /** When a blueprint is realized as a graph node. */
  linkedNodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesktopProjectFile {
  kind: "datacarta-desktop-project";
  /** v1 = graph only; v2 adds optional blueprints */
  version: 1 | 2;
  savedAt: string;
  graph: DatacartaGraph;
  blueprints?: ModelBlueprint[];
}
