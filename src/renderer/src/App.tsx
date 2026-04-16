import { useEffect } from "react";
import { validateDatacartaGraph, type DatacartaGraph } from "datacarta-spec/client";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ExportView } from "./features/export/ExportView";
import { GraphView } from "./features/graph/GraphView";
import { ImportsView } from "./features/import/ImportsView";
import { NodesView } from "./features/nodes/NodesView";
import { BlueprintsView } from "./features/blueprints/BlueprintsView";
import { ProjectsView } from "./features/projects/ProjectsView";
import { SettingsView } from "./features/settings/SettingsView";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

export default function App(): JSX.Element {
  const activeView = useWorkspaceStore((s) => s.activeView);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const graph = useWorkspaceStore((s) => s.graph);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const projectFilename = useWorkspaceStore((s) => s.projectFilename);
  const lastError = useWorkspaceStore((s) => s.lastError);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        const p = await window.datacarta.resolveSamplePath();
        if (!p || cancelled) return;
        const text = await window.datacarta.readTextFile(p);
        const raw = JSON.parse(text) as unknown;
        const v = validateDatacartaGraph(raw);
        if (!v.ok || cancelled) return;
        openWorkspace(raw as DatacartaGraph, null, []);
      } catch {
        /* sample optional */
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [openWorkspace]);

  return (
    <div className="flex h-full min-h-0">
      <Sidebar active={activeView} onSelect={setActiveView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar graph={graph} projectFilename={projectFilename} />
        {lastError ? (
          <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">Something went wrong</div>
                <div className="mt-1 whitespace-pre-wrap font-mono text-xs text-red-100/90">{lastError}</div>
              </div>
              <button
                type="button"
                onClick={() => setLastError(null)}
                className="shrink-0 rounded-md border border-red-500/30 bg-red-950/40 px-2 py-1 text-xs font-semibold text-red-50 hover:bg-red-950/70"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-auto p-4">
          {activeView === "projects" ? <ProjectsView /> : null}
          {activeView === "graph" ? <GraphView /> : null}
          {activeView === "nodes" ? <NodesView /> : null}
          {activeView === "blueprints" ? <BlueprintsView /> : null}
          {activeView === "imports" ? <ImportsView /> : null}
          {activeView === "export" ? <ExportView /> : null}
          {activeView === "settings" ? <SettingsView /> : null}
        </main>
      </div>
    </div>
  );
}
