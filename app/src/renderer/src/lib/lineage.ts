import type { DatacartaGraph, EdgeType, LayerDefinition, LayerType } from "datacarta-spec/client";

export interface Adjacency {
  /** sourceId -> [targetId, ...] */
  outgoing: Map<string, string[]>;
  /** targetId -> [sourceId, ...] */
  incoming: Map<string, string[]>;
}

export function buildAdjacency(graph: DatacartaGraph): Adjacency {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const e of graph.edges) {
    // Normalize to data-flow direction (upstream → downstream).
    // `depends_on` is authored as consumer → producer, so flip it here.
    // Other edge types (maps_to, defines, powers, joins_with) already point in the
    // data-flow direction.
    const [from, to] = e.type === "depends_on" ? [e.targetId, e.sourceId] : [e.sourceId, e.targetId];
    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from)!.push(to);
    if (!incoming.has(to)) incoming.set(to, []);
    incoming.get(to)!.push(from);
  }
  return { outgoing, incoming };
}

/**
 * For every model, collect the set of domains it serves.
 * A model "serves" a domain if:
 *  - it has that domain explicitly, OR
 *  - it has a downstream descendant with that domain (transitive closure forward)
 */
export function computeServedDomains(graph: DatacartaGraph): Map<string, Set<string>> {
  const { outgoing } = buildAdjacency(graph);
  const byId = new Map(graph.models.map((m) => [m.id, m]));
  const cache = new Map<string, Set<string>>();

  function visit(id: string, stack: Set<string>): Set<string> {
    if (cache.has(id)) return cache.get(id)!;
    if (stack.has(id)) return new Set(); // cycle guard
    stack.add(id);
    const self = byId.get(id);
    const domains = new Set<string>();
    if (self?.domain) domains.add(self.domain);
    for (const next of outgoing.get(id) ?? []) {
      for (const d of visit(next, stack)) domains.add(d);
    }
    stack.delete(id);
    cache.set(id, domains);
    return domains;
  }

  for (const m of graph.models) visit(m.id, new Set());
  return cache;
}

/** All ancestors of a model (transitive closure backward). */
export function getAncestors(adj: Adjacency, modelId: string): Set<string> {
  const acc = new Set<string>();
  const stack = [modelId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const prev of adj.incoming.get(cur) ?? []) {
      if (!acc.has(prev)) {
        acc.add(prev);
        stack.push(prev);
      }
    }
  }
  return acc;
}

/** All descendants of a model (transitive closure forward). */
export function getDescendants(adj: Adjacency, modelId: string): Set<string> {
  const acc = new Set<string>();
  const stack = [modelId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const next of adj.outgoing.get(cur) ?? []) {
      if (!acc.has(next)) {
        acc.add(next);
        stack.push(next);
      }
    }
  }
  return acc;
}

/** Human-readable labels for each edge type. */
export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  depends_on: "feeds into",
  defines: "defines",
  powers: "powers",
  maps_to: "maps to",
  joins_with: "joins with",
};

/** Tooltip-ready description of what each edge type means. */
export const EDGE_TYPE_DESCRIPTIONS: Record<EdgeType, string> = {
  depends_on: "Data lineage — target is built from source. Use for raw → staging → intermediate → mart chains.",
  defines: "Source defines the structure/schema of target. Rare — use for source-of-truth relationships.",
  powers: "Source powers a metric, dashboard, or downstream consumer (not another model).",
  maps_to: "Column-level mapping between models (semantic layer).",
  joins_with: "Query-time join — tables share keys but neither is built from the other.",
};

/** Order for rendering layer types from upstream to downstream. */
export const LAYER_ORDER: Record<string, number> = {
  source: 0,
  raw: 1,
  staging: 2,
  intermediate: 3,
  mart: 4,
  semantic: 5,
  consumption: 6,
};

/**
 * Canonical seven-layer set, matching the Harmonic Audio sample. These are the
 * defaults we hand a brand-new empty project so every "pick a layer" dropdown
 * is immediately useful. Users can rename / reorder / delete / extend these in
 * Settings → Layers.
 */
export const DEFAULT_LAYER_DEFINITIONS: LayerDefinition[] = [
  { id: "layer-source", name: "Source", type: "source", order: 0 },
  { id: "layer-raw", name: "Raw", type: "raw", order: 1 },
  { id: "layer-staging", name: "Staging", type: "staging", order: 2 },
  { id: "layer-intermediate", name: "Intermediate", type: "intermediate", order: 3 },
  { id: "layer-mart", name: "Mart", type: "mart", order: 4 },
  { id: "layer-semantic", name: "Semantic", type: "semantic", order: 5 },
  { id: "layer-consumption", name: "Consumption", type: "consumption", order: 6 },
];

/** Human-friendly default name for a given canonical layer type. */
export function defaultLayerNameFor(type: LayerType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
