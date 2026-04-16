import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { ModelBlueprint, Column } from "datacarta-spec/client";
import { BlueprintEditor } from "./BlueprintEditor";

const STATUS_COLORS: Record<string, string> = {
  idea: "var(--text-quaternary)",
  drafting: "#FF9F0A",
  reviewed: "#007AFF",
  shipped: "#30D158",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "var(--text-quaternary)";
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      {status}
    </span>
  );
}

function BlueprintCard({
  bp,
  isSelected,
  onClick,
}: {
  bp: ModelBlueprint;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl p-3.5 text-left transition-all duration-150"
      style={{
        background: isSelected ? "var(--accent-dim)" : "var(--bg-card)",
        border: isSelected
          ? "0.5px solid var(--accent)"
          : "0.5px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {bp.displayName ?? bp.name}
        </span>
        <StatusBadge status={bp.status} />
      </div>
      {bp.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {bp.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
        <span>{bp.columns.length} cols</span>
        <span>{bp.sourceRefs.length} sources</span>
        {bp.grain && <span>grain: {bp.grain}</span>}
      </div>
    </button>
  );
}

function BlueprintDetail({ bp, graph, onEdit }: {
  bp: ModelBlueprint;
  graph: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["graph"]>;
  onEdit: () => void;
}) {
  const deleteBlueprint = useWorkspaceStore((s) => s.deleteBlueprint);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const modelIndex = useMemo(
    () => new Map(graph.models.map((m) => [m.id, m])),
    [graph.models]
  );
  const layerIndex = useMemo(
    () => new Map(graph.layerDefinitions.map((l) => [l.id, l])),
    [graph.layerDefinitions]
  );

  const layer = layerIndex.get(bp.layerId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--bg-elevated)",
          backdropFilter: "blur(20px)",
          border: "0.5px solid var(--border)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{bp.displayName ?? bp.name}</h3>
            {bp.displayName && (
              <div className="mt-0.5 font-mono text-[12px]" style={{ color: "var(--text-quaternary)" }}>{bp.name}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg px-3 py-1 text-[12px] font-medium transition-colors"
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "0.5px solid var(--accent)",
              }}
            >
              Edit
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => deleteBlueprint(bp.id)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium"
                  style={{ background: "rgba(255,59,48,0.15)", color: "#FF3B30" }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
                style={{ color: "var(--text-quaternary)" }}
              >
                Delete
              </button>
            )}
            <StatusBadge status={bp.status} />
          </div>
        </div>
        {bp.description && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>{bp.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <span>Layer: {layer?.name ?? bp.layerId}</span>
          <span>Grain: {bp.grain}</span>
          {bp.domain && <span>Domain: {bp.domain}</span>}
          {bp.linkedModelId && <span>Linked: {modelIndex.get(bp.linkedModelId)?.name ?? bp.linkedModelId}</span>}
        </div>
      </div>

      {/* Source Refs */}
      {bp.sourceRefs.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
        >
          <h4 className="mb-3 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Sources <span style={{ color: "var(--text-quaternary)" }}>({bp.sourceRefs.length})</span>
          </h4>
          <div className="space-y-2">
            {bp.sourceRefs.map((ref, i) => {
              const srcModel = modelIndex.get(ref.modelId);
              return (
                <div
                  key={`${ref.modelId}-${i}`}
                  className="rounded-lg p-3"
                  style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                      {srcModel?.name ?? ref.modelId}
                    </span>
                    {ref.joinType && (
                      <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
                        {ref.joinType} join
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--text-quaternary)" }}>
                    {ref.columnsUsed.join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Columns */}
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
      >
        <h4 className="mb-3 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Columns <span style={{ color: "var(--text-quaternary)" }}>({bp.columns.length})</span>
        </h4>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "0.5px solid var(--border-strong)" }}>
              <th className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Name</th>
              <th className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Type</th>
              <th className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {bp.columns.map((col) => {
              const roles: string[] = [];
              if (col.isPrimaryKey) roles.push("PK");
              if (col.isForeignKey) roles.push("FK");
              if (col.isSurrogateKey) roles.push("SK");
              return (
                <tr key={col.id} style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <td className="py-1.5 pr-3 text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>{col.name}</td>
                  <td className="py-1.5 pr-3 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>{col.dataType}</td>
                  <td className="py-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>{roles.join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {bp.notes && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(255,159,10,0.04)",
            border: "0.5px solid rgba(255,159,10,0.12)",
          }}
        >
          <h4 className="mb-1.5 text-[12px] font-semibold" style={{ color: "#FF9F0A" }}>Notes</h4>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{bp.notes}</p>
        </div>
      )}
    </div>
  );
}

export function BlueprintsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ModelBlueprint | "new" | null>(null);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        Load a graph first, then plan models here.
      </div>
    );
  }

  if (editing) {
    return (
      <BlueprintEditor
        graph={graph}
        blueprint={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  const selected = selectedId ? graph.blueprints.find((b) => b.id === selectedId) : null;

  return (
    <div className="flex h-full gap-4">
      {/* List */}
      <div className="w-72 shrink-0 overflow-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Blueprints <span style={{ color: "var(--text-quaternary)" }}>({graph.blueprints.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "0.5px solid var(--accent)",
            }}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New
          </button>
        </div>
        <div className="space-y-2">
          {graph.blueprints.map((bp) => (
            <BlueprintCard
              key={bp.id}
              bp={bp}
              isSelected={selectedId === bp.id}
              onClick={() => setSelectedId(bp.id)}
            />
          ))}
        </div>
        {graph.blueprints.length === 0 && (
          <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-quaternary)" }}>
            No blueprints yet. Click "New" to create one.
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="min-w-0 flex-1 overflow-auto">
        {selected ? (
          <BlueprintDetail
            bp={selected}
            graph={graph}
            onEdit={() => setEditing(selected)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
            Select a blueprint to view details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
