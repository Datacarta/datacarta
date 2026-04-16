export function SettingsView(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-2">
      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="text-sm font-semibold text-slate-100">Local-first storage</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          This MVP stores projects under the Electron app <span className="font-mono text-slate-200">userData</span> directory.
          Nothing leaves your machine unless you export JSON explicitly.
        </p>
      </div>
      <div className="rounded-xl border border-canvas-border bg-slate-950/30 p-5">
        <div className="text-sm font-semibold text-slate-100">Telemetry</div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">None. This build does not phone home.</p>
      </div>
    </div>
  );
}
