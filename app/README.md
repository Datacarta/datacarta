# datacarta-desktop

Local-first **Electron** application for importing, exploring, and exporting a company’s **Datacarta context graph**. Pair with [`datacarta-spec`](../datacarta-spec) for the canonical schema and [`datacarta-mcp`](../datacarta-mcp) for AI tool access.

## What Datacarta is

Datacarta is a **context layer for company data**: it maps how analytics is actually built — sources, tables, dbt-style model tiers, metrics, dashboards, lineage, ownership, grain, trust, and documentation — into a single graph humans and AI can navigate.

## What this desktop app does

- Visualizes the graph with **React Flow** (`@xyflow/react`)
- Supports **filters**, **search**, and rich **node inspection** (lineage, trust, grain, owners, caveats, **column lists**, **physical relation**, **Kimball-style roles + SCD hints** via open `metadata` conventions)
- Imports **sample** and **spec-compliant JSON** graphs
- Saves **local projects** (`*.dcproj.json` v2) under Electron `userData`: canonical graph plus optional **blueprints**
- Exports **full** and **compact AI context packages** (deterministic JSON)

## Features (MVP)

- Desktop shell with sidebar: Projects, Graph, Nodes, **Blueprints**, Imports, Context Export, Settings
- Graph canvas with type filters + search; nodes show a **modeling headline** when metadata is present
- **Nodes** directory: split view — pick a row and read the full inspector **without** jumping to the graph (`On graph` is optional)
- Import flows: Harmonic Audio sample, arbitrary graph JSON, connector **stubs** (dbt / Snowflake / Databricks)
- Context export: full graph JSON + summarized context package JSON
- Seed workspace: auto-loads Harmonic Audio when `datacarta-spec` is present as a sibling directory

## Tech stack

- Electron + **electron-vite**
- React + TypeScript + Vite
- Tailwind CSS
- Zustand
- `@xyflow/react`
- `datacarta-spec/client` (browser-safe validation + packaging)

## Prerequisites

- Node.js 20+
- macOS / Windows / Linux (Electron targets)

For the bundled sample auto-import, keep this monorepo layout:

```
datacarta/
  datacarta-desktop/
  datacarta-spec/
```

## Install

```bash
cd datacarta-desktop
npm install
```

## Local development

```bash
npm run dev
```

This launches the Electron shell with Vite HMR for the renderer.

## Build (compile)

```bash
npm run build
```

## Build executable

```bash
npm run dist
```

Artifacts land under `release/` (platform-specific installers/images depending on your OS).

> Packaging requires code signing configuration for production distribution; the default config is a sane starting point.

## How to use

1. Open the app — the **Harmonic Audio** sample loads automatically when the spec sample file is discoverable.
2. Use **Graph** to pan/zoom, click nodes, and inspect lineage in the right panel.
3. Use **Nodes** for a searchable directory view.
4. Use **Projects** to save/load `*.dcproj.json` files locally.
5. Use **Context Export** to write JSON files for LLM grounding.

## Importing sample data

- **Automatic:** sibling path `../datacarta-spec/samples/harmonic-audio.sample.json`
- **Manual:** `Imports → Choose JSON file…` (any `datacarta-spec`-compliant graph)

## Exporting AI context packages

`Context Export` writes:

- **Full structured graph JSON** — identical fidelity to the in-memory graph.
- **Compact context package JSON** — deterministic bundle (trusted datasets, metrics, warnings, join hints, deprecations, etc.) produced by `buildContextPackage` in `datacarta-spec`.

## Roadmap

- Real IPC-hardening for untrusted JSON imports
- Connector runtime in `main` using `datacarta-connectors`
- Optional plugin SDK for custom layout algorithms
- Cross-repo published `@datacarta/spec` consumption

## Contributing

Issues and PRs welcome in the future Datacarta org. Keep changes aligned with `datacarta-spec` and add fixtures whenever schema behavior changes.

## License

MIT
