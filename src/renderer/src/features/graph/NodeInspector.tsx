import type { DatacartaGraph } from "datacarta-spec/client";
import { formatModelingHeadline, getModelingSummary } from "../../lib/modeling-metadata";

function neighbors(graph: DatacartaGraph, nodeId: string) {
  const upstream = graph.edges
    .filter((e) => e.targetId === nodeId)
    .map((e) => ({ edge: e, node: graph.nodes.find((n) => n.id === e.sourceId) }));
  const downstream = graph.edges
    .filter((e) => e.sourceId === nodeId)
    .map((e) => ({ edge: e, node: graph.nodes.find((n) => n.id === e.targetId) }));
  return { upstream, downstream };
}

export function NodeInspector(props: {
  graph: DatacartaGraph;
  nodeId: string | null;
  /** When false, copy is tuned for the Nodes split panel. */
  graphContext?: boolean;
}): JSX.Element {
  const graphContext = props.graphContext ?? true;

  if (!props.nodeId) {
    return (
      <div className="flex h-full min-h-[200px] flex-col justify-center rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-4 text-sm text-slate-400">
        {graphContext
          ? "Select a node on the canvas to inspect modeling metadata, columns, lineage, and trust."
          : "Pick a row in the directory to inspect warehouse-style metadata without leaving this screen."}
      </div>
    );
  }

  const node = props.graph.nodes.find((n) => n.id === props.nodeId);
  if (!node) {
    return (
      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-4 text-sm text-slate-300">
        Node not found.
      </div>
    );
  }

  const { upstream, downstream } = neighbors(props.graph, node.id);
  const owner = node.ownerId ? props.graph.nodes.find((n) => n.id === node.ownerId) : undefined;
  const modeling = getModelingSummary(node);
  const headline = formatModelingHeadline(node);
  const rawMeta =
    node.metadata && typeof node.metadata === "object" ? JSON.stringify(node.metadata, null, 2) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-canvas-border bg-slate-950/40 p-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{node.type}</div>
        <div className="mt-1 text-lg font-semibold text-slate-50">{node.displayName ?? node.name}</div>
        <div className="mt-1 font-mono text-xs text-slate-400">{node.id}</div>
        {headline ? (
          <div className="mt-2 rounded-lg border border-teal-500/25 bg-teal-950/30 px-2 py-1.5 font-mono text-[11px] text-teal-100/95">
            {headline}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            No modeling overlays on this node yet. Use <span className="font-mono">metadata.starSchemaRole</span>,{" "}
            <span className="font-mono">scdType</span>, and <span className="font-mono">columns[]</span> in graph JSON
            (see Harmonic sample).
          </p>
        )}
      </div>

      {(modeling.starRole || modeling.dataVaultRole || modeling.scdType) && (
        <div>
          <div className="text-xs font-semibold text-slate-400">Modeling intent</div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {modeling.starRole ? (
              <>
                <dt className="text-slate-500">Star role</dt>
                <dd className="font-mono text-slate-200">{modeling.starRole}</dd>
              </>
            ) : null}
            {modeling.dataVaultRole ? (
              <>
                <dt className="text-slate-500">Data Vault</dt>
                <dd className="font-mono text-slate-200">{modeling.dataVaultRole}</dd>
              </>
            ) : null}
            {modeling.scdType ? (
              <>
                <dt className="text-slate-500">SCD</dt>
                <dd className="font-mono text-slate-200">{modeling.scdType}</dd>
              </>
            ) : null}
          </dl>
        </div>
      )}

      {modeling.physical && (modeling.physical.relation || modeling.physical.schema) ? (
        <div>
          <div className="text-xs font-semibold text-slate-400">Physical relation</div>
          <dl className="mt-2 space-y-1 text-xs">
            {modeling.physical.warehouse ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Warehouse</dt>
                <dd className="font-mono text-slate-200">{modeling.physical.warehouse}</dd>
              </div>
            ) : null}
            {modeling.physical.database ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Database</dt>
                <dd className="font-mono text-slate-200">{modeling.physical.database}</dd>
              </div>
            ) : null}
            {modeling.physical.schema ? (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Schema</dt>
                <dd className="font-mono text-slate-200">{modeling.physical.schema}</dd>
              </div>
            ) : null}
            {modeling.physical.relation ? (
              <div className="rounded-lg border border-canvas-border bg-canvas-muted/40 p-2 font-mono text-[11px] text-slate-100">
                {modeling.physical.relation}
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {modeling.columns.length ? (
        <div>
          <div className="text-xs font-semibold text-slate-400">Columns ({modeling.columns.length})</div>
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-canvas-border">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-900/95 text-slate-500">
                <tr>
                  <th className="border-b border-canvas-border px-2 py-1.5 font-medium">Name</th>
                  <th className="border-b border-canvas-border px-2 py-1.5 font-medium">Type</th>
                  <th className="border-b border-canvas-border px-2 py-1.5 font-medium">Keys</th>
                  <th className="border-b border-canvas-border px-2 py-1.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {modeling.columns.map((c) => (
                  <tr key={c.name} className="border-b border-canvas-border/50 align-top text-slate-200">
                    <td className="px-2 py-1.5 font-mono text-teal-100/90">{c.name}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-400">{c.physicalType ?? "—"}</td>
                    <td className="px-2 py-1.5 text-slate-400">{(c.keys ?? []).join(", ") || "—"}</td>
                    <td className="max-w-[140px] px-2 py-1.5 text-slate-400">{c.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-canvas-border bg-slate-950/50 p-2 text-[10px] text-slate-500">
              Column metadata comes from <span className="font-mono">node.metadata.columns[]</span> (open convention).
            </div>
          </div>
        </div>
      ) : null}

      {node.description ? (
        <div>
          <div className="text-xs font-semibold text-slate-400">Description</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{node.description}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-canvas-border bg-canvas-muted/40 p-3">
          <div className="text-xs text-slate-400">Grain</div>
          <div className="mt-1 font-mono text-sm text-slate-100">{node.grain ?? "—"}</div>
        </div>
        <div className="rounded-lg border border-canvas-border bg-canvas-muted/40 p-3">
          <div className="text-xs text-slate-400">Trust</div>
          <div className="mt-1 text-sm text-slate-100">{node.trustLevel ?? "unknown"}</div>
        </div>
        <div className="rounded-lg border border-canvas-border bg-canvas-muted/40 p-3">
          <div className="text-xs text-slate-400">Status</div>
          <div className="mt-1 text-sm text-slate-100">{node.status ?? "active"}</div>
        </div>
        <div className="rounded-lg border border-canvas-border bg-canvas-muted/40 p-3">
          <div className="text-xs text-slate-400">Owner</div>
          <div className="mt-1 text-sm text-slate-100">{owner?.displayName ?? owner?.name ?? "—"}</div>
        </div>
      </div>

      {node.tags?.length ? (
        <div>
          <div className="text-xs font-semibold text-slate-400">Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {node.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-canvas-border bg-slate-900/60 px-2 py-1 text-[11px] text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(node.usageHints?.length || node.caveats?.length) ? (
        <div className="space-y-2">
          {node.usageHints?.length ? (
            <div>
              <div className="text-xs font-semibold text-slate-400">Usage hints</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {node.usageHints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {node.caveats?.length ? (
            <div>
              <div className="text-xs font-semibold text-amber-300/90">Caveats</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-100/90">
                {node.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-slate-400">Upstream</div>
          <div className="mt-2 space-y-2">
            {upstream.length ? (
              upstream.map(({ edge, node: n }) => (
                <div key={edge.id} className="rounded-lg border border-canvas-border bg-canvas-muted/30 p-2">
                  <div className="text-[11px] text-slate-500">{edge.type}</div>
                  <div className="text-sm text-slate-100">{n?.displayName ?? n?.name ?? edge.sourceId}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">None</div>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400">Downstream</div>
          <div className="mt-2 space-y-2">
            {downstream.length ? (
              downstream.map(({ edge, node: n }) => (
                <div key={edge.id} className="rounded-lg border border-canvas-border bg-canvas-muted/30 p-2">
                  <div className="text-[11px] text-slate-500">{edge.type}</div>
                  <div className="text-sm text-slate-100">{n?.displayName ?? n?.name ?? edge.targetId}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">None</div>
            )}
          </div>
        </div>
      </div>

      {rawMeta ? (
        <details className="rounded-lg border border-canvas-border bg-slate-950/60 p-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400">Raw metadata JSON</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-slate-300">
            {rawMeta}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
