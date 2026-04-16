import type { GovernanceTemplate } from "./types.js";

const TEMPLATES: GovernanceTemplate[] = [
  {
    id: "kimball",
    name: "Kimball",
    description:
      "Kimball Dimensional Modeling — star schemas with fact and dimension tables organized into staging, intermediate, and mart layers.",
    defaultLayers: [
      { id: "kimball-source", name: "Source", type: "source", order: 0 },
      { id: "kimball-raw", name: "Raw", type: "raw", order: 1 },
      { id: "kimball-staging", name: "Staging", type: "staging", order: 2 },
      { id: "kimball-intermediate", name: "Intermediate", type: "intermediate", order: 3 },
      { id: "kimball-mart", name: "Mart", type: "mart", order: 4 },
      { id: "kimball-semantic", name: "Semantic", type: "semantic", order: 5 },
      { id: "kimball-consumption", name: "Consumption", type: "consumption", order: 6 },
    ],
    rules: {
      naming: {
        modelPatterns: {
          staging: "^stg_",
          intermediate: "^int_",
          mart: "^(fct_|dim_)",
        },
        columnPatterns: [
          { pattern: "_at$", description: "Timestamp columns should end with _at" },
          { pattern: "_id$", description: "Foreign key columns should end with _id" },
          { pattern: "_key$", description: "Surrogate key columns should end with _key" },
        ],
      },
      layerPlacement: {
        allowedTransforms: {
          staging: ["cast", "rename", "filter"],
          intermediate: ["aggregate", "window", "expression"],
          mart: ["aggregate", "window", "expression", "filter"],
        },
        noBusinessLogicIn: ["source", "raw", "staging"],
        noRawJoinsIn: ["mart", "semantic", "consumption"],
      },
      columnRequirements: {
        requiredColumns: {
          mart: [
            {
              role: "surrogate_key",
              pattern: "_key$",
              when: { field: "modelingIntent.starRole", operator: "eq", value: "fact" },
            },
          ],
        },
      },
    },
  },
  {
    id: "activity-schema",
    name: "Activity Schema",
    description:
      "Activity Schema — a single activity stream table per entity, with activities modeled as rows.",
    defaultLayers: [
      { id: "as-source", name: "Source", type: "source", order: 0 },
      { id: "as-raw", name: "Raw", type: "raw", order: 1 },
      { id: "as-staging", name: "Staging", type: "staging", order: 2 },
      { id: "as-mart", name: "Activity", type: "mart", order: 3 },
      { id: "as-consumption", name: "Consumption", type: "consumption", order: 4 },
    ],
    rules: {
      naming: {
        modelPatterns: {
          staging: "^stg_",
          mart: "^activity_",
        },
        columnPatterns: [
          { pattern: "_at$", description: "Timestamp columns should end with _at" },
        ],
      },
      layerPlacement: {
        allowedTransforms: {
          staging: ["cast", "rename", "filter"],
          mart: ["aggregate", "expression", "filter"],
        },
        noBusinessLogicIn: ["source", "raw"],
        noRawJoinsIn: ["mart", "consumption"],
      },
      columnRequirements: {
        requiredColumns: {},
      },
    },
  },
  {
    id: "one-big-table",
    name: "One Big Table",
    description:
      "One Big Table — a wide, denormalized table approach with minimal layers and relaxed naming conventions.",
    defaultLayers: [
      { id: "obt-source", name: "Source", type: "source", order: 0 },
      { id: "obt-raw", name: "Raw", type: "raw", order: 1 },
      { id: "obt-staging", name: "Staging", type: "staging", order: 2 },
      { id: "obt-mart", name: "Mart", type: "mart", order: 3 },
      { id: "obt-consumption", name: "Consumption", type: "consumption", order: 4 },
    ],
    rules: {
      naming: {
        modelPatterns: {},
        columnPatterns: [],
      },
      layerPlacement: {
        allowedTransforms: {
          staging: ["cast", "rename", "filter"],
          mart: ["aggregate", "window", "expression", "filter"],
        },
        noBusinessLogicIn: ["source", "raw"],
        noRawJoinsIn: ["consumption"],
      },
      columnRequirements: {
        requiredColumns: {},
      },
    },
  },
  {
    id: "data-vault",
    name: "Data Vault 2.0",
    description:
      "Data Vault 2.0 — hubs, links, and satellites in the vault layer; point-in-time and bridge tables in the business vault.",
    defaultLayers: [
      { id: "dv-source", name: "Source", type: "source", order: 0 },
      { id: "dv-raw", name: "Raw", type: "raw", order: 1 },
      { id: "dv-staging", name: "Staging", type: "staging", order: 2 },
      { id: "dv-intermediate", name: "Vault", type: "intermediate", order: 3 },
      { id: "dv-mart", name: "Business Vault", type: "mart", order: 4 },
      { id: "dv-consumption", name: "Consumption", type: "consumption", order: 5 },
    ],
    rules: {
      naming: {
        modelPatterns: {
          intermediate: "^(hub_|lnk_|sat_)",
          mart: "^(pit_|bridge_|bv_)",
        },
        columnPatterns: [
          { pattern: "_hk$", description: "Hash key columns should end with _hk" },
          { pattern: "_bk$", description: "Business key columns should end with _bk" },
          { pattern: "_ldts$", description: "Load date timestamp columns should end with _ldts" },
        ],
      },
      layerPlacement: {
        allowedTransforms: {
          staging: ["cast", "rename", "filter"],
          intermediate: ["expression", "aggregate"],
          mart: ["aggregate", "window", "expression", "filter"],
        },
        noBusinessLogicIn: ["source", "raw", "staging"],
        noRawJoinsIn: ["mart", "consumption"],
      },
      columnRequirements: {
        requiredColumns: {
          intermediate: [
            {
              role: "hash_key",
              pattern: "_hk$",
              when: { field: "modelingIntent.dataVaultRole", operator: "eq", value: "hub" },
            },
          ],
        },
      },
    },
  },
];

export function listTemplates(): GovernanceTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): GovernanceTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
