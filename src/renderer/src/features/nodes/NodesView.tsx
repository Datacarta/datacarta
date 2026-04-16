import { useMemo, useState } from "react";
import { formatModelingHeadline } from "../../lib/modeling-metadata";
import { NodeInspector } from "../graph/NodeInspector";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function NodesView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!graph) return [];
    const qq = q.trim().toLowerCase();
    return graph.nodes
      .filter((n) => (type === "all" ? true : n.type === type))
      .filter((n) => {
        if (!qq) return true;
        const headline = formatModelingHeadline(n) ?? "";
        return `${n.name} ${n.displayName ?? ""} ${n.id} ${headline}`.toLowerCase().includes(qq);
      })
      .slice()
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  }, [graph, type, q]);

  if (!graph) {
    return (
      <div className="rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-8 text-sm text-slate-500">
        No graph loaded.
      </div>
    );
  }

  const types = Array.from(new Set(graph.nodes.map((n) => n.type))).sort();

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <div className="flex min-h-[420px] flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-xl border border-canvas-border bg-slate-950/30 p-3 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, id, or modeling headline (dim/fact/SCD)…"
            className="w-full flex-1 rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent/40"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100 outline-none md:w-56"
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-canvas-border bg-slate-950/20">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-canvas-muted/90 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="border-b border-canvas-border px-3 py-2">Type</th>
                <th className="border-b border-canvas-border px-3 py-2">Name</th>
                <th className="border-b border-canvas-border px-3 py-2">Modeling</th>
                <th className="border-b border-canvas-border px-3 py-2">Grain</th>
                <th className="border-b border-canvas-border px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const active = selectedNodeId === n.id;
                const hl = formatModelingHeadline(n);
                return (
                  <tr
                    key={n.id}
                    onClick={() => setSelectedNodeId(n.id)}
                    className={[
                      "cursor-pointer border-b border-canvas-border/60",
                      active ? "bg-teal-950/25" : "hover:bg-slate-950/40",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-300">{n.type}</td>
                    <td className="px-3 py-2 text-slate-100">{n.displayName ?? n.name}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 font-mono text-[11px] text-teal-200/90">
                      {hl ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{n.grain ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(n.id);
                          setActiveView("graph");
                        }}
                        className="rounded-md border border-canvas-border bg-slate-950/40 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-accent/30"
                      >
                        On graph
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="min-h-[420px] xl:max-h-[calc(100vh-220px)]">
        <NodeInspector graph={graph} nodeId={selectedNodeId} graphContext={false} />
      </div>
    </div>
  );
}
