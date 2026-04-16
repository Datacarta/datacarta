import { useMemo, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { validateGovernance, listTemplates, getTemplate } from "datacarta-spec/client";
import type { GovernanceViolation, GovernanceTemplate } from "datacarta-spec/client";

function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "error" ? "#FF453A" :
    severity === "warning" ? "#FF9F0A" :
    "#007AFF";
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{ background: `${color}15`, color }}
    >
      {severity}
    </span>
  );
}

export function GovernanceView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const [showPicker, setShowPicker] = useState(false);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
        No graph loaded.
      </div>
    );
  }

  const violations = useMemo(() => validateGovernance(graph), [graph]);
  const templates = useMemo(() => listTemplates(), []);
  const activeTemplate = graph.governanceTemplate
    ? getTemplate(graph.governanceTemplate)
    : null;

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warnCount = violations.filter((v) => v.severity === "warning").length;
  const infoCount = violations.filter((v) => v.severity === "info").length;

  const modelIndex = useMemo(
    () => new Map(graph.models.map((m) => [m.id, m])),
    [graph.models]
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Governance</h2>
          {activeTemplate && (
            <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              <span>Template:</span>
              <span className="font-medium text-[var(--text-secondary)]">{activeTemplate.name}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--surface-active)]"
          style={{
            background: "var(--surface-hover)",
            border: "0.5px solid var(--border-strong)",
            color: "var(--text-secondary)",
          }}
        >
          {showPicker ? "Hide Templates" : "Templates"}
        </button>
      </div>

      {/* Template Picker */}
      {showPicker && (
        <div className="mb-6 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {templates.map((t) => {
            const isActive = graph.governanceTemplate === t.id;
            return (
              <div
                key={t.id}
                className="rounded-xl p-4"
                style={{
                  background: isActive ? "rgba(0,122,255,0.08)" : "var(--bg-card)",
                  border: isActive
                    ? "0.5px solid rgba(0,122,255,0.3)"
                    : "0.5px solid var(--surface-hover)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t.name}</span>
                  {isActive && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: "rgba(0,122,255,0.2)", color: "#007AFF" }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {t.description}
                </p>
                <div className="mt-2 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
                  {t.defaultLayers.length} layers
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary badges */}
      <div className="mb-4 flex items-center gap-4">
        {violations.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(48,209,88,0.08)", border: "0.5px solid rgba(48,209,88,0.2)" }}>
            <svg className="h-4 w-4" style={{ color: "#30D158" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[13px] font-medium" style={{ color: "#30D158" }}>All rules pass</span>
          </div>
        ) : (
          <>
            {errorCount > 0 && (
              <span className="text-[12px] font-medium" style={{ color: "#FF453A" }}>
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-[12px] font-medium" style={{ color: "#FF9F0A" }}>
                {warnCount} warning{warnCount > 1 ? "s" : ""}
              </span>
            )}
            {infoCount > 0 && (
              <span className="text-[12px] font-medium" style={{ color: "#007AFF" }}>
                {infoCount} info
              </span>
            )}
          </>
        )}
      </div>

      {/* Violations list */}
      {violations.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--surface-hover)",
          }}
        >
          {violations.map((v, i) => {
            const model = modelIndex.get(v.modelId);
            return (
              <div
                key={`${v.ruleId}-${v.modelId}-${v.columnName ?? ""}-${i}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderBottom: i < violations.length - 1 ? "0.5px solid var(--surface-hover)" : undefined }}
              >
                <div className="mt-0.5 shrink-0">
                  <SeverityBadge severity={v.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-[var(--text-primary)]">{v.message}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                    <span className="font-mono">{model?.name ?? v.modelId}</span>
                    {v.columnName && <span className="font-mono">.{v.columnName}</span>}
                    <span>{v.ruleId}</span>
                  </div>
                  {v.suggestion && (
                    <div className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      Suggestion: {v.suggestion}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Governance rules summary */}
      {graph.governanceRules && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "0.5px solid var(--border)",
          }}
        >
          <h3 className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">Active Rules</h3>
          <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {graph.governanceRules.naming && <span className="rounded-md px-2 py-1" style={{ background: "var(--surface-hover)" }}>Naming conventions</span>}
            {graph.governanceRules.columnRequirements && <span className="rounded-md px-2 py-1" style={{ background: "var(--surface-hover)" }}>Column requirements</span>}
            {graph.governanceRules.dataTypes && <span className="rounded-md px-2 py-1" style={{ background: "var(--surface-hover)" }}>Data type rules</span>}
            {graph.governanceRules.layerPlacement && <span className="rounded-md px-2 py-1" style={{ background: "var(--surface-hover)" }}>Layer placement</span>}
          </div>
        </div>
      )}
    </div>
  );
}
