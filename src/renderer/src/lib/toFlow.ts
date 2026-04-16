import type { Edge as RFEdge, Node as RFNode } from "@xyflow/react";
import type { DatacartaGraph, NodeType } from "datacarta-spec/client";
import { NODE_TYPES } from "datacarta-spec/client";
import { formatModelingHeadline } from "./modeling-metadata";

const typeIndex = new Map<NodeType, number>(NODE_TYPES.map((t, i) => [t, i]));

function layout(graph: DatacartaGraph): Map<string, { x: number; y: number }> {
  const groups = new Map<NodeType, typeof graph.nodes>();
  for (const n of graph.nodes) {
    const arr = groups.get(n.type) ?? [];
    arr.push(n);
    groups.set(n.type, arr);
  }

  const pos = new Map<string, { x: number; y: number }>();
  const rowHeight = 160;
  const colWidth = 280;

  const orderedTypes = [...NODE_TYPES].sort(
    (a, b) => (typeIndex.get(a) ?? 0) - (typeIndex.get(b) ?? 0)
  );

  let row = 0;
  for (const t of orderedTypes) {
    const list = groups.get(t);
    if (!list?.length) continue;
    let col = 0;
    for (const n of list) {
      pos.set(n.id, { x: col * colWidth, y: row * rowHeight });
      col += 1;
    }
    row += 1;
  }
  return pos;
}

export function graphToFlowElements(
  graph: DatacartaGraph,
  opts: { filter: Set<NodeType> | null; search: string }
): { nodes: RFNode[]; edges: RFEdge[] } {
  const q = opts.search.trim().toLowerCase();
  const nodesIn = graph.nodes.filter((n) => {
    if (opts.filter && !opts.filter.has(n.type)) return false;
    if (!q) return true;
    const hay = `${n.name} ${n.displayName ?? ""} ${(n.tags ?? []).join(" ")} ${formatModelingHeadline(n) ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
  const ids = new Set(nodesIn.map((n) => n.id));
  const pos = layout({ ...graph, nodes: graph.nodes });

  const nodes: RFNode[] = nodesIn.map((n) => {
    const p = pos.get(n.id) ?? { x: 0, y: 0 };
    const roleLine = formatModelingHeadline(n);
    return {
      id: n.id,
      type: "datacarta",
      position: p,
      data: {
        label: n.displayName ?? n.name,
        sublabel: n.type,
        roleLine,
        trust: n.trustLevel ?? "unknown",
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
      animated: e.type === "feeds" || e.type === "upstream_of",
      style: { stroke: "#64748b", strokeWidth: 1.25 },
      labelStyle: { fill: "#cbd5e1", fontSize: 10 },
      labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
    }));

  return { nodes, edges };
}
