import type { DatacartaGraph, ModelBlueprint } from "datacarta-spec/client";

// Re-export spec types used by the desktop app
export type { ModelBlueprint } from "datacarta-spec/client";

export interface DesktopProjectFile {
  kind: "datacarta-desktop-project";
  /** v1 = graph only; v2 = graph + blueprints; v3 = v0.2.0 spec */
  version: 1 | 2 | 3;
  savedAt: string;
  graph: DatacartaGraph;
  blueprints?: ModelBlueprint[];
}
