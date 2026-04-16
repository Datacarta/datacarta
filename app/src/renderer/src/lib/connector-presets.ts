import type { Column, LogicalType, Model, ModelEdge, SourceClassification } from "datacarta-spec/client";

/**
 * Connector presets describe how a connector onboards into a graph:
 *  - the configuration it needs from the user,
 *  - the tables it creates (source + raw),
 *  - and the lineage edges that wire them together.
 *
 * Warehouse presets (Snowflake, Databricks) do real schema introspection
 * via a PAT against the vendor's REST API — no data is exported, we only
 * read table/column metadata. The PAT lives in memory only for the
 * duration of the modal session; it's passed from the renderer to the
 * Electron main process so it never leaves the desktop app.
 *
 * Event-stream presets (Snowplow, Segment) generate the canonical tables
 * those tools land in the warehouse. Those don't need live credentials
 * because the schema is fixed by the vendor spec.
 */

export interface ConnectorField {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  default?: string;
  required?: boolean;
  /** textarea for longer lists, text for single-line, password for tokens */
  kind?: "text" | "textarea" | "password";
}

export interface ConnectorGenerationResult {
  /** New models to add to graph.models */
  models: Model[];
  /** New edges to add to graph.edges */
  edges: ModelEdge[];
  /** A short message summarizing what was created, shown to the user post-ingest */
  summary: string;
}

export interface ConnectorPreset {
  id: string;
  title: string;
  /** Human-readable explanation rendered at the top of the modal */
  blurb: string;
  fields: ConnectorField[];
  /**
   * Generate models/edges from the user-supplied config. Async because some
   * presets do live network introspection. May throw with a human-readable
   * error; the modal surfaces it inline.
   */
  generate: (config: Record<string, string>) => Promise<ConnectorGenerationResult>;
}

/**
 * Best-effort mapping from a warehouse-native type string to our logical type
 * taxonomy. We keep the raw `dataType` string intact so no information is
 * lost; logicalType just drives UI rendering and column-level validation.
 */
function inferLogicalType(dataType: string): LogicalType {
  const t = dataType.toUpperCase();
  if (t.includes("TIMESTAMP") || t.includes("DATETIME")) return "timestamp";
  if (t.startsWith("DATE")) return "date";
  if (t.includes("BOOL")) return "boolean";
  if (
    t.includes("INT") ||
    t === "BIGINT" ||
    t === "SMALLINT" ||
    t === "TINYINT"
  )
    return "integer";
  if (
    t.includes("FLOAT") ||
    t.includes("DOUBLE") ||
    t.includes("REAL") ||
    t.includes("DECIMAL") ||
    t.includes("NUMERIC") ||
    t.startsWith("NUMBER")
  )
    return "float";
  if (
    t.includes("JSON") ||
    t === "VARIANT" ||
    t === "OBJECT" ||
    t.startsWith("STRUCT") ||
    t.startsWith("MAP") ||
    t.startsWith("ARRAY")
  )
    return "json";
  if (
    t.includes("CHAR") ||
    t.includes("TEXT") ||
    t === "STRING" ||
    t === "VARCHAR"
  )
    return "string";
  return "other";
}

/**
 * Heuristic that flags obvious key columns from their name so the freshly
 * imported schema lights up with PK/FK affordances rather than looking inert.
 * We stay conservative: only "id" or ".._id" / "..pk".
 */
function inferKeyFlags(name: string): { isPrimaryKey?: boolean; isForeignKey?: boolean } {
  const n = name.toLowerCase();
  if (n === "id" || n === "pk" || n.endsWith("_pk")) return { isPrimaryKey: true };
  if (n.endsWith("_id") || n.endsWith("_fk")) return { isForeignKey: true };
  return {};
}

