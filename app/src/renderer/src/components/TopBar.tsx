import type { DatacartaGraph } from "datacarta-spec/client";
import { useWorkspaceStore } from "../store/useWorkspaceStore";

export function TopBar(props: {
  graph: DatacartaGraph | null;
  projectFilename: string | null;
}): JSX.Element {
  const title = props.graph?.projectName ?? "No project loaded";
  const stats = props.graph
    ? `${props.graph.layerDefinitions.length} layers · ${props.graph.models.length} models · ${props.graph.metrics.length} metrics`
    : "Import a graph or open a saved project.";
  const theme = useWorkspaceStore((s) => s.theme);
  const toggleTheme = useWorkspaceStore((s) => s.toggleTheme);

  return (
    <header
      className="glass flex items-center justify-between px-4"
      style={{
        borderBottom: "0.5px solid var(--border)",
        paddingTop: "env(titlebar-area-y, 28px)",
        minHeight: 52,
      }}
    >
      {/* draggable region for window movement */}
      <div className="pointer-events-none absolute inset-0" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />

      <div className="relative z-10 min-w-0 py-1.5">
        <div className="truncate text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</div>
        <div className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {stats}
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            background: "var(--surface-hover)",
            color: "var(--text-secondary)",
            border: "0.5px solid var(--border)",
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
        >
          {theme === "dark" ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        {props.projectFilename ? (
          <span
            className="rounded-md px-2 py-0.5 font-mono text-[11px]"
            style={{
              background: "var(--surface-hover)",
              color: "var(--text-tertiary)",
            }}
          >
            {props.projectFilename}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
            unsaved
          </span>
        )}
      </div>
    </header>
  );
}
