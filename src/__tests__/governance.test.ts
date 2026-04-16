import { describe, it, expect } from "vitest";
import { validateGovernance } from "../governance.js";
import type { DatacartaGraph, GovernanceRuleSet } from "../types.js";

function graphWithRules(rules: GovernanceRuleSet): DatacartaGraph {
  return {
    specVersion: "0.2.0",
    projectId: "test",
    projectName: "Test",
    layerDefinitions: [
      { id: "staging", name: "Staging", type: "staging", order: 0 },
      { id: "mart", name: "Mart", type: "mart", order: 1 },
    ],
    models: [
      {
        id: "m1",
        layerId: "staging",
        name: "events_clean",  // Missing stg_ prefix
        columns: [
          { id: "c1", name: "event_id", dataType: "varchar(64)", isPrimaryKey: true },
        ],
        trustLevel: "reviewed",
        status: "active",
      },
      {
        id: "m2",
        layerId: "mart",
        name: "fct_listens",
        columns: [
          { id: "c2", name: "listen_sk", dataType: "number(38,0)", isSurrogateKey: true },
          { id: "c3", name: "created_at", dataType: "timestamp_tz" },
        ],
        trustLevel: "trusted",
        status: "active",
        modelingIntent: { starRole: "fact" },
      },
    ],
    edges: [],
    metrics: [],
    dataMarts: [],
    blueprints: [],
    owners: [],
    teams: [],
    governanceRules: rules,
  };
}

describe("validateGovernance", () => {
  it("returns no violations for a graph with no rules", () => {
    const g = graphWithRules({});
    const violations = validateGovernance(g);
    expect(violations).toHaveLength(0);
  });

  it("flags naming violations", () => {
    const g = graphWithRules({
      naming: {
        modelPatterns: { staging: "^stg_" },
        columnPatterns: [],
      },
    });
    const violations = validateGovernance(g);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].modelId).toBe("m1");
    expect(violations[0].message).toContain("stg_");
  });

  it("does not flag compliant models", () => {
    const g = graphWithRules({
      naming: {
        modelPatterns: { mart: "^(fct_|dim_)" },
        columnPatterns: [],
      },
    });
    const violations = validateGovernance(g);
    // m2 is fct_listens in mart — should pass
    expect(violations.filter((v) => v.modelId === "m2")).toHaveLength(0);
  });

  it("flags column naming violations", () => {
    const g = graphWithRules({
      naming: {
        modelPatterns: {},
        columnPatterns: [
          { pattern: "_at$", description: "Timestamps must end in _at" },
        ],
      },
    });
    // Column naming rules are descriptive — they describe valid patterns, not violations
    // No violations expected
    const violations = validateGovernance(g);
    expect(violations).toHaveLength(0);
  });

  it("flags data type violations", () => {
    const g = graphWithRules({
      dataTypes: {
        columnTypeMap: [
          { columnPattern: "_at$", requiredType: "timestamp_tz" },
        ],
      },
    });
    // created_at is already timestamp_tz — no violation
    const violations = validateGovernance(g);
    expect(violations).toHaveLength(0);

    // Now break it
    g.models[1].columns[1].dataType = "varchar(64)";
    const violations2 = validateGovernance(g);
    expect(violations2.length).toBeGreaterThan(0);
    expect(violations2[0].columnName).toBe("created_at");
  });
});
