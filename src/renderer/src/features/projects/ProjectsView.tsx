import { useEffect, useMemo, useState } from "react";
import { parseWorkspaceFile, serializeWorkspace } from "../../lib/persist";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function ProjectsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const blueprints = useWorkspaceStore((s) => s.blueprints);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const projectFilename = useWorkspaceStore((s) => s.projectFilename);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  const [files, setFiles] = useState<string[]>([]);
  const [filename, setFilename] = useState("harmonic-audio.dcproj.json");

  const canSave = useMemo(() => Boolean(graph), [graph]);

  async function refresh(): Promise<void> {
    const list = await window.datacarta.listProjects();
    setFiles(list);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="text-sm font-semibold text-slate-100">Save current workspace</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Projects are stored locally as <span className="font-mono">*.dcproj.json</span>: the canonical graph plus any{" "}
          <span className="text-slate-200">Blueprints</span> you sketched (v2 format).
        </p>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500" htmlFor="fname">
              Filename
            </label>
            <input
              id="fname"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-accent/40"
            />
          </div>
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              if (!graph) return;
              setLastError(null);
              const safeName = filename.endsWith(".dcproj.json") ? filename : `${filename}.dcproj.json`;
              const res = await window.datacarta.saveProject(safeName, serializeWorkspace(graph, blueprints));
              if (!res.ok) setLastError(res.error);
              else {
                openWorkspace(graph, safeName, blueprints);
                await refresh();
              }
            }}
            className="rounded-lg bg-teal-300/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
        {projectFilename ? (
          <div className="mt-3 text-xs text-slate-500">
            Active file: <span className="font-mono text-slate-300">{projectFilename}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-100">Saved projects</div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-canvas-border bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-accent/30"
          >
            Refresh
          </button>
        </div>

        {files.length ? (
          <div className="mt-4 space-y-2">
            {files.map((f) => (
              <div
                key={f}
                className="flex flex-col gap-2 rounded-lg border border-canvas-border bg-canvas-muted/30 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="font-mono text-sm text-slate-200">{f}</div>
                <button
                  type="button"
                  onClick={async () => {
                    setLastError(null);
                    try {
                      const text = await window.datacarta.readProject(f);
                      const w = parseWorkspaceFile(text);
                      openWorkspace(w.graph, f, w.blueprints);
                    } catch (e) {
                      setLastError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                  className="rounded-lg border border-canvas-border bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-accent/30"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-canvas-border p-6 text-sm text-slate-500">
            No saved projects yet. Load a graph from <span className="text-slate-300">Imports</span>, then save it here.
          </div>
        )}
      </div>
    </div>
  );
}
