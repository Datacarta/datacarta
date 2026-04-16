import type { DatacartaGraph, TrustLevel } from "./types.js";

const TRUST_ORDER: TrustLevel[] = ["unknown", "draft", "reviewed", "trusted", "deprecated"];

function trustRank(t: TrustLevel | undefined): number {
  if (!t) return -1;
  return TRUST_ORDER.indexOf(t);
}

function isTrustedEnough(t: TrustLevel | undefined): boolean {
  return trustRank(t) >= trustRank("reviewed");
}

export interface ContextPackage {
  specVersion: string;
  generatedAt: string;
  projectId: string;
  projectName: string;
  domains?: string[];
  compactSummary: string;
  layerSummary: { layerId: string; layerName: string; layerType: string; modelCount: number }[];
  trustedModels: { id: string; name: string; layerId: string; grain?: string }[];
  metricRegistry: { id: string; name: string; domain: string; isKPI?: boolean; trustLevel: string }[];
  warnings: string[];
  caveats: string[];
  deprecatedAssets: { id: string; name: string; layerId: string }[];
}

/**
 * Deterministic, structured context for LLM prompts — no model calls.
 */
export function buildContextPackage(graph: DatacartaGraph): ContextPackage {
  const warnings: string[] = [];
  const caveats: string[] = [];

  for (const m of graph.models) {
    for (const c of m.caveats ?? []) caveats.push(`${m.name}: ${c}`);
    if (m.trustLevel === "unknown" || m.trustLevel === "draft") {
      warnings.push(`Low trust asset: model "${m.name}" (${m.id})`);
    }
  }

  // Layer summary: count models per layer
  const layerSummary = graph.layerDefinitions.map((layer) => ({
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    modelCount: graph.models.filter((m) => m.layerId === layer.id).length,
  }));

  // Trusted models: trustLevel "reviewed" or "trusted"
  const trustedModels = graph.models
    .filter((m) => isTrustedEnough(m.trustLevel) && m.trustLevel !== "deprecated")
    .map((m) => ({
      id: m.id,
      name: m.displayName ?? m.name,
      layerId: m.layerId,
      grain: m.grain,
    }));

  // Metric registry from standalone metrics
  const metricRegistry = graph.metrics.map((met) => ({
    id: met.id,
    name: met.displayName,
    domain: met.domain,
    isKPI: met.isKPI,
    trustLevel: met.trustLevel,
  }));

  // Deprecated assets: status or trustLevel "deprecated"
  const deprecatedAssets = graph.models
    .filter((m) => m.status === "deprecated" || m.trustLevel === "deprecated")
    .map((m) => ({ id: m.id, name: m.name, layerId: m.layerId }));

  const lines: string[] = [
    `Project: ${graph.projectName} (${graph.projectId})`,
    ...(graph.domains?.length ? [`Domains: ${graph.domains.join(", ")}`] : []),
    `Layers: ${graph.layerDefinitions.length}, Models: ${graph.models.length}`,
    `Trusted models: ${trustedModels.length}`,
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
    layerSummary,
    trustedModels,
    metricRegistry,
    warnings,
    caveats,
    deprecatedAssets,
  };
}

export function buildFullStructuredContext(graph: DatacartaGraph): DatacartaGraph {
  // Full fidelity export — snapshot as-is (deterministic copy).
  return structuredClone(graph);
}
