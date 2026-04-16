declare global {
  interface Window {
    datacarta: {
      resolveSamplePath: () => Promise<string | null>;
      readTextFile: (filePath: string) => Promise<string>;
      openGraphJson: () => Promise<
        { canceled: true } | { canceled: false; filePath: string; text: string }
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
    };
  }
}

export {};
