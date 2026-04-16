/**
 * Browser-safe entrypoint (no Node filesystem reads).
 * Use this from Vite/webpack renderers; use the root entry in Node services.
 *
 * Re-assign constants so CommonJS emit uses plain `exports.X = …` (Rollup-friendly).
 */
export type {
  BaseEdge,
  BaseNode,
  DatacartaGraph,
  EdgeType,
  Grain,
  GrainExample,
  NodeType,
  Status,
  TrustLevel,
  ValidationResult,
} from "./types.js";
import * as T from "./types.js";

export const NODE_TYPES = T.NODE_TYPES;
export const EDGE_TYPES = T.EDGE_TYPES;
export const TRUST_LEVELS = T.TRUST_LEVELS;
export const STATUSES = T.STATUSES;
export const GRAIN_EXAMPLES = T.GRAIN_EXAMPLES;

export * from "./context-package.js";
export * from "./validate-browser.js";
