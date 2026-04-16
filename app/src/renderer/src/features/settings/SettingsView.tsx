import { useMemo, useState } from "react";
import { LAYER_TYPES, type LayerType } from "datacarta-spec/client";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { DEFAULT_LAYER_DEFINITIONS, defaultLayerNameFor } from "../../lib/lineage";

export function SettingsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const addLayer = useWorkspaceStore((s) => s.addLayer);
  const updateLayer = useWorkspaceStore((s) => s.updateLayer);
  const deleteLayer = useWorkspaceStore((s) => s.deleteLayer);
  const moveLayer = useWorkspaceStore((s) => s.moveLayer);

  const layers = useMemo(
    () => [...(graph?.layerDefinitions ?? [])].sort((a, b) => a.order - b.order),
    [graph?.layerDefinitions],
  );

  // Usage counts so we can show "safe to delete" cues and block deletion of
  // layers that still anchor real nodes.
  const usageById = useMemo(() => {
    const map = new Map<string, { models: number; blueprints: number }>();
    if (!graph) return map;
    for (const l of graph.layerDefinitions) map.set(l.id, { models: 0, blueprints: 0 });
    for (const m of graph.models) {
      const u = map.get(m.layerId);
      if (u) u.models += 1;
    }
    for (const b of graph.blueprints) {
      const u = map.get(b.layerId);
      if (u) u.blueprints += 1;
    }
    return map;
  }, [graph]);

  // Which canonical types are still available to add as a new layer?
  const availableTypes = useMemo<LayerType[]>(() => {
    const used = new Set(layers.map((l) => l.type));
    return LAYER_TYPES.filter((t) => !used.has(t));
  }, [layers]);

  const [newType, setNewType] = useState<LayerType | "">(availableTypes[0] ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  // Keep the "add layer" selector pointed at something addable when the set changes.
  if (newType && !availableTypes.includes(newType as LayerType)) {
    setNewType(availableTypes[0] ?? "");
  }

  function handleAdd() {
    if (!newType) return;
    const type = newType as LayerType;
    const nextOrder = layers.length > 0 ? Math.max(...layers.map((l) => l.order)) + 1 : 0;
    const id = `layer-${type}`;
    addLayer({ id, name: defaultLayerNameFor(type), type, order: nextOrder });
  }

  function handleResetDefaults() {
    // Only meaningful when there are no layers — otherwise the user should
    // delete individually to make intent explicit.
    for (const l of DEFAULT_LAYER_DEFINITIONS) addLayer({ ...l });
  }

  function handleDelete(id: string) {
    setLocalError(null);
    const res = deleteLayer(id);
    if (!res.ok) setLocalError(res.error);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">Layers</div>
            <p
              className="mt-1 text-[12px] leading-relaxed"
              style={{ color: "var(--text-tertiary)" }}
            >
              These power every "pick a layer" dropdown (blueprints, ingest, models). Rename,
              reorder, add, or delete layers to match your team's taxonomy.
            </p>
          </div>
          {layers.length === 0 && graph ? (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: "#007AFF" }}
            >
              Load defaults
            </button>
          ) : null}
        </div>

        {!graph ? (
          <div
            className="mt-4 rounded-lg p-4 text-center text-[12px]"
            style={{ color: "var(--text-quaternary)", border: "0.5px dashed var(--border-strong)" }}
          >
            Open a workspace to edit its layers.
          </div>
        ) : layers.length === 0 ? (
          <div
            className="mt-4 rounded-lg p-4 text-center text-[12px]"
            style={{ color: "var(--text-quaternary)", border: "0.5px dashed var(--border-strong)" }}
          >
            No layers yet. Load the canonical seven-layer defaults or add them one at a time below.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {layers.map((l, i) => {
              const usage = usageById.get(l.id) ?? { models: 0, blueprints: 0 };
              const inUse = usage.models + usage.blueprints > 0;
              return (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg p-2.5"
                  style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLayer(l.id, -1)}
                      disabled={i === 0}
                      className="rounded px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                      style={{ color: "var(--text-secondary)", background: "var(--bg-canvas)" }}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(l.id, +1)}
                      disabled={i === layers.length - 1}
                      className="rounded px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                      style={{ color: "var(--text-secondary)", background: "var(--bg-canvas)" }}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <input
                    type="text"
                    value={l.name}
                    onChange={(e) => updateLayer(l.id, { name: e.target.value })}
                    className="flex-1 min-w-[160px] rounded px-2 py-1 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      background: "var(--bg-canvas)",
                      border: "0.5px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: "var(--text-quaternary)" }}
                    title="Canonical layer type (drives ordering and governance rules)"
                  >
                    {l.type}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                    {usage.models}m · {usage.blueprints}b
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id)}
                    disabled={inUse}
                    className="rounded px-2 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ color: "var(--text-tertiary)", background: "var(--bg-canvas)" }}
                    title={
                      inUse
                        ? "Reassign the models/blueprints that reference this layer before deleting."
                        : "Delete this layer"
                    }
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {graph && availableTypes.length > 0 ? (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label
                className="mb-1 block text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Add layer
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as LayerType)}
                className="w-full rounded-lg px-3 py-1.5 text-[13px] focus:outline-none"
                style={{
                  background: "var(--surface-hover)",
                  border: "0.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {defaultLayerNameFor(t)} ({t})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: "#007AFF" }}
            >
              Add
            </button>
          </div>
        ) : null}

        {localError ? (
          <div
            className="mt-3 rounded-lg p-2.5 text-[12px]"
            style={{
              background: "rgba(255,69,58,0.08)",
              border: "0.5px solid rgba(255,69,58,0.4)",
              color: "#FF453A",
            }}
          >
            {localError}
          </div>
        ) : null}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">
          Local-first storage
        </div>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          This app stores projects under the Electron{" "}
          <span className="font-mono text-[var(--text-secondary)]">userData</span> directory.
          Nothing leaves your machine unless you export JSON explicitly.
        </p>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Telemetry</div>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--text-tertiary)" }}
        >
          None. This build does not phone home.
        </p>
      </div>
    </div>
  );
}
