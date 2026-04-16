export function SettingsView(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-2">
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-white">Local-first storage</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          This app stores projects under the Electron <span className="font-mono text-white/60">userData</span> directory.
          Nothing leaves your machine unless you export JSON explicitly.
        </p>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="text-[13px] font-semibold text-white">Telemetry</div>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
          None. This build does not phone home.
        </p>
      </div>
    </div>
  );
}
