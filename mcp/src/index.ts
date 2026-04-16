#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  assertValidGraph,
  buildContextPackage,
  buildFullStructuredContext,
  type DatacartaGraph,
} from "datacarta-spec";

function loadGraphFromArgs(): DatacartaGraph {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: datacarta-mcp <path-to-graph.json>");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return assertValidGraph(raw);
}

const graph = loadGraphFromArgs();

const server = new Server(
  { name: "datacarta-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "datacarta_search_nodes",
      description: "Search nodes by substring across name, displayName, id, tags, and type.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 25 },
        },
        required: ["query"],
      },
    },
    {
      name: "datacarta_get_node",
      description: "Fetch a node by id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "datacarta_neighbors",
      description: "Return upstream and downstream edges for a node id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "datacarta_export_context_package",
      description: "Deterministic compact context package JSON for LLM prompts.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "datacarta_export_full_graph",
      description: "Full structured graph JSON snapshot.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;

  if (name === "datacarta_search_nodes") {
    const query = String(args.query ?? "").toLowerCase();
    const limit = typeof args.limit === "number" ? args.limit : 25;
    const hits = graph.nodes
      .filter((n) => {
        const hay = `${n.name} ${n.displayName ?? ""} ${n.id} ${n.type} ${(n.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, limit);
    return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
  }

  if (name === "datacarta_get_node") {
    const id = String(args.id ?? "");
    const node = graph.nodes.find((n) => n.id === id);
    return { content: [{ type: "text", text: JSON.stringify(node ?? null, null, 2) }] };
  }

  if (name === "datacarta_neighbors") {
    const id = String(args.id ?? "");
    const upstream = graph.edges.filter((e) => e.targetId === id);
    const downstream = graph.edges.filter((e) => e.sourceId === id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ upstream, downstream }, null, 2),
        },
      ],
    };
  }

  if (name === "datacarta_export_context_package") {
    const pkg = buildContextPackage(graph);
    return { content: [{ type: "text", text: JSON.stringify(pkg, null, 2) }] };
  }

  if (name === "datacarta_export_full_graph") {
    const full = buildFullStructuredContext(graph);
    return { content: [{ type: "text", text: JSON.stringify(full, null, 2) }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main();
