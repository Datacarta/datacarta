# datacarta-spec

Canonical **Datacarta context graph** specification: strongly typed TypeScript models, JSON Schema (draft-07), validation helpers, deterministic **AI context packaging** utilities, and sample data.

This package is the contract between:

- the open-source **desktop** app and **MCP** server,
- **connectors** that emit graphs,
- and the hosted **cloud** + **API** products.

## What lives here

| Path | Purpose |
|------|---------|
| `src/types.ts` | Node types, edge types, enums, `DatacartaGraph`. |
| `src/validate.ts` | `validateDatacartaGraph`, `assertValidGraph` (Ajv + JSON Schema). |
| `src/context-package.ts` | Deterministic projections: compact package, summaries, warnings, join hints. |
| `schema/datacarta-graph.schema.json` | JSON Schema for graph documents. |
| `samples/harmonic-audio.sample.json` | Demo graph for a fictional company (**Harmonic Audio**). |

## Optional `metadata` (modeling & warehouse)

The schema treats `metadata` as an open object. **Datacarta Desktop** understands a few optional keys for richer UX (documentation-first; not validated by JSON Schema yet):

- `starSchemaRole`: `dimension` \| `fact` \| `bridge` \| `staging` \| `unknown`
- `dataVaultRole`: `hub` \| `link` \| `satellite` \| `none`
- `scdType`: e.g. `0`, `1`, `2`, `none` (Kimball SCD intent for dimensions)
- `physical`: `{ warehouse?, database?, schema?, relation? }` (fully qualified table / view name)
- `columns`: `[{ name, physicalType?, description?, keys? }]` (lightweight catalog)

See `samples/harmonic-audio.sample.json` for populated examples.

## Node types

`source_system`, `raw_table`, `staged_model`, `intermediate_model`, `mart_model`, `metric`, `dashboard`, `event_definition`, `entity`, `dimension`, `owner`, `team`

## Edge types

`upstream_of`, `feeds`, `defines`, `owned_by`, `documented_by`, `powers`, `maps_to`, `depends_on`, `joins_with`

## Enums

- **trustLevel:** `unknown` \| `draft` \| `reviewed` \| `trusted` \| `deprecated`
- **status:** `active` \| `draft` \| `deprecated`
- **grain:** free-form string (see `GRAIN_EXAMPLES` in `types.ts`)

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

Outputs CommonJS-compatible ESM in `dist/`.

## Validate the sample graph

```bash
npm run build && npm run validate-sample
```

## Usage (TypeScript)

### Node services (filesystem schema loading)

```typescript
import { readFileSync } from "node:fs";
import {
  validateDatacartaGraph,
  buildContextPackage,
  buildFullStructuredContext,
} from "datacarta-spec";

const graph = JSON.parse(readFileSync("graph.json", "utf8"));
const { ok, errors } = validateDatacartaGraph(graph);
if (!ok) throw new Error(errors.join("\n"));

const pkg = buildContextPackage(graph);
const full = buildFullStructuredContext(graph);
```

### Browsers / Vite renderers (no Node `fs` in validator)

Use the browser entrypoint that bundles JSON Schema directly:

```typescript
import { validateDatacartaGraph, buildContextPackage } from "datacarta-spec/client";
```

## Spec versioning

`DatacartaGraph.specVersion` uses SemVer strings matching `0.x.y` (enforced by JSON Schema pattern). Bump when breaking schema expectations.

## Roadmap

- Optional Zod mirror for ergonomic runtime parsing
- JSON Schema 2020-12 upgrade once all consumers support it uniformly
- Published npm scope `@datacarta/spec`

## License

MIT
