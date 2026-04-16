# datacarta-connectors

Open-source **connector SDK** for turning local files and (eventually) warehouse metadata into a **Datacarta context graph** compatible with `datacarta-spec`.

## What ships today

| Connector | Status | Notes |
|-----------|--------|-------|
| **mock** | Implemented | Loads the Harmonic Audio sample graph from `datacarta-spec`. |
| **file** | Implemented | Reads any spec-compliant JSON graph (`options.filePath`). |
| **dbt** | Stub | Throws with guidance — implement manifest/catalog mapping next. |
| **snowflake** | Stub | Throws — implement metadata queries + credential model next. |
| **databricks** | Stub | Throws — implement Unity Catalog mapping next. |

## Install

From the repo root (sibling `datacarta-spec` must exist or use published package):

```bash
cd datacarta-connectors
npm install
npm run build
```

## API

```typescript
import { mockConnector, fileConnector, listConnectors } from "datacarta-connectors";

const { graph, provenance } = await mockConnector.run({ workspacePath: process.cwd() });

const imported = await fileConnector.run(
  { workspacePath: process.cwd() },
  { filePath: "/absolute/path/graph.json" }
);

console.log(listConnectors().map((c) => c.id));
```

## Design principles

- Connectors **validate** output with `assertValidGraph` from `datacarta-spec`.
- Keep **provenance** strings for desktop/API audit trails.
- Vendor connectors that need secrets belong in **hosted** layers; OSS stubs document the seam.

## Roadmap

- Real **dbt** manifest → graph mapper with tests against golden fixtures.
- Warehouse scanners with **read-only** metadata queries.
- Optional streaming / incremental graph merges.

## License

MIT
