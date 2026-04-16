import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { graphToFlowElements } from "../../lib/toFlow";
import { DatacartaFlowNode } from "./DatacartaFlowNode";
import { NodeInspector } from "./NodeInspector";
import { ALL_NODE_TYPES, useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { NodeType } from "datacarta-spec/client";

export function GraphView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const nodeTypeFilter = useWorkspaceStore((s) => s.nodeTypeFilter);
  const search = useWorkspaceStore((s) => s.search);
  const setSearch = useWorkspaceStore((s) => s.setSearch);
  const toggleNodeType = useWorkspaceStore((s) => s.toggleNodeType);
  const clearNodeTypeFilter = useWorkspaceStore((s) => s.clearNodeTypeFilter);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const flow = useMemo(() => {
    if (!graph) return { nodes: [] as Node[], edges: [] as Edge[] };
    return graphToFlowElements(graph, { filter: nodeTypeFilter, search });
  }, [graph, nodeTypeFilter, search]);

  useEffect(() => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [flow]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const nodeTypes = useMemo(() => ({ datacarta: DatacartaFlowNode }), []);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-10 text-center text-sm text-slate-400">
        No graph loaded. Open <span className="text-slate-200">Imports</span> to load the Harmonic Audio sample or a spec-compliant JSON file.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-xl border border-canvas-border bg-slate-950/30 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes (name, tags)…"
              className="w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-accent/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => clearNodeTypeFilter()}
              className="rounded-lg border border-canvas-border bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-accent/30"
            >
              All types
            </button>
          </div>
        </div>

        <div className="min-h-[520px] flex-1 overflow-hidden rounded-xl border border-canvas-border bg-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, n) => setSelectedNodeId(n.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1f2a3a" variant={BackgroundVariant.Dots} gap={18} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>

        <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-3">
          <div className="text-xs font-semibold text-slate-400">Filter by node type</div>
          <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-auto">
            {ALL_NODE_TYPES.map((t: NodeType) => {
              const active = !nodeTypeFilter || nodeTypeFilter.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleNodeType(t)}
                  className={[
                    "rounded-full border px-2 py-1 font-mono text-[11px]",
                    active
                      ? "border-accent/30 bg-teal-950/40 text-teal-100"
                      : "border-canvas-border bg-slate-950/40 text-slate-500 line-through",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0">
        <NodeInspector graph={graph} nodeId={selectedNodeId} graphContext />
      </div>
    </div>
    </ReactFlowProvider>
  );
}
