import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { DatacartaGraph, ModelBlueprint, Column, SourceRef, BlueprintStatus } from "datacarta-spec/client";
import { BLUEPRINT_STATUSES } from "datacarta-spec/client";
import { LAYER_ORDER } from "../../lib/lineage";
import { SqlEditor } from "../data-layer/SqlEditor";
import { scanColumns } from "../../lib/metric-scan";

/**
 * Analytics-engineering convention: data should flow source → raw → staging →
 * intermediate → mart → semantic → consumption. Skipping staging/intermediate
 * when building a mart is a smell — the mart ends up doing cleaning,
 * conforming, and business logic all in one model, which is hard to test,
 * reuse, and reason about.
 */
const RECOMMENDED_INTERMEDIATE_LAYERS = ["staging", "intermediate"] as const;

interface LayerSkipIssue {
  sourceLayerType: string;
  sourceModelName: string;
  targetLayerType: string;
  missingLayers: string[];
}

function genId(): string {
  return `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function genColId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Common Databricks / Snowflake data types */
const COMMON_DATATYPES = [
  "STRING",
  "VARCHAR(256)",
  "INT",
  "BIGINT",
  "DECIMAL(18,2)",
  "DOUBLE",
  "FLOAT",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TIMESTAMP_NTZ",
  "TIMESTAMP_LTZ",
  "VARIANT",
  "ARRAY",
  "OBJECT",
  "BINARY",
  "NUMBER(38,0)",
  "NUMBER(18,2)",
];

interface EditorState {
  name: string;
  displayName: string;
  description: string;
  layerId: string;
  domain: string;
  grain: string;
  status: BlueprintStatus;
  notes: string;
  columns: Column[];
  sourceRefs: SourceRef[];
  sql: string;
  sqlDialect: string;
}

function emptyState(graph: DatacartaGraph): EditorState {
  return {
    name: "",
    displayName: "",
    description: "",
    layerId: graph.layerDefinitions[0]?.id ?? "",
    domain: "",
    grain: "",
    status: "idea",
    notes: "",
    columns: [],
    sourceRefs: [],
    sql: "",
    sqlDialect: "ansi",
  };
}

function fromBlueprint(bp: ModelBlueprint): EditorState {
  return {
    name: bp.name,
    displayName: bp.displayName ?? "",
    description: bp.description ?? "",
    layerId: bp.layerId,
    domain: bp.domain ?? "",
    grain: bp.grain,
    status: bp.status,
    notes: bp.notes ?? "",
    columns: bp.columns.map((c) => ({ ...c })),
    sourceRefs: bp.sourceRefs.map((s) => ({ ...s, columnsUsed: [...s.columnsUsed] })),
    sql: bp.sql ?? "",
    sqlDialect: bp.sqlDialect ?? "ansi",
  };
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${mono ? "font-mono" : ""}`}
        style={{
          background: "var(--surface-hover)",
          border: "0.5px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

/** Datatype selector — dropdown of common types + custom option */
function DatatypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = !COMMON_DATATYPES.some((t) => t.toLowerCase() === value.toLowerCase()) && value !== "";
  const [showCustom, setShowCustom] = useState(isCustom);

  if (showCustom) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="custom_type"
          className="w-28 rounded px-2 py-1 font-mono text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          style={{
            background: "var(--bg-canvas)",
            border: "0.5px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => { setShowCustom(false); onChange("STRING"); }}
          className="text-[9px]"
          style={{ color: "var(--text-quaternary)" }}
          title="Switch to dropdown"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={COMMON_DATATYPES.find((t) => t.toLowerCase() === value.toLowerCase()) ?? "STRING"}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setShowCustom(true);
            onChange(value || "");
          } else {
            onChange(e.target.value);
          }
        }}
        className="w-32 rounded px-1.5 py-1 font-mono text-[11px] focus:outline-none"
        style={{
          background: "var(--bg-canvas)",
          border: "0.5px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {COMMON_DATATYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
        <option value="__custom__">Custom...</option>
      </select>
    </div>
  );
}

