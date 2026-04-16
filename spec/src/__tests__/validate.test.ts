import { describe, it, expect } from "vitest";
import { validateDatacartaGraph } from "../validate.js";
import type { DatacartaGraph } from "../types.js";

function minimalGraph(): DatacartaGraph {
  return {
    specVersion: "0.2.0",
    projectId: "test-project",
    projectName: "Test Project",
    layerDefinitions: [
      { id: "raw", name: "Raw", type: "raw", order: 0 },
    ],
    models: [],
    edges: [],
    metrics: [],
    dataMarts: [],
    blueprints: [],
    owners: [],
    teams: [],
  };
}

describe("validateDatacartaGraph", () => {
  it("accepts a minimal valid graph", () => {
    const result = validateDatacartaGraph(minimalGraph());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects null", () => {
    const result = validateDatacartaGraph(null);
    expect(result.ok).toBe(false);
  });

  it("rejects missing specVersion", () => {
    const g = minimalGraph();
    delete (g as any).specVersion;
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(false);
  });

  it("rejects missing layerDefinitions", () => {
    const g = minimalGraph();
    delete (g as any).layerDefinitions;
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(false);
  });

  it("accepts a graph with a model and columns", () => {
    const g = minimalGraph();
    g.models = [
      {
        id: "m1",
        layerId: "raw",
        name: "raw_events",
        columns: [
          { id: "c1", name: "event_id", dataType: "varchar(64)", isPrimaryKey: true },
        ],
        trustLevel: "reviewed",
        status: "active",
      },
    ];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(true);
  });

  it("rejects a model missing required fields", () => {
    const g = minimalGraph();
    g.models = [{ id: "m1" } as any];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(false);
  });

  it("accepts a graph with metrics", () => {
    const g = minimalGraph();
    g.metrics = [
      {
        id: "met1",
        name: "waf",
        displayName: "Weekly Active Fans",
        description: "Count of fans with listening activity",
        sourceModelIds: [],
        domain: "growth",
        trustLevel: "trusted",
        status: "active",
      },
    ];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(true);
  });

  it("accepts a graph with data marts and join paths", () => {
    const g = minimalGraph();
    g.dataMarts = [
      {
        id: "dm1",
        name: "Growth",
        description: "Growth analytics mart",
        domain: "growth",
        factModelIds: [],
        dimensionModelIds: [],
        metricIds: [],
        joinPaths: [
          {
            fromModelId: "fct_1",
            toModelId: "dim_1",
            joinKeys: [{ fromColumn: "artist_sk", toColumn: "artist_sk" }],
            joinType: "left",
          },
        ],
      },
    ];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(true);
  });

  it("accepts a graph with blueprints", () => {
    const g = minimalGraph();
    g.blueprints = [
      {
        id: "bp1",
        name: "fct_sessions",
        layerId: "raw",
        columns: [],
        grain: "session_id",
        sourceRefs: [],
        status: "drafting",
        createdAt: "2026-04-15T00:00:00Z",
        updatedAt: "2026-04-15T00:00:00Z",
      },
    ];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid edge type", () => {
    const g = minimalGraph();
    g.edges = [
      { id: "e1", type: "invalid_type" as any, sourceId: "a", targetId: "b" },
    ];
    const result = validateDatacartaGraph(g);
    expect(result.ok).toBe(false);
  });
});
