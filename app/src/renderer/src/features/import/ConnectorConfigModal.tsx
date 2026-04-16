import { useEffect, useState } from "react";
import type { ConnectorPreset } from "../../lib/connector-presets";

/**
 * Modal for collecting connector configuration (host, schema, tables, token, …)
 * and invoking the preset generator to ingest into the graph.
 *
 * Presets can run real network work in their async generate(), so the modal
 * owns a loading state and surfaces errors inline rather than alerting.
 * Credentials never leave this component's state — closing the modal drops
 * them.
 */
export function ConnectorConfigModal({
  preset,
  onCancel,
  onIngest,
}: {
  preset: ConnectorPreset;
  onCancel: () => void;
  onIngest: (config: Record<string, string>) => Promise<void>;
}): JSX.Element {
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of preset.fields) init[f.key] = f.default ?? "";
    return init;
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when switching between presets.
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const f of preset.fields) init[f.key] = f.default ?? "";
    setConfig(init);
    setTouched(false);
    setBusy(false);
    setError(null);
  }, [preset]);

  const missing = preset.fields.filter((f) => f.required && !(config[f.key] ?? "").trim());
  const canSubmit = missing.length === 0 && !busy;

  async function submit() {
    setTouched(true);
    if (missing.length > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onIngest(config);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
    // On success onIngest closes the modal — no need to clear busy.
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl"
        style={{
          background: "var(--bg-elevated)",
          border: "0.5px solid var(--border-strong)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      >
        <header
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "0.5px solid var(--border)" }}
        >
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Connect to {preset.title}
            </h2>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {preset.blurb}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1 transition-colors disabled:opacity-40"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-3 p-5">
          {preset.fields.map((field) => {
            const value = config[field.key] ?? "";
            const showError = touched && field.required && !value.trim();
            const sharedStyle = {
              background: "var(--surface-hover)",
              border: showError ? "0.5px solid #FF453A" : "0.5px solid var(--border)",
              color: "var(--text-primary)",
            } as const;
            return (
              <div key={field.key}>
                <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  {field.label}
                  {field.required && <span style={{ color: "#FF453A" }}> *</span>}
                </label>
                {field.kind === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={3}
                    disabled={busy}
                    className="w-full resize-none rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
                    style={sharedStyle}
                  />
                ) : (
                  <input
                    type={field.kind === "password" ? "password" : "text"}
                    autoComplete={field.kind === "password" ? "off" : undefined}
                    spellCheck={field.kind === "password" ? false : undefined}
                    value={value}
                    onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={busy}
                    className="w-full rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
                    style={sharedStyle}
                  />
                )}
                {field.help && (
                  <div className="mt-1 text-[10px]" style={{ color: "var(--text-quaternary)" }}>
                    {field.help}
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-[11px]"
              style={{
                background: "rgba(255,69,58,0.08)",
                border: "0.5px solid rgba(255,69,58,0.4)",
                color: "#FF453A",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <footer
          className="flex items-center justify-between p-5"
          style={{ borderTop: "0.5px solid var(--border)", background: "var(--bg-card)" }}
        >
          <div className="text-[10px]" style={{ color: "var(--text-quaternary)" }}>
            Credentials stay on your machine. Token is used only for this introspection call and is not persisted.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40"
              style={{
                background: "var(--surface-hover)",
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              {busy ? "Importing…" : "Ingest"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
