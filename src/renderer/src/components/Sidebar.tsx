import type { AppView } from "../store/useWorkspaceStore";

const items: { id: AppView; label: string; hint: string }[] = [
  { id: "projects", label: "Projects", hint: "Local saves" },
  { id: "graph", label: "Graph", hint: "Canvas" },
  { id: "nodes", label: "Nodes", hint: "Directory" },
  { id: "blueprints", label: "Blueprints", hint: "Plan" },
  { id: "imports", label: "Imports", hint: "Sources" },
  { id: "export", label: "Context Export", hint: "AI bundles" },
  { id: "settings", label: "Settings", hint: "App" },
];

export function Sidebar(props: { active: AppView; onSelect: (v: AppView) => void }): JSX.Element {
  return (
    <aside className="flex w-64 flex-col border-r border-canvas-border bg-canvas-muted/60 backdrop-blur">
      <div className="border-b border-canvas-border px-4 pb-4 pt-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Datacarta</div>
        <div className="mt-2 text-lg font-semibold text-slate-50">Desktop</div>
        <div className="mt-1 text-xs text-slate-400">Local context graph</div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((it) => {
          const active = props.active === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => props.onSelect(it.id)}
              className={[
                "group flex w-full flex-col rounded-lg border px-3 py-2 text-left transition",
                active
                  ? "border-accent/40 bg-slate-950/60 shadow-[0_0_0_1px_rgba(94,234,212,0.15)]"
                  : "border-transparent hover:border-canvas-border hover:bg-slate-950/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">{it.label}</span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                  {it.hint}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-canvas-border p-3 text-[11px] leading-relaxed text-slate-500">
        Open source · local-first · exports deterministic AI context packages.
      </div>
    </aside>
  );
}
