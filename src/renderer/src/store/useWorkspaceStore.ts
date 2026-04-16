import { create } from "zustand";
import type { DatacartaGraph, Model, ModelBlueprint, Column, ModelEdge, EdgeType, Metric } from "datacarta-spec/client";
import { LAYER_TYPES, type LayerType } from "datacarta-spec/client";
import { scanColumns } from "../lib/metric-scan";

export type AppView = "projects" | "data-layer" | "models" | "metrics" | "blueprints" | "governance" | "imports" | "export" | "settings";
export type Theme = "dark" | "light";

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
  theme: Theme;
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
  toggleTheme: () => void;
  // Blueprint CRUD
  addBlueprint: (bp: ModelBlueprint) => void;
  updateBlueprint: (id: string, patch: Partial<ModelBlueprint>) => void;
  deleteBlueprint: (id: string) => void;
  // Edge CRUD
  addEdge: (sourceId: string, targetId: string, type: EdgeType) => void;
  updateEdge: (id: string, patch: Partial<ModelEdge>) => void;
  deleteEdge: (id: string) => void;
  // Model updates (e.g., editing SQL, description, sourceClassification)
  updateModel: (id: string, patch: Partial<Model>) => void;
  // Column updates inside a model
  updateColumn: (modelId: string, columnId: string, patch: Partial<Column>) => void;
  // Run the metric-detection heuristic against every column. Returns the number of
  // newly flagged columns so the caller can surface a toast / confirmation.
  scanAllMetrics: () => number;
  // Metric-level updates (e.g., toggling isKPI)
  updateMetric: (id: string, patch: Partial<Metric>) => void;
  /**
   * Bulk-add new models and edges (e.g. from a connector ingest). Ensures the
   * referenced layer ids exist, creating layer-source / layer-raw as needed.
   * Returns the number of models actually added. If no graph is loaded, a
   * minimal graph is initialized so the user can ingest into an empty workspace.
   */
  ingestModels: (input: { models: Model[]; edges?: ModelEdge[]; projectName?: string }) => number;
}

export const ALL_LAYER_TYPES: LayerType[] = [...LAYER_TYPES];

