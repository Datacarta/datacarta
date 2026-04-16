import { create } from "zustand";
import type { DatacartaGraph, ModelBlueprint } from "datacarta-spec/client";
import { LAYER_TYPES, type LayerType } from "datacarta-spec/client";

export type AppView = "projects" | "data-layer" | "models" | "metrics" | "blueprints" | "governance" | "imports" | "export" | "settings";

interface WorkspaceState {
  activeView: AppView;
  graph: DatacartaGraph | null;
  projectFilename: string | null;
  selectedModelId: string | null;
  layerFilter: Set<LayerType> | null;
  search: string;
  lastError: string | null;
  zoomLevel: 1 | 2 | 3;
  zoomLayerId: string | null;
  zoomModelId: string | null;
  setActiveView: (v: AppView) => void;
  openWorkspace: (graph: DatacartaGraph, filename?: string | null) => void;
  setSelectedModelId: (id: string | null) => void;
  toggleLayerType: (t: LayerType) => void;
  clearLayerFilter: () => void;
  setSearch: (s: string) => void;
  setLastError: (e: string | null) => void;
  zoomToLayer: (layerId: string) => void;
  zoomToModel: (modelId: string) => void;
  zoomOut: () => void;
}

export const ALL_LAYER_TYPES: LayerType[] = [...LAYER_TYPES];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeView: "data-layer",
  graph: null,
  projectFilename: null,
  selectedModelId: null,
  layerFilter: null,
  search: "",
  lastError: null,
  zoomLevel: 1,
  zoomLayerId: null,
  zoomModelId: null,
  setActiveView: (v) => set({ activeView: v }),
  openWorkspace: (graph, filename) =>
    set({
      graph,
      projectFilename: filename !== undefined ? filename : get().projectFilename,
      selectedModelId: null,
      zoomLevel: 1,
      zoomLayerId: null,
      zoomModelId: null,
    }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  toggleLayerType: (t) => {
    const cur = get().layerFilter;
    if (!cur) {
      const next = new Set<LayerType>(ALL_LAYER_TYPES);
      next.delete(t);
      set({ layerFilter: next });
      return;
    }
    const next = new Set(cur);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    if (next.size === ALL_LAYER_TYPES.length) set({ layerFilter: null });
    else set({ layerFilter: next });
  },
  clearLayerFilter: () => set({ layerFilter: null }),
  setSearch: (s) => set({ search: s }),
  setLastError: (e) => set({ lastError: e }),
  zoomToLayer: (layerId) => set({ zoomLevel: 2, zoomLayerId: layerId, zoomModelId: null }),
  zoomToModel: (modelId) => set({ zoomLevel: 3, zoomModelId: modelId }),
  zoomOut: () => {
    const level = get().zoomLevel;
    if (level === 3) set({ zoomLevel: 2, zoomModelId: null });
    else if (level === 2) set({ zoomLevel: 1, zoomLayerId: null });
  },
}));
