import { useEffect, useMemo, useState } from "react";
import { validateDatacartaGraph, type DatacartaGraph } from "datacarta-spec/client";
import { parseWorkspaceFile, serializeWorkspace } from "../../lib/persist";
import { DEFAULT_LAYER_DEFINITIONS } from "../../lib/lineage";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

function emptyGraph(): DatacartaGraph {
  return {
    specVersion: "0.2.0",
    projectId: `proj-${Date.now().toString(36)}`,
    projectName: "New Workspace",
    // Seed with the canonical seven-layer set so "pick a layer" dropdowns (in
    // Blueprints, ingest flows, etc.) are usable from the first moment. Users
    // can customize under Settings → Layers if they need a different taxonomy.
    layerDefinitions: DEFAULT_LAYER_DEFINITIONS.map((l) => ({ ...l })),
    models: [],
    edges: [],
    metrics: [],
    dataMarts: [],
    blueprints: [],
    owners: [],
    teams: [],
  };
}

export function ProjectsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const projectFilename = useWorkspaceStore((s) => s.projectFilename);
  const setLastError = useWorkspaceStore((s) => s.setLastError);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);

  const [files, setFiles] = useState<string[]>([]);
  const [filename, setFilename] = useState("harmonic-audio.dcproj.json");

  const canSave = useMemo(() => Boolean(graph), [graph]);

  async function refresh(): Promise<void> {
    const list = await window.datacarta.listProjects();
    setFiles(list);
  }

  async function loadExample(): Promise<void> {
    setLastError(null);
    try {
      const p = await window.datacarta.resolveSamplePath();
      if (!p) {
        setLastError("Bundled example not found.");
        return;
      }
      const text = await window.datacarta.readTextFile(p);
      const raw = JSON.parse(text) as unknown;
      const v = validateDatacartaGraph(raw);
      if (!v.ok) {
        setLastError("Bundled example failed validation.");
        return;
      }
      openWorkspace(raw as DatacartaGraph, null);
      setActiveView("data-layer");
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }

  function startEmptyProject(): void {
    setLastError(null);
    openWorkspace(emptyGraph(), null);
    setActiveView("imports");
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Start a workspace</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Create an empty project and build it up from imports, or load the bundled Harmonic Audio
          example to see a fully populated Datacarta graph.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startEmptyProject}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            style={{ background: "#007AFF" }}
          >
            New empty project
          </button>
          <button
            type="button"
            onClick={() => void loadExample()}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}
          >
            Load example
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Save current workspace</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          Projects are stored locally as <span className="font-mono">*.dcproj.json</span>.
        </p>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-quaternary)" }} htmlFor="fname">
              Filename
            </label>
            <input
              id="fname"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 font-mono text-[13px] outline-none"
              style={{
                background: "var(--surface-hover)",
                border: "0.5px solid var(--border-strong)",
              }}
            />
          </div>
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              if (!graph) return;
              setLastError(null);
              const safeName = filename.endsWith(".dcproj.json") ? filename : `${filename}.dcproj.json`;
              const res = await window.datacarta.saveProject(safeName, serializeWorkspace(graph));
              if (!res.ok) setLastError(res.error);
              else {
                openWorkspace(graph, safeName);
                await refresh();
              }
            }}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "#007AFF" }}
          >
            Save
          </button>
        </div>
        {projectFilename ? (
          <div className="mt-3 text-[11px]" style={{ color: "var(--text-quaternary)" }}>
            Active file: <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{projectFilename}</span>
          </div>
        ) : null}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">Saved projects</div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}
          >
            Refresh
          </button>
        </div>

        {files.length ? (
          <div className="mt-4 space-y-2">
            {files.map((f) => (
              <div
                key={f}
                className="flex flex-col gap-2 rounded-lg p-3 md:flex-row md:items-center md:justify-between"
                style={{ background: "var(--surface-hover)", border: "0.5px solid var(--surface-hover)" }}
              >
                <div className="font-mono text-[13px] text-[var(--text-secondary)]">{f}</div>
                <button
                  type="button"
                  onClick={async () => {
                    setLastError(null);
                    try {
                      const text = await window.datacarta.readProject(f);
                      const w = parseWorkspaceFile(text);
                      openWorkspace(w.graph, f);
                    } catch (e) {
                      setLastError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg p-6 text-center text-[13px]" style={{ color: "var(--text-quaternary)", border: "0.5px dashed var(--border-strong)" }}>
            No saved projects yet. Load a graph from Connectors, then save it here.
          </div>
        )}
      </div>
    </div>
  );
}
