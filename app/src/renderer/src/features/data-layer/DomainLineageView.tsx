import { useMemo, useState } from "react";
import type { DatacartaGraph, Model, SourceOrigin } from "datacarta-spec/client";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { buildAdjacency, getAncestors, computeServedDomains } from "../../lib/lineage";
import { SOURCE_ORIGIN_META } from "../../lib/source-classification";
import { domainColor, layerColor } from "./DataLayerView";

/**
 * Shows each product/feature domain with the COMPLETE set of tables that
 * populate it — grouped by layer in pipeline order (source → raw → staging →
 * intermediate → mart). A table can appear in multiple domain columns if its
 * lineage reaches more than one.
 *
 * This answers the question: "for the growth domain, which tables are
 * involved in producing it?" end to end.
 */
export function DomainLineageView({ graph }: { graph: DatacartaGraph }) {
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showOnlyOriginatedFromOrigin, setShowOnlyOriginatedFromOrigin] = useState<SourceOrigin | null>(null);

  const adjacency = useMemo(() => buildAdjacency(graph), [graph]);
  const servedMap = useMemo(() => computeServedDomains(graph), [graph]);
  const modelById = useMemo(() => new Map(graph.models.map((m) => [m.id, m])), [graph.models]);
  const orderedLayers = useMemo(
    () => [...graph.layerDefinitions].sort((a, b) => a.order - b.order),
    [graph.layerDefinitions],
  );

  /** All domains that exist as a model.domain somewhere. */
  const domains = useMemo(
    () => [...new Set(graph.models.map((m) => m.domain).filter(Boolean) as string[])].sort(),
    [graph.models],
  );

  /**
   * For each domain, the set of every model whose lineage reaches a model
   * that owns this domain. "Reaches" means: it IS that model, or there's a
   * downstream path to that model.
   */
  const modelsByDomain = useMemo(() => {
    const result = new Map<string, Set<string>>();
    // Seed with each domain-owning model
    const ownersByDomain = new Map<string, string[]>();
    for (const m of graph.models) {
      if (!m.domain) continue;
      const arr = ownersByDomain.get(m.domain) ?? [];
      arr.push(m.id);
      ownersByDomain.set(m.domain, arr);
    }
    for (const [domain, owners] of ownersByDomain) {
      const set = new Set<string>();
      for (const ownerId of owners) {
        set.add(ownerId);
        for (const ancestorId of getAncestors(adjacency, ownerId)) set.add(ancestorId);
      }
      result.set(domain, set);
    }
    return result;
  }, [graph.models, adjacency]);

  /** Models in the active domain (or all domains if none selected), grouped by layer. */
  const grouped = useMemo(() => {
    const activeDomains = selectedDomain ? [selectedDomain] : domains;
    const perDomain = new Map<string, Map<string, Model[]>>();
    for (const d of activeDomains) {
      const ids = modelsByDomain.get(d) ?? new Set();
      const byLayer = new Map<string, Model[]>();
      for (const id of ids) {
        const m = modelById.get(id);
        if (!m) continue;
        if (showOnlyOriginatedFromOrigin && m.sourceClassification?.origin !== showOnlyOriginatedFromOrigin) {
          // "Filter by origin" = only show models whose lineage includes a
          // source of that origin. We interpret that as: keep the model if
          // it IS that origin, or if any ancestor has that origin.
          const ancestors = getAncestors(adjacency, m.id);
          let matched = false;
          for (const aId of ancestors) {
            const a = modelById.get(aId);
            if (a?.sourceClassification?.origin === showOnlyOriginatedFromOrigin) {
              matched = true;
              break;
            }
          }
          if (!matched) continue;
        }
        const arr = byLayer.get(m.layerId) ?? [];
        arr.push(m);
        byLayer.set(m.layerId, arr);
      }
      perDomain.set(d, byLayer);
    }
    return perDomain;
  }, [domains, selectedDomain, modelsByDomain, modelById, showOnlyOriginatedFromOrigin, adjacency]);

  if (domains.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No domains tagged in this graph. Set <span className="mx-1 font-mono">domain</span> on your mart-layer models to see them grouped here.
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
            Domain:
          </span>
          <button
            type="button"
            onClick={() => setSelectedDomain(null)}
            className="rounded-md px-2 py-0.5 text-[11px] font-medium transition-all"
            style={{
              background: selectedDomain === null ? "var(--accent-dim)" : "var(--surface-hover)",
              color: selectedDomain === null ? "var(--accent)" : "var(--text-tertiary)",
              border: selectedDomain === null ? "0.5px solid var(--accent)" : "0.5px solid var(--border)",
            }}
          >
            All ({domains.length})
          </button>
          {domains.map((d) => {
            const active = selectedDomain === d;
            const color = domainColor(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDomain(active ? null : d)}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all"
                style={{
                  background: active ? `${color}25` : `${color}10`,
                  border: active ? `1px solid ${color}` : "0.5px solid transparent",
                  color,
                }}
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {d}
                <span style={{ opacity: 0.7 }}>({modelsByDomain.get(d)?.size ?? 0})</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
            Origin:
          </span>
          <button
            type="button"
            onClick={() => setShowOnlyOriginatedFromOrigin(null)}
            className="rounded-md px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: showOnlyOriginatedFromOrigin === null ? "var(--surface-active)" : "var(--surface-hover)",
              color: showOnlyOriginatedFromOrigin === null ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            Any
          </button>
          {(Object.keys(SOURCE_ORIGIN_META) as SourceOrigin[]).map((o) => {
            const meta = SOURCE_ORIGIN_META[o];
            const active = showOnlyOriginatedFromOrigin === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setShowOnlyOriginatedFromOrigin(active ? null : o)}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: active ? `${meta.color}25` : "var(--surface-hover)",
                  color: active ? meta.color : "var(--text-tertiary)",
                  border: active ? `0.5px solid ${meta.color}` : "0.5px solid transparent",
                }}
                title={`Only show tables whose lineage reaches a ${meta.label.toLowerCase()} source`}
              >
                {meta.short}
                <span style={{ opacity: 0.9 }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-domain pipelines */}
      <div className="space-y-6">
        {[...grouped.entries()].map(([domain, byLayer]) => {
          const dColor = domainColor(domain);
          const totalCount = [...byLayer.values()].reduce((acc, arr) => acc + arr.length, 0);
          return (
            <section
              key={domain}
              className="rounded-xl p-4"
              style={{
                background: `${dColor}08`,
                border: `1px solid ${dColor}30`,
              }}
            >
              <header className="mb-3 flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: dColor }} />
                <h2 className="text-[14px] font-semibold" style={{ color: dColor }}>{domain}</h2>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {totalCount} {totalCount === 1 ? "table feeds" : "tables feed"} this domain
                </span>
              </header>

              {/* Pipeline columns — one per layer that has tables */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${orderedLayers.filter((l) => (byLayer.get(l.id)?.length ?? 0) > 0).length || 1}, minmax(180px, 1fr))` }}>
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
                          const isOwner = m.domain === domain;
                          const ownDomainSet = servedMap.get(m.id);
                          const sharedWith = ownDomainSet
                            ? [...ownDomainSet].filter((d) => d !== domain).sort()
                            : [];
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => zoomToModel(m.id)}
                              className="w-full rounded-md px-2 py-1.5 text-left transition-all hover:scale-[1.01]"
                              style={{
                                background: isOwner ? `${dColor}18` : "var(--bg-card)",
                                border: isOwner
                                  ? `1px solid ${dColor}50`
                                  : "0.5px solid var(--border)",
                              }}
                              title={isOwner ? `Owns ${domain}` : `Feeds ${domain} downstream`}
                            >
                              <div className="flex items-center gap-1.5">
                                {originMeta && (
                                  <span
                                    className="shrink-0 rounded px-1 py-0 font-mono text-[8px] font-bold"
                                    style={{
                                      background: `${originMeta.color}25`,
                                      color: originMeta.color,
                                    }}
                                  >
                                    {originMeta.short}
                                  </span>
                                )}
                                <span className="truncate text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                                  {m.displayName ?? m.name}
                                </span>
                                {m.sql && (
                                  <span className="ml-auto shrink-0 rounded px-1 py-0 text-[8px] font-semibold" style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }} title="Has SQL">
                                    SQL
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 text-[9px]" style={{ color: "var(--text-quaternary)" }}>
                                <span>{m.columns.length} cols</span>
                                {sharedWith.length > 0 && (
                                  <span title={`Also feeds: ${sharedWith.join(", ")}`}>
                                    · shared with {sharedWith.length}
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
    </div>
  );
}
