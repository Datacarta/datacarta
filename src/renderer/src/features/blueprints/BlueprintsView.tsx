import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type { ModelBlueprint, StarSchemaRole } from "../../types/project";
import { newId } from "../../lib/id";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

const STAR_ROLES: StarSchemaRole[] = ["dimension", "fact", "bridge", "staging", "unknown"];
const SCD: Array<"0" | "1" | "2" | "none"> = ["none", "1", "2", "0"];

export function BlueprintsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const blueprints = useWorkspaceStore((s) => s.blueprints);
  const addBlueprint = useWorkspaceStore((s) => s.addBlueprint);
  const updateBlueprint = useWorkspaceStore((s) => s.updateBlueprint);
  const removeBlueprint = useWorkspaceStore((s) => s.removeBlueprint);

  const [title, setTitle] = useState("");
  const [starRole, setStarRole] = useState<StarSchemaRole>("fact");
  const [scdType, setScdType] = useState<"0" | "1" | "2" | "none">("none");
  const [grain, setGrain] = useState("");
  const [notes, setNotes] = useState("");

  const nodeOptions = useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter((n) => ["mart_model", "intermediate_model", "staged_model", "raw_table", "dimension"].includes(n.type))
      .map((n) => ({ id: n.id, label: `${n.displayName ?? n.name} (${n.type})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [graph]);

  if (!graph) {
    return (
      <div className="rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-8 text-sm text-slate-500">
        Load a graph first, then sketch planned models here. Blueprints save with your <span className="text-slate-300">.dcproj.json</span> file.
      </div>
    );
  }

  function submit(e: FormEvent): void {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const now = new Date().toISOString();
    const b: ModelBlueprint = {
      id: newId(),
      title: t,
      starRole,
      scdType: scdType === "none" ? undefined : scdType,
      grain: grain.trim() || undefined,
      notes: notes.trim() || undefined,
      status: "idea",
      createdAt: now,
      updatedAt: now,
    };
    addBlueprint(b);
    setTitle("");
    setNotes("");
    setGrain("");
    setScdType("none");
    setStarRole("fact");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-2">
      <div>
        <h1 className="text-xl font-semibold text-slate-50">Model blueprints</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Lightweight planning layer: capture dim/fact intent, SCD style, and grain <strong>before</strong> the asset exists
          in the warehouse. Link a blueprint to a graph node when it ships. This is local-only; the hosted product will attach
          approvals and shared boards later.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-canvas-border bg-slate-950/40 p-4 md:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. fct_listen_events_daily"
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-accent/40"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Star role</label>
          <select
            value={starRole}
            onChange={(e) => setStarRole(e.target.value as StarSchemaRole)}
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100"
          >
            {STAR_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">SCD (dims)</label>
          <select
            value={scdType}
            onChange={(e) => setScdType(e.target.value as typeof scdType)}
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100"
          >
            {SCD.map((s) => (
              <option key={s} value={s}>
                {s === "none" ? "n/a" : `SCD ${s}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Grain</label>
          <input
            value={grain}
            onChange={(e) => setGrain(e.target.value)}
            placeholder="user_day"
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-accent/40"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-300/90 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-200"
          >
            Add blueprint
          </button>
        </div>
        <div className="md:col-span-2 lg:col-span-6">
          <label className="text-xs font-semibold text-slate-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Join keys, source systems, open questions…"
            className="mt-1 w-full rounded-lg border border-canvas-border bg-canvas-muted/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent/40"
          />
        </div>
      </form>

      {blueprints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-canvas-border bg-slate-950/30 p-8 text-center text-sm text-slate-500">
          No blueprints yet. Add one above, then save from <span className="text-slate-300">Projects</span>.
        </div>
      ) : (
        <div className="space-y-3">
          {blueprints.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-canvas-border bg-slate-950/40 p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold text-teal-100/90">{b.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="rounded border border-canvas-border px-1.5 py-0.5">{b.starRole}</span>
                  {b.scdType ? (
                    <span className="rounded border border-canvas-border px-1.5 py-0.5">SCD {b.scdType}</span>
                  ) : null}
                  {b.grain ? <span className="font-mono">grain: {b.grain}</span> : null}
                  <span className="uppercase tracking-wide text-slate-500">{b.status}</span>
                </div>
                {b.notes ? <p className="mt-2 text-sm text-slate-300">{b.notes}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 md:w-56">
                <label className="text-[10px] font-semibold uppercase text-slate-500">Status</label>
                <select
                  value={b.status}
                  onChange={(e) => updateBlueprint(b.id, { status: e.target.value as ModelBlueprint["status"] })}
                  className="rounded-lg border border-canvas-border bg-canvas-muted/40 px-2 py-1.5 text-xs text-slate-100"
                >
                  {(["idea", "planned", "in_build", "shipped"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <label className="text-[10px] font-semibold uppercase text-slate-500">Link to graph node</label>
                <select
                  value={b.linkedNodeId ?? ""}
                  onChange={(e) =>
                    updateBlueprint(b.id, { linkedNodeId: e.target.value ? e.target.value : undefined })
                  }
                  className="rounded-lg border border-canvas-border bg-canvas-muted/40 px-2 py-1.5 text-xs text-slate-100"
                >
                  <option value="">— none —</option>
                  {nodeOptions.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeBlueprint(b.id)}
                  className="rounded-lg border border-red-500/30 bg-red-950/30 px-2 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-950/50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
