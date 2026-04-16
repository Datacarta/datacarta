import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { formatModelingHeadline } from "../../lib/modeling-metadata";
import type { Model } from "datacarta-spec/client";

function TrustDot({ level }: { level: string }) {
  const color =
    level === "trusted" ? "#30D158" :
    level === "reviewed" ? "#007AFF" :
    level === "draft" ? "#FF9F0A" :
    level === "deprecated" ? "#FF453A" :
    "var(--text-quaternary)";
  return <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} title={level} />;
}

export function ModelsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "layer" | "trust" | "columns">("layer");

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No graph loaded.
      </div>
    );
  }

  const layerIndex = useMemo(
    () => new Map(graph.layerDefinitions.map((l) => [l.id, l])),
    [graph.layerDefinitions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let models = graph.models.filter((m) => {
      if (!q) return true;
      const hay = `${m.name} ${m.displayName ?? ""} ${m.domain ?? ""} ${(m.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    models = [...models].sort((a, b) => {
      if (sortBy === "name") return (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name);
      if (sortBy === "layer") {
        const la = layerIndex.get(a.layerId)?.order ?? 0;
        const lb = layerIndex.get(b.layerId)?.order ?? 0;
        return la - lb || a.name.localeCompare(b.name);
      }
      if (sortBy === "trust") return a.trustLevel.localeCompare(b.trustLevel);
      if (sortBy === "columns") return b.columns.length - a.columns.length;
      return 0;
    });

    return models;
  }, [graph.models, search, sortBy, layerIndex]);

  function handleClick(model: Model) {
    zoomToModel(model.id);
    setActiveView("data-layer");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Models <span style={{ color: "var(--text-quaternary)" }}>({graph.models.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-56 rounded-lg px-3 py-1.5 text-[13px] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-1 focus:ring-accent"
            style={{
              background: "var(--surface-hover)",
              border: "0.5px solid var(--border)",
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg px-2 py-1.5 text-[12px] text-[var(--text-secondary)] focus:outline-none"
            style={{
              background: "var(--surface-hover)",
              border: "0.5px solid var(--border)",
            }}
          >
            <option value="layer">Sort by layer</option>
            <option value="name">Sort by name</option>
            <option value="trust">Sort by trust</option>
            <option value="columns">Sort by columns</option>
          </select>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "0.5px solid var(--surface-hover)",
        }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "0.5px solid var(--border)" }}>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Model</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Layer</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Intent</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Cols</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Trust</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Domain</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const layer = layerIndex.get(m.layerId);
              const headline = formatModelingHeadline(m);
              return (
                <tr
                  key={m.id}
                  onClick={() => handleClick(m)}
                  className="cursor-pointer transition-colors hover:bg-[var(--surface-hover)]"
                  style={{ borderBottom: "0.5px solid var(--surface-hover)" }}
                >
                  <td className="px-4 py-2">
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">{m.displayName ?? m.name}</div>
                    {m.displayName && m.displayName !== m.name && (
                      <div className="font-mono text-[10px]" style={{ color: "var(--text-quaternary)" }}>{m.name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {layer?.name ?? m.layerId}
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {headline ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {m.columns.length}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <TrustDot level={m.trustLevel} />
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{m.trustLevel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                    {m.domain ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
            No models match your search.
          </div>
        )}
      </div>
    </div>
  );
}
