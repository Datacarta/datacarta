import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const requireFromMain = createRequire(import.meta.url);

function resolveHarmonicSamplePath(): string | null {
  // Preferred: resolve through the installed/linked datacarta-spec package so
  // this works in both the workspace-symlinked dev layout and a packaged app.
  try {
    const specPkg = requireFromMain.resolve("datacarta-spec/package.json");
    const p = join(dirname(specPkg), "samples", "harmonic-audio.sample.json");
    if (existsSync(p)) return p;
  } catch {
    /* fall through to filesystem candidates */
  }
  // Fallback: sibling directory layouts (monorepo dev, side-by-side repos).
  const rel = join("samples", "harmonic-audio.sample.json");
  const candidates = [
    join(app.getAppPath(), "..", "spec", rel),
    join(process.cwd(), "..", "spec", rel),
    join(app.getAppPath(), "..", "datacarta-spec", rel),
    join(process.cwd(), "..", "datacarta-spec", rel),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function projectsDir(): string {
  return join(app.getPath("userData"), "projects");
}

async function ensureProjectsDir(): Promise<void> {
  await mkdir(projectsDir(), { recursive: true });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0b0f14",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    trafficLightPosition: process.platform === "darwin" ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dc:resolveSamplePath", async () => {
  return resolveHarmonicSamplePath();
});

ipcMain.handle("dc:readTextFile", async (_evt, filePath: string) => {
  return readFile(filePath, "utf8");
});

ipcMain.handle("dc:openGraphJson", async () => {
  const res = await dialog.showOpenDialog({
    title: "Import Datacarta graph JSON",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true as const };
  const text = await readFile(res.filePaths[0], "utf8");
  return { canceled: false as const, filePath: res.filePaths[0], text };
});

ipcMain.handle("dc:exportGraphJson", async (_evt, defaultName: string, content: string) => {
  const res = await dialog.showSaveDialog({
    title: "Export graph JSON",
    defaultPath: defaultName,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (res.canceled || !res.filePath) return { canceled: true as const };
  await writeFile(res.filePath, content, "utf8");
  return { canceled: false as const, filePath: res.filePath };
});

ipcMain.handle("dc:listProjects", async () => {
  await ensureProjectsDir();
  const names = await readdir(projectsDir());
  return names.filter((n) => n.endsWith(".dcproj.json"));
});

ipcMain.handle("dc:readProject", async (_evt, filename: string) => {
  const safe = filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return readFile(join(projectsDir(), safe), "utf8");
});

ipcMain.handle("dc:saveProject", async (_evt, filename: string, content: string) => {
  try {
    await ensureProjectsDir();
    const safe = filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    if (!safe.endsWith(".dcproj.json")) {
      return { ok: false as const, error: "Filename must end with .dcproj.json" };
    }
    await writeFile(join(projectsDir(), safe), content, "utf8");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: msg };
  }
});

// ── Warehouse introspection (PAT-based reads only) ───────────────────
// These handlers live in the main process so personal access tokens never
// sit on a cross-origin renderer request. We only ever READ metadata; no
// mutations, no data export.

interface DatabricksColumn {
  name: string;
  type_text?: string;
  type_name?: string;
  nullable?: boolean;
  position?: number;
  comment?: string;
}
interface DatabricksTable {
  name: string;
  full_name?: string;
  comment?: string;
  columns?: DatabricksColumn[];
}

ipcMain.handle(
  "dc:introspectDatabricks",
  async (
    _evt,
    config: {
      workspace: string;
      catalog: string;
      schema: string;
      token: string;
      tables?: string;
    },
  ): Promise<
    | { ok: true; tables: DatabricksTable[] }
    | { ok: false; error: string }
  > => {
    try {
      const baseUrl = (config.workspace || "").trim().replace(/\/+$/, "");
      if (!baseUrl) return { ok: false, error: "Workspace URL is required." };
      if (!config.token) return { ok: false, error: "Personal access token is required." };
      if (!config.catalog) return { ok: false, error: "Catalog is required." };
      if (!config.schema) return { ok: false, error: "Schema is required." };

      const url =
        `${baseUrl}/api/2.1/unity-catalog/tables` +
        `?catalog_name=${encodeURIComponent(config.catalog)}` +
        `&schema_name=${encodeURIComponent(config.schema)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          error: `Databricks API ${res.status}: ${body.slice(0, 400)}`,
        };
      }
      const data = (await res.json()) as { tables?: DatabricksTable[] };
      let tables = data.tables ?? [];
      if (config.tables && config.tables.trim()) {
        const wanted = config.tables
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        tables = tables.filter((t) => wanted.includes(t.name.toLowerCase()));
      }
      return { ok: true, tables };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
);

interface SnowflakeTableIntrospection {
  name: string;
  columns: Array<{ name: string; type: string; nullable: boolean; comment?: string }>;
}

ipcMain.handle(
  "dc:introspectSnowflake",
  async (
    _evt,
    config: {
      account: string;
      database: string;
      schema: string;
      warehouse: string;
      token: string;
      role?: string;
      tables?: string;
    },
  ): Promise<
    | { ok: true; tables: SnowflakeTableIntrospection[] }
    | { ok: false; error: string }
  > => {
    try {
      const account = (config.account || "").trim();
      if (!account) return { ok: false, error: "Account identifier is required." };
      if (!config.token) return { ok: false, error: "Personal access token is required." };
      if (!config.database) return { ok: false, error: "Database is required." };
      if (!config.schema) return { ok: false, error: "Schema is required." };
      if (!config.warehouse) return { ok: false, error: "Warehouse is required." };

      const hostRaw = account.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const host = hostRaw.includes(".") ? hostRaw : `${hostRaw}.snowflakecomputing.com`;
      const endpoint = `https://${host}/api/v2/statements`;

      // INFORMATION_SCHEMA expects schema names uppercase unless the object was
      // quoted on creation. We uppercase here to match the common case; users
      // who need case-sensitive lookups can file a bug.
      const db = config.database.replace(/"/g, "");
      const sch = config.schema.replace(/'/g, "").toUpperCase();
      let sql =
        `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COMMENT ` +
        `FROM "${db}".INFORMATION_SCHEMA.COLUMNS ` +
        `WHERE TABLE_SCHEMA = '${sch}'`;
      if (config.tables && config.tables.trim()) {
        const list = config.tables
          .split(",")
          .map((t) => t.trim().replace(/'/g, "").toUpperCase())
          .filter(Boolean);
        if (list.length > 0) {
          sql += ` AND TABLE_NAME IN (${list.map((t) => `'${t}'`).join(", ")})`;
        }
      }
      sql += ` ORDER BY TABLE_NAME, ORDINAL_POSITION`;

      const body = {
        statement: sql,
        timeout: 60,
        database: config.database,
        schema: "INFORMATION_SCHEMA",
        warehouse: config.warehouse,
        ...(config.role ? { role: config.role } : {}),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          ok: false,
          error: `Snowflake API ${res.status}: ${text.slice(0, 400)}`,
        };
      }
      const data = (await res.json()) as {
        code?: string;
        message?: string;
        data?: string[][];
        resultSetMetaData?: { rowType?: Array<{ name: string }> };
      };
      if (!data.data) {
        return {
          ok: false,
          error:
            data.message ??
            "Snowflake returned no rows. Check that the PAT has USAGE on the database/schema.",
        };
      }
      const byTable = new Map<string, SnowflakeTableIntrospection["columns"]>();
      for (const row of data.data) {
        const [tableName, columnName, dataType, isNullable, comment] = row;
        if (!tableName || !columnName) continue;
        const cols = byTable.get(tableName) ?? [];
        cols.push({
          name: columnName,
          type: dataType ?? "VARIANT",
          nullable: (isNullable ?? "YES").toUpperCase() === "YES",
          comment: comment || undefined,
        });
        byTable.set(tableName, cols);
      }
      const tables: SnowflakeTableIntrospection[] = [...byTable.entries()].map(
        ([name, columns]) => ({ name, columns }),
      );
      return { ok: true, tables };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
);