function applyThemeToDOM(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

const savedTheme = (typeof localStorage !== "undefined"
  ? (localStorage.getItem("datacarta-theme") as Theme | null)
  : null) ?? "dark";

// Apply on load
if (typeof document !== "undefined") applyThemeToDOM(savedTheme);

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
  theme: savedTheme,
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
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem("datacarta-theme", next);
    applyThemeToDOM(next);
    set({ theme: next });
  },
  // Blueprint CRUD
  addBlueprint: (bp) => {
    const g = get().graph;
    if (!g) return;
    set({ graph: { ...g, blueprints: [...g.blueprints, bp] } });
  },
  updateBlueprint: (id, patch) => {
    const g = get().graph;
    if (!g) return;
    set({
      graph: {
        ...g,
        blueprints: g.blueprints.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
      },
    });
  },
  deleteBlueprint: (id) => {
    const g = get().graph;
    if (!g) return;
    set({ graph: { ...g, blueprints: g.blueprints.filter((b) => b.id !== id) } });
  },
  addEdge: (sourceId, targetId, type) => {
    const g = get().graph;
    if (!g) return;
    // Avoid exact duplicate (same source, target, type)
    const exists = g.edges.some((e) => e.sourceId === sourceId && e.targetId === targetId && e.type === type);
    if (exists) return;
    const edge: ModelEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceId,
      targetId,
      type,
    };
    set({ graph: { ...g, edges: [...g.edges, edge] } });
  },
  updateEdge: (id, patch) => {
    const g = get().graph;
    if (!g) return;
    set({
      graph: {
        ...g,
        edges: g.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    });
  },
  deleteEdge: (id) => {
    const g = get().graph;
    if (!g) return;
    set({ graph: { ...g, edges: g.edges.filter((e) => e.id !== id) } });
  },
  updateModel: (id, patch) => {
    const g = get().graph;
    if (!g) return;
    const now = new Date().toISOString();
    set({
      graph: {
        ...g,
        models: g.models.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: now } : m)),
      },
    });
  },
  updateColumn: (modelId, columnId, patch) => {
    const g = get().graph;
    if (!g) return;
    const now = new Date().toISOString();
    set({
      graph: {
        ...g,
        models: g.models.map((m) =>
          m.id !== modelId
            ? m
            : {
                ...m,
                columns: m.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
                updatedAt: now,
              },
        ),
      },
    });
  },
  scanAllMetrics: () => {
    const g = get().graph;
    if (!g) return 0;
    let total = 0;
    const now = new Date().toISOString();
    const models = g.models.map((m) => {
      const { updated, flagged } = scanColumns(m.columns);
      if (flagged === 0) return m;
      total += flagged;
      return { ...m, columns: updated, updatedAt: now };
    });
    if (total > 0) set({ graph: { ...g, models } });
    return total;
  },
  updateMetric: (id, patch) => {
    const g = get().graph;
    if (!g) return;
    set({
      graph: {
        ...g,
        metrics: g.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      },
    });
  },
  ingestModels: ({ models, edges = [], projectName }) => {
    let g = get().graph;
    if (!g) {
      // Bootstrap a minimal graph so ingest works from a cold start.
      g = {
        specVersion: "0.2.0",
        projectId: `proj-${Date.now().toString(36)}`,
        projectName: projectName ?? "New Workspace",
        layerDefinitions: [],
        models: [],
        edges: [],
        metrics: [],
        dataMarts: [],
        blueprints: [],
        owners: [],
        teams: [],
      };
    }

    // Ensure every referenced layer exists. We only auto-create the canonical
    // ones connectors emit today (source + raw); anything exotic is the caller's
    // problem to set up.
    const layerDefsById = new Map(g.layerDefinitions.map((l) => [l.id, l]));
    const autoLayers: Record<string, { name: string; type: LayerType; order: number }> = {
      "layer-source": { name: "Source", type: "source", order: 0 },
      "layer-raw": { name: "Raw", type: "raw", order: 1 },
      "layer-staging": { name: "Staging", type: "staging", order: 2 },
      "layer-intermediate": { name: "Intermediate", type: "intermediate", order: 3 },
      "layer-mart": { name: "Mart", type: "mart", order: 4 },
    };
    const newLayers = [...g.layerDefinitions];
    for (const m of models) {
      if (layerDefsById.has(m.layerId)) continue;
      const spec = autoLayers[m.layerId];
      if (!spec) continue;
      const def = { id: m.layerId, ...spec };
      newLayers.push(def);
      layerDefsById.set(def.id, def);
    }

    // De-dupe by name+layerId so repeated ingests from the same connector
    // don't pile up clones — instead we skip anything that already exists.
    const existingKeys = new Set(g.models.map((m) => `${m.layerId}:${m.name.toLowerCase()}`));
    const addedModels: Model[] = [];
    const skippedIds = new Set<string>();
    for (const m of models) {
      const key = `${m.layerId}:${m.name.toLowerCase()}`;
      if (existingKeys.has(key)) {
        skippedIds.add(m.id);
        continue;
      }
      existingKeys.add(key);
      addedModels.push(m);
    }
    // Only keep edges that reference models we actually added (or that already exist).
    const validModelIds = new Set([...g.models.map((m) => m.id), ...addedModels.map((m) => m.id)]);
    const addedEdges = edges.filter(
      (e) => validModelIds.has(e.sourceId) && validModelIds.has(e.targetId) && !skippedIds.has(e.sourceId) && !skippedIds.has(e.targetId),
    );

    set({
      graph: {
        ...g,
        layerDefinitions: newLayers.sort((a, b) => a.order - b.order),
        models: [...g.models, ...addedModels],
        edges: [...g.edges, ...addedEdges],
      },
    });
    return addedModels.length;
  },
}));
