import { describe, it, expect } from "vitest";
import {
  LAYER_TYPES,
  EDGE_TYPES,
  TRUST_LEVELS,
  STATUSES,
  LOGICAL_TYPES,
  SOURCE_ORIGINS,
  INGESTION_METHODS,
  STAR_ROLES,
  BLUEPRINT_STATUSES,
  type LayerType,
  type DatacartaGraph,
  type Model,
  type Column,
  type LayerDefinition,
} from "../types.js";

describe("type constants", () => {
  it("exports LAYER_TYPES with 7 values", () => {
    expect(LAYER_TYPES).toHaveLength(7);
    expect(LAYER_TYPES).toContain("source");
    expect(LAYER_TYPES).toContain("raw");
    expect(LAYER_TYPES).toContain("staging");
    expect(LAYER_TYPES).toContain("intermediate");
    expect(LAYER_TYPES).toContain("mart");
    expect(LAYER_TYPES).toContain("semantic");
    expect(LAYER_TYPES).toContain("consumption");
  });

  it("exports EDGE_TYPES with 5 values", () => {
    expect(EDGE_TYPES).toHaveLength(5);
    expect(EDGE_TYPES).toContain("depends_on");
    expect(EDGE_TYPES).toContain("defines");
    expect(EDGE_TYPES).toContain("powers");
    expect(EDGE_TYPES).toContain("maps_to");
    expect(EDGE_TYPES).toContain("joins_with");
  });

  it("exports TRUST_LEVELS", () => {
    expect(TRUST_LEVELS).toContain("unknown");
    expect(TRUST_LEVELS).toContain("trusted");
    expect(TRUST_LEVELS).toContain("deprecated");
  });

  it("exports STATUSES", () => {
    expect(STATUSES).toContain("active");
    expect(STATUSES).toContain("draft");
    expect(STATUSES).toContain("deprecated");
  });

  it("exports LOGICAL_TYPES", () => {
    expect(LOGICAL_TYPES).toContain("string");
    expect(LOGICAL_TYPES).toContain("timestamp");
  });

  it("exports SOURCE_ORIGINS", () => {
    expect(SOURCE_ORIGINS).toContain("frontend");
    expect(SOURCE_ORIGINS).toContain("backend");
    expect(SOURCE_ORIGINS).toContain("third_party");
  });

  it("exports INGESTION_METHODS", () => {
    expect(INGESTION_METHODS).toContain("event_stream");
    expect(INGESTION_METHODS).toContain("cdc");
  });

  it("exports STAR_ROLES", () => {
    expect(STAR_ROLES).toContain("fact");
    expect(STAR_ROLES).toContain("dimension");
  });

  it("exports BLUEPRINT_STATUSES", () => {
    expect(BLUEPRINT_STATUSES).toContain("idea");
    expect(BLUEPRINT_STATUSES).toContain("shipped");
  });
});
