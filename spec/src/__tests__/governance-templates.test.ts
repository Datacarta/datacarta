import { describe, it, expect } from "vitest";
import { getTemplate, listTemplates } from "../governance-templates.js";

describe("governance templates", () => {
  it("lists available templates", () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.map((t) => t.id)).toContain("kimball");
    expect(templates.map((t) => t.id)).toContain("activity-schema");
    expect(templates.map((t) => t.id)).toContain("one-big-table");
    expect(templates.map((t) => t.id)).toContain("data-vault");
  });

  it("returns a template by ID", () => {
    const t = getTemplate("kimball");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Kimball");
  });

  it("kimball template has standard layers", () => {
    const t = getTemplate("kimball")!;
    expect(t.defaultLayers.length).toBeGreaterThanOrEqual(5);
    const layerTypes = t.defaultLayers.map((l) => l.type);
    expect(layerTypes).toContain("source");
    expect(layerTypes).toContain("staging");
    expect(layerTypes).toContain("mart");
  });

  it("kimball template has naming rules", () => {
    const t = getTemplate("kimball")!;
    expect(t.rules.naming).toBeDefined();
    expect(t.rules.naming!.modelPatterns.staging).toBe("^stg_");
    expect(t.rules.naming!.modelPatterns.mart).toContain("fct_");
  });

  it("returns undefined for unknown template", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});
