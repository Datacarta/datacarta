export function SettingsView(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Local-first storage</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          This app stores projects under the Electron <span className="font-mono text-[var(--text-secondary)]">userData</span> directory.
          Nothing leaves your machine unless you export JSON explicitly.
        </p>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">Telemetry</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          None. This build does not phone home.
        </p>
      </div>
    </div>
  );
}
