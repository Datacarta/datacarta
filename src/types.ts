/**
 * Canonical Datacarta context graph types — v0.2.0.
 * Keep aligned with `schema/datacarta-graph.schema.json`.
 */

// ── Layer ────────────────────────────────────────────────────────────
export const LAYER_TYPES = ["source", "raw", "staging", "intermediate", "mart", "semantic", "consumption"] as const;
export type LayerType = (typeof LAYER_TYPES)[number];

export interface LayerDefinition {
  id: string;
  name: string;
  type: LayerType;
  order: number;
  color?: string;
  domains?: string[];
  governanceRules?: GovernanceRuleSet;
}

// ── Edge ─────────────────────────────────────────────────────────────
export const EDGE_TYPES = ["depends_on", "defines", "powers", "maps_to", "joins_with"] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export interface ModelEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  description?: string;
}

// ── Trust & Status ───────────────────────────────────────────────────
export const TRUST_LEVELS = ["unknown", "draft", "reviewed", "trusted", "deprecated"] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const STATUSES = ["active", "draft", "deprecated"] as const;
export type Status = (typeof STATUSES)[number];

// ── Column ───────────────────────────────────────────────────────────
export const LOGICAL_TYPES = ["string", "integer", "float", "boolean", "date", "timestamp", "json", "other"] as const;
export type LogicalType = (typeof LOGICAL_TYPES)[number];

export interface ColumnRef {
  modelId: string;
  columnId: string;
}

export interface Column {
  id: string;
  name: string;
  dataType: string;
  logicalType?: LogicalType;
  description?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyTarget?: ColumnRef;
  isSurrogateKey?: boolean;
  isNaturalKey?: boolean;
  scdRole?: "tracking" | "valid_from" | "valid_to" | "is_current";
  isRequired?: boolean;
  defaultValue?: string;
  businessLogic?: string;
  sourceColumn?: ColumnRef;
  tags?: string[];
}

// ── Source Classification ────────────────────────────────────────────
export const SOURCE_ORIGINS = ["frontend", "backend", "third_party"] as const;
export type SourceOrigin = (typeof SOURCE_ORIGINS)[number];

export const INGESTION_METHODS = ["event_stream", "cdc", "batch_api", "file_drop", "manual"] as const;
export type IngestionMethod = (typeof INGESTION_METHODS)[number];

export interface SourceClassification {
  origin: SourceOrigin;
  ingestionMethod: IngestionMethod;
  freshnessGuarantee?: string;
  schemaStability?: "stable" | "evolving" | "volatile";
}

// ── Modeling Intent ──────────────────────────────────────────────────
export const STAR_ROLES = ["dimension", "fact", "bridge", "staging", "unknown"] as const;
export type StarRole = (typeof STAR_ROLES)[number];

export interface ModelingIntent {
  starRole?: StarRole;
  scdType?: 0 | 1 | 2;
  dataVaultRole?: "hub" | "link" | "satellite" | "none";
}

// ── Physical Location ────────────────────────────────────────────────
export interface PhysicalLocation {
  warehouse?: string;
  database?: string;
  schema?: string;
  relation?: string;
}

