import { describe, expect, it } from "vitest";
import {
  STANDALONE_MANIFEST_FILE,
  standaloneManifestPlugin,
} from "../../../scripts/standalone/manifest.ts";

function emittedManifest(flavor, bundle) {
  const emitted = [];
  const plugin = standaloneManifestPlugin(flavor);
  plugin.generateBundle.call(
    {
      emitFile: (file) => emitted.push(file),
    },
    {},
    bundle,
  );
  return JSON.parse(emitted.find((file) => file.fileName === STANDALONE_MANIFEST_FILE).source);
}

function outputChunk(fileName, imports = [], dynamicImports = []) {
  return { type: "chunk", fileName, imports, dynamicImports };
}

const userBundle = {
  "index.html": { type: "asset", fileName: "index.html", source: "" },
  "assets/app.js": outputChunk("assets/app.js"),
  "assets/app.css": { type: "asset", fileName: "assets/app.css", source: "" },
};

describe("standalone build manifest", () => {
  it("records versioned flavor, entry and emitted files", () => {
    expect(emittedManifest("user", userBundle)).toEqual({
      version: 1,
      flavor: "user",
      entry: "index.html",
      files: ["assets/app.css", "assets/app.js", "index.html"],
    });
  });

  it("accepts fully incorporated dynamic imports", () => {
    const bundle = {
      ...userBundle,
      "assets/app.js": outputChunk("assets/app.js", [], []),
    };
    expect(emittedManifest("user", bundle).entry).toBe("index.html");
  });

  it.each(["static", "dynamic"])("rejects an external %s dependency", (kind) => {
    const bundle = {
      ...userBundle,
      "assets/app.js": outputChunk(
        "assets/app.js",
        kind === "static" ? ["external-package"] : [],
        kind === "dynamic" ? ["external-package"] : [],
      ),
    };
    expect(() => emittedManifest("user", bundle)).toThrow(
      /external dependencies.*external-package/,
    );
  });

  it("rejects an emitted chunk dependency that is not incorporated", () => {
    const bundle = {
      ...userBundle,
      "assets/app.js": outputChunk("assets/app.js", ["assets/vendor.js"]),
      "assets/vendor.js": outputChunk("assets/vendor.js"),
    };
    expect(() => emittedManifest("user", bundle)).toThrow(
      /external dependencies.*assets\/vendor.js/,
    );
  });

  it("records the expected HTML entry before Vite writes it to disk", () => {
    const bundle = { ...userBundle };
    delete bundle["index.html"];
    expect(emittedManifest("user", bundle).files).toContain("index.html");
  });
});
