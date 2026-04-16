import type { DatacartaGraph } from "datacarta-spec/client";
import { validateDatacartaGraph } from "datacarta-spec/client";
import type { DesktopProjectFile, ModelBlueprint } from "../types/project";

export interface ParsedWorkspace {
  graph: DatacartaGraph;
  blueprints: ModelBlueprint[];
}

export function serializeWorkspace(graph: DatacartaGraph, blueprints: ModelBlueprint[]): string {
  const doc: DesktopProjectFile = {
    kind: "datacarta-desktop-project",
    version: 2,
    savedAt: new Date().toISOString(),
    graph,
    blueprints,
  };
  return JSON.stringify(doc, null, 2);
}

/** @deprecated use serializeWorkspace */
export function serializeProject(graph: DatacartaGraph): string {
  return serializeWorkspace(graph, []);
}

export function parseWorkspaceFile(text: string): ParsedWorkspace {
  const raw = JSON.parse(text) as unknown;
  if (raw && typeof raw === "object" && (raw as DesktopProjectFile).kind === "datacarta-desktop-project") {
    const doc = raw as DesktopProjectFile;
    const res = validateDatacartaGraph(doc.graph);
    if (!res.ok) {
      throw new Error(res.errors.join("\n"));
    }
    return {
      graph: doc.graph as DatacartaGraph,
      blueprints: Array.isArray(doc.blueprints) ? doc.blueprints : [],
    };
  }
  const res = validateDatacartaGraph(raw);
  if (!res.ok) {
    throw new Error(res.errors.join("\n"));
  }
  return { graph: raw as DatacartaGraph, blueprints: [] };
}

/** Import bare graph JSON (no wrapper). */
export function parseProjectFile(text: string): DatacartaGraph {
  return parseWorkspaceFile(text).graph;
}
