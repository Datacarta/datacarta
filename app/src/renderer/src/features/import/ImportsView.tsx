import { useMemo, useState } from "react";
import { validateDatacartaGraph, type DatacartaGraph } from "datacarta-spec/client";
import { parseWorkspaceFile } from "../../lib/persist";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { CONNECTOR_PRESETS, type ConnectorPreset } from "../../lib/connector-presets";
import { ConnectorConfigModal } from "./ConnectorConfigModal";

/** Connector definitions — source systems we can ingest from */
interface ConnectorDef {
  id: string;
  name: string;
  icon: string; // emoji or short label
  description: string;
  category: "warehouse" | "event-stream" | "saas" | "database" | "file";
  platforms: string[]; // e.g. ["Databricks", "Snowflake"]
  /** True once there's working code behind the "Connect" button. All false today except JSON. */
  available: boolean;
}

const CONNECTORS: ConnectorDef[] = [
  // Warehouses — direct-to-database ingest (user has their own Snowflake/Databricks account)
  { id: "snowflake", name: "Snowflake", icon: "SF", description: "Connect directly to a Snowflake warehouse and introspect schemas", category: "warehouse", platforms: ["Snowflake"], available: true },
  { id: "databricks", name: "Databricks", icon: "DB", description: "Connect directly to a Databricks workspace and introspect catalogs", category: "warehouse", platforms: ["Databricks"], available: true },
  // Event streams
  { id: "snowplow", name: "Snowplow", icon: "SP", description: "Behavioral event stream collector", category: "event-stream", platforms: ["Databricks", "Snowflake"], available: true },
  { id: "segment", name: "Segment", icon: "SG", description: "Customer data platform events", category: "event-stream", platforms: ["Databricks", "Snowflake"], available: true },
  // SaaS
  { id: "stripe", name: "Stripe", icon: "ST", description: "Payment and billing data", category: "saas", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "hubspot", name: "HubSpot", icon: "HS", description: "CRM and marketing automation", category: "saas", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "salesforce", name: "Salesforce", icon: "SL", description: "CRM platform data", category: "saas", platforms: ["Databricks", "Snowflake"], available: false },
  // Operational databases
  { id: "postgres", name: "PostgreSQL", icon: "PG", description: "Relational database", category: "database", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "mysql", name: "MySQL", icon: "MY", description: "Relational database", category: "database", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "bigquery", name: "BigQuery", icon: "BQ", description: "Google cloud data warehouse", category: "database", platforms: ["Databricks"], available: false },
  // Files & storage
  { id: "s3", name: "Amazon S3", icon: "S3", description: "Object storage (Parquet, CSV, JSON)", category: "file", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "gcs", name: "Google Cloud Storage", icon: "GCS", description: "Object storage", category: "file", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "csv", name: "CSV / File Upload", icon: "CSV", description: "Local file import", category: "file", platforms: ["Databricks", "Snowflake"], available: false },
  { id: "json", name: "Datacarta JSON", icon: "DC", description: "Import datacarta-spec v0.2.0 JSON", category: "file", platforms: ["Databricks", "Snowflake"], available: true },
];

const CATEGORY_LABELS: Record<string, string> = {
  warehouse: "Warehouses",
  "event-stream": "Event Streams",
  saas: "SaaS Platforms",
  database: "Databases",
  file: "Files & Storage",
};

const CATEGORY_COLORS: Record<string, string> = {
  warehouse: "#64D2FF",
  "event-stream": "#BF5AF2",
  saas: "#007AFF",
  database: "#30D158",
  file: "#FF9F0A",
};

/** Category order determines the card-grid ordering when no filter is active. */
const CATEGORY_ORDER: ConnectorDef["category"][] = ["warehouse", "event-stream", "saas", "database", "file"];

