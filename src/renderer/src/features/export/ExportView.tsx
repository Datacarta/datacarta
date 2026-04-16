import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { exportFullGraphJson, exportContextPackageJson } from "../../lib/exportBundles";

export function ExportView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No graph loaded.
      </div>
    );
  }

  async function exportFile(mode: "full" | "context"): Promise<void> {
    const json = mode === "full" ? exportFullGraphJson(graph!) : exportContextPackageJson(graph!);
    const name = `${graph!.projectId}-${mode === "full" ? "full" : "context"}.json`;
    await window.datacarta.exportGraphJson(name, json);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Full Graph JSON</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Export the complete graph with all layers, models, metrics, and governance rules.
        </p>
        <button
          type="button"
          onClick={() => exportFile("full")}
          className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)]"
          style={{ background: "#007AFF" }}
        >
          Export full graph
        </button>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Context Package</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Compact, deterministic summary optimized for AI context windows.
        </p>
        <button
          type="button"
          onClick={() => exportFile("context")}
          className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)]"
          style={{ background: "var(--border)" }}
        >
          Export context package
        </button>
      </div>
    </div>
  );
}
