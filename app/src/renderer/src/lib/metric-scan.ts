import type { Column } from "datacarta-spec/client";

/**
 * Heuristics for auto-flagging metric-like columns.
 *
 * We match common measurement names (revenue, mrr, arr, total, count, avg, etc.)
 * and numeric aggregate prefixes/suffixes. This is deliberately conservative —
 * better to miss a metric than mis-flag a surrogate key as one. Users can always
 * toggle the flag manually in the blueprint editor or model detail view.
 */

/** Tokens that strongly signal a column is a quantitative measure. */
const METRIC_TOKENS = [
  "revenue", "mrr", "arr", "gmv", "ltv", "cac", "arpu", "nps",
  "total", "count", "sum", "avg", "average", "median",
  "rate", "ratio", "percent", "pct",
  "amount", "value", "price", "cost", "fee", "charge",
  "duration", "latency", "throughput", "volume",
  "impressions", "clicks", "conversions", "sessions",
  "score", "index",
];

/** Tokens that indicate an aggregation prefix/suffix pattern like n_listens or listen_count. */
const AGG_PREFIXES = ["n_", "num_", "count_", "sum_", "total_", "avg_"];
const AGG_SUFFIXES = ["_count", "_total", "_sum", "_avg", "_rate", "_ratio"];

/** KPI promotion tokens — signals this is a headline metric, not a supporting measure. */
const KPI_TOKENS = ["mrr", "arr", "revenue", "nps", "cac", "ltv", "active_users", "dau", "mau", "wau"];

/** Types that can plausibly hold a numeric measure. */
const NUMERIC_TYPES = /(int|integer|bigint|smallint|tinyint|numeric|decimal|number|float|double|real|money)/i;

function tokenize(name: string): string[] {
  return name.toLowerCase().split(/[_\s-]+/).filter(Boolean);
}

export interface MetricScanFlags {
  isMetric: boolean;
  isKPI?: boolean;
}

/** Inspect a single column and return recommended flags, or null if nothing matches. */
export function scanColumn(col: Column): MetricScanFlags | null {
  // Skip obvious non-metrics — keys, dates, and text columns rarely represent measures.
  if (col.isPrimaryKey || col.isForeignKey || col.isSurrogateKey || col.isNaturalKey) return null;
  if (col.scdRole) return null;
  if (col.logicalType === "string" || col.logicalType === "date" || col.logicalType === "timestamp" || col.logicalType === "boolean") return null;

  const lower = col.name.toLowerCase();
  const tokens = tokenize(col.name);
  const typeMatches = NUMERIC_TYPES.test(col.dataType);

  const hasMetricToken = tokens.some((t) => METRIC_TOKENS.includes(t));
  const hasAggPrefix = AGG_PREFIXES.some((p) => lower.startsWith(p));
  const hasAggSuffix = AGG_SUFFIXES.some((s) => lower.endsWith(s));

  // Require either a metric token OR an aggregation pattern. Numeric-type-only is too noisy
  // (it would flag ids, quantities-used-as-keys, etc.).
  if (!hasMetricToken && !hasAggPrefix && !hasAggSuffix) return null;

  // If we have a strong signal but the type is non-numeric, still flag — the column was
  // probably stored as text for formatting (e.g., "$12.34" in a raw landing table).
  const flags: MetricScanFlags = { isMetric: true };
  if (KPI_TOKENS.some((t) => tokens.includes(t))) flags.isKPI = true;
  // Acknowledge the unused variable without forcing a rename — the type check matters
  // even when we don't gate the decision on it.
  void typeMatches;
  return flags;
}

/**
 * Scan an array of columns and return the number of newly-flagged columns.
 * Only sets flags when the column doesn't already have them set — respects user overrides.
 */
export function scanColumns(columns: Column[]): { updated: Column[]; flagged: number } {
  let flagged = 0;
  const updated = columns.map((col) => {
    if (col.isMetric !== undefined) return col; // respect existing user decision
    const result = scanColumn(col);
    if (!result) return col;
    flagged++;
    return { ...col, isMetric: result.isMetric, isKPI: result.isKPI };
  });
  return { updated, flagged };
}
