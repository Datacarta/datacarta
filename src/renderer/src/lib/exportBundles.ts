import {
  buildContextPackage,
  buildFullStructuredContext,
  validateDatacartaGraph,
  type DatacartaGraph,
} from "datacarta-spec/client";

export function exportFullGraphJson(graph: DatacartaGraph): string {
  const full = buildFullStructuredContext(graph);
  return JSON.stringify(full, null, 2);
}

export function exportContextPackageJson(graph: DatacartaGraph): string {
  const pkg = buildContextPackage(graph);
  return JSON.stringify(pkg, null, 2);
}

export function validateOrThrow(graph: unknown): DatacartaGraph {
  const res = validateDatacartaGraph(graph);
  if (!res.ok) {
    throw new Error(res.errors.join("\n"));
  }
  return graph as DatacartaGraph;
}
