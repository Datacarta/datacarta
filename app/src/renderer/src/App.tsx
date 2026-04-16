import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ProjectsView } from "./features/projects/ProjectsView";
import { ImportsView } from "./features/import/ImportsView";
import { ExportView } from "./features/export/ExportView";
import { SettingsView } from "./features/settings/SettingsView";
import { DataLayerView } from "./features/data-layer/DataLayerView";
import { ModelsView } from "./features/models/ModelsView";
import { MetricsView } from "./features/metrics/MetricsView";
import { BlueprintsView } from "./features/blueprints/BlueprintsView";
import { GovernanceView } from "./features/governance/GovernanceView";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

export default function App(): JSX.Element {
  const activeView = useWorkspaceStore((s) => s.activeView);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const graph = useWorkspaceStore((s) => s.graph);
  const projectFilename = useWorkspaceStore((s) => s.projectFilename);
  const lastError = useWorkspaceStore((s) => s.lastError);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  return (
    <div className="flex h-full min-h-0">
      <Sidebar active={activeView} onSelect={setActiveView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar graph={graph} projectFilename={projectFilename} />
        {lastError ? (
          <div
            className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              borderBottom: "0.5px solid rgba(239,68,68,0.2)",
            }}
          >
            <div className="min-w-0">
              <div className="font-medium text-red-300 text-[13px]">Error</div>
              <div className="mt-0.5 whitespace-pre-wrap font-mono text-[11px] text-red-200/80">{lastError}</div>
            </div>
            <button
              type="button"
              onClick={() => setLastError(null)}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-auto p-4">
          {activeView === "projects" && <ProjectsView />}
          {activeView === "data-layer" && <DataLayerView />}
          {activeView === "models" && <ModelsView />}
          {activeView === "metrics" && <MetricsView />}
          {activeView === "blueprints" && <BlueprintsView />}
          {activeView === "governance" && <GovernanceView />}
          {activeView === "imports" && <ImportsView />}
          {activeView === "export" && <ExportView />}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
