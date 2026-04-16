import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { formatModelingHeadline } from "../../lib/modeling-metadata";
import { computeServedDomains, buildAdjacency, getAncestors } from "../../lib/lineage";
import { SOURCE_ORIGIN_META, originColor } from "../../lib/source-classification";
import type { DatacartaGraph, LayerDefinition, Model, Column } from "datacarta-spec/client";
import { GraphConnectionsView } from "./GraphConnectionsView";
import { DomainLineageView } from "./DomainLineageView";
import { MetricLineageView } from "./MetricLineageView";
import { ModelConnectionsEditor } from "./ModelConnectionsEditor";
import { SqlEditor } from "./SqlEditor";

/** Accent color per layer type */
export const LAYER_COLORS: Record<string, string> = {
  source: "#FF9F0A",
  raw: "#FF6B6B",
  staging: "#BF5AF2",
  intermediate: "#64D2FF",
  mart: "#30D158",
  semantic: "#007AFF",
  consumption: "#FFD60A",
};

/** Domain/feature area colors — deterministic from domain name */
export const DOMAIN_COLORS: Record<string, string> = {
  growth: "#007AFF",
  finance: "#30D158",
  marketing: "#BF5AF2",
  product: "#FF9F0A",
  engineering: "#64D2FF",
  sales: "#FF6B6B",
  operations: "#FFD60A",
  analytics: "#5E5CE6",
  support: "#AC8E68",
  legal: "#86868B",
};

const DOMAIN_PALETTE = [
  "#007AFF", "#30D158", "#BF5AF2", "#FF9F0A", "#64D2FF",
  "#FF6B6B", "#FFD60A", "#5E5CE6", "#AC8E68", "#FF375F",
];

export function domainColor(domain: string | undefined): string {
  if (!domain) return "var(--text-quaternary)";
  const d = domain.toLowerCase();
  if (DOMAIN_COLORS[d]) return DOMAIN_COLORS[d];
  // Deterministic hash for unknown domains
  let hash = 0;
  for (let i = 0; i < d.length; i++) hash = (hash * 31 + d.charCodeAt(i)) | 0;
  return DOMAIN_PALETTE[Math.abs(hash) % DOMAIN_PALETTE.length];
}

export function layerColor(type: string): string {
  return LAYER_COLORS[type] ?? "#888";
}

