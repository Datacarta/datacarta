import type { BaseNode } from "datacarta-spec/client";
import type { DataVaultRole, StarSchemaRole } from "../types/project";

export interface ColumnField {
  name: string;
  physicalType?: string;
  description?: string;
  /** e.g. ["PK"], ["FK->dim_artist"] */
  keys?: string[];
}

export interface ModelingSummary {
  starRole?: StarSchemaRole;
  dataVaultRole?: DataVaultRole;
  scdType?: string;
  physical?: {
    warehouse?: string;
    database?: string;
    schema?: string;
    relation?: string;
  };
  columns: ColumnField[];
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length ? out : undefined;
}

function asColumns(v: unknown): ColumnField[] {
  if (!Array.isArray(v)) return [];
  const out: ColumnField[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = asString(r.name);
    if (!name) continue;
    out.push({
      name,
      physicalType: asString(r.physicalType) ?? asString(r.type),
      description: asString(r.description),
      keys: asStringArray(r.keys),
    });
  }
  return out;
}

const STAR: StarSchemaRole[] = ["dimension", "fact", "bridge", "staging", "unknown"];
const DV: DataVaultRole[] = ["hub", "link", "satellite", "none"];

function pickEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  const s = asString(v);
  if (!s) return undefined;
  return (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
}

/** Reads optional modeling/table metadata from `node.metadata` (open convention). */
export function getModelingSummary(node: BaseNode): ModelingSummary {
  const m = node.metadata;
  if (!m || typeof m !== "object") {
    return { columns: [] };
  }
  const raw = m as Record<string, unknown>;
  const phys = raw.physical && typeof raw.physical === "object" ? (raw.physical as Record<string, unknown>) : undefined;

  return {
    starRole: pickEnum(raw.starSchemaRole, STAR),
    dataVaultRole: pickEnum(raw.dataVaultRole, DV),
    scdType: asString(raw.scdType),
    physical: phys
      ? {
          warehouse: asString(phys.warehouse),
          database: asString(phys.database),
          schema: asString(phys.schema),
          relation: asString(phys.relation) ?? asString(phys.table),
        }
      : undefined,
    columns: asColumns(raw.columns),
  };
}

/** One-line badge for graph nodes / tables. */
export function formatModelingHeadline(node: BaseNode): string | null {
  const s = getModelingSummary(node);
  const parts: string[] = [];
  if (s.starRole && s.starRole !== "unknown") parts.push(s.starRole);
  if (s.dataVaultRole && s.dataVaultRole !== "none") parts.push(`dv:${s.dataVaultRole}`);
  if (s.scdType && s.scdType !== "none") parts.push(`SCD${s.scdType}`);
  if (s.physical?.relation) parts.push(s.physical.relation);
  return parts.length ? parts.join(" · ") : null;
}
