import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatacartaGraph } from "./types.js";
import type { ValidationResult } from "./types.js";

let compiled: ValidateFunction | null = null;

function loadSchema(): object {
  const path = join(__dirname, "..", "schema", "datacarta-graph.schema.json");
  return JSON.parse(readFileSync(path, "utf8")) as object;
}

function getValidateFn(): ValidateFunction {
  if (compiled) return compiled;
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  compiled = ajv.compile(loadSchema()) as ValidateFunction;
  return compiled;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [];
  return errors.map((e) => {
    const path = e.instancePath?.length ? e.instancePath : "(root)";
    return `${path} ${e.message ?? "invalid"}`.trim();
  });
}

export function validateDatacartaGraph(data: unknown): ValidationResult {
  const validate = getValidateFn();
  const ok = validate(data) as boolean;
  return { ok, errors: ok ? [] : formatAjvErrors(validate.errors) };
}

export function assertValidGraph(data: unknown): DatacartaGraph {
  const res = validateDatacartaGraph(data);
  if (!res.ok) {
    throw new Error(`Invalid Datacarta graph: ${res.errors.join("; ")}`);
  }
  return data as DatacartaGraph;
}