function ConnectorCard({
  connector,
  connectedModels,
  onConnect,
}: {
  connector: ConnectorDef;
  connectedModels: string[];
  onConnect: () => void;
}) {
  const isConnected = connectedModels.length > 0;
  const catColor = CATEGORY_COLORS[connector.category] ?? "#888";
  const isAvailable = connector.available;

  // Unavailable connectors get a greyed treatment so the user can see
  // what's on the roadmap without thinking the button is broken.
  const effectiveColor = isAvailable ? catColor : "var(--text-quaternary)";

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: isConnected ? `${catColor}08` : "var(--bg-card)",
        border: isConnected ? `1px solid ${catColor}30` : "0.5px solid var(--border)",
        opacity: !isAvailable && !isConnected ? 0.6 : 1,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{
                background: isAvailable ? `${catColor}15` : "var(--surface-hover)",
                color: effectiveColor,
                filter: isAvailable ? undefined : "grayscale(0.6)",
              }}
            >
              {connector.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{connector.name}</span>
                {isConnected && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: `${catColor}20`, color: catColor }}>
                    Connected
                  </span>
                )}
                {!isAvailable && !isConnected && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                    style={{ background: "var(--surface-hover)", color: "var(--text-quaternary)" }}
                  >
                    Coming soon
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{connector.description}</div>
            </div>
          </div>
        </div>

        {isConnected && (
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>
              Source models ({connectedModels.length})
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {connectedModels.map((name) => (
                <span
                  key={name}
                  className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ background: "var(--surface-hover)", color: "var(--text-secondary)" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {connector.platforms.map((p) => (
              <span key={p} className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "var(--surface-hover)", color: "var(--text-quaternary)" }}>
                {p}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={!isAvailable && !isConnected}
            className="rounded-lg px-3 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              background: isConnected
                ? "var(--surface-hover)"
                : isAvailable
                ? `${catColor}15`
                : "var(--surface-hover)",
              color: isConnected
                ? "var(--text-tertiary)"
                : isAvailable
                ? catColor
                : "var(--text-quaternary)",
              border: `0.5px solid ${
                isConnected ? "var(--border)" : isAvailable ? catColor + "40" : "var(--border)"
              }`,
            }}
            title={isAvailable ? undefined : "This connector isn't built yet"}
          >
            {isConnected ? "Configure" : isAvailable ? "Connect" : "Coming soon"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImportsView(): JSX.Element {
  const graph = useWorkspaceStore((s) => s.graph);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const setLastError = useWorkspaceStore((s) => s.setLastError);
  const setActiveView = useWorkspaceStore((s) => s.setActiveView);
  const ingestModels = useWorkspaceStore((s) => s.ingestModels);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activePreset, setActivePreset] = useState<ConnectorPreset | null>(null);

  // Detect which connectors are "connected" by matching source model names
  const connectedMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!graph) return map;
    const sourceModels = graph.models.filter((m) => {
      const layer = graph.layerDefinitions.find((l) => l.id === m.layerId);
      return layer?.type === "source" || layer?.type === "raw";
    });
    for (const c of CONNECTORS) {
      const matches = sourceModels
        .filter((m) => m.name.toLowerCase().includes(c.id.toLowerCase()) || m.name.toLowerCase().includes(c.name.toLowerCase()))
        .map((m) => m.name);
      if (matches.length > 0) map.set(c.id, matches);
    }
    return map;
  }, [graph]);

  const filteredConnectors = useMemo(() => {
    const q = search.toLowerCase();
    const list = CONNECTORS.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (q && !`${c.name} ${c.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // Order: available first, then by category order, then alphabetical.
    return list.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      const ac = CATEGORY_ORDER.indexOf(a.category);
      const bc = CATEGORY_ORDER.indexOf(b.category);
      if (ac !== bc) return ac - bc;
      return a.name.localeCompare(b.name);
    });
  }, [categoryFilter, search]);

  const categories = CATEGORY_ORDER.filter((c) => CONNECTORS.some((conn) => conn.category === c));

  async function handleConnect(connector: ConnectorDef) {
    if (connector.id === "json") {
      // JSON import flow
      setLastError(null);
      try {
        const res = await window.datacarta.openGraphJson();
        if (res.canceled) return;
        const w = parseWorkspaceFile(res.text);
        openWorkspace(w.graph, null);
        setActiveView("data-layer");
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
      }
      return;
    }

    const preset = CONNECTOR_PRESETS[connector.id];
    if (preset) {
      setActivePreset(preset);
      return;
    }

    // Fallback for any future "available" connector that ships without a preset.
    alert(
      `${connector.name} isn't wired up yet. For now, use "Datacarta JSON" or click Load Sample.`
    );
  }

  async function runIngest(config: Record<string, string>) {
    if (!activePreset) return;
    // Errors bubble up to the modal, which surfaces them inline and leaves
    // the form open so the user can correct credentials / hostnames without
    // re-typing everything.
    const result = await activePreset.generate(config);
    const added = ingestModels({
      models: result.models,
      edges: result.edges,
      projectName: `${activePreset.title} import`,
    });
    setActivePreset(null);
    setActiveView("data-layer");
    if (added === 0) {
      alert(`${activePreset.title}: nothing new added — all tables already exist in this workspace.`);
    } else {
      alert(result.summary);
    }
  }

  async function loadSample() {
    setLastError(null);
    try {
      const p = await window.datacarta.resolveSamplePath();
      if (!p) {
        setLastError("Could not locate sample. Ensure datacarta-spec is a sibling directory.");
        return;
      }
      const text = await window.datacarta.readTextFile(p);
      const raw = JSON.parse(text) as unknown;
      const v = validateDatacartaGraph(raw);
      if (!v.ok) throw new Error(v.errors.join("\n"));
      openWorkspace(raw as DatacartaGraph, null);
      setActiveView("data-layer");
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Connectors</h2>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Connect source systems to import data models
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSample}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Load Sample
          </button>
        </div>
      </div>

      {/* Search & category filter */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connectors..."
          className="w-56 rounded-lg px-3 py-1.5 text-[12px] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          style={{ background: "var(--surface-hover)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1.5">
          {categories.map((cat) => {
            const color = CATEGORY_COLORS[cat] ?? "#888";
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(active ? null : cat)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all"
                style={{
                  background: active ? `${color}20` : "var(--surface-hover)",
                  color: active ? color : "var(--text-tertiary)",
                  border: active ? `1px solid ${color}` : "0.5px solid var(--border)",
                }}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected status summary */}
      {connectedMap.size > 0 && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl p-3"
          style={{ background: "rgba(48,209,88,0.06)", border: "0.5px solid rgba(48,209,88,0.2)" }}
        >
          <svg className="h-4 w-4 shrink-0" style={{ color: "#30D158" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[12px] font-medium" style={{ color: "#30D158" }}>
            {connectedMap.size} connector{connectedMap.size !== 1 ? "s" : ""} active
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {[...connectedMap.values()].flat().length} source models detected
          </span>
        </div>
      )}

      {/* Connector grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {filteredConnectors.map((c) => (
          <ConnectorCard
            key={c.id}
            connector={c}
            connectedModels={connectedMap.get(c.id) ?? []}
            onConnect={() => handleConnect(c)}
          />
        ))}
      </div>

      {filteredConnectors.length === 0 && (
        <div className="py-12 text-center text-[13px]" style={{ color: "var(--text-quaternary)" }}>
          No connectors match your search.
        </div>
      )}

      {activePreset && (
        <ConnectorConfigModal
          preset={activePreset}
          onCancel={() => setActivePreset(null)}
          onIngest={runIngest}
        />
      )}
    </div>
  );
}
