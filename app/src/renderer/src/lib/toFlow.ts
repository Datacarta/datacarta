import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";
import type { DatacartaGraph, LayerType } from "datacarta-spec/client";
import { formatModelingHeadline } from "./modeling-metadata";

/** Layer type → visual order for layout */
const LAYER_ORDER: Record<LayerType, number> = {
  source: 0,
  raw: 1,
  staging: 2,
  intermediate: 3,
  mart: 4,
  semantic: 5,
  consumption: 6,
};

function layout(graph: DatacartaGraph): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const layerIndex = new Map(graph.layerDefinitions.map((l) => [l.id, l]));

  // Group models by layer
  const groups = new Map<string, typeof graph.models>();
  for (const m of graph.models) {
    const arr = groups.get(m.layerId) ?? [];
    arr.push(m);
    groups.set(m.layerId, arr);
  }

  const rowHeight = 160;
  const colWidth = 280;

  // Sort layers by order
  const orderedLayers = [...graph.layerDefinitions].sort((a, b) => a.order - b.order);

  let row = 0;
  for (const layer of orderedLayers) {
    const models = groups.get(layer.id);
    if (!models?.length) continue;
    let col = 0;
    for (const m of models) {
      pos.set(m.id, { x: col * colWidth, y: row * rowHeight });
      col += 1;
    }
    row += 1;
  }
  return pos;
}

export function graphToFlowElements(
  graph: DatacartaGraph,
  opts: { filter: Set<LayerType> | null; search: string }
): { nodes: RFNode[]; edges: RFEdge[] } {
  const q = opts.search.trim().toLowerCase();
  const layerIndex = new Map(graph.layerDefinitions.map((l) => [l.id, l]));

  const modelsIn = graph.models.filter((m) => {
    const layer = layerIndex.get(m.layerId);
    if (opts.filter && layer && !opts.filter.has(layer.type)) return false;
    if (!q) return true;
    const headline = formatModelingHeadline(m) ?? "";
    const hay = `${m.name} ${m.displayName ?? ""} ${(m.tags ?? []).join(" ")} ${headline}`.toLowerCase();
    return hay.includes(q);
  });

  const ids = new Set(modelsIn.map((m) => m.id));
  const pos = layout(graph);

  const nodes: RFNode[] = modelsIn.map((m) => {
    const p = pos.get(m.id) ?? { x: 0, y: 0 };
    const layer = layerIndex.get(m.layerId);
    const roleLine = formatModelingHeadline(m);
    return {
      id: m.id,
      type: "datacarta",
      position: p,
      data: {
        label: m.displayName ?? m.name,
        sublabel: layer?.name ?? m.layerId,
        roleLine,
        trust: m.trustLevel,
        layerType: layer?.type ?? "source",
        columnCount: m.columns.length,
      },
    };
  });

  const edges: RFEdge[] = graph.edges
    .filter((e) => ids.has(e.sourceId) && ids.has(e.targetId))
    .map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      label: e.type,
      animated: e.type === "depends_on",
      style: { stroke: "#64748b", strokeWidth: 1.25 },
      labelStyle: { fill: "#cbd5e1", fontSize: 10 },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
    }));

  return { nodes, edges };
}
