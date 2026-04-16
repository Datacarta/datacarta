import { useMemo, useState } from "react";
import type { DatacartaGraph, Model } from "datacarta-spec/client";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { buildAdjacency, getAncestors } from "../../lib/lineage";
import { SOURCE_ORIGIN_META } from "../../lib/source-classification";
import { layerColor } from "./DataLayerView";

/**
 * Shows each metric (or a single selected metric) alongside the FULL set of
 * tables that feed it — the housing table(s) plus every upstream table,
 * grouped by layer. Mirrors DomainLineageView's shape but anchored on
 * metrics instead of domains.
 *
 * Answers: "for this KPI, what is the complete lineage behind it?"
 */
export function MetricLineageView({ graph }: { graph: DatacartaGraph }) {
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [kpiOnly, setKpiOnly] = useState(false);

  const adjacency = useMemo(() => buildAdjacency(graph), [graph]);
  const modelById = useMemo(() => new Map(graph.models.map((m) => [m.id, m])), [graph.models]);
  const orderedLayers = useMemo(
    () => [...graph.layerDefinitions].sort((a, b) => a.order - b.order),
    [graph.layerDefinitions],
  );

  const metrics = useMemo(
    () => (kpiOnly ? graph.metrics.filter((m) => m.isKPI) : graph.metrics),
    [graph.metrics, kpiOnly],
  );

  /**
   * For each metric, the set of every model whose lineage reaches the metric's
   * housing tables (including the housing tables themselves).
   */
  const modelsByMetric = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const met of graph.metrics) {
      const set = new Set<string>();
      for (const houseId of met.sourceModelIds) {
        if (!modelById.has(houseId)) continue; // skip references to missing models
        set.add(houseId);
        for (const a of getAncestors(adjacency, houseId)) set.add(a);
      }
      result.set(met.id, set);
    }
    return result;
  }, [graph.metrics, adjacency, modelById]);

  /** Models grouped by layer for each metric we want to show. */
  const grouped = useMemo(() => {
    const activeMetrics = selectedMetricId
      ? metrics.filter((m) => m.id === selectedMetricId)
      : metrics;
    const perMetric = new Map<string, Map<string, Model[]>>();
    for (const met of activeMetrics) {
      const ids = modelsByMetric.get(met.id) ?? new Set();
      const byLayer = new Map<string, Model[]>();
      for (const id of ids) {
        const m = modelById.get(id);
        if (!m) continue;
        const arr = byLayer.get(m.layerId) ?? [];
        arr.push(m);
        byLayer.set(m.layerId, arr);
      }
      perMetric.set(met.id, byLayer);
    }
    return perMetric;
  }, [metrics, selectedMetricId, modelsByMetric, modelById]);

  if (graph.metrics.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="text-[13px]" style={{ color: "var(--text-quaternary)" }}>
          No metrics defined in this graph.
        </div>
        <div className="max-w-md text-[11px]" style={{ color: "var(--text-quaternary)" }}>
          Define metrics in the graph spec (or promote metric columns via the column-level{" "}
          <span className="font-mono">isMetric</span> flag) to see their full upstream lineage here.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
            Metric:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMetricId(null)}
            className="rounded-md px-2 py-0.5 text-[11px] font-medium transition-all"
            style={{
              background: selectedMetricId === null ? "var(--accent-dim)" : "var(--surface-hover)",
              color: selectedMetricId === null ? "var(--accent)" : "var(--text-tertiary)",
              border: selectedMetricId === null ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
            }}
          >
            All ({metrics.length})
          </button>
          {metrics.map((met) => {
            const active = selectedMetricId === met.id;
            const color = met.isKPI ? "#30D158" : "#007AFF";
            return (
              <button
                key={met.id}
                type="button"
                onClick={() => setSelectedMetricId(active ? null : met.id)}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all"
                style={{
                  background: active ? `${color}25` : `${color}10`,
                  border: active ? `1px solid ${color}` : "0.5px solid transparent",
                  color,
                }}
                title={met.description}
              >
                {met.isKPI && <span aria-hidden>★</span>}
                {met.displayName}
                <span style={{ opacity: 0.7 }}>({modelsByMetric.get(met.id)?.size ?? 0})</span>
              </button>
            );
          })}
        </div>

        <label
          className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors"
          style={{
            background: kpiOnly ? "rgba(48,209,88,0.15)" : "var(--surface-hover)",
            color: kpiOnly ? "#30D158" : "var(--text-tertiary)",
            border: kpiOnly ? "0.5px solid rgba(48,209,88,0.4)" : "0.5px solid var(--border)",
          }}
        >
          <input
            type="checkbox"
            checked={kpiOnly}
            onChange={(e) => {
              setKpiOnly(e.target.checked);
              setSelectedMetricId(null);
            }}
            className="h-3 w-3"
          />
          KPIs only
        </label>
      </div>

      {metrics.length === 0 ? (
        <div className="py-12 text-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
          No KPIs have been promoted yet. Mark a metric as KPI from the Metrics view.
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([metId, byLayer]) => {
            const met = graph.metrics.find((m) => m.id === metId);
            if (!met) return null;
            const mColor = met.isKPI ? "#30D158" : "#007AFF";
            const totalCount = [...byLayer.values()].reduce((acc, arr) => acc + arr.length, 0);
            const housingIds = new Set(met.sourceModelIds);
            return (
              <section
                key={metId}
                className="rounded-xl p-4"
                style={{
                  background: `${mColor}08`,
                  border: `1px solid ${mColor}30`,
                }}
              >
                <header className="mb-3 flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: mColor }} />
                  <h2 className="text-[14px] font-semibold" style={{ color: mColor }}>
                    {met.displayName}
                  </h2>
                  {met.isKPI && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: "rgba(48,209,88,0.2)", color: "#30D158" }}
                    >
                      KPI
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {totalCount} {totalCount === 1 ? "table feeds" : "tables feed"} this metric
                  </span>
                  <span className="ml-auto rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface-hover)", color: "var(--text-tertiary)" }}>
                    {met.domain}
                  </span>
                </header>
                {met.expression && (
                  <div
                    className="mb-3 rounded-md px-2 py-1 font-mono text-[11px]"
                    style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}
                    title="Metric expression"
                  >
                    {met.expression}
                  </div>
                )}

                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${
                      orderedLayers.filter((l) => (byLayer.get(l.id)?.length ?? 0) > 0).length || 1
                    }, minmax(180px, 1fr))`,
                  }}
                >
                  {orderedLayers.map((layer) => {
                    const models = byLayer.get(layer.id) ?? [];
                    if (models.length === 0) return null;
                    const lColor = layerColor(layer.type);
                    return (
                      <div key={layer.id} className="min-w-0">
                        <div
                          className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: lColor }}
                        >
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: lColor }} />
                          {layer.name}
                          <span style={{ color: "var(--text-quaternary)" }}>({models.length})</span>
                        </div>
                        <div className="space-y-1">
                          {models.map((m) => {
                            const origin = m.sourceClassification?.origin;
                            const originMeta = origin ? SOURCE_ORIGIN_META[origin] : null;
                            const isHousing = housingIds.has(m.id);
                            // Metric columns on this model — surface them as chips so the user
                            // can see WHERE within the table the measurement lives.
                            const metricCols = m.columns.filter((c) => c.isMetric).map((c) => c.name);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => zoomToModel(m.id)}
                                className="w-full rounded-md px-2 py-1.5 text-left transition-all hover:scale-[1.01]"
                                style={{
                                  background: isHousing ? `${mColor}18` : "var(--bg-card)",
                                  border: isHousing ? `1px solid ${mColor}50` : "0.5px solid var(--border)",
                                }}
                                title={isHousing ? `Houses ${met.displayName}` : `Feeds ${met.displayName} upstream`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {originMeta && (
                                    <span
                                      className="shrink-0 rounded px-1 py-0 font-mono text-[8px] font-bold"
                                      style={{ background: `${originMeta.color}25`, color: originMeta.color }}
                                    >
                                      {originMeta.short}
                                    </span>
                                  )}
                                  <span className="truncate text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                                    {m.displayName ?? m.name}
                                  </span>
                                  {isHousing && (
                                    <span
                                      className="ml-auto shrink-0 rounded px-1 py-0 text-[8px] font-semibold uppercase"
                                      style={{ background: `${mColor}25`, color: mColor }}
                                    >
                                      Home
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-[9px]" style={{ color: "var(--text-quaternary)" }}>
                                  <span>{m.columns.length} cols</span>
                                  {metricCols.length > 0 && (
                                    <span title={`Metric columns: ${metricCols.join(", ")}`}>
                                      · {metricCols.length} metric col{metricCols.length === 1 ? "" : "s"}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
