import { create } from "zustand";
import type { DatacartaGraph } from "datacarta-spec/client";
import { NODE_TYPES, type NodeType } from "datacarta-spec/client";
import type { ModelBlueprint } from "../types/project";

export type AppView = "projects" | "graph" | "nodes" | "blueprints" | "imports" | "export" | "settings";

interface WorkspaceState {
  activeView: AppView;
  graph: DatacartaGraph | null;
  blueprints: ModelBlueprint[];
  projectFilename: string | null;
  selectedNodeId: string | null;
  nodeTypeFilter: Set<NodeType> | null;
  search: string;
  lastError: string | null;
  setActiveView: (v: AppView) => void;
  /** Replace workspace; clears blueprints unless provided. */
  openWorkspace: (graph: DatacartaGraph, filename?: string | null, blueprints?: ModelBlueprint[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  toggleNodeType: (t: NodeType) => void;
  clearNodeTypeFilter: () => void;
  setSearch: (s: string) => void;
  setLastError: (e: string | null) => void;
  addBlueprint: (b: ModelBlueprint) => void;
  updateBlueprint: (id: string, patch: Partial<ModelBlueprint>) => void;
  removeBlueprint: (id: string) => void;
}

export const ALL_NODE_TYPES: NodeType[] = [...NODE_TYPES];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeView: "graph",
  graph: null,
  blueprints: [],
  projectFilename: null,
  selectedNodeId: null,
  nodeTypeFilter: null,
  search: "",
  lastError: null,
  setActiveView: (v) => set({ activeView: v }),
  openWorkspace: (graph, filename, blueprints) =>
    set({
      graph,
      projectFilename: filename !== undefined ? filename : get().projectFilename,
      blueprints: blueprints !== undefined ? blueprints : [],
      selectedNodeId: null,
    }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleNodeType: (t) => {
    const cur = get().nodeTypeFilter;
    if (!cur) {
      const next = new Set<NodeType>(ALL_NODE_TYPES);
      next.delete(t);
      set({ nodeTypeFilter: next });
      return;
    }
    const next = new Set(cur);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    if (next.size === ALL_NODE_TYPES.length) set({ nodeTypeFilter: null });
    else set({ nodeTypeFilter: next });
  },
  clearNodeTypeFilter: () => set({ nodeTypeFilter: null }),
  setSearch: (s) => set({ search: s }),
  setLastError: (e) => set({ lastError: e }),
  addBlueprint: (b) => set({ blueprints: [...get().blueprints, b] }),
  updateBlueprint: (id, patch) =>
    set({
      blueprints: get().blueprints.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x
      ),
    }),
  removeBlueprint: (id) => set({ blueprints: get().blueprints.filter((x) => x.id !== id) }),
}));
