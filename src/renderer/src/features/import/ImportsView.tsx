import { validateDatacartaGraph, type DatacartaGraph } from "datacarta-spec/client";
import { parseWorkspaceFile } from "../../lib/persist";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function ImportsView(): JSX.Element {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const setLastError = useWorkspaceStore((s) => s.setLastError);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-white">Built-in sample</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          Loads the Harmonic Audio demo graph from the sibling datacarta-spec package.
        </p>
        <button
          type="button"
          onClick={async () => {
            setLastError(null);
            try {
              const p = await window.datacarta.resolveSamplePath();
              if (!p) {
                setLastError("Could not locate sample. Ensure datacarta-spec is a sibling directory.");
                return;
              }
              const text = await window.datacarta.readTextFile(p);
              const raw = JSON.parse(text) as unknown;
              const v = validateDatacartaGraph(raw);
              if (!v.ok) throw new Error(v.errors.join("\n"));
              openWorkspace(raw as DatacartaGraph, null);
            } catch (e) {
              setLastError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
          style={{ background: "#007AFF" }}
        >
          Import Harmonic Audio sample
        </button>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-white">Import graph JSON</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          Choose any datacarta-spec v0.2.0 compliant JSON file.
        </p>
        <button
          type="button"
          onClick={async () => {
            setLastError(null);
            try {
              const res = await window.datacarta.openGraphJson();
              if (res.canceled) return;
              const w = parseWorkspaceFile(res.text);
              openWorkspace(w.graph, null);
            } catch (e) {
              setLastError(e instanceof Error ? e.message : String(e));
            }
          }}
          className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-white/80 hover:text-white"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          Choose JSON file...
        </button>
      </div>
    </div>
  );
}
