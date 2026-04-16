import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        // Bundle from TS source: Rollup mis-detects some CJS re-export patterns in `dist/client.js`.
        "datacarta-spec/client": resolve(__dirname, "../spec/src/client.ts"),
      },
    },
    server: {
      fs: {
        allow: [resolve("..")],
      },
    },
  },
});
