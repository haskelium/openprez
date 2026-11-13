import type { BuildEnvironmentOptions, Plugin } from "vite";

export const STANDALONE_MANIFEST_FILE = "openprez-standalone-manifest.json";

export type StandaloneFlavor = "user" | "showcase";

/** The HTML entry each standalone flavor builds; shared by the Vite plugin and the assembler. */
export const STANDALONE_ENTRIES: Record<StandaloneFlavor, string> = {
  user: "index.html",
  showcase: "showcase.html",
};

/**
 * Build options shared by the real standalone builds and their test fixtures: one bundle with
 * every asset inlined by Vite, so the assembler only has to embed scripts and stylesheets.
 */
export function standaloneBuildOptions({
  input,
  outDir,
}: {
  input: string;
  outDir: string;
}): BuildEnvironmentOptions {
  return {
    outDir,
    assetsInlineLimit: () => true,
    rollupOptions: { input, output: { codeSplitting: false } },
  };
}

/** Describe one self-contained Vite output and reject dependencies left outside it. */
export function standaloneManifestPlugin(flavor: StandaloneFlavor): Plugin {
  const entry = STANDALONE_ENTRIES[flavor];

  return {
    name: "openprez:standalone-manifest",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [...new Set([...Object.keys(bundle), entry])].sort();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const unresolved = [...output.imports, ...output.dynamicImports].filter((dependency) => {
          if (dependency === output.fileName) return false;
          const emitted = bundle[dependency];
          return !emitted || emitted.type === "chunk";
        });
        if (unresolved.length > 0) {
          throw new Error(
            `Standalone ${flavor} build has external dependencies in ${output.fileName}: ${unresolved.join(", ")}`,
          );
        }
      }

      this.emitFile({
        type: "asset",
        fileName: STANDALONE_MANIFEST_FILE,
        source: JSON.stringify({ version: 1, flavor, entry, files }, null, 2),
      });
    },
  };
}
