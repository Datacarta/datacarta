import { contextBridge, ipcRenderer } from "electron";

export interface DatacartaPreloadApi {
  resolveSamplePath: () => Promise<string | null>;
  readTextFile: (filePath: string) => Promise<string>;
  openGraphJson: () => Promise<
    | { canceled: true }
    | { canceled: false; filePath: string; text: string }
  >;
  exportGraphJson: (
    defaultName: string,
    content: string
  ) => Promise<{ canceled: true } | { canceled: false; filePath: string }>;
  listProjects: () => Promise<string[]>;
  readProject: (filename: string) => Promise<string>;
  saveProject: (
    filename: string,
    content: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const api: DatacartaPreloadApi = {
  resolveSamplePath: () => ipcRenderer.invoke("dc:resolveSamplePath"),
  readTextFile: (filePath) => ipcRenderer.invoke("dc:readTextFile", filePath),
  openGraphJson: () => ipcRenderer.invoke("dc:openGraphJson"),
  exportGraphJson: (defaultName, content) =>
    ipcRenderer.invoke("dc:exportGraphJson", defaultName, content),
  listProjects: () => ipcRenderer.invoke("dc:listProjects"),
  readProject: (filename) => ipcRenderer.invoke("dc:readProject", filename),
  saveProject: (filename, content) => ipcRenderer.invoke("dc:saveProject", filename, content),
};

contextBridge.exposeInMainWorld("datacarta", api);