/** Trust badge */
function TrustBadge({ level }: { level: string }) {
  const color =
    level === "trusted" ? "#30D158" :
    level === "reviewed" ? "#007AFF" :
    level === "draft" ? "#FF9F0A" :
    level === "deprecated" ? "#FF453A" :
    "var(--text-quaternary)";
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}20`, color }}
    >
      {level}
    </span>
  );
}

// ── Zoom 1: Architecture Overview (one row per layer) ────────────────

function ModelMiniCard({
  model,
  served,
  dimmed,
  onZoom,
}: {
  model: Model;
  served: Set<string>;
  dimmed?: boolean;
  onZoom: () => void;
}) {
  const headline = formatModelingHeadline(model);
  // Primary color: own domain if set; else the alphabetically first served domain; else neutral
  const servedList = [...served].sort();
  const primaryDomain = model.domain ?? servedList[0];
  const dColor = domainColor(primaryDomain);
  const hasOwn = Boolean(model.domain);
  const servesOthers = servedList.filter((d) => d !== model.domain);
  const origin = model.sourceClassification?.origin;
  const originMeta = origin ? SOURCE_ORIGIN_META[origin] : null;

  return (
    <button
      type="button"
      onClick={onZoom}
      className="group w-full rounded-lg text-left transition-all duration-150 hover:scale-[1.01]"
      style={{
        background: `${dColor}${hasOwn ? "18" : "08"}`,
        border: `${hasOwn ? "1px" : "0.5px"} solid ${dColor}${hasOwn ? "55" : "25"}`,
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {originMeta && (
                <span
                  className="shrink-0 rounded px-1 py-0.5 font-mono text-[8px] font-bold"
                  style={{
                    background: `${originMeta.color}25`,
                    color: originMeta.color,
                    border: `0.5px solid ${originMeta.color}60`,
                  }}
                  title={`${originMeta.label} — ${originMeta.description}`}
                >
                  {originMeta.short}
                </span>
              )}
              <div className="truncate text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                {model.displayName ?? model.name}
              </div>
            </div>
            {model.displayName && model.displayName !== model.name && (
              <div className="truncate font-mono text-[10px]" style={{ color: "var(--text-quaternary)" }}>{model.name}</div>
            )}
          </div>
          <TrustBadge level={model.trustLevel} />
        </div>
        {headline && <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{headline}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
          <span>{model.columns.length} cols</span>
          {model.sql && (
            <span className="rounded px-1 py-0.5 text-[8px] font-semibold" style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }} title="Has SQL">
              SQL
            </span>
          )}
          {/* Own domain pill — solid */}
          {model.domain && (
            <span
              className="rounded px-1 py-0.5 text-[9px] font-semibold"
              style={{ background: `${dColor}30`, color: dColor }}
              title={`Owns domain: ${model.domain}`}
            >
              {model.domain}
            </span>
          )}
          {/* Downstream-served domain pills — arrow prefix, lighter */}
          {servesOthers.map((d) => (
            <span
              key={d}
              className="rounded px-1 py-0.5 text-[9px] font-medium"
              style={{
                background: `${domainColor(d)}15`,
                color: domainColor(d),
                border: `0.5px dashed ${domainColor(d)}50`,
              }}
              title={`Feeds ${d} downstream`}
            >
              → {d}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function LayerRow({
  layer,
  models,
  servedMap,
  dimmedIds,
  onZoomModel,
}: {
  layer: LayerDefinition;
  models: Model[];
  servedMap: Map<string, Set<string>>;
  dimmedIds?: Set<string>;
  onZoomModel: (id: string) => void;
}) {
  const lColor = layerColor(layer.type);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "0.5px solid var(--border)",
      }}
    >
      {/* Layer header — thin accent line, layer is secondary info */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          background: "var(--surface-hover)",
          borderLeft: `3px solid ${lColor}`,
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{layer.name}</span>
        <span className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ background: `${lColor}20`, color: lColor }}>{layer.type}</span>
        <span className="ml-auto text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {models.length} {models.length === 1 ? "model" : "models"}
        </span>
      </div>
      {/* Model cards grid */}
      <div className="p-3">
        {models.length === 0 ? (
          <div className="py-3 text-center text-[11px]" style={{ color: "var(--text-quaternary)" }}>No models in this layer</div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {models.map((m) => (
              <ModelMiniCard
                key={m.id}
                model={m}
                served={servedMap.get(m.id) ?? new Set()}
                dimmed={dimmedIds?.has(m.id) ?? false}
                onZoom={() => onZoomModel(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArchitectureOverview({ graph }: { graph: DatacartaGraph }) {
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  const orderedLayers = useMemo(() => [...graph.layerDefinitions].sort((a, b) => a.order - b.order), [graph.layerDefinitions]);

  /** Every domain that appears anywhere as a model.domain. */
  const domains = useMemo(
    () => [...new Set(graph.models.map((m) => m.domain).filter(Boolean) as string[])].sort(),
    [graph.models]
  );

  /** For each model: the set of domains it serves (own + downstream). */
  const servedMap = useMemo(() => computeServedDomains(graph), [graph]);

  /**
   * Filter by search + domain-lineage. For domain filter, we keep any model in
   * the domain's upstream lineage (served-domains contains the filter), so the
   * raw/staging tables that feed the domain remain visible.
   */
  const filteredModelsByLayer = useMemo(() => {
    const q = search.toLowerCase();
    const map = new Map<string, Model[]>();
    for (const m of graph.models) {
      if (domainFilter) {
        const served = servedMap.get(m.id) ?? new Set<string>();
        if (!served.has(domainFilter)) continue;
      }
      if (q && !`${m.name} ${m.displayName ?? ""} ${m.domain ?? ""} ${(m.tags ?? []).join(" ")}`.toLowerCase().includes(q)) continue;
      const arr = map.get(m.layerId) ?? [];
      arr.push(m);
      map.set(m.layerId, arr);
    }
    return map;
  }, [graph.models, search, domainFilter, servedMap]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Architecture Overview</h2>
          <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>{orderedLayers.length} layers · {graph.models.length} models</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-48 rounded-lg px-3 py-1.5 text-[12px] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
          />
          {domains.length > 1 && (
            <select
              value={domainFilter ?? ""}
              onChange={(e) => setDomainFilter(e.target.value || null)}
              className="rounded-lg px-2 py-1.5 text-[12px] focus:outline-none"
              style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <option value="">All domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Domain legend */}
      {domains.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>Domains:</span>
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomainFilter(domainFilter === d ? null : d)}
              className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all"
              style={{
                background: domainFilter === d ? `${domainColor(d)}25` : `${domainColor(d)}10`,
                border: domainFilter === d ? `1px solid ${domainColor(d)}` : "1px solid transparent",
                color: domainColor(d),
              }}
            >
              <div className="h-2 w-2 rounded-full" style={{ background: domainColor(d) }} />
              {d}
            </button>
          ))}
          {domainFilter && (
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Showing all tables in the <b style={{ color: domainColor(domainFilter) }}>{domainFilter}</b> lineage
            </span>
          )}
        </div>
      )}

      {/* Layer rows */}
      <div className="space-y-3">
        {orderedLayers.map((layer) => {
          const models = filteredModelsByLayer.get(layer.id) ?? [];
          // Show empty layer rows only when no filter is active
          if (models.length === 0 && (search || domainFilter)) return null;
          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              models={models}
              servedMap={servedMap}
              onZoomModel={zoomToModel}
            />
          );
        })}
      </div>

      {graph.edges.length > 0 && (
        <div className="mt-4 rounded-xl p-3" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{graph.edges.length} edges connect these models</span>
        </div>
      )}
    </div>
  );
}

// ── Zoom 2: Layer Detail ──────────────────────────────────────────────

function ModelCard({
  model,
  layerType,
  served,
  onZoom,
}: {
  model: Model;
  layerType: string;
  served: Set<string>;
  onZoom: () => void;
}) {
  const headline = formatModelingHeadline(model);
  const servedList = [...served].sort();
  const primary = model.domain ?? servedList[0];
  const dColor = domainColor(primary);
  const hasOwn = Boolean(model.domain);
  const servesOthers = servedList.filter((d) => d !== model.domain);
  const origin = model.sourceClassification?.origin;
  const originMeta = origin ? SOURCE_ORIGIN_META[origin] : null;

  return (
    <button
      type="button"
      onClick={onZoom}
      className="group w-full rounded-xl text-left transition-all duration-200 hover:scale-[1.005]"
      style={{
        background: `${dColor}${hasOwn ? "15" : "08"}`,
        backdropFilter: "blur(12px)",
        border: `${hasOwn ? "1px" : "0.5px"} solid ${dColor}${hasOwn ? "50" : "20"}`,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {originMeta && (
                <span
                  className="shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold"
                  style={{
                    background: `${originMeta.color}25`,
                    color: originMeta.color,
                    border: `0.5px solid ${originMeta.color}60`,
                  }}
                  title={`${originMeta.label} — ${originMeta.description}`}
                >
                  {originMeta.short}
                </span>
              )}
              <div className="truncate text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{model.displayName ?? model.name}</div>
            </div>
            {model.displayName && model.displayName !== model.name && (
              <div className="truncate font-mono text-[11px]" style={{ color: "var(--text-quaternary)" }}>{model.name}</div>
            )}
          </div>
          <TrustBadge level={model.trustLevel} />
        </div>
        {headline && <div className="mt-1.5 text-[11px]" style={{ color: layerColor(layerType) }}>{headline}</div>}
        {model.description && <div className="mt-1.5 line-clamp-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>{model.description}</div>}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: "var(--text-quaternary)" }}>
          <span>{model.columns.length} cols</span>
          {model.grain && <span>grain: {model.grain}</span>}
          {model.sql && (
            <span className="rounded px-1 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }} title="Has SQL">
              SQL
            </span>
          )}
          {model.domain && (
            <span
              className="rounded px-1 py-0.5 text-[9px] font-semibold"
              style={{ background: `${dColor}30`, color: dColor }}
              title={`Owns domain: ${model.domain}`}
            >
              {model.domain}
            </span>
          )}
          {servesOthers.map((d) => (
            <span
              key={d}
              className="rounded px-1 py-0.5 text-[9px] font-medium"
              style={{
                background: `${domainColor(d)}15`,
                color: domainColor(d),
                border: `0.5px dashed ${domainColor(d)}50`,
              }}
              title={`Feeds ${d} downstream`}
            >
              → {d}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function LayerDetailView({ graph, layerId }: { graph: DatacartaGraph; layerId: string }) {
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const zoomOut = useWorkspaceStore((s) => s.zoomOut);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const layer = graph.layerDefinitions.find((l) => l.id === layerId);
  const servedMap = useMemo(() => computeServedDomains(graph), [graph]);
  if (!layer) return null;

  /** Domains visible in this layer = union of served-domains across its models. */
  const domains = useMemo(() => {
    const s = new Set<string>();
    for (const m of graph.models) {
      if (m.layerId !== layerId) continue;
      for (const d of servedMap.get(m.id) ?? []) s.add(d);
    }
    return [...s].sort();
  }, [graph.models, layerId, servedMap]);

  const models = useMemo(() => {
    const q = search.toLowerCase();
    return graph.models.filter((m) => m.layerId === layerId).filter((m) => {
      if (domainFilter) {
        const served = servedMap.get(m.id) ?? new Set<string>();
        if (!served.has(domainFilter)) return false;
      }
      if (!q) return true;
      return `${m.name} ${m.displayName ?? ""} ${(m.tags ?? []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [graph.models, layerId, search, domainFilter, servedMap]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button type="button" onClick={zoomOut} className="flex items-center gap-1 text-[12px] transition-colors" style={{ color: "var(--accent)" }}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All Layers
        </button>
        <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>/</span>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          <div className="h-2 w-2 rounded-full" style={{ background: layerColor(layer.type) }} />
          {layer.name}
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--text-quaternary)" }}>{models.length} models</span>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter models..."
          className="w-full max-w-xs rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
        />
        {domains.length > 1 && (
          <select
            value={domainFilter ?? ""}
            onChange={(e) => setDomainFilter(e.target.value || null)}
            className="rounded-lg px-2 py-1.5 text-[12px] focus:outline-none"
            style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {models.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            layerType={layer.type}
            served={servedMap.get(m.id) ?? new Set()}
            onZoom={() => zoomToModel(m.id)}
          />
        ))}
      </div>
      {models.length === 0 && (
        <div className="py-12 text-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
          {search || domainFilter ? "No models match your filter." : "No models in this layer."}
        </div>
      )}
    </div>
  );
}

