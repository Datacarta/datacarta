import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveHarmonicSamplePath(): string | null {
  const rel = join("datacarta-spec", "samples", "harmonic-audio.sample.json");
  const candidates = [
    join(app.getAppPath(), "..", rel),
    join(process.cwd(), "..", rel),
    join(process.cwd(), rel),
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
