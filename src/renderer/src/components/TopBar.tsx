import type { DatacartaGraph } from "datacarta-spec/client";

export function TopBar(props: {
  graph: DatacartaGraph | null;
  projectFilename: string | null;
}): JSX.Element {
  const title = props.graph?.projectName ?? "No project loaded";
  const subtitle = props.graph
    ? `${props.graph.nodes.length} nodes · ${props.graph.edges.length} edges · spec ${props.graph.specVersion}`
    : "Import a graph or open a saved project to begin.";
  return (
    <header className="flex h-14 items-center justify-between border-b border-canvas-border bg-canvas/70 px-4 backdrop-blur">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-50">{title}</div>
        <div className="truncate text-xs text-slate-400">{subtitle}</div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {props.projectFilename ? (
          <span className="rounded-md border border-canvas-border bg-slate-950/40 px-2 py-1 font-mono text-[11px] text-slate-300">
            {props.projectFilename}
          </span>
        ) : (
          <span className="rounded-md border border-dashed border-canvas-border px-2 py-1 text-[11px] text-slate-500">
            unsaved workspace
          </span>
        )}
      </div>
    </header>
  );
}