export function BlueprintEditor({
  graph,
  blueprint,
  onClose,
}: {
  graph: DatacartaGraph;
  blueprint: ModelBlueprint | null;
  onClose: () => void;
}) {
  const addBlueprint = useWorkspaceStore((s) => s.addBlueprint);
  const updateBlueprint = useWorkspaceStore((s) => s.updateBlueprint);
  const isNew = !blueprint;
  const [state, setState] = useState<EditorState>(
    blueprint ? fromBlueprint(blueprint) : emptyState(graph)
  );

  // Detect layer-skipping — e.g., a mart sourced directly from raw without
  // going through staging/intermediate. This is a classic analytics-engineering
  // anti-pattern that makes mart models unmaintainable.
  const layerSkipIssues = useMemo<LayerSkipIssue[]>(() => {
    const targetLayer = graph.layerDefinitions.find((l) => l.id === state.layerId);
    if (!targetLayer) return [];
    const targetOrder = LAYER_ORDER[targetLayer.type] ?? targetLayer.order;
    const issues: LayerSkipIssue[] = [];
    for (const ref of state.sourceRefs) {
      const sourceModel = graph.models.find((m) => m.id === ref.modelId);
      if (!sourceModel) continue;
      const sourceLayer = graph.layerDefinitions.find((l) => l.id === sourceModel.layerId);
      if (!sourceLayer) continue;
      const sourceOrder = LAYER_ORDER[sourceLayer.type] ?? sourceLayer.order;
      // Only warn when going from an upstream layer (<= raw) to a downstream
      // one (>= mart) without a staging/intermediate step in between.
      if (sourceOrder <= (LAYER_ORDER.raw ?? 1) && targetOrder >= (LAYER_ORDER.mart ?? 4)) {
        const missing = RECOMMENDED_INTERMEDIATE_LAYERS.filter((t) => {
          const o = LAYER_ORDER[t];
          return o !== undefined && o > sourceOrder && o < targetOrder;
        });
        if (missing.length > 0) {
          issues.push({
            sourceLayerType: sourceLayer.type,
            sourceModelName: sourceModel.displayName ?? sourceModel.name,
            targetLayerType: targetLayer.type,
            missingLayers: [...missing],
          });
        }
      }
    }
    return issues;
  }, [state.layerId, state.sourceRefs, graph.layerDefinitions, graph.models]);

  /** Suggest a staging/intermediate blueprint name derived from the source. */
  function scaffoldMissingLayer(layerType: string, sourceModelId: string) {
    const sourceModel = graph.models.find((m) => m.id === sourceModelId);
    if (!sourceModel) return;
    const targetLayer = graph.layerDefinitions.find((l) => l.type === layerType);
    if (!targetLayer) return;
    const prefix = layerType === "staging" ? "stg_" : "int_";
    // Strip leading source-layer prefix so stg_raw_foo becomes stg_foo.
    const base = sourceModel.name.replace(/^(raw_|src_)/i, "");
    const suggestedName = `${prefix}${base}`;
    const now = new Date().toISOString();
    addBlueprint({
      id: genId(),
      name: suggestedName,
      displayName: undefined,
      description: `${layerType === "staging" ? "Staged" : "Intermediate"} version of ${sourceModel.name}`,
      layerId: targetLayer.id,
      domain: sourceModel.domain,
      grain: sourceModel.grain ?? "",
      status: "idea",
      columns: [],
      sourceRefs: [{ modelId: sourceModelId, columnsUsed: [] }],
      notes: `Auto-scaffolded because ${state.name || "a downstream mart"} was trying to read directly from ${sourceModel.name} (${sourceModel.layerId}). Build this layer first to keep transformation logic testable.`,
      createdAt: now,
      updatedAt: now,
    });
  }

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function addColumn() {
    update("columns", [
      ...state.columns,
      {
        id: genColId(),
        name: "",
        dataType: "STRING",
      },
    ]);
  }

  function updateColumn(index: number, patch: Partial<Column>) {
    const cols = state.columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
    update("columns", cols);
  }

  function removeColumn(index: number) {
    update("columns", state.columns.filter((_, i) => i !== index));
  }

  /** Import all columns from a source model */
  function importColumnsFromModel(modelId: string) {
    const model = graph.models.find((m) => m.id === modelId);
    if (!model) return;
    // Avoid duplicates — check by name
    const existingNames = new Set(state.columns.map((c) => c.name.toLowerCase()));
    const newCols: Column[] = model.columns
      .filter((c) => !existingNames.has(c.name.toLowerCase()))
      .map((c) => ({
        id: genColId(),
        name: c.name,
        dataType: c.dataType,
        description: c.description,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
        isSurrogateKey: c.isSurrogateKey,
        isNaturalKey: c.isNaturalKey,
        scdRole: c.scdRole,
        // Carry metric/KPI flags across the import so derivations stay consistent
        // with their upstream source.
        isMetric: c.isMetric,
        isKPI: c.isKPI,
      }));
    if (newCols.length > 0) {
      update("columns", [...state.columns, ...newCols]);
    }
  }

  function addSourceRef() {
    if (graph.models.length === 0) return;
    update("sourceRefs", [
      ...state.sourceRefs,
      { modelId: graph.models[0].id, columnsUsed: [] },
    ]);
  }

  function updateSourceRef(index: number, patch: Partial<SourceRef>) {
    const refs = state.sourceRefs.map((r, i) => (i === index ? { ...r, ...patch } : r));
    update("sourceRefs", refs);
  }

  function removeSourceRef(index: number) {
    update("sourceRefs", state.sourceRefs.filter((_, i) => i !== index));
  }

  function save() {
    if (!state.name.trim()) return;
    const now = new Date().toISOString();
    const sqlTrim = state.sql.trim();
    if (isNew) {
      const bp: ModelBlueprint = {
        id: genId(),
        name: state.name.trim(),
        displayName: state.displayName.trim() || undefined,
        description: state.description.trim() || undefined,
        layerId: state.layerId,
        domain: state.domain.trim() || undefined,
        grain: state.grain.trim(),
        status: state.status,
        columns: state.columns.filter((c) => c.name.trim()),
        sourceRefs: state.sourceRefs,
        notes: state.notes.trim() || undefined,
        sql: sqlTrim ? state.sql : undefined,
        sqlDialect: sqlTrim ? state.sqlDialect : undefined,
        createdAt: now,
        updatedAt: now,
      };
      addBlueprint(bp);
    } else {
      updateBlueprint(blueprint!.id, {
        name: state.name.trim(),
        displayName: state.displayName.trim() || undefined,
        description: state.description.trim() || undefined,
        layerId: state.layerId,
        domain: state.domain.trim() || undefined,
        grain: state.grain.trim(),
        status: state.status,
        columns: state.columns.filter((c) => c.name.trim()),
        sourceRefs: state.sourceRefs,
        notes: state.notes.trim() || undefined,
        sql: sqlTrim ? state.sql : undefined,
        sqlDialect: sqlTrim ? state.sqlDialect : undefined,
      });
    }
    onClose();
  }

  const canSave = state.name.trim().length > 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {isNew ? "New Blueprint" : `Edit: ${blueprint!.displayName ?? blueprint!.name}`}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: canSave ? "var(--accent)" : "var(--surface-hover)",
              color: canSave ? "#fff" : "var(--text-quaternary)",
              opacity: canSave ? 1 : 0.5,
            }}
          >
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic fields */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
        >
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Name (technical)" value={state.name} onChange={(v) => update("name", v)} placeholder="fct_listen_sessions" mono />
            <InputField label="Display Name" value={state.displayName} onChange={(v) => update("displayName", v)} placeholder="Listen Sessions" />
          </div>
          <InputField label="Description" value={state.description} onChange={(v) => update("description", v)} placeholder="What this model represents..." />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Layer</label>
              <select
                value={state.layerId}
                onChange={(e) => update("layerId", e.target.value)}
                className="w-full rounded-lg px-3 py-1.5 text-[13px] focus:outline-none"
                style={{
                  background: "var(--surface-hover)",
                  border: "0.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {graph.layerDefinitions.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <InputField label="Grain" value={state.grain} onChange={(v) => update("grain", v)} placeholder="session_id" mono />
            <InputField label="Domain" value={state.domain} onChange={(v) => update("domain", v)} placeholder="growth" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Status</label>
            <div className="flex gap-1.5">
              {BLUEPRINT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("status", s)}
                  className="rounded-lg px-3 py-1 text-[12px] font-medium transition-all"
                  style={{
                    background: state.status === s ? "var(--accent-dim)" : "var(--surface-hover)",
                    color: state.status === s ? "var(--accent)" : "var(--text-tertiary)",
                    border: state.status === s ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Source Refs — moved above columns so import buttons make sense */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Sources <span style={{ color: "var(--text-quaternary)" }}>({state.sourceRefs.length})</span>
            </h3>
            <button
              type="button"
              onClick={addSourceRef}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add source
            </button>
          </div>
          {/* Analytics-engineering best-practice tip: building a mart directly
              from raw/source without going through staging/intermediate. */}
          {layerSkipIssues.length > 0 && (
            <div
              className="mb-3 rounded-lg p-3"
              style={{
                background: "rgba(255,159,10,0.08)",
                border: "0.5px solid rgba(255,159,10,0.4)",
              }}
            >
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "#FF9F0A" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: "#FF9F0A" }}>
                    Skipping layers
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    Analytics-engineering best practice: data should flow{" "}
                    <span className="font-mono">source → raw → staging → intermediate → mart</span>.
                    Reading raw tables directly into a mart mixes cleaning, conforming, and business logic in one place.
                  </div>
                  <div className="mt-2 space-y-2">
                    {layerSkipIssues.map((issue, i) => {
                      const ref = state.sourceRefs.find((r) => {
                        const m = graph.models.find((x) => x.id === r.modelId);
                        return (m?.displayName ?? m?.name) === issue.sourceModelName;
                      });
                      return (
                        <div key={i} className="rounded p-2" style={{ background: "rgba(255,159,10,0.06)" }}>
                          <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            <span className="font-mono">{issue.sourceModelName}</span>
                            <span style={{ color: "var(--text-quaternary)" }}> ({issue.sourceLayerType})</span>
                            <span style={{ color: "var(--text-quaternary)" }}> → {state.name || "this blueprint"} ({issue.targetLayerType})</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                              Scaffold missing layer:
                            </span>
                            {issue.missingLayers.map((lt) => (
                              <button
                                key={lt}
                                type="button"
                                onClick={() => ref && scaffoldMissingLayer(lt, ref.modelId)}
                                className="rounded px-2 py-0.5 text-[10px] font-semibold transition-colors"
                                style={{
                                  background: "rgba(255,159,10,0.15)",
                                  color: "#FF9F0A",
                                  border: "0.5px solid rgba(255,159,10,0.5)",
                                }}
                                title={`Create a ${lt} blueprint between these models`}
                              >
                                + {lt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {state.sourceRefs.length === 0 ? (
            <div className="py-4 text-center text-[12px]" style={{ color: "var(--text-quaternary)" }}>
              No sources. Add models this blueprint depends on.
            </div>
          ) : (
            <div className="space-y-2">
              {state.sourceRefs.map((ref, i) => {
                const sourceModel = graph.models.find((m) => m.id === ref.modelId);
                return (
                  <div
                    key={`sr-${i}`}
                    className="rounded-lg p-3"
                    style={{ background: "var(--surface-hover)" }}
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={ref.modelId}
                        onChange={(e) => updateSourceRef(i, { modelId: e.target.value })}
                        className="flex-1 rounded px-2 py-1 font-mono text-[12px] focus:outline-none"
                        style={{
                          background: "var(--bg-canvas)",
                          border: "0.5px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {graph.models.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => importColumnsFromModel(ref.modelId)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
                        style={{
                          background: "var(--accent-dim)",
                          color: "var(--accent)",
                          border: "0.5px solid var(--accent)",
                        }}
                        title={`Import ${sourceModel?.columns.length ?? 0} columns from ${sourceModel?.name ?? "model"}`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Import cols
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSourceRef(i)}
                        style={{ color: "var(--text-quaternary)" }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ref.columnsUsed.join(", ")}
                      onChange={(e) =>
                        updateSourceRef(i, {
                          columnsUsed: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="col1, col2, col3"
                      className="mt-2 w-full rounded px-2 py-1 font-mono text-[11px] focus:outline-none"
                      style={{
                        background: "var(--bg-canvas)",
                        border: "0.5px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columns */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Columns <span style={{ color: "var(--text-quaternary)" }}>({state.columns.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const { updated, flagged } = scanColumns(state.columns);
                  update("columns", updated);
                  // Use alert here for parity with the rest of the editor (no toast system yet).
                  if (flagged === 0) alert("No new metric-like columns detected.");
                  else alert(`Flagged ${flagged} column${flagged === 1 ? "" : "s"} as metric${flagged === 1 ? "" : "s"}.`);
                }}
                disabled={state.columns.length === 0}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: "#007AFF" }}
                title="Detect metric-like columns by name (revenue, mrr, *_count, total_*, …)"
              >
                Scan metrics
              </button>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add column
              </button>
            </div>
          </div>
          {state.columns.length === 0 ? (
            <div className="py-4 text-center text-[12px]" style={{ color: "var(--text-quaternary)" }}>
              No columns yet. Add a source and click "Import cols", or add manually.
            </div>
          ) : (
            <div className="space-y-1.5">
              {state.columns.map((col, i) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 rounded-lg p-2"
                  style={{ background: "var(--surface-hover)" }}
                >
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(i, { name: e.target.value })}
                    placeholder="column_name"
                    className="w-40 rounded px-2 py-1 font-mono text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      background: "var(--bg-canvas)",
                      border: "0.5px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <DatatypeSelect
                    value={col.dataType}
                    onChange={(v) => updateColumn(i, { dataType: v })}
                  />
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    <input
                      type="checkbox"
                      checked={col.isPrimaryKey ?? false}
                      onChange={(e) => updateColumn(i, { isPrimaryKey: e.target.checked || undefined })}
                    />
                    PK
                  </label>
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    <input
                      type="checkbox"
                      checked={col.isForeignKey ?? false}
                      onChange={(e) => updateColumn(i, { isForeignKey: e.target.checked || undefined })}
                    />
                    FK
                  </label>
                  <label className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    <input
                      type="checkbox"
                      checked={col.isSurrogateKey ?? false}
                      onChange={(e) => updateColumn(i, { isSurrogateKey: e.target.checked || undefined })}
                    />
                    SK
                  </label>
                  <label
                    className="flex items-center gap-1 text-[10px]"
                    style={{ color: col.isMetric ? "#007AFF" : "var(--text-tertiary)" }}
                    title="Mark this column as a measurable metric"
                  >
                    <input
                      type="checkbox"
                      checked={col.isMetric ?? false}
                      onChange={(e) => {
                        const isMetric = e.target.checked || undefined;
                        // Un-checking metric also clears KPI — you can't have a KPI that isn't a metric.
                        const patch: Partial<Column> = { isMetric };
                        if (!isMetric) patch.isKPI = undefined;
                        updateColumn(i, patch);
                      }}
                    />
                    M
                  </label>
                  <label
                    className="flex items-center gap-1 text-[10px]"
                    style={{ color: col.isKPI ? "#FF9F0A" : "var(--text-tertiary)", opacity: col.isMetric ? 1 : 0.4 }}
                    title={col.isMetric ? "Promote this metric to a KPI" : "Mark as metric (M) first to enable KPI"}
                  >
                    <input
                      type="checkbox"
                      checked={col.isKPI ?? false}
                      disabled={!col.isMetric}
                      onChange={(e) => updateColumn(i, { isKPI: e.target.checked || undefined })}
                    />
                    KPI
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    className="ml-auto text-[11px] transition-colors"
                    style={{ color: "var(--text-quaternary)" }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL */}
        <SqlEditor
          sql={state.sql}
          dialect={state.sqlDialect}
          onChange={(patch) => {
            if (patch.sql !== undefined) update("sql", patch.sql ?? "");
            if (patch.sqlDialect !== undefined) update("sqlDialect", patch.sqlDialect ?? "ansi");
          }}
        />

        {/* Notes */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
        >
          <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>Notes</label>
          <textarea
            value={state.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Implementation notes, decisions, open questions..."
            rows={3}
            className="w-full resize-none rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{
              background: "var(--surface-hover)",
              border: "0.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
