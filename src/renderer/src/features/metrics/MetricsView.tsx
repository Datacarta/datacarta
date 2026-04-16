import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function MetricsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const updateMetric = useWorkspaceStore((s) => s.updateMetric);
  const scanAllMetrics = useWorkspaceStore((s) => s.scanAllMetrics);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No graph loaded.
      </div>
    );
  }

  const domains = useMemo(
    () => [...new Set(graph.metrics.map((m) => m.domain))].sort(),
    [graph.metrics]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return graph.metrics.filter((m) => {
      if (domainFilter && m.domain !== domainFilter) return false;
      if (!q) return true;
      return `${m.name} ${m.displayName} ${m.description}`.toLowerCase().includes(q);
    });
  }, [graph.metrics, search, domainFilter]);

  const kpiCount = graph.metrics.filter((m) => m.isKPI).length;

  if (graph.metrics.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="text-[13px]" style={{ color: "var(--text-quaternary)" }}>No metrics defined.</div>
        <div className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
          Metrics are declared in the graph spec.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Metrics <span style={{ color: "var(--text-quaternary)" }}>({graph.metrics.length})</span>
          </h2>
          {kpiCount > 0 && (
            <div className="mt-0.5 text-[11px]" style={{ color: "#30D158" }}>
              {kpiCount} KPI{kpiCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const flagged = scanAllMetrics();
              if (flagged === 0) alert("No new metric-like columns detected.");
              else alert(`Flagged ${flagged} column${flagged === 1 ? "" : "s"} as metric${flagged === 1 ? "" : "s"} across the graph.`);
            }}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background: "rgba(0,122,255,0.12)",
              color: "#007AFF",
              border: "0.5px solid rgba(0,122,255,0.35)",
            }}
            title="Heuristically flag metric-like columns (revenue, mrr, *_count, …) across every model in the graph."
          >
            Scan metrics
          </button>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search metrics..."
            className="w-48 rounded-lg px-3 py-1.5 text-[13px] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-1 focus:ring-accent"
            style={{
              background: "var(--surface-hover)",
              border: "0.5px solid var(--border)",
            }}
          />
          {domains.length > 1 && (
            <select
              value={domainFilter ?? ""}
              onChange={(e) => setDomainFilter(e.target.value || null)}
              className="rounded-lg px-2 py-1.5 text-[12px] text-[var(--text-secondary)] focus:outline-none"
              style={{
                background: "var(--surface-hover)",
                border: "0.5px solid var(--border)",
              }}
            >
              <option value="">All domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {filtered.map((met) => {
          const trustColor =
            met.trustLevel === "trusted" ? "#30D158" :
            met.trustLevel === "reviewed" ? "#007AFF" :
            met.trustLevel === "draft" ? "#FF9F0A" :
            "var(--text-quaternary)";

          // Resolve housing tables — use source model ids to show each table the metric is computed from.
          const housingModels = met.sourceModelIds
            .map((id) => graph.models.find((m) => m.id === id))
            .filter((m): m is NonNullable<typeof m> => m !== undefined);
          const primaryHousing = housingModels[0];

          function openHousingModel(modelId: string) {
            zoomToModel(modelId);
            setActiveView("data-layer");
          }

          return (
            <div
              key={met.id}
              className="rounded-xl p-4"
              style={{
                background: "var(--bg-card)",
                backdropFilter: "blur(12px)",
                border: met.isKPI
                  ? "0.5px solid rgba(48,209,88,0.25)"
                  : "0.5px solid var(--surface-hover)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => primaryHousing && openHousingModel(primaryHousing.id)}
                  disabled={!primaryHousing}
                  className="min-w-0 flex-1 text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-100 enabled:hover:opacity-80"
                  title={primaryHousing ? `Open ${primaryHousing.name} in the data layer` : "No housing model resolved"}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{met.displayName}</span>
                    {met.isKPI && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }}
                      >
                        KPI
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                    {met.name}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateMetric(met.id, { isKPI: !met.isKPI })}
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase transition-colors"
                    style={{
                      background: met.isKPI ? "rgba(48,209,88,0.18)" : "var(--surface-hover)",
                      color: met.isKPI ? "#30D158" : "var(--text-tertiary)",
                      border: `0.5px solid ${met.isKPI ? "rgba(48,209,88,0.4)" : "var(--border)"}`,
                    }}
                    title={met.isKPI ? "Demote from KPI" : "Mark as KPI"}
                  >
                    {met.isKPI ? "KPI ✓" : "Mark KPI"}
                  </button>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: `${trustColor}20`, color: trustColor }}
                  >
                    {met.trustLevel}
                  </span>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                {met.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                <span
                  className="rounded px-1.5 py-0.5"
                  style={{ background: "var(--surface-hover)" }}
                >
                  {met.domain}
                </span>
                {met.aggregation && <span>{met.aggregation}</span>}
                {met.timeGrain && <span>{met.timeGrain}</span>}
              </div>

              {housingModels.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                    Housed in
                  </span>
                  {housingModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => openHousingModel(m.id)}
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:opacity-80"
                      style={{
                        background: "rgba(0,122,255,0.1)",
                        color: "#007AFF",
                        border: "0.5px solid rgba(0,122,255,0.3)",
                      }}
                      title={`Open ${m.name} in the data layer`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}

              {met.expression && (
                <div
                  className="mt-2.5 rounded-md px-2 py-1 font-mono text-[11px]"
                  style={{
                    background: "var(--surface-hover)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {met.expression}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
          No metrics match your search.
        </div>
      )}
    </div>
  );
}
