import { describe, it, expect } from "vitest";
import { buildContextPackage, buildFullStructuredContext } from "../context-package.js";
import type { DatacartaGraph } from "../types.js";

function sampleGraph(): DatacartaGraph {
  return {
    specVersion: "0.2.0",
    projectId: "test",
    projectName: "Test Project",
    domains: ["growth"],
    layerDefinitions: [
      { id: "source", name: "Sources", type: "source", order: 0 },
      { id: "raw", name: "Raw", type: "raw", order: 1 },
      { id: "mart", name: "Mart", type: "mart", order: 4, domains: ["growth"] },
    ],
    models: [
      {
        id: "src-1",
        layerId: "source",
        name: "snowplow",
        displayName: "Snowplow",
        columns: [],
        trustLevel: "trusted",
        status: "active",
        sourceClassification: {
          origin: "frontend",
          ingestionMethod: "event_stream",
        },
      },
      {
        id: "m1",
        layerId: "mart",
        domain: "growth",
        name: "fct_listens",
        displayName: "Listening Facts",
        columns: [
          { id: "c1", name: "listen_sk", dataType: "number(38,0)", isPrimaryKey: true, isSurrogateKey: true },
          { id: "c2", name: "user_id", dataType: "varchar(64)" },
        ],
        grain: "listen_event",
        trustLevel: "trusted",
        status: "active",
        modelingIntent: { starRole: "fact" },
      },
      {
        id: "m-dep",
        layerId: "mart",
        name: "legacy_listens",
        columns: [],
        trustLevel: "deprecated",
        status: "deprecated",
      },
    ],
    edges: [
      { id: "e1", type: "depends_on", sourceId: "src-1", targetId: "m1" },
    ],
    metrics: [
      {
        id: "met1",
        name: "waf",
        displayName: "Weekly Active Fans",
        description: "Count of fans with listening",
        sourceModelIds: ["m1"],
        domain: "growth",
        isKPI: true,
        trustLevel: "trusted",
        status: "active",
      },
    ],
    dataMarts: [],
    blueprints: [],
    owners: [],
    teams: [],
  };
}

describe("buildContextPackage", () => {
  it("returns a context package with project info", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.specVersion).toBe("0.2.0");
    expect(pkg.projectId).toBe("test");
    expect(pkg.projectName).toBe("Test Project");
    expect(pkg.domains).toEqual(["growth"]);
  });

  it("includes layer summary", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.layerSummary).toBeDefined();
    expect(pkg.layerSummary).toHaveLength(3);
    expect(pkg.layerSummary[0].layerId).toBe("source");
    expect(pkg.layerSummary[0].modelCount).toBe(1);
  });

  it("includes trusted models", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.trustedModels.length).toBeGreaterThanOrEqual(1);
    expect(pkg.trustedModels.find((m) => m.id === "m1")).toBeDefined();
  });

  it("includes metric registry", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.metricRegistry).toHaveLength(1);
    expect(pkg.metricRegistry[0].name).toBe("Weekly Active Fans");
    expect(pkg.metricRegistry[0].isKPI).toBe(true);
  });

  it("includes deprecated assets", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.deprecatedAssets).toHaveLength(1);
    expect(pkg.deprecatedAssets[0].id).toBe("m-dep");
  });

  it("includes warnings for low trust models", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.deprecatedAssets.some((a) => a.id === "m-dep")).toBe(true);
  });

  it("generates a compact summary string", () => {
    const pkg = buildContextPackage(sampleGraph());
    expect(pkg.compactSummary).toContain("Test Project");
    expect(pkg.compactSummary).toContain("growth");
  });
});

describe("buildFullStructuredContext", () => {
  it("returns a deep clone of the graph", () => {
    const g = sampleGraph();
    const clone = buildFullStructuredContext(g);
    expect(clone).toEqual(g);
    expect(clone).not.toBe(g);
    expect(clone.models).not.toBe(g.models);
  });
});