// ── Zoom 3: Model Detail ──────────────────────────────────────────────

function ColumnRow({ col }: { col: Column }) {
  const badges: { label: string; bg: string; color: string }[] = [];
  if (col.isPrimaryKey) badges.push({ label: "PK", bg: "rgba(48,209,88,0.15)", color: "#30D158" });
  if (col.isForeignKey) badges.push({ label: "FK", bg: "var(--surface-hover)", color: "var(--text-secondary)" });
  if (col.isSurrogateKey) badges.push({ label: "SK", bg: "var(--surface-hover)", color: "var(--text-secondary)" });
  if (col.isNaturalKey) badges.push({ label: "NK", bg: "var(--surface-hover)", color: "var(--text-secondary)" });
  if (col.scdRole) badges.push({ label: col.scdRole, bg: "var(--surface-hover)", color: "var(--text-secondary)" });
  // Metric / KPI badges — KPI implies metric, so only render the stronger one when both are set.
  if (col.isKPI) badges.push({ label: "KPI", bg: "rgba(255,159,10,0.15)", color: "#FF9F0A" });
  else if (col.isMetric) badges.push({ label: "Metric", bg: "rgba(0,122,255,0.15)", color: "#007AFF" });

  return (
    <tr className="transition-colors" style={{ borderBottom: "0.5px solid var(--border)" }}>
      <td className="py-1.5 pr-3 text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>{col.name}</td>
      <td className="py-1.5 pr-3 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>{col.dataType}</td>
      <td className="py-1.5 pr-3">
        {badges.length > 0 && (
          <div className="flex gap-1">
            {badges.map((b) => (
              <span key={b.label} className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase"
                style={{ background: b.bg, color: b.color }}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="py-1.5 text-[11px]" style={{ color: "var(--text-quaternary)" }}>{col.description ?? ""}</td>
    </tr>
  );
}

function ModelDetailView({ graph, modelId }: { graph: DatacartaGraph; modelId: string }) {
  const zoomOut = useWorkspaceStore((s) => s.zoomOut);
  const updateModel = useWorkspaceStore((s) => s.updateModel);
  const model = graph.models.find((m) => m.id === modelId);
  const servedMap = useMemo(() => computeServedDomains(graph), [graph]);
  if (!model) return null;
  const layer = graph.layerDefinitions.find((l) => l.id === model.layerId);
  const headline = formatModelingHeadline(model);
  const served = servedMap.get(modelId) ?? new Set<string>();
  const servedOthers = [...served].filter((d) => d !== model.domain).sort();
  const origin = model.sourceClassification?.origin;
  const originMeta = origin ? SOURCE_ORIGIN_META[origin] : null;

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center gap-2 text-[12px]">
        <button type="button" onClick={() => zoomOut()} className="transition-colors" style={{ color: "var(--accent)" }}>
          {layer?.name ?? "Layer"}
        </button>
        <span style={{ color: "var(--text-quaternary)" }}>/</span>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{model.displayName ?? model.name}</span>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--bg-elevated)", backdropFilter: "blur(20px)", border: "0.5px solid var(--border)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{model.displayName ?? model.name}</h2>
            {model.displayName && <div className="mt-0.5 font-mono text-[12px]" style={{ color: "var(--text-quaternary)" }}>{model.name}</div>}
          </div>
          <div className="flex items-center gap-2">
            <TrustBadge level={model.trustLevel} />
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${layerColor(layer?.type ?? "source")}20`, color: layerColor(layer?.type ?? "source") }}>
              {layer?.name ?? model.layerId}
            </span>
          </div>
        </div>
        {model.description && <p className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>{model.description}</p>}
        <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {headline && <span style={{ color: layerColor(layer?.type ?? "source") }}>{headline}</span>}
          {model.grain && <span>Grain: {model.grain}</span>}
          {originMeta && (
            <span
              className="flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold"
              style={{
                background: `${originMeta.color}20`,
                color: originMeta.color,
                border: `0.5px solid ${originMeta.color}40`,
              }}
              title={`Source origin: ${originMeta.description}`}
            >
              <span className="font-mono">{originMeta.short}</span>
              <span>{originMeta.label}</span>
            </span>
          )}
          {model.sourceClassification?.ingestionMethod && (
            <span title="Ingestion method">
              via {model.sourceClassification.ingestionMethod.replace(/_/g, " ")}
            </span>
          )}
          {model.domain && (
            <span
              className="rounded px-1.5 py-0.5 font-semibold"
              style={{ background: `${domainColor(model.domain)}30`, color: domainColor(model.domain) }}
              title={`Owns domain: ${model.domain}`}
            >
              {model.domain}
            </span>
          )}
          {servedOthers.map((d) => (
            <span
              key={d}
              className="rounded px-1.5 py-0.5 font-medium"
              style={{
                background: `${domainColor(d)}15`,
                color: domainColor(d),
                border: `0.5px dashed ${domainColor(d)}50`,
              }}
              title={`Feeds the ${d} domain downstream`}
            >
              → {d}
            </span>
          ))}
          {model.status !== "active" && <span>Status: {model.status}</span>}
        </div>
        {(model.tags?.length ?? 0) > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {model.tags!.map((t) => (
              <span key={t} className="rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}>
        <h3 className="mb-3 text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Columns <span style={{ color: "var(--text-quaternary)" }}>({model.columns.length})</span>
        </h3>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "0.5px solid var(--border-strong)" }}>
              {["Name", "Type", "Role", "Description"].map((h) => (
                <th key={h} className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.columns.map((col) => <ColumnRow key={col.id} col={col} />)}
          </tbody>
        </table>
      </div>

      <ModelConnectionsEditor graph={graph} modelId={modelId} />

      <SqlEditor
        sql={model.sql}
        dialect={model.sqlDialect}
        onChange={(patch) => updateModel(modelId, patch)}
        placeholder={
          layer?.type === "source" || layer?.type === "raw"
            ? "-- DDL or the ingestion SQL that populates this table"
            : "-- SELECT columns…\n-- FROM upstream_model\n-- WHERE …"
        }
      />


      {(model.caveats?.length ?? 0) > 0 && (
        <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,159,10,0.06)", border: "0.5px solid rgba(255,159,10,0.15)" }}>
          <h3 className="mb-2 text-[13px] font-semibold" style={{ color: "#FF9F0A" }}>Caveats</h3>
          <ul className="space-y-1">
            {model.caveats!.map((c, i) => (
              <li key={i} className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────

type ViewMode = "layers" | "graph" | "domains" | "metrics";

export function DataLayerView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const zoomLevel = useWorkspaceStore((s) => s.zoomLevel);
  const zoomLayerId = useWorkspaceStore((s) => s.zoomLayerId);
  const zoomModelId = useWorkspaceStore((s) => s.zoomModelId);
  const [viewMode, setViewMode] = useState<ViewMode>("layers");

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No graph loaded. Open Connectors to import a graph.
      </div>
    );
  }

  if (zoomLevel === 3 && zoomModelId) return <ModelDetailView graph={graph} modelId={zoomModelId} />;
  if (zoomLevel === 2 && zoomLayerId) return <LayerDetailView graph={graph} layerId={zoomLayerId} />;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2">
        <div className="inline-flex rounded-lg p-0.5" style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)" }}>
          {(["layers", "graph", "domains", "metrics"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-all"
              style={{
                background: viewMode === mode ? "var(--surface-active)" : "transparent",
                color: viewMode === mode ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {mode === "layers" ? "Layers" : mode === "graph" ? "Graph" : mode === "domains" ? "Domains" : "Metrics"}
            </button>
          ))}
        </div>
        {viewMode === "graph" && <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>Double-click a node to inspect and edit connections</span>}
        {viewMode === "domains" && <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>Every table that feeds each product/feature domain, grouped by pipeline layer</span>}
        {viewMode === "metrics" && <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>Full upstream lineage for every metric, anchored at its housing table</span>}
      </div>
      <div className="min-h-0 flex-1">
        {viewMode === "graph" ? (
          <GraphConnectionsView graph={graph} />
        ) : viewMode === "domains" ? (
          <DomainLineageView graph={graph} />
        ) : viewMode === "metrics" ? (
          <MetricLineageView graph={graph} />
        ) : (
          <ArchitectureOverview graph={graph} />
        )}
      </div>
    </div>
  );
}
