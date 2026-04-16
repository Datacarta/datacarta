import type { BaseEdge, BaseNode, DatacartaGraph, EdgeType, TrustLevel } from "./types.js";

const TRUST_ORDER: TrustLevel[] = ["unknown", "draft", "reviewed", "trusted", "deprecated"];

function trustRank(t: TrustLevel | undefined): number {
  if (!t) return -1;
  return TRUST_ORDER.indexOf(t);
}

function isTrustedEnough(t: TrustLevel | undefined): boolean {
  return trustRank(t) >= trustRank("reviewed");
}

function nodeById(graph: DatacartaGraph): Map<string, BaseNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

function outgoing(graph: DatacartaGraph, nodeId: string, types?: EdgeType[]): BaseEdge[] {
  return graph.edges.filter(
    (e) => e.sourceId === nodeId && (!types || types.includes(e.type))
  );
}

export interface EntitySummary {
  id: string;
  name: string;
  description?: string;
  grain?: string;
  trustLevel?: TrustLevel;
}

export interface MetricSummary {
  id: string;
  name: string;
  definition?: string;
  powers?: string[];
  trustLevel?: TrustLevel;
}

export interface JoinPathHint {
  fromModelId: string;
  toModelId: string;
  viaEdgeIds: string[];
  note?: string;
}

export interface ContextPackage {
  specVersion: string;
  generatedAt: string;
  projectId: string;
  projectName: string;
  domains?: string[];
  compactSummary: string;
  entitySummaries: EntitySummary[];
  trustedDatasets: { id: string; name: string; type: string; grain?: string }[];
  metricRegistry: MetricSummary[];
  warnings: string[];
  caveats: string[];
  recommendedJoinPaths: JoinPathHint[];
  deprecatedAssets: { id: string; name: string; type: string }[];
}

/**
 * Deterministic, structured context for LLM prompts — no model calls.
 */
export function buildContextPackage(graph: DatacartaGraph): ContextPackage {
  const index = nodeById(graph);
  const warnings: string[] = [];
  const caveats: string[] = [];

  for (const n of graph.nodes) {
    for (const c of n.caveats ?? []) caveats.push(`${n.name}: ${c}`);
    if (n.trustLevel === "unknown" || n.trustLevel === "draft") {
      warnings.push(`Low trust asset: ${n.type} "${n.name}" (${n.id})`);
    }
    if (n.status === "deprecated" || n.trustLevel === "deprecated") {
      /* handled in deprecated list */
    }
  }

  const entitySummaries: EntitySummary[] = graph.nodes
    .filter((n) => n.type === "entity")
    .map((n) => ({
      id: n.id,
      name: n.displayName ?? n.name,
      description: n.description,
      grain: n.grain,
      trustLevel: n.trustLevel,
    }));

  const trustedDatasets = graph.nodes.filter(
    (n) =>
      (n.type === "mart_model" || n.type === "raw_table") && isTrustedEnough(n.trustLevel)
  );

  const metricRegistry: MetricSummary[] = graph.nodes
    .filter((n) => n.type === "metric")
    .map((n) => {
      const powers = outgoing(graph, n.id, ["powers"]).map((e) => {
        const t = index.get(e.targetId);
        return t?.name ?? e.targetId;
      });
      return {
        id: n.id,
        name: n.displayName ?? n.name,
        definition: n.description,
        powers,
        trustLevel: n.trustLevel,
      };
    });

  const deprecatedAssets = graph.nodes
    .filter((n) => n.status === "deprecated" || n.trustLevel === "deprecated")
    .map((n) => ({ id: n.id, name: n.name, type: n.type }));

  const joinEdges = graph.edges.filter((e) => e.type === "joins_with");
  const recommendedJoinPaths: JoinPathHint[] = joinEdges.map((e) => ({
    fromModelId: e.sourceId,
    toModelId: e.targetId,
    viaEdgeIds: [e.id],
    note: e.description,
  }));

  const lines: string[] = [
    `Project: ${graph.projectName} (${graph.projectId})`,
    ...(graph.domains?.length ? [`Domains: ${graph.domains.join(", ")}`] : []),
    `Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`,
    `Trusted datasets: ${trustedDatasets.length}`,
    `Metrics: ${metricRegistry.length}`,
    `Deprecated assets: ${deprecatedAssets.length}`,
  ];

  return {
    specVersion: graph.specVersion,
    generatedAt: new Date().toISOString(),
    projectId: graph.projectId,
    projectName: graph.projectName,
    domains: graph.domains,
    compactSummary: lines.join("\n"),
    entitySummaries,
    trustedDatasets: trustedDatasets.map((n) => ({
      id: n.id,
      name: n.displayName ?? n.name,
      type: n.type,
      grain: n.grain,
    })),
    metricRegistry,
    warnings,
    caveats,
    recommendedJoinPaths,
    deprecatedAssets,
  };
}

export function buildFullStructuredContext(graph: DatacartaGraph): DatacartaGraph {
  // Full fidelity export — snapshot as-is (deterministic copy).
  return structuredClone(graph);
}
