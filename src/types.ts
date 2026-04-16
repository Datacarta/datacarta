/**
 * Canonical Datacarta context graph types.
 * Keep aligned with `schema/datacarta-graph.schema.json`.
 */

export const NODE_TYPES = [
  "source_system",
  "raw_table",
  "staged_model",
  "intermediate_model",
  "mart_model",
  "metric",
  "dashboard",
  "event_definition",
  "entity",
  "dimension",
  "owner",
  "team",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  "upstream_of",
  "feeds",
  "defines",
  "owned_by",
  "documented_by",
  "powers",
  "maps_to",
  "depends_on",
  "joins_with",
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export const TRUST_LEVELS = ["unknown", "draft", "reviewed", "trusted", "deprecated"] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const STATUSES = ["active", "draft", "deprecated"] as const;
export type Status = (typeof STATUSES)[number];

/** Documented examples; graphs may use arbitrary grain strings from producers. */
export const GRAIN_EXAMPLES = [
  "row",
  "event",
  "user_day",
  "user_week",
  "user_id",
  "artist_id",
  "fan_artist_week",
] as const;
export type GrainExample = (typeof GRAIN_EXAMPLES)[number];

export type Grain = string;

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  displayName?: string;
  description?: string;
  grain?: Grain;
  trustLevel?: TrustLevel;
  status?: Status;
  ownerId?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  usageHints?: string[];
  caveats?: string[];
}

export interface BaseEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DatacartaGraph {
  /** Semver of the spec this document conforms to */
  specVersion: string;
  /** Logical project identifier */
  projectId: string;
  projectName: string;
  projectDescription?: string;
  /** Optional domain tags for packaging (e.g. "growth", "finance") */
  domains?: string[];
  nodes: BaseNode[];
  edges: BaseEdge[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}