// ── ID helpers ───────────────────────────────────────────────────────
let counter = 0;
function uid(prefix: string): string {
  counter++;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

function col(name: string, dataType: string, extras: Partial<Column> = {}): Column {
  return { id: uid("col"), name, dataType, ...extras };
}

function sourceModel(
  name: string,
  displayName: string,
  description: string,
  classification: SourceClassification,
): Model {
  return {
    id: uid("src"),
    layerId: "layer-source",
    name,
    displayName,
    description,
    columns: [],
    sourceClassification: classification,
    trustLevel: "draft",
    status: "active",
  };
}

function rawModel(
  name: string,
  displayName: string,
  description: string,
  columns: Column[],
  schema: { database?: string; schema?: string; warehouse?: string; relation?: string } = {},
): Model {
  return {
    id: uid("raw"),
    layerId: "layer-raw",
    name,
    displayName,
    description,
    columns,
    trustLevel: "draft",
    status: "active",
    physical: {
      warehouse: schema.warehouse,
      database: schema.database,
      schema: schema.schema,
      relation: schema.relation ?? name,
    },
  };
}

function depends(sourceId: string, targetId: string, description?: string): ModelEdge {
  return { id: uid("edge"), type: "depends_on", sourceId, targetId, description };
}

// ── Snowflake ────────────────────────────────────────────────────────
export const SNOWFLAKE_PRESET: ConnectorPreset = {
  id: "snowflake",
  title: "Snowflake",
  blurb:
    "Import table metadata from a Snowflake account using a Programmatic Access Token (PAT). We only query INFORMATION_SCHEMA — no data is read or exported. The token stays on your machine.",
  fields: [
    {
      key: "account",
      label: "Account identifier",
      placeholder: "xy12345.us-east-1",
      required: true,
      help: "The <account>.<region> portion of the Snowflake URL. You can also paste the full host.",
    },
    { key: "database", label: "Database", placeholder: "ANALYTICS", required: true },
    { key: "schema", label: "Schema", placeholder: "PUBLIC", required: true, default: "PUBLIC" },
    { key: "warehouse", label: "Warehouse", placeholder: "COMPUTE_WH", required: true, help: "Used to execute the INFORMATION_SCHEMA query." },
    { key: "role", label: "Role (optional)", placeholder: "ACCOUNTADMIN" },
    {
      key: "token",
      label: "Programmatic Access Token",
      kind: "password",
      required: true,
      help: "Generate in Snowsight → Admin → Users → (your user) → Programmatic Access Tokens. Needs USAGE on the database/schema.",
    },
    {
      key: "tables",
      label: "Tables to ingest (optional)",
      kind: "textarea",
      placeholder: "CUSTOMERS, ORDERS, ORDER_ITEMS",
      help: "Comma-separated. Leave blank to ingest every table in the schema.",
    },
  ],
  async generate(config) {
    const account = (config.account || "").trim();
    const database = config.database;
    const schema = config.schema;
    const warehouse = config.warehouse;

    const res = await window.datacarta.introspectSnowflake({
      account,
      database,
      schema,
      warehouse,
      token: config.token,
      role: config.role,
      tables: config.tables,
    });
    if (!res.ok) throw new Error(res.error);
    if (res.tables.length === 0) {
      throw new Error(
        `No tables found in ${database}.${schema}. Check that the PAT has USAGE on this schema and the table filter matches.`,
      );
    }

    const src = sourceModel(
      `snowflake_${database.toLowerCase()}`,
      `Snowflake · ${database}.${schema}`,
      `Snowflake account ${account}, database ${database}, schema ${schema}. Imported via INFORMATION_SCHEMA introspection.`,
      { origin: "backend", ingestionMethod: "batch_api", schemaStability: "stable" },
    );

    const raws = res.tables.map((t) => {
      const columns: Column[] = t.columns.map((c) =>
        col(c.name, c.type, {
          logicalType: inferLogicalType(c.type),
          isRequired: !c.nullable,
          description: c.comment,
          ...inferKeyFlags(c.name),
        }),
      );
      return rawModel(
        `raw_sf_${t.name.toLowerCase()}`,
        `Snowflake · ${t.name}`,
        `Introspected from ${database}.${schema}.${t.name}.`,
        columns,
        { warehouse: "snowflake", database, schema, relation: t.name },
      );
    });
    const edges = raws.map((r) => depends(r.id, src.id, "Imported from Snowflake INFORMATION_SCHEMA"));

    const colCount = raws.reduce((acc, r) => acc + r.columns.length, 0);
    return {
      models: [src, ...raws],
      edges,
      summary: `Imported ${raws.length} table${raws.length === 1 ? "" : "s"} (${colCount} columns) from Snowflake ${database}.${schema}.`,
    };
  },
};

// ── Databricks ───────────────────────────────────────────────────────
export const DATABRICKS_PRESET: ConnectorPreset = {
  id: "databricks",
  title: "Databricks",
  blurb:
    "Import table metadata from a Databricks Unity Catalog schema using a Personal Access Token. We call the Unity Catalog REST API — metadata only, no data is read. The token stays on your machine.",
  fields: [
    {
      key: "workspace",
      label: "Workspace URL",
      placeholder: "https://dbc-xxxx.cloud.databricks.com",
      required: true,
      help: "The base URL for your workspace (no trailing slash needed).",
    },
    { key: "catalog", label: "Catalog", placeholder: "main", required: true, default: "main" },
    { key: "schema", label: "Schema", placeholder: "default", required: true, default: "default" },
    {
      key: "token",
      label: "Personal Access Token",
      kind: "password",
      required: true,
      help: "Generate in Databricks → Settings → Developer → Access Tokens. Needs USE_CATALOG + USE_SCHEMA privileges.",
    },
    {
      key: "tables",
      label: "Tables to ingest (optional)",
      kind: "textarea",
      placeholder: "users, events, sessions",
      help: "Comma-separated. Leave blank to ingest every table in the schema.",
    },
  ],
  async generate(config) {
    const workspace = (config.workspace || "").trim();
    const catalog = config.catalog;
    const schema = config.schema;

    const res = await window.datacarta.introspectDatabricks({
      workspace,
      catalog,
      schema,
      token: config.token,
      tables: config.tables,
    });
    if (!res.ok) throw new Error(res.error);
    if (res.tables.length === 0) {
      throw new Error(
        `No tables found in ${catalog}.${schema}. Check that the PAT has USE_CATALOG + USE_SCHEMA privileges and the table filter matches.`,
      );
    }

    const src = sourceModel(
      `databricks_${catalog.toLowerCase()}`,
      `Databricks · ${catalog}.${schema}`,
      `Databricks workspace ${workspace}, Unity Catalog ${catalog}.${schema}. Imported via Unity Catalog REST API.`,
      { origin: "backend", ingestionMethod: "batch_api", schemaStability: "stable" },
    );

    const raws = res.tables.map((t) => {
      const columns: Column[] = (t.columns ?? []).map((c) => {
        const dt = c.type_text ?? c.type_name ?? "STRING";
        return col(c.name, dt, {
          logicalType: inferLogicalType(dt),
          isRequired: c.nullable === false,
          description: c.comment,
          ...inferKeyFlags(c.name),
        });
      });
      return rawModel(
        `raw_dbx_${t.name.toLowerCase()}`,
        `Databricks · ${t.name}`,
        t.comment ?? `Introspected from ${catalog}.${schema}.${t.name}.`,
        columns,
        { warehouse: "databricks", database: catalog, schema, relation: t.name },
      );
    });
    const edges = raws.map((r) => depends(r.id, src.id, "Imported from Databricks Unity Catalog"));

    const colCount = raws.reduce((acc, r) => acc + r.columns.length, 0);
    return {
      models: [src, ...raws],
      edges,
      summary: `Imported ${raws.length} table${raws.length === 1 ? "" : "s"} (${colCount} columns) from Databricks ${catalog}.${schema}.`,
    };
  },
};

// ── Snowplow ─────────────────────────────────────────────────────────
export const SNOWPLOW_PRESET: ConnectorPreset = {
  id: "snowplow",
  title: "Snowplow",
  blurb:
    "Snowplow lands behavioral events in your warehouse via its Loader. We'll create the atomic events table plus canonical web_page and web_session context tables in the raw layer, following Snowplow's standard schema.",
  fields: [
    { key: "warehouse", label: "Target warehouse", placeholder: "snowflake or databricks", default: "snowflake", required: true },
    { key: "database", label: "Database / catalog", placeholder: "SNOWPLOW", default: "SNOWPLOW", required: true },
    { key: "schema", label: "Atomic schema", placeholder: "ATOMIC", default: "ATOMIC", required: true, help: "Schema where the Loader writes its atomic events table." },
  ],
  async generate(config) {
    const warehouse = (config.warehouse || "snowflake").toLowerCase();
    const database = config.database || "SNOWPLOW";
    const schema = config.schema || "ATOMIC";

    const src = sourceModel(
      "snowplow",
      "Snowplow (web + mobile events)",
      "Snowplow behavioral event collector for web and mobile clients.",
      { origin: "frontend", ingestionMethod: "event_stream", schemaStability: "evolving" },
    );

    const atomic = rawModel(
      "raw_snowplow_events",
      "Snowplow · atomic.events",
      "Canonical Snowplow atomic events table — one row per behavioral event.",
      [
        col("event_id", "VARCHAR(36)", { isPrimaryKey: true, isRequired: true, description: "UUID for the event" }),
        col("collector_tstamp", "TIMESTAMP", { logicalType: "timestamp", isRequired: true }),
        col("derived_tstamp", "TIMESTAMP", { logicalType: "timestamp" }),
        col("event_name", "VARCHAR(256)", { logicalType: "string", isRequired: true }),
        col("app_id", "VARCHAR(256)", { logicalType: "string" }),
        col("platform", "VARCHAR(32)", { logicalType: "string" }),
        col("user_id", "VARCHAR(256)", { logicalType: "string" }),
        col("domain_userid", "VARCHAR(128)", { logicalType: "string" }),
        col("page_url", "VARCHAR(4096)", { logicalType: "string" }),
        col("referrer_url", "VARCHAR(4096)", { logicalType: "string" }),
        col("geo_country", "VARCHAR(2)", { logicalType: "string" }),
        col("os_family", "VARCHAR(128)", { logicalType: "string" }),
        col("br_family", "VARCHAR(128)", { logicalType: "string" }),
      ],
      { warehouse, database, schema },
    );

    const webPage = rawModel(
      "raw_snowplow_web_page_context",
      "Snowplow · web_page context",
      "Snowplow web_page context entity — one row per page view.",
      [
        col("root_id", "VARCHAR(36)", { isRequired: true, description: "References atomic.events.event_id" }),
        col("root_tstamp", "TIMESTAMP", { logicalType: "timestamp", isRequired: true }),
        col("id", "VARCHAR(36)", { isPrimaryKey: true }),
      ],
      { warehouse, database, schema },
    );

    const edges = [
      depends(atomic.id, src.id, "Snowplow Loader → warehouse"),
      depends(webPage.id, src.id, "Snowplow context table"),
    ];

    return {
      models: [src, atomic, webPage],
      edges,
      summary: `Added Snowplow source + atomic events + web_page context (${warehouse.toUpperCase()} · ${database}.${schema}).`,
    };
  },
};

// ── Segment ──────────────────────────────────────────────────────────
export const SEGMENT_PRESET: ConnectorPreset = {
  id: "segment",
  title: "Segment",
  blurb:
    "Segment writes warehouse tables for tracks, identifies, pages, screens, and groups. We'll create the five canonical raw tables in your target schema.",
  fields: [
    { key: "warehouse", label: "Target warehouse", placeholder: "snowflake or databricks", default: "snowflake", required: true },
    { key: "database", label: "Database / catalog", placeholder: "SEGMENT", default: "SEGMENT", required: true },
    { key: "schema", label: "Schema / source slug", placeholder: "web_prod", default: "web_prod", required: true, help: "Segment writes one schema per source." },
  ],
  async generate(config) {
    const warehouse = (config.warehouse || "snowflake").toLowerCase();
    const database = config.database || "SEGMENT";
    const schema = config.schema || "web_prod";

    const src = sourceModel(
      "segment",
      `Segment · ${schema}`,
      `Segment source writing to ${warehouse.toUpperCase()} · ${database}.${schema}. Customer data platform — emits tracks/identifies/pages/screens/groups events.`,
      { origin: "frontend", ingestionMethod: "event_stream", schemaStability: "stable" },
    );

    const commonCols = (): Column[] => [
      col("id", "VARCHAR(36)", { isPrimaryKey: true, isRequired: true, description: "Message ID" }),
      col("timestamp", "TIMESTAMP", { logicalType: "timestamp", isRequired: true }),
      col("received_at", "TIMESTAMP", { logicalType: "timestamp", description: "When Segment received the event" }),
      col("sent_at", "TIMESTAMP", { logicalType: "timestamp" }),
      col("anonymous_id", "VARCHAR(64)", { logicalType: "string" }),
      col("user_id", "VARCHAR(128)", { logicalType: "string" }),
      col("context_ip", "VARCHAR(64)", { logicalType: "string" }),
      col("context_user_agent", "VARCHAR(512)", { logicalType: "string" }),
    ];

    const tracks = rawModel(
      "raw_segment_tracks",
      "Segment · tracks",
      "Segment tracks() calls — custom behavioral events.",
      [
        ...commonCols(),
        col("event", "VARCHAR(256)", { logicalType: "string", isRequired: true, description: "Event name" }),
        col("event_text", "VARCHAR(256)", { logicalType: "string" }),
        col("properties", "VARIANT", { logicalType: "json", description: "Event properties" }),
      ],
      { warehouse, database, schema },
    );
    const identifies = rawModel(
      "raw_segment_identifies",
      "Segment · identifies",
      "Segment identify() calls — user trait updates.",
      [
        ...commonCols(),
        col("traits", "VARIANT", { logicalType: "json", description: "User traits" }),
        col("email", "VARCHAR(320)", { logicalType: "string" }),
      ],
      { warehouse, database, schema },
    );
    const pages = rawModel(
      "raw_segment_pages",
      "Segment · pages",
      "Segment page() calls — web page views.",
      [
        ...commonCols(),
        col("name", "VARCHAR(256)", { logicalType: "string" }),
        col("category", "VARCHAR(256)", { logicalType: "string" }),
        col("url", "VARCHAR(4096)", { logicalType: "string" }),
        col("referrer", "VARCHAR(4096)", { logicalType: "string" }),
        col("path", "VARCHAR(2048)", { logicalType: "string" }),
      ],
      { warehouse, database, schema },
    );
    const screens = rawModel(
      "raw_segment_screens",
      "Segment · screens",
      "Segment screen() calls — mobile screen views.",
      [
        ...commonCols(),
        col("name", "VARCHAR(256)", { logicalType: "string" }),
        col("category", "VARCHAR(256)", { logicalType: "string" }),
      ],
      { warehouse, database, schema },
    );
    const groups = rawModel(
      "raw_segment_groups",
      "Segment · groups",
      "Segment group() calls — organizational grouping of users.",
      [
        ...commonCols(),
        col("group_id", "VARCHAR(128)", { logicalType: "string", isRequired: true }),
        col("traits", "VARIANT", { logicalType: "json" }),
      ],
      { warehouse, database, schema },
    );

    const rawTables = [tracks, identifies, pages, screens, groups];
    const edges = rawTables.map((r) => depends(r.id, src.id, "Segment → warehouse"));

    return {
      models: [src, ...rawTables],
      edges,
      summary: `Added Segment source + 5 raw event tables (${warehouse.toUpperCase()} · ${database}.${schema}).`,
    };
  },
};

export const CONNECTOR_PRESETS: Record<string, ConnectorPreset> = {
  snowflake: SNOWFLAKE_PRESET,
  databricks: DATABRICKS_PRESET,
  snowplow: SNOWPLOW_PRESET,
  segment: SEGMENT_PRESET,
};
