import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeProps,
} from "@xyflow/react";
import type { DatacartaGraph, EdgeType, SourceOrigin } from "datacarta-spec/client";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { formatModelingHeadline } from "../../lib/modeling-metadata";
import { LAYER_COLORS, domainColor } from "./DataLayerView";
import { EDGE_TYPE_LABELS, EDGE_TYPE_DESCRIPTIONS, computeServedDomains } from "../../lib/lineage";
import { SOURCE_ORIGIN_META } from "../../lib/source-classification";

type FlowNodeData = {
  label: string;
  sublabel: string;
  layerType: string;
  roleLine?: string | null;
  trust: string;
  columnCount: number;
  domain?: string;
  /** Domains served by this model (own + downstream descendants). */
  served: string[];
  /** Set only on source/raw layer models that classify their origin. */
  origin?: SourceOrigin;
  hasSql?: boolean;
};

function ConnectionNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const lColor = LAYER_COLORS[data.layerType] ?? "#888";
  // Primary color is own domain if set, otherwise the first downstream-served
  // domain so upstream tables get tinted with the color of what they feed.
  const hasOwn = Boolean(data.domain);
  const primaryDomain = data.domain ?? data.served[0];
  const dColor = domainColor(primaryDomain);
  const servedOthers = data.served.filter((d) => d !== data.domain);
  const zoomToModel = useWorkspaceStore((s) => s.zoomToModel);

  return (
    <div
      className="rounded-xl px-3 py-2.5 text-left transition-all"
      style={{
        background: `${dColor}${hasOwn ? "18" : "08"}`,
        backdropFilter: "blur(12px)",
        border: props.selected
          ? `1.5px solid ${dColor}`
          : hasOwn
            ? `1px solid ${dColor}45`
            : `1px dashed ${dColor}35`,
        minWidth: 200,
        maxWidth: 250,
        cursor: "pointer",
      }}
      onDoubleClick={() => zoomToModel(props.id)}
    >
      <Handle type="target" position={Position.Top} style={{ background: lColor, width: 6, height: 6 }} />
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: lColor }} />
        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-quaternary)" }}>
          {data.sublabel}
        </span>
        {data.origin && (
          <span
            className="ml-auto rounded px-1 py-0.5 font-mono text-[8px] font-bold"
            style={{
              background: `${SOURCE_ORIGIN_META[data.origin].color}25`,
              color: SOURCE_ORIGIN_META[data.origin].color,
              border: `0.5px solid ${SOURCE_ORIGIN_META[data.origin].color}60`,
            }}
            title={`${SOURCE_ORIGIN_META[data.origin].label} — ${SOURCE_ORIGIN_META[data.origin].description}`}
          >
            {SOURCE_ORIGIN_META[data.origin].short}
          </span>
        )}
      </div>
      <div className="mt-0.5 truncate text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {data.label}
      </div>
      {data.roleLine && (
        <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {data.roleLine}
        </div>
      )}
      <div className="mt-1 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
        <span>{data.columnCount} cols</span>
        <span>·</span>
        <span>{data.trust}</span>
        {data.hasSql && (
          <span className="ml-auto rounded px-1 py-0 text-[8px] font-semibold" style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }} title="Has SQL definition">
            SQL
          </span>
        )}
      </div>
      {(data.domain || servedOthers.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {data.domain && (
            <span
              className="rounded px-1 py-0.5 text-[9px] font-semibold"
              style={{ background: `${domainColor(data.domain)}30`, color: domainColor(data.domain) }}
              title={`Owns domain: ${data.domain}`}
            >
              {data.domain}
            </span>
          )}
          {servedOthers.map((d) => (
            <span
              key={d}
              className="rounded px-1 py-0.5 text-[9px] font-semibold"
              style={{
                background: `${domainColor(d)}12`,
                color: domainColor(d),
                border: `0.5px dashed ${domainColor(d)}50`,
              }}
              title={`Feeds downstream ${d} models`}
            >
              → {d}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: lColor, width: 6, height: 6 }} />
    </div>
  );
}

/** Invisible group node that acts as a layer bubble */
function LayerGroupNode(props: NodeProps) {
  const data = props.data as { label: string; layerType: string; width: number; height: number };
  const color = LAYER_COLORS[data.layerType] ?? "#888";

  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        background: `${color}06`,
        border: `1.5px dashed ${color}40`,
        borderRadius: 16,
        padding: 12,
        pointerEvents: "none",
      }}
    >
      <div className="flex items-center gap-2" style={{ pointerEvents: "none" }}>
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `${color}90` }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = { connection: ConnectionNode, layerGroup: LayerGroupNode };

