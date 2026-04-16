/**
 * Browser-safe entrypoint (no Node filesystem reads).
 * Use this from Vite/webpack renderers; use the root entry in Node services.
 *
 * Re-assign constants so CommonJS emit uses plain `exports.X = …` (Rollup-friendly).
 */
export type {
  DatacartaGraph,
  LayerDefinition,
  LayerType,
  Model,
  Column,
  ColumnRef,
  LogicalType,
  ModelEdge,
  EdgeType,
  Metric,
  DataMart,
  JoinPath,
  JoinKey,
  ModelBlueprint,
  SourceRef,
  Transformation,
  ModelingIntent,
  SourceClassification,
  SourceOrigin,
  IngestionMethod,
  PhysicalLocation,
  Owner,
  Team,
  TrustLevel,
  Status,
  GovernanceRuleSet,
  GovernanceTemplate,
  GovernanceViolation,
  ValidationResult,
  BlueprintStatus,
} from "./types.js";

import * as T from "./types.js";

export const LAYER_TYPES = T.LAYER_TYPES;
export const EDGE_TYPES = T.EDGE_TYPES;
export const TRUST_LEVELS = T.TRUST_LEVELS;
export const STATUSES = T.STATUSES;
export const LOGICAL_TYPES = T.LOGICAL_TYPES;
export const SOURCE_ORIGINS = T.SOURCE_ORIGINS;
export const INGESTION_METHODS = T.INGESTION_METHODS;
export const STAR_ROLES = T.STAR_ROLES;
export const BLUEPRINT_STATUSES = T.BLUEPRINT_STATUSES;

export * from "./context-package.js";
export * from "./validate-browser.js";
export * from "./governance.js";
export * from "./governance-templates.js";
