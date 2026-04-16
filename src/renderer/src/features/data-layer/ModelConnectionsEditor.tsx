import { useMemo, useState } from "react";
import { EDGE_TYPES, type DatacartaGraph, type EdgeType } from "datacarta-spec/client";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { EDGE_TYPE_DESCRIPTIONS, EDGE_TYPE_LABELS } from "../../lib/lineage";
import { domainColor, layerColor } from "./DataLayerView";

/**
 * Edit upstream + downstream connections for a single model.
 * Shows existing edges with delete + change-type controls, plus an "Add
 * connection" form to create new ones.
 */
export function ModelConnectionsEditor({
  graph,
  modelId,
}: {
  graph: DatacartaGraph;
  modelId: string;
}) {
  const addEdge = useWorkspaceStore((s) => s.addEdge);
  const updateEdge = useWorkspaceStore((s) => s.updateEdge);
  const deleteEdge = useWorkspaceStore((s) => s.deleteEdge);

  const modelById = useMemo(() => new Map(graph.models.map((m) => [m.id, m])), [graph.models]);
  const layerById = useMemo(() => new Map(graph.layerDefinitions.map((l) => [l.id, l])), [graph.layerDefinitions]);

  const upstream = graph.edges.filter((e) => e.targetId === modelId);
  const downstream = graph.edges.filter((e) => e.sourceId === modelId);

  const [adding, setAdding] = useState<"upstream" | "downstream" | null>(null);
  const [newTargetId, setNewTargetId] = useState<string>("");
  const [newType, setNewType] = useState<EdgeType>("depends_on");

  function handleAdd() {
    if (!newTargetId || !adding) return;
    if (adding === "upstream") {
      // Other model feeds INTO this one
      addEdge(newTargetId, modelId, newType);
    } else {
      // This one feeds INTO other model
      addEdge(modelId, newTargetId, newType);
    }
    setAdding(null);
    setNewTargetId("");
    setNewType("depends_on");
  }

  const otherModels = graph.models.filter((m) => m.id !== modelId);

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Connections</h3>
        <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
          {upstream.length} upstream · {downstream.length} downstream
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Upstream column */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
              Upstream (feeds this table)
            </div>
            <button
              type="button"
              onClick={() => { setAdding(adding === "upstream" ? null : "upstream"); setNewTargetId(""); }}
              className="text-[11px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              {adding === "upstream" ? "Cancel" : "+ Add"}
            </button>
          </div>
          <div className="space-y-1.5">
            {upstream.length === 0 && adding !== "upstream" && (
              <div className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>No upstream connections</div>
            )}
            {upstream.map((e) => {
              const src = modelById.get(e.sourceId);
              const srcLayer = src ? layerById.get(src.layerId) : undefined;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: "var(--surface-hover)" }}
                >
                  {srcLayer && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: layerColor(srcLayer.type) }}
                      title={srcLayer.name}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {src?.name ?? e.sourceId}
                    </div>
                    {src?.domain && (
                      <span
                        className="mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold"
                        style={{ background: `${domainColor(src.domain)}20`, color: domainColor(src.domain) }}
                      >
                        {src.domain}
                      </span>
                    )}
                  </div>
                  <EdgeTypeSelect
                    value={e.type}
                    onChange={(t) => updateEdge(e.id, { type: t })}
                  />
                  <button
                    type="button"
                    onClick={() => deleteEdge(e.id)}
                    title="Remove connection"
                    style={{ color: "var(--text-quaternary)" }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {adding === "upstream" && (
              <AddConnectionRow
                models={otherModels}
                layerById={layerById}
                newTargetId={newTargetId}
                setNewTargetId={setNewTargetId}
                newType={newType}
                setNewType={setNewType}
                onAdd={handleAdd}
                direction="upstream"
              />
            )}
          </div>
        </div>

        {/* Downstream column */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
              Downstream (this table feeds)
            </div>
            <button
              type="button"
              onClick={() => { setAdding(adding === "downstream" ? null : "downstream"); setNewTargetId(""); }}
              className="text-[11px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              {adding === "downstream" ? "Cancel" : "+ Add"}
            </button>
          </div>
          <div className="space-y-1.5">
            {downstream.length === 0 && adding !== "downstream" && (
              <div className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>No downstream connections</div>
            )}
            {downstream.map((e) => {
              const tgt = modelById.get(e.targetId);
              const tgtLayer = tgt ? layerById.get(tgt.layerId) : undefined;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: "var(--surface-hover)" }}
                >
                  {tgtLayer && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: layerColor(tgtLayer.type) }}
                      title={tgtLayer.name}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {tgt?.name ?? e.targetId}
                    </div>
                    {tgt?.domain && (
                      <span
                        className="mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold"
                        style={{ background: `${domainColor(tgt.domain)}20`, color: domainColor(tgt.domain) }}
                      >
                        {tgt.domain}
                      </span>
                    )}
                  </div>
                  <EdgeTypeSelect
                    value={e.type}
                    onChange={(t) => updateEdge(e.id, { type: t })}
                  />
                  <button
                    type="button"
                    onClick={() => deleteEdge(e.id)}
                    title="Remove connection"
                    style={{ color: "var(--text-quaternary)" }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {adding === "downstream" && (
              <AddConnectionRow
                models={otherModels}
                layerById={layerById}
                newTargetId={newTargetId}
                setNewTargetId={setNewTargetId}
                newType={newType}
                setNewType={setNewType}
                onAdd={handleAdd}
                direction="downstream"
              />
            )}
          </div>
        </div>
      </div>

      {/* Edge type legend */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-medium" style={{ color: "var(--text-quaternary)" }}>
          What do the connection types mean?
        </summary>
        <div className="mt-2 space-y-1 rounded-lg p-2" style={{ background: "var(--surface-hover)" }}>
          {EDGE_TYPES.map((t) => (
            <div key={t} className="text-[11px]">
              <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{EDGE_TYPE_LABELS[t]}</span>
              <span style={{ color: "var(--text-quaternary)" }}> — {EDGE_TYPE_DESCRIPTIONS[t]}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function EdgeTypeSelect({
  value,
  onChange,
}: {
  value: EdgeType;
  onChange: (v: EdgeType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EdgeType)}
      className="rounded px-1 py-0.5 text-[10px] focus:outline-none"
      style={{
        background: "var(--bg-canvas)",
        border: "0.5px solid var(--border)",
        color: "var(--text-secondary)",
      }}
      title={EDGE_TYPE_DESCRIPTIONS[value]}
    >
      {EDGE_TYPES.map((t) => (
        <option key={t} value={t}>
          {EDGE_TYPE_LABELS[t]}
        </option>
      ))}
    </select>
  );
}

function AddConnectionRow({
  models,
  layerById,
  newTargetId,
  setNewTargetId,
  newType,
  setNewType,
  onAdd,
  direction,
}: {
  models: DatacartaGraph["models"];
  layerById: Map<string, DatacartaGraph["layerDefinitions"][number]>;
  newTargetId: string;
  setNewTargetId: (v: string) => void;
  newType: EdgeType;
  setNewType: (v: EdgeType) => void;
  onAdd: () => void;
  direction: "upstream" | "downstream";
}) {
  // Sort candidates by layer order so upstream lists source/raw first and
  // downstream lists mart/consumption first.
  const sorted = useMemo(() => {
    return [...models].sort((a, b) => {
      const la = layerById.get(a.layerId)?.order ?? 99;
      const lb = layerById.get(b.layerId)?.order ?? 99;
      return direction === "upstream" ? la - lb : lb - la;
    });
  }, [models, layerById, direction]);

  return (
    <div
      className="flex items-center gap-2 rounded-lg p-2"
      style={{ background: "rgba(0,122,255,0.06)", border: "0.5px dashed var(--accent)" }}
    >
      <select
        value={newTargetId}
        onChange={(e) => setNewTargetId(e.target.value)}
        className="flex-1 rounded px-1.5 py-1 font-mono text-[11px] focus:outline-none"
        style={{ background: "var(--bg-canvas)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
      >
        <option value="">Select a model…</option>
        {sorted.map((m) => {
          const l = layerById.get(m.layerId);
          return (
            <option key={m.id} value={m.id}>
              {l ? `[${l.name}] ` : ""}{m.name}
            </option>
          );
        })}
      </select>
      <EdgeTypeSelect value={newType} onChange={setNewType} />
      <button
        type="button"
        onClick={onAdd}
        disabled={!newTargetId}
        className="rounded-md px-2 py-0.5 text-[10px] font-semibold transition-opacity"
        style={{
          background: newTargetId ? "var(--accent)" : "var(--surface-hover)",
          color: newTargetId ? "#fff" : "var(--text-quaternary)",
          opacity: newTargetId ? 1 : 0.5,
        }}
      >
        Add
      </button>
    </div>
  );
}
