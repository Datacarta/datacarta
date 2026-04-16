import type { DatacartaGraph, ModelBlueprint } from "datacarta-spec/client";
import { validateDatacartaGraph } from "datacarta-spec/client";
import type { DesktopProjectFile } from "../types/project";

export interface ParsedWorkspace {
  graph: DatacartaGraph;
}

export function serializeWorkspace(graph: DatacartaGraph): string {
  const doc: DesktopProjectFile = {
    kind: "datacarta-desktop-project",
    version: 3,
    savedAt: new Date().toISOString(),
    graph,
  };
  return JSON.stringify(doc, null, 2);
}

export function parseWorkspaceFile(text: string): ParsedWorkspace {
  const raw = JSON.parse(text) as unknown;
  if (raw && typeof raw === "object" && (raw as DesktopProjectFile).kind === "datacarta-desktop-project") {
    const doc = raw as DesktopProjectFile;
    const res = validateDatacartaGraph(doc.graph);
    if (!res.ok) {
      throw new Error(res.errors.join("\n"));
    }
    return { graph: doc.graph as DatacartaGraph };
  }
  const res = validateDatacartaGraph(raw);
  if (!res.ok) {
    throw new Error(res.errors.join("\n"));
  }
  return { graph: raw as DatacartaGraph };
}

export function parseProjectFile(text: string): DatacartaGraph {
  return parseWorkspaceFile(text).graph;
}
