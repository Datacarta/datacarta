import {
  LAYER_TYPES as IMPORTED_LAYER_TYPES,
  type DatacartaGraph,
  type GovernanceRuleSet,
  type GovernanceViolation,
  type LayerType,
  type Model,
  type LayerDefinition,
  type RequiredColumn,
} from "./types.js";

/**
 * Validate a DatacartaGraph against its governance rules.
 * Returns an array of GovernanceViolation — lint-style, non-blocking.
 */
export function validateGovernance(graph: DatacartaGraph): GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];

  const layerById = new Map<string, LayerDefinition>(
    graph.layerDefinitions.map((l) => [l.id, l])
  );

  for (const model of graph.models) {
    const layer = layerById.get(model.layerId);
    const rules = mergeRules(graph.governanceRules ?? {}, layer?.governanceRules);

    violations.push(...checkNaming(model, layer, rules));
    violations.push(...checkDataTypes(model, rules));
    violations.push(...checkColumnRequirements(model, layer, rules));
  }

  return violations;
}

// ── Rule merging ──────────────────────────────────────────────────────────────

/**
 * Merge project-level rules with layer-level rules.
 * Layer rules override project rules where both are defined.
 */
function mergeRules(
  projectRules: GovernanceRuleSet,
  layerRules?: GovernanceRuleSet
): GovernanceRuleSet {
  if (!layerRules) return projectRules;

  return {
    naming: layerRules.naming ?? projectRules.naming,
    layerPlacement: layerRules.layerPlacement ?? projectRules.layerPlacement,
    columnRequirements: layerRules.columnRequirements ?? projectRules.columnRequirements,
    dataTypes: layerRules.dataTypes ?? projectRules.dataTypes,
  };
}

// ── Naming checks ─────────────────────────────────────────────────────────────

function checkNaming(
  model: Model,
  layer: LayerDefinition | undefined,
  rules: GovernanceRuleSet
): GovernanceViolation[] {
  if (!rules.naming || !layer) return [];

  const violations: GovernanceViolation[] = [];
  const { modelPatterns } = rules.naming;

  const pattern = modelPatterns[layer.type as LayerType];
  if (pattern) {
    const regex = new RegExp(pattern);
    if (!regex.test(model.name)) {
      violations.push({
        ruleId: "naming.model",
        severity: "warning",
        modelId: model.id,
        message: `Model "${model.name}" in layer "${layer.type}" does not match required pattern "${pattern}"`,
        suggestion: `Rename model to match the pattern: ${pattern}`,
      });
    }
  }

  return violations;
}

// ── Data type checks ──────────────────────────────────────────────────────────

function checkDataTypes(
  model: Model,
  rules: GovernanceRuleSet
): GovernanceViolation[] {
  if (!rules.dataTypes?.columnTypeMap?.length) return [];

  const violations: GovernanceViolation[] = [];

  for (const column of model.columns) {
    for (const rule of rules.dataTypes.columnTypeMap) {
      const regex = new RegExp(rule.columnPattern);
      if (regex.test(column.name)) {
        if (column.dataType !== rule.requiredType) {
          violations.push({
            ruleId: "dataType.column",
            severity: "warning",
            modelId: model.id,
            columnName: column.name,
            message: `Column "${column.name}" matches pattern "${rule.columnPattern}" and must have type "${rule.requiredType}", but has "${column.dataType}"`,
            suggestion: `Change column data type to "${rule.requiredType}"`,
          });
        }
        // Only apply the first matching rule per column
        break;
      }
    }
  }

  return violations;
}

// ── Column requirement checks ─────────────────────────────────────────────────

function checkColumnRequirements(
  model: Model,
  layer: LayerDefinition | undefined,
  rules: GovernanceRuleSet
): GovernanceViolation[] {
  if (!rules.columnRequirements?.requiredColumns) return [];

  const violations: GovernanceViolation[] = [];
  const { requiredColumns } = rules.columnRequirements;

  for (const [key, requirements] of Object.entries(requiredColumns)) {
    // Check if this key applies to the model — either a LayerType match or a name glob
    if (!keyMatchesModel(key, model, layer)) continue;

    for (const req of requirements) {
      // Check the `when` condition
      if (req.when && !evaluateCondition(req.when, model)) continue;

      if (!columnSatisfiesRequirement(model.columns, req)) {
        const descriptor = req.name ?? req.pattern ?? req.role ?? "(unknown)";
        violations.push({
          ruleId: "columnRequirements.missing",
          severity: "warning",
          modelId: model.id,
          message: `Model "${model.name}" is missing required column: ${descriptor}`,
          suggestion: req.name
            ? `Add a column named "${req.name}"`
            : req.pattern
            ? `Add a column matching the pattern "${req.pattern}"`
            : req.role
            ? `Add a column with role "${req.role}"`
            : undefined,
        });
      }
    }
  }

  return violations;
}

/** Determines whether a requiredColumns key applies to the given model. */
function keyMatchesModel(
  key: string,
  model: Model,
  layer: LayerDefinition | undefined
): boolean {
  // First check if key is a LayerType
  if (IMPORTED_LAYER_TYPES.includes(key as LayerType)) {
    return layer?.type === key;
  }

  // Otherwise treat as a glob-style name pattern (only * wildcard supported)
  const regexStr = "^" + key.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
  const regex = new RegExp(regexStr);
  return regex.test(model.name);
}

/** Checks whether the column list satisfies a single RequiredColumn spec. */
function columnSatisfiesRequirement(
  columns: Model["columns"],
  req: RequiredColumn
): boolean {
  return columns.some((col) => {
    if (req.name && col.name !== req.name) return false;
    if (req.pattern) {
      const regex = new RegExp(req.pattern);
      if (!regex.test(col.name)) return false;
    }
    if (req.role) {
      if (!columnHasRole(col, req.role)) return false;
    }
    if (req.dataType && col.dataType !== req.dataType) return false;
    return true;
  });
}

/** Maps a role string to a column boolean flag. */
function columnHasRole(col: Model["columns"][number], role: string): boolean {
  switch (role) {
    case "primaryKey": return col.isPrimaryKey === true;
    case "surrogateKey": return col.isSurrogateKey === true;
    case "naturalKey": return col.isNaturalKey === true;
    case "foreignKey": return col.isForeignKey === true;
    default: return false;
  }
}

/** Evaluates a RequiredColumnCondition against a model's fields (supports dotted paths). */
function evaluateCondition(
  condition: NonNullable<RequiredColumn["when"]>,
  model: Model
): boolean {
  const parts = condition.field.split(".");
  let current: unknown = model;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[part];
  }
  switch (condition.operator) {
    case "eq": return current === condition.value;
    case "neq": return current !== condition.value;
    default: return false;
  }
}
