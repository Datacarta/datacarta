import { contextBridge, ipcRenderer } from "electron";

export interface DatabricksIntrospectedColumn {
  name: string;
  type_text?: string;
  type_name?: string;
  nullable?: boolean;
  position?: number;
  comment?: string;
}
export interface DatabricksIntrospectedTable {
  name: string;
  full_name?: string;
  comment?: string;
  columns?: DatabricksIntrospectedColumn[];
}

export interface SnowflakeIntrospectedTable {
  name: string;
  columns: Array<{ name: string; type: string; nullable: boolean; comment?: string }>;
}

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
  introspectDatabricks: (config: {
    workspace: string;
    catalog: string;
    schema: string;
    token: string;
    tables?: string;
  }) => Promise<
    | { ok: true; tables: DatabricksIntrospectedTable[] }
    | { ok: false; error: string }
  >;
  introspectSnowflake: (config: {
    account: string;
    database: string;
    schema: string;
    warehouse: string;
    token: string;
    role?: string;
    tables?: string;
  }) => Promise<
    | { ok: true; tables: SnowflakeIntrospectedTable[] }
    | { ok: false; error: string }
  >;
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
  introspectDatabricks: (config) => ipcRenderer.invoke("dc:introspectDatabricks", config),
  introspectSnowflake: (config) => ipcRenderer.invoke("dc:introspectSnowflake", config),
};

contextBridge.exposeInMainWorld("datacarta", api);
