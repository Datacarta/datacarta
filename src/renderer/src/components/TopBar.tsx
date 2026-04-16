import type { DatacartaGraph } from "datacarta-spec/client";

export function TopBar(props: {
  graph: DatacartaGraph | null;
  projectFilename: string | null;
}): JSX.Element {
  const title = props.graph?.projectName ?? "No project loaded";
  const stats = props.graph
    ? `${props.graph.layerDefinitions.length} layers · ${props.graph.models.length} models · ${props.graph.metrics.length} metrics`
    : "Import a graph or open a saved project.";

  return (
    <header
      className="glass flex h-12 items-center justify-between px-4"
      style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-white">{title}</div>
        <div className="truncate text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          {stats}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {props.projectFilename ? (
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[11px]"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {props.projectFilename}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            unsaved
          </span>
        )}
      </div>
    </header>
  );
}
