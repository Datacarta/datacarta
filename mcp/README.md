# datacarta-mcp

A **Model Context Protocol** (stdio) server that exposes a **read-only** toolkit over a local Datacarta graph JSON file.

This is designed for engineers who want AI assistants (Cursor, Claude Desktop, etc.) to query lineage, ownership, trust, and export **deterministic** context packages — without calling LLMs inside the server.

## Prerequisites

- Node.js 20+
- A `datacarta-spec`-compliant graph JSON (for example `datacarta-spec/samples/harmonic-audio.sample.json`)

## Install / build

```bash
cd datacarta-mcp
npm install
npm run build
```

## Run

```bash
node dist/index.js ../datacarta-spec/samples/harmonic-audio.sample.json
```

Or after linking the bin:

```bash
datacarta-mcp ../datacarta-spec/samples/harmonic-audio.sample.json
```

## Tools

| Tool | Purpose |
|------|---------|
| `datacarta_search_nodes` | Substring search across common fields. |
| `datacarta_get_node` | Fetch a node by id. |
| `datacarta_neighbors` | Upstream/downstream edges for a node. |
| `datacarta_export_context_package` | Compact deterministic bundle (metrics, trusted datasets, warnings, join hints, …). |
| `datacarta_export_full_graph` | Full graph JSON snapshot. |

## Cursor / MCP wiring (example)

Configure your MCP client to launch this process with an absolute path to your graph file. The server communicates over **stdio** only.

> **Security:** treat graph files like code — they can contain large `metadata` blobs. This server does not execute SQL from metadata.

## Roadmap

- Tool: `datacarta_query_by_type`
- Optional HTTP transport for hosted delivery
- Streaming large graphs

## License

MIT
