import { useEffect, useRef, useState } from "react";

const DIALECTS = ["ansi", "snowflake", "databricks", "bigquery", "postgres", "duckdb"] as const;

/**
 * Collapsible SQL editor. Starts collapsed when there's no SQL yet (so the
 * card footprint stays small) and auto-expands when content is present or
 * the user explicitly opens it. Commits on blur to avoid flooding the store
 * with per-keystroke updates.
 */
export function SqlEditor({
  sql,
  dialect,
  onChange,
  placeholder = "-- SELECT … FROM … WHERE …",
}: {
  sql: string | undefined;
  dialect: string | undefined;
  onChange: (patch: { sql?: string; sqlDialect?: string }) => void;
  placeholder?: string;
}) {
  const [expanded, setExpanded] = useState(Boolean(sql && sql.length > 0));
  const [draft, setDraft] = useState(sql ?? "");
  const [draftDialect, setDraftDialect] = useState(dialect ?? "ansi");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep local draft in sync when the model underneath changes (e.g.,
  // switching between models in the detail view).
  useEffect(() => {
    setDraft(sql ?? "");
    setDraftDialect(dialect ?? "ansi");
  }, [sql, dialect]);

  function commit() {
    const trimmed = draft.trim();
    const nextSql = trimmed.length > 0 ? draft : undefined;
    // Skip no-op writes.
    if (nextSql === sql && draftDialect === (dialect ?? "ansi")) return;
    onChange({ sql: nextSql, sqlDialect: trimmed.length > 0 ? draftDialect : undefined });
  }

  const lineCount = draft ? draft.split("\n").length : 0;

  return (
    <div
      className="mt-4 rounded-xl"
      style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-3 w-3 transition-transform"
            style={{ color: "var(--text-tertiary)", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            SQL
          </h3>
          {sql ? (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(48,209,88,0.15)", color: "#30D158" }}>
              {lineCount} line{lineCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
              not set
            </span>
          )}
        </div>
        {dialect && (
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ background: "var(--surface-hover)", color: "var(--text-tertiary)" }}>
            {dialect}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
              Dialect
            </label>
            <select
              value={draftDialect}
              onChange={(e) => setDraftDialect(e.target.value)}
              onBlur={commit}
              className="rounded px-1.5 py-0.5 font-mono text-[11px] focus:outline-none"
              style={{
                background: "var(--bg-canvas)",
                border: "0.5px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {DIALECTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="ml-auto text-[10px]" style={{ color: "var(--text-quaternary)" }}>
              Saves on blur
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            placeholder={placeholder}
            spellCheck={false}
            rows={Math.min(Math.max(lineCount || 6, 6), 24)}
            className="w-full resize-y rounded-md px-3 py-2 font-mono text-[12px] leading-[1.5] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            style={{
              background: "var(--bg-canvas)",
              border: "0.5px solid var(--border)",
              color: "var(--text-primary)",
              tabSize: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}
