import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { exportContextPackageJson, exportFullGraphJson } from "../../lib/exportBundles";

export function ExportView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  if (!graph) {
    return (
      <div className="rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-8 text-sm text-slate-500">
        Load a graph before exporting.
      </div>
    );
  }

  const safeName = `${graph.projectId}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="text-sm font-semibold text-slate-100">AI-readable exports (deterministic)</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Datacarta never “hallucinates” context in the MVP: exports are structured projections of the graph you already
          curated — ideal for RAG grounding, tool prompts, and audits.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={async () => {
              setLastError(null);
              const content = exportFullGraphJson(graph);
              const res = await window.datacarta.exportGraphJson(`${safeName}.graph.full.json`, content);
              if (!res.canceled) {
                /* noop */
              }
            }}
            className="rounded-lg border border-canvas-border bg-slate-900/40 px-4 py-3 text-left hover:border-accent/30"
          >
            <div className="text-sm font-semibold text-slate-100">Full structured graph JSON</div>
            <div className="mt-1 text-xs text-slate-500">Complete fidelity snapshot for tools and replays.</div>
          </button>

          <button
            type="button"
            onClick={async () => {
              setLastError(null);
              const content = exportContextPackageJson(graph);
              const res = await window.datacarta.exportGraphJson(`${safeName}.context-package.json`, content);
              if (!res.canceled) {
                /* noop */
              }
            }}
            className="rounded-lg border border-canvas-border bg-slate-900/40 px-4 py-3 text-left hover:border-accent/30"
          >
            <div className="text-sm font-semibold text-slate-100">Compact context package JSON</div>
            <div className="mt-1 text-xs text-slate-500">
              Summaries, trusted datasets, metrics, warnings, join hints, deprecations.
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-canvas-border bg-slate-950/20 p-5 text-sm text-slate-400">
        Tip: pair exports with the <span className="font-mono text-slate-200">datacarta-mcp</span> server for interactive graph
        queries in AI tools.
      </div>
    </div>
  );
}
