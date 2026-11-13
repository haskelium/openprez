import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { projectAliases } from "./scripts/lib/aliases.ts";
import {
  STANDALONE_ENTRIES,
  standaloneBuildOptions,
  standaloneManifestPlugin,
} from "./scripts/standalone/manifest.ts";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

function localDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone" || mode === "showcase-standalone";
  const flavor = mode === "showcase-standalone" ? "showcase" : "user";
  return {
    plugins: [react(), tailwindcss(), ...(standalone ? [standaloneManifestPlugin(flavor)] : [])],
    ...(standalone
      ? { define: { __OPENPREZ_EXPORT_DATE__: JSON.stringify(localDateString(new Date())) } }
      : {}),
    resolve: {
      alias: projectAliases(fileURLToPath(new URL(".", import.meta.url))),
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    // Served from localhost only, so one large bundle is fine and the size warning is noise.
    // Standalone builds produce one self-contained HTML file for the selected deck flavor; the
    // normal multi-file build keeps code splitting and never includes the showcase.
    build: {
      chunkSizeWarningLimit: 4096,
      ...(standalone
        ? standaloneBuildOptions({
            input: fromRoot(`./${STANDALONE_ENTRIES[flavor]}`),
            outDir: process.env.OPENPREZ_BUILD_DIR?.trim() || "dist",
          })
        : {}),
    },
  };
});
