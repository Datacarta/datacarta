import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function GovernanceView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        No graph loaded.
      </div>
    );
  }
  return (
    <div className="text-[13px] text-white/50">
      Governance — {graph.governanceTemplate ?? "no template"} applied
    </div>
  );
}
