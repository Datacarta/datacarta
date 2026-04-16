import { validateDatacartaGraph, type DatacartaGraph } from "datacarta-spec/client";
import { parseWorkspaceFile } from "../../lib/persist";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

function ConnectorStubCard(props: {
  title: string;
  body: string;
  status: "stub";
}): JSX.Element {
  return (
    <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-100">{props.title}</div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
          {props.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{props.body}</p>
    </div>
  );
}

export function ImportsView(): JSX.Element {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="rounded-xl border border-canvas-border bg-gradient-to-b from-slate-950/60 to-slate-950/20 p-5">
        <div className="text-sm font-semibold text-slate-100">Built-in sample</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Loads the Harmonic Audio demo graph from the sibling <span className="font-mono">datacarta-spec</span>{" "}
          repository (monorepo dev layout).
        </p>
        <button
          type="button"
          onClick={async () => {
            setLastError(null);
            try {
              const p = await window.datacarta.resolveSamplePath();
              if (!p) {
                setLastError(
                  "Could not locate datacarta-spec/samples/harmonic-audio.sample.json. Clone the monorepo so datacarta-desktop and datacarta-spec are siblings."
                );
                return;
              }
              const text = await window.datacarta.readTextFile(p);
              const raw = JSON.parse(text) as unknown;
              const v = validateDatacartaGraph(raw);
              if (!v.ok) throw new Error(v.errors.join("\n"));
              openWorkspace(raw as DatacartaGraph, null, []);
            } catch (e) {
              setLastError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="mt-4 rounded-lg bg-teal-300/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-200"
        >
          Import Harmonic Audio sample
        </button>
      </div>

      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="text-sm font-semibold text-slate-100">Import graph JSON</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Choose any <span className="font-mono">datacarta-spec</span>-compliant graph JSON (or a desktop project wrapper).
        </p>
        <button
          type="button"
          onClick={async () => {
            setLastError(null);
            try {
              const res = await window.datacarta.openGraphJson();
              if (res.canceled) return;
              const w = parseWorkspaceFile(res.text);
              openWorkspace(w.graph, null, w.blueprints);
            } catch (e) {
              setLastError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="mt-4 rounded-lg border border-canvas-border bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-accent/30"
        >
          Choose JSON file…
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ConnectorStubCard
          title="dbt"
          status="stub"
          body="Future: manifest + catalog mapping into Datacarta nodes/edges with model tier inference."
        />
        <ConnectorStubCard
          title="Snowflake"
          status="stub"
          body="Future: metadata-only harvest for tables, columns, tags, and masking hints."
        />
        <ConnectorStubCard
          title="Databricks"
          status="stub"
          body="Future: Unity Catalog entities and lineage-aware edges into the canonical graph."
        />
      </div>
    </div>
  );
}