function buildFlowElements(
  graph: DatacartaGraph,
  domainFilter: string | null,
  search: string,
  servedMap: Map<string, Set<string>>,
): { nodes: RFNode[]; edges: RFEdge[] } {
  const layerIndex = new Map(graph.layerDefinitions.map((l) => [l.id, l]));
  const orderedLayers = [...graph.layerDefinitions].sort((a, b) => a.order - b.order);

  // Filter models. When filtering by domain, keep any model whose lineage
  // reaches that domain — so upstream raw/staging/intermediate tables stay
  // visible, not just the mart that owns the domain.
  const q = search.toLowerCase();
  const visibleModels = graph.models.filter((m) => {
    if (domainFilter) {
      const served = servedMap.get(m.id);
      if (!served || !served.has(domainFilter)) return false;
    }
    if (q && !`${m.name} ${m.displayName ?? ""} ${m.domain ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const visibleIds = new Set(visibleModels.map((m) => m.id));

  // Group models by layer for positioning
  const groups = new Map<string, typeof graph.models>();
  for (const m of visibleModels) {
    const arr = groups.get(m.layerId) ?? [];
    arr.push(m);
    groups.set(m.layerId, arr);
  }

  const colWidth = 280;
  const rowPadding = 50;
  const headerHeight = 40;
  const nodeHeight = 90;
  const nodeGap = 20;
  const layerGap = 60;

  const nodes: RFNode[] = [];
  let rowY = 0;

  for (const layer of orderedLayers) {
    const models = groups.get(layer.id);
    if (!models?.length) continue;

    const groupWidth = Math.max(models.length * colWidth + rowPadding, 350);
    const groupHeight = headerHeight + nodeHeight + rowPadding;

    // Layer group bubble
    nodes.push({
      id: `group-${layer.id}`,
      type: "layerGroup",
      position: { x: -rowPadding / 2, y: rowY },
      data: {
        label: layer.name,
        layerType: layer.type,
        width: groupWidth,
        height: groupHeight,
      },
      draggable: false,
      selectable: false,
    });

    // Model nodes inside the group
    let col = 0;
    for (const m of models) {
      const headline = formatModelingHeadline(m);
      const served = [...(servedMap.get(m.id) ?? new Set<string>())].sort();
      nodes.push({
        id: m.id,
        type: "connection",
        position: { x: col * colWidth + 10, y: rowY + headerHeight },
        data: {
          label: m.displayName ?? m.name,
          sublabel: layer.name,
          layerType: layer.type,
          roleLine: headline,
          trust: m.trustLevel,
          columnCount: m.columns.length,
          domain: m.domain,
          served,
          origin: m.sourceClassification?.origin,
          hasSql: Boolean(m.sql && m.sql.trim().length > 0),
        } satisfies FlowNodeData,
      });
      col += 1;
    }
    rowY += groupHeight + layerGap;
  }

  const edges: RFEdge[] = graph.edges
    .filter((e) => visibleIds.has(e.sourceId) && visibleIds.has(e.targetId))
    .map((e) => {
      const sourceLayer = layerIndex.get(graph.models.find((m) => m.id === e.sourceId)?.layerId ?? "");
      const color = LAYER_COLORS[sourceLayer?.type ?? ""] ?? "#666";
      return {
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: EDGE_TYPE_LABELS[e.type as EdgeType] ?? e.type,
        animated: e.type === "depends_on",
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
        labelStyle: { fill: "var(--text-tertiary)", fontSize: 10 },
        labelBgStyle: { fill: "var(--bg-canvas)", fillOpacity: 0.9 },
        data: { edgeType: e.type },
      };
    });

  return { nodes, edges };
}

export function GraphConnectionsView({ graph }: { graph: DatacartaGraph }) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const updateEdge = useWorkspaceStore((s) => s.updateEdge);
  const deleteEdge = useWorkspaceStore((s) => s.deleteEdge);

  const domains = useMemo(
    () => [...new Set(graph.models.map((m) => m.domain).filter(Boolean) as string[])].sort(),
    [graph.models]
  );

  const servedMap = useMemo(() => computeServedDomains(graph), [graph]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowElements(graph, domainFilter, search, servedMap),
    [graph, domainFilter, search, servedMap]
  );
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const selectedEdge = useMemo(
    () => (selectedEdgeId ? graph.edges.find((e) => e.id === selectedEdgeId) ?? null : null),
    [graph.edges, selectedEdgeId]
  );
  const modelNameById = useMemo(
    () => new Map(graph.models.map((m) => [m.id, m.displayName ?? m.name])),
    [graph.models]
  );

  const handleEdgeClick = useCallback((_e: unknown, edge: RFEdge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Search & filter bar */}
      <div className="mb-2 flex items-center gap-3">
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
        {/* Domain legend chips */}
        <div className="flex flex-wrap gap-1.5">
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomainFilter(domainFilter === d ? null : d)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-all"
              style={{
                background: domainFilter === d ? `${domainColor(d)}25` : `${domainColor(d)}10`,
                border: domainFilter === d ? `1px solid ${domainColor(d)}` : "1px solid transparent",
                color: domainColor(d),
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: domainColor(d) }} />
              {d}
            </button>
          ))}
        </div>
      </div>
      {/* Source-origin legend — explains the FE/BE/3P badges on source/raw nodes */}
      <div className="mb-2 flex items-center gap-2 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
        <span className="font-semibold uppercase tracking-wider">Source origins:</span>
        {(Object.keys(SOURCE_ORIGIN_META) as SourceOrigin[]).map((o) => {
          const meta = SOURCE_ORIGIN_META[o];
          return (
            <span
              key={o}
              className="flex items-center gap-1 rounded px-1.5 py-0.5"
              style={{
                background: `${meta.color}12`,
                border: `0.5px solid ${meta.color}40`,
                color: meta.color,
              }}
              title={meta.description}
            >
              <span className="font-mono text-[9px] font-bold">{meta.short}</span>
              <span>{meta.label}</span>
            </span>
          );
        })}
        <span className="ml-2" style={{ color: "var(--text-tertiary)" }}>· Double-click a node to inspect and edit connections · Click an edge to change its type</span>
      </div>
      <div className="relative min-h-0 flex-1" style={{ minHeight: 500 }}>
        <ReactFlow
          key={`${domainFilter ?? "all"}-${search}`}
          nodes={initialNodes}
          edges={initialEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={handleEdgeClick}
          onPaneClick={() => setSelectedEdgeId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border)" gap={24} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "layerGroup") return "transparent";
              const data = n.data as FlowNodeData;
              return domainColor(data.domain);
            }}
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>

        {/* Edge edit popover — appears when a connection is clicked */}
        {selectedEdge && (
          <div
            className="absolute right-4 top-4 z-10 w-72 rounded-xl p-3 shadow-lg"
            style={{
              background: "var(--bg-card)",
              border: "0.5px solid var(--border)",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
                Edit connection
              </div>
              <button
                type="button"
                onClick={() => setSelectedEdgeId(null)}
                className="text-[11px]"
                style={{ color: "var(--text-quaternary)" }}
              >
                ✕
              </button>
            </div>
            <div className="mb-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <span className="font-mono">{modelNameById.get(selectedEdge.sourceId) ?? selectedEdge.sourceId}</span>
              <span style={{ color: "var(--text-quaternary)" }}> {EDGE_TYPE_LABELS[selectedEdge.type as EdgeType] ?? selectedEdge.type} </span>
              <span className="font-mono">{modelNameById.get(selectedEdge.targetId) ?? selectedEdge.targetId}</span>
            </div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
              Connection type
            </label>
            <select
              value={selectedEdge.type}
              onChange={(e) => updateEdge(selectedEdge.id, { type: e.target.value as EdgeType })}
              className="mt-1 w-full rounded px-2 py-1 text-[11px] focus:outline-none"
              style={{
                background: "var(--bg-canvas)",
                border: "0.5px solid var(--border)",
                color: "var(--text-primary)",
              }}
              title={EDGE_TYPE_DESCRIPTIONS[selectedEdge.type as EdgeType]}
            >
              {(Object.keys(EDGE_TYPE_LABELS) as EdgeType[]).map((t) => (
                <option key={t} value={t}>
                  {EDGE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="mt-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {EDGE_TYPE_DESCRIPTIONS[selectedEdge.type as EdgeType]}
            </div>
            <button
              type="button"
              onClick={() => {
                deleteEdge(selectedEdge.id);
                setSelectedEdgeId(null);
              }}
              className="mt-3 w-full rounded-md py-1 text-[11px] font-semibold"
              style={{
                background: "rgba(255,69,58,0.1)",
                color: "#FF453A",
                border: "0.5px solid rgba(255,69,58,0.3)",
              }}
            >
              Remove connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