// ── Model ────────────────────────────────────────────────────────────
export interface Model {
  id: string;
  layerId: string;
  domain?: string;
  name: string;
  displayName?: string;
  description?: string;
  grain?: string;
  columns: Column[];
  modelingIntent?: ModelingIntent;
  sourceClassification?: SourceClassification;
  trustLevel: TrustLevel;
  status: Status;
  ownerId?: string;
  teamId?: string;
  physical?: PhysicalLocation;
  tags?: string[];
  usageHints?: string[];
  caveats?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ── Metric ───────────────────────────────────────────────────────────
export interface Metric {
  id: string;
  name: string;
  displayName: string;
  description: string;
  expression?: string;
  aggregation?: "count" | "sum" | "avg" | "min" | "max" | "count_distinct" | "custom";
  timeGrain?: string;
  filters?: string[];
  sourceModelIds: string[];
  domain: string;
  category?: string;
  isKPI?: boolean;
  ownerId?: string;
  teamId?: string;
  trustLevel: TrustLevel;
  status: Status;
  tags?: string[];
  caveats?: string[];
}

// ── Data Mart ────────────────────────────────────────────────────────
export interface JoinKey {
  fromColumn: string;
  toColumn: string;
}

export interface JoinPath {
  fromModelId: string;
  toModelId: string;
  joinKeys: JoinKey[];
  joinType: "inner" | "left" | "full";
  notes?: string;
}

export interface DataMart {
  id: string;
  name: string;
  description: string;
  domain: string;
  factModelIds: string[];
  dimensionModelIds: string[];
  metricIds: string[];
  joinPaths: JoinPath[];
  ownerId?: string;
  teamId?: string;
}

// ── Blueprint ────────────────────────────────────────────────────────
export const BLUEPRINT_STATUSES = ["idea", "drafting", "reviewed", "shipped"] as const;
export type BlueprintStatus = (typeof BLUEPRINT_STATUSES)[number];

export interface Transformation {
  type: "cast" | "rename" | "filter" | "aggregate" | "window" | "expression";
  column: string;
  expression: string;
}

export interface SourceRef {
  modelId: string;
  columnsUsed: string[];
  joinKey?: JoinKey;
  joinType?: "inner" | "left" | "full";
  transformations?: Transformation[];
}

export interface ModelBlueprint {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  layerId: string;
  domain?: string;
  columns: Column[];
  grain: string;
  modelingIntent?: ModelingIntent;
  sourceRefs: SourceRef[];
  status: BlueprintStatus;
  linkedModelId?: string;
  trustLevel?: TrustLevel;
  ownerId?: string;
  teamId?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Ownership ────────────────────────────────────────────────────────
export interface Owner {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  email?: string;
  slackChannel?: string;
}

export interface Team {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  contactUrl?: string;
  slackChannel?: string;
}

// ── Governance ───────────────────────────────────────────────────────
export interface GovernanceRuleSet {
  naming?: NamingRules;
  layerPlacement?: LayerPlacementRules;
  columnRequirements?: ColumnRequirements;
  dataTypes?: DataTypeRules;
}

export interface NamingRules {
  modelPatterns: Partial<Record<LayerType, string>>;
  columnPatterns: ColumnNamingRule[];
}

export interface ColumnNamingRule {
  pattern: string;
  description: string;
}

export interface LayerPlacementRules {
  allowedTransforms: Partial<Record<LayerType, string[]>>;
  noBusinessLogicIn: LayerType[];
  noRawJoinsIn: LayerType[];
}

export interface ColumnRequirements {
  requiredColumns: Record<string, RequiredColumn[]>;
}

export interface RequiredColumn {
  name?: string;
  pattern?: string;
  role?: string;
  dataType?: string;
  when?: RequiredColumnCondition;
}

export interface RequiredColumnCondition {
  field: string;
  operator: "eq" | "neq";
  value: string | number;
}

export interface DataTypeRules {
  columnTypeMap: ColumnTypeRule[];
}

export interface ColumnTypeRule {
  columnPattern: string;
  requiredType: string;
}

export interface GovernanceTemplate {
  id: string;
  name: string;
  description: string;
  defaultLayers: LayerDefinition[];
  rules: GovernanceRuleSet;
}

export interface GovernanceViolation {
  ruleId: string;
  severity: "error" | "warning" | "info";
  modelId: string;
  columnName?: string;
  message: string;
  suggestion?: string;
}

// ── Top-Level Graph ──────────────────────────────────────────────────
export interface DatacartaGraph {
  specVersion: string;
  projectId: string;
  projectName: string;
  projectDescription?: string;
  domains?: string[];
  layerDefinitions: LayerDefinition[];
  models: Model[];
  edges: ModelEdge[];
  metrics: Metric[];
  dataMarts: DataMart[];
  blueprints: ModelBlueprint[];
  owners: Owner[];
  teams: Team[];
  governanceTemplate?: string;
  governanceRules?: GovernanceRuleSet;
}

// ── Validation ───────────────────────────────────────────────────────
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}
