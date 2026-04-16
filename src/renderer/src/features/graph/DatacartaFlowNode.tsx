import { Handle, Position, type NodeProps } from "@xyflow/react";

type DCData = {
  label: string;
  sublabel: string;
  roleLine?: string | null;
  trust?: string;
};

export function DatacartaFlowNode(props: NodeProps<DCData>): JSX.Element {
  const { data, selected } = props;
  return (
    <div
      className={[
        "min-w-[220px] max-w-[260px] rounded-xl border px-3 py-2 text-left shadow-lg transition",
        selected ? "border-teal-300/70 ring-1 ring-teal-400/30" : "border-slate-700/80",
        "bg-slate-900/95",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-500" />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{data.sublabel}</div>
      <div className="text-sm font-semibold leading-snug text-slate-50">{data.label}</div>
      {data.roleLine ? (
        <div className="mt-1 line-clamp-2 font-mono text-[10px] leading-relaxed text-teal-200/90">{data.roleLine}</div>
      ) : null}
      <div className="mt-1 text-[10px] text-slate-500">trust: {data.trust ?? "unknown"}</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-500" />
    </div>
  );
}
